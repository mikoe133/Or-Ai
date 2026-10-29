import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AdminRecovery, AdminListProgress } from "../src/admin/feedback-view.js";
import { ContentCapabilities } from "../src/admin/content-capabilities.js";
import { productCapabilities } from "@orai/contracts/admin";

test("operator recovery stays in the relevant admin directory and account, without consumer redemption actions", () => {
  for (const area of ["products", "content", "assets", "orders"] as const) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null,
      createElement(AdminRecovery, { area })));
    assert.match(html, new RegExp(`href="/admin/${area}"`));
    assert.match(html, /href="\/account"/);
    assert.doesNotMatch(html, /href="\/(?:redeem|apps)"/);
    assert.match(html, /aria-label="后台恢复入口"/);
  }
});

test("a pending filter explicitly identifies retained rows as the previous directory", () => {
  const html = renderToStaticMarkup(createElement(AdminListProgress, { pending: true }));
  assert.match(html, /role="status"/);
  assert.match(html, /正在读取筛选结果，暂时显示上一份目录/);
});

test("compact capability context keeps required setup warnings visible outside optional technical details", () => {
  const value = productCapabilities({ hasContentVersion: true, capabilityVersion: 2 });
  const html = renderToStaticMarkup(createElement(ContentCapabilities, { value, hasVersion: true }));
  const warning = html.indexOf("尚未固定共同创作设定");
  assert.ok(warning > 0 && warning < html.indexOf("<details>"));
  assert.match(html, /商品能力与制作范围/);
  assert.match(html, /查看版本依据、支持范围与后续形式/);
});
