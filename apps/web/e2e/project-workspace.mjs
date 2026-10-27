import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {chromium,expect as playwrightExpect} from 'playwright/test';
import {projectWorkspaceFixture} from './project-workspace-fixture.mjs';
import {projectWorkspaceNavigation} from './project-workspace-navigation.mjs';

// Loopback only, existing real Auth accounts, disposable business database. No Auth gateway mock or token injection.
const root=fileURLToPath(new URL('../../../',import.meta.url)),apiRequire=createRequire(join(root,'apps/api/package.json')),webRequire=createRequire(join(root,'apps/web/package.json')),
  {Test}=apiRequire('@nestjs/testing'),{AppModule}=apiRequire('./.test-build/src/app.module.js'),{APP_CONFIG}=apiRequire('./.test-build/src/config/configuration.js'),
  {configureApp}=apiRequire('./.test-build/src/common/configure-app.js'),{createLocalFixture}=apiRequire('./.test-build/test/local-fixture.js'),
  {runAdminCommand}=apiRequire('./.test-build/scripts/admin-command.js');
const accounts=JSON.parse(await readFile(join(root,'.local/auth/operator-account.json'),'utf8')),base=accounts.siteOrigin,
  output=join(root,'output/design-review/project-workspace-g4-20261022'),privateOutput=join(root,'.local/g4-project'),expect=playwrightExpect.configure({timeout:20000});
assert.equal(base,'http://127.0.0.1:5173');
await mkdir(output,{recursive:true});await mkdir(privateOutput,{recursive:true,mode:0o700});
let fixture,app,vite,browser,directory,page,phase='setup',sample,stopping=false,held=false;const checks=[],errors=[],screens=[],serverErrors=[],http=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
async function cleanup(){if(stopping)return;stopping=true;await browser?.close();await vite?.close();await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});}
async function passed(name){checks.push(name);console.log('PASS '+name);
  const key=createHash('sha256').update('DEMO:anonymous-read-ip:127.0.0.1').digest('hex'),row=await fixture.runtime.client.requestRateBucket.findUnique({where:{keyHash:key}}).catch(()=>null);
  if(row&&row.hits>=85&&row.windowEndsAt>new Date()){console.log('WAIT respecting actual read budget');await new Promise(resolve=>setTimeout(resolve,Math.min(60_000,row.windowEndsAt-Date.now()+100)));}}
async function screenshot(name){await page.screenshot({path:join(output,name+'.png'),animations:'disabled'});screens.push(name+'.png');}
async function login(target,account){await target.goto(base+'/auth/login');await target.getByLabel('邮箱',{exact:true}).fill(account.email);await target.getByLabel('密码',{exact:true}).fill(account.password);
  await target.getByRole('button',{name:'邮箱登录',exact:true}).click();await expect(target).not.toHaveURL(/\/auth\/login/);}
const detail=()=>page.locator('.pw-inspector');
async function openModule(domain){await page.locator('.pw-directory-module').filter({hasText:sample.plan.modules.find(m=>m.definition.domain===domain).definition.title}).click();}
async function openReview(){await page.getByRole('button',{name:'检查与审核',exact:true}).click();await expect(detail().getByRole('heading',{name:'项目检查与留存',exact:true})).toBeVisible();}
async function saveReview(note){await detail().getByLabel('项目审核说明').fill(note);await detail().getByRole('button',{name:'保存审核部分稿',exact:true}).click();
  await expect(page).toHaveURL(/review=/);await page.getByRole('button',{name:'检查与审核',exact:true}).click();return new URL(page.url()).searchParams.get('review');}
async function reviewAction(label,note){await detail().getByLabel('项目审核说明').fill(note);const previous=new URL(page.url()).searchParams.get('review');await detail().getByRole('button',{name:label,exact:true}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('review')).not.toBe(previous);await page.getByRole('button',{name:'检查与审核',exact:true}).click();return new URL(page.url()).searchParams.get('review');}
try{
  process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-g4-review-'));
  const config={...fixture.configuration,assets:{...fixture.configuration.assets,driver:'local',directory}};
  assert.ok(config.auth?.url.startsWith('http://127.0.0.1:54321'));assert.ok(config.security.origins.includes(base));
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue(config).compile();app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');
  process.chdir(join(root,'apps/web'));const {createServer}=await import(pathToFileURL(webRequire.resolve('vite')).href);
  vite=await createServer({root:join(root,'apps/web'),configFile:join(root,'apps/web/vite.config.ts'),server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':await app.getUrl(),'/health':await app.getUrl()}}});await vite.listen();
  browser=await chromium.launch({headless:true,executablePath:process.env.ORAI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context=await browser.newContext({baseURL:base,viewport:{width:1600,height:1100},reducedMotion:'reduce'});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base+'/api/'))http.push({path:new URL(r.url()).pathname,status:r.status()});});
  page.on('response',r=>{if(r.url().startsWith(base+'/api/')&&r.status()>=500)serverErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
  phase='existing real Auth password login and isolated administrator grant';await login(page,accounts.operator);
  const current=await (await context.request.get(base+'/api/account/context')).json();assert.ok(current.account?.emailVerified);
  const user=await fixture.runtime.client.user.findUniqueOrThrow({where:{id:current.account.id}});
  await runAdminCommand(['grant','--supabase-user',user.supabaseUserId,'--request-id',randomUUID()],fixture.env);await page.reload();
  await expect.poll(async()=>((await (await context.request.get(base+'/api/account/context')).json()).account.role)).toBe('admin');await passed(phase);
  phase='actual fixed module data, failed video and missing original';sample=await projectWorkspaceFixture({app,fixture,root});
  const projectPath='/admin/content/'+sample.project.productId+'?tab=project&run='+sample.run.id;
  await page.goto(base+projectPath);await expect(page.getByRole('region',{name:'商品项目工作区'})).toBeVisible();await expect(page.locator('.react-flow__node-module')).toHaveCount(5);
  await openModule('experience');await expect(detail().getByText('实际校验发现缺少网页原件，需要补交。',{exact:true}).first()).toBeVisible();await screenshot('desktop-missing-original');
  await openModule('video');await expect(detail().getByText(/外部制作端申报失败/).first()).toBeVisible();await screenshot('desktop-failed-video');await passed(phase);
  phase='byte checks reject incomplete originals, then only failed modules are repaired';await openReview();await detail().getByRole('button',{name:'重新校验原件与引用',exact:true}).click();
  await expect(detail().getByText('仍有缺项，见下方检查结果。',{exact:true})).toBeVisible();const beforeIds=Object.fromEntries(Object.entries(sample.records).map(([k,v])=>[k,v.id]));
  await sample.repairExperience();await sample.repairVideo();assert.equal(sample.records.assessment.id,beforeIds.assessment);assert.equal(sample.records.cover.id,beforeIds.cover);assert.equal(sample.records.copy.id,beforeIds.copy);
  await page.getByRole('button',{name:'刷新项目 ↻',exact:true}).click();await expect(page.locator('.pw-summary')).toContainText('5 份制作记录');await openReview();await detail().getByRole('button',{name:'重新校验原件与引用',exact:true}).click();
  await expect(detail().getByText('本次结构、固定引用与原件检查通过。',{exact:true})).toBeVisible();await passed(phase);
  phase='fixed methods expand and reference attachment bytes match';const copyModule=sample.plan.modules.find(m=>m.definition.domain==='copy'),methodId=sample.methods.copy[0].snapshotId;
  await openModule('copy');await detail().getByRole('button',{name:/⌘ 文案创作/}).click();await expect(detail().getByText('本次完整方法正文',{exact:true})).toBeVisible();await expect(detail().locator('.pw-prose').last()).toContainText('检查 12');
  const download=page.waitForEvent('download');await detail().getByRole('button',{name:'取回固定版本附件',exact:true}).click();const downloaded=await download;assert.equal(sha(await readFile(await downloaded.path())),sample.files.reference.checksum);await screenshot('desktop-method-detail');await passed(phase);
  phase='method and native structured originals export their actual fixed identities';const snapshotDownload=page.waitForEvent('download');await detail().getByRole('button',{name:'取回完整方法快照',exact:true}).click();
  const exported=JSON.parse(await readFile(await (await snapshotDownload).path(),'utf8'));assert.equal(exported.id,methodId);assert.equal(exported.digest,sample.methods.copy[0].digest);assert.ok(exported.customization.effectiveInstructions.includes('检查 12'));
  await openModule('assessment');await detail().getByRole('button',{name:/▤ 结构化内容/}).first().click();const structuredDownload=page.waitForEvent('download');await detail().getByRole('button',{name:'取回此版本结构化原件',exact:true}).click();
  const structured=JSON.parse(await readFile(await (await structuredDownload).path(),'utf8'));assert.equal(structured.id,sample.drafts.assessment.revisionId);assert.equal(structured.digest,sample.drafts.assessment.digest);await passed(phase);
  phase='image, video, native report and inert original previews use actual stored bytes';await openModule('cover');await detail().getByRole('button',{name:/▤ g4-cover/}).click();await expect.poll(()=>detail().locator('img.pw-media').evaluate(n=>n.naturalWidth)).toBeGreaterThan(1);await screenshot('desktop-cover-original');
  await openModule('video');await detail().getByRole('button',{name:/▤ g4-protocol-video/}).click();await expect.poll(()=>detail().locator('video').evaluate(n=>n.readyState)).toBeGreaterThanOrEqual(1);await screenshot('desktop-video-original');
  await openModule('experience');await detail().getByRole('button',{name:'▤ 体验制作清单',exact:false}).click();await detail().getByRole('button',{name:'查看此修订的演示报告',exact:true}).click();await expect(detail().getByText('演示数据 · 非用户报告',{exact:true})).toBeVisible();await screenshot('desktop-report-preview');
  await openModule('experience');await expect(detail().getByRole('link',{name:'来源地址 · 制作原件 ↗',exact:true})).toHaveAttribute('href','https://expired.example.test/original');
  await detail().getByRole('button',{name:/▤ project-original.html/}).click();const originalDownload=page.waitForEvent('download');await detail().getByRole('button',{name:'取回此版本原件',exact:true}).click();assert.equal(sha(await readFile(await (await originalDownload).path())),sample.files.original.checksum);await passed(phase);
  phase='save, submit and human return use actual immutable review revisions';await openReview();const draftId=await saveReview('首次固定方法、输入与原件，提交人工审核。');
  const submittedId=await reviewAction('提交人工审核','核对固定原件后提交。');await detail().getByLabel('项目退回模块').selectOption(copyModule.id);await detail().getByLabel('项目退回原因').fill('将开场改成更具体的日常沟通表达。');
  const returnedId=await reviewAction('退回此模块','仅退回文案模块。');assert.notEqual(draftId,submittedId);await screenshot('desktop-returned-review');await passed(phase);
  phase='upstream revision changes mark dependent video, preserve history and block stale resubmission';await sample.reviseCopy();await detail().getByLabel('项目审核说明').fill('尝试重提旧固定稿，预期被拒绝。');
  await detail().getByRole('button',{name:'重新提交固定稿',exact:true}).click();await expect(detail().getByText(/旧提交不能批准|项目已有新稿/)).toBeVisible();assert.equal(new URL(page.url()).searchParams.get('review'),returnedId);
  await page.goto(base+projectPath);await openModule('video');await expect(detail().getByText('输入或产物已有新修订，需要复查。',{exact:true})).toBeVisible();await screenshot('desktop-needs-recheck');
  const videoFilesBefore=await fixture.runtime.client.assetFile.count({where:{productVersionId:sample.drafts.assessment.productVersionId,kind:'VIDEO'}});await sample.repairVideo();
  assert.equal(await fixture.runtime.client.assetFile.count({where:{productVersionId:sample.drafts.assessment.productVersionId,kind:'VIDEO'}}),videoFilesBefore);await passed(phase);
  phase='resubmission retains new exact outputs without publication or global method activation';await page.goto(base+'/admin/content/'+sample.project.productId+'?tab=project&plan='+sample.plan.id);await openReview();
  await saveReview('补交新的文案与受影响视频，固定下一份审核稿。');await reviewAction('提交人工审核','重新核对新版输入与原件。');const retainedId=await reviewAction('核对通过并留存','实际文件和固定方法均已核对，审核留存。');
  await expect(detail().getByText('此修订已留存，可从目录取回固定内容与原件。',{exact:true})).toBeVisible();const retained=await fixture.runtime.client.projectReviewRevision.findUniqueOrThrow({where:{id:retainedId}});assert.equal(retained.status,'retained');
  const product=await fixture.runtime.client.product.findUniqueOrThrow({where:{id:sample.project.productId}});assert.equal(product.status,'DRAFT');assert.equal(product.currentVersionId,null);
  const skillIds=(await fixture.runtime.client.machineProjectSkill.findMany({where:{productId:product.id},select:{skillId:true}})).map(s=>s.skillId);
  assert.equal(await fixture.runtime.client.styleSkillVersion.count({where:{skillId:{in:skillIds},status:'ACTIVE'}}),0);await screenshot('desktop-retained-review');await passed(phase);
  phase='old review remains readable and does not drift to the latest copy';await page.getByLabel('项目审核快照',{exact:true}).selectOption(returnedId);await openModule('copy');await detail().getByRole('button',{name:/▤ 结构化内容/}).click();
  await expect(detail().getByText('有时想聊很多，有时只想安静待一会。',{exact:true})).toBeVisible();await expect(detail().getByText('我想先安静一会，再把今天的感受慢慢告诉你。',{exact:true})).toHaveCount(0);await screenshot('desktop-historical-output');await passed(phase);
  phase='desktop canvas, search and reverse method-output navigation';await page.goto(base+'/admin/content/'+product.id+'?tab=project&review='+retainedId);await page.getByRole('button',{name:'展开引流文案文件夹',exact:true}).click();
  await expect(page.locator('.react-flow__node-method')).toHaveCount(1);await expect(page.locator('.react-flow__node-output')).toHaveCount(1);await screenshot('desktop-expanded-canvas');
  await page.locator('.pw-folder-files').getByRole('button',{name:/文案创作/}).click();await detail().getByRole('button',{name:/▤ copy/}).click();await expect(detail().getByText('固定制作来源',{exact:true})).toBeVisible();await passed(phase);
  const navigation=await projectWorkspaceNavigation({page,base,productId:product.id,retainedId,returnedId,output});screens.push(...navigation.screens);for(const check of navigation.checks)await passed(check);
  phase='forty-module overview, bounded focus, search and equivalent directory';const large=await sample.scaleProject();await page.goto(base+'/admin/content/'+large.productId+'?tab=project');await expect(page.locator('.react-flow__node-module')).toHaveCount(40);await screenshot('desktop-40-overview');
  await page.getByRole('button',{name:'聚焦模块',exact:true}).click();await expect(page.locator('.react-flow__node-module')).toHaveCount(5);await screenshot('desktop-40-focus');await page.getByRole('button',{name:'完整总览',exact:true}).click();
  await page.getByLabel('查找项目模块',{exact:true}).fill('module-39');await expect(page.locator('.pw-directory-module')).toHaveCount(1);await expect(page.locator('.react-flow__node-module')).toHaveCount(1);await page.getByRole('button',{name:'目录列表',exact:true}).click();await expect(page.locator('.pw-directory-module')).toHaveCount(1);await passed(phase);
  phase='mobile directory, long method modal and keyboard restoration';await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin/content/'+product.id+'?tab=project&review='+retainedId);
  await page.getByRole('button',{name:'目录列表',exact:true}).click();await expect(page.locator('.pw-directory-module')).toHaveCount(5);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await screenshot('mobile-directory');
  await page.locator('.pw-folder-files').getByRole('button',{name:/文案创作/}).click();const modal=page.getByRole('dialog',{name:'项目详情',exact:true});await expect(modal).toBeVisible();await expect(modal.getByText('本次完整方法正文',{exact:true})).toBeVisible();await screenshot('mobile-method-detail');
  await modal.evaluate(n=>{n.scrollTop=n.scrollHeight;});await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
  await page.getByRole('button',{name:'关系画布',exact:true}).click();await expect(page.locator('.react-flow__node-module')).toHaveCount(5);await screenshot('mobile-canvas');await passed(phase);
  phase='desktop keyboard navigation, long text and scrolling stay within the operator area';await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/admin/content/'+product.id+'?tab=project&review='+retainedId);
  const moduleButton=page.locator('.pw-directory-module').filter({hasText:'引流文案'});await moduleButton.focus();await page.keyboard.press('Enter');await expect(detail().getByRole('heading',{name:'引流文案',exact:true})).toBeVisible();
  await detail().getByRole('button',{name:/⌘ 文案创作/}).click();assert.ok(await detail().evaluate(n=>n.scrollHeight>n.clientHeight));await detail().evaluate(n=>{n.scrollTop=n.scrollHeight;});assert.equal(await page.evaluate(()=>window.scrollY),0);await passed(phase);
  phase='legacy content deep links remain editable';await page.goto(base+'/admin/content/'+product.id+'?tab=copy&version='+sample.drafts.assessment.productVersionId+'&profile='+sample.project.creativeProfileRevisionId);
  await expect(page.getByRole('navigation',{name:'内容工作台页签'}).getByRole('button',{name:'引流文案',exact:true})).toHaveAttribute('aria-current','page');await expect(page.locator('.content-workspace')).toBeVisible();await passed(phase);
  phase='real ordinary account and cross-scope project targets are refused';const readerContext=await browser.newContext({baseURL:base}),reader=await readerContext.newPage();await login(reader,accounts.ordinary);
  assert.equal((await readerContext.request.get(base+'/api/admin/products/'+product.id+'/project-workspace')).status(),403);await reader.goto(base+'/admin/content/'+product.id+'?tab=project');await expect(reader.getByText('当前账户没有已验证的管理员权限。',{exact:true})).toBeVisible();
  const raw=await fixture.owner.client.product.findUniqueOrThrow({where:{id:product.id}}),foreignId=randomUUID();await fixture.owner.client.product.create({data:{...raw,id:foreignId,slug:'g4-live-'+randomUUID(),scope:'LIVE'}});
  assert.equal((await context.request.get(base+'/api/admin/products/'+foreignId+'/project-workspace')).status(),404);await readerContext.close();await passed(phase);
  assert.deepEqual(errors,[]);assert.deepEqual(serverErrors,[]);
  await page.goto(base+'/admin/content/'+product.id+'?tab=project&review='+retainedId);await openModule('copy');await screenshot('desktop-final-project');
  const result={passed:true,realLocalAuth:true,authGatewayOverride:false,existingAccountsOnly:true,isolatedBusinessDatabase:true,checks,screens:[...new Set(screens)],pageErrors:errors,serverErrors,
    productId:product.id,planId:sample.plan.id,runId:sample.run.id,retainedId,returnedId,largeProductId:large.productId,
    reviewUrl:base+'/admin/content/'+product.id+'?tab=project&review='+retainedId,largeUrl:base+'/admin/content/'+large.productId+'?tab=project',
    scope:'local only',viewportSimulation:true,publication:false,paidGeneration:false};
  await writeFile(join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');await writeFile(join(privateOutput,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,screens:result.screens.length,pageErrors:errors.length}));
  if(process.env.ORAI_G4_HOLD==='1'){
    await browser.close();browser=null;held=true;await writeFile(join(privateOutput,'active-review.json'),JSON.stringify({pid:process.pid,database:fixture.name,reviewUrl:result.reviewUrl,largeUrl:result.largeUrl,temporary:true},null,2)+'\n',{mode:0o600});
    console.log('READY: isolated real-Auth review workspace at '+result.reviewUrl);
    await new Promise(resolve=>{process.once('SIGTERM',resolve);process.once('SIGINT',resolve);});
  }
}catch(error){await writeFile(join(privateOutput,'failure.json'),JSON.stringify({phase,errorType:error.name,message:error.message,stack:error.stack,errors,serverErrors,http:http.slice(-80)},null,2));
  if(page&&!page.isClosed()){await page.screenshot({path:join(privateOutput,'failure.png')}).catch(()=>{});await writeFile(join(privateOutput,'failure-body.txt'),await page.locator('body').innerText().catch(()=>''));}
  console.error(JSON.stringify({passed:false,phase,errorType:error.name}));process.exitCode=1;
}finally{await cleanup();if(held)await rm(join(privateOutput,'active-review.json'),{force:true});}
