const styleDefinitions = [
  { id: 'a', title: '纸感编辑紫', detail: '暖白纸面 · 连续文档与旁注', tone: '浅色探索' },
  { id: 'b', title: '精密工具紫', detail: '冷炭灰 · 紧凑分栏与工具密度', tone: '工具效率' },
  { id: 'c', title: '柔雾创作紫', detail: '浅薰衣草 · 舒展创作工作面', tone: '浅色探索' },
  { id: 'd', title: '深茄夜间工作台', detail: '暖深紫 · 稳定工作区与命令栏', tone: '品牌延续' },
];
const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const urlFor = (file, params = {}) => {
  const url = new URL(file, location.href);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.href;
};
let pages = [], prompts = {}, concepts = [], selectedId = 'skill-assessment-editor', mode = 'pages', search = '', toastTimeout, promptUrl;
const dialog = byId('prompt-dialog');
async function readJson(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error(`无法读取 ${file}（${response.status}）`);
  return response.json();
}
function notify(message) {
  const toast = byId('gallery-toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2500);
}
function currentPage() { return pages.find(page => page.id === selectedId) || pages[0]; }
function readLocation() {
  const query = new URLSearchParams(location.search);
  const requested = query.get('page');
  selectedId = pages.some(page => page.id === requested) ? requested : 'skill-assessment-editor';
  if (!pages.some(page => page.id === selectedId)) selectedId = pages[0]?.id;
  mode = query.get('view') === 'concepts' ? 'concepts' : 'pages';
}
function writeLocation() {
  const url = new URL(location.href);
  url.searchParams.set('page', selectedId);
  if (mode === 'concepts') url.searchParams.set('view', 'concepts'); else url.searchParams.delete('view');
  if (url.href !== location.href) history.pushState(null, '', url);
}
function renderNavigation() {
  const filtered = pages.filter(page => `${page.title} ${page.section} ${page.id} ${page.purpose} ${page.route}`.toLowerCase().includes(search.toLowerCase()));
  const groups = new Map();
  filtered.forEach(page => {
    if (!groups.has(page.section)) groups.set(page.section, []);
    groups.get(page.section).push(page);
  });
  byId('page-count').textContent = search ? `${filtered.length} / ${pages.length}` : String(pages.length);
  byId('page-nav').innerHTML = groups.size ? [...groups].map(([section, entries]) => `<div class="nav-group"><h2>${escapeHtml(section)}</h2>${entries.map(page => `<a href="${escapeHtml(urlFor('index.html', { page: page.id }))}" data-page="${escapeHtml(page.id)}" ${page.id === selectedId ? 'aria-current="page"' : ''}><span class="page-number">${String(pages.indexOf(page) + 1).padStart(2, '0')}</span><span>${escapeHtml(page.title)}</span></a>`).join('')}</div>`).join('') : '<p class="empty-message">没有匹配的页面。<br>试试“报告”“MCP”或“订单”。</p>';
}
function renderCards(page) {
  byId('comparison-grid').innerHTML = styleDefinitions.map(style => {
    const imagePath = mode === 'concepts' ? `concepts/${style.id}.png` : `screens/${page.id}-${style.id}.png`;
    const title = `${style.id.toUpperCase()} · ${style.title}`;
    return `<article class="design-card note-${style.id}"><header class="card-heading"><div class="card-identity"><span class="style-letter">${style.id.toUpperCase()}</span><div><h3>${escapeHtml(style.title)}</h3><p>${escapeHtml(style.detail)}</p></div></div><span class="image-kind">${mode === 'concepts' ? '生成式参考' : '精确中文设计'}</span></header><a class="preview-link" href="${imagePath}" target="_blank" rel="noopener" aria-label="放大查看${escapeHtml(title)}${mode === 'pages' ? ' · ' + escapeHtml(page.title) : '风格参考'}"><img src="${imagePath}" alt="${escapeHtml(title)} · ${mode === 'concepts' ? '题库与报告 skill 库风格参考' : escapeHtml(page.title)}" loading="lazy" decoding="async"><span class="preview-fallback">此图片尚未载入。<br>可以先打开完整页面或查看提示词。</span></a><div class="card-actions">${mode === 'pages' ? `<a class="prototype-link" href="${escapeHtml(urlFor('screen.html', { page: page.id, style: style.id }))}" target="_blank" rel="noopener">打开完整页面 ↗</a><a href="${imagePath}" target="_blank" rel="noopener">首屏 PNG</a><a href="full/${page.id}-${style.id}.png" target="_blank" rel="noopener">完整长图</a>` : `<a class="image-link" href="${imagePath}" target="_blank" rel="noopener">查看参考原图 ↗</a>`}<button type="button" data-prompt="${style.id}">查看 / 复制提示词</button></div></article>`;
  }).join('');
  byId('comparison-grid').querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => img.parentElement.classList.add('image-unavailable'), { once: true });
    img.addEventListener('load', () => img.parentElement.classList.remove('image-unavailable'), { once: true });
  });
}
function render() {
  const page = currentPage();
  if (!page) return;
  renderNavigation();
  const index = pages.indexOf(page);
  byId('coverage-count').textContent = `${pages.length * 4} 张逐页设计`;
  byId('tab-pages').querySelector('span').textContent = String(pages.length * 4);
  document.querySelectorAll('[data-mode]').forEach(button => {
    const active = button.dataset.mode === mode;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  byId('comparison-panel').setAttribute('aria-labelledby', mode === 'pages' ? 'tab-pages' : 'tab-concepts');
  byId('selected-section').textContent = mode === 'pages' ? `${page.section} · 页面 ${String(index + 1).padStart(2, '0')}` : '独立风格探索 · 4 张生成式参考';
  byId('selected-title').textContent = mode === 'pages' ? page.title : '从同一张 skill 页面，看四种视觉性格。';
  byId('selected-purpose').textContent = mode === 'pages' ? page.purpose : '以题库与报告 skill 库为统一场景，比较字体、配色、分栏和整体氛围。';
  byId('selected-index').textContent = `${String(index + 1).padStart(2, '0')} / ${pages.length}`;
  byId('page-stepper').hidden = mode !== 'pages';
  byId('previous-page').disabled = index === 0;
  byId('next-page').disabled = index === pages.length - 1;
  byId('view-explanation').textContent = mode === 'pages' ? '128 张逐页设计采用精确中文排版。PNG 用于比较首屏；打开完整页面后，可以滚动查看后续内容。' : '这 4 张由图像生成制作，用于讨论视觉方向；与 128 张逐页设计分开呈现。中文细节与功能结构以精确排版稿为准。';
  document.title = `${mode === 'pages' ? page.title : '四种风格参考'} · 后台设计画册 · meetmyworld`;
  renderCards(page);
}
function selectPage(id) {
  if (!pages.some(page => page.id === id)) return;
  selectedId = id;
  mode = 'pages';
  writeLocation();
  render();
}
function selectMode(value) {
  mode = value === 'concepts' ? 'concepts' : 'pages';
  writeLocation();
  render();
}
function openPrompt(styleId) {
  const style = styleDefinitions.find(value => value.id === styleId);
  const page = currentPage();
  const value = mode === 'concepts' ? concepts.find(concept => concept.id === styleId)?.prompt : prompts[page.id]?.[styleId];
  if (!value || !style) return notify('该提示词暂时无法读取，请查看提示词全集。');
  byId('prompt-title').textContent = `${mode === 'concepts' ? '风格参考' : page.title} · ${style.id.toUpperCase()} ${style.title}`;
  byId('prompt-description').textContent = mode === 'concepts' ? '生成式关键页的完整提示词，可独立复制到图像生成工具中。' : '包含本页任务、实际业务约束、状态、导航、布局、颜色与反 AI 设计要求。';
  byId('prompt-text').value = value;
  byId('prompt-length').textContent = `${value.length.toLocaleString('zh-CN')} 字符 · 完整提示词`;
  byId('copy-prompt').textContent = '复制提示词';
  if (promptUrl) URL.revokeObjectURL(promptUrl);
  promptUrl = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }));
  byId('prompt-download').href = promptUrl;
  byId('prompt-download').download = mode === 'concepts' ? `concept-${style.id}.txt` : `${page.id}-${style.id}.txt`;
  dialog.showModal();
  byId('prompt-text').scrollTop = 0;
  byId('close-prompt').focus();
}
byId('page-nav').addEventListener('click', event => {
  const anchor = event.target.closest('[data-page]');
  if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  selectPage(anchor.dataset.page);
});
byId('page-search').addEventListener('input', event => { search = event.target.value.trim(); renderNavigation(); });
document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => selectMode(button.dataset.mode));
  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectMode(mode === 'pages' ? 'concepts' : 'pages');
      byId(mode === 'pages' ? 'tab-pages' : 'tab-concepts').focus();
    }
  });
});
byId('comparison-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-prompt]');
  if (button) openPrompt(button.dataset.prompt);
});
byId('previous-page').addEventListener('click', () => { const index = pages.indexOf(currentPage()); if (index > 0) selectPage(pages[index - 1].id); });
byId('next-page').addEventListener('click', () => { const index = pages.indexOf(currentPage()); if (index < pages.length - 1) selectPage(pages[index + 1].id); });
byId('close-prompt').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const box = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
});
byId('copy-prompt').addEventListener('click', async () => {
  const text = byId('prompt-text');
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text.value);
    else {
      text.focus(); text.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
      text.setSelectionRange(0, 0);
    }
    byId('copy-prompt').textContent = '已复制';
    notify('完整提示词已复制');
  } catch {
    text.focus(); text.select();
    byId('copy-prompt').textContent = '请按 ⌘C / Ctrl+C';
    notify('浏览器未允许自动复制，已选中全文');
  }
});
window.addEventListener('popstate', () => { readLocation(); render(); });
document.addEventListener('keydown', event => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
  if (event.key === '/' && !typing && !dialog.open) { event.preventDefault(); byId('page-search').focus(); }
});
try {
  [pages, prompts, concepts] = await Promise.all([readJson('./pages.json'), readJson('./prompts.json'), readJson('./concept-prompts.json')]);
  readLocation();
  render();
  document.documentElement.dataset.ready = 'true';
} catch (error) {
  const message = error instanceof Error ? error.message : '未知错误';
  byId('comparison-grid').innerHTML = `<div class="error-message">设计数据未能载入：${escapeHtml(message)}。<br>请通过本地静态服务打开，运行 <code>node serve.mjs</code> 后重试。<br><a href="./README.md">查看启动说明 ↗</a></div>`;
  byId('page-nav').innerHTML = '<p class="empty-message">页面目录暂时无法读取。</p>';
}
