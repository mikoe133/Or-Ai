import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from './preview-router';
import { GlassFrame } from './glass-frame';
import { Icon, type IconName } from './icons';
import { StoreGreeting } from './primitives';
import { AmbientGlows } from './ambient-glows';
import './fonts.css';
import './home.css';
import './flow.css';

const atmosphere = '/assets/redemption/guided-redemption-atmosphere.svg';
const help = {
  code: ['兑换码在哪里？', '完成购买后，在购买平台的订单详情或交付消息中查看兑换码，复制完整兑换码后粘贴到这里。'],
  contact: ['联系客服', '如需订单或兑换码帮助，请在原购买平台的订单详情中联系商家，方便核对订单与交付情况。'],
  guide: ['使用帮助', '输入兑换码，确认领取测评后即可开始作答。无需先登录；使用同一设备，可以继续查看自己的测评与报告。'],
  disclaimer: ['免责声明', '趣味自测仅供娱乐与自我观察，不作为诊断或专业建议。示例报告中的分数与解读仅用于展示报告的阅读方式。'],
} as const;

export function FlowShell({ children, section = 'store', greeting = false, long = false, variant = 'default', live = false }: {
  children: ReactNode; section?: 'store' | 'apps' | 'reports'; greeting?: boolean | 'compact'; long?: boolean; variant?: 'default' | 'assessment'; live?: boolean;
}) {
  const appsPath=live?'/apps':'/assessment/partner',reportsPath=live?'/reports':'/reports/partner';
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [ambient, setAmbient] = useState(true);
  const [search, setSearch] = useState('');
  const [helpTopic, setHelpTopic] = useState<keyof typeof help | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const resize = () => {
      element.style.setProperty('--scene-x', String(element.clientWidth / 1440));
      element.style.setProperty('--scene-y', String(element.clientHeight / 1024));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => { observer.disconnect(); window.removeEventListener('keydown', shortcut); };
  }, []);

  const railLink = (icon: IconName, label: string, to: string, active = false) =>
    <Link to={to} className={`store-rail-button${active ? ' is-active' : ''}`} aria-label={label} title={label}><Icon name={icon} /></Link>;

  return <div ref={page} className={`store-home store-flow${variant === 'assessment' ? ' store-assessment' : ''}${collapsed ? ' is-collapsed' : ''}${ambient ? '' : ' is-quiet'}${greeting ? ' flow-with-greeting' : ''}${long ? ' flow-long-page' : ''}`}>
    <a className="store-skip-link" href="#flow-content">跳到页面内容</a>
    <div className="store-scene" aria-hidden="true"><div className="store-scene-native">
      {variant === 'assessment' ? <svg width="1440" height="1024" aria-hidden="true"><use href={`/assets/flow/option-grid-atmosphere.svg#${encodeURIComponent('双色环境光')}`} /><use href={`/assets/flow/option-grid-atmosphere.svg#${encodeURIComponent('底部轨道网格')}`} /></svg> : greeting ? <><img src="/assets/store/ambient-orbits.svg" alt="" width="1440" height="1024" /><AmbientGlows /><img src="/assets/store/top-right-lilac-glow.svg" alt="" width="1440" height="360" /></> : <svg width="1440" height="1024" aria-hidden="true"><use href={`${atmosphere}#${encodeURIComponent('双色环境光')}`} /><use href={`${atmosphere}#${encodeURIComponent('底部轨道网格')}`} /></svg>}
    </div></div>
    <header className="store-header">
      <Link className="store-brand" to="/" aria-label="MeetMyWorld 商城首页"><img src="/assets/store/homepage-meetmyworld-symbol.svg" alt="" width="40" height="40" /></Link>
      <Link className="store-mobile-brand" to="/" aria-label="Or-Ai 商城首页"><img src="/assets/store/mobile-account-mark.svg" alt="" width="25" height="25" /><span>Or-Ai</span></Link>
      <span className="store-breadcrumb-separator">/</span><Link className="store-breadcrumb" to="/">发现</Link>
      <form className="store-search" role="search" onSubmit={event => { event.preventDefault(); navigate(search.trim() ? `/?q=${encodeURIComponent(search.trim())}` : '/'); }}>
        <Icon name="search" size={20} /><input ref={searchInput} type="search" aria-label="搜索测试、场景或关键词" placeholder="搜索测试、场景或关键词" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} /><kbd>⌘ K</kbd>
      </form>
      <div className="store-header-actions">
        <button type="button" className="store-appearance" aria-label="切换氛围光" title="切换氛围光" aria-pressed={ambient} onClick={() => setAmbient(value => !value)}><Icon name="moon" /></button>
        <Link className="store-button store-button-secondary" to="/account">我的空间</Link>
        <Link className="store-button store-button-primary" to="/auth/login">登录 / 注册</Link>
        <Link className="store-header-plus" to="/redeem" aria-label="输入兑换码"><Icon name="plus" size={24} /></Link>
      </div>
      <Link className="flow-mobile-account" to="/auth/login">登录 / 注册</Link>
    </header>
    {greeting && <StoreGreeting compact={greeting === 'compact'} headingLevel="h2" />}
    <div className="store-workspace">
      <nav className="store-rail store-rail-left" aria-label="快捷导航">
        {railLink('grid', '发现应用', '/', section !== 'reports')}{live?railLink('grid','我的应用',appsPath):railLink('heart', '我的收藏', '/?view=favorites')}{railLink('file', '我的报告', reportsPath, section === 'reports')}
        <span className="store-rail-spacer" /><button type="button" className="store-rail-button" aria-label="联系我们" onClick={() => setHelpTopic('contact')}><Icon name="headphones" /></button>
      </nav>
      <div className="store-panel">
        <div className="store-panel-scene" aria-hidden="true"><div className="flow-panel-fill" /><div className="flow-sidebar-tint"><svg width="244" height="907.4" viewBox="72 72 244 907.4"><use href={`${atmosphere}#${encodeURIComponent('侧栏渐变玻璃')}`} /></svg></div></div>
        <GlassFrame variant={greeting ? 'study' : 'guided'} />
        <aside className="store-sidebar" aria-label="我的空间">
          <div className="store-sidebar-heading"><h2>我的空间</h2><button type="button" aria-label={collapsed ? '展开侧栏' : '收起侧栏'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><Icon name="chevron" size={16} /></button></div>
          <nav className="store-personal-nav" aria-label="空间导航">
            <Link to="/" className={section === 'store' ? 'is-current' : ''} aria-current={section === 'store' ? 'page' : undefined} aria-label="应用商城"><Icon name="bag" /><span>应用商城</span><i /></Link>
            <Link to={appsPath} className={section === 'apps' ? 'is-current' : ''} aria-current={section === 'apps' ? 'page' : undefined} aria-label="我的应用"><Icon name="grid" /><span>我的应用</span><i /></Link>
            <Link to={reportsPath} className={section === 'reports' ? 'is-current' : ''} aria-current={section === 'reports' ? 'page' : undefined} aria-label="我的报告"><Icon name="file" /><span>我的报告</span><i /></Link>
            {!live&&<Link to="/?view=favorites" aria-label="我的收藏"><Icon name="bookmark" /><span>我的收藏</span></Link>}
            <button type="button" onClick={() => setHelpTopic('guide')}><Icon name="help" /><span>使用帮助</span></button>
          </nav>
          {section !== 'reports' && <div className="store-redeem"><h3>一份报告，一点新发现</h3><p>在购买平台获得兑换码，<br />来到这里，开始认识自己。</p><Link className="store-button store-button-primary" to="/redeem">输入兑换码</Link><small>无需登录，也能兑换与查看报告</small></div>}
        </aside>
        <main id="flow-content" className="flow-content" tabIndex={-1}>{children}</main>
      </div>
      <nav className="store-rail store-rail-right" aria-label="商城工具">
        {!live&&railLink('bookmark', '我的收藏', '/?view=favorites')}{railLink('plus', '输入兑换码', '/redeem')}{railLink('sparkles', '发现测试', '/')}
        <span className="store-rail-spacer" /><button type="button" className="store-rail-button" aria-label="使用帮助" onClick={() => setHelpTopic('guide')}><Icon name="help" /></button>
      </nav>
    </div>
    <footer className="store-footer"><span>meetmyworld © 2026</span><span className="store-footer-promise">每一个小问题，都藏着一点新的自己。</span>{section !== 'reports' && <small>{live?'仅供娱乐与自我观察':'设计预览 · 示例内容'}</small>}<nav aria-label="帮助导航"><button type="button" onClick={() => setHelpTopic('guide')}>使用帮助</button><span>/</span><button type="button" onClick={() => setHelpTopic(section === 'reports' ? 'disclaimer' : 'code')}>{section === 'reports' ? '免责声明' : '兑换说明'}</button><span>/</span><button type="button" onClick={() => setHelpTopic('contact')}>联系我们</button></nav></footer>
    <nav className="store-mobile-nav" aria-label="手机主导航"><Link to="/" className={section === 'store' ? 'is-current' : ''} aria-current={section === 'store' ? 'page' : undefined}><Icon name="home" size={22} /><span>发现</span></Link><Link to={appsPath} className={section === 'apps' ? 'is-current' : ''} aria-current={section === 'apps' ? 'page' : undefined}><Icon name="game" size={22} /><span>应用</span></Link><Link to={reportsPath} className={section === 'reports' ? 'is-current' : ''} aria-current={section === 'reports' ? 'page' : undefined}><Icon name="report" size={22} /><span>报告</span></Link><Link to="/account"><Icon name="profile" size={22} /><span>我的</span></Link></nav>
    <Dialog.Root open={helpTopic !== null} onOpenChange={open => { if (!open) setHelpTopic(null); }}><Dialog.Portal><Dialog.Overlay className="store-dialog-overlay" /><Dialog.Content className="store-dialog"><Dialog.Close className="store-dialog-close" aria-label="关闭帮助">×</Dialog.Close><div className="store-dialog-body"><span className="store-preview-label">meetmyworld</span><Dialog.Title>{helpTopic ? help[helpTopic][0] : ''}</Dialog.Title><Dialog.Description>{helpTopic ? help[helpTopic][1] : ''}</Dialog.Description><Dialog.Close className="store-button store-button-primary">知道了</Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
