import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { expect } from "playwright/test";

export async function machineConnections({ admin, fixture, base, sourceProductId }) {
  const checks = [];
  let token = null;
  const product = await fixture.runtime.client.product.findUniqueOrThrow({ where: { id: sourceProductId } });
  const skill = await fixture.runtime.client.styleSkill.findFirstOrThrow({ where: { domain: "cover" } });
  const name = "本地封面连接 " + randomUUID().slice(0, 8);
  try {
    await admin.goto(base + "/admin/machine?view=legacy");
    await admin.getByRole("button", { name: "创建连接", exact: true }).click();
    const form = admin.getByRole("region", { name: "创建 MCP 连接", exact: true });
    await form.getByLabel("连接名称", { exact: true }).fill(name);
    await form.getByLabel("连接领域", { exact: true }).selectOption("cover");
    await expect(form.getByRole("button", { name: "签发连接凭据", exact: true })).toBeDisabled();
    await form.getByLabel("写入本领域草稿与媒体", { exact: true }).check();
    await form.getByLabel("搜索授权商品", { exact: true }).fill(product.name);
    await form.getByLabel("授权商品 " + product.name, { exact: true }).check();
    await form.getByLabel("写入本领域 skill 与参考附件", { exact: true }).check();
    await expect(form.getByRole("button", { name: "签发连接凭据", exact: true })).toBeDisabled();
    await form.getByLabel("搜索授权skill", { exact: true }).fill(skill.name);
    await form.getByLabel("授权skill " + skill.name, { exact: true }).check();
    await form.getByLabel("连接领域", { exact: true }).selectOption("video");
    await expect(form.getByRole("button", { name: "签发连接凭据", exact: true })).toBeDisabled();
    await form.getByLabel("连接领域", { exact: true }).selectOption("cover");
    await form.getByLabel("搜索授权skill", { exact: true }).fill(skill.name);
    await form.getByLabel("授权skill " + skill.name, { exact: true }).check();
    await form.getByRole("button", { name: "签发连接凭据", exact: true }).click();
    const secret = admin.getByLabel("一次性连接凭据", { exact: true });
    await expect(secret).toBeVisible();
    // Test only existence/leakage booleans: credentials never enter logs or snapshots.
    assert.equal(await secret.evaluate(node => node.value.length > 40), true);
    assert.equal(await secret.evaluate(node => {
      const persisted = JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, url: location.href });
      return persisted.includes(node.value);
    }), false);
    token = await secret.inputValue();
    const connection = await fetch(base + "/api/machine/cover/connection", { headers: { authorization: "Bearer " + token } });
    assert.equal(connection.status, 200);
    await admin.getByRole("button", { name: "已保存，隐藏凭据", exact: true }).click();
    await expect(secret).toHaveCount(0);
    const entry = admin.getByRole("article", { name: "连接 " + name, exact: true });
    await expect(entry.getByText("有效", { exact: true })).toBeVisible();
    await admin.getByRole("button", { name: "创建连接", exact: true }).click();
    await form.getByRole("button", { name: "签发连接凭据", exact: true }).click();
    await expect(admin.getByText("此签发请求已经处理，凭据原文不会再次返回。如未保存，请撤销此连接后重新签发。", { exact: true })).toBeVisible();
    await expect(secret).toHaveCount(0);
    await expect(entry).toHaveCount(1);
    await entry.getByRole("button", { name: "查看调用记录", exact: true }).click();
    const calls = admin.getByRole("region", { name: "调用记录 " + name, exact: true });
    await expect(calls.getByRole("cell", { name: "connection_get", exact: true })).toBeVisible();
    await expect(calls.getByRole("cell", { name: "成功", exact: true })).toBeVisible();
    checks.push("operators scope a single-domain MCP credential to explicit products and skills; domain changes clear skill choices and retries never repeat the secret or credential");
    await admin.reload();
    await expect(secret).toHaveCount(0);
    await expect(entry.getByText("有效", { exact: true })).toBeVisible();
    await entry.getByRole("button", { name: "撤销连接", exact: true }).click();
    await entry.getByRole("button", { name: "确认撤销连接", exact: true }).click();
    await expect(entry.getByText("已撤销", { exact: true })).toBeVisible();
    await expect(entry.getByRole("button", { name: "撤销连接", exact: true })).toHaveCount(0);
    const denied = await fetch(base + "/api/machine/cover/connection", { headers: { authorization: "Bearer " + token } });
    assert.equal(denied.status, 401);
    token = null;
    await entry.getByRole("button", { name: "查看调用记录", exact: true }).click();
    await calls.getByRole("button", { name: "刷新调用记录", exact: true }).click();
    await expect(calls.getByRole("cell", { name: "已拒绝", exact: true })).toBeVisible();
    await admin.setViewportSize({ width: 390, height: 844 });
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await admin.setViewportSize({ width: 1440, height: 1000 });
    checks.push("MCP credentials stay hidden after reload; a real machine connection is audited, revocation rejects further calls and denied results appear in responsive administration");
    checks.push(await machineContentDraft({ admin, fixture, base }));
    return checks;
  } finally {
    token = null;
    // The shared harness records body text on failure; remove transient secrets first.
    await admin.getByRole("button", { name: "已保存，隐藏凭据", exact: true }).click({ timeout: 1000 }).catch(() => {});
    await admin.getByLabel("一次性连接凭据", { exact: true }).evaluateAll(nodes => {
      for (const node of nodes) { node.value = ""; node.removeAttribute("value"); }
    }).catch(() => {});
  }
}

async function machineContentDraft({ admin, fixture, base }) {
  const set = await fixture.runtime.client.creativeSkillSet.findFirstOrThrow({
    where: { scope: "DEMO" }, include: { bindings: true }, orderBy: { createdAt: "desc" },
  });
  const method = set.bindings.find(binding => binding.domain === "copy");
  assert.ok(method);
  const version = await fixture.runtime.client.productVersion.findFirstOrThrow({
    where: { productId: set.productId }, orderBy: { number: "desc" },
  });
  const account = await admin.request.get(base + "/api/account/context");
  const csrf = (await account.json()).csrfToken;
  const headers = { origin: base, "x-csrf-token": csrf };
  const name = "真实文案制作 " + randomUUID().slice(0, 8);
  const issue = await admin.request.post(base + "/api/admin/machine-credentials", {
    headers,
    data: {
      requestId: randomUUID(), name, domain: "copy",
      permissions: ["content:read", "content:write", "context:read", "skills:read"],
      productIds: [set.productId], skillIds: [method.skillId],
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  assert.equal(issue.status(), 200);
  const issued = await issue.json();
  let token = issued.token;
  const requestId = randomUUID(), variant = "mcp-browser-" + randomUUID().slice(0, 8);
  try {
    const data = {
      productVersionId: version.id, platform: "manual", variant,
      expectedRevision: 0, requestId, fileId: null,
      authoring: {
        schemaVersion: 1, creativeProfileRevisionId: set.creativeProfileRevisionId,
        content: { kind: "copy", blocks: [{ blockId: "hook", role: "hook", text: "你的需要值得被温柔地听见" }] },
        media: { localArchive: null, previewFileId: null }, inputs: [],
        production: { skillSetId: set.id, batchKey: "mcp-browser-check" },
      },
    };
    const save = async () => fetch(base + "/api/machine/copy/tools/draft_save", {
      method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const first = await save();
    assert.equal(first.status, 200);
    const saved = await first.json();
    const retry = await save();
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).id, saved.id);
    await admin.goto(base + `/admin/content/${set.productId}?tab=copy&version=${version.id}&profile=${set.creativeProfileRevisionId}`);
    const desk = admin.getByRole("region", { name: "引流文案工作台", exact: true });
    await desk.getByRole("button", { name: "编辑" + variant, exact: true }).click();
    await expect(desk.getByLabel("文案块 1 内容", { exact: true })).toHaveValue("你的需要值得被温柔地听见");
    const origin = desk.getByLabel("已核实机器保存来源", { exact: true });
    await expect(origin.getByText("已核实 MCP 接入", { exact: true })).toBeVisible();
    await expect(origin.getByText(issued.credential.id, { exact: true })).toBeVisible();
    await expect(origin.getByText(requestId, { exact: true })).toBeVisible();
    await expect(desk.getByRole("button", { name: "审核内容", exact: true })).toBeEnabled();
    await admin.getByRole("button", { name: "整套预览", exact: true }).click();
    const preview = admin.getByRole("region", { name: "整套内容预览", exact: true });
    await expect(preview.getByText("核对后可到「成套采用」页签固定采用组合并导出。", { exact: false })).toBeVisible();
    await preview.getByRole("button", { name: "加载已保存宣传预览", exact: true }).click();
    const previewAsset = preview.getByRole("article").filter({
      has: admin.getByRole("heading", { name: "引流文案 · " + variant + " · 通用", exact: true }),
    });
    await expect(previewAsset.getByText(set.id, { exact: true })).toBeVisible();
    const fixedMethod = await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({ where: { id: method.skillVersionId } });
    await expect(previewAsset.getByText("传播文案：" + fixedMethod.manifest.name + " · v" + fixedMethod.number, { exact: true })).toBeVisible();
    await expect(previewAsset.getByText("Skill 未关联", { exact: true })).toHaveCount(0);
    const previewOrigin = previewAsset.getByLabel("已核实机器保存来源", { exact: true });
    await expect(previewOrigin.getByText("已核实 MCP 接入", { exact: true })).toBeVisible();
    await expect(previewOrigin.getByText(issued.credential.id, { exact: true })).toBeVisible();
    await expect(previewOrigin.getByText(requestId, { exact: true })).toBeVisible();
    await admin.setViewportSize({ width: 390, height: 844 });
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.goto(base + "/admin/machine?view=legacy");
    const entry = admin.getByRole("article", { name: "连接 " + name, exact: true });
    await entry.getByRole("button", { name: "查看调用记录", exact: true }).click();
    const calls = admin.getByRole("region", { name: "调用记录 " + name, exact: true });
    await expect(calls.getByRole("cell", { name: "draft_save", exact: true })).toHaveCount(2);
    await expect(calls.getByRole("cell", { name: "成功", exact: true })).toHaveCount(2);
    const revoke = await admin.request.post(base + "/api/admin/machine-credentials/" + issued.credential.id + "/revoke", {
      headers, data: { requestId: randomUUID() },
    });
    assert.equal(revoke.status(), 200);
    const denied = await save();
    assert.equal(denied.status, 401);
    assert.equal(await fixture.runtime.client.contentRevision.count({ where: { assetId: saved.assetId } }), 1);
    return "real machine draft retries map to one browser-editable copy draft; suite preview shows its fixed skill combination/version and verified connection/request provenance without narrow-screen overflow; call history and revocation work";
  } finally {
    token = null;
    issued.token = null;
  }
}
