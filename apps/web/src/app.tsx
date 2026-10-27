import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const Workspace = lazy(() => import('./business/workspace-layout'));
const Help = lazy(() => import('./business/help'));
const HomePage = lazy(() => import('./store/home'));
const ProductDetailPage = lazy(() => import('./store/product-detail'));
const AssessmentPage = lazy(() => import('./store/assessment'));
const ReportPage = lazy(() => import('./store/report'));
const RedemptionPage = lazy(() => import('./store/redemption'));
const AccountPage = lazy(() => import('./auth/pages.js').then(module => ({ default: module.AccountPage })));
const AuthCallbackPage = lazy(() => import('./auth/pages.js').then(module => ({ default: module.AuthCallbackPage })));
const AuthForm = lazy(() => import('./auth/pages.js').then(module => ({ default: module.AuthForm })));
const AuthLayout = lazy(() => import('./auth/layout.js'));
const NotFound = lazy(() => import('./business/help.js').then(module => ({ default: module.NotFoundPage })));
const Upcoming = lazy(() => import('./business/upcoming'));
const Developer = lazy(() => import('./business/developer'));
const Catalog = lazy(()=>import('./business/catalog.js').then(module=>({default:module.CatalogPage})));
const Product = lazy(()=>import('./business/catalog.js').then(module=>({default:module.ProductPage})));
const Redeem = lazy(()=>import('./business/library.js').then(module=>({default:module.RedemptionPage})));
const Library = lazy(()=>import('./business/library.js').then(module=>({default:module.LibraryPage})));
const Attempt = lazy(()=>import('./business/assessment.js').then(module=>({default:module.AssessmentPage})));
const Report = lazy(()=>import('./business/assessment.js').then(module=>({default:module.ReportPage})));
const Admin = lazy(()=>import('./admin/pages.js').then(module=>({default:module.AdminApp})));
const QuietRoomPreview = lazy(()=>import('./experience/preview.js'));
const GardenPreview = lazy(()=>import('./experience/garden-preview.js'));

function SupportingPages() {
  return <Routes><Route element={<AuthLayout />}>
      <Route path="/auth/login" element={<AuthForm key="login" mode="login" />} />
      <Route path="/auth/register" element={<AuthForm key="register" mode="register" />} />
      <Route path="/auth/forgot" element={<AuthForm key="forgot" mode="forgot" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/reset" element={<AuthCallbackPage recovery />} />
      <Route path="/account" element={<AccountPage />} />
    </Route><Route path="*" element={<NotFound />} /></Routes>;
}

export function App() {
  const location=useLocation();
  return <Suspense fallback={<p role="status" className="p-6">正在加载页面…</p>}>{location.pathname.startsWith('/preview')&&<div className="p-3 text-center">独立设计预览 · 数据为示例　<Link to="/">进入真实业务商城</Link></div>}<Routes>
    <Route element={<Workspace />}>
      <Route path="/" element={<Catalog />} />
      <Route path="/apps" element={<Library />} />
      <Route path="/reports" element={<Library reports />} />
      <Route path="/help" element={<Help />} />
    </Route>
    <Route path="/developers" element={<Developer />} />
    <Route path="/together" element={<Upcoming section="together" />} />
    <Route path="/collaborations" element={<Upcoming section="collaboration" />} />
    <Route path="/products/:slug" element={<Product />} />
    <Route path="/redeem" element={<Redeem />} />
    <Route path="/redeem/success" element={<Navigate to="/apps" replace/>} />
    <Route path="/reports/:id" element={<Report />} />
    <Route path="/attempts/:id" element={<Attempt />} />
    <Route path="/admin/*" element={<Admin />} />
    <Route path="/preview" element={<HomePage />} />
    <Route path="/preview/experience/quiet-room" element={<QuietRoomPreview />} />
    <Route path="/preview/experience/reflection-garden" element={<GardenPreview />} />
    <Route path="/preview/products/partner" element={<ProductDetailPage />} />
    <Route path="/preview/assessment/partner" element={<AssessmentPage />} />
    <Route path="/preview/reports/partner" element={<ReportPage />} />
    <Route path="/preview/redeem" element={<RedemptionPage key="redeem" />} />
    <Route path="/preview/redeem/success" element={<RedemptionPage key="redemption-success" success />} />
    <Route path="*" element={<SupportingPages />} />
  </Routes></Suspense>;
}
