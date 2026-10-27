import { renderContent } from './content-renderer.js';
const pages = await fetch('./pages.json').then(r=>r.json());
const query = new URLSearchParams(location.search);
const page = pages.find(p=>p.id===query.get('page')) || pages[0];
const style = ['a','b','c','d'].includes(query.get('style')) ? query.get('style') : 'd';
const labels = {a:'纸感编辑紫',b:'精密工具紫',c:'柔雾创作紫',d:'深茄夜间'};
const nav = [
 ['概览与审计','overview','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
 ['商品与版本','products-list','M4 7h16v14H4z M8 7V3h8v4 M4 12h16'],
 ['内容工作台','content-list','M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5'],
 ['素材与文件','media-list','M3 5h18v15H3z M3 16l5-6 5 5 3-3 5 5 M16 8h.01'],
 ['skill 库','skills-assessment','M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h3'],
 ['MCP 连接','machine-list','M8 3v5 M16 3v5 M5 8h14v4a7 7 0 0 1-14 0z M12 19v3'],
 ['订单与售后','orders-list','M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3']
];
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${p?`<path d="${p}"/>`:''}</svg>`;
const href = id=>`screen.html?page=${id}&style=${style}`;
let section=page.section;
if(page.id.startsWith('skill')) section='skill 库';
if(page.id.startsWith('machine')) section='MCP 连接';
if(page.id.startsWith('order')) section='订单与售后';
if(page.id.startsWith('media')) section='素材与文件';
if(page.id.startsWith('product')) section='商品与版本';
if(page.id.startsWith('content')) section='内容工作台';
const related = pages.filter(p=>p.section===page.section || (page.id.startsWith('content-')&&p.id.startsWith('content-')&&p.id!=='content-list'));
const contentTabs = [['content-profile','创作设定'],['content-bindings','Skill 组合'],['content-assessment','题库与报告'],['content-cover','封面'],['content-video','视频'],['content-copy','文案'],['content-preview','整套预览'],['content-references','引用'],['content-adoption','成套采用'],['content-cleanup','文件清理']];
const domainTabs = [['assessment','题库与报告'],['cover','封面'],['video','视频'],['copy','引流文案']];
const primary=page.primary||'保存草稿';
const access=page.id==='access';
const actions=access?'':`${page.secondary?`<button class="button">${esc(page.secondary)}</button>`:''}<button class="button primary">${esc(primary)} <span>↗</span></button>`;
document.body.className=`style-${style} page-${page.id} kind-${page.kind||'detail'}`;
document.title=`${page.title} · ${labels[style]} · MeetMyWorld`;
document.getElementById('app').innerHTML=`
 <aside class="sidebar">
  <a href="${href('overview')}" class="brand"><img src="assets/mark.svg" alt=""><span>meetmyworld<small>运营后台</small></span></a>
  <div class="nav-label">工作空间 <span>01</span></div>
  <nav ${access?'aria-label="登录后可访问的栏目" class="locked-nav"':''}>${nav.map(([label,id,path],i)=>`<a ${access?'aria-disabled="true"':`href="${href(id)}"`} class="nav-item ${section===label?'active':''}">${icon(path)}<span>${label}</span><small>${String(i+1).padStart(2,'0')}</small></a>`).join('')}</nav>
  <div class="sidebar-bottom"><div class="workspace-owner"><div class="avatar">M</div><div>${access?'尚未登录':'内容运营'}<small>本地工作空间</small></div><span>⌄</span></div><a href="./index.html?page=${page.id}">← 返回设计画册</a><span class="edition">${style.toUpperCase()} / ${labels[style]}</span></div>
 </aside>
 <header class="topbar"><div class="breadcrumb">运营后台 <span>/</span> ${esc(section)} ${page.title!==section?`<span>/</span> <strong>${esc(page.title)}</strong>`:''}</div><div class="top-meta"><span class="env-dot"></span>本地环境<span class="top-separator"></span><span>${access?'未登录':'管理员'}</span><div class="avatar tiny">M</div></div></header>
 <main class="main-scroll">
  <div class="workspace">
   <div class="page-heading"><div><div class="page-eyebrow">MEETMYWORLD <span> / </span> ${style==='b'?'OPERATIONS':'CONTENT STUDIO'}</div><h1>${esc(page.title)}</h1><p>${esc(page.purpose)}</p></div>${style==='d'?'':`<div class="page-actions">${actions}</div>`}</div>
   ${page.id.startsWith('content-')&&page.id!=='content-list'?`<nav class="context-tabs">${contentTabs.map(([id,t])=>`<a href="${href(id)}" class="${id===page.id?'active':''}">${t}</a>`).join('')}</nav>`:''}
   ${page.id.startsWith('skill')?`<nav class="context-tabs domain-tabs">${domainTabs.map(([id,t])=>`<a href="${href('skills-'+id)}" class="${page.id.includes(id)?'active':''}">${t}</a>`).join('')}</nav>`:''}
   <div class="page-content">${renderContent(page,style)}</div>
   <footer class="canvas-footer"><span>MEETMYWORLD / 运营设计研究</span><span>设计提案 · 所有内容均为示例 · ${String(pages.indexOf(page)+1).padStart(2,'0')} / 32</span></footer>
  </div>
 </main>
 ${style==='d'?`<div class="command-bar"><div><span class="env-dot"></span> ${access?'登录后进入运营工作空间':page.id.includes('editor')?'独立版本 · 修改前核对当前状态':'工作内容独立保存'}<small>设计示例</small></div><div class="page-actions">${actions}</div></div>`:''}
 <div class="mockup-toast" role="status"></div>`;
document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
 const toast=document.querySelector('.mockup-toast');toast.textContent='这是设计提案，操作未连接业务数据。';toast.classList.add('visible');clearTimeout(window.toastTimeout);window.toastTimeout=setTimeout(()=>toast.classList.remove('visible'),2200);
}));
await document.fonts.ready;
document.documentElement.dataset.ready='true';
