import assert from "node:assert/strict";
import { test } from "node:test";
import { auditCounts, chartScale, experienceCounts, sourceCounts, statusCounts, type AuditEntry, type OverviewData } from "../src/admin/overview-model.js";

const events: OverviewData["events"] = [
  { kind: "start", source: "web", count: 12, latestAt: null },
  { kind: "start", source: "demo", count: 5, latestAt: null },
  { kind: "complete", source: "web", count: 8, latestAt: null },
  { kind: "refund", source: "manual", count: 2, latestAt: null },
];
const total = (items: { count: number }[]) => items.reduce((sum, item) => sum + item.count, 0);

test("event and source distributions preserve totals when one event kind has multiple sources", () => {
  assert.equal(total(experienceCounts(events)), 27);
  assert.equal(total(sourceCounts(events)), 27);
  assert.equal(experienceCounts(events).find(item => item.key === "start")?.count, 17);
  for (const source of ["web", "manual", "demo"] as const) {
    assert.equal(total(experienceCounts(events, source)), sourceCounts(events).find(item => item.key === source)?.count);
  }
  assert.equal(experienceCounts(events).find(item => item.key === "view")?.count, 0);
});

test("empty datasets retain zero values without inventing records or a conversion rate", () => {
  assert.equal(total(experienceCounts([])), 0);
  assert.equal(total(sourceCounts([])), 0);
  assert.equal(total(statusCounts([])), 0);
  assert.deepEqual(auditCounts([], "action"), []);
  assert.equal(chartScale(experienceCounts([])), 1);
});

test("order status counts include all recorded statuses and preserve missing statuses as zero", () => {
  const data = statusCounts([{ status: "fulfilled", count: 18 }, { status: "refunded", count: 3 }]);
  assert.equal(total(data), 21);
  assert.equal(data.find(item => item.key === "fulfilled")?.count, 18);
  assert.equal(data.find(item => item.key === "pending")?.count, 0);
  assert.equal(data.find(item => item.key === "cancelled")?.count, 0);
});

test("audit charts describe only supplied page records and preserve unknown action and object labels", () => {
  const entry = (action: string, entityKind: string): AuditEntry => ({ id: "local", action, entityKind, entityId: "object", actorUserId: null, scope: "demo", requestId: null, createdAt: "2026-10-23T06:00:00.000Z" });
  const page = [entry("products.create", "product"), entry("products.update", "product"), entry("products.create", "product"), entry("future.action", "future_object")];
  const actions = auditCounts(page, "action"), entities = auditCounts(page, "entityKind");
  assert.equal(total(actions), page.length);
  assert.equal(total(entities), page.length);
  assert.equal(actions[0]?.count, 2);
  assert.equal(entities[0]?.label, "商品");
  assert.equal(entities[0]?.count, 3);
  assert.equal(actions.find(item => item.key === "future.action")?.label, "future.action");
  assert.equal(entities.find(item => item.key === "future_object")?.label, "future_object");
  assert.deepEqual(auditCounts([entry("__proto__", "constructor")], "action").map(item => item.label), ["__proto__"]);
});

test("chart scales remain positive and never clip sparse or large counts", () => {
  for (const count of [0, 1, 3, 17, 35, 101, 10_001, 1_234_567]) {
    const scale = chartScale([{ key: "count", label: "记录", count, color: "purple" }]);
    assert.ok(Number.isFinite(scale) && scale > 0);
    assert.ok(scale >= count);
  }
});
