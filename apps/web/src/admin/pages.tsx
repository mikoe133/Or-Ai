import { useQuery } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router-dom";
import { accountApi } from "../auth/browser.js";
import { Loading, Failure } from "../business/shared.js";
import { adminApi } from "./api.js";
import { Orders } from "./orders.js";
import { Assets } from "./assets.js";
import { Products } from "./products.js";
import { ContentWorkbench } from "./content.js";
import { AdminShell } from "./shell.js";
import "./admin.css";
import { SkillsApp } from "./skills.js";
import { CodexConnections } from "./codex-connections.js";
import { Overview } from "./overview.js";
import { isAccessFailure, RefreshNotice } from "./refresh-notice.js";
function Management() {
  const result = useQuery({
    queryKey: ["private", "admin", "overview"],
    queryFn: ({ signal }) => adminApi.overview(signal),
  });
  const data = result.data;
  if (!data) return result.isError
    ? <Failure error={result.error} retry={() => void result.refetch()} /> : <Loading />;
  if (result.isError && isAccessFailure(result.error))
    return <Failure error={result.error} retry={() => void result.refetch()} />;
  return (
    <>
      {result.isError && <RefreshNotice busy={result.isFetching} retry={() => void result.refetch()} />}
      <Routes>
        <Route index element={<Overview />} />
        <Route
          path="products"
          element={<Products scope={data.scope} />}
        />
        <Route path="assets" element={<Assets />} />
        <Route path="content/*" element={<ContentWorkbench />} />
        <Route path="skills/*" element={<SkillsApp />} />
        <Route
          path="machine"
          element={<CodexConnections scope={data.scope} />}
        />
        <Route path="machine/configurations" element={<CodexConnections scope={data.scope} />} />
        <Route path="orders" element={<Orders scope={data.scope} />} />
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
    <AdminShell
      authorized={
        !!context.data?.account?.emailVerified &&
        context.data.account.role === "admin"
      }
      accountPresent={!!context.data?.account}
    >
      {context.data && context.isError && !isAccessFailure(context.error) &&
        <RefreshNotice busy={context.isFetching} retry={() => void context.refetch()} />}
      {!context.data ? (
        context.isError ? <Failure error={context.error} retry={() => void context.refetch()} /> : <Loading />
      ) : context.isError && isAccessFailure(context.error) ? (
        <Failure error={context.error} retry={() => void context.refetch()} />
      ) : !context.data.account ? (
        <section className="admin-access-panel">
          <h2>需要管理员账户</h2>
          <p>
            {context.data.configured
              ? "请先登录已验证的管理员邮箱。"
              : "账户服务尚未配置，请先配置本地 Auth。"}
          </p>
          <Link className="biz-button admin-primary" to="/auth/login">
            邮箱登录
          </Link>
          <small>使用已验证的管理员邮箱，继续制作与管理。</small>
        </section>
      ) : context.data.account.role !== "admin" ||
        !context.data.account.emailVerified ? (
        <section className="admin-access-panel">
          <h2>后台访问受限</h2>
          <p role="alert">当前账户没有已验证的管理员权限。</p>
          <Link className="biz-button" to="/account">
            查看账户
          </Link>
        </section>
      ) : (
        <Management />
      )}
    </AdminShell>
  );
}
