import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "playwright/test";
export async function skillBindings({
  admin,
  fixture,
  base,
  root,
  output,
  sourceProductId,
}) {
  await mkdir(output, { recursive: true });
  const db = fixture.runtime.client,
    checks = [];
  const get = async (path) => {
    const result = await admin.request.get(base + "/api" + path);
    assert.equal(result.status(), 200);
    return result.json();
  };
  const post = async (path, data) => {
    const csrf = (await get("/account/context")).csrfToken;
    const result = await admin.request.post(base + "/api" + path, {
      data,
      headers: { origin: base, "x-csrf-token": csrf },
    });
    assert.equal(result.status(), 200, await result.text());
    return result.json();
  };
  const domains = {
      assessment: ["assessment_design", "report_writing"],
      cover: ["cover_design"],
      video: ["video_production"],
      copy: ["copywriting"],
    },
    labels = {
      assessment_design: "题目设计",
      report_writing: "报告写作",
      cover_design: "封面设计",
      video_production: "视频制作",
      copywriting: "引流文案",
    },
    skills = {};
  const activate = async (row) => {
    const prefix = `/admin/skills/${row.manifest.domain}/${row.skillId}/versions/${row.id}`;
    const reviewed = await post(prefix + "/review", {
      expectedRevision: row.revision,
      requestId: randomUUID(),
    });
    return post(prefix + "/activate", {
      expectedRevision: reviewed.revision,
      requestId: randomUUID(),
    });
  };
  for (const [domain, purposes] of Object.entries(domains)) {
    skills[domain] = await activate(
      await post("/admin/skills/" + domain, {
        slug: "binding-" + randomUUID(),
        requestId: randomUUID(),
        manifest: {
          schemaVersion: 1,
          domain,
          name: "配套方法 " + domain,
          description: "固定共同意象与情绪理解目标",
          purposes,
          styles: ["温柔花园"],
          supportedForms: ["web"],
          inputs: [
            {
              key: "creative-profile",
              description: "共同创作设定",
              required: true,
            },
          ],
          outputs: [{ key: "deliverable", description: "本领域内容" }],
          instructions: "温柔而具体地表达，以共同意象组织内容，避免标签。",
          examples: [],
          references: [],
        },
      }),
    );
  }
  const original = await get("/admin/products/" + sourceProductId),
    originalVersion = await get(
      `/admin/products/${sourceProductId}/versions/${original.currentVersionId}/preview`,
    ),
    metadata = Object.fromEntries(
      [
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
      ].map((key) => [key, original[key]]),
    ),
    product = await post("/admin/products", {
      ...metadata,
      slug: "skill-bound-" + randomUUID(),
      name: "五用途配套商品",
      coverUrl: null,
      requestId: randomUUID(),
    }),
    version = await post(`/admin/products/${product.id}/versions`, {
      configuration: originalVersion.configuration,
      requestId: randomUUID(),
    }),
    sourceProfile = await db.creativeProfileRevision.findFirstOrThrow({
      where: { productId: sourceProductId },
      orderBy: { number: "desc" },
    }),
    profile = await post(`/admin/products/${product.id}/creative-profiles`, {
      profile: sourceProfile.profile,
      expectedRevision: 0,
      requestId: randomUUID(),
    });
  const enter = (name) =>
    admin
      .getByRole("navigation", { name: "内容工作台页签" })
      .getByRole("button", { name: new RegExp('^' + name + '(?: ·)?$') })
      .click();
  await admin.goto(base + `/admin/content/${product.id}?tab=skills`);
  const panel = admin.getByRole("region", {
    name: "商品 skill 组合",
    exact: true,
  });
  for (const [domain, purposes] of Object.entries(domains))
    for (const purpose of purposes)
      await panel
        .getByLabel(labels[purpose] + " skill 版本", { exact: true })
        .selectOption(skills[domain].id);
  await panel
    .getByLabel("skill 组合说明", { exact: true })
    .fill("温柔花园 · 第一组");
  await enter("商品内容");
  await enter("skill 组合");
  await expect(panel.getByLabel("skill 组合说明", { exact: true })).toHaveValue(
    "温柔花园 · 第一组",
  );
  await panel
    .getByRole("button", { name: "保存新 skill 组合", exact: true })
    .click();
  await expect(
    panel.getByLabel("查看 skill 组合历史", { exact: true }),
  ).toBeVisible();
  const set = await db.creativeSkillSet.findFirstOrThrow({
    where: { creativeProfileRevisionId: profile.id },
    include: { bindings: true },
  });
  assert.equal(set.bindings.length, 5);
  await enter("商品内容");
  const assessmentDesk = admin.getByRole("region", {
    name: "题库报告编辑器",
    exact: true,
  });
  await assessmentDesk
    .getByLabel("题库与报告 skill 组合", { exact: true })
    .selectOption(set.id);
  await assessmentDesk
    .getByLabel("题库制作批次", { exact: true })
    .fill("skill-pairing-demo");
  await assessmentDesk
    .getByRole("button", { name: "登记本修订制作来源", exact: true })
    .click();
  await expect(
    assessmentDesk.getByText("本修订的制作来源已登记。", { exact: true }),
  ).toBeVisible();
  await enter("引流文案");
  const copyDesk = admin.getByRole("region", {
    name: "引流文案工作台",
    exact: true,
  });
  await copyDesk.getByLabel("稿件名称", { exact: true }).fill("bound-copy");
  await copyDesk
    .getByLabel("制作 skill 组合", { exact: true })
    .selectOption(set.id);
  await copyDesk.getByLabel("制作来源", { exact: true }).selectOption("mcp");
  await copyDesk
    .getByLabel("文案块 1 内容", { exact: true })
    .fill("你的需要值得被听见");
  await copyDesk
    .getByLabel("文案块 2 内容", { exact: true })
    .fill("来认识自己的相处节奏");
  await copyDesk
    .getByRole("button", { name: "保存内容草稿", exact: true })
    .click();
  await expect(
    copyDesk.getByRole("button", { name: "审核内容", exact: true }),
  ).toBeEnabled();
  await copyDesk.getByRole("button", { name: "审核内容", exact: true }).click();
  await copyDesk.getByRole("button", { name: "标记就绪", exact: true }).click();
  checks.push(
    "operators bind five compatible professional uses, retain unsaved choices across tabs, and declare fixed assessment/report and external MCP copy provenance",
  );
  for (const kind of ["cover", "video"]) {
    const fileName = kind === "cover" ? "cover.jpg" : "preview.mp4",
      bytes = await readFile(join(root, "apps/api/test/fixtures", fileName));
    const file = await post("/admin/uploads", {
      productVersionId: version.id,
      kind,
      fileName,
      mimeType: kind === "cover" ? "image/jpeg" : "video/mp4",
      byteSize: bytes.length,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      requestId: randomUUID(),
    });
    const csrf = (await get("/account/context")).csrfToken;
    const upload = await admin.request.put(base + file.uploadPath, {
      data: bytes,
      headers: {
        origin: base,
        "x-csrf-token": csrf,
        "content-type": "application/octet-stream",
      },
    });
    assert.equal(upload.status(), 200);
    await post("/admin/uploads/" + file.id + "/complete", {
      requestId: randomUUID(),
    });
    const revision = await post("/admin/content-assets", {
      productVersionId: version.id,
      platform: "manual",
      variant: "bound-" + kind,
      expectedRevision: 0,
      fileId: file.id,
      requestId: randomUUID(),
      authoring: {
        schemaVersion: 1,
        creativeProfileRevisionId: profile.id,
        content:
          kind === "cover"
            ? { kind, title: "温柔花园", description: "一起理解自己的需要" }
            : {
                kind,
                scenes: [
                  {
                    sceneId: "opening",
                    startMs: 0,
                    endMs: 1000,
                    text: "看见自己的相处节奏",
                  },
                ],
              },
        media: { localArchive: null, previewFileId: null },
        inputs: [],
        production: { source: "manual", skillSetId: set.id },
      },
    });
    const reviewed = await post(
      "/admin/assets/" + revision.assetId + "/review",
      { expectedRevision: revision.sourceRevision, requestId: randomUUID() },
    );
    await post("/admin/assets/" + revision.assetId + "/ready", {
      expectedRevision: reviewed.revision,
      requestId: randomUUID(),
    });
  }
  await admin.reload();
  await enter("成套采用");
  const adoption = admin.getByRole("region", {
    name: "成套采用工作台",
    exact: true,
  });
  await adoption
    .getByRole("button", { name: "审核所选题库", exact: true })
    .click();
  await expect(
    adoption.getByRole("button", { name: "审核所选题库", exact: true }),
  ).toHaveCount(0);
  await adoption
    .getByLabel("采用 skill 组合", { exact: true })
    .selectOption(set.id);
  await adoption
    .getByLabel("采用包名称", { exact: true })
    .fill("五用途配套采用");
  for (const kind of ["copy", "cover", "video"])
    await adoption.getByLabel("采用 bound-" + kind, { exact: true }).check();
  await adoption
    .getByRole("button", { name: "校验采用组合", exact: true })
    .click();
  await expect(
    adoption.getByRole("heading", { name: "采用校验通过", exact: true }),
  ).toBeVisible();
  await adoption
    .getByLabel("采用说明", { exact: true })
    .fill("核对情绪目标、共同意象、具体表达与承诺范围。");
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
  const packageRow = await db.contentPackage.findFirstOrThrow({
      where: { productId: product.id },
    }),
    frozen = JSON.stringify(packageRow.manifest);
  const downloadEvent = admin.waitForEvent("download");
  await adoption
    .getByRole("button", { name: "导出采用清单 JSON", exact: true })
    .click();
  const download = await downloadEvent,
    packagePath = join(output, "skill-bound-package.json");
  await download.saveAs(packagePath);
  const exported = JSON.parse(await readFile(packagePath, "utf8"));
  assert.equal(exported.manifest.schemaVersion, 2);
  assert.equal(exported.manifest.skillSet.bindings.length, 5);
  assert.equal(exported.manifest.assessmentProduction.skillVersions.length, 2);
  assert.ok(
    exported.manifest.assets.every(
      (row) => row.production.skillSetId === set.id,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(exported),
    /"(actorUserId|storageKey|ownerUserId|answers)"/,
  );
  checks.push(
    "a reviewed four-domain content package exports the chosen fixed skill set and separate report-writing provenance without consumer data",
  );
  const skill = await get(
      "/admin/skills/assessment/" + skills.assessment.skillId,
    ),
    cloned = await post("/admin/skills/assessment/" + skill.id + "/versions", {
      sourceVersionId: skills.assessment.id,
      expectedSkillRevision: skill.revision,
      requestId: randomUUID(),
    }),
    newer = await activate(cloned);
  await enter("skill 组合");
  await panel
    .getByRole("button", { name: "刷新可绑定版本", exact: true })
    .click();
  await panel
    .getByLabel("题目设计 skill 版本", { exact: true })
    .selectOption(newer.id);
  await expect(
    panel.getByLabel("报告写作 skill 版本", { exact: true }),
  ).toHaveValue(skills.assessment.id);
  await panel
    .getByLabel("skill 组合说明", { exact: true })
    .fill("题目采用新版，报告保留固定旧版");
  await panel
    .getByRole("button", { name: "保存新 skill 组合", exact: true })
    .click();
  await expect
    .poll(() =>
      db.creativeSkillSet.count({
        where: { creativeProfileRevisionId: profile.id },
      }),
    )
    .toBe(2);
  await panel
    .getByLabel("查看 skill 组合历史", { exact: true })
    .selectOption(set.id);
  await expect(
    panel.getByLabel("固定 skill 组合 r1", { exact: true }),
  ).toBeVisible();
  assert.equal(
    JSON.stringify(
      (
        await db.contentPackage.findUniqueOrThrow({
          where: { id: packageRow.id },
        })
      ).manifest,
    ),
    frozen,
  );
  const oldAssessmentSource = await db.productionRecord.findFirstOrThrow({
    where: { skillSetId: set.id, output: { domain: "assessment" } },
  });
  assert.ok(
    oldAssessmentSource.skillVersions.every(
      (row) => row.version.id === skills.assessment.id,
    ),
  );
  const region = admin.getByRole("region", { name: "运营后台", exact: true });
  await region.evaluate((node) => {
    node.scrollTop = 0;
  });
  await admin.screenshot({
    path: join(output, "skill-combinations-desktop.jpg"),
    fullPage: false,
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  await admin.screenshot({
    path: join(output, "skill-combinations-mobile.jpg"),
    fullPage: false,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  checks.push(
    "a skill upgrade lets assessment design and report writing bind different versions while preserving archived combinations, productions and adopted package snapshots on desktop and mobile",
  );
  return checks;
}
