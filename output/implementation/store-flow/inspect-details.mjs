import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:768,height:1024},reducedMotion:'reduce'});
try {
 await page.goto('http://127.0.0.1:5173/reports/partner',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('.report-dimension')].map(card=>{const parent=card.getBoundingClientRect();const number=card.querySelector('.report-dimension-value').getBoundingClientRect();const label=card.querySelector('.report-dimension-value > span').getBoundingClientRect();return {name:card.querySelector('h3').textContent,cardWidth:parent.width,numberWidth:number.width,labelRight:label.right-parent.x,overflow:label.right>parent.right-3}})),null,2));
} finally {await browser.close();}
