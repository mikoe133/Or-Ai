import { expandSavedAssets } from "./admin-workbench.mjs";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "playwright/test";
async function makeGardenMedia(browser, output, hook, questionTexts, cta) {
  await mkdir(output, { recursive: true });
  const page = await browser.newPage();
  try {
    const media = await page.evaluate(
      async ({ hook, questionTexts, cta }) => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");
        function draw(index) {
          const gradient = ctx.createLinearGradient(0, 0, 640, 360);
          gradient.addColorStop(0, "#e7efe3");
          gradient.addColorStop(1, "#f8eef6");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 640, 360);
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 ? "#b3c7a480" : "#d9bed480";
            ctx.beginPath();
            ctx.ellipse(
              40 + i * 82,
              300 - (i % 3) * 18,
              28,
              65,
              (i % 2 ? 1 : -1) * 0.5,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
          ctx.fillStyle = "#5d6860";
          ctx.font = "18px sans-serif";
          ctx.fillText("MEETMYWORLD  /  关系花园", 40, 45);
          ctx.fillStyle = "#384c40";
          ctx.font = "bold 30px sans-serif";
          ctx.fillText(
            [
              "让需要被听见",
              "想一想自己",
              "看看相处中的选择",
              "给自己一点温柔",
            ][index],
            40,
            105,
          );
          ctx.font = "26px sans-serif";
          const text = [hook, ...questionTexts, cta][index];
          let line = "",
            row = 0;
          for (const char of text) {
            if (ctx.measureText(line + char).width > 550) {
              ctx.fillText(line, 40, 160 + row * 42);
              line = "";
              row++;
            }
            line += char;
          }
          ctx.fillText(line, 40, 160 + row * 42);
          ctx.fillStyle = "#617563";
          ctx.font = "16px sans-serif";
          ctx.fillText("一次轻松的自我与关系观察 · 演示内容", 40, 330);
        }
        draw(0);
        const cover = canvas.toDataURL("image/png").split(",")[1],
          stream = canvas.captureStream(10),
          chunks = [];
        const recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8",
          videoBitsPerSecond: 350000,
        });
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        const finished = new Promise((resolve) => {
          recorder.onstop = resolve;
        });
        recorder.start();
        for (let frame = 0; frame < 84; frame++) {
          draw(Math.min(3, Math.floor(frame / 20)));
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        recorder.stop();
        await finished;
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: "video/webm" }),
          video = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(",")[1]);
            reader.readAsDataURL(blob);
          });
        return { cover, video };
      },
      { hook, questionTexts, cta },
    );
    const coverPath = join(output, "relationship-garden-cover.png"),
      videoPath = join(output, "relationship-garden-demo.webm");
    await writeFile(coverPath, Buffer.from(media.cover, "base64"));
    await writeFile(videoPath, Buffer.from(media.video, "base64"));
    return { coverPath, videoPath };
  } finally {
    await page.close();
  }
}
export async function contentAdoption({
  admin,
  browser,
  fixture,
  base,
  root,
  output,
  directory,
  adminUserId,
  sourceProductId,
}) {
  const checks = [],
    db = fixture.runtime.client;
  await mkdir(output, { recursive: true });
  const json = async (path) => {
    const result = await admin.request.get(base + path);
    assert.equal(result.status(), 200);
    return result.json();
  };
  const post = async (path, data) => {
    const csrf = (await json("/api/account/context")).csrfToken,
      result = await admin.request.post(base + path, {
        headers: { origin: base, "X-CSRF-Token": csrf },
        data,
      });
    assert.equal(result.status(), 200);
    return result.json();
  };
  const original = await json("/api/admin/products/" + sourceProductId),
    originalVersion = await json(
      "/api/admin/products/" +
        sourceProductId +
        "/versions/" +
        original.currentVersionId +
        "/preview",
    );
  const keys = [
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
  const metadata = Object.fromEntries(keys.map((key) => [key, original[key]]));
  metadata.slug = "garden-" + randomUUID();
  metadata.name = "关系花园 · 内容包验收";
  metadata.coverUrl = null;
  const product = await post("/api/admin/products", {
      ...metadata,
      requestId: randomUUID(),
    }),
    version = await post("/api/admin/products/" + product.id + "/versions", {
      configuration: originalVersion.configuration,
      requestId: randomUUID(),
    });
  const enter = async (name) =>
    admin
      .getByRole("navigation", { name: "内容工作台页签" })
      .getByRole("button", { name, exact: true })
      .click();
  const head = async (assetId) => {
    const result = await json(
      "/api/admin/content-revisions?productId=" +
        product.id +
        "&assetId=" +
        assetId +
        "&current=true",
    );
    return result.items[0];
  };
  await admin.goto("/admin/content/" + product.id + "?version=" + version.id);
  await admin
    .getByLabel("设定名称", { exact: true })
    .fill("关系花园 · 温柔表达自己的需要");
  await admin
    .getByLabel("希望带来的情绪感受", { exact: true })
    .fill("感到被理解，也愿意表达自己的需要");
  await admin
    .getByLabel("希望加深的理解", { exact: true })
    .fill("看见相处中的分担、倾听与自己的节奏");
  await admin
    .getByLabel("视觉风格", { exact: true })
    .fill("柔和的水彩花园、浅绿与纸张质感");
  await admin
    .getByRole("button", { name: "保存设定新修订", exact: true })
    .click();
  await expect(
    admin.getByLabel("共同创作设定", { exact: true }),
  ).not.toHaveValue("");
  const profileId = await admin
    .getByLabel("共同创作设定", { exact: true })
    .inputValue();
  await enter("商品内容");
  await admin.getByLabel("题库制作批次", { exact: true }).fill("garden-demo");
  await admin
    .getByRole("button", { name: "登记本修订制作来源", exact: true })
    .click();
  await expect(
    admin.getByText("manual · 批次 garden-demo · 未关联 skill", {
      exact: true,
    }),
  ).toBeVisible();
  await enter("成套采用");
  await admin
    .getByRole("button", { name: "审核所选题库", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.productVersion.findUniqueOrThrow({
            where: { id: version.id },
          })
        ).status,
    )
    .toBe("REVIEWED");
  const assessment = (
    await json(
      "/api/admin/content-revisions?productId=" +
        product.id +
        "&domain=assessment&current=true",
    )
  ).items[0];
  const hook = "你的需要，值得被认真听见。",
    cta = "来花园里，认识更真实的自己。",
    questions = originalVersion.configuration.questions.slice(0, 2),
    shortQuestion = "共同安排生活时，你会主动分担吗？";
  const media = await makeGardenMedia(
    browser,
    join(output, "media"),
    hook,
    [shortQuestion, questions[1].text],
    cta,
  );
  await enter("引流文案");
  const copy = admin.getByRole("region", {
    name: "引流文案工作台",
    exact: true,
  });
  await copy.getByLabel("稿件名称", { exact: true }).fill("garden-copy");
  await copy.getByLabel("制作批次", { exact: true }).fill("garden-demo");
  await copy.getByLabel("文案块 1 内容", { exact: true }).fill(hook);
  await copy.getByLabel("文案块 2 内容", { exact: true }).fill(cta);
  await copy.getByRole("button", { name: "保存内容草稿", exact: true }).click();
  await expect(
    copy.getByRole("button", { name: "审核内容", exact: true }),
  ).toBeEnabled();
  await copy.getByRole("button", { name: "审核内容", exact: true }).click();
  await copy.getByRole("button", { name: "标记就绪", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.campaignAsset.findFirst({
            where: { productVersionId: version.id, variant: "garden-copy" },
          })
        )?.status,
    )
    .toBe("READY");
  const copyAsset = await db.campaignAsset.findFirstOrThrow({
      where: { productVersionId: version.id, variant: "garden-copy" },
    }),
    copyRevision = await head(copyAsset.id);
  async function addReference(
    desk,
    sourceId,
    locator,
    target,
    role,
    mode = "exact",
    used,
  ) {
    const editor = desk.getByRole("region", {
      name: "固定引用编辑器",
      exact: true,
    });
    if (
      await editor
        .getByRole("button", { name: "添加题目或文案引用", exact: true })
        .isVisible()
    )
      await editor
        .getByRole("button", { name: "添加题目或文案引用", exact: true })
        .click();
    await editor
      .getByLabel("引用来源稿", { exact: true })
      .selectOption(sourceId);
    await editor.getByLabel("来源位置", { exact: true }).selectOption(locator);
    await editor.getByLabel("目标位置", { exact: true }).selectOption(target);
    await editor
      .getByRole("button", { name: "读取所选公开节选", exact: true })
      .click();
    await expect(
      editor.getByLabel("实际使用文字", { exact: true }),
    ).toBeVisible();
    await editor.getByLabel("使用角色", { exact: true }).selectOption(role);
    await editor.getByLabel("引用方式", { exact: true }).selectOption(mode);
    if (used !== undefined)
      await editor.getByLabel("实际使用文字", { exact: true }).fill(used);
    await editor
      .getByRole("button", { name: "插入文字并固定引用", exact: true })
      .click();
  }
  await enter("封面");
  const cover = admin.getByRole("region", { name: "封面工作台", exact: true });
  await cover.getByLabel("稿件名称", { exact: true }).fill("garden-cover");
  await cover.getByLabel("制作批次", { exact: true }).fill("garden-demo");
  await cover.getByLabel("封面标题", { exact: true }).fill("关系花园");
  await cover
    .getByLabel("画面与传播说明", { exact: true })
    .fill("浅绿花园与纸张质感，温柔地邀请表达需要。");
  await addReference(cover, copyRevision.id, "hook", "whole", "hook");
  await cover
    .getByLabel("正式文件", { exact: true })
    .setInputFiles(media.coverPath);
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
  await cover.getByRole("button", { name: "审核内容", exact: true }).click();
  await cover.getByRole("button", { name: "标记就绪", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.campaignAsset.findFirst({
            where: { productVersionId: version.id, variant: "garden-cover" },
          })
        )?.status,
    )
    .toBe("READY");
  const coverAsset = await db.campaignAsset.findFirstOrThrow({
      where: { productVersionId: version.id, variant: "garden-cover" },
    }),
    coverRevision = await head(coverAsset.id);
  await enter("视频与分镜");
  const video = admin.getByRole("region", {
    name: "视频与分镜工作台",
    exact: true,
  });
  await video.getByLabel("稿件名称", { exact: true }).fill("garden-video");
  await video.getByLabel("制作批次", { exact: true }).fill("garden-demo");
  const scenes = [
    ["opening", "关系花园\n" + hook],
    ["question-one", shortQuestion],
    ["question-two", questions[1].text],
    ["closing", cta],
  ];
  for (let index = 0; index < scenes.length; index++) {
    if (index)
      await video
        .getByRole("button", { name: "添加分镜", exact: true })
        .click();
    await video
      .getByLabel("分镜 " + (index + 1) + " ID", { exact: true })
      .fill(scenes[index][0]);
    await video
      .getByLabel("分镜 " + (index + 1) + " 开始", { exact: true })
      .fill(String(index * 2000));
    await video
      .getByLabel("分镜 " + (index + 1) + " 结束", { exact: true })
      .fill(String((index + 1) * 2000));
    await video
      .getByLabel("分镜 " + (index + 1) + " 内容", { exact: true })
      .fill(scenes[index][1]);
  }
  await addReference(video, copyRevision.id, "hook", "opening", "hook");
  await addReference(
    video,
    assessment.id,
    questions[0].id,
    "question-one",
    "question",
    "adapted",
    shortQuestion,
  );
  await addReference(
    video,
    assessment.id,
    questions[1].id,
    "question-two",
    "question",
  );
  await addReference(video, copyRevision.id, "cta", "closing", "cta");
  await addReference(
    video,
    coverRevision.id,
    "whole",
    "opening",
    "visual",
    "adapted",
    "关系花园",
  );
  await video
    .getByLabel("正式文件", { exact: true })
    .setInputFiles(media.videoPath);
  await video
    .getByRole("button", { name: "上传并校验正式", exact: true })
    .click();
  await expect(
    video.getByText("正式已校验，请保存素材。", { exact: true }),
  ).toBeVisible();
  await video
    .getByRole("button", { name: "保存内容草稿", exact: true })
    .click();
  await expect(
    video.getByRole("button", { name: "审核内容", exact: true }),
  ).toBeEnabled();
  await video.getByRole("button", { name: "审核内容", exact: true }).click();
  await video.getByRole("button", { name: "标记就绪", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.campaignAsset.findFirst({
            where: { productVersionId: version.id, variant: "garden-video" },
          })
        )?.status,
    )
    .toBe("READY");
  await expect
    .poll(() =>
      video.locator("video").evaluate((element) => element.videoWidth),
    )
    .toBe(640);
  const videoAsset = await db.campaignAsset.findFirstOrThrow({
      where: { productVersionId: version.id, variant: "garden-video" },
    }),
    videoRevision = await head(videoAsset.id),
    references = await db.contentReference.findMany({
      where: { targetRevisionId: videoRevision.id },
    });
  assert.equal(references.length, 5);
  assert.equal(
    references.filter((value) => value.role === "question").length,
    2,
  );
  assert.ok(
    references.some(
      (value) => value.mode === "adapted" && value.usedText === shortQuestion,
    ),
  );
  assert.equal(
    (await db.productVersion.findUniqueOrThrow({ where: { id: version.id } }))
      .configuration.questions[0].text,
    questions[0].text,
  );
  checks.push(
    "operators select two fixed questions, hook/CTA and cover inputs; an actual playable demo video carries the declared text without changing the questions",
  );
  async function selectPackage(label) {
    await enter("成套采用");
    const panel = admin.getByRole("region", {
      name: "成套采用工作台",
      exact: true,
    });
    await panel.getByLabel("采用包名称", { exact: true }).fill(label);
    for (const variant of ["garden-copy", "garden-cover", "garden-video"])
      await panel.getByLabel("采用 " + variant, { exact: true }).check();
    await panel
      .getByRole("button", { name: "校验采用组合", exact: true })
      .click();
    return panel;
  }
  const adoption = await selectPackage("关系花园 · 第一轮");
  await expect(
    adoption.getByRole("heading", { name: "采用校验通过", exact: true }),
  ).toBeVisible();
  await adoption
    .getByLabel("采用说明", { exact: true })
    .fill("已核对温柔表达、花园意象与自我观察目标一致。");
  await adoption
    .getByLabel("我已核对语气、意象、情绪目标与传播承诺一致")
    .check();
  await adoption
    .getByRole("button", { name: "保存固定采用包", exact: true })
    .click();
  await expect(
    adoption.getByText("固定采用包已保存，旧包与消费者报告保持原样。", {
      exact: true,
    }),
  ).toBeVisible();
  const firstPackage = await db.contentPackage.findFirstOrThrow({
      where: { productId: product.id },
      orderBy: { number: "asc" },
    }),
    originalManifest = firstPackage.manifest;
  const downloadEvent = admin.waitForEvent("download");
  await adoption
    .getByRole("button", { name: "导出采用清单 JSON", exact: true })
    .click();
  const download = await downloadEvent,
    exportPath = join(output, "garden-package.json");
  await download.saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, "utf8"));
  assert.equal(exported.digest, firstPackage.digest);
  const serialized = JSON.stringify(exported);
  for (const key of [
    "actorUserId",
    "accessToken",
    "refreshToken",
    "ownerUserId",
    "storageKey",
    "attemptId",
  ])
    assert.equal(serialized.includes('"' + key + '"'), false);
  checks.push(
    "a validated consistent bundle adopts immutable snapshots and exports authoring content without consumer records, credentials or local paths",
  );
  await enter("引流文案");
  await copy
    .getByLabel("文案块 1 内容", { exact: true })
    .fill("新的表达文案，留待下一轮使用。");
  await copy.getByRole("button", { name: "保存内容草稿", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.campaignAsset.findUniqueOrThrow({
            where: { id: copyAsset.id },
          })
        ).revision,
    )
    .toBe(3);
  await enter("视频与分镜");
  await expandSavedAssets(video);
  await video
    .getByRole("row")
    .filter({ hasText: "garden-video" })
    .getByRole("button", { name: "引用与历史", exact: true })
    .click();
  const history = admin.getByRole("region", {
    name: "引用与历史工作台",
    exact: true,
  });
  await expect(
    history.getByRole("heading", { name: "上游更新 · 待复查", exact: true }),
  ).toBeVisible();
  await expect(history.getByText(shortQuestion, { exact: true })).toBeVisible();
  await history
    .getByLabel("查看修订", { exact: true })
    .selectOption(copyRevision.id);
  await expect(
    history.getByRole("heading", { name: "哪些稿件使用了此修订", exact: true }),
  ).toBeVisible();
  await expect(
    history.getByRole("button", { name: "查看使用稿件", exact: true }).first(),
  ).toBeVisible();
  assert.deepEqual(
    (
      await db.contentPackage.findUniqueOrThrow({
        where: { id: firstPackage.id },
      })
    ).manifest,
    originalManifest,
  );
  await enter("创作设定");
  await admin
    .getByLabel("视觉风格", { exact: true })
    .fill("下一轮改用星空意象，旧花园稿件继续固定");
  await admin
    .getByRole("button", { name: "保存设定新修订", exact: true })
    .click();
  await expect(
    admin.getByLabel("共同创作设定", { exact: true }),
  ).not.toHaveValue(profileId);
  await admin
    .getByLabel("共同创作设定", { exact: true })
    .selectOption(profileId);
  const oldSelection = {
    productId: product.id,
    creativeProfileRevisionId: profileId,
    assessmentRevisionId: assessment.id,
    assetRevisionIds: [copyRevision.id, coverRevision.id, videoRevision.id],
    reportMode: "compatible_standard",
    label: "旧稿复查",
  };
  const checked = await post(
    "/api/admin/content-packages/preview",
    oldSelection,
  );
  assert.equal(checked.canAdopt, false);
  assert.ok(
    checked.impacts.some((value) =>
      value.alerts.some((alert) => alert.code === "profile_updated"),
    ),
  );
  await enter("引用与历史");
  for (const revisionId of [
    assessment.id,
    copyRevision.id,
    coverRevision.id,
    videoRevision.id,
  ]) {
    await history
      .getByLabel("查看修订", { exact: true })
      .selectOption(revisionId);
    await expect(
      history.getByLabel("继续使用旧稿的复查说明", { exact: true }),
    ).toBeVisible();
    await history
      .getByLabel("继续使用旧稿的复查说明", { exact: true })
      .fill("已复查，此轮明确保留花园设定和旧文案，新的星空设定留下一轮。");
    await history
      .getByRole("button", { name: "确认继续使用此固定稿", exact: true })
      .click();
    await expect(
      history.getByRole("heading", {
        name: "已确认继续使用固定旧稿",
        exact: true,
      }),
    ).toBeVisible();
  }
  const second = await selectPackage("关系花园 · 旧稿复查后采用");
  await expect(
    second.getByRole("heading", { name: "采用校验通过", exact: true }),
  ).toBeVisible();
  await second
    .getByLabel("采用说明", { exact: true })
    .fill("已复查上游更新，此轮使用明确固定的旧花园组合。");
  await second.getByLabel("我已核对语气、意象、情绪目标与传播承诺一致").check();
  await second
    .getByRole("button", { name: "保存固定采用包", exact: true })
    .click();
  await expect
    .poll(() => db.contentPackage.count({ where: { productId: product.id } }))
    .toBe(2);
  assert.deepEqual(
    (
      await db.contentPackage.findUniqueOrThrow({
        where: { id: firstPackage.id },
      })
    ).manifest,
    originalManifest,
  );
  checks.push(
    "upstream copy and profile updates require recheck, reverse links locate the video, and reviewed old bundles remain usable without altering the first package",
  );
  const fileId = randomUUID(),
    bytes = await readFile(join(root, "apps/api/test/fixtures/cover.jpg"));
  await writeFile(join(directory, fileId + ".blob"), bytes);
  await fixture.owner.client.assetFile.create({
    data: {
      id: fileId,
      productVersionId: version.id,
      scope: "DEMO",
      ownerUserId: adminUserId,
      kind: "COVER",
      originalName: "unused-temporary.jpg",
      mimeType: "image/jpeg",
      byteSize: bytes.length,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      storageKey: fileId + ".blob",
      status: "AVAILABLE",
      width: 16,
      height: 16,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() - 60000),
    },
  });
  await enter("文件清理");
  const cleanup = admin.getByRole("region", {
    name: "临时文件清理工作台",
    exact: true,
  });
  await cleanup
    .getByLabel("清理候选 unused-temporary.jpg", { exact: true })
    .check();
  await cleanup
    .getByRole("button", { name: "生成清理预演", exact: true })
    .click();
  await expect(
    cleanup.getByRole("heading", { name: "清理预演 · 等待确认", exact: true }),
  ).toBeVisible();
  await admin.reload();
  await expect(
    cleanup.getByRole("heading", { name: "清理预演 · 等待确认", exact: true }),
  ).toBeVisible();
  await cleanup
    .getByLabel("我确认清理以上过期且无引用的文件字节，保留元数据和审计记录")
    .check();
  await cleanup
    .getByRole("button", { name: "执行已预演清理", exact: true })
    .click();
  await expect(
    cleanup.getByRole("heading", { name: "清理预演 · 已完成", exact: true }),
  ).toBeVisible();
  await assert.rejects(access(join(directory, fileId + ".blob")));
  assert.equal(
    (await db.assetFile.findUniqueOrThrow({ where: { id: fileId } })).status,
    "DELETED",
  );
  assert.equal(
    (await db.assetFile.findUniqueOrThrow({ where: { id: videoAsset.fileId } }))
      .status,
    "AVAILABLE",
  );
  checks.push(
    "cleanup preview survives reload, removes only a disposable expired file and preserves referenced video bytes plus immutable metadata",
  );
  await enter("成套采用");
  const region = admin.getByRole("region", { name: "运营后台", exact: true });
  await region.evaluate((element) => {
    element.scrollTop = 0;
  });
  await admin.screenshot({
    path: join(output, "content-adoption-desktop.jpg"),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  await region.evaluate((element) => {
    element.scrollTop = 0;
  });
  assert.equal(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  await admin.screenshot({
    path: join(output, "content-adoption-mobile.jpg"),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  return checks;
}
