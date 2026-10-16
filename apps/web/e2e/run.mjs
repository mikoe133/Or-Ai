import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {randomUUID,randomBytes} from 'node:crypto';
import {chromium,expect} from 'playwright/test';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const apiRequire=createRequire(join(root,'apps/api/package.json')),webRequire=createRequire(join(root,'apps/web/package.json'));
const{Test}=apiRequire('@nestjs/testing');
const{AppModule}=apiRequire('./.test-build/src/app.module.js');
const{APP_CONFIG}=apiRequire('./.test-build/src/config/configuration.js');
const{configureApp}=apiRequire('./.test-build/src/common/configure-app.js');
const{SupabaseAuthGateway}=apiRequire('./.test-build/src/accounts/supabase-auth.gateway.js');
const{createLocalFixture}=apiRequire('./.test-build/test/local-fixture.js');
const{demoId,DemoIdentityScenarios}=apiRequire('./.test-build/scripts/demo-fixtures.js');
let fixture,app,vite,browser,directory;let phase='setup';const checks=[],errors=[];
const output=join(root,'.local/t08/e2e');await mkdir(output,{recursive:true});
const webPort=Number(process.env.ORAI_E2E_PORT||5175),base='http://127.0.0.1:'+webPort;
process.env.WEB_PORT=String(webPort);process.env.API_PORT='4108';
// These facts are supplied only through Nest's test provider. No test login
// endpoint or bypass is installed in the application or production bundle.
const proofs=new Map(),refreshes=new Map();
function credentials(owner=randomUUID()){
 const accessToken=randomBytes(60).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');
 proofs.set(accessToken,{supabaseUserId:owner,supabaseSessionId:randomUUID(),expiresAt:new Date(Date.now()+3_600_000),emailVerified:true});refreshes.set(refreshToken,{accessToken,refreshToken});return{accessToken,refreshToken};
}
async function signIn(context,owner){const token=(await(await context.request.get(base+'/api/account/context')).json()).csrfToken;const response=await context.request.post(base+'/api/account/session',{headers:{origin:base,'X-CSRF-Token':token},data:credentials(owner)});assert.equal(response.status(),200);}
try{
 process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t08');directory=await mkdtemp(join(tmpdir(),'orai-t08-'));
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,
  assets:{...fixture.configuration.assets,directory},security:{...fixture.configuration.security,readIpLimit:2000,writeIpLimit:2000,claimIpLimit:1000},
  auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000}})
  .overrideProvider(SupabaseAuthGateway).useValue({verify:async token=>{const value=proofs.get(token);assert.ok(value);return value;},refresh:async token=>{const value=refreshes.get(token);assert.ok(value);return{...value,identity:proofs.get(value.accessToken)};},logout:async()=>{}}).compile();
 app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');
 process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='';
 process.chdir(join(root,'apps/web'));
 const{createServer}=await import(pathToFileURL(webRequire.resolve('vite')).href);
 vite=await createServer({root:join(root,'apps/web'),configFile:join(root,'apps/web/vite.config.ts'),server:{host:'127.0.0.1',port:webPort,strictPort:true,proxy:{'/api':await app.getUrl(),'/health':await app.getUrl()}}});await vite.listen();
 browser=await chromium.launch({headless:true,...(process.env.ORAI_BROWSER_PATH?{executablePath:process.env.ORAI_BROWSER_PATH}:process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
 const anonymous=await browser.newContext({baseURL:base,viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await anonymous.newPage();page.on('pageerror',error=>errors.push(error.name));
 phase='real application list route';await page.goto('/apps');await expect(page.getByRole('heading',{name:'我的应用',exact:true})).toBeVisible();await expect(page.getByText('本机未绑定商品',{exact:true})).toBeVisible();checks.push(phase);
 phase='catalog uses published API products';await page.goto('/');await expect(page.locator('a[href="/products/demo-partner"]').first()).toBeVisible();await expect(page.getByText('伴侣协作测试 · 演示',{exact:true}).first()).toBeVisible();checks.push(phase);
 phase='admin denies unsigned users';await page.goto('/admin');await expect(page.getByText('需要管理员账户',{exact:true})).toBeVisible();checks.push(phase);
 // Full consumer and operator journeys are extended here before the matching
 // pages are implemented; the initial RED gate proves the absent real routes.
 await page.screenshot({path:join(output,'catalog.png'),fullPage:true});await anonymous.close();
 assert.deepEqual(errors,[]);await writeFile(join(output,'result.json'),JSON.stringify({passed:true,checks,identityFactsIsolated:true,cloudAuthAccepted:false},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,cloudAuthAccepted:false}));
}catch(error){await writeFile(join(output,'result.json'),JSON.stringify({passed:false,phase,checks,errorType:error.name},null,2)+'\n');console.error(JSON.stringify({passed:false,phase,errorType:error.name}));process.exitCode=1;}
finally{await browser?.close();await vite?.close();await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});}
