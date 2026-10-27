import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {mkdir, mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {chromium, expect as baseExpect} from 'playwright/test';
import {authProtocolFixture} from './auth-protocol-fixture.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const apiRequire=createRequire(join(root,'apps/api/package.json')),webRequire=createRequire(join(root,'apps/web/package.json'));
const {Test}=apiRequire('@nestjs/testing');
const {AppModule}=apiRequire('./.test-build/src/app.module.js');
const {APP_CONFIG}=apiRequire('./.test-build/src/config/configuration.js');
const {configureApp}=apiRequire('./.test-build/src/common/configure-app.js');
const {SupabaseAuthGateway}=apiRequire('./.test-build/src/accounts/supabase-auth.gateway.js');
const {createLocalFixture}=apiRequire('./.test-build/test/local-fixture.js');
const {demoId,DemoIdentityScenarios}=apiRequire('./.test-build/scripts/demo-fixtures.js');
const port=Number(process.env.ORAI_LOCAL_UI_PORT||5183),base='http://127.0.0.1:'+port;
const output=join(root,'output/implementation/t10-local-20261023'),privateOutput=join(root,'.local/t10-local-ui');
const expect=baseExpect.configure({timeout:12000});
const checks=[],screens=[],errors=[],external=[];
let fixture,app,vite,alternateVite,browser,directory,authProtocol,page,phase='setup';
function monitor(p){p.on('pageerror',e=>errors.push(e.message));p.on('request',req=>{if(!['127.0.0.1','localhost'].includes(new URL(req.url()).hostname))external.push(new URL(req.url()).origin);});}
const pass=label=>{checks.push(label);console.log('PASS '+label);};
async function screenshot(name){
 await page.evaluate(async()=>{await document.fonts.ready;});
 await page.screenshot({path:join(output,name+'.png'),fullPage:true});
 screens.push(name+'.png');
}
async function fits(){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Document must fit viewport');
 assert.equal(await page.locator('.consumer-view').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true,'Consumer content must fit viewport');
}
try{
 await mkdir(output,{recursive:true});await mkdir(privateOutput,{recursive:true});
 process.env.WEB_PORT=String(port);process.env.APP_PUBLIC_ORIGIN=base;
 process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t10');
 directory=await mkdtemp(join(tmpdir(),'orai-t10-ui-'));
 authProtocol=await authProtocolFixture({origin:base,actors:DemoIdentityScenarios});
 await writeFile(join(privateOutput,'browser-active.json'),JSON.stringify({pid:process.pid,database:fixture.name,directory,temporary:true})+'\n',{mode:0o600});
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({
  ...fixture.configuration,assets:{...fixture.configuration.assets,directory},
  security:{...fixture.configuration.security,origins:[base],readIpLimit:3000,writeIpLimit:3000,claimIpLimit:1000},
  auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000}
 }).overrideProvider(SupabaseAuthGateway).useValue(authProtocol.gateway).compile();
 app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');
 process.env.VITE_SUPABASE_URL=authProtocol.url;process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_'+'p'.repeat(40);process.env.VITE_APP_PUBLIC_ORIGIN=base;
 const {createServer}=await import(pathToFileURL(webRequire.resolve('vite')).href);
 process.chdir(join(root,'apps/web'));
 vite=await createServer({root:join(root,'apps/web'),configFile:join(root,'apps/web/vite.config.ts'),server:{host:'127.0.0.1',port,strictPort:true,proxy:{'/api':await app.getUrl(),'/health':await app.getUrl()}}});
 await vite.listen();
 browser=await chromium.launch({headless:true,...(process.env.ORAI_BROWSER_PATH?{executablePath:process.env.ORAI_BROWSER_PATH}:process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
 const context=await browser.newContext({baseURL:base,viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 context.on('page',monitor);
 page=await context.newPage();
 phase='dynamic product details use the live public response and preserve missing cover';
 const product=await (await context.request.get(base+'/api/products/demo-partner')).json();
 await page.goto('/products/demo-partner');
 await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
 await expect(page.getByText(product.hook,{exact:true})).toBeVisible();
 await expect(page.getByText(product.purchaseNotice,{exact:true})).toBeVisible();
 await expect(page.getByLabel('公开报告样例')).toContainText(product.publicSample.label);
 await expect(page.getByText('这是公开样例，与个人报告分开。',{exact:true})).toBeVisible();
 assert.equal(await page.locator('.consumer-view').evaluate(node=>getComputedStyle(node).colorScheme),'dark');
 await fits();await screenshot('desktop-product');pass(phase);
 phase='explicit long-content projection fixture preserves null sample values';
 // Only this presentation edge uses a declared response fixture; normal routes
 // and all writes use the actual isolated API. Published rows are not rewritten.
 await page.route('**/api/products/demo-partner',async route=>{
  const response=await route.fetch(),original=await response.json();
  await route.fulfill({response,json:{...original,description:'生活中的具体感受。'.repeat(200),publicSample:{...original.publicSample,dimensions:[{label:'尚未足够的信息',score:null}]}}});
 });
 await page.reload();await expect(page.getByText('生活中的具体感受。'.repeat(200),{exact:true})).toBeVisible();
 await expect(page.locator('.consumer-sample-scores dd')).toHaveText('信息不足');await fits();
 await screenshot('desktop-product-long-null');await page.unroute('**/api/products/demo-partner');
 pass(phase);
 phase='redemption layout preserves invalid and revoked code errors';
 await page.goto('/redeem');await expect(page.getByRole('heading',{name:'领取或恢复商品',exact:true})).toBeVisible();
 await expect(page.getByLabel('兑换步骤')).toBeVisible();await screenshot('desktop-redeem');
 await page.getByLabel('兑换码',{exact:true}).fill(fixture.credentials.codes['unclaimed-REVOKED']);
 await page.getByRole('button',{name:'领取或恢复',exact:true}).click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(page).toHaveURL(base+'/redeem');await screenshot('desktop-redeem-revoked');pass(phase);
 phase='lost redemption response preserves the same request and resumes the saved entitlement';
 const requests=[];let loseOnce=true;
 await page.route('**/api/redemptions/claim',async route=>{
   requests.push(route.request().postDataJSON().requestId);
   if(loseOnce){loseOnce=false;const reply=await route.fetch();assert.equal(reply.status(),200);return route.abort('failed');}
   await route.continue();
 });
 await page.getByLabel('兑换码',{exact:true}).fill(fixture.credentials.codes['unclaimed-ISSUED']);
 await page.getByRole('button',{name:'领取或恢复',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('连接失败');
 await page.getByRole('button',{name:'领取或恢复',exact:true}).click();
 await expect(page).toHaveURL(base+'/apps');assert.equal(requests.length,2);assert.equal(requests[0],requests[1]);
 await page.unroute('**/api/redemptions/claim');await expect(page.getByRole('button',{name:'开始测试',exact:true})).toBeVisible();
 await expect(page.getByLabel('领取或恢复结果',{exact:true})).toBeVisible();assert.equal(await page.evaluate(()=>history.state?.usr),null);
 await screenshot('desktop-redemption-result');await page.reload();await expect(page.getByLabel('领取或恢复结果',{exact:true})).toHaveCount(0);pass(phase);
 phase='product loading and unavailable states remain within the common frame';
 let resume;
 const gate=new Promise(resolve=>{resume=resolve;});
 await page.route('**/api/products/demo-work',async route=>{await gate;await route.continue();});
 const navigation=page.goto('/products/demo-work');
 await expect(page.getByRole('status').filter({hasText:'正在读取'})).toBeVisible();await screenshot('desktop-product-loading');resume();await navigation;
 await expect(page.locator('.consumer-product-hero h1')).toBeVisible();await page.unroute('**/api/products/demo-work');
 await page.goto('/products/not-a-published-product');await expect(page.getByRole('alert')).toBeVisible();await fits();await screenshot('desktop-product-unavailable');pass(phase);
 phase='question grid confirms explicitly and preserves unsaved selection on a failed save';
 await page.goto('/apps');await page.getByRole('button',{name:'开始测试',exact:true}).click();
 await expect(page).toHaveURL(/\/attempts\//);
 const attemptId=new URL(page.url()).pathname.split('/').at(-1);
 const questions=await (await context.request.get(base+'/api/attempts/'+attemptId+'/questions')).json();
 await expect(page.getByRole('radio').first()).toBeVisible();
 await page.getByRole('radio').first().check();
 await expect(page.getByText('当前选择尚未保存，未计入进度。',{exact:true})).toBeVisible();
 assert.equal((await (await context.request.get(base+'/api/attempts/'+attemptId+'/questions')).json()).answers.length,0);
 await fits();await screenshot('desktop-assessment-choice');
 const saveRequests=[];let failSave=true;
 await page.route('**/api/attempts/*/answers/*',async route=>{saveRequests.push(route.request().postDataJSON().requestId);if(failSave){failSave=false;return route.abort('failed');}await route.continue();});
 await page.getByRole('button',{name:'保存答案',exact:true}).click();await expect(page.getByRole('alert')).toContainText('连接失败');
 await expect(page.getByText('当前选择尚未保存，未计入进度。',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'保存答案',exact:true}).click();await expect(page.getByText('答案已保存。',{exact:true})).toBeVisible();
 assert.equal(saveRequests.length,2);assert.equal(saveRequests[0],saveRequests[1]);await page.unroute('**/api/attempts/*/answers/*');pass(phase);
 phase='feedback uses the two actual server denominators and moves below questions on phones';
 const feedback=await (await context.request.get(base+'/api/attempts/'+attemptId+'/feedback?questionId='+questions.questions[0].id)).json();
 await expect(page.locator('.consumer-statistics')).toContainText('其他有效回答：'+feedback.answers.sampleSize+' 份');
 await expect(page.locator('.consumer-statistics')).toContainText('其他有效完成答卷：'+feedback.results.sampleSize+' 份');
 await screenshot('desktop-assessment-feedback');await page.setViewportSize({width:390,height:844});await fits();
 assert.equal(await page.locator('.consumer-assessment-grid').evaluate(node=>{const a=node.querySelector('.consumer-question-panel').getBoundingClientRect(),b=node.querySelector('.consumer-feedback-panel').getBoundingClientRect();return b.top>=a.bottom;}),true);
 await screenshot('mobile-assessment-feedback');await page.setViewportSize({width:1440,height:1000});pass(phase);
 phase='server report and private summary download retain the actual fixed result';
 for(let index=1;index<questions.questions.length;index++){
  await page.getByRole('button',{name:'下一题',exact:true}).click();
  await expect(page.locator('.consumer-choice legend')).toContainText(questions.questions[index].text);
  await page.getByRole('radio').first().check();await expect(page.getByRole('button',{name:'保存答案',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'保存答案',exact:true}).click();await expect(page.getByText('答案已保存。',{exact:true})).toBeVisible();
 }
 await page.getByRole('button',{name:'生成报告',exact:true}).click();await expect(page).toHaveURL(/\/reports\//);
 const reportId=new URL(page.url()).pathname.split('/').at(-1),report=await (await context.request.get(base+'/api/reports/'+reportId)).json();
 await expect(page.getByRole('heading',{name:report.content.resultLabel,exact:true})).toBeVisible();
 await expect(page.getByLabel('报告维度概览')).toBeVisible();await fits();await screenshot('desktop-report');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出摘要卡',exact:true}).click();
 const file=join(directory,'summary.png');await (await download).saveAs(file);const bytes=await readFile(file);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.length>1000);
 await page.setViewportSize({width:390,height:844});await fits();await screenshot('mobile-report');await page.setViewportSize({width:1440,height:1000});pass(phase);
 phase='adaptive radar is a declared presentation fixture and never assigns missing values to zero';
 await page.route('**/api/reports/'+reportId,async route=>{const response=await route.fetch(),original=await response.json();await route.fulfill({response,json:{...original,content:{...original.content,totalScore:50,dimensions:[0,1,2,3,4].map((_,i)=>({id:'view-'+i,label:'视觉边界样例 '+(i+1),score:i*20,applicableAnswers:1,requiredAnswers:1,missingReason:null}))}}});});
 await page.reload();await expect(page.locator('.consumer-radar')).toBeVisible();await fits();await screenshot('desktop-report-radar-fixture');await page.unroute('**/api/reports/'+reportId);await page.reload();
 await expect(page.getByRole('heading',{name:report.content.resultLabel,exact:true})).toBeVisible();pass(phase);
 phase='permanent report deletion still requires confirmation and removes private content';
 await page.getByText('删除这份报告',{exact:true}).click();await expect(page.getByRole('button',{name:'永久删除报告',exact:true})).toBeDisabled();
 await page.getByLabel('我确认永久删除这份报告',{exact:true}).check();await screenshot('desktop-report-delete-confirm');
 await page.getByRole('button',{name:'永久删除报告',exact:true}).click();await expect(page).toHaveURL(/\/reports\?source=anonymous$/);await expect(page.locator('.consumer-report-result')).toHaveCount(0);pass(phase);
 phase='stored insufficient reports keep null scores and have no radar or zero meters';
 const mainPage=page,nullContext=await browser.newContext({baseURL:base,viewport:{width:390,height:844},reducedMotion:'reduce'});nullContext.on('page',monitor);
 await nullContext.addCookies([{name:'orai_session',value:fixture.credentials.sessions['not-applicable'],url:base,httpOnly:true,sameSite:'Lax'}]);
 page=await nullContext.newPage();await page.goto('/reports/'+demoId('report-not-applicable'));
 await expect(page.getByText('信息不足，暂不提供总分',{exact:true})).toBeVisible();await expect(page.locator('.consumer-radar')).toHaveCount(0);
 await expect(page.getByRole('meter')).toHaveCount(0);await fits();await screenshot('mobile-report-insufficient');await nullContext.close();page=mainPage;pass(phase);
 phase='saved historical questions display real ready distributions with their separate denominators';
 const readyContext=await browser.newContext({baseURL:base,viewport:{width:1440,height:1000},reducedMotion:'reduce'});readyContext.on('page',monitor);
 await readyContext.addCookies([{name:'orai_session',value:fixture.credentials.sessions.partial,url:base,httpOnly:true,sameSite:'Lax'}]);
 const readyId=demoId('attempt-partial'),readyQuestions=await (await readyContext.request.get(base+'/api/attempts/'+readyId+'/questions')).json();
 const savedQuestion=readyQuestions.answers[0].questionId,readyFeedback=await (await readyContext.request.get(base+'/api/attempts/'+readyId+'/feedback?questionId='+savedQuestion)).json();
 assert.equal(readyFeedback.answers.state,'ready');assert.equal(readyFeedback.results.state,'ready');
 page=await readyContext.newPage();await page.goto('/attempts/'+readyId+'?question='+savedQuestion);
 await expect(page.locator('.consumer-statistic-row').first()).toBeVisible();
 await expect(page.locator('.consumer-statistics')).toContainText('其他有效回答：'+readyFeedback.answers.sampleSize+' 份');
 await expect(page.locator('.consumer-statistics')).toContainText('其他有效完成答卷：'+readyFeedback.results.sampleSize+' 份');
 await fits();await screenshot('desktop-assessment-ready-feedback');await readyContext.close();page=mainPage;pass(phase);
 phase='empty local and account lists, help and unknown routes share the actual consumer frame';
 const accountContext=await browser.newContext({baseURL:base,viewport:{width:1440,height:1000},reducedMotion:'reduce'});accountContext.on('page',monitor);page=await accountContext.newPage();
 await page.goto('/apps');await expect(page.getByText('当前没有本机商品，请使用兑换码领取或恢复。',{exact:true})).toBeVisible();await fits();await screenshot('desktop-apps-empty');
 await page.getByRole('button',{name:'账户已绑定商品',exact:true}).click();await expect(page.getByText('请先登录账户。',{exact:true})).toBeVisible();
 await page.goto('/help');await expect(page.getByRole('heading',{name:'使用帮助',exact:true})).toBeVisible();await fits();await screenshot('desktop-help');
 await page.goto('/this-page-does-not-exist');await expect(page.getByRole('heading',{name:'页面不存在',exact:true})).toBeVisible();await fits();await screenshot('desktop-not-found');pass(phase);
 phase='configured password login keeps safe errors and uses an isolated real account handoff';
 await page.goto('/auth/login');await expect(page.getByLabel('邮箱',{exact:true})).toBeVisible();await fits();await screenshot('desktop-auth-login');
 authProtocol.setLoginFailure(true);await page.getByLabel('邮箱',{exact:true}).fill('viewer@example.test');await page.getByLabel('密码',{exact:true}).fill('fixture_password');await page.getByRole('button',{name:'邮箱登录',exact:true}).click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('密码',{exact:true})).toHaveValue('');await screenshot('desktop-auth-login-error');
 authProtocol.setLoginFailure(false);await page.getByLabel('密码',{exact:true}).fill('fixture_password');await page.getByRole('button',{name:'邮箱登录',exact:true}).click();
 await expect(page).toHaveURL(base+'/account');await expect(page.getByText('已登录，邮箱已验证。商品绑定需要逐项主动确认。',{exact:true})).toBeVisible();await fits();await screenshot('desktop-account');pass(phase);
 phase='account binding stays explicit and private account lists disappear across tabs on logout';
 await expect(page.getByRole('button',{name:'确认绑定',exact:true})).toBeDisabled();await page.getByLabel('要绑定的兑换码',{exact:true}).fill(fixture.credentials.codes.pending);
 await expect(page.getByRole('button',{name:'确认绑定',exact:true})).toBeDisabled();await page.getByLabel('我确认将此商品绑定到当前账户',{exact:true}).check();
 await page.setViewportSize({width:390,height:844});await fits();await screenshot('mobile-account-binding');
 await page.getByRole('button',{name:'确认绑定',exact:true}).click();await expect(page.getByRole('alert')).toContainText('需要当前有效的匿名授权');
 await page.goto('/redeem');await page.getByLabel('兑换码',{exact:true}).fill(fixture.credentials.codes.pending);await page.getByRole('button',{name:'领取或恢复',exact:true}).click();await expect(page).toHaveURL(base+'/apps');
 await page.goto('/account');await page.getByLabel('要绑定的兑换码',{exact:true}).fill(fixture.credentials.codes.pending);await expect(page.getByRole('button',{name:'确认绑定',exact:true})).toBeDisabled();await page.getByLabel('我确认将此商品绑定到当前账户',{exact:true}).check();
 await page.getByRole('button',{name:'确认绑定',exact:true}).click();await expect(page).toHaveURL(/\/apps\?source=account$/);await expect(page.locator('.consumer-library-card').first()).toBeVisible();await screenshot('mobile-account-apps');
 const sibling=await accountContext.newPage();await sibling.goto('/apps?source=account');await expect(sibling.locator('.consumer-library-card').first()).toBeVisible();
 await page.goto('/account');await page.getByRole('button',{name:'退出账户',exact:true}).click();await expect(page.getByText('当前未登录。',{exact:true})).toBeVisible();await expect(sibling.getByText('请先登录账户。',{exact:true})).toBeVisible();await sibling.close();pass(phase);
 phase='registration validates confirmation, shows mail cooldown and consumes a PKCE verification callback';
 await page.setViewportSize({width:1440,height:1000});await page.goto('/auth/register');await page.getByLabel('邮箱',{exact:true}).fill('viewer@example.test');
 await page.getByLabel('密码',{exact:true}).fill('fixture_password');await page.getByLabel('再次输入密码',{exact:true}).fill('fixture_different');await page.getByRole('button',{name:'注册邮箱账户',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('两次密码不一致。');
 await page.getByLabel('密码',{exact:true}).fill('fixture_password');await page.getByLabel('再次输入密码',{exact:true}).fill('fixture_password');await page.getByRole('button',{name:'注册邮箱账户',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'验证邮件将发送'})).toBeVisible();await expect(page.getByRole('button',{name:/秒后可再发送/})).toBeDisabled();await fits();await screenshot('desktop-auth-registration-sent');
 const verificationMail=authProtocol.mail();assert.equal(verificationMail.type,'verification');const verificationUrl=new URL(verificationMail.redirectTo);verificationUrl.searchParams.set('code',verificationMail.code);
 await page.goto(verificationUrl.href);await expect(page).toHaveURL(base+'/account');await expect(page.getByText('已登录，邮箱已验证。商品绑定需要逐项主动确认。',{exact:true})).toBeVisible();pass(phase);
 phase='recovery checks the actual stored PKCE verifier and resets through the existing protocol';
 await page.goto('/auth/forgot');await page.getByLabel('邮箱',{exact:true}).fill('viewer@example.test');await page.getByRole('button',{name:'找回密码',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'重置邮件将发送'})).toBeVisible();await screenshot('desktop-auth-recovery-sent');
 const recoveryMail=authProtocol.mail();assert.equal(recoveryMail.type,'recovery');const recoveryUrl=new URL(recoveryMail.redirectTo);recoveryUrl.searchParams.set('code',recoveryMail.code);
 await page.goto(recoveryUrl.href);await expect(page.getByText('链接已验证，请在十分钟内设置新密码。离开或刷新此页后需重新申请。',{exact:true})).toBeVisible();
 await expect(page).toHaveURL(base+'/auth/reset');await expect(page.getByLabel('新密码',{exact:true})).toBeVisible();await screenshot('desktop-auth-reset');
 await page.getByLabel('新密码',{exact:true}).fill('fixture_new_password');await page.getByLabel('再次输入新密码',{exact:true}).fill('fixture_new_password');await page.getByRole('button',{name:'更新密码',exact:true}).click();
 await expect(page).toHaveURL(base+'/account');assert.equal(authProtocol.metrics.passwordUpdates,1);
 assert.equal(await page.evaluate(()=>Object.values(localStorage).some(value=>value.includes('access_token')||value.includes('refresh_token'))),false);pass(phase);
 phase='invalid callback clears query credentials and recovery controls never appear';
 await page.setViewportSize({width:390,height:844});await page.goto('/auth/reset?code=unowned-code&sb_flow_id=unowned-flow');
 await expect(page.getByText('验证链接已失效。请用发起申请的浏览器打开邮件，或重新申请。',{exact:true})).toBeVisible();await expect(page).toHaveURL(base+'/auth/reset');await expect(page.getByLabel('新密码',{exact:true})).toHaveCount(0);await fits();await screenshot('mobile-auth-invalid-link');pass(phase);
 phase='administrator login still returns to the storefront and the admin entry remains on the left';
 await page.setViewportSize({width:1440,height:1000});await page.goto('/auth/login');await page.getByLabel('邮箱',{exact:true}).fill('operator@example.test');await page.getByLabel('密码',{exact:true}).fill('fixture_password');await page.getByRole('button',{name:'邮箱登录',exact:true}).click();
 await expect(page).toHaveURL(base+'/');await expect(page.getByRole('navigation',{name:'快捷导航',exact:true}).getByRole('link',{name:'运营后台',exact:true})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'商城工具',exact:true}).getByRole('link',{name:'运营后台',exact:true})).toHaveCount(0);pass(phase);
 phase='account read failure can retry without exposing a previous private view';
 let failAccount=true;await page.route('**/api/account/context',async route=>{if(failAccount)return route.abort('failed');await route.continue();});
 await page.goto('/account');await expect(page.getByRole('alert')).toHaveText('暂时无法确认访问状态，请检查网络后重试。');await expect(page.getByLabel('要绑定的兑换码',{exact:true})).not.toBeVisible();await screenshot('desktop-account-read-error');
 failAccount=false;await page.getByRole('button',{name:'重试访问检查',exact:true}).click();await expect(page.locator('.access-screen')).toHaveCount(0);
 if(await page.getByRole('button',{name:'重试',exact:true}).isVisible())await page.getByRole('button',{name:'重试',exact:true}).click();
 await expect(page.getByRole('button',{name:'退出账户',exact:true})).toBeVisible();await page.unroute('**/api/account/context');pass(phase);
 phase='mail rate limiting remains explicit and does not claim an email was sent';
 await page.goto('/auth/forgot');authProtocol.setMailFailure(true);await page.getByLabel('邮箱',{exact:true}).fill('viewer@example.test');await page.getByRole('button',{name:'找回密码',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('操作太频繁，请稍后再试。');await expect(page.getByRole('button',{name:/秒后可再发送/})).toBeDisabled();await screenshot('desktop-auth-mail-limited');authProtocol.setMailFailure(false);pass(phase);
 phase='keyboard focus crosses login controls and the existing search shortcut remains available';
 await page.goto('/auth/login');await page.getByLabel('邮箱',{exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByLabel('密码',{exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'邮箱登录',exact:true})).toBeFocused();
 await page.keyboard.press('Control+k');await expect(page.locator('.store-search input')).toBeFocused();pass(phase);
 for(const width of [390,360,320,768]){
  phase='account, lists, help and fallback controls remain usable at '+width+'px';await page.setViewportSize({width,height:width===768?1024:844});
  for(const [route,label] of [['/auth/login','邮箱登录'],['/auth/register','注册邮箱账户'],['/auth/forgot','找回密码'],['/account','账户状态'],['/reports','我的报告'],['/help','使用帮助'],['/unknown-page','页面不存在']]){
   await page.goto(route);await expect(page.getByRole('heading',{name:label,exact:true})).toBeVisible();await fits();
  }
  await page.goto('/auth/login');await expect(page.getByLabel('邮箱',{exact:true})).toBeVisible();if(width<768)assert.equal(await page.getByLabel('邮箱',{exact:true}).evaluate(node=>getComputedStyle(node).fontSize),'16px');await screenshot('auth-login-'+width);pass(phase);
 }
 phase='landscape pages retain readable fields and reachable primary actions';
 await page.setViewportSize({width:844,height:390});for(const route of ['/products/demo-partner','/redeem','/auth/login','/apps','/help']){await page.goto(route);await expect(page.locator('.consumer-view')).toBeVisible();await fits();}await screenshot('landscape-help');pass(phase);
 await accountContext.close();page=mainPage;
 phase='unconfigured frontend authentication retains an honest unavailable state in the same layout';
 process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='';process.env.VITE_APP_PUBLIC_ORIGIN='http://127.0.0.1:5184';
 alternateVite=await createServer({root:join(root,'apps/web'),configFile:join(root,'apps/web/vite.config.ts'),server:{host:'127.0.0.1',port:5184,strictPort:true,proxy:{'/api':await app.getUrl(),'/health':await app.getUrl()}}});await alternateVite.listen();
 const unavailableContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});unavailableContext.on('page',monitor);page=await unavailableContext.newPage();
 await page.goto('http://127.0.0.1:5184/auth/login');await expect(page.getByRole('status').filter({hasText:'账户服务尚未配置'})).toBeVisible();await expect(page.getByLabel('密码',{exact:true})).toHaveCount(0);await fits();await screenshot('mobile-auth-unconfigured');
 await unavailableContext.close();await alternateVite.close();alternateVite=null;process.env.VITE_SUPABASE_URL=authProtocol.url;process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_'+'p'.repeat(40);process.env.VITE_APP_PUBLIC_ORIGIN=base;page=mainPage;pass(phase);
 phase='emulated touch choices remain unconfirmed until saved and refresh restores only saved answers';
 const touch=await browser.newContext({baseURL:base,viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});touch.on('page',monitor);await touch.addCookies([{name:'orai_session',value:fixture.credentials.sessions.partial,url:base,httpOnly:true,sameSite:'Lax'}]);page=await touch.newPage();
 await page.goto('/attempts/'+demoId('attempt-partial'));await expect(page.locator('.consumer-option-grid label').nth(1)).toBeVisible();await page.locator('.consumer-option-grid label').nth(1).tap();await expect(page.getByText('当前选择尚未保存，未计入进度。',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('radio',{checked:true})).toHaveCount(0);await page.locator('.consumer-option-grid label').nth(1).tap();await page.getByRole('button',{name:'保存答案',exact:true}).tap();await expect(page.getByText('答案已保存。',{exact:true})).toBeVisible();await fits();await screenshot('mobile-touch-answer');await touch.close();page=mainPage;pass(phase);
 for(const width of [390,360,320,768]){
  phase='product and redemption at '+width+'px preserve readable controls and local scrolling';
  await page.setViewportSize({width,height:width===768?1024:844});
  await page.goto('/products/demo-partner');await expect(page.locator('.consumer-product-hero h1')).toBeVisible();await fits();await screenshot('product-'+width);
  await page.goto('/redeem');await expect(page.getByLabel('兑换码',{exact:true})).toBeVisible();await fits();
  if(width<768)assert.equal(await page.getByLabel('兑换码',{exact:true}).evaluate(node=>getComputedStyle(node).fontSize),'16px');
  await screenshot('redeem-'+width);pass(phase);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await writeFile(join(output,'verification.json'),JSON.stringify({passed:true,checks,screens,pageErrors:errors,forbiddenNetwork:external,
  stage:'all-consumer-local-ui',uiAcceptance:'autonomous_visual_and_interaction_verification',userApprovedCurrentScreens:false,
  authProtocol:authProtocol.metrics,accountHandoff:'actual isolated API and TEST database; Auth protocol and identity substitute',
  businessDatabase:'isolated TEST fixture; cleaned after browser closure',auth:'SupabaseAuthGateway substitute; no real account',
  physicalDeviceValidated:false,actualContentProduction:false,modelCalls:0,schedulesEnabled:false,published:false},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length,screens:screens.length}));
}catch(error){
 await writeFile(join(privateOutput,'browser-failure.json'),JSON.stringify({phase,message:String(error),checks},null,2)+'\n');
 if(page)await page.screenshot({path:join(privateOutput,'browser-failure.png'),fullPage:true}).catch(()=>{});
 console.error(JSON.stringify({phase,message:String(error)}));process.exitCode=1;
}finally{
 await browser?.close();await alternateVite?.close();await vite?.close();await app?.close();await fixture?.close();await authProtocol?.close();
 if(directory)await rm(directory,{recursive:true,force:true});
 await rm(join(privateOutput,'browser-active.json'),{force:true});
}

