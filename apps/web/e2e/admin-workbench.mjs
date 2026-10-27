import assert from "node:assert/strict";
import { expect } from "playwright/test";

// These checks use the harness's isolated administrator and never submit a mutation.
export async function adminWorkbench({ admin }) {
  const checks = [];
  await admin.goto("/");
  const storeTitle = admin.getByRole("heading", { name: "发现有趣的自己", exact: true });
  await expect(storeTitle).toBeVisible();
  await admin.evaluate(() => document.fonts.ready);
  const storefrontStyle = () => admin.locator(".store-workspace-page").evaluate(element => {
    const selectors = [".store-intro", ".store-panel"];
    return selectors.map(selector => {
      const node = element.querySelector(selector), style = getComputedStyle(node);
      return { color: style.color, background: style.backgroundColor, font: style.fontFamily, border: style.borderColor, radius: style.borderRadius, width: Math.round(node.getBoundingClientRect().width) };
    });
  });
  const baseline = await storefrontStyle();
  for (const [path, active] of [
    ["/admin", "/admin"],
    ["/admin/products", "/admin/products"],
    ["/admin/content", "/admin/content"],
    ["/admin/assets", "/admin/assets"],
    ["/admin/skills/assessment", "/admin/skills"],
    ["/admin/skills/cover", "/admin/skills"],
    ["/admin/skills/video", "/admin/skills"],
    ["/admin/skills/copy", "/admin/skills"],
    ["/admin/machine", "/admin/machine"],
    ["/admin/orders", "/admin/orders"],
  ]) {
    await admin.goto(path);
    const navigation = admin.getByRole("navigation", { name: "后台导航", exact: true });
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute("href", active);
    await expect(admin.getByRole("region", { name: "运营后台", exact: true })).toBeVisible();
    await expect(admin.getByRole("navigation", { name: "空间导航", exact: true })).toHaveCount(0);
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  checks.push("admin routes have exactly one current business navigation item and never nest the consumer storefront shell");

  await admin.goto("/admin/skills/assessment");
  await admin.getByRole("button", { name: "新建 skill", exact: true }).click();
  await expect(admin.getByLabel("SKILL.md 正文", { exact: true })).toBeVisible();
  const pane = admin.getByRole("region", { name: "运营后台", exact: true });
  const geometry = () => admin.evaluate(() => {
    const topbar = document.querySelector(".admin-topbar").getBoundingClientRect();
    const sidebar = document.querySelector(".admin-sidebar").getBoundingClientRect();
    return { topbarY: topbar.y, sidebarY: sidebar.y, windowY: window.scrollY };
  });
  const before = await geometry();
  assert.equal(await pane.evaluate(node => node.scrollHeight > node.clientHeight + 200), true);
  await pane.evaluate(node => { node.scrollTop = 400; });
  await expect.poll(() => pane.evaluate(node => node.scrollTop)).toBeGreaterThan(200);
  assert.deepEqual(await geometry(), before);
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  const trigger = admin.getByRole("button", { name: "展开后台导航", exact: true, includeHidden: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await admin.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await admin.getByRole("link", { name: "← 返回商城", exact: true }).focus();
  await admin.keyboard.press("Tab");
  await expect(admin.locator(".admin-topbar a").first()).toBeFocused();
  checks.push("long admin editors scroll within the work region while the sidebar and topbar stay fixed; mobile navigation closes with Escape, restores focus and releases its focus trap when resized to desktop");

  await admin.getByRole("link", { name: "← 返回商城", exact: true }).click();
  await expect(storeTitle).toBeVisible();
  await expect(admin.locator(".admin-shell")).toHaveCount(0);
  assert.deepEqual(await storefrontStyle(), baseline);
  checks.push("returning from the admin workbench keeps storefront typography, surfaces, borders and layout unchanged");
  return checks;
}

export async function expandSavedAssets(desk) {
  const index = desk.locator("details.content-asset-index");
  await expect(index).toBeVisible();
  if (!(await index.evaluate(node => node.open))) await index.locator("summary").click();
}
