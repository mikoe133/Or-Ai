import assert from "node:assert/strict";
import { test } from "node:test";
import { AccessVerification, isAccessFailure, refreshOnAccessCheck, type AccessCheckState } from "../src/api/access-verification.js";
import { ClientError } from "../src/api/client.js";
import { AuthFlowError } from "../src/auth/errors.js";
import { createAppQueryClient } from "../src/api/query-client.js";
import { clearPrivateQueries } from "../src/api/privacy.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function harness() {
  let epoch = 0, time = 0, identity = "admin", failure = false, reads = 0, changes = 0, refreshes = 0;
  const states: AccessCheckState[] = [], accepted: string[] = [], events: string[] = [];
  const reader = { read: async () => { reads++; if (failure) throw new Error("unavailable"); return identity; } };
  const guard = new AccessVerification({
    epoch: () => epoch, now: () => time, read: () => reader.read(), fingerprint: value => value,
    identityChanged: async () => { epoch++; changes++; events.push("clear"); },
    accept: value => { accepted.push(value); events.push("accept:" + value); }, refresh: () => { refreshes++; }, state: value => { states.push(value); },
  });
  return { guard, reader, states, accepted, events, advance: () => { time += 30000; },
    identity: (value: string) => { identity = value; }, failure: (value: boolean) => { failure = value; },
    externalChange: () => { epoch++; }, metrics: () => ({ reads, changes, refreshes }) };
}

test("periodic checks and repeated focus events keep a confirmed view visible and coalesce fresh checks", async () => {
  const h = harness();
  await h.guard.verify(true);
  assert.equal(h.states.at(-1)?.verifiedEpoch, 0);
  h.states.length = 0;
  await h.guard.verify();
  assert.equal(h.metrics().reads, 1);
  h.advance();
  await h.guard.verify();
  assert.ok(h.states.every(state => !state.checking && !state.failed));
  assert.deepEqual(h.metrics(), { reads: 2, changes: 0, refreshes: 1 });
});

test("concurrent checks share a request while a blocking request can still mask it", async () => {
  const h = harness(), pending = deferred<string>();
  await h.guard.verify(true);
  h.advance(); h.reader.read = () => pending.promise;
  const background = h.guard.verify(), foreground = h.guard.verify(true);
  assert.equal(background, foreground);
  assert.equal(h.states.at(-1)?.checking, true);
  pending.resolve("admin"); await background;
  assert.equal(h.states.at(-1)?.checking, false);
});

test("verification failure stays masked throughout retry until a successful response arrives", async () => {
  const h = harness(); await h.guard.verify(true); h.failure(true);
  await h.guard.verify(true); assert.equal(h.states.at(-1)?.failed, true);
  const pending = deferred<string>(); h.reader.read = () => pending.promise;
  const retry = h.guard.verify(); assert.equal(h.states.at(-1)?.checking, true);
  pending.resolve("admin"); await retry;
  assert.equal(h.states.at(-1)?.failed, false);
  assert.equal(h.states.at(-1)?.checking, false);
});

test("role or identity changes clear private state before the new snapshot is accepted", async () => {
  const h = harness(); await h.guard.verify(true); h.advance(); h.identity("ordinary");
  await h.guard.verify();
  assert.equal(h.metrics().changes, 1);
  assert.equal(h.metrics().refreshes, 0);
  assert.equal(h.accepted.at(-1), "ordinary");
  assert.equal(h.states.at(-1)?.verifiedEpoch, 1);
  assert.deepEqual(h.events, ["accept:admin", "clear", "accept:ordinary"]);
  assert.ok(h.states.some(state => state.checking));
});

test("a reply from before a cross-tab identity change cannot reveal or cache the old identity", async () => {
  const h = harness(), pending = deferred<string>();
  await h.guard.verify(true); h.advance();
  h.reader.read = () => pending.promise;
  const check = h.guard.verify(); h.externalChange(); h.reader.read = async () => "new-user";
  pending.resolve("old-user"); await check;
  assert.deepEqual(h.accepted, ["admin", "new-user"]);
  assert.equal(h.states.at(-1)?.verifiedEpoch, 1);
});

test("hidden and disposed views ignore late responses; returning to the tab requires a new check", async () => {
  const h = harness(), pending = deferred<string>();
  await h.guard.verify(true); h.advance(); h.reader.read = () => pending.promise;
  const check = h.guard.verify(); h.guard.suspend(); pending.resolve("old-user"); await check;
  assert.equal(h.states.at(-1)?.checking, true);
  assert.deepEqual(h.accepted, ["admin"]);
  h.reader.read = async () => "admin"; await h.guard.resume();
  assert.equal(h.states.at(-1)?.checking, false);
  const late = deferred<string>(); h.advance(); h.reader.read = () => late.promise;
  const disposed = h.guard.verify(); const before = h.states.length; h.guard.dispose(); late.resolve("other"); await disposed;
  assert.equal(h.states.length, before);
  assert.deepEqual(h.accepted, ["admin", "admin"]);
});

test("access polling refreshes overview and audit without refetching editable administrator data", () => {
  for (const family of ["overview", "audit"]) assert.equal(refreshOnAccessCheck(["private", "admin", family]), true);
  for (const family of ["content-profile", "content-heads", "project-workspace", "skill-version", "versions", "orders"])
    assert.equal(refreshOnAccessCheck(["private", "admin", family]), false);
  assert.equal(refreshOnAccessCheck(["private", "questions"]), true);
  assert.equal(refreshOnAccessCheck(["public", "products"]), false);
});

test("short administrator list caches remain in memory and are cleared on identity changes", async () => {
  const client = createAppQueryClient();
  for (const family of ["overview", "audit", "content-products", "skills"]) {
    const options = client.getQueryDefaults(["private", "admin", family]);
    assert.equal(options.gcTime, 60000); assert.equal(options.staleTime, 15000);
    client.setQueryData(["private", "admin", family], { private: true });
  }
  assert.equal(client.getQueryDefaults(["private", "admin", "skill-version"]).gcTime, 0);
  assert.equal(client.getQueryDefaults(["private", "questions"]).gcTime, 0);
  assert.equal(client.getQueryDefaults(["private", "feedback"]).staleTime, Infinity);
  client.setQueryData(["account-context"], { id: "old" }); client.setQueryData(["public", "products"], []);
  await clearPrivateQueries(client);
  assert.equal(client.getQueryData(["private", "admin", "overview"]), undefined);
  assert.equal(client.getQueryData(["account-context"]), undefined);
  assert.deepEqual(client.getQueryData(["public", "products"]), []);
  client.clear();
});

test("permission failures never use the nonblocking stale-data fallback for either API error type", () => {
  for (const code of ["AUTH_REQUIRED", "FORBIDDEN", "ACCOUNT_REQUIRED", "EMAIL_UNVERIFIED", "SESSION_CHANGED"]) {
    assert.equal(isAccessFailure(new AuthFlowError(code, "denied")), true);
    assert.equal(isAccessFailure(new ClientError(code, "denied")), true);
  }
  assert.equal(isAccessFailure(new ClientError("SERVICE_UNAVAILABLE", "denied", 403)), true);
  assert.equal(isAccessFailure(new ClientError("NETWORK_ERROR", "unavailable")), false);
  assert.equal(isAccessFailure(new AuthFlowError("SERVICE_UNAVAILABLE", "unavailable")), false);
  assert.equal(isAccessFailure(new Error("unavailable")), false);
});
