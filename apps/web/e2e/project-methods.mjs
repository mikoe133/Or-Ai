import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {chromium,expect as expectBase} from 'playwright/test';

const root=fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(join(root,'apps/api/package.json')),
 {Test}=require('@nestjs/testing'),{AppModule}=require('./.test-build/src/app.module.js'),{APP_CONFIG}=require('./.test-build/src/config/configuration.js'),
 {configureApp}=require('./.test-build/src/common/configure-app.js'),{SupabaseAuthGateway}=require('./.test-build/src/accounts/supabase-auth.gateway.js'),
 {createLocalFixture}=require('./.test-build/test/local-fixture.js'),{DemoIdentityScenarios}=require('./.test-build/scripts/demo-fixtures.js'),
 {CatalogAdminAccessService}=require('./.test-build/src/catalog/admin-access.service.js'),{SkillsService}=require('./.test-build/src/operations/skills.service.js'),
 {MachineProjectsService}=require('./.test-build/src/operations/machine-projects.service.js'),{CodexConnectionsService}=require('./.test-build/src/operations/codex-connections.service.js'),
 {ProductionPlansService}=require('./.test-build/src/operations/production-plans.service.js'),
 {methodProject,assessmentInput,methodManifest}=require('./.test-build/test/project-methods-fixture.js');
const base='http://127.0.0.1:5173',output=join(root,'output/design-review/project-methods-o2-formal-20261022'),privateOutput=join(root,'.local/o2-implementation'),
 expect=expectBase.configure({timeout:15000}),proofs=new Map(),refreshes=new Map(),checks=[],screens=[],pageErrors=[],unexpectedHttp=[],forbiddenNetwork=[],requests=[];
let fixture,app,browser,directory,page,apiOrigin,phase='setup',closing=false,dropNextCapture=false,expectedFault=false;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
await mkdir(output,{recursive:true});await mkdir(privateOutput,{recursive:true,mode:0o700});
const pass=name=>{checks.push(name);process.stdout.write('PASS '+name+'\n');};
async function screen(name){await page.screenshot({path:join(output,name+'.png'),animations:'disabled'});screens.push(name+'.png');}
async function forward(context){await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());
 if(url.origin!==base){if(['http:','https:'].includes(url.protocol)){forbiddenNetwork.push(url.origin);await route.abort();return;}await route.continue();return;}
 if(!url.pathname.startsWith('/api/')){await route.continue();return;}
 try{const response=await route.fetch({url:apiOrigin+url.pathname+url.search,maxRetries:0,maxRedirects:0}),item={path:url.pathname,method:request.method(),status:response.status()};requests.push(item);
  if(response.status()>=500&&!expectedFault)unexpectedHttp.push(item);
  if(request.method()==='POST'&&/^\/api\/admin\/production-modules\/[^/]+\/methods$/.test(url.pathname)){
   item.requestId=request.postDataJSON().requestId;if(dropNextCapture&&response.status()===200){dropNextCapture=false;await route.abort('failed');return;}}
  await route.fulfill({response});
 }catch{if(!closing)unexpectedHttp.push({path:url.pathname,method:request.method(),status:0});await route.abort('failed').catch(()=>{});}
 });}
async function login(context,operator=true){const accessToken=randomBytes(50).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');
 proofs.set(accessToken,{supabaseUserId:operator?DemoIdentityScenarios.admin.supabaseUserId:randomUUID(),supabaseSessionId:randomUUID(),emailVerified:true,expiresAt:new Date(Date.now()+3600_000)});refreshes.set(refreshToken,{accessToken,refreshToken});
 const ctx=await context.request.get(apiOrigin+'/api/account/context',{headers:{origin:base}}),csrf=(await ctx.json()).csrfToken;
 assert.equal((await context.request.post(apiOrigin+'/api/account/session',{headers:{origin:base,'x-csrf-token':csrf},data:{accessToken,refreshToken}})).status(),200);
}
const consent=()=>page.getByRole('checkbox',{name:'我已核对基础版本、商品定制与参考附件',exact:true});
async function choose(name='具体而温柔的表达',number=1){await page.getByRole('radio',{name:'选择'+name+' v'+number,exact:true}).check();await page.getByRole('button',{name:'继续，补充商品要求',exact:true}).click();}
async function review(){await page.getByRole('button',{name:'预览完整商品方法',exact:true}).click();await expect(page.getByRole('heading',{name:'确认本次固定的完整方法',exact:true})).toBeVisible();}
async function save(){await consent().check();await page.getByRole('button',{name:'保存为商品方法',exact:true}).click();}
async function fixed(){await expect(page.getByRole('heading',{name:'商品方法已固定',exact:true})).toBeVisible();}
async function latest(moduleId){return fixture.runtime.client.projectMethodSnapshot.findFirstOrThrow({where:{planModuleId:moduleId},orderBy:{createdAt:'desc'}});}
async function geometry(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
try{
 process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-methods-o2-'));
 await writeFile(join(privateOutput,'browser-active.json'),JSON.stringify({pid:process.pid,database:fixture.name,directory,temporary:true})+'\n',{mode:0o600});
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,assets:{...fixture.configuration.assets,driver:'local',directory},
  security:{...fixture.configuration.security,origins:[base],readIpLimit:3000,writeIpLimit:3000},auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000},
 }).overrideProvider(SupabaseAuthGateway).useValue({verify:async token=>{assert.ok(proofs.has(token));return proofs.get(token);},refresh:async token=>{const value=refreshes.get(token);assert.ok(value);return {...value,identity:proofs.get(value.accessToken)};},logout:async()=>undefined}).compile();
 app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');apiOrigin=await app.getUrl();
 const access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id),c=await methodProject(app,fixture,access),input=await assessmentInput(c),skills=app.get(SkillsService),copy=c.module('copy');
 let source=await skills.create(access,'copy',{slug:'o2-shared-'+randomUUID(),requestId:randomUUID(),manifest:{...methodManifest('copy'),name:'具体而温柔的表达'}});
 source=await skills.transition(access,'copy',source.skillId,source.id,'review',{expectedRevision:source.revision,requestId:randomUUID()});
 source=await skills.transition(access,'copy',source.skillId,source.id,'activate',{expectedRevision:source.revision,requestId:randomUUID()});
 const bad=await skills.create(access,'copy',{slug:'o2-game-'+randomUUID(),requestId:randomUUID(),manifest:{...methodManifest('copy'),name:'轻游戏互动方法',supportedForms:['game']}});
 const projectCreated=await app.get(MachineProjectsService).execute(c.machine.get('copy'),'project_method_create',{productId:c.boot.productId,methodKey:'own-ui-method',requestId:randomUUID(),manifest:{...methodManifest('copy'),name:'本商品的轻问句'}});
 const url=base+'/admin/content/'+c.boot.productId+'?tab=project&methodModule=copy';
 browser=await chromium.launch({headless:true,executablePath:process.env.ORAI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1600,height:1100},timezoneId:'Asia/Shanghai',reducedMotion:'reduce'});await forward(context);
 await context.addInitScript(()=>{window.__o2Copies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__o2Copies.push(value);}}});});
 await login(context);page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));

 phase='formal source selection defaults to no method and shows real project ownership and incompatible forms';await page.goto(url);await expect(page.getByRole('heading',{name:'为商品选好制作方法',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'继续，补充商品要求',exact:true})).toBeDisabled();await expect(page.getByRole('radio',{name:'选择轻游戏互动方法 v1',exact:true})).toBeDisabled();
 await expect(page.getByText('本商品候选 · 草稿',{exact:true})).toBeVisible();assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),0);await geometry();await screen('desktop-method-picker');pass(phase);

 phase='typed customization and full confirmation preserve the shared base and require explicit consent';await choose();
 await page.getByRole('button',{name:'＋ 添加',exact:true}).click();await page.getByLabel('参数1名称',{exact:true}).fill('audience');await page.getByLabel('参数1值',{exact:true}).fill('想改善表达的伴侣');
 await page.getByRole('button',{name:'＋ 添加',exact:true}).click();await page.getByLabel('参数2名称',{exact:true}).fill('sentence-limit');await page.getByLabel('参数2类型',{exact:true}).selectOption('number');await page.getByLabel('参数2值',{exact:true}).fill('3');
 await page.getByRole('button',{name:'＋ 添加',exact:true}).click();await page.getByLabel('参数3名称',{exact:true}).fill('gentle');await page.getByLabel('参数3类型',{exact:true}).selectOption('boolean');await page.getByLabel('参数3值',{exact:true}).selectOption('true');
 await page.getByLabel('商品补充说明',{exact:true}).fill('少用抽象术语，用一个具体日常场景进入，留下开放的问题。');await screen('desktop-customization');
 await review();await expect(page.getByRole('button',{name:'保存为商品方法',exact:true})).toBeDisabled();await expect(page.locator('.body-copy')).toContainText('"sentence-limit": 3');await expect(page.locator('.body-copy')).toContainText('"gentle": true');await consent().scrollIntoViewIfNeeded();assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),0);await screen('desktop-confirm');pass(phase);

 phase='cancel and Escape preserve unsaved fields and restore focus before changing a module';await page.getByRole('button',{name:'返回修改',exact:true}).click();await page.locator('#pm-module-assessment').click();await expect(page.getByRole('dialog',{name:'保留这份商品定制？',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#pm-module-assessment')).toBeFocused();await expect(page.getByLabel('商品补充说明',{exact:true})).toHaveValue(/具体日常场景/);await review();pass(phase);

 phase='a lost successful capture response recovers the identical request and exactly one immutable method';dropNextCapture=true;await save();await expect(page.getByRole('heading',{name:'保存结果待确认',exact:true})).toBeVisible();assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),1);await expect(page.locator('#pm-module-cover')).toBeDisabled();await screen('desktop-unknown-save');
 await page.getByRole('button',{name:'核对保存结果',exact:true}).click();await fixed();const first=await latest(copy.id),firstHash=hash(first),captures=requests.filter(r=>r.method==='POST'&&r.path.endsWith('/'+copy.id+'/methods'));assert.equal(captures.length,2);assert.equal(captures[0].requestId,captures[1].requestId);await screen('desktop-fixed-method');pass(phase);

 phase='reload reads the persisted snapshot but requires an explicit choice for this handoff';await page.reload();await expect(page.getByRole('button',{name:'继续，补充商品要求',exact:true})).toBeDisabled();await page.locator('.technical').filter({hasText:'已固定的本用途方法'}).locator(':scope > summary').click();await page.getByLabel('交接使用方法 '+first.id,{exact:true}).check();await fixed();await expect(page.locator('.body-copy')).toContainText('具体日常场景');pass(phase);

 phase='shared upgrades and a new customization append a method while retaining the original fixed version';let upgrade=await skills.clone(access,'copy',source.skillId,{sourceVersionId:source.id,expectedSkillRevision:(await skills.read(access,'copy',source.skillId)).revision,requestId:randomUUID()});
 upgrade=await skills.save(access,'copy',source.skillId,upgrade.id,{expectedRevision:upgrade.revision,manifest:{...upgrade.manifest,instructions:'新版基础：先具体观察，再提出开放问题，不作关系诊断。'},requestId:randomUUID()});
 upgrade=await skills.transition(access,'copy',source.skillId,upgrade.id,'review',{expectedRevision:upgrade.revision,requestId:randomUUID()});upgrade=await skills.transition(access,'copy',source.skillId,upgrade.id,'activate',{expectedRevision:upgrade.revision,requestId:randomUUID()});
 await page.getByRole('button',{name:'另存一版商品定制',exact:true}).click();await expect(page.getByRole('radio',{name:'选择具体而温柔的表达 v2',exact:true})).toBeVisible();await choose('具体而温柔的表达',2);await expect(page.getByLabel('商品补充说明',{exact:true})).toHaveValue(/具体日常场景/);await page.getByLabel('商品补充说明',{exact:true}).fill('这一版保留具体观察，用更短的开放问题结尾。');await review();await save();await fixed();assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),2);assert.equal(hash(await fixture.runtime.client.projectMethodSnapshot.findUniqueOrThrow({where:{id:first.id}})),firstHash);await screen('desktop-new-version');pass(phase);

 phase='an actual intermediate SQL insert failure rolls back and retries using the original capture request';await page.getByRole('button',{name:'另存一版商品定制',exact:true}).click();await page.getByLabel('商品补充说明',{exact:true}).fill('数据库失败重试的隔离方法要求。');await review();
 await fixture.owner.client.$executeRawUnsafe("CREATE FUNCTION orai.o2_browser_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated insertion fault'; END $$");await fixture.owner.client.$executeRawUnsafe('CREATE TRIGGER o2_browser_fault BEFORE INSERT ON orai.project_method_snapshots FOR EACH ROW EXECUTE FUNCTION orai.o2_browser_fault()');expectedFault=true;
 try{await save();await expect(page.getByRole('heading',{name:'保存结果待确认',exact:true})).toBeVisible();assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),2);await screen('desktop-insert-failure');}
 finally{await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER o2_browser_fault ON orai.project_method_snapshots');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.o2_browser_fault()');expectedFault=false;}
 await page.getByRole('button',{name:'核对保存结果',exact:true}).click();await fixed();assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),3);const faultRequests=requests.filter(r=>r.path.endsWith('/'+copy.id+'/methods')&&r.method==='POST').slice(-2);assert.equal(faultRequests[0].requestId,faultRequests[1].requestId);pass(phase);

 phase='source revision conflict preserves customization and requires fresh source review';await page.getByRole('button',{name:'另存一版商品定制',exact:true}).click();await page.getByRole('button',{name:'更换基础方法',exact:true}).click();await choose('本商品的轻问句',1);await page.getByLabel('商品补充说明',{exact:true}).fill('冲突时必须保留的商品定制。');await review();
 const draft=await skills.readVersion(access,'copy',projectCreated.skillId,projectCreated.versionId);await skills.save(access,'copy',draft.skillId,draft.id,{expectedRevision:draft.revision,manifest:{...draft.manifest,instructions:'已变更的候选基础方法。'},requestId:randomUUID()});
 await save();await expect(page.getByRole('alert')).toContainText('源 Skill 草稿已更新');assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),3);await screen('desktop-source-conflict');await page.getByRole('button',{name:'重新核对基础版本',exact:true}).click();await expect(page.getByLabel('商品补充说明',{exact:true})).toHaveValue('冲突时必须保留的商品定制。');await review();await expect(page.locator('.body-copy')).toContainText('已变更的候选基础方法');await save();await fixed();assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:copy.id}}),4);pass(phase);

 phase='handoff validates explicit inputs and the existing connection scope before allowing an export';const otherWorkspace=await methodProject(app,fixture,access);await page.locator('#pm-prepare-handoff').click();await page.getByRole('button',{name:'核对并整理制作说明',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('请选择当前管理员名下有效');await expect(page.getByRole('dialog')).toContainText('尚未选择并核验依赖');await screen('desktop-handoff-blocked');
 await page.getByLabel('选择制作连接',{exact:true}).selectOption(otherWorkspace.connection.id);await page.getByLabel('选择题目与报告记录',{exact:true}).selectOption(input.record.id);
 for(const q of input.questions.slice(0,2))await page.getByRole('checkbox',{name:'使用输入片段 '+q.text,exact:true}).check();
 await page.getByRole('button',{name:'核对并整理制作说明',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('机器凭据未获');await screen('desktop-handoff-wrong-workspace');await page.getByLabel('选择制作连接',{exact:true}).selectOption(c.connection.id);await page.getByRole('button',{name:'核对并整理制作说明',exact:true}).click();await expect(page.getByRole('heading',{name:'制作说明已整理',exact:true})).toBeVisible();await screen('desktop-handoff');pass(phase);

 phase='one explicit clipboard substitute receives a revalidated credential-free manifest';await page.getByRole('button',{name:'复制制作说明',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__o2Copies.length)).toBe(1);
 assert.equal(await page.evaluate(()=>{const value=JSON.parse(window.__o2Copies[0]),text=JSON.stringify(value);return value.manifest.inputs.length===2&&value.manifest.executionStarted===false&&value.manifest.credentialIncluded===false&&!['orai_mcp_','tokenDigest','storageKey','downloadPath'].some(k=>text.includes(k))&&localStorage.length+sessionStorage.length===0;}),true);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'导出固定清单',exact:true}).click()]);assert.equal(download.suggestedFilename(),'project-method-copy.json');const downloaded=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(downloaded.manifest.inputs.length,2);assert.equal(downloaded.manifest.credentialIncluded,false);
 const revokedPreview=c.connection.credentials.find(c=>c.domain==='copy');await app.get(require('./.test-build/src/operations/machine-credentials.service.js').MachineCredentialsService).revoke(access,revokedPreview.id,{requestId:randomUUID()});
 await page.getByRole('button',{name:'复制制作说明',exact:true}).click();await expect(page.getByRole('alert')).toContainText('交接条件已变化');assert.equal(await page.evaluate(()=>window.__o2Copies.length),1);await screen('desktop-export-revoked');await page.getByRole('button',{name:'返回方法',exact:true}).click();await page.evaluate(()=>window.__o2Copies=[]);pass(phase);

 phase='phone customization and confirmation use the same fixed-version rules and reachable consent';await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'另存一版商品定制',exact:true}).click();await page.getByLabel('商品补充说明',{exact:true}).fill('手机端明确保存的商品要求。');await screen('mobile-customization');await review();await consent().scrollIntoViewIfNeeded();await expect(consent()).toBeInViewport();await screen('mobile-confirm');await save();await fixed();await geometry();await screen('mobile-fixed-method');pass(phase);

 phase='phone handoff rechecks a replacement test connection and keeps cancellation focus and the operating scroll region';const connectionsService=app.get(CodexConnectionsService),connectionPlan={name:'隔离后续文案连接',workspace:{kind:'existing',id:c.connection.workspace.id},actions:{createProjects:false,useSkills:true,uploadDrafts:true},domains:[{domain:'copy',readSkills:true,uploadDrafts:true,skillIds:[]}],expiresAt:c.connection.expiresAt},checked=await connectionsService.preview(access,connectionPlan),replacement=await connectionsService.create(access,{plan:checked.plan,expectedDigest:checked.digest,confirmed:true,clientKey:randomUUID(),requestId:randomUUID()});
 await page.locator('#pm-prepare-handoff').click();if(await page.getByRole('button',{name:'返回核对范围',exact:true}).count())await page.getByRole('button',{name:'返回核对范围',exact:true}).click();await page.getByLabel('选择制作连接',{exact:true}).selectOption(replacement.connection.id);await page.getByRole('button',{name:'核对并整理制作说明',exact:true}).click();await expect(page.getByRole('heading',{name:'制作说明已整理',exact:true})).toBeVisible();await screen('mobile-handoff');await page.keyboard.press('Escape');await expect(page.locator('#pm-prepare-handoff')).toBeFocused();
 const top=await page.locator('.admin-topbar').evaluate(n=>n.getBoundingClientRect().y);await page.getByRole('region',{name:'运营后台',exact:true}).evaluate(n=>n.scrollTop=n.scrollHeight);assert.equal(await page.locator('.admin-topbar').evaluate(n=>n.getBoundingClientRect().y),top);assert.equal(await page.evaluate(()=>window.scrollY),0);await geometry();pass(phase);

 phase='the real module entry and unsaved tab or browser Back navigation preserve the method draft';await page.setViewportSize({width:1600,height:1100});await page.goto(base+'/admin/content/'+c.boot.productId+'?tab=project');await page.locator('.pw-directory-module').filter({hasText:'引流文案'}).click();await page.getByRole('button',{name:'选择或另存制作方法',exact:true}).click();await expect(page.getByRole('heading',{name:'为商品选好制作方法',exact:true})).toBeVisible();const savedLatest=await latest(copy.id);await page.locator('.technical').filter({hasText:'已固定的本用途方法'}).locator(':scope > summary').click();await page.getByLabel('交接使用方法 '+savedLatest.id,{exact:true}).check();await fixed();await page.getByRole('button',{name:'另存一版商品定制',exact:true}).click();await page.getByLabel('商品补充说明',{exact:true}).fill('浏览器返回时必须保留的商品定制。');const guardedUrl=page.url();await page.getByRole('button',{name:'创作设定',exact:true}).click();await expect(page.getByLabel('商品补充说明',{exact:true})).toHaveValue('浏览器返回时必须保留的商品定制。');await page.goBack();await expect(page).toHaveURL(guardedUrl);await expect(page.getByLabel('商品补充说明',{exact:true})).toHaveValue('浏览器返回时必须保留的商品定制。');await screen('desktop-unsaved-navigation');await page.getByRole('button',{name:'放弃未保存的方法设置',exact:true}).click();await page.getByRole('button',{name:'放弃并切换',exact:true}).click();await expect(page.getByRole('button',{name:'继续，补充商品要求',exact:true})).toBeDisabled();pass(phase);

 phase='ordinary accounts are denied and old plans remain read-only without altering fixed history';await page.setViewportSize({width:1600,height:1100});await app.get(ProductionPlansService).save(access,c.boot.productId,{plan:c.plan.plan,expectedRevision:c.plan.revision,requestId:randomUUID()});await page.goto(url+'&plan='+c.plan.id);await expect(page.getByText('历史计划和审核/运行视图只读。',{exact:false})).toBeVisible();await expect(page.locator('#pm-handoff-open')).toBeDisabled();await page.locator('.technical').filter({hasText:'已固定的本用途方法'}).locator(':scope > summary').click();await page.getByLabel('交接使用方法 '+first.id,{exact:true}).check();await fixed();await expect(page.getByRole('button',{name:'另存一版商品定制',exact:true})).toBeDisabled();await screen('desktop-historical');assert.equal(hash(await fixture.runtime.client.projectMethodSnapshot.findUniqueOrThrow({where:{id:first.id}})),firstHash);
 const ordinary=await browser.newContext();await forward(ordinary);await login(ordinary,false);const user=await ordinary.newPage();await user.goto(url);await expect(user.getByText('当前账户没有已验证的管理员权限。',{exact:true})).toBeVisible();await ordinary.close();pass(phase);

 assert.deepEqual(pageErrors,[]);assert.deepEqual(unexpectedHttp,[]);assert.deepEqual(forbiddenNetwork,[]);
 await writeFile(join(output,'verification.json'),JSON.stringify({passed:true,checks,screens,pageErrors,unexpectedHttp,forbiddenNetwork,
 authProvider:'SupabaseAuthGateway test substitute',existingRealAccountsUsed:false,realAccountConnectionValidated:false,isolatedBusinessDatabase:true,transparentApiForwarding:true,
 simulatedClipboard:true,actualBrowserDownloadValidated:true,systemClipboardWrites:0,clientConfigurationWrites:0,expectedDatabaseInsertFault:true,testReadWriteRateBudgets:3000,
 physicalDeviceValidated:false,modelCalls:0,actualContentProduction:false,productionCredentialsCreated:0,schedulesEnabled:false,published:false,formalUiApproval:'pending',migrations:25},null,2)+'\n');
 process.stdout.write(JSON.stringify({passed:true,checks:checks.length,screens:screens.length,identity:'isolated test substitute'})+'\n');
}catch(error){await writeFile(join(privateOutput,'browser-failure.json'),JSON.stringify({phase,message:String(error.message).slice(0,2500)})+'\n');await page?.screenshot({path:join(privateOutput,'browser-failure.png')}).catch(()=>{});throw new Error('O2 browser check failed at '+phase+'; see private sanitized failure record.');}
finally{closing=true;await browser?.close();await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});await rm(join(privateOutput,'browser-active.json'),{force:true});proofs.clear();refreshes.clear();}
