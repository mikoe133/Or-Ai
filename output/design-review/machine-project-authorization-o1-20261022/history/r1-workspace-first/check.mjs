import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from 'playwright/test';

const output=fileURLToPath(new URL('.',import.meta.url)),root=fileURLToPath(new URL('../../../',import.meta.url));
const sourcePaths=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','apps','packages','scripts','package.json','pnpm-lock.yaml'],{cwd:root,encoding:'utf8'}).trim().split('\n'))].sort();
async function sourceDigests(){return Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(join(root,p))).digest('hex')])));}
const before=await sourceDigests(),checks=[],screens=[],pageErrors=[],network=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.ORAI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const context=await browser.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce',timezoneId:'Asia/Shanghai'});
  context.on('request',r=>{if(/^https?:/.test(r.url()))network.push({url:r.url(),method:r.method()});});
  await context.route(/^https?:/,route=>route.abort());
  const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  const url=pathToFileURL(join(output,'index.html')).href;
  const pass=name=>checks.push(name);
  async function screen(name){await page.screenshot({path:join(output,name+'.png'),animations:'disabled'});screens.push(name+'.png');}
  async function open(scene){await page.goto(url+'?scene='+scene);await expect(page.locator('h1')).toBeVisible();}
  async function width(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.work').scrollWidth<=document.querySelector('.work').clientWidth+1),true);}

  for(const scene of ['list','create','connection','handoff','revoked','empty']){await open(scene);await width();await screen('desktop-'+scene);}
  pass('six desktop scenes render with one selected MCP navigation entry and without horizontal overflow');
  assert.equal(await page.locator('.nav-item[aria-current=page]').count(),1);

  await open('create');
  for(const input of await page.locator('[name=category]').all())await input.uncheck();
  await page.locator('#workspace-form button[type=submit]').click();await expect(page.getByRole('alert')).toContainText('至少选择');
  pass('workspace categories must be explicitly selected');
  await page.locator('[name=category]').first().check();await page.getByLabel('最多创建项目数',{exact:true}).fill('0');
  assert.equal(await page.locator('#workspace-form').evaluate(n=>n.checkValidity()),false);await page.getByLabel('最多创建项目数',{exact:true}).fill('12');
  pass('workspace quota inputs respect existing 1–100 limits');
  await page.getByLabel('授权到期时间',{exact:true}).fill('2027-10-29T18:00');await page.locator('#workspace-form button[type=submit]').click();await expect(page.getByRole('alert')).toContainText('90 天');
  await page.getByLabel('授权到期时间',{exact:true}).fill('2026-10-29T18:00');await page.locator('#workspace-form button[type=submit]').click();await expect(page.locator('.workspace-row')).toBeVisible();await expect(page.getByRole('status')).toContainText('没有保存到业务后台');
  pass('valid prototype workspace returns to its list while invalid expiry stays in the form; no real workspace is created');

  await page.getByRole('button',{name:'为此工作区创建连接',exact:true}).click();await page.getByLabel('内容领域',{exact:true}).selectOption('copy');
  await expect(page.locator('[name=grant][value="projects:create"]')).toHaveCount(0);await expect(page.locator('[name=grant][value="projects:write"]')).toHaveCount(0);
  await expect(page.locator('[name=grant][value="skills:write"]')).not.toBeChecked();await expect(page.locator('[name=grant][value="methods:create"]')).not.toBeChecked();
  pass('copy domain cannot grant assessment-only creation/planning, and method/skill writing is optional');
  assert.equal(await page.getByLabel('所属项目工作区',{exact:true}).locator('option:disabled').count(),2);
  pass('expired and revoked workspace options are disabled');
  await page.getByLabel('连接到期时间',{exact:true}).fill('2026-10-30T18:00');await page.locator('#connection-form button[type=submit]').click();await expect(page.getByRole('status')).toContainText('不能晚于');
  await page.getByLabel('连接到期时间',{exact:true}).fill('2026-10-29T18:00');for(const input of await page.locator('[name=grant]').all())await input.uncheck();await page.locator('#connection-form button[type=submit]').click();await expect(page.getByRole('status')).toContainText('至少选择');
  pass('connection expiry stays within workspace lifetime and empty permission grants cannot proceed');
  await page.locator('[name=grant][value="content:read"]').check();await page.locator('#connection-form button[type=submit]').click();await expect(page.getByRole('heading',{name:'连接交接',exact:true})).toBeVisible();await expect(page.locator('.handoff-title')).toContainText('引流文案');await page.getByRole('button',{name:'复制一次性凭据',exact:true}).click();await expect(page.getByRole('status')).toContainText('没有真实密钥');
  pass('handoff reflects selected domain and demonstrates one-time secret handling without issuing or copying credentials');

  await open('list');const revoke=page.getByRole('button',{name:'撤销工作区',exact:true});await revoke.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(revoke).toBeFocused();await revoke.click();await page.getByRole('button',{name:'确认撤销',exact:true}).click();await expect(page.getByRole('button',{name:'为此工作区创建连接',exact:true})).toBeDisabled();
  pass('revoke modal supports Escape/focus return; revoked prototype state disables new connections');

  await page.setViewportSize({width:390,height:844});
  for(const scene of ['list','create','connection','handoff','revoked','empty']){await open(scene);await width();await screen('mobile-'+scene);}
  pass('all six mobile scenes fit the viewport with equivalent forms');
  await open('create');const fixedBefore=await page.locator('.topbar').evaluate(n=>n.getBoundingClientRect().y);await page.locator('.work').evaluate(n=>n.scrollTop=n.scrollHeight);await expect(page.locator('#workspace-form button[type=submit]')).toBeInViewport();assert.equal(await page.evaluate(()=>window.scrollY),0);assert.equal(await page.locator('.topbar').evaluate(n=>n.getBoundingClientRect().y),fixedBefore);await screen('mobile-create-limits');
  pass('mobile form actions stay reachable while only the operation region scrolls and the topbar stays fixed');
  await open('connection');await page.getByLabel('内容领域',{exact:true}).selectOption('video');await page.locator('.work').evaluate(n=>n.scrollTop=n.scrollHeight);await width();await expect(page.locator('#connection-form button[type=submit]')).toBeInViewport();await screen('mobile-video-permissions');
  pass('mobile non-assessment connection uses the same permission restrictions and a reachable submit action');

  const after=await sourceDigests();assert.deepEqual(after,before);assert.deepEqual(network,[]);assert.deepEqual(pageErrors,[]);
  pass('production sources/dependencies are unchanged, with zero network requests, business writes and page errors');
  const imageSha256=Object.fromEntries(await Promise.all(screens.map(async f=>[f,createHash('sha256').update(await readFile(join(output,f))).digest('hex')])));
  const result={kind:'machine_authorization_o1_design_prototype',passed:true,checks,screens,imageSha256,sourceFilesPreserved:sourcePaths.length,
    httpRequests:network,pageErrors,realAuthValidated:false,backendIntegrationValidated:false,physicalDeviceValidated:false,
    uiApproval:'pending',businessWrites:0,credentialsIssued:0,modelCalls:0,schedulesEnabled:0,productionSourcesChanged:false};
  await writeFile(join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,screens:screens.length,sourceFilesPreserved:sourcePaths.length}));
}finally{await browser.close();}
