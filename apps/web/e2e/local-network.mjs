import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {performance} from 'node:perf_hooks';
import {chromium,expect as baseExpect} from 'playwright/test';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const apiRequire=createRequire(join(root,'apps/api/package.json')),webRequire=createRequire(join(root,'apps/web/package.json'));
const {Test}=apiRequire('@nestjs/testing'),{AppModule}=apiRequire('./.test-build/src/app.module.js');
const {APP_CONFIG}=apiRequire('./.test-build/src/config/configuration.js');
const {configureApp}=apiRequire('./.test-build/src/common/configure-app.js');
const {createLocalFixture}=apiRequire('./.test-build/test/local-fixture.js');
const {demoId}=apiRequire('./.test-build/scripts/demo-fixtures.js');
const base='http://127.0.0.1:5191',output=join(root,'output/implementation/t10-network-20261023');
const evidence=join(root,'.local/local-continuation-20261023/network');
const expect=baseExpect.configure({timeout:45000});
const network={offline:false,latency:250,downloadThroughput:128*1024,uploadThroughput:64*1024,connectionType:'cellular3g'};
const checks=[],screens=[],pageErrors=[],externalRequests=[],sessions=[],timings={};
let fixture,app,preview,browser,directory,page,phase='setup';
const pass=label=>{checks.push(label);console.log('PASS '+label);};
const safePath=url=>new URL(url).pathname.replace(/[a-f\d]{8}-[a-f\d-]{27}/gi,':id');
async function fits(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await page.locator('.consumer-view').evaluate(n=>n.scrollWidth<=n.clientWidth+1));}
async function screenshot(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:join(output,name+'.png'),fullPage:true});screens.push(name+'.png');}
async function fresh(label,viewport){
 const context=await browser.newContext({baseURL:base,viewport,reducedMotion:'reduce',serviceWorkers:'block'});
 const storage=await context.storageState();assert.deepEqual(storage,{cookies:[],origins:[]});
 const p=await context.newPage(),cdp=await context.newCDPSession(p);
 const record={label,viewport,emptyInitialStorage:true,cacheCleared:true,cacheDisabled:true,serviceWorkers:'block',throttle:network,requests:[],responses:[],failures:[],bytes:0,servedFromCache:0,internalResources:0,internalCacheSignals:0};
 const httpIds=new Set();
 sessions.push(record);
 p.on('pageerror',e=>pageErrors.push(e.message));p.on('request',r=>{const url=new URL(r.url());if(['http:','https:'].includes(url.protocol)&&url.origin!==base)externalRequests.push(url.origin);});
 cdp.on('Network.requestWillBeSent',e=>{if(!['http:','https:'].includes(new URL(e.request.url).protocol)){record.internalResources++;return;}httpIds.add(e.requestId);record.requests.push({id:e.requestId,path:safePath(e.request.url),method:e.request.method,type:e.type});});
 cdp.on('Network.responseReceived',e=>{if(httpIds.has(e.requestId))record.responses.push({id:e.requestId,path:safePath(e.response.url),status:e.response.status,type:e.type,fromDiskCache:e.response.fromDiskCache===true,fromServiceWorker:e.response.fromServiceWorker===true});});
 cdp.on('Network.loadingFinished',e=>{if(httpIds.has(e.requestId))record.bytes+=e.encodedDataLength;});
 cdp.on('Network.requestServedFromCache',e=>{if(httpIds.has(e.requestId))record.servedFromCache++;else record.internalCacheSignals++;});
 cdp.on('Network.loadingFailed',e=>{if(httpIds.has(e.requestId))record.failures.push({id:e.requestId,error:e.errorText});});
 await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',network);
 return {context,p,cdp,record};
}
try{
 await mkdir(output,{recursive:true});await mkdir(evidence,{recursive:true});
 process.env.WEB_PORT='5191';process.env.APP_PUBLIC_ORIGIN=base;
 process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='';process.env.VITE_APP_PUBLIC_ORIGIN=base;
 process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t10');directory=await mkdtemp(join(tmpdir(),'orai-t10-network-'));
 const start=performance.now();
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,auth:null,
  assets:{...fixture.configuration.assets,directory:join(directory,'assets')},security:{...fixture.configuration.security,origins:[base],readIpLimit:3000,writeIpLimit:1000}}).compile();
 app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');timings.freshNestInstanceReadyMs=Math.round(performance.now()-start);
 const {build,preview:serve}=await import(pathToFileURL(webRequire.resolve('vite')).href);
 process.chdir(join(root,'apps/web'));
 const buildStart=performance.now(),outDir=join(directory,'web');
 await build({root:join(root,'apps/web'),configFile:join(root,'apps/web/vite.config.ts'),logLevel:'warn',build:{outDir,emptyOutDir:true}});
 timings.productionBuildMs=Math.round(performance.now()-buildStart);
 const previewStart=performance.now();
 preview=await serve({root:join(root,'apps/web'),configFile:join(root,'apps/web/vite.config.ts'),build:{outDir},preview:{host:'127.0.0.1',port:5191,strictPort:true,proxy:{'/api':await app.getUrl(),'/health':await app.getUrl()}}});
 timings.previewReadyMs=Math.round(performance.now()-previewStart);
 browser=await chromium.launch({headless:true,...(process.env.ORAI_BROWSER_PATH?{executablePath:process.env.ORAI_BROWSER_PATH}:process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
 phase='desktop first visit uses an empty cache and CDP latency/bandwidth limits against a newly started production preview';
 const desktop=await fresh('desktop-cold',{width:1440,height:1000});page=desktop.p;
 const productResponse=page.waitForResponse(r=>r.url()===base+'/api/products/demo-partner'&&r.status()===200),firstStart=performance.now();
 await page.goto('/products/demo-partner',{waitUntil:'domcontentloaded',timeout:60000});
 const product=await(await productResponse).json();await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
 timings.desktopFirstProductReadyMs=Math.round(performance.now()-firstStart);
 await fits();await screenshot('desktop-cold-throttled-product');
 assert.ok(desktop.record.requests.some(r=>r.type==='Script'&&r.path.startsWith('/assets/')));assert.ok(desktop.record.bytes>100000);
 assert.equal(desktop.record.servedFromCache,0);assert.ok(desktop.record.responses.every(r=>!r.fromDiskCache&&!r.fromServiceWorker));
 pass(phase);await desktop.context.close();
 phase='mobile first visit independently starts with empty storage/cache and retrieves the actual product under the same network limits';
 const mobile=await fresh('mobile-cold',{width:390,height:844});page=mobile.p;
 const mobileStart=performance.now();await page.goto('/products/demo-partner',{waitUntil:'domcontentloaded',timeout:60000});await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
 timings.mobileFirstProductReadyMs=Math.round(performance.now()-mobileStart);await fits();await screenshot('mobile-cold-throttled-product');
 assert.equal(mobile.record.servedFromCache,0);assert.ok(mobile.record.responses.every(r=>!r.fromDiskCache&&!r.fromServiceWorker));pass(phase);
 phase='an offline initial navigation fails honestly and a manual retry after reconnection loads the same published product';
 const failed=await fresh('offline-first-visit',{width:390,height:844});page=failed.p;
 await failed.cdp.send('Network.emulateNetworkConditions',{...network,offline:true});
 await assert.rejects(page.goto(base+'/products/demo-partner',{waitUntil:'domcontentloaded',timeout:15000}),/net::ERR_INTERNET_DISCONNECTED/);
 assert.ok(failed.record.failures.length>0);await failed.cdp.send('Network.emulateNetworkConditions',network);
 await page.goto(base+'/products/demo-partner',{waitUntil:'domcontentloaded',timeout:60000});await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();await fits();
 await screenshot('mobile-offline-first-visit-recovered');pass(phase);await failed.context.close();
 phase='a save interrupted by actual browser offline mode stays unsaved in the real TEST database';
 page=mobile.p;
 await mobile.context.addCookies([{name:'orai_session',value:fixture.credentials.sessions.partial,url:base,httpOnly:true,sameSite:'Lax'}]);
 const attemptId=demoId('attempt-partial');
 await page.goto('/attempts/'+attemptId,{waitUntil:'domcontentloaded',timeout:60000});await expect(page.getByRole('radio').first()).toBeVisible();
 const before=await(await mobile.context.request.get(base+'/api/attempts/'+attemptId+'/questions')).json();
 await page.getByRole('radio').nth(1).check();await expect(page.getByText('当前选择尚未保存，未计入进度。',{exact:true})).toBeVisible();
 const requestIds=[];
 page.on('request',req=>{if(req.method()==='PUT'&&/\/api\/attempts\/[^/]+\/answers\//.test(new URL(req.url()).pathname))requestIds.push(req.postDataJSON().requestId);});
 await mobile.cdp.send('Network.emulateNetworkConditions',{...network,offline:true});
 await page.getByRole('button',{name:'保存答案',exact:true}).click();await expect(page.getByRole('alert')).toContainText('连接失败');
 await expect(page.getByText('当前选择尚未保存，未计入进度。',{exact:true})).toBeVisible();await expect(page.getByRole('radio').nth(1)).toBeChecked();
 const afterFailure=await(await mobile.context.request.get(base+'/api/attempts/'+attemptId+'/questions')).json();assert.deepEqual(afterFailure.answers,before.answers);
 // This cold client has no CSRF token yet. Real offline mode prevents that
 // prerequisite read, so the failed action must not send a PUT at all. The
 // previously sealed local-ui test covers a transmitted PUT's same-ID retry.
 assert.equal(requestIds.length,0);
 await screenshot('mobile-offline-save-unsaved');pass(phase);
 phase='reconnection obtains the required CSRF context and saves once; the server checkpoint survives a slow reload';
 await mobile.cdp.send('Network.emulateNetworkConditions',network);
 await page.getByRole('button',{name:'保存答案',exact:true}).click();await expect(page.getByText('答案已保存。',{exact:true})).toBeVisible();
 assert.equal(requestIds.length,1);
 const after=await(await mobile.context.request.get(base+'/api/attempts/'+attemptId+'/questions')).json();assert.equal(after.answers.length,before.answers.length+1);
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});await expect(page.getByRole('radio').nth(1)).toBeChecked();
 const restored=await(await mobile.context.request.get(base+'/api/attempts/'+attemptId+'/questions')).json();assert.deepEqual(restored.answers,after.answers);
 await fits();await screenshot('mobile-slow-reload-saved-checkpoint');pass(phase);await mobile.context.close();
 assert.deepEqual(pageErrors,[]);assert.deepEqual(externalRequests,[]);assert.ok(sessions.every(s=>s.servedFromCache===0));
 await writeFile(join(output,'verification.json'),JSON.stringify({passed:true,checks,screens,network,timings,sessions,pageErrors,externalRequests,
  browserVersion:browser.version(),uiAcceptance:'autonomous verification',userApprovedScreens:false,
  actualWrites:'isolated TEST Nest API; offline CSRF prerequisite failure sends no PUT, reconnection sends one save',
  referenceReads:'APIRequestContext reads bypass browser throttling and only check real server state',
  coldScope:'new browser contexts, empty/disabled HTTP cache, blocked service workers, new test process and Nest instance, newly started prebuilt Vite preview',
  notValidated:['public internet','cloud/container/VM cold start','cold database or operating-system disk cache','physical phone','embedded browser','real Auth'],cloudCalls:0,modelCalls:0},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length,screens:screens.length,timings}));
}catch(error){
 await writeFile(join(evidence,'failure.json'),JSON.stringify({phase,message:String(error),checks,sessions},null,2)+'\n');
 if(page)await page.screenshot({path:join(evidence,'failure.png'),fullPage:true}).catch(()=>{});
 console.error(JSON.stringify({phase,message:String(error)}));process.exitCode=1;
}finally{
 await browser?.close();await new Promise(resolve=>preview?.httpServer?preview.httpServer.close(resolve):resolve());await app?.close();await fixture?.close();
 if(directory)await rm(directory,{recursive:true,force:true});
}
