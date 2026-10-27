import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect } from 'playwright/test';

export async function experienceAuthoring({admin,browser,fixture,base,root,output,productId}) {
  await mkdir(output,{recursive:true});
  const checks=[];
  const get=async path=>{const r=await admin.request.get(base+'/api'+path);assert.equal(r.status(),200);return r.json();};
  const post=async(path,data)=>{const csrf=(await get('/account/context')).csrfToken;const r=await admin.request.post(base+'/api'+path,{headers:{origin:base,'x-csrf-token':csrf},data});assert.equal(r.status(),200,await r.text());return r.json();};
  const original=await get('/admin/products/'+productId),originalRuntime=await fixture.runtime.client.experienceRelease.findUnique({where:{productVersionId:original.currentVersionId}});
  const catalog=await get(`/admin/products/${productId}/versions/${original.currentVersionId}/preview`),profiles=await get(`/admin/products/${productId}/creative-profiles`);
  const profile=await post(`/admin/products/${productId}/creative-profiles`,{expectedRevision:profiles.items[0].revision,requestId:randomUUID(),profile:{...profiles.items[0].profile,title:'体验与报告编排演示',experienceForm:'web',perspective:'self',reportPlan:{schemaVersion:1,title:'关系花园观察报告',narrative:'用共同意象理解协作节奏',presentation:'standard',sections:[{sectionId:'observation',title:'观察与建议',purpose:'提供具体理解'}]}}});
  const version=await post(`/admin/products/${productId}/versions`,{configuration:catalog.configuration,requestId:randomUUID()});
  async function createMethod(purpose,name){
    const row=await post('/admin/skills/experience',{slug:'experience-e2e-'+randomUUID(),requestId:randomUUID(),manifest:{schemaVersion:1,domain:'experience',name,description:'场景与报告共用花园意象',purposes:[purpose],styles:['温柔花园'],supportedForms:['web'],inputs:[{key:'creative-profile',description:'固定设定',required:true}],outputs:[{key:'experience',description:'结构化体验清单'}],instructions:'保留题意和选项；明确确认后保存；报告承接花园意象。',examples:[],references:[]}});
    const reviewed=await post(`/admin/skills/experience/${row.skillId}/versions/${row.id}/review`,{expectedRevision:row.revision,requestId:randomUUID()});
    await post(`/admin/skills/experience/${row.skillId}/versions/${row.id}/activate`,{expectedRevision:reviewed.revision,requestId:randomUUID()});
    return row;
  }
  const method=await createMethod('scene_design','花园场景方法'),reportMethod=await createMethod('report_presentation','花园报告呈现方法');
  await admin.setViewportSize({width:1440,height:1000});
  await admin.goto(`/admin/content/${productId}?version=${version.id}&profile=${profile.id}&tab=experience`);
  const desk=admin.getByRole('region',{name:/^(?:体验设计|结果呈现)制作工作台$/});
  await expect(desk.getByLabel('体验主题标识',{exact:true})).toBeVisible();
  await desk.getByLabel('体验主题标识',{exact:true}).fill('garden-preview');
  await desk.getByLabel('人工制作（不绑定方法）',{exact:true}).uncheck();
  await expect(desk.getByLabel('场景与交互设计方法',{exact:true}).locator('option[value="'+method.id+'"]')).toHaveCount(1);
  await desk.getByLabel('场景与交互设计方法',{exact:true}).selectOption(method.id);
  await desk.getByLabel('报告呈现方法',{exact:true}).selectOption(reportMethod.id);
  await desk.getByLabel('体验图片文件',{exact:true}).setInputFiles(join(root,'apps/api/test/fixtures/cover.jpg'));
  await desk.getByRole('button',{name:'上传并校验体验图片',exact:true}).click();
  await expect(desk.getByLabel('体验资源 1 说明',{exact:true})).toBeVisible();
  await desk.getByLabel('体验资源 1 说明',{exact:true}).fill('配套体验插画');
  await admin.getByRole('button',{name:'创作设定',exact:true}).click();
  await admin.getByRole('button',{name:/^体验设计(?: ·)?$/}).click();
  await expect(desk.getByLabel('体验主题标识',{exact:true})).toHaveValue('garden-preview');
  await expect(admin.getByLabel('工作台内容版本',{exact:true})).toBeDisabled();
  await desk.getByRole('button',{name:'保存体验与结果草稿',exact:true}).click();
  await expect(desk.getByText('体验与结果草稿 r1 已保存。',{exact:true})).toBeVisible();
  const workspacePath=`/admin/products/${productId}/versions/${version.id}/experience`;
  const first=(await get(workspacePath)).latest;
  assert.equal(first.methods.length,2);assert.equal(first.manifest.resources.length,1);assert.equal(first.manifest.theme.key,'garden-preview');
  await admin.reload();await expect(desk.getByLabel('体验主题标识',{exact:true})).toHaveValue('garden-preview');
  await desk.getByRole('button',{name:'检查兼容性',exact:true}).click();
  await expect(desk.getByText('兼容性检查通过。',{exact:true})).toBeVisible();
  checks.push('experience authoring preserves unsaved state across tabs, uploads a dedicated verified picture, pins both experience methods and restores the same draft after reload');

  const before={attempts:await fixture.runtime.client.attempt.count(),reports:await fixture.runtime.client.report.count(),usage:(await fixture.runtime.client.entitlement.aggregate({_sum:{reportsConsumed:true}}))._sum.reportsConsumed};
  await admin.getByRole('button',{name:/^结果交付(?: ·)?$/}).click();
  const preview=desk.getByRole('region',{name:'体验与报告演示预览',exact:true});
  for(let i=0;i<catalog.configuration.questions.length;i++){
    await expect(preview.getByRole('heading',{name:catalog.configuration.questions[i].text,exact:true})).toBeVisible();
    await preview.getByRole('radio',{name:'经常如此',exact:true}).check();
    if(i<catalog.configuration.questions.length-1)await preview.getByRole('button',{name:'预览下一题',exact:true}).click();
  }
  await preview.getByRole('button',{name:'生成演示预览',exact:true}).click();
  await expect(preview.getByRole('heading',{name:'相对稳定',exact:true})).toBeVisible();
  await expect(preview.getByText('100 / 100',{exact:true})).toBeVisible();
  assert.deepEqual({attempts:await fixture.runtime.client.attempt.count(),reports:await fixture.runtime.client.report.count(),usage:(await fixture.runtime.client.entitlement.aggregate({_sum:{reportsConsumed:true}}))._sum.reportsConsumed},before);
  const pane=admin.getByRole('region',{name:'运营后台',exact:true});
  await preview.locator('.experience-preview-result').evaluate(node=>node.scrollIntoView({block:'start'}));
  await pane.evaluate(node=>{node.scrollTop=Math.max(0,node.scrollTop-100);});
  await admin.screenshot({path:join(output,'experience-report-preview.png'),fullPage:true});
  await desk.evaluate(node=>node.scrollIntoView({block:'start'}));
  await admin.screenshot({path:join(output,'experience-authoring-desktop.png'),fullPage:true});
  await admin.setViewportSize({width:390,height:844});
  await desk.evaluate(node=>node.scrollIntoView({block:'start'}));
  await expect(desk.getByRole('heading',{name:'结果呈现与叙事方案',exact:true})).toBeVisible();
  assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await admin.screenshot({path:join(output,'experience-authoring-mobile.png'),fullPage:true});
  await admin.setViewportSize({width:1440,height:1000});
  checks.push('registered scene/report configuration previews real sample answers without attempts, reports or credit usage, fits desktop and mobile and scrolls inside the existing admin work region');

  await admin.getByRole('button',{name:/^体验设计(?: ·)?$/}).click();
  await desk.getByText('结构化清单 · JSON',{exact:true}).click();
  const raw=desk.getByLabel('体验清单 JSON',{exact:true});const invalid=JSON.parse(await raw.inputValue());invalid.manifest.renderer.key='unregistered-room';
  await raw.fill(JSON.stringify(invalid,null,2));await desk.getByRole('button',{name:'应用 JSON 修改',exact:true}).click();
  await desk.getByRole('button',{name:'保存体验与结果草稿',exact:true}).click();await expect(desk.getByText('体验与结果草稿 r2 已保存。',{exact:true})).toBeVisible();
  await desk.getByRole('button',{name:'审核体验',exact:true}).click();await expect(desk.getByRole('alert')).toContainText('注册');
  await desk.getByLabel('交互模板',{exact:true}).selectOption('dom-choice@1');
  await desk.getByRole('button',{name:'保存体验与结果草稿',exact:true}).click();await expect(desk.getByText('体验与结果草稿 r3 已保存。',{exact:true})).toBeVisible();
  const current=await get(workspacePath);
  const credential=await post('/admin/machine-credentials',{name:'体验制作浏览器联调',domain:'experience',productIds:[productId],skillIds:[method.skillId,reportMethod.skillId],
    permissions:['content:read','content:write','skills:read','skills:write','context:read'],expiresAt:new Date(Date.now()+3600000).toISOString(),requestId:randomUUID()});
  const body={manifest:current.latest.manifest,reportPlan:current.latest.reportPlan,methods:current.latest.methods.map(m=>({purpose:m.purpose,skillVersionId:m.version.id})).reverse(),
    note:'MCP 体验草稿 · 等待运营复核',expectedRevision:3,expectedVersionRevision:current.versionRevision,requestId:randomUUID()};
  const saved=await fetch(base+'/api/machine/experience/tools/draft_save',{method:'POST',headers:{authorization:'Bearer '+credential.token,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal(saved.status,200);const machineDraft=await saved.json();
  await desk.getByRole('button',{name:'读取最新稿',exact:true}).click();await expect(desk.getByText('已核实 MCP 接入',{exact:true})).toBeVisible();
  await expect(desk.getByLabel('体验制作说明',{exact:true})).toHaveValue(body.note);
  await expect(desk.getByLabel('场景与交互设计方法',{exact:true})).toHaveValue(method.id);
  await expect(desk.getByLabel('报告呈现方法',{exact:true})).toHaveValue(reportMethod.id);
  await expect(desk.getByLabel('场景与交互设计方法',{exact:true}).locator('option[value="'+reportMethod.id+'"]')).toHaveCount(0);
  await expect(desk.getByLabel('报告呈现方法',{exact:true}).locator('option[value="'+method.id+'"]')).toHaveCount(0);
  await desk.getByRole('button',{name:'审核体验',exact:true}).click();await expect(desk.getByText('体验 r5 已审核，可随题库版本发布。',{exact:true})).toBeVisible();
  const reviewed=(await get(workspacePath)).latest;assert.equal(reviewed.machineCredentialId,credential.credential.id);assert.equal(reviewed.revision,5);
  const contentReviewed=await post(`/admin/products/${productId}/versions/${version.id}/review`,{expectedRevision:current.versionRevision,requestId:randomUUID()});
  await post(`/admin/products/${productId}/versions/${version.id}/publish`,{expectedRevision:contentReviewed.revision,requestId:randomUUID()});
  const release=await fixture.runtime.client.experienceRelease.findUniqueOrThrow({where:{productVersionId:version.id}});
  assert.equal(release.authoringRevisionId,reviewed.id);assert.deepEqual(release.manifest,reviewed.manifest);
  assert.deepEqual(await fixture.runtime.client.experienceRelease.findUnique({where:{id:originalRuntime.id}}),originalRuntime);
  assert.deepEqual((await get('/admin/experience-revisions/'+first.id)).manifest,first.manifest);
  assert.equal(machineDraft.source,'mcp');

  const order=await post('/admin/orders',{platform:'manual',reference:'demo:t15b:'+randomUUID(),productVersionId:version.id,scope:'demo',quantity:1,amountFen:0,requestId:randomUUID()});
  const issued=await post('/admin/orders/'+order.id+'/issue',{requestId:randomUUID()}),consumer=await browser.newContext({baseURL:base,viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
    const page=await consumer.newPage();await page.goto('/redeem');await page.getByLabel('兑换码',{exact:true}).fill(issued.deliveries[0].code);await page.getByRole('button',{name:'领取或恢复',exact:true}).click();
    await expect(page).toHaveURL(base+'/apps');await page.getByRole('button',{name:'开始测试',exact:true}).click();
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+(?:\?question=[a-z0-9-]+)?$/);
    const attemptId=new URL(page.url()).pathname.split('/').at(-1);
    await expect(page.locator('[data-experience-release="'+release.id+'"]')).toBeVisible();
    const image=page.getByRole('img',{name:'配套体验插画',exact:true});await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);
    for(let i=0;i<catalog.configuration.questions.length;i++){
      await expect(page.locator('legend')).toContainText(`第 ${i+1}/${catalog.configuration.questions.length} 题`);
      await page.getByRole('radio',{name:'经常如此',exact:true}).check();await page.getByRole('button',{name:'保存答案',exact:true}).click();
      await expect(page.getByRole('progressbar',{name:'已保存进度',exact:true})).toHaveAttribute('value',String(i+1));
      if(i<catalog.configuration.questions.length-1)await page.getByRole('button',{name:'下一题',exact:true}).click();
    }
    await page.getByRole('button',{name:'生成报告',exact:true}).click();await expect(page).toHaveURL(/\/reports\/[a-f0-9-]+$/);
    const reportId=new URL(page.url()).pathname.split('/').at(-1),report=await(await consumer.request.get(base+'/api/reports/'+reportId)).json();
    assert.equal(report.presentation.releaseId,release.id);assert.equal(report.presentation.theme.key,'garden-preview');assert.equal(report.content.totalScore,100);
    const resource=await consumer.request.get(base+`/api/reports/${reportId}/resources/${first.manifest.resources[0].resourceId}`);assert.equal(resource.status(),200);
    const checksum=createHash('sha256').update(await resource.body()).digest('hex');assert.equal(checksum,first.manifest.resources[0].checksum);
    assert.equal((await fixture.runtime.client.attempt.findUniqueOrThrow({where:{id:attemptId}})).experienceReleaseId,release.id);
  }finally{await consumer.close();}
  await post('/admin/machine-credentials/'+credential.credential.id+'/revoke',{requestId:randomUUID()});
  checks.push('unsupported drafts cannot review; a scoped MCP revision appears with verified provenance, is manually reviewed and published with exact resources, drives an owned consumer report and preserves prior revisions/releases');
  await admin.goto(`/admin/content/${productId}?version=${version.id}&profile=${profile.id}&tab=experience`);
  await expect(desk.getByText('已核实 MCP 接入',{exact:true})).toBeVisible();
  await pane.evaluate(node=>{node.scrollTop=0;});await admin.screenshot({path:join(output,'experience-published-desktop.png'),fullPage:true});
  return checks;
}
