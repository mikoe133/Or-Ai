import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "playwright/test";
export async function skillLibraries({ admin, base, output }) {
  await mkdir(output, { recursive: true });
  const checks = [],
    created = [];
  for (const [domain, label] of [
    ["assessment", "题库与报告"],
    ["cover", "封面"],
    ["video", "视频"],
    ["copy", "引流文案"],
  ]) {
    await admin.goto(base + "/admin/skills/" + domain);
    await expect(
      admin.getByRole("heading", { name: label + " skill 库", exact: true }),
    ).toBeVisible();
    await admin.getByRole("button", { name: "新建 skill", exact: true }).click();
    const slug = "e2e-skill-" + randomUUID().slice(0, 8),
      name = "温柔" + label + "方法";
    await admin.getByLabel("skill 稳定标识", { exact: true }).fill(slug);
    await admin.getByLabel("skill 名称", { exact: true }).fill(name);
    if (domain === "assessment") {
      await admin.getByLabel("报告写作", { exact: true }).check();
      await admin.getByLabel("题目与规则设计", { exact: true }).uncheck();
    }
    const markdown =
      "以温柔而具体的表达提供情绪价值。\n先阅读固定共同创作设定，再制作本领域交付物。";
    await admin
      .getByLabel("导入 skill Markdown", { exact: true })
      .setInputFiles({
        name: "SKILL.md",
        mimeType: "text/markdown",
        buffer: Buffer.from(markdown),
      });
    await expect(
      admin.getByLabel("SKILL.md 正文", { exact: true }),
    ).toHaveValue(markdown);
    await admin
      .getByRole("button", { name: "保存 skill 草稿", exact: true })
      .click();
    await expect(
      admin.getByRole("heading", { name: "v1 · 草稿", exact: true }),
    ).toBeVisible();
    const url = new URL(admin.url());
    created.push({
      domain,
      label,
      slug,
      name,
      skillId: url.searchParams.get("skill"),
      versionId: url.searchParams.get("version"),
      url: admin.url(),
    });
  }
  checks.push(
    "four independent skill libraries import Markdown with shared creative-profile requirements and domain-specific professional purposes",
  );
  const selected = created[0];
  await admin.goto(selected.url);
  await expect(admin.getByLabel("skill 名称", { exact: true })).toHaveValue(
    selected.name,
  );
  const bytes = Buffer.from("# 表达参考\n请使用具体的观察与邀请，避免断言。\n");
  await admin.getByLabel("skill 参考附件", { exact: true }).setInputFiles({
    name: "guide.md",
    mimeType: "text/markdown",
    buffer: bytes,
  });
  await admin
    .getByRole("button", { name: "上传并校验参考", exact: true })
    .click();
  await expect(
    admin.getByText("参考已校验；请保存 skill 草稿以固定关联。", {
      exact: true,
    }),
  ).toBeVisible();
  await admin
    .getByLabel("SKILL.md 正文", { exact: true })
    .fill("请阅读 [表达参考](references/guide.md)，用温柔而具体的语言写报告。");
  await admin
    .getByRole("button", { name: "保存 skill 草稿", exact: true })
    .click();
  await expect(
    admin.getByRole("button", { name: "下载参考", exact: true }),
  ).toBeVisible();
  await admin.reload();
  await expect(admin.getByLabel("SKILL.md 正文", { exact: true })).toHaveValue(
    "请阅读 [表达参考](references/guide.md)，用温柔而具体的语言写报告。",
  );
  const refEvent = admin.waitForEvent("download");
  await admin.getByRole("button", { name: "下载参考", exact: true }).click();
  const ref = await refEvent;
  const refPath = join(output, "downloaded-guide.md");
  await ref.saveAs(refPath);
  assert.deepEqual(await readFile(refPath), bytes);
  await admin.getByRole("button", { name: "审核 skill", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "v1 · 已审核", exact: true }),
  ).toBeVisible();
  await expect(
    admin.getByLabel("SKILL.md 正文", { exact: true }),
  ).toBeDisabled();
  await admin.getByRole("button", { name: "启用 skill", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "v1 · 已启用", exact: true }),
  ).toBeVisible();
  const firstDownload = admin.waitForEvent("download");
  await admin
    .getByRole("button", { name: "导出 skill JSON", exact: true })
    .click();
  const original = await firstDownload;
  const originalPath = join(output, "report-skill-v1.skill.json");
  await original.saveAs(originalPath);
  const fixed = JSON.parse(await readFile(originalPath, "utf8"));
  assert.equal(fixed.version.manifest.purposes[0], "report_writing");
  assert.equal(fixed.version.files.length, 1);
  for (const key of [
    "storageKey",
    "actorUserId",
    "ownerUserId",
    "refreshToken",
  ])
    assert.equal(JSON.stringify(fixed).includes(key), false);
  checks.push(
    "reference attachments upload as verified documents, survive reload and authorized download, and remain fixed in a reviewed active skill export",
  );
  await admin
    .getByRole("button", { name: "复制为新版本", exact: true })
    .click();
  await expect(
    admin.getByRole("heading", { name: "v2 · 草稿", exact: true }),
  ).toBeVisible();
  const unicodeInstructions = "温柔表达。".repeat(16000);
  const imported = {
    ...fixed,
    version: {
      ...fixed.version,
      manifest: {
        ...fixed.version.manifest,
        instructions: unicodeInstructions,
      },
    },
  };
  await admin
    .getByLabel("导入 skill JSON", { exact: true })
    .setInputFiles({
      name: "method.skill.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(imported)),
    });
  await expect(admin.getByLabel("SKILL.md 正文", { exact: true })).toHaveValue(
    unicodeInstructions,
  );
  await admin
    .getByLabel("skill 名称", { exact: true })
    .fill("温柔报告方法 · 新版");
  await admin
    .getByRole("button", { name: "启用 skill", exact: true })
    .isDisabled()
    .then((value) => assert.equal(value, true));
  await admin
    .getByRole("button", { name: "保存 skill 草稿", exact: true })
    .click();
  await admin
    .getByLabel("skill 差异版本", { exact: true })
    .selectOption(selected.versionId);
  await expect(admin.locator("pre.content-json")).toContainText(
    "温柔报告方法 · 新版",
  );
  await admin.getByRole("button", { name: "审核 skill", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "v2 · 已审核", exact: true }),
  ).toBeVisible();
  await admin.getByRole("button", { name: "启用 skill", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "v2 · 已启用", exact: true }),
  ).toBeVisible();
  await admin
    .getByLabel("skill 历史版本", { exact: true })
    .selectOption(selected.versionId);
  await expect(
    admin.getByRole("heading", { name: "v1 · 已归档", exact: true }),
  ).toBeVisible();
  const oldExportEvent = admin.waitForEvent("download");
  await admin
    .getByRole("button", { name: "导出 skill JSON", exact: true })
    .click();
  const oldExport = await oldExportEvent;
  const oldPath = join(output, "report-skill-v1-archived.skill.json");
  await oldExport.saveAs(oldPath);
  const archived = JSON.parse(await readFile(oldPath, "utf8"));
  assert.deepEqual(archived.version.manifest, fixed.version.manifest);
  assert.equal(archived.version.digest, fixed.version.digest);
  assert.deepEqual(archived.version.files, fixed.version.files);
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.screenshot({
    path: join(output, "skills-desktop.jpg"),
    fullPage: false,
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await admin.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await admin.screenshot({
    path: join(output, "skills-mobile.jpg"),
    fullPage: false,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await writeFile(
    join(output, "created-skills.json"),
    JSON.stringify(created, null, 2),
  );
  checks.push(
    "skill upgrades create distinct versions, compare differences, archive the prior active version and preserve its manifest and attachments on desktop and mobile",
  );
  return checks;
}
