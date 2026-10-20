import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { accountApi } from "../auth/browser.js";
import { Page, Loading, Failure, Demo, Pager } from "../business/shared.js";
import { adminApi } from "./api.js";
import { Orders } from "./orders.js";
import { Assets } from "./assets.js";
import { Products } from "./products.js";
import { ContentWorkbench } from "./content.js";
import "./admin.css";
function Overview() {
  const result = useQuery({
      queryKey: ["private", "admin", "overview"],
      queryFn: ({ signal }) => adminApi.overview(signal),
    }),
    [page, setPage] = useState(1),
    audit = useQuery({
      queryKey: ["private", "admin", "audit", page],
      queryFn: ({ signal }) => adminApi.audit(page, signal),
    });
  return (
    <>
      <h2>运营概览</h2>
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <Failure error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <Demo show={result.data.scope === "demo"} />
          <div className="biz-grid">
            <section className="biz-card">
              <h3>人工登记订单</h3>
              <p>
                {result.data.orders.recordedCount} 笔 · ¥{" "}
                {(result.data.orders.recordedAmountFen / 100).toFixed(2)}
              </p>
              <small>金额未核实平台支付，不等于实际收入。</small>
            </section>
            <section className="biz-card">
              <h3>内容</h3>
              <p>
                商品 {result.data.products} 款 · 素材 {result.data.assets} 份
              </p>
            </section>
          </div>
          <p>
            来源归因尚未确认；浏览是客户端观察，兑换、开始、完成和退款由业务事务记录。
          </p>
          <div className="biz-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>事件</th>
                  <th>来源</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                {result.data.events.map((value) => (
                  <tr key={value.kind + value.source}>
                    <td>{value.kind}</td>
                    <td>
                      {value.source === "demo"
                        ? "测试来源"
                        : value.source === "manual"
                          ? "人工记录"
                          : "网站"}
                    </td>
                    <td>{value.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <h2>操作审计</h2>
      {audit.isPending ? (
        <Loading />
      ) : audit.isError ? (
        <Failure error={audit.error} retry={() => void audit.refetch()} />
      ) : (
        <>
          <div className="biz-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>对象</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.items.map((value) => (
                  <tr key={value.id}>
                    <td>{new Date(value.createdAt).toLocaleString("zh-CN")}</td>
                    <td>{value.action}</td>
                    <td>
                      {value.entityKind} · {value.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...audit.data} onChange={setPage} />
        </>
      )}
    </>
  );
}
function Management() {
  const result = useQuery({
    queryKey: ["private", "admin", "overview"],
    queryFn: ({ signal }) => adminApi.overview(signal),
  });
  if (result.isPending) return <Loading />;
  if (result.isError)
    return <Failure error={result.error} retry={() => void result.refetch()} />;
  return (
    <>
      <nav className="biz-nav" aria-label="后台导航">
        <NavLink to="/admin" end>概览与审计</NavLink>
        <NavLink to="/admin/products">商品与版本</NavLink>
        <NavLink to="/admin/content">内容工作台</NavLink>
        <NavLink to="/admin/assets">素材与文件</NavLink>
        <NavLink to="/admin/orders">订单与售后</NavLink>
        <Link to="/account">账户</Link>
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route
          path="products"
          element={<Products scope={result.data.scope} />}
        />
        <Route path="assets" element={<Assets />} />
        <Route path="content/*" element={<ContentWorkbench />} />
        <Route path="orders" element={<Orders scope={result.data.scope} />} />
        <Route path="*" element={<p>后台页面不存在。</p>} />
      </Routes>
    </>
  );
}
export function AdminApp() {
  const context = useQuery({
    queryKey: ["account-context"],
    queryFn: () => accountApi.context(),
    retry: false,
  });
  return (
    <Page title="运营后台" section="admin">
      {context.isPending ? (
        <Loading />
      ) : context.isError ? (
        <Failure error={context.error} retry={() => void context.refetch()} />
      ) : !context.data.account ? (
        <>
          <p>需要管理员账户</p>
          <p>
            {context.data.configured
              ? "请先登录已验证的管理员邮箱。"
              : "账户服务尚未配置，请先配置本地 Auth。"}
          </p>
          <Link to="/auth/login">邮箱登录</Link>
        </>
      ) : context.data.account.role !== "admin" ||
        !context.data.account.emailVerified ? (
        <p role="alert">当前账户没有已验证的管理员权限。</p>
      ) : (
        <Management />
      )}
    </Page>
  );
}
