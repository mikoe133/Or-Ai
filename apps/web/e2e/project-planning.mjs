import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {chromium,expect as expectBase} from 'playwright/test';
import {planningFixture} from './project-planning-fixture.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(join(root,'apps/api/package.json')),
  {Test}=require('@nestjs/testing'),{AppModule}=require('./.test-build/src/app.module.js'),{APP_CONFIG}=require('./.test-build/src/config/configuration.js'),
  {configureApp}=require('./.test-build/src/common/configure-app.js'),{createLocalFixture}=require('./.test-build/test/local-fixture.js'),{runAdminCommand}=require('./.test-build/scripts/admin-command.js'),
  accounts=JSON.parse(await readFile(join(root,'.local/auth/operator-account.json'),'utf8')),base=accounts.siteOrigin,
  output=join(root,'output/design-review/project-planning-g7-20261022'),privateOutput=join(root,'.local/g7-project-planning'),expect=expectBase.configure({timeout:20000});
assert.equal(base,'http://127.0.0.1:5173');await mkdir(output,{recursive:true});await mkdir(privateOutput,{recursive:true,mode:0o700});
let app,fixture,browser,directory,page,sample,phase='setup',apiOrigin,closing=false;const checks=[],screens=[],errors=[],serverErrors=[],http=[];
async function screen(name){await page.screenshot({path:join(output,name+'.png'),animations:'disabled'});screens.push(name+'.png');}
async function pass(name){checks.push(name);console.log('PASS '+name);
  const keyHash=createHash('sha256').update('DEMO:anonymous-read-ip:127.0.0.1').digest('hex'),rate=await fixture.runtime.client.requestRateBucket.findUnique({where:{keyHash}});
  if(rate&&rate.hits>=80&&rate.windowEndsAt>new Date()){console.log('WAIT respecting read rate limit');await new Promise(resolve=>setTimeout(resolve,Math.min(60000,rate.windowEndsAt-Date.now()+100)));}}
async function forward(context){await context.route(base+'/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  try{const response=await route.fetch({url:apiOrigin+path+new URL(route.request().url()).search,maxRetries:0,maxRedirects:0});
    http.push({path,method:route.request().method(),status:response.status()});if(response.status()>=500)serverErrors.push({path,status:response.status()});
    await route.fulfill({response});
  }catch{if(!closing)http.push({path,method:route.request().method(),status:0,reason:'forwarding_failed'});await route.abort('failed').catch(()=>{});}
});}
async function login(target,account){await target.goto(base+'/auth/login');await target.getByLabel('邮箱',{exact:true}).fill(account.email);await target.getByLabel('密码',{exact:true}).fill(account.password);
  await target.getByRole('button',{name:'邮箱登录',exact:true}).click();await expect(target).not.toHaveURL(/\/auth\/login/);}
const projectUrl=id=>base+'/admin/content/'+id+'?tab=project';
const toolbar=target=>target.locator('.pw-planning-toolbar'),dialog=target=>target.locator('.pw-planning-dialog');
async function begin(target){const button=toolbar(target).getByRole('button',{name:'编辑规划',exact:true});
  await expect.poll(async()=>await button.count()+await toolbar(target).getByRole('button',{name:'＋ 添加节点',exact:true}).count()).toBeGreaterThan(0);
  if(await button.count())await button.click();}
async function add(target,title,domain='copy',upstream=''){
  await toolbar(target).getByRole('button',{name:'＋ 添加节点',exact:true}).click();await expect(dialog(target)).toBeVisible();
  await dialog(target).getByLabel('节点名称',{exact:true}).fill(title);await dialog(target).getByLabel('专业领域',{exact:true}).selectOption(domain);
  await dialog(target).getByLabel('上游模块',{exact:true}).selectOption(upstream);await dialog(target).getByRole('button',{name:'添加到画布',exact:true}).click();await expect(dialog(target)).not.toBeVisible();
}
async function save(target){await toolbar(target).getByRole('button',{name:'保存新计划',exact:true}).click();await expect(toolbar(target).getByRole('button',{name:'编辑规划',exact:true})).toBeVisible();await expect(toolbar(target).getByRole('button',{name:'编辑规划',exact:true})).toBeEnabled();}
async function latest(){return (await sample.services.ProductionPlansService.list(sample.access,sample.product.id,{pageSize:1})).items[0];}
async function move(target,module){const node=target.locator('.react-flow__node[data-id="module:'+module.id+'"] h3');await expect(node).toBeVisible();const b=await node.boundingBox();
  await target.mouse.move(b.x+Math.min(20,b.width/2),b.y+b.height/2);await target.mouse.down();await target.mouse.move(b.x+Math.min(20,b.width/2)+60,b.y+b.height/2+35,{steps:8});await target.mouse.up();}
try{
  process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-planning-ui-'));
  await writeFile(join(privateOutput,'active.json'),JSON.stringify({pid:process.pid,database:fixture.name,directory,temporary:true})+'\n',{mode:0o600});
  assert.ok(fixture.configuration.auth?.url.startsWith('http://127.0.0.1:54321'));
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,assets:{...fixture.configuration.assets,driver:'local',directory}}).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');apiOrigin=await app.getUrl();
  browser=await chromium.launch({headless:true,executablePath:process.env.ORAI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context=await browser.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce'});await forward(context);page=await context.newPage();
  context.on('page',target=>target.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  context.on('response',response=>{if(response.url().startsWith(apiOrigin)&&response.status()>=500)serverErrors.push({path:new URL(response.url()).pathname,status:response.status()});});
  phase='real existing Auth login and isolated admin grant';await login(page,accounts.operator);
  const current=await page.evaluate(async()=>await (await fetch('/api/account/context')).json());assert.ok(current.account?.emailVerified);
  const operator=await fixture.runtime.client.user.findUniqueOrThrow({where:{id:current.account.id}});
  await runAdminCommand(['grant','--supabase-user',operator.supabaseUserId,'--request-id',randomUUID()],fixture.env);await page.reload();await pass(phase);
  sample=await planningFixture({app,fixture,root});const history=JSON.stringify(await sample.services.ProjectReviewService.read(sample.access,sample.review.id));
  phase='method and provenance relations stay read-only while planning is editable';await page.goto(projectUrl(sample.product.id));await page.getByRole('button',{name:'检查与审核',exact:true}).click();await begin(page);
  await expect(page.locator('.pw-inspector').getByRole('heading',{name:'规划编辑中',exact:true})).toBeVisible();await expect(page.locator('.pw-inspector').getByRole('button',{name:'保存审核部分稿',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'展开引流文案文件夹',exact:true}).click();
  const methodNode=page.locator('.react-flow__node[data-id="method:'+sample.method.id+'"]'),copyNode=page.locator('.react-flow__node[data-id="module:'+sample.plan.modules.find(m=>m.moduleKey==='copy').id+'"]');
  await expect(methodNode).toBeVisible();await expect(methodNode.locator('[data-handleid="ref"]')).not.toHaveClass(/connectable/);
  await expect(copyNode.locator('[data-handleid="method"]')).not.toHaveClass(/connectable/);
  await expect(page.locator('.react-flow__edge[data-id^="method-ref:"] .react-flow__edgeupdater')).toHaveCount(0);
  await expect(page.locator('.react-flow__edge[data-id^="provenance:"] .react-flow__edgeupdater')).toHaveCount(0);
  await page.getByRole('button',{name:'收起引流文案文件夹',exact:true}).click();await pass(phase);
  phase='add module, protect unsaved draft, save a new real plan and refresh';await add(page,'系列配图','cover','copy');
  assert.equal((await latest()).revision,1);await page.getByRole('navigation',{name:'内容工作台页签'}).getByRole('button',{name:'引流文案',exact:true}).click();
  await expect(page.getByText('请先保存或放弃项目规划，再切换页签。',{exact:true})).toBeVisible();await screen('desktop-unsaved-add');await save(page);
  let currentPlan=await latest();assert.equal(currentPlan.revision,2);const extra=currentPlan.modules.find(m=>m.definition.title==='系列配图');assert.deepEqual(extra.definition.dependsOn,['copy']);
  assert.equal(currentPlan.modules[0].moduleId,sample.plan.modules[0].moduleId);await page.reload();await expect(page.locator('.pw-directory-module')).toHaveCount(6);await pass(phase);
  phase='module layout saves separately and survives reload without a new business revision';await page.getByRole('button',{name:'关系画布',exact:true}).click();await move(page,extra);
  await toolbar(page).getByRole('button',{name:'保存布局',exact:true}).click();await expect(toolbar(page).locator('.pw-planning-state')).not.toContainText('有未保存修改');
  const layout=await sample.services.ProjectCanvasService.read(sample.access,currentPlan.id);assert.equal(layout.layout.revision,2);assert.equal((await latest()).revision,2);
  const position=layout.layout.layout.positions.find(p=>p.nodeKey==='module:'+extra.moduleKey);assert.ok(position);await page.reload();
  const positioned=page.locator('.react-flow__node[data-id="module:'+extra.id+'"]');
  await expect.poll(async()=>positioned.evaluate((node,expected)=>{const matrix=new DOMMatrixReadOnly(getComputedStyle(node).transform);return Math.max(Math.abs(matrix.m41-expected.x),Math.abs(matrix.m42-expected.y));},position)).toBeLessThan(.01);await pass(phase);
  phase='actual handle drag creates a dependency and rejects a cycle';await begin(page);
  const from=currentPlan.modules.find(m=>m.moduleKey==='assessment'),source=page.locator('.react-flow__node[data-id="module:'+from.id+'"] [data-handleid="out"]'),target=page.locator('.react-flow__node[data-id="module:'+extra.id+'"] [data-handleid="in"]');
  const a=await source.boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:15});await page.mouse.up();
  await expect(page.locator('.react-flow__edge[data-id="dependency:'+from.id+':'+extra.id+'"]')).toHaveCount(1);
  await toolbar(page).getByRole('button',{name:'连接模块',exact:true}).click();await dialog(page).getByLabel('上游模块',{exact:true}).selectOption(extra.moduleKey);await dialog(page).getByLabel('下游模块',{exact:true}).selectOption('assessment');
  await dialog(page).getByRole('button',{name:'确认连接',exact:true}).click();await expect(dialog(page).getByText('模块依赖不能形成循环',{exact:true})).toBeVisible();await dialog(page).getByRole('button',{name:'返回画布',exact:true}).click();await save(page);
  currentPlan=await latest();assert.equal(currentPlan.revision,3);assert.deepEqual(currentPlan.modules.find(m=>m.moduleKey===extra.moduleKey).definition.dependsOn,['copy','assessment']);await pass(phase);
  phase='two real clients conflict without overwriting the other plan and preserve the losing draft';const peer=await context.newPage();await page.goto(projectUrl(sample.product.id));await peer.goto(projectUrl(sample.product.id));await begin(page);await begin(peer);
  await add(page,'保留的冲突草稿');await add(peer,'另一个管理员保存的模块');await save(peer);assert.equal((await latest()).revision,4);
  await toolbar(page).getByRole('button',{name:'保存新计划',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'当前规划保留'})).toBeVisible();assert.equal((await latest()).revision,4);
  const downloaded=page.waitForEvent('download');await toolbar(page).getByRole('button',{name:'导出草稿',exact:true}).click();const draft=JSON.parse(await readFile(await (await downloaded).path(),'utf8'));
  assert.equal(draft.persisted,false);assert.equal(draft.expectedRevision,3);assert.ok(draft.plan.modules.some(m=>m.title==='保留的冲突草稿'));
  await toolbar(page).getByRole('button',{name:'放弃并读取最新',exact:true}).click();await expect(page.locator('.pw-directory-module').filter({hasText:'另一个管理员保存的模块'})).toHaveCount(1);await peer.close();await pass(phase);
  phase='lost successful response retries the identical request without a duplicate plan';let dropped=false,requests=[];
  await page.route(base+'/api/admin/products/'+sample.product.id+'/production-plans',async route=>{
    if(route.request().method()!=='POST')return route.fallback();requests.push(route.request().postDataJSON().requestId);
    if(!dropped){dropped=true;const response=await route.fetch({url:apiOrigin+new URL(route.request().url()).pathname});assert.equal(response.status(),200);await route.abort('failed');}else await route.fallback();
  });
  await begin(page);await add(page,'响应未知的模块');await toolbar(page).getByRole('button',{name:'保存新计划',exact:true}).click();await expect(toolbar(page).getByRole('button',{name:'再次确认保存',exact:true})).toBeVisible();
  assert.equal((await latest()).revision,5);await toolbar(page).getByRole('button',{name:'再次确认保存',exact:true}).click();await expect(toolbar(page).getByRole('button',{name:'编辑规划',exact:true})).toBeVisible();
  assert.equal((await latest()).revision,5);assert.equal(requests.length,2);assert.equal(requests[0],requests[1]);await page.unroute(base+'/api/admin/products/'+sample.product.id+'/production-plans');await pass(phase);
  phase='mobile add, dependency adjustment and removal use equivalent forms';await page.setViewportSize({width:390,height:844});await page.goto(projectUrl(sample.product.id));await page.getByRole('button',{name:'目录列表',exact:true}).click();await begin(page);
  await toolbar(page).getByRole('button',{name:'＋ 添加节点',exact:true}).click();await dialog(page).getByLabel('节点名称',{exact:true}).fill('手机补充文案');await dialog(page).getByLabel('上游模块',{exact:true}).selectOption('copy');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await expect(dialog(page).getByRole('button',{name:'添加到画布',exact:true})).toBeInViewport();await screen('mobile-add-module');await dialog(page).getByRole('button',{name:'添加到画布',exact:true}).click();await save(page);
  currentPlan=await latest();assert.equal(currentPlan.revision,6);let mobile=currentPlan.modules.find(m=>m.definition.title==='手机补充文案');
  await begin(page);let folder=page.locator('.pw-folder').filter({hasText:'手机补充文案'});await folder.locator('.pw-directory-dependencies summary').click();await folder.getByRole('button',{name:'调整引流文案到手机补充文案的依赖',exact:true}).click();
  await dialog(page).getByLabel('上游模块',{exact:true}).selectOption('assessment');await screen('mobile-adjust-dependency');await dialog(page).getByRole('button',{name:'确认连接',exact:true}).click();await save(page);
  currentPlan=await latest();assert.equal(currentPlan.revision,7);assert.deepEqual(currentPlan.modules.find(m=>m.moduleKey===mobile.moduleKey).definition.dependsOn,['assessment']);
  await begin(page);folder=page.locator('.pw-folder').filter({hasText:'手机补充文案'});await folder.locator('.pw-directory-dependencies summary').click();await folder.getByRole('button',{name:'调整题目与报告到手机补充文案的依赖',exact:true}).click();
  await dialog(page).getByRole('button',{name:'移除此依赖',exact:true}).click();await save(page);currentPlan=await latest();assert.equal(currentPlan.revision,8);assert.deepEqual(currentPlan.modules.find(m=>m.moduleKey===mobile.moduleKey).definition.dependsOn,[]);
  await screen('mobile-saved-directory');await pass(phase);
  phase='historical plans, fixed method and provenance edges, and review originals remain unchanged';await page.setViewportSize({width:1600,height:1100});await page.goto(projectUrl(sample.product.id)+'&plan='+sample.plan.id);
  await page.getByRole('button',{name:'关系画布',exact:true}).click();assert.equal(await toolbar(page).getByRole('button',{name:'编辑规划',exact:true}).count(),0);
  await page.getByRole('button',{name:'展开引流文案文件夹',exact:true}).click();await expect(page.locator('.react-flow__edge[data-id^="method-ref:"]')).toHaveCount(1);await expect(page.locator('.react-flow__edge[data-id^="provenance:"]')).toHaveCount(1);
  assert.equal(JSON.stringify(await sample.services.ProjectReviewService.read(sample.access,sample.review.id)),history);await page.goto(projectUrl(sample.product.id)+'&review='+sample.review.id);
  await page.getByRole('button',{name:'展开引流文案文件夹',exact:true}).click();await expect(page.locator('.pw-folder').filter({hasText:'引流文案'}).locator('.pw-folder-files')).toContainText('文案创作');assert.equal(await toolbar(page).getByRole('button',{name:'编辑规划',exact:true}).count(),0);await screen('desktop-historical-review');await pass(phase);
  phase='forty-module scale supports bounded focus and refuses a forty-first module';const large=await planningFixture({app,fixture,root,title:'40模块功能验收',count:40,withRecord:false});
  await page.goto(projectUrl(large.product.id));await expect(page.locator('.react-flow__node-module')).toHaveCount(40);await begin(page);await expect(toolbar(page).getByRole('button',{name:'＋ 添加节点',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'聚焦模块',exact:true}).click();await expect.poll(()=>page.locator('.react-flow__node-module').count()).toBeLessThanOrEqual(5);await screen('desktop-40-focus');await toolbar(page).getByRole('button',{name:'放弃修改',exact:true}).click();await pass(phase);
  phase='an empty project with a saved profile can create its first real plan';const empty=await planningFixture({app,fixture,root,title:'空计划功能验收',empty:true});
  await page.goto(projectUrl(empty.product.id));await add(page,'首个文案模块');await save(page);assert.equal((await empty.services.ProductionPlansService.list(empty.access,empty.product.id,{})).items[0].modules.length,1);await pass(phase);
  phase='revoked admin authority stops a pending write without creating a new plan';await page.goto(projectUrl(sample.product.id));await begin(page);await add(page,'失效时保留的规划');const beforeRevocation=(await latest()).revision;
  await runAdminCommand(['revoke','--supabase-user',operator.supabaseUserId,'--request-id',randomUUID()],fixture.env);
  try{await toolbar(page).getByRole('button',{name:'保存新计划',exact:true}).click();
    await expect.poll(async()=>await page.getByRole('alert').filter({hasText:'权限已变化'}).count()+await page.getByText('当前账户没有已验证的管理员权限。',{exact:true}).count()).toBeGreaterThan(0);
    assert.equal((await latest()).revision,beforeRevocation);
    if(await toolbar(page).getByRole('button',{name:'保存新计划',exact:true}).count())await expect(toolbar(page).getByRole('button',{name:'保存新计划',exact:true})).toBeDisabled();
    await screen('desktop-revoked-write');
  }finally{await runAdminCommand(['grant','--supabase-user',operator.supabaseUserId,'--request-id',randomUUID()],fixture.env);}
  if(await toolbar(page).getByRole('button',{name:'放弃修改',exact:true}).count())await toolbar(page).getByRole('button',{name:'放弃修改',exact:true}).click();await pass(phase);
  phase='browser history changes preserve the draft and prevent writes to another plan version';await page.goto(projectUrl(sample.product.id));const livePlan=await latest();
  await page.getByLabel('项目制作计划',{exact:true}).selectOption(sample.plan.id);await expect(toolbar(page).locator('.pw-planning-state')).toContainText('固定版本');
  await page.getByLabel('项目制作计划',{exact:true}).selectOption(livePlan.id);await begin(page);await add(page,'返回时保留的规划');await page.goBack();await page.goBack();
  await expect(page.getByRole('alert').filter({hasText:'当前规划保留'})).toBeVisible();const keptDownload=page.waitForEvent('download');await toolbar(page).getByRole('button',{name:'导出草稿',exact:true}).click();
  const kept=JSON.parse(await readFile(await (await keptDownload).path(),'utf8'));assert.equal(kept.expectedRevision,livePlan.revision);assert.ok(kept.plan.modules.some(m=>m.title==='返回时保留的规划'));
  assert.equal((await latest()).revision,livePlan.revision);await toolbar(page).getByRole('button',{name:'放弃并读取最新',exact:true}).click();await pass(phase);
  phase='ordinary users and missing CSRF cannot use the new layout routes';const ordinaryContext=await browser.newContext({viewport:{width:390,height:844}});await forward(ordinaryContext);const ordinary=await ordinaryContext.newPage();await login(ordinary,accounts.ordinary);
  const forbidden=await ordinary.evaluate(async id=>(await fetch('/api/admin/production-plans/'+id+'/canvas-layout')).status,sample.plan.id);assert.equal(forbidden,403);
  const csrf=await page.evaluate(async id=>(await fetch('/api/admin/production-plans/'+id+'/canvas-layout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,sample.plan.id);assert.equal(csrf,403);await ordinaryContext.close();await pass(phase);
  assert.deepEqual(errors,[]);assert.deepEqual(serverErrors,[]);assert.equal(await fixture.runtime.client.machineCredential.count(),0);
  assert.equal((await fixture.runtime.client.product.findUniqueOrThrow({where:{id:sample.product.id}})).status,'DRAFT');assert.equal(await fixture.runtime.client.styleSkillVersion.count({where:{status:'ACTIVE'}}),0);
  await page.goto(projectUrl(sample.product.id));await begin(page);await screen('desktop-final-editing');await toolbar(page).getByRole('button',{name:'放弃修改',exact:true}).click();
  const result={passed:true,checks,screens,realLocalAuth:true,authGatewayOverride:false,browserTokenInjection:false,existingAccountsOnly:true,
    isolatedBusinessDatabase:true,transparentApiForwarding:true,developerServicesStopped:false,pageErrors:errors,serverErrors,viewportSimulation:true,
    modelCalls:0,mediaGeneration:false,machineCredentialsCreated:0,publication:false,uiApproval:'pending',migration:23};
  await writeFile(join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');await writeFile(join(privateOutput,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,screens:screens.length}));
}catch(error){await writeFile(join(privateOutput,'failure.json'),JSON.stringify({phase,error:error.name,message:error.message,stack:error.stack,errors,serverErrors,http:http.slice(-70)},null,2)+'\n');
  if(page&&!page.isClosed()){await page.screenshot({path:join(privateOutput,'failure.png')}).catch(()=>{});await writeFile(join(privateOutput,'failure-body.txt'),await page.locator('body').innerText().catch(()=>''));}
  console.error(JSON.stringify({passed:false,phase,errorType:error.name}));process.exitCode=1;
}finally{closing=true;await browser?.close();await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});await rm(join(privateOutput,'active.json'),{force:true});}
