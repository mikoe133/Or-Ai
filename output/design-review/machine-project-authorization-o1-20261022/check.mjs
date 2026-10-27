import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from 'playwright/test';

const output=fileURLToPath(new URL('.',import.meta.url)),root=fileURLToPath(new URL('../../../',import.meta.url));
const sourcePaths=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','apps','packages','scripts','prd','README.md','PRODUCT.md','package.json','pnpm-lock.yaml','.nvmrc'],{cwd:root,encoding:'utf8'}).trim().split('\n'))].sort();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function digests(){return Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,hash(await readFile(join(root,p)))])));}
const before=await digests(),checks=[],screens=[],pageErrors=[],network=[];
const history=JSON.parse(await readFile(join(output,'history/r1-workspace-first/archive.json'),'utf8'));
for(const [file,digest] of Object.entries(history.sha256))assert.equal(hash(await readFile(join(output,'history/r1-workspace-first',file))),digest,file);
const browser=await chromium.launch({headless:true,executablePath:process.env.ORAI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const context=await browser.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce',timezoneId:'Asia/Shanghai'});
 context.on('request',r=>{if(/^https?:/.test(r.url()))network.push({url:r.url(),method:r.method()});});
 await context.route(/^https?:/,route=>route.abort());
 await context.addInitScript(()=>{window.__clipboardWrites=0;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{window.__clipboardWrites++;throw new Error('Prototype must not write clipboard');}}});});
 const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
 const url=pathToFileURL(join(output,'index.html')).href;
 const pass=name=>checks.push(name),connect=()=>page.getByRole('button',{name:'连接我的 Codex',exact:true}),modal=()=>page.getByRole('dialog');
 const live=()=>page.locator('#live-summary'),action=name=>page.locator('#setup [name=action][value="'+name+'"]');
 const domain=name=>page.locator('#setup [name=domain][value="'+name+'"]');
 async function screen(name){await page.screenshot({path:join(output,'r2-'+name+'.png'),animations:'disabled'});screens.push('r2-'+name+'.png');}
 async function open(scene='setup'){await page.goto(url+'?scene='+scene);await expect(page.locator('h1')).toBeVisible();}
 async function advanced(){if(!await page.locator('#advanced').evaluate(n=>n.open))await page.locator('#advanced>summary').click();}
 async function width(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.work').scrollWidth<=document.querySelector('.work').clientWidth+1),true);}
 async function allActions(){for(const key of ['create','skills','upload'])await action(key).check();}
 async function review(){await connect().click();await expect(modal()).toBeVisible();await expect(page.getByRole('heading',{name:'确认连接范围',exact:true})).toBeVisible();}
 async function confirm(){await page.locator('#consent').check();await page.getByRole('button',{name:'确认连接（演示）',exact:true}).click();await expect(page.getByRole('heading',{name:'我的 Codex 连接',exact:true})).toBeVisible();}

 await open();await expect(page.getByRole('heading',{name:'连接我的 Codex',exact:true})).toBeVisible();assert.equal(await page.locator('.nav-item[aria-current=page]').count(),1);await expect(connect()).toBeDisabled();for(const key of ['create','skills','upload'])await expect(action(key)).not.toBeChecked();assert.equal(await page.locator('#advanced').evaluate(n=>n.open),false);await expect(live()).toContainText('尚未允许任何操作');await width();await screen('desktop-start');
 pass('business-first entry defaults to no allowed actions and keeps technical settings collapsed');

 await action('upload').check();await connect().click();await expect(page.getByRole('alert')).toContainText('同时允许使用 Skill');await expect(action('skills')).not.toBeChecked();assert.equal(await page.evaluate(()=>active),null);
 pass('selecting upload never silently grants Skill access; missing prerequisite requires explicit selection');
 await action('skills').check();await action('create').check();await expect(page.getByRole('alert')).not.toBeVisible();await expect(live()).toContainText('不能审核或上架');await expect(live()).toContainText('个人报告');await expect(live()).toContainText('共享库：尚未授权');await expect(live()).toContainText('最多新建 12 个商品');await expect(live()).toContainText('4 个领域分别授权');await screen('desktop-ready');
 pass('always-visible summary exposes actions, isolated content domains, product/Skill scope, limits, expiry and excluded operations');

 await advanced();await page.getByLabel('最多新建商品数',{exact:true}).fill('6');await page.getByLabel('每商品方法上限',{exact:true}).fill('5');await page.getByLabel('每商品制作批次上限',{exact:true}).fill('9');await page.getByLabel('连接到期时间',{exact:true}).fill('2026-10-28T16:30');await expect(live()).toContainText('最多新建 6 个商品');await expect(live()).toContainText('5 个方法 / 9 次制作批次');await expect(live()).toContainText('2026/10/28 16:30');
 pass('advanced quota and expiry edits update the same summary before confirmation');
 await page.locator('[name=shared-skill][value=dialogue]').check();await page.locator('[name=shared-skill][value=copy]').check();await expect(live()).toContainText('温和对话、清晰表达');
 pass('shared Skill access is opt-in and named explicitly in the summary');
 await domain('video').uncheck();await expect(domain('video')).toBeFocused();await expect(live()).not.toContainText('宣传视频');await expect(live()).toContainText('3 个领域分别授权');await expect(page.locator('[name=domain-skill][value=video]')).toBeDisabled();
 await page.locator('[name=domain-upload][value=copy]').uncheck();assert.equal(await page.locator('[data-summary=actions]').innerText().then(t=>t.split('上传 ')[1].includes('引流文案')),false);
 const grants=await page.evaluate(()=>permissions(draft));assert.equal(grants.some(r=>r.domain==='video'),false);for(const row of grants){assert.equal(row.grants.includes('skills:write'),false);if(row.domain!=='assessment')assert.equal(row.grants.some(g=>['projects:create','projects:write'].includes(g)),false);}
 pass('per-domain restrictions reduce both summary and exact grants; project creation stays assessment-only and shared-library editing is absent');
 await screen('desktop-advanced');await page.getByLabel('连接到期时间',{exact:true}).scrollIntoViewIfNeeded();await screen('desktop-advanced-limits');

 await page.locator('#advanced>summary').click();await expect(live()).toContainText('最多新建 6 个商品');await expect(live()).toContainText('温和对话、清晰表达');await review();await expect(page.locator('#confirm-connect')).toBeDisabled();await expect(page.locator('#consent')).not.toBeChecked();await expect(modal()).toContainText('最多新建 6 个商品');await expect(modal()).toContainText('3 个领域分别授权');await expect(modal()).toContainText('温和对话、清晰表达');await expect(modal()).toContainText('2026/10/28 16:30');await screen('desktop-confirm');
 pass('collapsed settings and confirmation show the same selected scope, and confirmation requires fresh explicit consent');
 await page.getByRole('button',{name:'返回修改',exact:true}).click();await expect(modal()).not.toBeVisible();await expect(connect()).toBeFocused();await expect(live()).toContainText('最多新建 6 个商品');assert.equal(await page.evaluate(()=>active),null);await review();await page.keyboard.press('Escape');await expect(modal()).not.toBeVisible();await expect(connect()).toBeFocused();assert.equal(await page.evaluate(()=>active),null);
 pass('return and Escape cancel without establishing a connection, preserve edits and restore focus');
 await review();await confirm();await expect(page.getByText('后续商品沿用这份连接范围。你可以随时查看权限或撤销访问，不用每做一款商品重新配置。',{exact:true})).toBeVisible();await expect(live()).toContainText('最多新建 6 个商品');await screen('desktop-connected');
 pass('confirmed in-memory plan is reused for later products and keeps its exact restrictions');
 await page.getByRole('button',{name:'复制连接说明（演示）',exact:true}).click();await expect(modal()).toContainText('设计示例，不可用于真实接入');await expect(modal()).toContainText('本页没有真实密钥');await expect(modal()).not.toContainText('宣传视频');await screen('desktop-copy-preview');await page.getByRole('button',{name:'复制说明（演示）',exact:true}).click();assert.equal(await page.evaluate(()=>window.__clipboardWrites),0);await expect(page.getByRole('status')).toContainText('没有写入剪贴板');await page.getByRole('button',{name:'关闭',exact:true}).click();
 pass('copy and client handoff stay an explicitly labelled memory-only simulation with no clipboard/configuration writes');
 const revoke=()=>page.getByRole('button',{name:'撤销连接',exact:true});await revoke().click();await expect(modal()).toContainText('不代表已停止第三方');await screen('desktop-revoke-confirm');await page.getByRole('button',{name:'保留连接',exact:true}).click();await expect(revoke()).toBeFocused();await expect(page.getByRole('heading',{name:'我的 Codex 连接',exact:true})).toBeVisible();await revoke().click();await page.keyboard.press('Escape');await expect(revoke()).toBeFocused();await revoke().click();await page.getByRole('button',{name:'确认撤销（演示）',exact:true}).click();await expect(page.getByRole('heading',{name:'连接已撤销',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'复制连接说明',exact:true})).toBeDisabled();await screen('desktop-revoked');await page.getByRole('button',{name:'重新设置连接',exact:true}).click();await expect(connect()).toBeDisabled();for(const key of ['create','skills','upload'])await expect(action(key)).not.toBeChecked();
 pass('revocation supports cancel/Escape, preserves the plan as history, disables handoff, and requires new explicit actions to reconnect');

 await open();await advanced();await page.getByLabel('最多新建商品数',{exact:true}).fill('4');await page.getByLabel('连接到期时间',{exact:true}).fill('2026-10-28T10:00');assert.equal(await page.locator('[name=action]:checked').count(),0);await expect(connect()).toBeDisabled();
 pass('editing advanced settings alone cannot grant or enable any top-level operation');
 await allActions();await page.getByLabel('项目归组',{exact:true}).selectOption('existing');await expect(page.getByLabel('项目归组',{exact:true})).toBeFocused();await expect(live()).toContainText('已有的 3 个商品');await expect(live()).toContainText('最多再建 9 个商品');await expect(page.getByLabel('最多新建商品数',{exact:true})).toBeDisabled();assert.equal(await page.getByLabel('项目归组',{exact:true}).locator('option:disabled').count(),2);await page.locator('#advanced>summary').click();await review();await expect(modal()).toContainText('已有的 3 个商品');await page.getByRole('button',{name:'返回修改',exact:true}).click();
 pass('existing workspace access is explicit even with advanced settings closed; immutable limits and invalid workspace choices stay constrained');
 await advanced();await page.getByLabel('连接到期时间',{exact:true}).fill('2026-11-01T18:00');await connect().click();await expect(page.getByRole('alert')).toContainText('不能晚于');assert.equal(await page.evaluate(()=>active),null);
 pass('a connection cannot outlive an existing workspace');

 await open();await allActions();await advanced();for(const c of await page.locator('[name=category]').all())await c.uncheck();await connect().click();await expect(page.getByRole('alert')).toContainText('至少保留一种');await page.locator('[name=category]').first().check();await page.getByLabel('最多新建商品数',{exact:true}).fill('0');await connect().click();await expect(page.getByRole('alert')).toContainText('1–100');await page.getByLabel('最多新建商品数',{exact:true}).fill('12');await page.getByLabel('连接到期时间',{exact:true}).fill('2027-10-29T18:00');await connect().click();await expect(page.getByRole('alert')).toContainText('90 天');await page.getByLabel('连接到期时间',{exact:true}).fill('2026-10-29T18:00');await domain('assessment').uncheck();await connect().click();await expect(page.getByRole('alert')).toContainText('需要保留');assert.equal(await page.evaluate(()=>active),null);
 pass('category, quota, expiry and assessment prerequisites block confirmation without silently altering permissions');
 await open('expired');await expect(page.getByRole('heading',{name:'连接已到期',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'复制连接说明',exact:true})).toBeDisabled();await screen('desktop-expired');
 pass('expired connections have no active handoff and retain their historical scope');

 await page.setViewportSize({width:390,height:844});await open();await width();await screen('mobile-start');await allActions();await width();await screen('mobile-ready');await page.locator('.summary').scrollIntoViewIfNeeded();await connect().scrollIntoViewIfNeeded();const connectBox=await connect().boundingBox();assert.ok(connectBox.y>=52&&connectBox.y+connectBox.height<=844);await screen('mobile-summary');
 pass('mobile business flow exposes the full scope before its connect action, without horizontal overflow');
 await advanced();await page.locator('.domain-table').scrollIntoViewIfNeeded();await width();await screen('mobile-advanced');await page.getByLabel('最多新建商品数',{exact:true}).fill('7');await page.getByLabel('每商品方法上限',{exact:true}).fill('6');await page.getByLabel('连接到期时间',{exact:true}).fill('2026-10-28T18:00');await page.locator('#advanced>summary').click();await page.locator('.summary').scrollIntoViewIfNeeded();await expect(live()).toContainText('最多新建 7 个商品');await expect(live()).toContainText('6 个方法');await connect().scrollIntoViewIfNeeded();await screen('mobile-summary-custom');await review();await expect(page.locator('#consent')).toBeInViewport();await expect(page.locator('#confirm-connect')).toBeInViewport();await expect(modal()).toContainText('最多新建 7 个商品');await width();await screen('mobile-confirm');
 pass('mobile advanced changes propagate to summary and review while explicit consent/footer controls remain reachable');
 await page.getByRole('button',{name:'返回修改',exact:true}).click();await review();await confirm();await screen('mobile-connected');await revoke().click();await expect(page.locator('#confirm-revoke')).toBeInViewport();await screen('mobile-revoke-confirm');await page.getByRole('button',{name:'保留连接',exact:true}).click();await revoke().click();await page.getByRole('button',{name:'确认撤销（演示）',exact:true}).click();await screen('mobile-revoked');await open('expired');await screen('mobile-expired');
 pass('mobile connect/cancel and revoke/cancel/confirm use the same states and limits as desktop');
 await page.setViewportSize({width:360,height:780});for(const variant of ['setup','advanced','active','revoked']){await open(variant);await width();}await open('setup');await allActions();const y=await page.locator('.topbar').evaluate(n=>n.getBoundingClientRect().y);await page.locator('.work').evaluate(n=>n.scrollTop=n.scrollHeight);assert.equal(await page.evaluate(()=>window.scrollY),0);assert.equal(await page.locator('.topbar').evaluate(n=>n.getBoundingClientRect().y),y);await review();await expect(page.locator('#consent')).toBeInViewport();await expect(page.locator('#confirm-connect')).toBeInViewport();await page.keyboard.press('Escape');await expect(connect()).toBeFocused();
 pass('360px keyboard/mobile layout keeps the operating region scrollable, topbar fixed and modal controls accessible');

 assert.deepEqual(await digests(),before);assert.deepEqual(network,[]);assert.deepEqual(pageErrors,[]);assert.equal(await page.evaluate(()=>window.__clipboardWrites),0);
 for(const [file,digest] of Object.entries(history.sha256))assert.equal(hash(await readFile(join(output,'history/r1-workspace-first',file))),digest,file);
 pass('prior design and all formal source/docs/dependencies remain unchanged; zero HTTP requests, page errors, business writes or credentials');
 const imageSha256=Object.fromEntries(await Promise.all(screens.map(async file=>[file,hash(await readFile(join(output,file)))])));
 const result={kind:'o1_r2_connect_my_codex_design',revision:2,passed:true,checks,screens,imageSha256,
  uiApproval:'pending',simplificationDirectionApproved:true,oldDesignApproved:false,oldDesignFilesPreserved:Object.keys(history.sha256).length,
  formalSourceFilesPreserved:sourcePaths.filter(p=>p.startsWith('apps/')||p.startsWith('packages/')||p.startsWith('scripts/')||['package.json','pnpm-lock.yaml'].includes(p)).length,
  sourceAndDocumentationFilesPreserved:sourcePaths.length,httpRequests:network,pageErrors,businessWrites:0,credentialsIssued:0,clipboardWrites:0,clientConfigurationWrites:0,
  realAuthValidated:false,backendIntegrationValidated:false,physicalDeviceValidated:false,modelCalls:0,schedulesEnabled:0,cloudResourcesCreated:0,published:false};
 await writeFile(join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,screens:screens.length,preserved:sourcePaths.length,oldDesignFiles:Object.keys(history.sha256).length}));
}finally{await browser.close();}
