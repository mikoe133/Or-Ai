import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { IdSchema } from "@orai/contracts";
import { ApiClient, ClientError, EmptySchema } from "../src/api/client.js";
import { MutationIntent } from "../src/api/intent.js";
import {
  clearPrivateQueries,
  connectPrivacy,
  identityChanged,
  privacyEpoch,
  subscribePrivacy,
} from "../src/api/privacy.js";
import {
  catalogSearch,
  changeCatalogSearch,
  shareSummary,
} from "../src/business/model.js";
const id = "00000000-0000-4000-8000-000000000001";
const token = "1".repeat(100);
const error = (code: string, status = 403) =>
  new Response(
    JSON.stringify({
      error: { code, message: "可展示说明", requestId: "safe-request" },
    }),
    { status },
  );
const context = () =>
  new Response(
    JSON.stringify({
      authenticated: false,
      csrfToken: token,
      sessionExpiresAt: null,
    }),
    { headers: { "content-type": "application/json" } },
  );
const fail = (code: string) => (value: unknown) =>
  value instanceof ClientError && value.code === code;

test("API client coalesces CSRF bootstrap and refreshes it once while preserving the exact mutation intent", async () => {
  const calls: { path: string; body: unknown; init?: RequestInit }[] = [];
  let writes = 0;
  const api = new ApiClient(async (input, init) => {
    const path = String(input);
    calls.push({ path, body: init?.body, init });
    if (path === "/api/session/context") return context();
    writes++;
    return writes === 1
      ? error("CSRF_INVALID")
      : new Response(JSON.stringify(id));
  });
  const body = { requestId: id };
  assert.equal(
    await api.request("/api/probe", IdSchema, { method: "POST", body }),
    id,
  );
  assert.equal(
    calls.filter((value) => value.path === "/api/session/context").length,
    2,
  );
  assert.deepEqual(
    calls
      .filter((value) => value.path === "/api/probe")
      .map((value) => value.body),
    [JSON.stringify(body), JSON.stringify(body)],
  );
  assert.equal(calls.at(-1)?.init?.credentials, "same-origin");
  assert.equal(calls.at(-1)?.init?.cache, "no-store");
  assert.equal(
    new Headers(calls.at(-1)?.init?.headers).get("X-CSRF-Token"),
    token,
  );
  await api.request("/api/probe", IdSchema, { method: "POST", body });
  assert.equal(
    calls.filter((value) => value.path === "/api/session/context").length,
    2,
  );
});

test("network, rate-limit, permission and malformed responses never blindly replay a write or expose diagnostics", async () => {
  for (const [response, code] of [
    [error("RATE_LIMITED", 429), "RATE_LIMITED"],
    [error("FORBIDDEN"), "FORBIDDEN"],
    [
      new Response("<sql>private</sql>", { status: 500 }),
      "SERVICE_UNAVAILABLE",
    ],
    [new Response("{}"), "INVALID_RESPONSE"],
  ] as const) {
    let writes = 0;
    const api = new ApiClient(async (input) =>
      String(input) === "/api/session/context"
        ? context()
        : (writes++, response.clone()),
    );
    await assert.rejects(
      api.request("/api/probe", IdSchema, {
        method: "POST",
        body: { requestId: id },
      }),
      fail(code),
    );
    assert.equal(writes, 1);
  }
  const api = new ApiClient(async () => {
    throw new Error("PRIVATE_PROVIDER_DIAGNOSTICS");
  });
  await assert.rejects(
    api.request("/api/probe", IdSchema),
    (value) =>
      fail("NETWORK_ERROR")(value) &&
      !(value as Error).message.includes("PRIVATE"),
  );
  const limited = new ApiClient(
    async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMITED",
            message: "稍后再试",
            requestId: "safe",
          },
        }),
        { status: 429, headers: { "Retry-After": "19" } },
      ),
  );
  await assert.rejects(
    limited.request("/api/probe", IdSchema),
    (value) => value instanceof ClientError && value.retryAfterSeconds === 19,
  );
  await assert.rejects(
    api.request("https://foreign.example/api", IdSchema),
    fail("VALIDATION_ERROR"),
  );
});

test("late private replies from a prior identity cannot populate the current page", async () => {
  let epoch = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const api = new ApiClient(
    async () => {
      await pending;
      return new Response(JSON.stringify(id));
    },
    () => epoch,
  );
  const result = api.request("/api/reports/" + id, IdSchema);
  epoch++;
  release();
  await assert.rejects(result, fail("SESSION_CHANGED"));
});

test("identity changes cancel and remove private and account queries while public catalog remains shareable", async () => {
  const client = new QueryClient();
  client.setQueryData(["public", "catalog"], { title: "public" });
  client.setQueryData(["private", "report"], { text: "PRIVATE_REPORT" });
  client.setQueryData(["account-context"], { id });
  await clearPrivateQueries(client);
  assert.equal(client.getQueryData(["private", "report"]), undefined);
  assert.equal(client.getQueryData(["account-context"]), undefined);
  assert.deepEqual(client.getQueryData(["public", "catalog"]), {
    title: "public",
  });
  client.clear();
});

test("an uncertain mutation reuses its ID only for identical values; new values get a new intent", () => {
  const intent = new MutationIntent();
  const first = intent.for({ optionId: "often", expectedRevision: 1 });
  assert.equal(
    intent.for({ optionId: "often", expectedRevision: 1 }).requestId,
    first.requestId,
  );
  assert.notEqual(
    intent.for({ optionId: "rarely", expectedRevision: 1 }).requestId,
    first.requestId,
  );
  intent.reset();
  assert.notEqual(
    intent.for({ optionId: "often", expectedRevision: 1 }).requestId,
    first.requestId,
  );
});

test("catalog URLs preserve filters and pagination across reload while filter changes reset only the page", () => {
  const params = new URLSearchParams(
    "q=关系&category=relationships&tags=demo,cooperation&sort=recommended&page=3&pageSize=1",
  );
  assert.equal(catalogSearch(params).page, 3);
  const changed = changeCatalogSearch(params, { category: "work" });
  assert.equal(changed.get("q"), "关系");
  assert.equal(changed.get("tags"), "demo,cooperation");
  assert.equal(changed.get("page"), "1");
  assert.throws(() => catalogSearch(new URLSearchParams("scope=live")));
  assert.throws(() => catalogSearch(new URLSearchParams("page=-1")));
});

test("share exports allow only explicit result summary fields and preserve a missing score as null", () => {
  const summary = shareSummary({
    productName: "示例商品",
    resultLabel: "信息不足",
    totalScore: null,
    versionNumber: 1,
    isDemo: true,
    disclaimer: "仅供自我观察",
    reportId: id,
    token: "PRIVATE_CODE_SENTINEL",
    answers: ["PRIVATE_ANSWER_SENTINEL"],
  } as never);
  assert.equal(summary.totalScore, null);
  assert.equal(JSON.stringify(summary).includes("PRIVATE"), false);
  assert.equal("reportId" in summary, false);
});

test("simultaneous mutations share one bootstrap, but a repeated CSRF failure stops after one replay", async () => {
  let release!: () => void,
    bootstraps = 0,
    writes = 0;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const api = new ApiClient(async (input) => {
    if (String(input) === "/api/session/context") {
      bootstraps++;
      await pending;
      return context();
    }
    writes++;
    return new Response(JSON.stringify(id));
  });
  const first = api.request("/api/probe", IdSchema, { method: "POST" }),
    second = api.request("/api/probe", IdSchema, {
      method: "PATCH",
      body: { requestId: id },
    });
  assert.equal(bootstraps, 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), [id, id]);
  assert.equal(writes, 2);
  let rejectedWrites = 0;
  const rejected = new ApiClient(async (input) =>
    String(input) === "/api/session/context"
      ? context()
      : (rejectedWrites++, error("CSRF_INVALID")),
  );
  await assert.rejects(
    rejected.request("/api/probe", IdSchema, { method: "POST" }),
    fail("CSRF_INVALID"),
  );
  assert.equal(rejectedWrites, 2);
  api.forgetCsrf();
  await api.request("/api/probe", IdSchema, { method: "DELETE" });
  assert.equal(bootstraps, 2);
});

test("API paths keep encoded search text and spaces while rejecting encoded traversal and malformed paths", async () => {
  const calls: string[] = [],
    api = new ApiClient(async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify(id));
    });
  const query =
    "/api/products?q=" +
    new URLSearchParams({ q: "two words .." }).get("q")!.replaceAll(" ", "+") +
    "&page=1";
  assert.equal(await api.request(query, IdSchema), id);
  assert.equal(calls[0], query);
  for (const path of [
    "/api/../account",
    "/api/%2e%2e/account",
    "/api/%ZZ",
    "//foreign.example/api",
    "/api/unsafe\\path",
  ])
    await assert.rejects(api.request(path, IdSchema), fail("VALIDATION_ERROR"));
});

test("binary uploads, download blobs and 204 deletion use their exact payload and response types", async () => {
  const payload = new Blob(["file"], { type: "image/png" });
  let sent: RequestInit | undefined;
  const api = new ApiClient(async (input, init) => {
    if (String(input) === "/api/session/context") return context();
    sent = init;
    return init?.method === "DELETE"
      ? new Response(null, { status: 204 })
      : init?.method === "PUT"
        ? new Response(JSON.stringify(id))
        : new Response(payload);
  });
  await assert.rejects(
    api.request("/api/upload", IdSchema, {
      method: "PUT",
      binary: true,
      body: { file: "wrong" },
    }),
    fail("VALIDATION_ERROR"),
  );
  assert.equal(
    await api.request("/api/upload", IdSchema, {
      method: "PUT",
      binary: true,
      body: payload,
    }),
    id,
  );
  assert.equal(sent?.body, payload);
  assert.equal(
    new Headers(sent?.headers).get("content-type"),
    "application/octet-stream",
  );
  assert.equal(
    await api.request("/api/report", EmptySchema, { method: "DELETE" }),
    undefined,
  );
  const blob = await api.blob("/api/file");
  assert.ok(blob);
  assert.equal(await blob.text(), "file");
  const malformed = new ApiClient(async () => new Response("{}"));
  await assert.rejects(
    malformed.request("/api/session/context", IdSchema),
    fail("INVALID_RESPONSE"),
  );
});

test("cancellation, timeouts and bad CSRF bootstrap cannot commit a write or disclose provider errors", async () => {
  const controller = new AbortController();
  controller.abort();
  const cancelled = new ApiClient(async (_input, init) => {
    assert.equal(init?.signal?.aborted, true);
    throw new DOMException("private abort", "AbortError");
  });
  await assert.rejects(
    cancelled.request("/api/reports", IdSchema, { signal: controller.signal }),
    fail("REQUEST_CANCELLED"),
  );
  const timed = new ApiClient(async (_input, init) => {
    await new Promise<void>((resolve) =>
      init?.signal?.addEventListener("abort", () => resolve(), { once: true }),
    );
    throw new Error("PRIVATE timeout");
  });
  // The small referenced timer lets Node observe the timeout signal.
  const keeper = setTimeout(() => {}, 30);
  await assert.rejects(
    timed.request("/api/reports", IdSchema, { timeoutMs: 1 }),
    fail("NETWORK_ERROR"),
  );
  clearTimeout(keeper);
  let reads = 0;
  const bad = new ApiClient(async () => {
    reads++;
    return new Response("{}");
  });
  await assert.rejects(
    bad.request("/api/probe", IdSchema, { method: "POST" }),
    fail("INVALID_RESPONSE"),
  );
  assert.equal(reads, 1);
});

test("identity changes during bootstrap and body parsing reject private replies; public catalog stays usable", async () => {
  let epoch = 0;
  const bootstrap = new ApiClient(
    async () => {
      epoch++;
      return context();
    },
    () => epoch,
  );
  await assert.rejects(
    bootstrap.request("/api/probe", IdSchema, { method: "POST" }),
    fail("SESSION_CHANGED"),
  );
  const parsing = new ApiClient(
    async () => {
      const response = new Response(JSON.stringify(id));
      response.json = async () => {
        epoch++;
        return id;
      };
      return response;
    },
    () => epoch,
  );
  await assert.rejects(
    parsing.request("/api/reports/" + id, IdSchema),
    fail("SESSION_CHANGED"),
  );
  assert.equal(await parsing.request("/api/products/demo", IdSchema), id);
  for (const [retry, expected] of [
    ["999999", 86400],
    ["garbage", 0],
    ["-1", 0],
    ["1.1", 2],
  ] as const) {
    const api = new ApiClient(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "RATE_LIMITED",
              message: "等一等",
              requestId: "safe",
            },
          }),
          { status: 429, headers: { "Retry-After": retry } },
        ),
    );
    await assert.rejects(
      api.request("/api/probe", IdSchema),
      (value) =>
        value instanceof ClientError && value.retryAfterSeconds === expected,
    );
  }
  const server = new ApiClient(async () => error("INTERNAL_ERROR", 500));
  await assert.rejects(
    server.request("/api/probe", IdSchema),
    (value) =>
      value instanceof ClientError && !value.message.includes("可展示说明"),
  );
});

test("privacy signals carry no identity or content across tabs and unsubscribed pages stop observing changes", async (t) => {
  const client = new QueryClient();
  let signals = 0,
    closed = 0;
  const sent: unknown[] = [];
  let receive: ((event: { data: unknown }) => void) | undefined;
  class Channel {
    constructor(readonly name: string) {
      assert.equal(name, "meetmyworld:identity:v1");
    }
    set onmessage(fn: (event: { data: unknown }) => void) {
      receive = fn;
    }
    postMessage(value: unknown) {
      sent.push(value);
    }
    close() {
      closed++;
    }
  }
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window"),
    previousChannel = Object.getOwnPropertyDescriptor(
      globalThis,
      "BroadcastChannel",
    );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "BroadcastChannel", {
    configurable: true,
    value: Channel,
  });
  t.after(() => {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousChannel)
      Object.defineProperty(globalThis, "BroadcastChannel", previousChannel);
    client.clear();
  });
  const unsubscribe = subscribePrivacy(() => {
      signals++;
    }),
    disconnect = connectPrivacy(client),
    before = privacyEpoch();
  client.setQueryData(["private", "report"], { text: "PRIVATE" });
  await identityChanged(client);
  assert.equal(signals, 1);
  assert.equal(privacyEpoch(), before + 1);
  assert.deepEqual(sent, ["identity-changed"]);
  assert.equal(client.getQueryData(["private", "report"]), undefined);
  receive?.({ data: "ignored" });
  assert.equal(signals, 1);
  receive?.({ data: "identity-changed" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(signals, 2);
  assert.equal(sent.length, 1);
  unsubscribe();
  await identityChanged(client, false);
  assert.equal(signals, 2);
  disconnect();
  assert.equal(closed, 1);
  Reflect.deleteProperty(globalThis, "window");
  connectPrivacy(client)();
});

test("filter removal preserves an explicit page while clearing an empty selection", () => {
  const params = changeCatalogSearch(
    new URLSearchParams("q=hello&category=work&page=2"),
    { category: "", page: "4" },
  );
  assert.equal(params.has("category"), false);
  assert.equal(params.get("page"), "4");
  assert.equal(params.get("q"), "hello");
});
