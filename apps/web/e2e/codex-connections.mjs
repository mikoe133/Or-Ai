import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {chromium,expect as expectBase} from 'playwright/test';

const root=fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(join(root,'apps/api/package.json')),
  {Test}=require('@nestjs/testing'),{AppModule}=require('./.test-build/src/app.module.js'),{APP_CONFIG}=require('./.test-build/src/config/configuration.js'),
  {configureApp}=require('./.test-build/src/common/configure-app.js'),{SupabaseAuthGateway}=require('./.test-build/src/accounts/supabase-auth.gateway.js'),
  {createLocalFixture}=require('./.test-build/test/local-fixture.js'),{DemoIdentityScenarios}=require('./.test-build/scripts/demo-fixtures.js'),
  {CatalogAdminAccessService}=require('./.test-build/src/catalog/admin-access.service.js'),{MachineProjectsService}=require('./.test-build/src/operations/machine-projects.service.js'),
  {SkillsService}=require('./.test-build/src/operations/skills.service.js'),{skillPurposes}=require('@orai/contracts/admin');
const base='http://127.0.0.1:5173',output=join(root,'output/design-review/codex-connections-o1-formal-20261022'),privateOutput=join(root,'.local/o1-implementation'),
  expect=expectBase.configure({timeout:15000}),proofs=new Map(),refreshes=new Map(),checks=[],screens=[],pageErrors=[],unexpectedHttp=[],forbiddenNetwork=[],requests=[];
let fixture,app,browser,directory,page,apiOrigin,phase='setup',closing=false,dropNextCreate=false,expectedFault=false;
await mkdir(output,{recursive:true});await mkdir(privateOutput,{recursive:true,mode:0o700});
async function screen(name){await page.screenshot({path:join(output,name+'.png'),animations:'disabled'});screens.push(name+'.png');}
const pass=name=>{checks.push(name);process.stdout.write('PASS '+name+'\n');};
async function forward(context){await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());
  if(url.origin!==base){if(['http:','https:'].includes(url.protocol)){forbiddenNetwork.push(url.origin);await route.abort();return;}await route.continue();return;}
  if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  try{const response=await route.fetch({url:apiOrigin+url.pathname+url.search,maxRetries:0,maxRedirects:0});
    const item={path:url.pathname,method:request.method(),status:response.status()};requests.push(item);
    if(response.status()>=500&&!expectedFault)unexpectedHttp.push(item);
    if(request.method()==='POST'&&url.pathname==='/api/admin/codex-connections'){
      const body=request.postDataJSON();item.requestId=body.requestId;item.clientKey=body.clientKey;
      if(dropNextCreate&&response.status()===200){dropNextCreate=false;await route.abort('failed');return;}
    }
    await route.fulfill({response});
  }catch{if(!closing)unexpectedHttp.push({path:url.pathname,method:request.method(),status:0});await route.abort('failed').catch(()=>{});}
});}
async function login(context,operator=true){
  const accessToken=randomBytes(50).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');
  proofs.set(accessToken,{supabaseUserId:operator?DemoIdentityScenarios.admin.supabaseUserId:randomUUID(),supabaseSessionId:randomUUID(),emailVerified:true,expiresAt:new Date(Date.now()+3600_000)});
  refreshes.set(refreshToken,{accessToken,refreshToken});
  const ctx=await context.request.get(apiOrigin+'/api/account/context',{headers:{origin:base}}),csrf=(await ctx.json()).csrfToken;
  const signed=await context.request.post(apiOrigin+'/api/account/session',{headers:{origin:base,'x-csrf-token':csrf},data:{accessToken,refreshToken}});assert.equal(signed.status(),200);
}
const connect=()=>page.getByRole('button',{name:'连接我的 Codex',exact:true}),modal=()=>page.getByRole('dialog'),summary=()=>page.getByRole('complementary',{name:'连接权限摘要'});
async function choose(){for(const name of ['创建商品项目','使用允许的 Skill','上传商品草稿'])await page.getByLabel(name,{exact:true}).check();}
async function advanced(){const details=page.locator('.codex-connections .advanced');if(!await details.evaluate(n=>n.open))await details.locator(':scope > summary').click();}
async function prepare(){await connect().click();await expect(page.getByRole('heading',{name:'确认连接范围',exact:true})).toBeVisible();}
async function consent(){await page.getByLabel('我允许按上方范围建立连接',{exact:true}).check();await modal().getByRole('button',{name:'确认连接',exact:true}).click();}
async function latest(){return fixture.runtime.client.codexConnection.findFirstOrThrow({orderBy:{createdAt:'desc'}});}
async function geometry(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
try{
  process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-codex-o1-'));
  await writeFile(join(privateOutput,'browser-active.json'),JSON.stringify({pid:process.pid,database:fixture.name,directory,temporary:true})+'\n',{mode:0o600});
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,
    assets:{...fixture.configuration.assets,driver:'local',directory},security:{...fixture.configuration.security,origins:[base],readIpLimit:3000,writeIpLimit:3000},
    auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000},
  }).overrideProvider(SupabaseAuthGateway).useValue({verify:async token=>{assert.ok(proofs.has(token));return proofs.get(token);},refresh:async token=>{const value=refreshes.get(token);assert.ok(value);return {...value,identity:proofs.get(value.accessToken)};},logout:async()=>undefined}).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');apiOrigin=await app.getUrl();
  const access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
  const copySkill=await app.get(SkillsService).create(access,'copy',{slug:'o1-copy-'+randomUUID().slice(0,8),requestId:randomUUID(),manifest:{schemaVersion:1,domain:'copy',name:'O1隔离文案方法',description:'隔离接口验证样例',purposes:skillPurposes.copy,
    styles:['紫色'],supportedForms:['web'],inputs:[{key:'creative-profile',description:'共同创作设定',required:true}],outputs:[{key:'copy',description:'文案'}],instructions:'用具体观察表达理解；只用于测试保存和权限。',examples:[],references:[]}});
  browser=await chromium.launch({headless:true,executablePath:process.env.ORAI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context=await browser.newContext({viewport:{width:1600,height:1100},timezoneId:'Asia/Shanghai',reducedMotion:'reduce'});await forward(context);
  await context.addInitScript(()=>{window.__cxCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__cxCopies.push(value);}}});});
  await login(context);page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));

  phase='isolated identity substitute and default-deny formal entry';await page.goto(base+'/admin/machine');await expect(page.getByRole('heading',{name:'连接我的 Codex',exact:true})).toBeVisible();await expect(connect()).toBeDisabled();
  for(const name of ['创建商品项目','使用允许的 Skill','上传商品草稿'])await expect(page.getByLabel(name,{exact:true})).not.toBeChecked();
  assert.equal(await page.locator('.advanced').evaluate(n=>n.open),false);assert.equal(await fixture.runtime.client.codexConnection.count(),0);await geometry();await screen('desktop-first-connect');pass(phase);

  phase='advanced metadata uses real isolated categories, Skill choices and live summaries without granting operations';await advanced();await page.getByLabel('最多新建商品数',{exact:true}).fill('6');await page.getByLabel('每商品方法上限',{exact:true}).fill('5');
  await page.locator('.cx-skill-choices').filter({hasText:'引流文案 · 已选'}).locator(':scope > summary').click();await page.getByLabel('允许共享 Skill O1隔离文案方法',{exact:true}).check();await expect(connect()).toBeDisabled();await expect(summary()).toContainText('尚未允许读取 Skill');await choose();
  await expect(summary()).toContainText('O1隔离文案方法');await expect(summary()).toContainText('最多新建 6 个商品');await expect(summary()).toContainText('5 个方法');await page.getByLabel('宣传视频',{exact:true}).uncheck();await expect(summary()).not.toContainText('宣传视频');await expect(summary()).toContainText('3 个领域分别授权');await screen('desktop-advanced');pass(phase);

  phase='authoritative preview, explicit consent, cancel and keyboard focus preserve a non-created draft';await page.locator('.advanced > summary').click();await connect().scrollIntoViewIfNeeded();await screen('desktop-ready');await prepare();await expect(modal().getByRole('button',{name:'确认连接',exact:true})).toBeDisabled();await expect(modal()).toContainText('O1隔离文案方法');await expect(modal()).toContainText('最多新建 6 个商品');assert.equal(await fixture.runtime.client.codexConnection.count(),0);await screen('desktop-confirm');await modal().getByRole('button',{name:'返回修改',exact:true}).click();await expect(connect()).toBeFocused();await prepare();await page.keyboard.press('Escape');await expect(connect()).toBeFocused();assert.equal(await fixture.runtime.client.codexConnection.count(),0);pass(phase);

  phase='lost successful response is recovered with the identical request and no duplicate or recoverable secret';await prepare();dropNextCreate=true;await consent();await expect(page.getByRole('heading',{name:'保存结果待确认',exact:true})).toBeVisible();assert.equal(await fixture.runtime.client.codexConnection.count(),1);assert.equal(await fixture.runtime.client.machineCredential.count({where:{codexConnectionId:{not:null}}}),3);
  await modal().getByRole('button',{name:'稍后核对',exact:true}).click();await expect(page.getByLabel('创建商品项目',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'确认保存结果',exact:true}).click();await expect(page.getByRole('heading',{name:'我的 Codex 连接',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'复制连接说明',exact:true})).toBeDisabled();
  const creates=requests.filter(r=>r.method==='POST'&&r.path==='/api/admin/codex-connections');assert.equal(creates.length,2);assert.equal(creates[0].requestId,creates[1].requestId);assert.equal(creates[0].clientKey,creates[1].clientKey);assert.equal(await fixture.runtime.client.codexConnection.count(),1);await screen('desktop-recovered');pass(phase);

  phase='whole-connection revocation cancels cleanly then revokes all its domains while retaining history';await page.getByRole('button',{name:'撤销连接',exact:true}).click();await modal().getByRole('button',{name:'保留连接',exact:true}).click();assert.equal((await latest()).revokedAt,null);await page.getByRole('button',{name:'撤销连接',exact:true}).click();await screen('desktop-revoke-confirm');await modal().getByRole('button',{name:'确认撤销',exact:true}).click();await expect(page.getByText('已撤销',{exact:true})).toBeVisible();const old=await latest();assert.notEqual(old.revokedAt,null);assert.equal(await fixture.runtime.client.machineCredential.count({where:{codexConnectionId:old.id,revokedAt:null}}),0);await screen('desktop-revoked');await page.getByRole('button',{name:'重新设置连接',exact:true}).click();await expect(connect()).toBeDisabled();pass(phase);

  phase='a genuine intermediate INSERT failure shows a failed save and retries without a partial connection';await choose();await prepare();const before=await fixture.runtime.client.codexConnection.count(),workspaceBefore=await fixture.runtime.client.machineProjectWorkspace.count();
  await fixture.owner.client.$executeRawUnsafe("CREATE FUNCTION orai.o1_browser_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.codex_connection_id IS NOT NULL AND NEW.domain='video' THEN RAISE EXCEPTION 'isolated browser insertion fault'; END IF; RETURN NEW; END $$");await fixture.owner.client.$executeRawUnsafe('CREATE TRIGGER o1_browser_fault BEFORE INSERT ON orai.machine_credentials FOR EACH ROW EXECUTE FUNCTION orai.o1_browser_fault()');expectedFault=true;
  try{await consent();await expect(modal().getByRole('alert')).toBeVisible();assert.equal(await fixture.runtime.client.codexConnection.count(),before);assert.equal(await fixture.runtime.client.machineProjectWorkspace.count(),workspaceBefore);await screen('desktop-save-failure');}
  finally{await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER o1_browser_fault ON orai.machine_credentials');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.o1_browser_fault()');expectedFault=false;}
  await modal().getByRole('button',{name:'确认保存结果',exact:true}).click();await expect(page.getByRole('heading',{name:'我的 Codex 连接',exact:true})).toBeVisible();assert.equal(await fixture.runtime.client.codexConnection.count(),before+1);await expect(page.getByRole('button',{name:'复制连接说明',exact:true})).toBeEnabled();await screen('desktop-authorized');pass(phase);

  phase='one-time copy is a clipboard test substitute and secrets do not appear in DOM, URL, storage or metadata';await page.getByRole('button',{name:'复制连接说明',exact:true}).click();await expect(page.getByRole('heading',{name:'连接说明预览',exact:true})).toBeVisible();await screen('desktop-handoff');await modal().getByRole('button',{name:'复制连接说明',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__cxCopies.length)).toBe(1);
  assert.equal(await page.evaluate(()=>{const data=JSON.parse(window.__cxCopies.at(-1));const text=document.body.innerText+location.href+JSON.stringify({...localStorage,...sessionStorage});return data.domains.length===4&&data.domains.every(d=>/^orai_mcp_[A-Za-z0-9_-]{43}$/.test(d.env.ORAI_MCP_TOKEN)&&!text.includes(d.env.ORAI_MCP_TOKEN))&&data.canReview===false&&data.canPublish===false;}),true);
  const current=await latest();assert.equal((await fixture.runtime.client.codexConnection.findUniqueOrThrow({where:{id:current.id}})).document.summary.sharedSkills.length,0);await page.evaluate(()=>window.__cxCopies=[]);await modal().getByRole('button',{name:'关闭',exact:true}).click();await page.getByRole('button',{name:'已保存，隐藏凭据',exact:true}).click();await expect(page.getByRole('button',{name:'复制连接说明',exact:true})).toBeDisabled();await page.reload();await expect(page.getByRole('button',{name:'复制连接说明',exact:true})).toBeDisabled();pass(phase);

  phase='workspace revocation is inherited by the formal status and individual credential metadata';await app.get(MachineProjectsService).revokeWorkspace(access,current.workspaceId,{requestId:randomUUID()});await page.reload();await expect(page.getByText('连接已停用',{exact:true})).toBeVisible();await expect(page.getByText(/所属工作区已撤销/)).toBeVisible();await screen('desktop-workspace-disabled');pass(phase);

  phase='mobile consent, cancel and actual isolated save use the same form and bounded summary';await page.getByRole('button',{name:'设置另一份连接',exact:true}).click();await page.setViewportSize({width:390,height:844});await choose();await advanced();await page.getByLabel('最多新建商品数',{exact:true}).fill('7');await page.getByLabel('每商品方法上限',{exact:true}).fill('6');await page.locator('.advanced > summary').click();await screen('mobile-ready');await prepare();await expect(modal()).toContainText('最多新建 7 个商品');await expect(modal()).toContainText('6 个方法');await expect(modal().getByRole('button',{name:'确认连接',exact:true})).toBeInViewport();await screen('mobile-confirm');await modal().getByRole('button',{name:'返回修改',exact:true}).click();await expect(connect()).toBeFocused();await prepare();await consent();await expect(page.getByRole('heading',{name:'我的 Codex 连接',exact:true})).toBeVisible();await geometry();await screen('mobile-authorized');pass(phase);

  phase='phone revocation, keyboard focus and operating-region scrolling preserve fixed navigation';const top=await page.locator('.admin-topbar').evaluate(n=>n.getBoundingClientRect().y);await page.getByRole('button',{name:'撤销连接',exact:true}).click();await screen('mobile-revoke-confirm');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'撤销连接',exact:true})).toBeFocused();await page.getByRole('button',{name:'撤销连接',exact:true}).click();await modal().getByRole('button',{name:'确认撤销',exact:true}).click();await expect(page.getByText('已撤销',{exact:true})).toBeVisible();await page.getByRole('region',{name:'运营后台',exact:true}).evaluate(n=>n.scrollTop=n.scrollHeight);assert.equal(await page.locator('.admin-topbar').evaluate(n=>n.getBoundingClientRect().y),top);assert.equal(await page.evaluate(()=>window.scrollY),0);await screen('mobile-revoked');pass(phase);

  phase='legacy single-domain management remains available and ordinary test users remain denied';await page.setViewportSize({width:1600,height:1100});await page.goto(base+'/admin/machine?view=legacy');await expect(page.getByRole('button',{name:'创建连接',exact:true})).toBeVisible();await page.getByRole('button',{name:'创建连接',exact:true}).click();await expect(page.getByLabel('连接领域',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'签发连接凭据',exact:true})).toBeDisabled();await screen('desktop-legacy');
  const ordinary=await browser.newContext();await forward(ordinary);await login(ordinary,false);const user=await ordinary.newPage();await user.goto(base+'/admin/machine');await expect(user.getByText('当前账户没有已验证的管理员权限。',{exact:true})).toBeVisible();assert.equal((await ordinary.request.get(apiOrigin+'/api/admin/codex-connections',{headers:{origin:base}})).status(),403);await ordinary.close();pass(phase);

  assert.deepEqual(pageErrors,[]);assert.deepEqual(unexpectedHttp,[]);assert.deepEqual(forbiddenNetwork,[]);
  await writeFile(join(output,'verification.json'),JSON.stringify({passed:true,checks,screens,pageErrors,unexpectedHttp,forbiddenNetwork,
    authProvider:'SupabaseAuthGateway test substitute',existingRealAccountsUsed:false,realAccountConnectionValidated:false,
    isolatedBusinessDatabase:true,transparentApiForwarding:true,simulatedClipboard:true,systemClipboardWrites:0,clientConfigurationWrites:0,
    expectedDatabaseInsertFault:true,testReadWriteRateBudgets:3000,physicalDeviceValidated:false,modelCalls:0,mediaGenerated:false,productionCredentialsCreated:0,
    schedulesEnabled:false,published:false,formalUiApproval:'pending',migrations:25},null,2)+'\n');
  process.stdout.write(JSON.stringify({passed:true,checks:checks.length,screens:screens.length,identity:'isolated test substitute'})+'\n');
}catch(error){await writeFile(join(privateOutput,'browser-failure.json'),JSON.stringify({phase,message:String(error.message).slice(0,1800)})+'\n');throw new Error('O1 browser check failed at '+phase+'; see private sanitized failure record.');}
finally{closing=true;await browser?.close();await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});await rm(join(privateOutput,'browser-active.json'),{force:true});proofs.clear();refreshes.clear();}
