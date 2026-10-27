import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {expect} from 'playwright/test';
import {sample,profile,configuration,copy} from '../../../examples/social-battery-room/sample.mjs';

const execute=promisify(execFile);
export async function quietRoomPilot({admin,browser,fixture,base,root,output,productId:sourceProductId}) {
  await mkdir(output,{recursive:true});
  const checks=[],contexts=[],db=fixture.runtime.client,media=join(root,'examples/social-battery-room/media');
  const get=async path=>{const r=await admin.request.get(base+'/api'+path);assert.equal(r.status(),200,path);return r.json();};
  const post=async(path,data)=>{const csrf=(await get('/account/context')).csrfToken;const r=await admin.request.post(base+'/api'+path,{headers:{origin:base,'x-csrf-token':csrf},data});assert.equal(r.status(),200,path+':'+await r.text());return r.json();};
  async function upload(versionId,kind,name,mimeType){const bytes=await readFile(join(media,name)),file=await post('/admin/uploads',{productVersionId:versionId,kind,fileName:name,mimeType,byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex'),requestId:randomUUID()});
    const csrf=(await get('/account/context')).csrfToken,r=await admin.request.put(base+'/api/admin/uploads/'+file.id+'/content',{headers:{origin:base,'x-csrf-token':csrf,'content-type':'application/octet-stream'},data:bytes});assert.equal(r.status(),200,await r.text());
    return post('/admin/uploads/'+file.id+'/complete',{requestId:randomUUID()});}
  const original=await get('/admin/products/'+sourceProductId),keys=['slug','name','hook','summary','description','categoryId','tagIds','priceFen','durationMinutes','experienceType','themeKey','coverUrl','scope','recommended','publicSample','purchaseUrl','purchaseNotice','redemptionNotice'];
  const metadata=Object.fromEntries(keys.map(key=>[key,original[key]]));
  const product=await post('/admin/products',{...metadata,slug:'quiet-room-'+randomUUID(),name:sample.title,hook:copy.blocks[0].text,summary:'六个小问题，一页关于恢复与边界的观察手记。',description:'本地 2.5D 网页试点，未经正式内容或商业验收。',themeKey:'social-battery-room',coverUrl:null,
    publicSample:{label:'为自己留了空间 · 独立样例',summary:'这份公开示例独立编写，不来自私人报告。',dimensions:[{label:'独处恢复',score:50},{label:'边界表达',score:50}],suggestion:copy.blocks[2].text,isDemo:true},requestId:randomUUID()});
  const setting=await post(`/admin/products/${product.id}/creative-profiles`,{profile,expectedRevision:0,requestId:randomUUID()}),
    version=await post(`/admin/products/${product.id}/versions`,{configuration,requestId:randomUUID()});
  await admin.setViewportSize({width:1440,height:1000});await admin.goto(`/admin/content/${product.id}?version=${version.id}&profile=${setting.id}&tab=experience`);
  const desk=admin.getByRole('region',{name:/^(?:体验设计|结果呈现)制作工作台$/});
  await desk.getByLabel('交互模板',{exact:true}).selectOption('quiet-room@1');
  await admin.getByRole('button',{name:/^结果交付(?: ·)?$/}).click();
  await expect(desk.getByLabel('报告呈现模板',{exact:true})).toHaveValue('field-notes@1');
  await admin.getByRole('button',{name:/^体验设计(?: ·)?$/}).click();
  await desk.getByLabel('体验主题标识',{exact:true}).fill('social-battery-room');
  await desk.getByRole('button',{name:'保存体验与结果草稿',exact:true}).click();await expect(desk.getByText('体验与结果草稿 r1 已保存。',{exact:true})).toBeVisible();
  const method=await post('/admin/skills/experience',{slug:'quiet-room-'+randomUUID(),requestId:randomUUID(),manifest:{schemaVersion:1,domain:'experience',name:'小屋与手记制作约束',description:'同一纸本小屋意象，明确选择，不从行为轨迹推断人格',purposes:['scene_design','report_presentation'],styles:['纸本小屋'],supportedForms:['web'],inputs:[{key:'creative-profile',description:'固定共同设定',required:true}],outputs:[{key:'experience',description:'注册的小屋和手记组合'}],instructions:'使用 quiet-room@1 和 field-notes@1；最多四个明确选项。服务端确认后保存，手记只排版已有结果；保留无消费预览与同内容回退。',examples:[],references:[]}}),
    methodReviewed=await post(`/admin/skills/experience/${method.skillId}/versions/${method.id}/review`,{expectedRevision:method.revision,requestId:randomUUID()});
  await post(`/admin/skills/experience/${method.skillId}/versions/${method.id}/activate`,{expectedRevision:methodReviewed.revision,requestId:randomUUID()});
  const credential=await post('/admin/machine-credentials',{name:'小屋试点 SDK',domain:'experience',productIds:[product.id],skillIds:[method.skillId],permissions:['content:read','content:write','skills:read','skills:write','context:read'],expiresAt:new Date(Date.now()+3600000).toISOString(),requestId:randomUUID()});
  try {
    const result=await execute(process.execPath,[join(root,'packages/mcp/test/real-experience-client.mjs')],{env:{...process.env,ORAI_MCP_API_URL:base,ORAI_MCP_TOKEN:credential.token,ORAI_MCP_DOMAIN:'experience',ORAI_MCP_ALLOWED_ROOT:media,
      ORAI_MCP_EXPERIENCE_SCENARIO_JSON:JSON.stringify({productVersionId:version.id,skillVersionId:method.id,expectedRevision:1,expectedVersionRevision:1,filePath:join(media,'quiet-room-cover.png'),mimeType:'image/png',label:'小屋封面参考',renderer:'quiet-room@1'})},maxBuffer:1000000});
    assert.equal(result.stdout.includes(credential.token),false);assert.equal(JSON.parse(result.stdout).ok,true);
    await desk.getByRole('button',{name:'读取最新稿',exact:true}).click();await expect(desk.getByText('已核实 MCP 接入',{exact:true})).toBeVisible();
    await expect(desk.getByLabel('交互模板',{exact:true})).toHaveValue('quiet-room@1');
    await desk.getByRole('button',{name:'审核体验',exact:true}).click();await expect(desk.getByText('体验 r3 已审核，可随题库版本发布。',{exact:true})).toBeVisible();
    const reviewed=await post(`/admin/products/${product.id}/versions/${version.id}/review`,{expectedRevision:1,requestId:randomUUID()});
    let assessment=(await get('/admin/content-revisions?productId='+product.id+'&domain=assessment&current=true')).items[0];
    if(!await db.productionRecord.findUnique({where:{outputRevisionId:assessment.id}}))await post('/admin/production-records',{outputRevisionId:assessment.id,creativeProfileRevisionId:setting.id,production:{source:'manual',batchKey:'quiet-room-pilot',externalLabel:'本地试点人工内容'},requestId:randomUUID()});
    await post(`/admin/products/${product.id}/versions/${version.id}/publish`,{expectedRevision:reviewed.revision,requestId:randomUUID()});
    assessment=(await get('/admin/content-revisions?productId='+product.id+'&domain=assessment&current=true')).items[0];
    const release=await db.experienceRelease.findUniqueOrThrow({where:{productVersionId:version.id}});
    assert.equal(release.manifest.renderer.key,'quiet-room');assert.equal(release.manifest.report.renderer.key,'field-notes');
    const workspace=await get(`/admin/products/${product.id}/versions/${version.id}/experience`);
    const demonstration=await post('/admin/experience-revisions/'+workspace.latest.id+'/preview',{answers:configuration.questions.map(q=>({questionId:q.id,optionId:'often'}))});
    assert.equal(demonstration.report.totalScore,100);

    const production={source:'manual',batchKey:'quiet-room-pilot',externalLabel:'本地纸本插画/网页录屏'};
    async function asset(content,file=null,inputs=[]){
      const saved=await post('/admin/content-assets',{productVersionId:version.id,platform:'manual',variant:'quiet-room-'+content.kind,expectedRevision:0,requestId:randomUUID(),fileId:file?.id??null,
        authoring:{schemaVersion:1,creativeProfileRevisionId:setting.id,content,media:{localArchive:null,previewFileId:null},inputs,production}});
      const row=await get('/admin/assets/'+saved.assetId),reviewed=await post('/admin/assets/'+saved.assetId+'/review',{expectedRevision:row.revision,requestId:randomUUID()});
      await post('/admin/assets/'+saved.assetId+'/ready',{expectedRevision:reviewed.revision,requestId:randomUUID()});
      return (await get('/admin/content-revisions?productId='+product.id+'&assetId='+saved.assetId+'&current=true')).items[0];
    }
    const copyRevision=await asset(copy),coverFile=await upload(version.id,'cover','quiet-room-cover.png','image/png'),
      coverRevision=await asset({kind:'cover',title:sample.title,description:copy.blocks[0].text+' 暖白纸本、灰紫小屋、窗光与座椅，与实际体验和手记保持一致。'},coverFile,[{sourceRevisionId:copyRevision.id,sourceDigest:copyRevision.digest,locator:{kind:'block',blockId:'hook'},targetLocator:{kind:'whole'},role:'hook',mode:'exact',usedText:copy.blocks[0].text}]);
    const storyboard=JSON.parse(await readFile(join(media,'storyboard.json'),'utf8')),videoFile=await upload(version.id,'video','quiet-room-demo.webm','video/webm');
    assert.ok(videoFile.durationMs>storyboard.scenes.at(-1).endMs);assert.equal(videoFile.width,1280);assert.equal(videoFile.height,720);
    const inputs=storyboard.scenes.map(scene=>({sourceRevisionId:scene.source==='hook'||scene.source==='cta'?copyRevision.id:assessment.id,
      sourceDigest:scene.source==='hook'||scene.source==='cta'?copyRevision.digest:assessment.digest,
      locator:scene.source==='hook'||scene.source==='cta'?{kind:'block',blockId:scene.source}:{kind:'question',questionId:scene.source},targetLocator:{kind:'scene',sceneId:scene.sceneId},
      role:scene.source==='hook'?'hook':scene.source==='cta'?'cta':'question',mode:'exact',usedText:scene.text}));
    const videoRevision=await asset({kind:'video',scenes:storyboard.scenes.map(({source,...scene})=>scene)},videoFile,inputs);
    const selection={productId:product.id,creativeProfileRevisionId:setting.id,assessmentRevisionId:assessment.id,assetRevisionIds:[copyRevision.id,coverRevision.id,videoRevision.id],reportMode:'compatible_standard',label:'小屋试点 · 四类内容'};
    const packagePreview=await post('/admin/content-packages/preview',selection);assert.equal(packagePreview.canAdopt,true,JSON.stringify(packagePreview.issues));
    const contentPackage=await post('/admin/content-packages',{selection,expectedFingerprint:packagePreview.fingerprint,expectedPackageNumber:packagePreview.latestPackageNumber,note:'隔离试点：小屋、手记和传播内容同一设定。视频为设计样例录屏，非正式成片。',consistencyConfirmed:true,requestId:randomUUID()});
    await admin.reload();await expect(desk.getByLabel('交互模板',{exact:true})).toHaveValue('quiet-room@1');
    await admin.screenshot({path:join(output,'quiet-room-admin.png'),fullPage:true});
    checks.push('quiet room pairs with field notes in administration; a real scoped SDK reads opt-in capabilities, uploads a bounded resource and saves a verified draft; the reviewed release and four deliverables retain one fixed profile, playable video and exact question/hook/CTA sources');

    async function start(viewport={width:1440,height:1100}){
      const order=await post('/admin/orders',{platform:'manual',reference:'demo:t16:'+randomUUID(),productVersionId:version.id,scope:'demo',quantity:1,amountFen:0,requestId:randomUUID()}),issued=await post('/admin/orders/'+order.id+'/issue',{requestId:randomUUID()});
      const context=await browser.newContext({baseURL:base,viewport,hasTouch:true,reducedMotion:'reduce'});contexts.push(context);const page=await context.newPage();
      await page.goto('/redeem');await page.getByLabel('兑换码',{exact:true}).fill(issued.deliveries[0].code);await page.getByRole('button',{name:'领取或恢复',exact:true}).click();await expect(page).toHaveURL(base+'/apps');await page.getByRole('button',{name:'开始测试',exact:true}).click();await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+(?:\?question=[a-z0-9-]+)?$/);
      return {context,page,order,attemptId:new URL(page.url()).pathname.split('/').at(-1)};
    }
    const live=await start();let saves=0;live.page.on('request',request=>{if(request.method()==='PUT'&&request.url().includes('/answers/'))saves++;});
    await expect(live.page.locator('[data-experience-template="quiet-room@1"]')).toBeVisible();
    const input=live.page.getByRole('radio',{name:'很少如此',exact:true});await input.focus();await input.press('ArrowRight');await expect(live.page.getByRole('radio',{name:'有时如此',exact:true})).toBeChecked();assert.equal(saves,0);
    await live.page.getByRole('button',{name:'选择选项 3：经常如此',exact:true}).click();assert.equal(saves,0);
    await live.page.screenshot({path:join(output,'quiet-room-desktop.png'),fullPage:true});
    await live.page.getByRole('button',{name:'保存答案',exact:true}).click();await expect(live.page.getByRole('progressbar',{name:'已保存进度'})).toHaveAttribute('value','1');
    await live.page.getByRole('button',{name:'下一题',exact:true}).click();await live.page.getByRole('radio',{name:'有时如此',exact:true}).check();await live.page.reload();
    await expect(live.page.getByRole('radio',{name:'有时如此',exact:true})).not.toBeChecked();await expect(live.page.getByRole('progressbar',{name:'已保存进度'})).toHaveAttribute('value','1');
    await live.page.setViewportSize({width:390,height:844});await live.page.getByRole('button',{name:'选择选项 3：经常如此',exact:true}).tap();
    assert.equal(await live.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    for(const button of await live.page.locator('.room-object').all()){const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);}
    await live.page.screenshot({path:join(output,'quiet-room-mobile.png'),fullPage:true});
    async function finish(flow,from,option='经常如此'){for(let index=from;index<configuration.questions.length;index++){
      await expect(flow.page.locator('legend')).toContainText(`第 ${index+1}/${configuration.questions.length} 题`);await flow.page.getByRole('radio',{name:option,exact:true}).check();
      await flow.page.getByRole('button',{name:'保存答案',exact:true}).click();await expect(flow.page.getByRole('progressbar',{name:'已保存进度'})).toHaveAttribute('value',String(index+1));
      if(index<configuration.questions.length-1)await flow.page.getByRole('button',{name:'下一题',exact:true}).click();
    }await flow.page.getByRole('button',{name:'生成报告',exact:true}).click();await expect(flow.page).toHaveURL(/\/reports\/[a-f0-9-]+$/);const reportId=new URL(flow.page.url()).pathname.split('/').at(-1);return {reportId,...await(await flow.context.request.get(base+'/api/reports/'+reportId)).json()};}
    const report=await finish(live,1);await expect(live.page.locator('[data-report-template="field-notes@1"]')).toBeVisible();
    assert.equal(report.content.totalScore,demonstration.report.totalScore);assert.equal(report.presentation.releaseId,release.id);
    await live.page.screenshot({path:join(output,'field-notes-mobile.png'),fullPage:true});await live.page.setViewportSize({width:1440,height:1100});
    await live.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await live.page.screenshot({path:join(output,'field-notes-desktop.png'),fullPage:true});
    checks.push('owned room choices work with keyboard and touch without auto-save; refresh drops only an unconfirmed choice, mobile targets remain usable and the fixed hand-note report matches server preview without another score engine');

    const fallback=await start({width:393,height:852});await expect(fallback.page.locator('[data-experience-template="quiet-room@1"]')).toBeVisible();
    await fallback.page.getByRole('button',{name:'选择选项 3：经常如此',exact:true}).click();await fallback.page.getByRole('button',{name:'使用简化界面',exact:true}).click();await expect(fallback.page.getByRole('radio',{name:'经常如此',exact:true})).toBeChecked();
    await fallback.context.route(/\/src\/experience\/field-notes\.tsx(?:\?|$)/,route=>route.abort('failed'));
    const simpleReport=await finish(fallback,0);await expect(fallback.page.getByText('已用简化排版展示同一份报告。',{exact:true})).toBeVisible();assert.deepEqual(simpleReport.content,report.content);
    const failed=await start({width:390,height:844});await failed.context.route(/\/api\/attempts\/[^/]+\/resources\//,route=>route.abort('failed'));await failed.page.reload();
    await expect(failed.page.getByText('已切换到简化界面，已保存进度保留。',{exact:true})).toBeVisible();assert.equal((await db.attempt.findUniqueOrThrow({where:{id:failed.attemptId}})).revision,0);
    await failed.page.screenshot({path:join(output,'quiet-room-resource-fallback.png'),fullPage:true});
    await failed.context.unroute(/\/api\/attempts\/[^/]+\/resources\//);await failed.context.route(/\/src\/experience\/quiet-room\.tsx(?:\?|$)/,route=>route.abort('failed'));await failed.page.reload();
    await expect(failed.page.getByText('已切换到简化界面，已保存进度保留。',{exact:true})).toBeVisible();
    const session=await(await live.context.request.get(base+'/api/session/context')).json(),repeated=await live.context.request.post(base+'/api/attempts/'+live.attemptId+'/submit',{headers:{origin:base,'x-csrf-token':session.csrfToken},data:{expectedRevision:6,requestId:randomUUID()}});assert.equal((await repeated.json()).id,report.reportId);
    const rights=await(await live.context.request.get(base+'/api/session/entitlements')).json();assert.equal(rights.items[0].reportsConsumed,1);
    await post('/admin/orders/'+live.order.id+'/refund',{requestId:randomUUID()});await live.page.reload();await expect(live.page.getByRole('alert')).toBeVisible();
    assert.notEqual((await live.context.request.get(base+'/api/reports/'+report.reportId)).status(),200);
    assert.notEqual((await live.context.request.get(base+`/api/reports/${report.reportId}/resources/sdk-picture`)).status(),200);
    assert.equal((await db.entitlement.findUniqueOrThrow({where:{id:rights.items[0].id}})).reportsConsumed,1);
    const fileIds=[coverFile.id,videoFile.id,...release.manifest.resources.map(resource=>resource.fileId)];
    await writeFile(join(output,'pilot-manifest.json'),JSON.stringify({syntheticIsolatedData:true,productId:product.id,productVersionId:version.id,creativeProfileRevisionId:setting.id,releaseId:release.id,releaseDigest:release.digest,authoringRevisionId:release.authoringRevisionId,contentPackageId:contentPackage.id,
      template:'quiet-room@1',report:'field-notes@1',methodVersionId:method.id,contentRevisions:{assessment:assessment.id,copy:copyRevision.id,cover:coverRevision.id,video:videoRevision.id},fileIds,videoMetadata:{width:videoFile.width,height:videoFile.height,durationMs:videoFile.durationMs,byteSize:videoFile.byteSize},scoreParity:report.content.totalScore,physicalDeviceAccepted:false},null,2)+'\n');
    checks.push('manual and resource/report module fallback keep the same options and server report; repeat completion uses one credit and refund immediately denies report/resource access while retaining its historical snapshot');

    const missing=await start({width:390,height:844}),emptyReport=await finish(missing,0,'这周没有类似情况（不适用）');
    await expect(missing.page.locator('[data-report-template="field-notes@1"]')).toBeVisible();await expect(missing.page.getByText('信息不足，暂不提供总分',{exact:true})).toBeVisible();
    assert.equal(emptyReport.content.totalScore,null);assert.equal(await missing.page.locator('.field-notes meter').count(),0);
    await missing.page.screenshot({path:join(output,'field-notes-insufficient.png'),fullPage:true});
    const designContext=await browser.newContext({baseURL:base,viewport:{width:390,height:844},reducedMotion:'reduce'});contexts.push(designContext);const design=await designContext.newPage(),mutations=[];
    design.on('request',request=>{if(request.url().includes('/api/')&&['POST','PUT','PATCH','DELETE'].includes(request.method()))mutations.push(request.method());});
    await design.goto('/preview/experience/quiet-room');await design.getByRole('radio',{name:'经常如此',exact:true}).check();await design.getByRole('button',{name:'保存答案',exact:true}).click();await design.getByRole('button',{name:'查看报告版式样例',exact:true}).click();
    await expect(design.locator('.notes-result strong')).toHaveText('62');await expect(design.getByText(/这是一份固定的排版样本，与你刚才的练习选择无关/)).toBeVisible();assert.deepEqual(mutations,[]);
    checks.push('field-note reports preserve missing scores as null without meters or zero scores; the explicit design-only preview makes no API mutations and displays a fixed labeled report example rather than scoring local choices');
    return checks;
  }finally{for(const context of contexts)await context.close();await post('/admin/machine-credentials/'+credential.credential.id+'/revoke',{requestId:randomUUID()});}
}
