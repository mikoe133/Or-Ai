import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AdminRecovery({ area = "content" }: { area?: "content" | "products" }) {
  return <nav className="admin-error-recovery" aria-label="后台恢复入口">
    <Link to={area === "products" ? "/admin/products" : "/admin/content"}>
      {area === "products" ? "返回商品目录" : "返回内容目录"}
    </Link>
    <Link to="/account">查看账户状态</Link>
  </nav>;
}

export function AdminEmptyState({ title, children, actions }: {
  title: string; children: ReactNode; actions?: ReactNode;
}) {
  return <section className="admin-list-empty" aria-label={title}>
    <h3>{title}</h3><p>{children}</p>
    {actions && <div className="admin-list-empty-actions">{actions}</div>}
  </section>;
}

export function AdminListProgress({ pending = false }: { pending?: boolean }) {
  return <p className="admin-list-progress" role="status">
    {pending ? "正在读取筛选结果，暂时显示上一份目录。" : "正在更新目录，当前内容已保留。"}
  </p>;
}
