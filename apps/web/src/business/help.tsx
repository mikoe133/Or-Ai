import { Link } from 'react-router-dom';
import { Page } from './shared';

export function NotFoundPage() {
  return <Page title="页面不存在"><p>这条地址暂时找不到内容。你可以回到商城继续探索，或查看已经领取的应用。</p><nav className="biz-row" aria-label="返回可用页面"><Link className="biz-button consumer-primary" to="/">返回商城</Link><Link to="/apps">我的应用</Link><Link to="/help">使用帮助</Link></nav></Page>;
}

export default function HelpPage() {
  return <Page title="使用帮助" section="help" embedded>
    <p>从一个问题开始，在这里找到探索、兑换和查看报告的方法。</p>
    <section className="biz-card">
      <h2>选择感兴趣的测试</h2>
      <p>在应用商城按场景浏览，查看题目数量、预计时长与公开报告样例，找到想了解的生活倾向。</p>
      <Link to="/">前往应用商城</Link>
    </section>
    <section className="biz-card">
      <h2>领取或恢复应用</h2>
      <p>在购买平台获得兑换码后，输入完整兑换码即可领取应用，无需先注册。未绑定的应用可通过兑换码换设备恢复，请妥善保管。</p>
      <Link to="/redeem">输入兑换码</Link>
    </section>
    <section className="biz-card">
      <h2>继续测试与查看报告</h2>
      <p>在“我的应用”开始或继续作答，完成后前往“我的报告”查看结果。本机未绑定商品与账户已绑定商品分别显示，登录不会自动合并。</p>
      <nav className="biz-row" aria-label="应用与报告帮助"><Link to="/apps">我的应用</Link><Link to="/reports">我的报告</Link><Link to="/account">账户与绑定</Link></nav>
    </section>
    <p className="biz-note">趣味自测仅供娱乐与自我观察，不作为诊断或专业建议。订单核对与资金退款，请联系原购买平台。</p>
  </Page>;
}
