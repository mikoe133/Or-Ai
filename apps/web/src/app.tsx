import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./store/home'));
const ProductDetailPage = lazy(() => import('./store/product-detail'));
const AssessmentPage = lazy(() => import('./store/assessment'));
const ReportPage = lazy(() => import('./store/report'));
const RedemptionPage = lazy(() => import('./store/redemption'));
const AccountPage = lazy(() => import('./auth/pages.js').then(module => ({ default: module.AccountPage })));
const AuthCallbackPage = lazy(() => import('./auth/pages.js').then(module => ({ default: module.AuthCallbackPage })));
const AuthForm = lazy(() => import('./auth/pages.js').then(module => ({ default: module.AuthForm })));
const Catalog = lazy(()=>import('./business/catalog.js').then(module=>({default:module.CatalogPage})));
const Product = lazy(()=>import('./business/catalog.js').then(module=>({default:module.ProductPage})));
const Redeem = lazy(()=>import('./business/library.js').then(module=>({default:module.RedemptionPage})));
const Library = lazy(()=>import('./business/library.js').then(module=>({default:module.LibraryPage})));
const Attempt = lazy(()=>import('./business/assessment.js').then(module=>({default:module.AssessmentPage})));
const Report = lazy(()=>import('./business/assessment.js').then(module=>({default:module.ReportPage})));
const Admin = lazy(()=>import('./admin/pages.js').then(module=>({default:module.AdminApp})));

function Help() {
  return <section className="space-y-4"><h1 className="text-2xl font-semibold">使用帮助</h1><p>在商城查看商品，使用购买平台交付的兑换码领取或恢复。未绑定商品保存在本机兑换会话；邮箱账户只展示主动绑定的商品。报告仅供娱乐与自我观察。</p><Link to="/apps">我的应用</Link><p>订单核对与资金退款请联系原购买平台。</p><Link to="/preview">查看独立设计预览</Link></section>;
}

function SupportingPages() {
  return <div className="mx-auto min-h-screen max-w-5xl px-5 py-6">
    <header className="mb-8 flex items-center justify-between border-b pb-4">
      <Link className="font-semibold" to="/">Or-Ai</Link>
      <nav className="flex gap-5" aria-label="主导航"><Link to="/">商城</Link><Link to="/account">账户</Link><Link to="/help">帮助</Link></nav>
    </header>
    <main><Suspense fallback={<p role="status">正在加载页面…</p>}><Routes>
      <Route path="/help" element={<Help />} />
      <Route path="/auth/login" element={<AuthForm key="login" mode="login" />} />
      <Route path="/auth/register" element={<AuthForm key="register" mode="register" />} />
      <Route path="/auth/forgot" element={<AuthForm key="forgot" mode="forgot" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/reset" element={<AuthCallbackPage recovery />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="*" element={<section><h1>页面不存在</h1><Link to="/">返回商城</Link></section>} />
    </Routes></Suspense></main>
  </div>;
}

export function App() {
  const location=useLocation();
  return <Suspense fallback={<p role="status" className="p-6">正在加载页面…</p>}>{location.pathname.startsWith('/preview')&&<div className="p-3 text-center">独立设计预览 · 数据为示例　<Link to="/">进入真实业务商城</Link></div>}<Routes>
    <Route path="/" element={<Catalog />} />
    <Route path="/products/:slug" element={<Product />} />
    <Route path="/redeem" element={<Redeem />} />
    <Route path="/redeem/success" element={<Navigate to="/apps" replace/>} />
    <Route path="/apps" element={<Library />} />
    <Route path="/reports" element={<Library reports />} />
    <Route path="/reports/:id" element={<Report />} />
    <Route path="/attempts/:id" element={<Attempt />} />
    <Route path="/admin/*" element={<Admin />} />
    <Route path="/preview" element={<HomePage />} />
    <Route path="/preview/products/partner" element={<ProductDetailPage />} />
    <Route path="/preview/assessment/partner" element={<AssessmentPage />} />
    <Route path="/preview/reports/partner" element={<ReportPage />} />
    <Route path="/preview/redeem" element={<RedemptionPage key="redeem" />} />
    <Route path="/preview/redeem/success" element={<RedemptionPage key="redemption-success" success />} />
    <Route path="*" element={<SupportingPages />} />
  </Routes></Suspense>;
}
