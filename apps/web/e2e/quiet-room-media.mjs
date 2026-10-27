import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {chromium,expect} from 'playwright/test';
import {sample,copy} from '../../../examples/social-battery-room/sample.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url)),output=join(root,'.local/t16-a/media');
const rehearse=process.argv.includes('--rehearse'),base='http://127.0.0.1:5173';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
let context;
try{
  if(!rehearse){const proof=JSON.parse(await readFile(join(output,'rehearsal.json'),'utf8'));assert.equal(proof.passed,true);}
  context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce',...(rehearse?{}:{recordVideo:{dir:output,size:{width:1280,height:720}}})});
  const page=await context.newPage(),started=Date.now(),scenes=[];
  await page.goto(base+'/preview/experience/quiet-room');await expect(page.locator('[data-experience-template="quiet-room@1"]')).toBeVisible();
  const controls=await page.locator('button,input,a').evaluateAll(elements=>elements.map(element=>({tag:element.tagName,type:element.getAttribute('type'),label:element.getAttribute('aria-label'),text:element.textContent?.trim()})));
  await writeFile(join(output,'controls.json'),JSON.stringify(controls,null,2)+'\n');
  const artwork=await page.locator('.room-art').evaluate(node=>node.outerHTML);
  async function subtitle(text){if(rehearse)return;await page.evaluate(text=>{
    let bar=document.getElementById('recording-caption');if(!bar){bar=document.createElement('div');bar.id='recording-caption';bar.style.cssText='position:fixed;bottom:0;left:0;right:0;padding:15px 24px;background:#3c3349;color:#fff;text-align:center;font:16px "PingFang SC",sans-serif;z-index:99999;pointer-events:none';document.body.append(bar);}bar.textContent=text;
  },text);}
  async function click(locator){await expect(locator).toBeVisible();await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:12});if(!rehearse)await page.waitForTimeout(450);await locator.click();if(!rehearse)await page.waitForTimeout(1500);}
  if(!rehearse){await page.evaluate(()=>{
    const cursor=document.createElement('div');cursor.style.cssText='position:fixed;width:24px;height:24px;pointer-events:none;z-index:999999;filter:drop-shadow(1px 1px 2px #0004)';
    cursor.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 3 19 12 12 13 9 20Z" fill="white" stroke="#3c3349" stroke-width="1.5"/></svg>';
    document.body.append(cursor);document.addEventListener('mousemove',event=>{cursor.style.left=event.clientX+'px';cursor.style.top=event.clientY+'px';});
  });await page.waitForTimeout(1500);}
  const begin=Date.now()-started;await subtitle(copy.blocks[0].text);
  await page.locator('.quiet-room').evaluate(node=>node.scrollIntoView({block:'start',behavior:'smooth'}));if(!rehearse)await page.waitForTimeout(1800);
  scenes.push({sceneId:'opening',startMs:begin,endMs:Date.now()-started,text:copy.blocks[0].text,source:'hook'});
  for(let index=0;index<2;index++){
    const startMs=Date.now()-started;await expect(page.getByRole('heading',{name:sample.questions[index].text,exact:true})).toBeVisible();
    await subtitle(`0${index+1} / ${sample.questions[index].text}`);
    await click(page.getByRole('button',{name:'选择选项 3：经常如此',exact:true}));
    await click(page.getByRole('button',{name:'保存答案',exact:true}));
    await expect(page.getByRole('status')).toContainText(`已确认 ${index+1}/6`);
    scenes.push({sceneId:'question-'+(index+1),startMs,endMs:Date.now()-started,text:sample.questions[index].text,source:sample.questions[index].id});
    if(index===0)await click(page.getByRole('button',{name:'下一题',exact:true}));
  }
  const reportStart=Date.now()-started;await subtitle('03 / 把理解，留成一页手记。');
  await click(page.getByRole('button',{name:'查看报告版式样例',exact:true}));
  await expect(page.locator('[data-report-template="field-notes@1"]')).toBeVisible();
  await page.locator('.field-notes').evaluate(node=>node.scrollIntoView({block:'start',behavior:'smooth'}));if(!rehearse)await page.waitForTimeout(1600);
  await subtitle(copy.blocks[2].text);if(!rehearse)await page.waitForTimeout(2200);
  scenes.push({sceneId:'closing',startMs:reportStart,endMs:Date.now()-started,text:copy.blocks[2].text,source:'cta'});
  if(rehearse){await writeFile(join(output,'rehearsal.json'),JSON.stringify({passed:true,controls:controls.length,questions:2,report:true},null,2)+'\n');}
  const video=page.video();await context.close();context=null;
  if(video){await rename(await video.path(),join(output,'quiet-room-demo.webm'));await writeFile(join(output,'storyboard.json'),JSON.stringify({scenes,note:'本地设计样例录屏；报告为固定排版样本，不是当前练习的计算结果'},null,2)+'\n');}
  const cover=await browser.newPage({viewport:{width:1080,height:1440},deviceScaleFactor:1});
  await cover.setContent(`<html lang="zh-CN"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f8f5ee;color:#3c3349;font-family:"PingFang SC",sans-serif}.poster{height:1440px;padding:65px 80px;display:flex;flex-direction:column;border:1px solid #d4cbd9}.brand{font-size:17px;letter-spacing:5px;color:#776b7e}.edition{font-size:15px;letter-spacing:3px;margin-top:45px;color:#776b7e}h1{font-family:"Songti SC",serif;font-size:83px;line-height:1.5;font-weight:400;letter-spacing:5px;margin:26px 0 18px}.hook{font-size:29px;letter-spacing:3px;margin:0;color:#705584}.art{margin:10px 0;width:100%;height:660px;display:flex;align-items:center}.art svg{width:100%;height:100%}.footer{border-top:1px solid #d4cbd9;margin-top:auto;padding-top:28px;display:flex;justify-content:space-between;align-items:center;font-size:20px;letter-spacing:2px}.note{font-size:14px;color:#776b7e;margin-top:22px;letter-spacing:1px}</style></head><body><div class="poster"><div class="brand">MEETMYWORLD / THE QUIET ROOM</div><div class="edition">一间留给自己的小屋 · 本地试点</div><h1>社交电量小屋</h1><p class="hook">需要独处，不等于不在意。</p><div class="art">${artwork}</div><div class="footer"><span>六个小问题 / 一页观察手记</span><span>给自己一点余地 ↗</span></div><div class="note">仅供娱乐与自我观察 · 非正式商品</div></div></body></html>`);
  await cover.screenshot({path:join(output,'quiet-room-cover.png')});await cover.close();
  const names=['quiet-room-cover.png',...(!rehearse?['quiet-room-demo.webm']:[])],files=[];
  for(const name of names){const bytes=await readFile(join(output,name));const byteSize=(await stat(join(output,name))).size;assert.ok(byteSize<(name.endsWith('.png')?400*1024:3*1024*1024));files.push({fileName:name,byteSize,checksum:createHash('sha256').update(bytes).digest('hex')});}
  await writeFile(join(output,rehearse?'rehearsal-files.json':'media-manifest.json'),JSON.stringify({profile:'social-battery-room',source:'manual_local_screen_recording',files},null,2)+'\n');
  process.stdout.write(JSON.stringify({passed:true,mode:rehearse?'rehearsal':'recording',files})+'\n');
}finally{await context?.close();await browser.close();}
