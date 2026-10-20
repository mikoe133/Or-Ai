import assert from "node:assert/strict";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { expect } from "playwright/test";
export async function contentWorkbench({
  admin,
  fixture,
  productId,
  root,
  output,
}) {
  const checks = [],
    db = fixture.runtime.client;
  const productBefore = await db.product.findUniqueOrThrow({
      where: { id: productId },
    }),
    published = await db.productVersion.findUniqueOrThrow({
      where: { id: productBefore.currentVersionId },
    });
  const enter = async (name) =>
    admin
      .getByRole("navigation", { name: "内容工作台页签" })
      .getByRole("button", { name, exact: true })
      .click();
  await admin.goto("/admin/content");
  await admin.getByRole("link", { name: /伴侣协作测试/ }).click();
  await expect(
    admin.getByRole("heading", { name: "共同创作设定", exact: true }),
  ).toBeVisible();
  await admin
    .getByLabel("希望带来的情绪感受", { exact: true })
    .fill("在关系中感到被理解，也更愿意表达自己的需要");
  await admin
    .getByRole("button", { name: "保存设定新修订", exact: true })
    .click();
  await expect(
    admin.getByLabel("共同创作设定", { exact: true }),
  ).not.toHaveValue("");
  const firstProfile = await db.creativeProfileRevision.findFirstOrThrow({
    where: { productId },
    orderBy: { number: "desc" },
  });
  await admin
    .getByLabel("视觉风格", { exact: true })
    .fill("水彩花园与纸张质感");
  await admin
    .getByRole("button", { name: "保存设定新修订", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        await db.creativeProfileRevision.count({ where: { productId } }),
    )
    .toBe(firstProfile.number + 1);
  const latestProfile = await db.creativeProfileRevision.findFirstOrThrow({
    where: { productId },
    orderBy: { number: "desc" },
  });
  assert.deepEqual(
    (
      await db.creativeProfileRevision.findUniqueOrThrow({
        where: { id: firstProfile.id },
      })
    ).profile,
    firstProfile.profile,
  );
  checks.push(
    "creative profiles append fixed revisions and retain the old setting",
  );
  await enter("题库与报告");
  await expect(admin.getByLabel("题目 1 题干", { exact: true })).toBeVisible();
  await admin
    .getByLabel("题目 1 题干", { exact: true })
    .fill("一天结束后，你最希望对方如何陪伴你？");
  await admin
    .getByLabel("报告 1 解释", { exact: true })
    .fill("这是一次温柔的关系观察，帮助你更具体地表达自己的需要。");
  await expect(
    admin.getByRole("button", { name: "保存题库草稿", exact: true }),
  ).toBeDisabled();
  await admin.getByRole("button", { name: "派生新版本", exact: true }).click();
  await expect(
    admin.getByLabel("工作台题库版本", { exact: true }),
  ).not.toHaveValue(published.id);
  const versionId = await admin
    .getByLabel("工作台题库版本", { exact: true })
    .inputValue();
  assert.deepEqual(
    (await db.productVersion.findUniqueOrThrow({ where: { id: published.id } }))
      .configuration,
    published.configuration,
  );
  await expect(admin.getByLabel("题目 1 题干", { exact: true })).toHaveValue(
    "一天结束后，你最希望对方如何陪伴你？",
  );
  await admin
    .getByLabel("报告 1 建议", { exact: true })
    .fill("试着说：今天我希望你先听我说一会儿。");
  await admin
    .getByRole("button", { name: "保存题库草稿", exact: true })
    .click();
  await expect(
    admin.getByRole("button", { name: "保存题库草稿", exact: true }),
  ).toBeDisabled();
  await admin.getByLabel("题库制作批次", { exact: true }).fill("workbench-day");
  await admin
    .getByRole("button", { name: "登记本修订制作来源", exact: true })
    .click();
  await expect(
    admin.getByText("manual · 批次 workbench-day · Skill 未关联", {
      exact: true,
    }),
  ).toBeVisible();
  checks.push(
    "published assessment derives a draft and preserves the published questions, with editable reports and a fixed production record",
  );
  await admin
    .getByLabel("样例标题", { exact: true })
    .fill("关系花园 · 公开样例");
  await admin
    .getByRole("button", { name: "保存公开样例", exact: true })
    .click();
  await expect(
    admin.getByRole("button", { name: "保存公开样例", exact: true }),
  ).toBeDisabled();
  await enter("引流文案");
  const copy = admin.getByRole("region", {
    name: "引流文案工作台",
    exact: true,
  });
  await copy.getByLabel("稿件名称", { exact: true }).fill("workbench-copy");
  await copy
    .getByLabel("文案块 1 内容", { exact: true })
    .fill("你的需要，值得被认真听见。");
  await copy
    .getByLabel("文案块 2 内容", { exact: true })
    .fill("来花园里，认识更真实的自己。");
  await copy
    .getByLabel("制作来源", { exact: true })
    .selectOption("external_ai");
  await copy.getByLabel("制作批次", { exact: true }).fill("workbench-day");
  await expect(
    admin.getByLabel("工作台题库版本", { exact: true }),
  ).toBeDisabled();
  await copy.getByRole("button", { name: "保存内容草稿", exact: true }).click();
  await expect(
    copy.getByRole("button", { name: "编辑workbench-copy", exact: true }),
  ).toBeVisible();
  const firstCopy = await db.campaignAsset.findFirstOrThrow({
    where: { productVersionId: versionId, variant: "workbench-copy" },
  });
  assert.equal(firstCopy.authoring.production.skillVersionId, null);
  assert.equal(firstCopy.authoring.creativeProfileRevisionId, latestProfile.id);
  await copy
    .getByLabel("文案块 1 内容", { exact: true })
    .fill("你的需要，值得被温柔地认真听见。");
  await copy.getByRole("button", { name: "保存内容草稿", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.campaignAsset.findUniqueOrThrow({
            where: { id: firstCopy.id },
          })
        ).revision,
    )
    .toBe(1);
  await admin.reload();
  await expect(admin.getByLabel("工作台题库版本", { exact: true })).toHaveValue(
    versionId,
  );
  await copy
    .getByRole("button", { name: "编辑workbench-copy", exact: true })
    .click();
  await expect(copy.getByLabel("文案块 1 内容", { exact: true })).toHaveValue(
    "你的需要，值得被温柔地认真听见。",
  );
  await expect(copy.getByLabel("文案块 1 ID", { exact: true })).toHaveValue(
    "hook",
  );
  checks.push(
    "structured copy preserves block IDs, source and the selected draft across saves and reload",
  );
  await enter("封面");
  const cover = admin.getByRole("region", { name: "封面工作台", exact: true });
  await cover.getByLabel("稿件名称", { exact: true }).fill("workbench-cover");
  await cover.getByLabel("封面标题", { exact: true }).fill("关系里的小小花园");
  await cover
    .getByLabel("画面与传播说明", { exact: true })
    .fill("水彩花园与纸张质感，邀请用户温柔地观察自己的需要。");
  await cover.getByLabel("归档编号", { exact: true }).fill("garden-master");
  await cover
    .getByLabel("登记本地原件", { exact: true })
    .setInputFiles(join(root, "apps/api/test/fixtures/cover.jpg"));
  await expect(
    cover.getByText("原件信息已登记，请保存素材。", { exact: true }),
  ).toBeVisible();
  await cover
    .getByLabel("预览文件", { exact: true })
    .setInputFiles(join(root, "apps/api/test/fixtures/cover.webp"));
  await expect(
    cover.getByRole("button", { name: "保存内容草稿", exact: true }),
  ).toBeDisabled();
  await cover
    .getByRole("button", { name: "上传并校验预览", exact: true })
    .click();
  await expect(
    cover.getByText("预览已校验，请保存素材。", { exact: true }),
  ).toBeVisible();
  await cover
    .getByRole("button", { name: "保存内容草稿", exact: true })
    .click();
  await expect(
    cover.getByRole("button", { name: "审核内容", exact: true }),
  ).toBeDisabled();
  await cover
    .getByLabel("正式文件", { exact: true })
    .setInputFiles(join(root, "apps/api/test/fixtures/cover.jpg"));
  await cover
    .getByRole("button", { name: "上传并校验正式", exact: true })
    .click();
  await expect(
    cover.getByText("正式已校验，请保存素材。", { exact: true }),
  ).toBeVisible();
  await cover
    .getByRole("button", { name: "保存内容草稿", exact: true })
    .click();
  await expect(
    cover.getByRole("button", { name: "审核内容", exact: true }),
  ).toBeEnabled();
  const savedCover = await db.campaignAsset.findFirstOrThrow({
    where: { productVersionId: versionId, variant: "workbench-cover" },
  });
  assert.notEqual(savedCover.fileId, savedCover.authoring.media.previewFileId);
  const coverFile = await db.assetFile.findUniqueOrThrow({
    where: { id: savedCover.fileId },
  });
  assert.equal(coverFile.width, 16);
  assert.equal(coverFile.height, 16);
  const download = admin.waitForEvent("download");
  await cover
    .getByRole("button", { name: "授权下载正式", exact: true })
    .click();
  assert.equal((await download).suggestedFilename(), "cover.jpg");
  checks.push(
    "local original, verified preview and delivery remain distinct; file geometry and authorized download work",
  );
  await enter("视频与分镜");
  const video = admin.getByRole("region", {
    name: "视频与分镜工作台",
    exact: true,
  });
  await video.getByLabel("稿件名称", { exact: true }).fill("workbench-video");
  await video
    .getByLabel("分镜 1 内容", { exact: true })
    .fill("以水彩花园开场，呈现一次温柔的自我观察。");
  await video.getByLabel("分镜 1 结束", { exact: true }).fill("1000");
  await video
    .getByLabel("预览文件", { exact: true })
    .setInputFiles(join(root, "apps/api/test/fixtures/preview.mp4"));
  let failOnce = true;
  await admin.route("**/api/admin/uploads/*/content", (route) => {
    if (failOnce) {
      failOnce = false;
      return route.abort("failed");
    }
    return route.continue();
  });
  await video
    .getByRole("button", { name: "上传并校验预览", exact: true })
    .click();
  await expect(video.getByRole("alert")).toContainText("连接失败");
  await video
    .getByRole("button", { name: "上传并校验预览", exact: true })
    .click();
  await expect(
    video.getByText("预览已校验，请保存素材。", { exact: true }),
  ).toBeVisible();
  await admin.unroute("**/api/admin/uploads/*/content");
  await video
    .getByRole("button", { name: "保存内容草稿", exact: true })
    .click();
  await expect(
    video.getByRole("button", { name: "编辑workbench-video", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      video
        .locator("video")
        .first()
        .evaluate((element) => element.videoWidth),
    )
    .toBe(16);
  await video.getByRole("button", { name: "添加分镜", exact: true }).click();
  await video.getByLabel("分镜 2 内容", { exact: true }).fill("慢慢认识自己。");
  await video.getByLabel("分镜 2 开始", { exact: true }).fill("0");
  await video
    .getByRole("button", { name: "保存内容草稿", exact: true })
    .click();
  await expect(video.getByRole("alert")).toContainText("字段未通过校验");
  await video
    .getByRole("button", { name: "放弃内容修改", exact: true })
    .click();
  checks.push(
    "real video metadata and playback survive a failed upload retry; overlapping scenes cannot save",
  );
  await enter("整套预览");
  await admin
    .getByRole("button", { name: "加载已保存宣传预览", exact: true })
    .click();
  await expect(
    admin
      .getByRole("region", { name: "整套内容预览" })
      .getByText("你的需要，值得被温柔地认真听见。", { exact: false }),
  ).toBeVisible();
  await expect(
    admin.getByRole("heading", { name: "关系花园 · 公开样例", exact: true }),
  ).toBeVisible();
  const region = admin.getByRole("region", { name: "运营后台", exact: true });
  assert.equal(
    await region.evaluate((element) => getComputedStyle(element).overflowY),
    "auto",
  );
  assert.equal(
    await admin.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
    true,
  );
  await mkdir(output, { recursive: true });
  await region.evaluate((element) => {
    element.scrollTop = 0;
  });
  await admin.screenshot({
    path: join(output, "content-suite-desktop.jpg"),
    fullPage: true,
    type: "jpeg",
    quality: 85,
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  await region.evaluate((element) => {
    element.scrollTop = 0;
  });
  await admin.screenshot({
    path: join(output, "content-suite-mobile.jpg"),
    fullPage: true,
    type: "jpeg",
    quality: 85,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  checks.push(
    "suite preview combines the chosen setting, assessment, report, media, copy and public share sample inside the admin scroll area",
  );
  // A stale editor must keep its local draft and expose a refresh path.
  await enter("引流文案");
  const currentCopy = await db.campaignAsset.findUniqueOrThrow({
    where: { id: firstCopy.id },
  });
  await db.campaignAsset.update({
    where: { id: firstCopy.id },
    data: { variant: "workbench-concurrent", revision: { increment: 1 } },
  });
  await copy.getByRole("button", { name: "审核内容", exact: true }).click();
  await expect(copy.getByRole("alert")).toContainText("刷新");
  await copy.getByRole("button", { name: "读取最新稿", exact: true }).click();
  await expect(copy.getByLabel("稿件名称", { exact: true })).toHaveValue(
    "workbench-concurrent",
  );
  assert.equal(currentCopy.authoring.content.blocks[0].blockId, "hook");
  checks.push(
    "concurrent edits reject stale revisions and can reload the latest saved content",
  );
  return checks;
}
