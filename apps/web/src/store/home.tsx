import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link, useNavigate } from './preview-router';
import { categories, coverFor, filterProducts, products, readFavorites, saveFavorites, type PreviewProduct } from './catalog';
import { Icon, type IconName } from './icons';
import { GlassFrame } from './glass-frame';
import { AmbientGlows } from './ambient-glows';
import { PerspectiveWireframes } from './perspective-wireframe';
import { ProductCard, StoreGreeting } from './primitives';
import { readAssessmentPreview } from './preview-state';
import './fonts.css';
import './home.css';

type Info = 'space' | 'apps' | 'reports' | 'redeem' | 'continue' | 'help' | 'contact' | 'notifications';
type Modal = { product: PreviewProduct } | { info: Info };
const infoCopy: Record<Info, { title: string; description: string }> = {
  space: { title: '我的空间', description: '用邮箱账户归集已绑定的应用与报告，也可以先收藏感兴趣的测试。' },
  apps: { title: '我的应用', description: '当前为商城设计预览，应用列表暂未开放。你的应用将显示在这里，方便开始或继续测试。' },
  reports: { title: '我的报告', description: '当前为商城设计预览，报告列表暂未开放。完成测试后，可以在这里回看自己的发现。' },
  redeem: { title: '使用兑换码', description: '在购买平台获得兑换码后，即可领取对应应用，无需先注册账户。当前可以使用示例码 DEMO-XXXX-XXXX 预览领取流程；请妥善保留真实兑换码。' },
  continue: { title: '继续上次测试', description: '当前为商城设计预览，还没有可继续的测试。正式体验时，你可以从“我的应用”继续已开始的测试。' },
  help: { title: '从一个问题开始', description: '选择感兴趣的场景，了解测试内容，再使用对应兑换码开始体验。趣味自测仅供娱乐与自我观察。' },
  contact: { title: '联系我们', description: '支持入口尚未开放。如需购买平台的订单帮助，请通过原购买平台联系售后。' },
  notifications: { title: '消息通知', description: '当前为商城设计预览，消息通知暂未开放。' },
};

function useDesignScale(ref: RefObject<HTMLDivElement | null>, width: number, height: number, prefix: string) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      element.style.setProperty(`--${prefix}-x`, String(element.clientWidth / width));
      element.style.setProperty(`--${prefix}-y`, String(element.clientHeight / height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, width, height, prefix]);
}

function Search({ query, onChange, inputRef, mobile = false }: {
  query: string; onChange: (value: string) => void; inputRef: RefObject<HTMLInputElement | null>; mobile?: boolean;
}) {
  return <div className={`store-search${mobile ? ' store-search-mobile' : ''}`} role="search">
    <Icon name="search" size={mobile ? 22 : 20} />
    <input ref={inputRef} type="search" aria-label="搜索测试、场景或关键词" placeholder={mobile ? '搜索测试' : '搜索测试、场景或关键词'} value={query} maxLength={100} onChange={event => onChange(event.target.value)} />
    {query ? <button type="button" className="store-clear-search" aria-label="清除搜索" onClick={() => onChange('')}>×</button>
      : mobile ? <Icon name="search-star" size={24} /> : <kbd>⌘ K</kbd>}
  </div>;
}

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (params.get('q') ?? '').slice(0, 100);
  const selectedCategory = categories.some(item => item.id === params.get('category')) ? params.get('category')! : 'all';
  const isFavorites = params.get('view') === 'favorites';
  const [favorites, setFavorites] = useState(readFavorites);
  const [modal, setModal] = useState<Modal | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [ambient, setAmbient] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [latestFirst, setLatestFirst] = useState(true);
  const desktopSearch = useRef<HTMLInputElement>(null), mobileSearch = useRef<HTMLInputElement>(null);
  const dialogTrigger = useRef<HTMLElement | null>(null);
  const page = useRef<HTMLDivElement>(null);
  useDesignScale(page, 1440, 1024, 'scene');

  useEffect(() => {
    const product = products.find(item => item.id === params.get('product'));
    if (!product) return;
    if (product.id === 'partner') { navigate('/products/partner', { replace: true }); return; }
    setModal({ product });
    const next = new URLSearchParams(params);
    next.delete('product');
    setParams(next, { replace: true });
  }, [params, setParams, navigate]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        (window.matchMedia('(max-width: 767px), (max-width: 1023px) and (max-height: 500px) and (orientation: landscape)').matches ? mobileSearch : desktopSearch).current?.focus();
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  const filtered = filterProducts(query, selectedCategory, isFavorites ? favorites : undefined);
  const isBrowsing = !query.trim() && selectedCategory === 'all' && !isFavorites;
  const latest = products.filter(product => !product.featured);
  const featured = isBrowsing ? products.filter(product => product.featured) : filtered;

  function updateSearch(value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  }
  function selectCategory(id: string) {
    const next = new URLSearchParams(window.location.search);
    if (id === 'all') next.delete('category'); else next.set('category', id);
    setParams(next, { replace: true });
  }
  function selectView(favorite: boolean) {
    const next = new URLSearchParams(window.location.search);
    next.delete('q'); next.delete('category');
    if (favorite) next.set('view', 'favorites'); else next.delete('view');
    setParams(next);
  }
  function openModal(value: Modal) {
    if ('product' in value && value.product.id === 'partner') { navigate('/products/partner'); return; }
    if ('info' in value && value.info === 'apps') { navigate('/assessment/partner'); return; }
    if ('info' in value && value.info === 'reports') { navigate('/reports/partner'); return; }
    if ('info' in value && value.info === 'continue' && readAssessmentPreview().answers.some(answer => answer !== null)) { navigate('/assessment/partner'); return; }
    dialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setModal(value);
  }
  function randomProduct() {
    const pool = filtered.length ? filtered : [...products];
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    openModal({ product: pool[value[0]! % pool.length]! });
  }
  function toggleFavorite(product: PreviewProduct) {
    const exists = favorites.includes(product.id);
    const next = exists ? favorites.filter(id => id !== product.id) : [...favorites, product.id];
    setFavorites(next);
    const persisted = saveFavorites(next);
    setAnnouncement(`${exists ? '已取消收藏' : '已收藏'}${product.name}${persisted ? '' : '；浏览器无法保存，收藏仅在本次页面中有效'}`);
  }
  const railButton = (icon: IconName, label: string, action: () => void, active = false) => <button type="button" className={`store-rail-button${active ? ' is-active' : ''}`} aria-label={label} title={label} aria-pressed={['grid', 'heart', 'bookmark'].includes(icon) ? active : undefined} onClick={action}><Icon name={icon} /></button>;

  return <div ref={page} className={`store-home${collapsed ? ' is-collapsed' : ''}${ambient ? '' : ' is-quiet'}`}>
    <a className="store-skip-link" href="#catalog-content">跳到商城内容</a>
    <div className="store-scene" aria-hidden="true">
      <div className="store-scene-native">
        <img src="/assets/store/ambient-orbits.svg" alt="" width="1440" height="1024" />
        <AmbientGlows />
        <img src="/assets/store/top-right-lilac-glow.svg" alt="" width="1440" height="360" />
      </div>
    </div>
    <div className="store-mobile-scene" aria-hidden="true"><img src="/assets/store/mobile-atmosphere.svg" alt="" width="384" height="832" /></div>
    <header className="store-header">
      <Link className="store-brand" to="/" aria-label="MeetMyWorld 商城首页"><img src="/assets/store/homepage-meetmyworld-symbol.svg" alt="" width="40" height="40" /></Link>
      <Link className="store-mobile-brand" to="/" aria-label="Or-Ai 商城首页"><img src="/assets/store/mobile-account-mark.svg" alt="" width="25" height="25" /><span>Or-Ai</span></Link>
      <span className="store-breadcrumb-separator">/</span><span className="store-breadcrumb">发现</span>
      <Search query={query} onChange={updateSearch} inputRef={desktopSearch} />
      <div className="store-header-actions">
        <button type="button" className="store-appearance" aria-label="切换氛围光" title="切换氛围光" aria-pressed={ambient} onClick={() => setAmbient(value => !value)}><Icon name="moon" /></button>
        <button type="button" className="store-button store-button-secondary" onClick={() => openModal({ info: 'space' })}>我的空间</button>
        <Link className="store-button store-button-primary" to="/auth/login">登录 / 注册</Link>
        <Link className="store-header-plus" aria-label="输入兑换码" to="/redeem"><Icon name="plus" size={24} /></Link>
      </div>
      <div className="store-mobile-account"><button type="button" aria-label="消息通知" onClick={() => openModal({ info: 'notifications' })}><img src="/assets/store/mobile-notification.svg" alt="" width="25" height="25" /></button><Link to="/account" aria-label="我的账户"><span className="store-mobile-avatar"><img src="/assets/store/mobile-avatar-source.png" alt="" width="36" height="36" /></span></Link></div>
    </header>
    <StoreGreeting />
    <Search query={query} onChange={updateSearch} inputRef={mobileSearch} mobile />
    <div className="store-workspace">
      <img className="store-left-light" src="/assets/store/left-edge-bright-exterior.svg" alt="" width="74" height="370" aria-hidden="true" />
      <nav className="store-rail store-rail-left" aria-label="快捷导航">
        {railButton('grid', '发现应用', () => selectView(false), !isFavorites)}
        {railButton('heart', '我的收藏', () => selectView(true), isFavorites)}
        {railButton('file', '我的报告', () => openModal({ info: 'reports' }))}
        <span className="store-rail-spacer" />
        {railButton('headphones', '联系我们', () => openModal({ info: 'contact' }))}
      </nav>
      <div className="store-panel">
        <div className="store-panel-scene" aria-hidden="true">
          <div className="store-panel-native"><img src="/assets/store/panel-surface-soft-upper-left.svg" alt="" width="1296" height="800" /></div>
          <div className="store-sidebar-tint-native"><img src="/assets/store/sidebar-transition-soft-base.svg" alt="" width="266" height="800" /></div>
          <div className="store-panel-native"><img src="/assets/store/glass-tint-transparent-right.svg" alt="" width="1296" height="800" /></div>
        </div>
        <PerspectiveWireframes animated={ambient} />
        <GlassFrame />
        <aside className="store-sidebar" aria-label="我的空间">
          <div className="store-sidebar-heading"><h2>我的空间</h2><button type="button" aria-label={collapsed ? '展开侧栏' : '收起侧栏'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><Icon name="chevron" size={16} /></button></div>
          <nav className="store-personal-nav" aria-label="空间导航">
            <button type="button" aria-label="应用商城" className={!isFavorites ? 'is-current' : ''} aria-current={!isFavorites ? 'page' : undefined} onClick={() => selectView(false)}><Icon name="bag" /><span>应用商城</span><i /></button>
            <button type="button" aria-label="我的应用" onClick={() => openModal({ info: 'apps' })}><Icon name="grid" /><span>我的应用</span></button>
            <button type="button" aria-label="我的报告" onClick={() => openModal({ info: 'reports' })}><Icon name="file" /><span>我的报告</span></button>
            <button type="button" aria-label="我的收藏" className={isFavorites ? 'is-current' : ''} aria-current={isFavorites ? 'page' : undefined} onClick={() => selectView(true)}><Icon name="bookmark" /><span>我的收藏</span><i /></button>
            <button type="button" aria-label="使用帮助" onClick={() => openModal({ info: 'help' })}><Icon name="help" /><span>使用帮助</span></button>
          </nav>
          <div className="store-redeem"><h3>一份报告，一点新发现</h3><p>在购买平台获得兑换码，<br />来到这里，开始认识自己。</p><Link className="store-button store-button-primary" to="/redeem">输入兑换码</Link><small>无需登录，也能兑换与查看报告</small></div>
        </aside>
        <main id="catalog-content" className="store-content" tabIndex={-1}>
          <div className="store-toolbar">
            <nav className="store-filters" aria-label="商品分类"><button type="button" className={selectedCategory === 'all' ? 'is-selected' : ''} aria-pressed={selectedCategory === 'all'} onClick={() => selectCategory('all')}>全部</button>{categories.map(category => <button key={category.id} type="button" className={`category-${category.id}${selectedCategory === category.id ? ' is-selected' : ''}`} aria-pressed={selectedCategory === category.id} onClick={() => selectCategory(category.id)}>{category.name}</button>)}</nav>
            <div className="store-quick-actions"><button type="button" className="store-button store-button-secondary" onClick={() => openModal({ info: 'continue' })}>继续上次测试<Icon name="clock" size={18} /></button><button type="button" className="store-button store-button-primary" onClick={randomProduct}>随机发现<Icon name="sparkles" size={18} /></button></div>
          </div>
          {!isBrowsing && <div className="store-results-heading"><h2>{isFavorites ? '我的收藏' : query.trim() ? '搜索结果' : categories.find(item => item.id === selectedCategory)!.name}</h2><span role="status">{filtered.length} 个设计预览</span><button type="button" onClick={() => { selectView(false); }}>查看全部</button></div>}
          <section className={`store-featured${isBrowsing ? '' : ' store-filtered-grid'}`} aria-label={isFavorites ? '收藏的测试' : '精选测试'} tabIndex={isBrowsing ? 0 : undefined}>
            {featured.map(product => <ProductCard key={product.id} product={product} onOpen={value => openModal({ product: value })} />)}
            {!featured.length && <div className="store-empty"><Icon name={isFavorites ? 'bookmark' : 'search'} size={32} /><h3>{isFavorites ? '还没有收藏的测试' : '没有找到匹配的测试'}</h3><p>{isFavorites ? '打开喜欢的测试，点击收藏，留给下一次探索。' : '试试其他关键词，或看看全部场景。'}</p><button type="button" className="store-button store-button-primary" onClick={() => selectView(false)}>发现测试<Icon name="arrow" size={16} /></button></div>}
          </section>
          {isBrowsing && <>
            <section className="store-section store-scenarios"><div className="store-section-heading"><h2>按场景发现</h2><button type="button" onClick={() => { selectCategory('all'); document.getElementById('store-scenarios')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }); }}>查看全部<Icon name="arrow" size={16} /></button></div><div id="store-scenarios" className="store-scenario-grid">{categories.map(category => <button key={category.id} type="button" className={`store-scenario tone-${category.tone} category-${category.id}`} onClick={() => selectCategory(category.id)}><span className="store-scenario-title"><Icon name={category.icon} size={18} />{category.name}</span><span className="store-scenario-headline">{category.headline}</span><span className="store-scenario-description">{category.description}</span></button>)}</div></section>
            <section className="store-section store-latest"><div className="store-section-heading"><h2>最新上架</h2><button type="button" onClick={() => setLatestFirst(value => !value)} aria-label={latestFirst ? '切换为推荐优先' : '切换为最新优先'}>{latestFirst ? '最新优先' : '推荐优先'}<Icon name="arrow" size={16} /></button></div><div className="store-latest-grid">{(latestFirst ? latest : [...latest].reverse()).map(product => <ProductCard key={product.id} product={product} compact onOpen={value => openModal({ product: value })} />)}</div></section>
          </>}
          <div className="store-content-note"><span>趣味自测，仅供娱乐与自我观察。</span><span>兑换码领取 · 支持匿名体验</span></div>
        </main>
      </div>
      <nav className="store-rail store-rail-right" aria-label="商城工具">
        {railButton('bookmark', '我的收藏', () => selectView(true), isFavorites)}
        <Link className="store-rail-button" aria-label="输入兑换码" title="输入兑换码" to="/redeem"><Icon name="plus" /></Link>
        {railButton('sparkles', '随机发现', randomProduct)}
        <span className="store-rail-spacer" />{railButton('help', '使用帮助', () => openModal({ info: 'help' }))}
      </nav>
    </div>
    <footer className="store-footer"><span>meetmyworld © 2026</span><span className="store-footer-promise">每一个小问题，都藏着一点新的自己。</span><small>设计预览 · 商品与价格为演示</small><nav aria-label="帮助导航"><button type="button" onClick={() => openModal({ info: 'help' })}>使用帮助</button><span>/</span><button type="button" onClick={() => openModal({ info: 'redeem' })}>兑换说明</button><span>/</span><button type="button" onClick={() => openModal({ info: 'contact' })}>联系我们</button></nav></footer>
    <nav className="store-mobile-nav" aria-label="手机主导航"><button type="button" className={!isFavorites ? 'is-current' : ''} aria-current={!isFavorites ? 'page' : undefined} onClick={() => selectView(false)}><Icon name="home" size={22} /><span>发现</span></button><button type="button" onClick={() => openModal({ info: 'apps' })}><Icon name="game" size={22} /><span>应用</span></button><button type="button" onClick={() => openModal({ info: 'reports' })}><Icon name="report" size={22} /><span>报告</span></button><Link to="/account"><Icon name="profile" size={22} /><span>我的</span></Link></nav>
    <p className="sr-only" aria-live="polite" role="status">{announcement}</p>
    <Dialog.Root open={modal !== null} onOpenChange={open => { if (!open) setModal(null); }}><Dialog.Portal><Dialog.Overlay className="store-dialog-overlay" /><Dialog.Content className="store-dialog" onCloseAutoFocus={event => { event.preventDefault(); dialogTrigger.current?.focus(); }}>
      <Dialog.Close className="store-dialog-close" aria-label="关闭弹窗">×</Dialog.Close>
      {modal && 'product' in modal ? <><img className="store-dialog-cover" src={coverFor(modal.product)} alt="" width="1161" height="1355" /><div className="store-dialog-body"><span className="store-preview-label">商品设计预览</span><Dialog.Title>{modal.product.name}</Dialog.Title><Dialog.Description>{modal.product.hook}。{modal.product.details}。</Dialog.Description><p className="store-dialog-notice">当前展示的是设计稿中的演示内容与价格，暂未开放购买和测试。</p><div className="store-dialog-actions">{modal.product.id === 'partner' && <Link className="store-button store-button-primary" to="/redeem">输入兑换码</Link>}<button type="button" className="store-button store-button-secondary" aria-pressed={favorites.includes(modal.product.id)} onClick={() => toggleFavorite(modal.product)}><Icon name="bookmark" size={18} />{favorites.includes(modal.product.id) ? '已收藏 · 取消收藏' : '收藏这个测试'}</button><Dialog.Close className="store-button store-button-secondary">继续逛逛</Dialog.Close></div></div></>
        : modal && 'info' in modal ? <div className="store-dialog-body"><span className="store-preview-label">meetmyworld</span><Dialog.Title>{infoCopy[modal.info].title}</Dialog.Title><Dialog.Description>{infoCopy[modal.info].description}</Dialog.Description>{modal.info === 'space' ? <div className="store-dialog-actions"><Dialog.Close asChild><Link className="store-button store-button-primary" to="/auth/login">登录 / 注册</Link></Dialog.Close><Dialog.Close asChild><button type="button" className="store-button store-button-secondary" onClick={() => selectView(true)}>查看我的收藏</button></Dialog.Close></div> : <Dialog.Close className="store-button store-button-primary">知道了</Dialog.Close>}</div> : null}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
