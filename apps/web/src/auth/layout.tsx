import {Suspense, useEffect} from 'react';
import {Link, Outlet, useLocation} from 'react-router-dom';
import {FlowShell} from '../store/flow-shell';
import {Icon} from '../store/icons';
import {Loading} from '../business/shared';

const titles: Record<string, string> = {
  '/auth/login': '邮箱登录', '/auth/register': '注册邮箱账户', '/auth/forgot': '找回密码',
  '/auth/callback': '验证邮箱', '/auth/reset': '重置密码', '/account': '账户状态',
};

export default function AuthLayout() {
  const {pathname} = useLocation();
  useEffect(() => {
    document.title = (titles[pathname] ?? '账户') + ' · MeetMyWorld';
    document.getElementById('flow-content')?.scrollTo(0, 0);
  }, [pathname]);
  return <FlowShell live long section="account">
    <div className="consumer-auth">
      <nav className="consumer-auth-topnav" aria-label="主导航"><Link to="/">商城</Link><Link to="/account">账户</Link><Link to="/help">帮助</Link></nav>
      <section className="biz-view consumer-view consumer-auth-surface" aria-label="账户与个人空间">
        <div className="consumer-auth-mark"><Icon name="profile" size={22}/><span>我的空间</span></div>
        <Suspense fallback={<Loading label="正在加载账户页面…"/>}><Outlet/></Suspense>
      </section>
      <p className="consumer-auth-footnote">本机商品与邮箱账户独立保存，绑定始终由你主动确认。</p>
    </div>
  </FlowShell>;
}
