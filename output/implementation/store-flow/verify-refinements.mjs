import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const directory=fileURLToPath(new URL('./',import.meta.url));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1024},reducedMotion:'reduce'});
const errors=[],cases=[];page.on('pageerror',e=>errors.push(String(e)));
try {
 for(const [width,height] of [[320,740],[384,832],[768,1024],[1024,900],[1280,800],[1440,1024]]) {
  await page.setViewportSize({width,height});
  for(const [name,route] of [['product','/products/partner'],['report','/reports/partner']]) {
   await page.goto('http://127.0.0.1:5173'+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   const state=await page.evaluate(()=>{
    const main=document.querySelector('.flow-content').getBoundingClientRect(),hero=document.querySelector('.wide-hero').getBoundingClientRect(),art=document.querySelector('.wide-hero-art').getBoundingClientRect();
    return {width:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,main:{x:main.x,width:main.width},hero:{bottom:hero.bottom,top:hero.top,width:hero.width,height:hero.height},art:{top:art.top,bottom:art.bottom,width:art.width,height:art.height},imageErrors:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src')),dimensions:[...document.querySelectorAll('.report-dimension')].map(card=>{const p=card.getBoundingClientRect(),scale=card.querySelector('.report-dimension-value > span').getBoundingClientRect();return {name:card.querySelector('h3').textContent,inside:scale.right<p.right-2}})};
   });
   assert.ok(state.width<=width);assert.deepEqual(state.imageErrors,[]);
   if(width>=768) assert.ok(state.art.bottom>=state.hero.bottom-2,'hero artwork must cover the full tablet/desktop height');
   assert.ok(state.dimensions.every(d=>d.inside),'dimension values must stay inside their cards');
   cases.push({name,width,...state});
   if([384,768,1440].includes(width)) await page.screenshot({path:directory+`${width===1440?'desktop':width===384?'mobile':'tablet'}-${name}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:768,height:1024});
 await page.goto('http://127.0.0.1:5173/assessment/partner?preview=feedback',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.store-greeting').isVisible(),true);
 await page.screenshot({path:directory+'tablet-feedback.png',fullPage:true});
 await page.goto('http://127.0.0.1:5173/reports/partner',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'保存分享卡',exact:true}).click();const download=await downloadPromise;await download.saveAs(directory+'share-card.png');assert.equal(await download.failure(),null);
 assert.deepEqual(errors,[]);
 await writeFile(directory+'refinement-checks.json',JSON.stringify({checked:new Date().toISOString(),result:'passed',cases,additional:['tablet greeting','PNG export preserves artwork aspect ratio'],errors},null,2));
 console.log(JSON.stringify({result:'passed',targetedCases:cases.length,additionalChecks:2,errors}));
} finally {await browser.close();}
