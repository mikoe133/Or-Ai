import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.ORAI_PLAYWRIGHT_PATH || '/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const directory = fileURLToPath(new URL('./', import.meta.url));
const base = process.env.ORAI_PREVIEW_URL || 'http://127.0.0.1:5173';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], checks = [], responsive = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const loaded = async route => {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
};
const settled = async () => { await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready); };
const progress = async value => assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), String(value));
const saved = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('meetmyworld:assessment-preview:v1')));
const snapshot = async name => { await settled(); await page.screenshot({path: directory + name + '.png', fullPage: true}); };
const geometry = async () => page.evaluate(() => {
  const rect = element => { const r = element.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height}; };
  return {
    viewport: {width: innerWidth, height: innerHeight}, pageWidth: document.documentElement.scrollWidth,
    panel: rect(document.querySelector('.store-panel')), content: rect(document.querySelector('.flow-content')),
    cards: [...document.querySelectorAll('.flow-card, .assessment-question, .assessment-feedback, .redemption-card, .redemption-tips, .wide-hero, .store-product-related')].map(rect),
    actions: [...document.querySelectorAll('.assessment-question-actions button')].map(rect),
    assets: [...document.images].filter(i => i.getBoundingClientRect().width > 0).map(i => ({source: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0, naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight, ...rect(i)})),
    fragments: [...document.querySelectorAll('svg use')].filter(u => u.ownerSVGElement.getBoundingClientRect().width > 0).map(u => ({source: u.getAttribute('href'), slot: rect(u.ownerSVGElement), bounds: (() => { try { const b = u.getBBox(); return {x: b.x, y: b.y, width: b.width, height: b.height}; } catch { return null; } })()})),
  };
});
try {
  await loaded('/');
  assert.deepEqual(await page.locator('.store-panel').evaluate(e => { const r = e.getBoundingClientRect(); return {x:r.x, y:r.y, width:r.width}; }), {x:72,y:180,width:1296});
  await snapshot('homepage-regression');
  await page.getByRole('button', {name:'查看伴侣协作体检', exact:true}).click();
  await page.waitForURL('**/products/partner'); await page.locator('.product-navigation').waitFor(); await settled();
  assert.equal(await page.locator('h1').innerText(), '伴侣协作体检');
  await page.getByRole('button', {name:'收藏测评', exact:true}).click();
  assert.equal(await page.getByRole('button', {name:'已收藏', exact:true}).getAttribute('aria-pressed'), 'true');
  await loaded('/?view=favorites');
  await page.getByRole('button', {name:'查看伴侣协作体检', exact:true}).click();
  await page.waitForURL('**/products/partner'); await page.locator('.product-navigation').waitFor(); await settled();
  await loaded('/?product=partner');
  await page.waitForURL('**/products/partner'); await page.locator('.product-navigation').waitFor(); await settled();
  await page.getByRole('link', {name:'查看购买说明', exact:true}).click();
  assert.equal(new URL(page.url()).hash, '#purchase-instructions');
  await page.waitForFunction(() => scrollY > 0);
  assert.ok(await page.locator('#purchase-instructions').evaluate(e=> e.getBoundingClientRect().top) < 1024);
  await page.locator('.product-purchase-actions').getByRole('link', {name:'输入兑换码', exact:true}).click();
  await page.waitForURL('**/redeem'); await settled();
  await page.getByRole('link', {name:'返回商品详情', exact:true}).click();
  await page.waitForURL('**/products/partner'); await page.locator('.product-navigation').waitFor(); await settled();
  await page.locator('.product-purchase-actions').getByRole('link', {name:'输入兑换码', exact:true}).click();
  await page.waitForURL('**/redeem'); await settled();
  checks.push('home and favorites open product; legacy product URL; instructions anchor; product/redemption return links');
  await page.getByRole('button', {name:'确认兑换', exact:true}).click();
  assert.match(await page.getByRole('alert').innerText(), /请先输入/);
  await page.getByRole('textbox', {name:'兑换码', exact:true}).fill('unsubmitted-preview-code');
  await page.getByRole('button', {name:'确认兑换', exact:true}).click();
  assert.match(await page.getByRole('alert').innerText(), /当前为设计预览/);
  assert.ok(!(await page.evaluate(() => JSON.stringify({...localStorage}))).includes('unsubmitted-preview-code'));
  await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=> '  demo-xxxx-xxxx  '}}));
  await page.getByRole('button', {name:'粘贴', exact:true}).click();
  assert.equal(await page.getByRole('textbox', {name:'兑换码', exact:true}).inputValue(),'demo-xxxx-xxxx');
  await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>{throw new Error('denied')}}}));
  await page.getByRole('button', {name:'粘贴', exact:true}).click();
  assert.match(await page.locator('.redemption-input-feedback').innerText(), /Ctrl \/ ⌘ \+ V/);
  await page.getByRole('button', {name:'确认兑换', exact:true}).click();
  await page.waitForURL('**/redeem/success');
  await snapshot('desktop-success');
  await page.getByRole('link', {name:'开始测评', exact:true}).click();
  await page.waitForURL('**/assessment/partner'); await page.locator('.assessment-product').waitFor(); await settled();
  await progress(0);
  assert.equal(await page.getByRole('button', {name:'确认选择', exact:true}).isDisabled(),true);
  await page.locator('.assessment-option').nth(1).click();
  await page.getByRole('radio').nth(1).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('radio').nth(2).isChecked(),true);
  assert.equal(await page.locator('input[type=radio]:checked').count(),1);
  await progress(0);
  await page.getByRole('button', {name:'确认选择', exact:true}).click();
  await progress(1);
  assert.equal(await page.locator('.assessment-feedback').count(),1);
  assert.match(await page.locator('.assessment-feedback').innerText(), /120 份其他有效回答/);
  assert.match(await page.locator('.assessment-feedback').innerText(), /80 份其他有效答卷/);
  await page.getByRole('button', {name:'收起群体反馈', exact:true}).click();
  assert.equal(await page.locator('.assessment-feedback').count(),0);
  await page.getByRole('button', {name:'展开群体反馈'}).click();
  await page.getByRole('button', {name:'修改本题', exact:true}).click();
  await page.locator('.assessment-option').nth(0).click();
  assert.equal((await saved()).answers[0],2);
  await page.getByRole('button', {name:'取消修改', exact:true}).click();
  assert.equal(await page.getByRole('radio').nth(2).isChecked(),true);
  await page.getByRole('button', {name:'修改本题', exact:true}).click();
  await page.locator('.assessment-option').nth(1).click();
  await page.getByRole('button', {name:'确认选择', exact:true}).click();
  await progress(1);
  assert.equal((await saved()).answers[0],1);
  checks.push('redemption validation, clipboard and navigation; keyboard single select; confirmed-only progress; distinct sample denominators; feedback collapse; edit/cancel/confirm');
  await page.getByRole('button', {name:'下一题', exact:true}).click();
  await page.locator('.assessment-option').nth(0).click();
  await page.getByRole('button', {name:'退出测评', exact:true}).click();
  assert.match(await page.getByRole('dialog').innerText(), /尚未确认的选择不会保存/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'退出测评', exact:true}).click();
  await page.getByRole('button', {name:'保存进度并退出', exact:true}).click();
  await page.waitForURL(base + '/'); await page.locator('.store-toolbar').waitFor(); await settled();
  await page.getByRole('button', {name:'继续上次测试'}).click();
  await page.waitForURL('**/assessment/partner'); await page.locator('.assessment-product').waitFor(); await settled();
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('.assessment-question-header').innerText(), /02 \/ 16/);
  await progress(1);
  assert.equal(await page.locator('input[type=radio]:checked').count(),0);
  await page.getByRole('button', {name:'上一题', exact:true}).click();
  assert.equal(await page.getByRole('radio').nth(1).isChecked(),true);
  await page.getByRole('button', {name:'下一题', exact:true}).click();
  checks.push('pause/resume; reload restores confirmed answers and current question; previous/next retains selections');
  for(let index=1;index<16;index++) {
    await page.locator('.assessment-option').nth(index%4).click();
    await page.getByRole('button', {name:'确认选择', exact:true}).click();
    await progress(index+1);
    await page.getByRole('button', {name:index===15?'查看完整报告':'下一题', exact:true}).click();
  }
  await page.waitForURL('**/reports/partner'); await page.locator('.report-navigation').waitFor(); await settled();
  assert.equal((await saved()).completed,true);
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('.report-analysis-row').count(),5);
  assert.equal(await page.locator('.report-action').count(),3);
  assert.match(await page.locator('.report-overall-score').innerText(),/78.80/);
  for(const [index,score] of [82,76,80,68,88].entries()) assert.equal(await page.locator('.report-dimension-value strong').nth(index).innerText(),score.toFixed(2));
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'保存分享卡',exact:true}).click();
  const download=await downloadPromise;
  await download.saveAs(directory+'share-card.png');
  assert.equal(await download.failure(),null);
  await page.getByRole('button',{name:'返回我的报告',exact:true}).click();
  assert.match(await page.getByRole('dialog').innerText(),/公开示例报告/);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'重新体验示例',exact:true}).click();
  await page.getByRole('button',{name:'保留当前进度',exact:true}).click();
  assert.equal((await saved()).completed,true);
  await page.getByRole('button',{name:'重新体验示例',exact:true}).click();
  await page.getByRole('button',{name:'从第 1 题开始',exact:true}).click();
  await page.waitForURL('**/assessment/partner'); await page.locator('.assessment-product').waitFor(); await settled();
  await progress(0);
  checks.push('all sixteen confirmations enter report; five score values and advice; PNG share download; report dialog; explicit restart resets only preview progress');
  await page.locator('.assessment-option').nth(2).click();
  await page.getByRole('button',{name:'确认选择',exact:true}).click();
  const userState=await saved();
  await loaded('/assessment/partner?preview=answer');
  await progress(4);
  await snapshot('desktop-answer');
  await page.getByRole('button',{name:'确认选择',exact:true}).click();
  await progress(5);
  assert.deepEqual(await saved(),userState);
  await loaded('/assessment/partner?preview=feedback');
  await progress(5);
  await snapshot('desktop-feedback');
  await page.getByRole('button',{name:'收起侧栏',exact:true}).click();
  assert.equal(await page.locator('.store-sidebar').evaluate(e=>e.getBoundingClientRect().width),88);
  await page.getByRole('button',{name:'展开侧栏',exact:true}).click();
  const search=page.getByRole('searchbox');
  await page.keyboard.press('Meta+k');
  assert.equal(await search.evaluate(e=>e===document.activeElement),true);
  await search.fill('伴侣'); await search.press('Enter');
  await page.waitForURL('**/?q=*');
  assert.match(await page.locator('.store-results-heading').innerText(),/搜索结果/);
  checks.push('Figma preview states do not overwrite saved progress; collapse/expand sidebar; search shortcut and return to catalog');
  const restricted=await browser.newContext({viewport:{width:384,height:832},reducedMotion:'reduce'});
  await restricted.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('blocked')}}));
  const blockedPage=await restricted.newPage();
  await blockedPage.goto(base+'/assessment/partner',{waitUntil:'networkidle'});
  assert.match(await blockedPage.getByRole('alert').innerText(),/浏览器无法保存进度/);
  await blockedPage.locator('.assessment-option').nth(0).click();
  await blockedPage.getByRole('button',{name:'确认选择',exact:true}).click();
  assert.equal(await blockedPage.getByRole('progressbar').getAttribute('aria-valuenow'),'1');
  await blockedPage.getByRole('button',{name:'退出测评',exact:true}).click();
  assert.match(await blockedPage.getByRole('dialog').innerText(),/离开.*丢失|退出后无法恢复/);
  await restricted.close();
  checks.push('blocked storage remains usable and reports loss of progress honestly');
  console.log(JSON.stringify({stage:'interactive checks passed',groups:checks.length}));
  const sizes=[[320,740],[359,800],[384,832],[430,932],[600,900],[768,1024],[844,390],[1024,900],[1199,900],[1200,900],[1279,900],[1280,800],[1440,1024],[1920,1080]];
  const routes=[['product','/products/partner'],['redeem','/redeem'],['success','/redeem/success'],['answer','/assessment/partner?preview=answer'],['feedback','/assessment/partner?preview=feedback'],['report','/reports/partner']];
  for(const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    for(const [name,route] of routes) {
      await loaded(route);
      const state=await geometry();
      responsive.push({name,route,...state});
      assert.ok(state.pageWidth<=width,`overflow: ${route} at ${width}: ${state.pageWidth}`);
      assert.ok(state.assets.every(a=>a.loaded&&a.width>0&&a.height>0),`missing image: ${route} at ${width}`);
      assert.ok(state.fragments.every(a=>a.bounds&&a.bounds.width>0&&a.bounds.height>0),`missing fragment: ${route} at ${width}`);
      assert.ok(state.cards.every(c=>c.x>=state.content.x-1&&c.x+c.width<=state.content.x+state.content.width+1),`card outside main: ${route} at ${width}`);
      assert.ok(state.cards.every(c=>c.y+c.height<=state.panel.y+state.panel.height+1),`card outside panel: ${route} at ${width}`);
      if(state.actions.length) {
        const card=await page.locator('.assessment-question').boundingBox();
        assert.ok(state.actions.every(c=>c.x>=card.x-1&&c.x+c.width<=card.x+card.width+1),`answer action overflow: ${route} at ${width}`);
      }
      if(width===384||width===768||width===1440) await snapshot(`${width===1440?'desktop':width===384?'mobile':'tablet'}-${name}`);
      if(width===384&&(name==='product'||name==='report')) {
        await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
        const bottom=await page.locator('.flow-note').last().boundingBox();
        const nav=await page.locator('.store-mobile-nav').boundingBox();
        assert.ok(bottom.y+bottom.height<=nav.y+1,`bottom content under mobile nav: ${route}`);
      }
    }
    console.log(JSON.stringify({stage:'responsive',width,cases:6}));
  }
  await writeFile(directory+'responsive-checks.json',JSON.stringify(responsive,null,2));
  assert.deepEqual(errors,[]);
  await writeFile(directory+'verification.json',JSON.stringify({checked:new Date().toISOString(),result:'passed',interactiveGroups:checks,responsiveCases:responsive.length,errors},null,2));
  console.log(JSON.stringify({result:'passed',interactiveGroups:checks.length,responsiveCases:responsive.length,errors,screenshots:directory}));
} catch(error) {
  await writeFile(directory+'verification-failure.json',JSON.stringify({error:String(error),checks,responsive,errors},null,2));
  await page.screenshot({path:directory+'failure.png',fullPage:true});
  throw error;
} finally { await browser.close(); }
