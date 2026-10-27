import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { expect } from 'playwright/test';

// Runs only against the harness's temporary database and test-provider identities.
export async function experienceRuntime({ browser, operator, base, versionId, output }) {
  const csrf = (await (await operator.request.get(base + '/api/account/context')).json()).csrfToken;
  const headers = { origin: base, 'X-CSRF-Token': csrf };
  const created = await operator.request.post(base + '/api/admin/orders', { headers, data: { platform: 'manual',
    reference: 'demo:t15-browser:' + randomUUID(), productVersionId: versionId, scope: 'demo', quantity: 1, amountFen: 0, requestId: randomUUID() } });
  assert.equal(created.status(), 200);
  const order = await created.json();
  const issued = await operator.request.post(base + '/api/admin/orders/' + order.id + '/issue', { headers, data: { requestId: randomUUID() } });
  assert.equal(issued.status(), 200);
  const delivery = await issued.json(), context = await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const checks = [];
  try {
    const page = await context.newPage(); let saves = 0;
    page.on('request', request => { if (request.method() === 'PUT' && /\/answers\//.test(new URL(request.url()).pathname)) saves++; });
    await page.goto('/redeem');
    await page.getByLabel('兑换码', { exact: true }).fill(delivery.deliveries[0].code);
    await page.getByRole('button', { name: '领取或恢复', exact: true }).click();
    await expect(page).toHaveURL(base + '/apps');
    await page.getByRole('button', { name: '开始测试', exact: true }).click();
    await expect(page.getByRole('button', { name: '保存答案', exact: true })).toBeVisible();
    await expect(page.locator('[data-experience-template="dom-choice@1"]')).toBeVisible();
    const attemptId = new URL(page.url()).pathname.split('/').at(-1);
    const initial = await (await context.request.get(base + `/api/attempts/${attemptId}/questions`)).json();
    assert.equal(initial.experience.release.manifest.renderer.key, 'dom-choice');
    await page.getByRole('radio', { name: '经常如此', exact: true }).check();
    assert.equal(saves, 0);
    await page.getByRole('button', { name: '使用简化界面', exact: true }).click();
    await expect(page.getByRole('radio', { name: '经常如此', exact: true })).toBeChecked();
    assert.equal(saves, 0);
    await page.getByRole('button', { name: '保存答案', exact: true }).click();
    await expect(page.getByRole('progressbar', { name: '已保存进度', exact: true })).toHaveAttribute('value', '1');
    await page.getByRole('button', { name: '下一题', exact: true }).click();
    await page.getByRole('radio', { name: '有时如此', exact: true }).check();
    await page.reload();
    await expect(page.getByRole('radio', { name: '有时如此', exact: true })).not.toBeChecked();
    await expect(page.getByRole('progressbar', { name: '已保存进度', exact: true })).toHaveAttribute('value', '1');
    const restored = await (await context.request.get(base + `/api/attempts/${attemptId}/questions`)).json();
    assert.deepEqual(restored.experience.release, initial.experience.release);
    assert.equal(restored.experience.checkpoint.nextQuestionId, 'question-2');
    checks.push('scene choices require explicit confirmation; manual fallback preserves the local choice and refresh restores only server-confirmed answers on the fixed release');

    await context.route(/\/src\/experience\/dom-choice\.tsx(?:\?|$)/, route => route.abort('failed'));
    await page.reload();
    await expect(page.getByText('已切换到简化界面，已保存进度保留。', { exact: true })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: '已保存进度', exact: true })).toHaveAttribute('value', '1');
    for (let index = 1; index < initial.questions.length; index++) {
      await expect(page.locator('legend')).toContainText(`第 ${index + 1}/${initial.questions.length} 题`);
      await page.getByRole('radio', { name: '经常如此', exact: true }).check();
      await expect(page.getByRole('button', { name: '保存答案', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: '保存答案', exact: true }).click();
      await expect(page.getByRole('progressbar', { name: '已保存进度', exact: true })).toHaveAttribute('value', String(index + 1));
      if (index < initial.questions.length - 1) await page.getByRole('button', { name: '下一题', exact: true }).click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.screenshot({ path: join(output, 'experience-fallback-mobile.png'), fullPage: true });
    checks.push('a failed lazy scene module falls back to the same mobile-compatible questions without losing saved progress or creating another attempt');

    await context.route(/\/src\/experience\/legacy-report\.tsx(?:\?|$)/, route => route.abort('failed'));
    await page.getByRole('button', { name: '生成报告', exact: true }).click();
    await expect(page).toHaveURL(/\/reports\/[a-f0-9-]+$/);
    await expect(page.getByText('已用简化排版展示同一份报告。', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '相对稳定', exact: true })).toBeVisible();
    const reportId = new URL(page.url()).pathname.split('/').at(-1);
    const report = await (await context.request.get(base + `/api/reports/${reportId}`)).json();
    assert.equal(report.content.totalScore, 100);
    assert.equal(report.presentation.releaseId, initial.experience.release.id);
    assert.deepEqual(report.presentation.theme, initial.experience.release.manifest.theme);
    const session = await (await context.request.get(base + '/api/session/context')).json();
    const repeated = await context.request.post(base + `/api/attempts/${attemptId}/submit`, {
      headers: { origin: base, 'X-CSRF-Token': session.csrfToken }, data: { expectedRevision: initial.questions.length, requestId: randomUUID() } });
    assert.equal((await repeated.json()).id, reportId);
    const rights = await (await context.request.get(base + '/api/session/entitlements')).json();
    assert.equal(rights.items.length, 1); assert.equal(rights.items[0].reportsConsumed, 1); assert.equal(rights.items[0].attemptId, attemptId);
    await page.screenshot({ path: join(output, 'experience-fallback-report.png'), fullPage: true });
    checks.push('a failed report renderer displays the same fixed result and theme; repeated completion keeps one entitlement, attempt, report and consumed credit');
    return checks;
  } finally { await context.close(); }
}
