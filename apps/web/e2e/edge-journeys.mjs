import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "playwright/test";

export async function textContrast(locator) {
  return locator.evaluate((element) => {
    const rgba = (value) => {
      const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    };
    const parents = [];
    for (let current = element; current; current = current.parentElement)
      parents.unshift(current);
    let background = [255, 255, 255];
    for (const parent of parents) {
      const colour = rgba(getComputedStyle(parent).backgroundColor);
      background = background.map(
        (channel, index) =>
          colour[index] * colour[3] + channel * (1 - colour[3]),
      );
    }
    const luminance = (colour) =>
      colour
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    const foreground = luminance(rgba(getComputedStyle(element).color)),
      backdrop = luminance(background);
    return (
      (Math.max(foreground, backdrop) + 0.05) /
      (Math.min(foreground, backdrop) + 0.05)
    );
  });
}

export async function workspaceNavigation(page) {
  await page.goto("/");
  await expect(page.locator(".catalog-featured article").first()).toBeVisible();
  const frameGeometry = () => page.locator(".store-workspace-page").evaluate((element) => {
    const rectangle = (selector) => {
      const { x, y, width, height } = element.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height };
    };
    return { intro: rectangle(".store-intro"), panel: rectangle(".store-panel") };
  });
  const baseline = await frameGeometry();
  for (const [label, path] of [["我的应用", "/apps"], ["我的报告", "/reports"], ["使用帮助", "/help"]]) {
    const link = page.getByRole("navigation", { name: "空间导航", exact: true }).getByRole("link", { name: label, exact: true });
    await link.click();
    await expect(page).toHaveURL(new RegExp(path + "$"));
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "发现有趣的自己", exact: true })).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
    assert.deepEqual(await frameGeometry(), baseline);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "使用帮助", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "发现有趣的自己", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "空间导航", exact: true }).getByRole("link", { name: "应用商城", exact: true }).click();
  await expect(page.locator(".catalog-featured article").first()).toBeVisible();
}

export async function workspaceFeedback(page) {
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  try {
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: "使用帮助", exact: true })).toBeVisible();
    const sidebar = page.locator(".store-sidebar");
    const expandedWidth = await sidebar.evaluate(element => getComputedStyle(element).width);
    await page.getByRole("button", { name: "收起侧栏", exact: true }).click();
    await expect(sidebar).toHaveCSS("width", "88px");
    await page.getByRole("button", { name: "展开侧栏", exact: true }).click();
    await expect(sidebar).toHaveCSS("width", expandedWidth);
    const trigger = page.getByRole("navigation", { name: "帮助导航" }).getByRole("button", { name: "兑换说明", exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("button", { name: "关闭帮助", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.getByRole("navigation", { name: "空间导航" }).getByRole("link", { name: "应用商城", exact: true }).click();
    const disclosure = page.locator(".catalog-filter-panel > summary");
    await disclosure.click();
    const search = page.getByLabel("搜索测试", { exact: true });
    await search.fill("伴侣");
    await disclosure.click();
    await expect(search).toBeHidden();
    await disclosure.click();
    await expect(search).toBeVisible();
    await expect(search).toHaveValue("伴侣");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("navigation", { name: "空间导航" }).getByRole("link", { name: "使用帮助", exact: true }).click();
    await expect(page.getByRole("heading", { name: "使用帮助", exact: true })).toBeVisible();
    assert.equal(await page.locator(".workspace-view").evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  } finally {
    await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  }
}

export async function catalogFilters(page) {
  await page.goto("/?sort=recommended&pageSize=1&page=2");
  await expect(
    page.getByText("第 2 页 · 共 3 条", { exact: true }),
  ).toBeVisible();
  const title = await page.locator("article h2").innerText();
  await page.reload();
  await expect(page.locator("article h2")).toHaveText(title);
  await page.getByRole("button", { name: "上一页", exact: true }).click();
  await expect(page).toHaveURL(/page=1/);
  await page.getByText("搜索与筛选", { exact: true }).click();
  await page.getByLabel("搜索测试", { exact: true }).fill("伴侣");
  await page
    .getByRole("combobox", { name: "商品分类", exact: true })
    .selectOption("relationships");
  await page.getByText("更多筛选", { exact: true }).click();
  await page.getByLabel("最低价格（元）", { exact: true }).fill("9.9");
  await page.getByLabel("最高价格（元）", { exact: true }).fill("9.9");
  await page.getByLabel("最短时长（分钟）", { exact: true }).fill("3");
  await page.getByLabel("最长时长（分钟）", { exact: true }).fill("3");
  await page.getByLabel("结果形式", { exact: true }).selectOption("score");
  await page.getByRole("checkbox", { name: "协作", exact: true }).check();
  await page.getByRole("checkbox", { name: "演示", exact: true }).check();
  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  await expect(page.getByText("共 1 个商品", { exact: true })).toBeVisible();
  const url = page.url();
  assert.equal(new URL(url).searchParams.get("minPriceFen"), "990");
  await page.reload();
  await expect(page.getByText("共 1 个商品", { exact: true })).toBeVisible();
  assert.equal(page.url(), url);
  await page.goto("/?q=" + encodeURIComponent("不存在的测试 .."));
  await expect(
    page.getByText("没有符合条件的商品，请调整筛选。", { exact: true }),
  ).toBeVisible();
  await page.goto("/?page=-1");
  await expect(page.getByRole("alert")).toBeVisible();
}

export async function productPublication({
  admin,
  page,
  fixture,
  base,
  demoId,
  config,
}) {
  const original = await (
    await admin.request.get(base + "/api/admin/products/" + demoId("demo-work"))
  ).json();
  const fields = [
    "slug",
    "name",
    "hook",
    "summary",
    "description",
    "categoryId",
    "tagIds",
    "priceFen",
    "durationMinutes",
    "experienceType",
    "themeKey",
    "coverUrl",
    "scope",
    "recommended",
    "publicSample",
    "purchaseUrl",
    "purchaseNotice",
    "redemptionNotice",
  ];
  const metadata = Object.fromEntries(
    fields.map((key) => [key, original[key]]),
  );
  metadata.slug = "demo-ui-" + randomUUID();
  metadata.name = "浏览器发布联调 · 演示";
  metadata.coverUrl = null;
  await admin.goto("/admin/products");
  await admin.getByRole("button", { name: "新建商品", exact: true }).click();
  await admin.getByLabel("商品元数据 JSON", { exact: true }).fill("{");
  await admin.getByRole("button", { name: "创建商品", exact: true }).click();
  await expect(admin.getByRole("alert")).toContainText("JSON 格式");
  await admin
    .getByLabel("商品元数据 JSON", { exact: true })
    .fill(JSON.stringify(metadata));
  await admin.getByRole("button", { name: "创建商品", exact: true }).click();
  await expect(
    admin.getByText("商品资料已保存。", { exact: true }),
  ).toBeVisible();
  const product = await fixture.runtime.client.product.findUniqueOrThrow({
    where: { slug: metadata.slug },
  });
  assert.equal(
    (await page.request.get(base + "/api/products/" + metadata.slug)).status(),
    404,
  );
  await admin
    .getByLabel("从 JSON 文件读取配置", { exact: true })
    .setInputFiles({
      name: "questions.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(config)),
    });
  await expect(
    admin.getByLabel("题目与报告配置 JSON", { exact: true }),
  ).toHaveValue(JSON.stringify(config));
  await admin
    .getByRole("button", { name: "导入为新版本", exact: true })
    .click();
  await expect(
    admin.getByText("已导入新的草稿版本。", { exact: true }),
  ).toBeVisible();
  await admin
    .getByRole("button", { name: "预览版本 1（draft）", exact: true })
    .click();
  await expect(
    admin.getByText("已读取版本预览。", { exact: true }),
  ).toBeVisible();
  await admin
    .getByText("公开展示预览（尚未发布的版本仍不会公开）", { exact: true })
    .click();
  await expect(admin.locator("pre")).toContainText(metadata.name);
  const revised = structuredClone(config);
  revised.questions[0].text = "从后台修改并保存的题目";
  await admin
    .getByLabel("题目与报告配置 JSON", { exact: true })
    .fill(JSON.stringify(revised));
  await expect(
    admin.getByRole("button", { name: "审核版本", exact: true }),
  ).toBeDisabled();
  await admin
    .getByRole("button", { name: "保存配置草稿", exact: true })
    .click();
  await expect(
    admin.getByRole("button", { name: "审核版本", exact: true }),
  ).toBeEnabled();
  await admin.getByRole("button", { name: "审核版本", exact: true }).click();
  await expect(admin.getByText("版本已审核。", { exact: true })).toBeVisible();
  await admin.getByRole("button", { name: "发布版本", exact: true }).click();
  await expect(
    admin.getByText("版本已发布，请刷新商品资料以继续编辑。", { exact: true }),
  ).toBeVisible();
  await page.goto("/products/" + metadata.slug);
  await expect(
    page.getByRole("heading", { name: metadata.name, exact: true }),
  ).toBeVisible();
  const version = await fixture.runtime.client.productVersion.findFirstOrThrow({
    where: { productId: product.id },
  });
  assert.equal(
    version.configuration.questions[0].text,
    revised.questions[0].text,
  );
  await admin
    .getByRole("button", { name: "刷新商品与修订", exact: true })
    .click();
  await expect(
    admin.getByRole("button", { name: "下架商品", exact: true }),
  ).toBeEnabled();
  await admin.getByRole("button", { name: "下架商品", exact: true }).click();
  await expect(
    admin.getByText("商品已下架，请刷新商品资料。", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible();
  assert.equal(
    (await page.request.get(base + "/api/products/" + metadata.slug)).status(),
    404,
  );
}

export async function textAssets({ admin, versionId, fixture }) {
  await admin.goto("/admin/assets");
  for (const kind of ["copy", "script"]) {
    if (kind === "script")
      await admin
        .getByRole("button", { name: "新建另一份素材", exact: true })
        .click();
    await admin.getByLabel("素材类别", { exact: true }).selectOption(kind);
    await admin.getByLabel("商品版本", { exact: true }).selectOption(versionId);
    await admin.getByLabel("变体名", { exact: true }).fill("e2e-" + kind);
    await admin
      .getByLabel("文字内容", { exact: true })
      .fill("以温柔的方式多了解自己一点。");
    await admin
      .getByRole("button", { name: "保存素材草稿", exact: true })
      .click();
    await expect(
      admin.getByText("素材状态：draft", { exact: true }),
    ).toBeVisible();
    await admin
      .getByLabel("文字内容", { exact: true })
      .fill("修改后的引流文案或脚本，仍关联同一个题目版本。");
    await expect(
      admin.getByRole("button", { name: "审核素材", exact: true }),
    ).toBeDisabled();
    await admin
      .getByRole("button", { name: "保存素材修改", exact: true })
      .click();
    await admin.getByRole("button", { name: "审核素材", exact: true }).click();
    await admin.getByRole("button", { name: "标记就绪", exact: true }).click();
    await expect(
      admin.getByText("素材状态：ready", { exact: true }),
    ).toBeVisible();
    assert.equal(
      (
        await fixture.runtime.client.campaignAsset.findFirstOrThrow({
          where: { variant: "e2e-" + kind },
        })
      ).text,
      "修改后的引流文案或脚本，仍关联同一个题目版本。",
    );
    await admin.getByRole("button", { name: "归档素材", exact: true }).click();
    await expect(
      admin.getByText("素材状态：archived", { exact: true }),
    ).toBeVisible();
  }
}

export async function seededReportStates({
  browser,
  fixture,
  base,
  demoId,
  output,
}) {
  const contexts = [];
  const seeded = async (key) => {
    const context = await browser.newContext({
      baseURL: base,
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    contexts.push(context);
    await context.addCookies([
      {
        name: "orai_session",
        value: fixture.credentials.sessions[key],
        url: base,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    return context.newPage();
  };
  try {
    const empty = await seeded("pending");
    await empty.goto("/reports");
    await expect(
      empty.getByText("这里暂时没有内容。", { exact: true }),
    ).toBeVisible();
    const missing = await seeded("not-applicable"),
      id = demoId("report-not-applicable");
    const report = await fixture.runtime.client.report.findUniqueOrThrow({
      where: { id },
    });
    const snapshot = {
      ...report.snapshot,
      productName: "长标题".repeat(53),
      resultLabel: "观察结论".repeat(20),
      explanation: "长解释内容。".repeat(200),
      suggestion: "一步一步观察自己的生活。".repeat(70),
      disclaimer: "仅供娱乐与自我观察。".repeat(28) + "完整声明结束",
    };
    // A long-text response fixture exercises rendering/export only. The real
    // seeded report is immutable; authorization, deletion and usage still go
    // through the database-backed endpoint below.
    await missing.route("**/api/reports/" + id, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch(),
        body = await response.json();
      await route.fulfill({
        response,
        json: response.ok() ? { ...body, content: snapshot } : body,
      });
    });
    await missing.goto("/reports/" + id);
    await expect(
      missing.getByText("信息不足，暂不提供总分", { exact: true }),
    ).toBeVisible();
    assert.equal(
      await missing.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
    );
    await missing.screenshot({
      path: join(output, "long-report-mobile.png"),
      fullPage: true,
    });
    const event = missing.waitForEvent("download");
    await missing
      .getByRole("button", { name: "导出摘要卡", exact: true })
      .click();
    const download = await event;
    await download.saveAs(join(output, "long-summary.png"));
    const png = await readFile(join(output, "long-summary.png"));
    assert.ok(
      png.readUInt32BE(20) > 900,
      "long PNG grows to include its disclaimer",
    );
    await missing.getByText("删除这份报告", { exact: true }).click();
    await expect(
      missing.getByRole("button", { name: "永久删除报告", exact: true }),
    ).toBeDisabled();
    await missing.getByLabel("我确认永久删除这份报告").check();
    await missing
      .getByRole("button", { name: "永久删除报告", exact: true })
      .click();
    await expect(missing).toHaveURL(/\/reports\?source=anonymous$/);
    const deleted = await fixture.runtime.client.report.findUniqueOrThrow({
      where: { id },
    });
    assert.equal(deleted.snapshot, null);
    assert.ok(deleted.deletedAt);
    assert.equal(
      (
        await fixture.runtime.client.entitlement.findUniqueOrThrow({
          where: { id: demoId("entitlement-not-applicable") },
        })
      ).reportsConsumed,
      1,
    );
    await missing.goto("/reports/" + id);
    await expect(missing.getByRole("alert")).toContainText("已删除");
    await expect(
      missing.getByRole("button", { name: "导出摘要卡", exact: true }),
    ).toHaveCount(0);
    for (const key of ["report-expired", "entitlement-expired", "expired"]) {
      const page = await seeded(key);
      await page.goto(
        "/reports/" +
          demoId(key === "expired" ? "report-population-0" : "report-" + key),
      );
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "导出摘要卡", exact: true }),
      ).toHaveCount(0);
    }
  } finally {
    for (const context of contexts) await context.close();
  }
}
