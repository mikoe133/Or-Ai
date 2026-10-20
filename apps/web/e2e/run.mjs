import assert from "node:assert/strict";
import { contentWorkbench } from "./content-workbench.mjs";
import { contentAdoption } from "./content-adoption.mjs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID, randomBytes } from "node:crypto";
import { chromium, expect } from "playwright/test";
import {
  catalogFilters,
  workspaceNavigation,
  workspaceFeedback,
  textContrast,
  productPublication,
  textAssets,
  seededReportStates,
} from "./edge-journeys.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const apiRequire = createRequire(join(root, "apps/api/package.json")),
  webRequire = createRequire(join(root, "apps/web/package.json"));
const { Test } = apiRequire("@nestjs/testing");
const { AppModule } = apiRequire("./.test-build/src/app.module.js");
const { APP_CONFIG } = apiRequire("./.test-build/src/config/configuration.js");
const { configureApp } = apiRequire(
  "./.test-build/src/common/configure-app.js",
);
const { SupabaseAuthGateway } = apiRequire(
  "./.test-build/src/accounts/supabase-auth.gateway.js",
);
const { createLocalFixture } = apiRequire(
  "./.test-build/test/local-fixture.js",
);
const { demoId, DemoIdentityScenarios, DemoProducts } = apiRequire(
  "./.test-build/scripts/demo-fixtures.js",
);
let fixture, app, vite, browser, directory;
let phase = "setup";
const checks = [],
  errors = [];
const output = join(root, ".local/t08/e2e");
await mkdir(output, { recursive: true });
const webPort = Number(process.env.ORAI_E2E_PORT || 5175),
  base = "http://127.0.0.1:" + webPort;
process.env.WEB_PORT = String(webPort);
process.env.API_PORT = "4108";
// These facts are supplied only through Nest's test provider. No test login
// endpoint or bypass is installed in the application or production bundle.
const proofs = new Map(),
  refreshes = new Map();
function credentials(owner = randomUUID()) {
  const accessToken = randomBytes(60).toString("base64url"),
    refreshToken = randomBytes(40).toString("base64url");
  proofs.set(accessToken, {
    supabaseUserId: owner,
    supabaseSessionId: randomUUID(),
    expiresAt: new Date(Date.now() + 3_600_000),
    emailVerified: true,
  });
  refreshes.set(refreshToken, { accessToken, refreshToken });
  return { accessToken, refreshToken };
}
async function signIn(context, owner) {
  const token = (
    await (await context.request.get(base + "/api/account/context")).json()
  ).csrfToken;
  const response = await context.request.post(base + "/api/account/session", {
    headers: { origin: base, "X-CSRF-Token": token },
    data: credentials(owner),
  });
  assert.equal(response.status(), 200);
}
try {
  process.chdir(join(root, "apps/api"));
  fixture = await createLocalFixture("t08");
  directory = await mkdtemp(join(tmpdir(), "orai-t08-"));
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue({
      ...fixture.configuration,
      assets: { ...fixture.configuration.assets, directory },
      security: {
        ...fixture.configuration.security,
        readIpLimit: 2000,
        writeIpLimit: 2000,
        claimIpLimit: 1000,
      },
      auth: {
        url: "https://isolated.example.test",
        publishableKey: "sb_publishable_" + "p".repeat(40),
        sessionEncryptionKey: randomBytes(32).toString("base64url"),
        sessionDays: 30,
        requestTimeoutMs: 1000,
      },
    })
    .overrideProvider(SupabaseAuthGateway)
    .useValue({
      verify: async (token) => {
        const value = proofs.get(token);
        assert.ok(value);
        return value;
      },
      refresh: async (token) => {
        const value = refreshes.get(token);
        assert.ok(value);
        return { ...value, identity: proofs.get(value.accessToken) };
      },
      logout: async () => {},
    })
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, "127.0.0.1");
  process.env.VITE_SUPABASE_URL = "";
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "";
  process.chdir(join(root, "apps/web"));
  const { createServer } = await import(
    pathToFileURL(webRequire.resolve("vite")).href
  );
  vite = await createServer({
    root: join(root, "apps/web"),
    configFile: join(root, "apps/web/vite.config.ts"),
    server: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
      proxy: { "/api": await app.getUrl(), "/health": await app.getUrl() },
    },
  });
  await vite.listen();
  browser = await chromium.launch({
    headless: true,
    ...(process.env.ORAI_BROWSER_PATH
      ? { executablePath: process.env.ORAI_BROWSER_PATH }
      : process.platform === "darwin"
        ? {
            executablePath:
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          }
        : {}),
  });
  const anonymous = await browser.newContext({
      baseURL: base,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await anonymous.newPage();
  page.on("pageerror", (error) => errors.push(error.name));
  phase = "real application list route";
  await page.goto("/apps");
  await expect(
    page.getByRole("heading", { name: "我的应用", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("本机未绑定商品", { exact: true })).toBeVisible();
  checks.push(phase);
  phase = "catalog uses published API products";
  await page.goto("/");
  await expect(
    page.locator('a[href="/products/demo-partner"]').first(),
  ).toBeVisible();
  await expect(
    page.getByText("伴侣协作测试 · 演示", { exact: true }).first(),
  ).toBeVisible();
  checks.push(phase);
  phase = "mall, apps, reports and help share the same page frame";
  await workspaceNavigation(page);
  checks.push(phase);
  phase = "motion preserves sidebar, filter input and dialog focus with reduced motion support";
  await workspaceFeedback(page);
  checks.push(phase);
  phase = "admin denies unsigned users";
  await page.goto("/admin");
  await expect(page.getByText("需要管理员账户", { exact: true })).toBeVisible();
  checks.push(phase);
  phase =
    "catalog filter URLs survive reload and preserve empty and invalid states";
  await catalogFilters(page);
  checks.push(phase);
  const operator = await browser.newContext({
    baseURL: base,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await signIn(operator, DemoIdentityScenarios.admin.supabaseUserId);
  const admin = await operator.newPage();
  phase = "operator records an order and receives a first-only secret delivery";
  await admin.goto("/admin/orders");
  await expect(
    admin.getByRole("heading", { name: "订单管理", exact: true }),
  ).toBeVisible();
  const versionId = demoId("demo-partner-v2"),
    reference = "demo:e2e:" + randomUUID();
  await admin.getByLabel("商品版本", { exact: true }).selectOption(versionId);
  await admin.getByLabel("订单引用", { exact: true }).fill(reference);
  await admin.getByLabel("数量", { exact: true }).fill("1");
  await admin.getByLabel("金额（分）", { exact: true }).fill("990");
  await admin.getByRole("button", { name: "记录订单", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "订单详情", exact: true }),
  ).toBeVisible();
  await admin.getByRole("button", { name: "发码", exact: true }).click();
  await expect(admin.getByLabel("本次交付内容")).toBeVisible();
  const issued = JSON.parse(
      await admin.getByLabel("本次交付内容").inputValue(),
    ),
    orderId = issued.receipt.orderId;
  let code = issued.deliveries[0].code;
  assert.equal(typeof code, "string");
  checks.push(phase);
  phase =
    "first-only delivery can be saved and a replacement revokes the original code";
  const deliveryDownload = admin.waitForEvent("download");
  await admin
    .getByRole("button", { name: "保存交付文件", exact: true })
    .click();
  const delivered = await deliveryDownload;
  const deliveredFile = join(directory, "delivery.json");
  await delivered.saveAs(deliveredFile);
  assert.equal(
    JSON.parse(await readFile(deliveredFile, "utf8")).deliveries[0].code,
    code,
  );
  await admin
    .getByRole("button", { name: "隐藏本次交付", exact: true })
    .click();
  await expect(admin.getByLabel("本次交付内容")).toHaveCount(0);
  await admin.reload();
  await expect(admin.getByLabel("本次交付内容")).toHaveCount(0);
  await admin.getByRole("button", { name: "补发该码", exact: true }).click();
  await expect(admin.getByLabel("本次交付内容")).toBeVisible();
  const replacement = JSON.parse(
    await admin.getByLabel("本次交付内容").inputValue(),
  );
  assert.notEqual(replacement.deliveries[0].code, code);
  assert.equal(
    (
      await fixture.runtime.client.redemptionCode.findUniqueOrThrow({
        where: { id: issued.deliveries[0].id },
      })
    ).status,
    "REVOKED",
  );
  code = replacement.deliveries[0].code;
  checks.push(phase);
  phase = "consumer redeems and resumes a real database entitlement";
  await page.goto("/redeem");
  await page.getByLabel("兑换码", { exact: true }).fill(code);
  await page.getByRole("button", { name: "领取或恢复", exact: true }).click();
  await expect(page).toHaveURL(/\/apps$/);
  await page.getByRole("button", { name: "开始测试", exact: true }).click();
  await expect(page).toHaveURL(/\/attempts\//);
  const attemptId = new URL(page.url()).pathname.split("/").at(-1),
    questions = await (
      await anonymous.request.get(
        base + "/api/attempts/" + attemptId + "/questions",
      )
    ).json();
  assert.equal(questions.questions.length, 6);
  checks.push(phase);
  phase =
    "a failed save stays unsaved and a deliberate retry retains its request ID";
  const saveIds = [];
  let failOnce = true;
  await page.route("**/api/attempts/*/answers/*", async (route) => {
    saveIds.push(route.request().postDataJSON().requestId);
    if (failOnce) {
      failOnce = false;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "保存答案", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("连接失败");
  await expect(
    page.getByRole("progressbar", { name: "已保存进度" }),
  ).toHaveAttribute("value", "0");
  await expect(
    page.getByRole("button", { name: "下一题", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "保存答案", exact: true }).click();
  await expect(
    page.getByRole("progressbar", { name: "已保存进度" }),
  ).toHaveAttribute("value", "1");
  assert.equal(saveIds[0], saveIds[1]);
  await page.unroute("**/api/attempts/*/answers/*");
  await page.reload();
  await expect(
    page.getByRole("progressbar", { name: "已保存进度" }),
  ).toHaveAttribute("value", "1");
  checks.push(phase);
  phase =
    "saved progress, unavailable feedback and report creation remain truthful";
  for (let index = 1; index < questions.questions.length; index++) {
    await page.getByRole("button", { name: "下一题", exact: true }).click();
    await expect(page.getByRole("group")).toContainText(
      "第 " + (index + 1) + "/" + questions.questions.length + " 题",
    );
    if (index === 1)
      await page.route("**/api/attempts/*/answers/*", async (route) => {
        const response = await route.fetch(),
          body = await response.json();
        body.feedback = null;
        body.feedbackStatus = "unavailable";
        await route.fulfill({ response, json: body });
      });
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "保存答案", exact: true }).click();
    await expect(
      page.getByRole("progressbar", { name: "已保存进度" }),
    ).toHaveAttribute("value", String(index + 1));
    if (index === 1) {
      await expect(
        page.getByText("统计暂不可用，答案已保存，可以继续作答。"),
      ).toBeVisible();
      await page.unroute("**/api/attempts/*/answers/*");
    }
  }
  await page.getByRole("button", { name: "生成报告", exact: true }).click();
  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+$/);
  const reportPath = new URL(page.url()).pathname,
    reportId = reportPath.split("/").at(-1);
  await expect(
    page.getByRole("heading", { name: "伴侣协作测试 · 演示", exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出摘要卡", exact: true }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "meetmyworld-summary.png");
  await download.saveAs(join(output, "summary.png"));
  assert.equal(
    (await readFile(join(output, "summary.png"))).subarray(1, 4).toString(),
    "PNG",
  );
  const entitlement = await fixture.runtime.client.entitlement.findFirstOrThrow(
    { where: { orderId } },
  );
  assert.equal(entitlement.reportsConsumed, 1);
  assert.equal(page.url().includes(code), false);
  await page.screenshot({ path: join(output, "report.png"), fullPage: true });
  checks.push(phase);
  phase =
    "code recovery on a separate browser restores the same report without another credit";
  const recovery = await browser.newContext({
      baseURL: base,
      reducedMotion: "reduce",
    }),
    restored = await recovery.newPage();
  await restored.goto("/redeem");
  await restored.getByLabel("兑换码", { exact: true }).fill(code);
  await restored
    .getByRole("button", { name: "领取或恢复", exact: true })
    .click();
  await expect(
    restored.getByRole("link", { name: "查看报告", exact: true }),
  ).toBeVisible();
  await restored.getByRole("link", { name: "查看报告", exact: true }).click();
  await expect(restored).toHaveURL(new RegExp(reportPath + "(?:\\?|$)"));
  assert.equal(
    (
      await fixture.runtime.client.entitlement.findUniqueOrThrow({
        where: { id: entitlement.id },
      })
    ).reportsConsumed,
    1,
  );
  checks.push(phase);
  phase = "binding is explicit and account devices show their own list";
  const owner = randomUUID();
  await signIn(anonymous, owner);
  await page.goto("/account");
  await page.getByLabel("要绑定的兑换码", { exact: true }).fill(code);
  await expect(
    page.getByRole("button", { name: "确认绑定", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("我确认将此商品绑定到当前账户").check();
  await page.getByRole("button", { name: "确认绑定", exact: true }).click();
  await expect(page).toHaveURL(/source=account/);
  await expect(
    page.getByRole("link", { name: "查看报告", exact: true }),
  ).toBeVisible();
  const device = await browser.newContext({
    baseURL: base,
    reducedMotion: "reduce",
  });
  await signIn(device, owner);
  const devicePage = await device.newPage();
  await devicePage.goto("/reports?source=account");
  await devicePage.getByRole("link", { name: "查看报告", exact: true }).click();
  await expect(
    devicePage.getByRole("heading", {
      name: "伴侣协作测试 · 演示",
      exact: true,
    }),
  ).toBeVisible();
  checks.push(phase);
  phase =
    "logout and identity switching remove private reports across open tabs";
  const sibling = await anonymous.newPage();
  await sibling.goto(reportPath);
  await expect(
    sibling.getByRole("button", { name: "导出摘要卡", exact: true }),
  ).toBeVisible();
  await page.goto("/account");
  await page.getByRole("button", { name: "退出账户", exact: true }).click();
  await expect(page.getByText("当前未登录。", { exact: true })).toBeVisible();
  await expect(sibling.getByRole("alert")).toBeVisible();
  await expect(
    sibling.getByRole("button", { name: "导出摘要卡", exact: true }),
  ).toHaveCount(0);
  await page.goto(reportPath);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导出摘要卡", exact: true }),
  ).toHaveCount(0);
  await sibling.close();
  checks.push(phase);
  phase = "ordinary accounts cannot render or operate admin views";
  await signIn(anonymous, randomUUID());
  await page.goto("/admin/orders");
  await expect(
    page.getByText("当前账户没有已验证的管理员权限。", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "发码", exact: true }),
  ).toHaveCount(0);
  checks.push(phase);
  phase = "operator CSV preview reports row failures without creating orders";
  await admin
    .getByLabel("CSV 内容", { exact: true })
    .fill(
      "platform,reference,productVersionId,quantity,amountFen\nmanual,demo:csv-ui," +
        versionId +
        ",1,990\nmanual,demo:bad," +
        versionId +
        ",0,990",
    );
  await admin.getByRole("button", { name: "预演 CSV", exact: true }).click();
  await expect(
    admin.getByText("通过 1 行，失败 1 行", { exact: true }),
  ).toBeVisible();
  assert.equal(
    await fixture.runtime.client.order.count({
      where: { reference: "demo:csv-ui" },
    }),
    0,
  );
  checks.push(phase);
  phase =
    "CSV import writes only the accepted rows and preserves partial failure details";
  await admin
    .getByRole("button", { name: "导入通过的行", exact: true })
    .click();
  await expect(
    admin.getByText("导入结果已保存；重试相同内容不会重复建单。", {
      exact: true,
    }),
  ).toBeVisible();
  assert.equal(
    await fixture.runtime.client.order.count({
      where: { reference: "demo:csv-ui" },
    }),
    1,
  );
  assert.equal(
    await fixture.runtime.client.order.count({
      where: { reference: "demo:bad" },
    }),
    0,
  );
  checks.push(phase);
  phase =
    "operator verifies, previews and reviews actual image and video files";
  await admin.goto("/admin/assets");
  for (const [kind, name] of [
    ["cover", "cover.jpg"],
    ["video", "preview.webm"],
  ]) {
    if (kind === "video")
      await admin
        .getByRole("button", { name: "新建另一份素材", exact: true })
        .click();
    await admin.getByLabel("素材类别", { exact: true }).selectOption(kind);
    await admin.getByLabel("商品版本", { exact: true }).selectOption(versionId);
    await admin.getByLabel("变体名", { exact: true }).fill("e2e-" + kind);
    await admin
      .getByLabel("媒体文件", { exact: true })
      .setInputFiles(join(root, "apps/api/test/fixtures", name));
    await admin
      .getByRole("button", { name: "上传并校验", exact: true })
      .click();
    await expect(
      admin.getByText("文件已校验，可关联素材。", { exact: true }),
    ).toBeVisible();
    if (kind === "video")
      await expect
        .poll(() =>
          admin.locator("video").evaluate((video) => video.videoWidth),
        )
        .toBe(16);
    await admin
      .getByRole("button", { name: "保存素材草稿", exact: true })
      .click();
    await admin.getByRole("button", { name: "审核素材", exact: true }).click();
    await admin.getByRole("button", { name: "标记就绪", exact: true }).click();
    await expect(
      admin.getByText("素材状态：ready", { exact: true }),
    ).toBeVisible();
    if (kind === "cover") {
      await admin
        .getByRole("button", { name: "采用为商品封面", exact: true })
        .click();
      await expect(
        admin.getByText("已采用为当前商品封面。", { exact: true }),
      ).toBeVisible();
    }
  }
  await admin.screenshot({
    path: join(output, "admin-assets.png"),
    fullPage: true,
  });
  checks.push(phase);
  phase = "unsaved media cannot be reviewed or adopted as the previous asset";
  await admin
    .getByRole("article")
    .filter({
      has: admin.getByRole("heading", {
        name: "cover · e2e-cover",
        exact: true,
      }),
    })
    .getByRole("button", { name: "编辑素材", exact: true })
    .click();
  await admin
    .getByLabel("媒体文件", { exact: true })
    .setInputFiles(join(root, "apps/api/test/fixtures/cover.webp"));
  await expect(
    admin.getByRole("button", { name: "保存素材修改", exact: true }),
  ).toBeDisabled();
  await expect(
    admin.getByRole("button", { name: "采用为商品封面", exact: true }),
  ).toBeDisabled();
  await expect(
    admin.getByText("当前已保存媒体预览", { exact: true }),
  ).toBeVisible();
  let releaseUpload;
  const uploadGate = new Promise((resolve) => {
    releaseUpload = resolve;
  });
  await admin.route("**/api/admin/uploads", async (route) => {
    const response = await route.fetch();
    await uploadGate;
    await route.fulfill({ response });
  });
  try {
    await admin
      .getByRole("button", { name: "上传并校验", exact: true })
      .click();
    await expect(admin.getByLabel("媒体文件", { exact: true })).toBeDisabled();
    await expect(admin.getByLabel("变体名", { exact: true })).toBeDisabled();
  } finally {
    releaseUpload();
  }
  await admin.unroute("**/api/admin/uploads");
  await expect(
    admin.getByRole("button", { name: "保存素材修改", exact: true }),
  ).toBeEnabled();
  await expect(
    admin.getByRole("button", { name: "采用为商品封面", exact: true }),
  ).toBeDisabled();
  await admin
    .getByRole("button", { name: "保存素材修改", exact: true })
    .click();
  await expect(
    admin.getByText("素材状态：draft", { exact: true }),
  ).toBeVisible();
  const savedAsset =
    await fixture.runtime.client.campaignAsset.findFirstOrThrow({
      where: { variant: "e2e-cover" },
    });
  await fixture.runtime.client.campaignAsset.update({
    where: { id: savedAsset.id },
    data: { variant: "concurrent-edit", revision: { increment: 1 } },
  });
  await admin.getByRole("button", { name: "审核素材", exact: true }).click();
  await expect(admin.getByRole("alert")).toContainText("刷新");
  await admin
    .getByRole("button", { name: "刷新素材与修订", exact: true })
    .click();
  await expect(admin.getByLabel("变体名", { exact: true })).toHaveValue(
    "concurrent-edit",
  );
  await admin.getByLabel("变体名", { exact: true }).fill("unsaved-metadata");
  await expect(
    admin.getByRole("button", { name: "审核素材", exact: true }),
  ).toBeDisabled();
  checks.push(phase);
  phase =
    "operator creates, imports, previews, revises, reviews, publishes and unlists a product";
  await productPublication({
    admin,
    page,
    fixture,
    base,
    demoId,
    config: DemoProducts[1].configurations[0],
  });
  checks.push(phase);
  phase =
    "copy and script assets retain their version link through edits and archival";
  await textAssets({ admin, fixture, versionId });
  checks.push(phase);
  phase = "four-domain content workbench edits, media and suite preview";
  checks.push(...await contentWorkbench({ admin, fixture, productId: demoId('demo-partner'), root, output: join(root, '.local/t12-b/e2e') }));
  phase = "fixed references, adoption, impact recheck and protected cleanup";
  checks.push(...await contentAdoption({ admin, browser, fixture, base, root, output: join(root,'.local/t12-c/e2e'), directory, adminUserId:DemoIdentityScenarios.admin.id, sourceProductId:demoId('demo-partner') }));
  phase =
    "empty, long, null-score, deleted and expired reports remain truthful";
  await seededReportStates({ browser, fixture, base, demoId, output });
  checks.push(phase);
  phase =
    "refund immediately denies a bound account report without changing its snapshot or usage";
  await admin.goto("/admin/orders?order=" + orderId);
  await admin.getByLabel("已核对订单并在原平台处理退款").check();
  await admin.getByRole("button", { name: "退款并撤权", exact: true }).click();
  await expect(
    admin.getByText("订单状态：refunded", { exact: true }),
  ).toBeVisible();
  await devicePage.reload();
  await expect(devicePage.getByRole("alert")).toBeVisible();
  assert.equal(
    (
      await fixture.runtime.client.entitlement.findUniqueOrThrow({
        where: { id: entitlement.id },
      })
    ).reportsConsumed,
    1,
  );
  assert.notEqual(
    (
      await fixture.runtime.client.report.findUniqueOrThrow({
        where: { id: reportId },
      })
    ).snapshot,
    null,
  );
  checks.push(phase);
  phase =
    "mobile pages fit, remain legible and keep the design preview separate";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/assets/*/files/*/content', route => route.abort('failed'));
  await page.goto("/");
  await expect(
    page.locator('a[href="/products/demo-partner"]').first(),
  ).toBeVisible();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  const visualChecks = await Promise.allSettled([
    (async () =>
      assert.ok(
        (await textContrast(
          page.getByRole("heading", { name: "发现有趣的自己", exact: true }),
        )) >= 4.5,
        "functional page text must contrast against its actual surface",
      ))(),
    expect.poll(() => page.locator('.catalog-featured img').evaluateAll(images =>
      images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0)
    )).toBe(true),
  ]);
  assert.deepEqual(
    visualChecks.map((result) => result.status),
    ["fulfilled", "fulfilled"],
    "text contrast and an unavailable cover need usable fallbacks",
  );
  await page.screenshot({
    path: join(output, "mobile-catalog.png"),
    fullPage: true,
  });
  await page.goto("/preview");
  await expect(
    page.getByText("独立设计预览 · 数据为示例", { exact: false }),
  ).toBeVisible();
  checks.push(phase);
  await anonymous.close();
  await recovery.close();
  await device.close();
  await operator.close();
  assert.deepEqual(errors, []);
  for (const name of await readdir(output))
    if (/^failure(?:-page-\d+)?\.txt$/.test(name)) await rm(join(output, name));
  await writeFile(
    join(output, "result.json"),
    JSON.stringify(
      {
        passed: true,
        checks,
        identityFactsIsolated: true,
        cloudAuthAccepted: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ passed: true, checks, cloudAuthAccepted: false }),
  );
} catch (error) {
  await writeFile(
    join(output, "failure.txt"),
    String(error.stack).replace(/[A-Za-z0-9_-]{43,}/g, "[redacted]"),
  );
  if (browser) {
    let index = 0;
    for (const context of browser.contexts())
      for (const page of context.pages())
        await writeFile(
          join(output, "failure-page-" + index++ + ".txt"),
          (await page.locator("body").innerText()).replace(
            /[A-Za-z0-9_-]{43,}/g,
            "[redacted]",
          ),
        );
  }
  await writeFile(
    join(output, "result.json"),
    JSON.stringify(
      { passed: false, phase, checks, errorType: error.name },
      null,
      2,
    ) + "\n",
  );
  console.error(
    JSON.stringify({ passed: false, phase, errorType: error.name }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  await vite?.close();
  await app?.close();
  await fixture?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
}
