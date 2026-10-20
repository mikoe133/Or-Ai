import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' });
const failures = [];
page.on('pageerror', error => failures.push(String(error)));
const shots = [];
try {
  for (const [name, route] of [['product', '/products/partner'], ['answer', '/assessment/partner?preview=answer'], ['feedback', '/assessment/partner?preview=feedback'], ['report', '/reports/partner'], ['redeem', '/redeem']]) {
    await page.goto('http://127.0.0.1:5173' + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `output/implementation/store-flow/desktop-${name}.png`, fullPage: true });
    shots.push({ name, geometry: await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, content: { width: document.querySelector('.flow-content').getBoundingClientRect().width, height: document.querySelector('.flow-content').getBoundingClientRect().height }, images: [...document.images].filter(i => i.getBoundingClientRect().width).map(i => ({ source: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0, width: i.getBoundingClientRect().width, height: i.getBoundingClientRect().height })), fragments: [...document.querySelectorAll('use')].map(u => ({ source: u.getAttribute('href'), bounds: (()=> {const b = u.getBBox(); return { x:b.x,y:b.y,width:b.width,height:b.height };})() })) })) });
  }
  await page.setViewportSize({ width: 384, height: 832 });
  for (const [name, route] of [['product', '/products/partner'], ['answer', '/assessment/partner?preview=answer'], ['feedback', '/assessment/partner?preview=feedback'], ['report', '/reports/partner']]) {
    await page.goto('http://127.0.0.1:5173' + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `output/implementation/store-flow/mobile-${name}.png`, fullPage: true });
  }
  await writeFile('output/implementation/store-flow/initial-capture.json', JSON.stringify({shots, failures}, null, 2));
  console.log(JSON.stringify({ failures, captures: 9, geometry: shots.map(s => ({name: s.name, width:s.geometry.width, height:s.geometry.height, missing:s.geometry.images.filter(i=>!i.loaded).length, emptyVectors:s.geometry.fragments.filter(i=>!i.bounds.width || !i.bounds.height).map(i=>i.source)})) }));
} finally { await browser.close(); }
