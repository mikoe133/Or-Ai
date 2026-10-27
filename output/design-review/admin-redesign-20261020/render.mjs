import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const pages=JSON.parse(await readFile(path.join(root,'pages.json'),'utf8'));
const args=process.argv.slice(2);
const subset=args[0]?args[0].split(','):pages.map(p=>p.id);
const styles=args[1]?args[1].split(','):['a','b','c','d'];
const browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
const tab=await browser.newPage({viewport:{width:1600,height:1080},deviceScaleFactor:1});
const issues=[];const records=[];
tab.on('pageerror',e=>issues.push(String(e)));
await mkdir(path.join(root,'screens'),{recursive:true});
await mkdir(path.join(root,'full'),{recursive:true});
for(const id of subset){for(const style of styles){
 await tab.setViewportSize({width:1600,height:1080});
 await tab.goto(`http://127.0.0.1:5186/screen.html?page=${id}&style=${style}`);
 await tab.waitForSelector('html[data-ready="true"]',{state:'attached'});
 const check=await tab.evaluate(()=>({title:document.title,bodyWidth:document.body.scrollWidth,viewport:innerWidth,mainWidth:document.querySelector('.main-scroll').clientWidth,mainScrollWidth:document.querySelector('.main-scroll').scrollWidth,contentHeight:document.querySelector('.workspace').scrollHeight,selected:document.querySelectorAll('.nav-item.active').length,badImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,visibleText:document.querySelector('.page-content').textContent.length}));
 await tab.screenshot({path:path.join(root,'screens',`${id}-${style}.png`)});
 const fullHeight=Math.max(1080,check.contentHeight+(style==='b'?48:60)+(style==='d'?65:0)+4);
 await tab.setViewportSize({width:1600,height:fullHeight});
 await tab.screenshot({path:path.join(root,'full',`${id}-${style}.png`)});
 records.push({id,style,fullHeight,...check});
 console.log(`${id}-${style}: ${check.contentHeight}px`);
}}
await writeFile(path.join(root,args[0]?'sample-verification.json':'verification.json'),JSON.stringify({size:[1600,1080],count:records.length,issues,records},null,2));
await browser.close();
