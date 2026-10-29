import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { StyleSkillManifest } from "@orai/contracts/admin";

export type AdminRecoveryArea = "content" | "products" | "assets" | "orders" | "skills";
const recoveryLabels: Record<AdminRecoveryArea, string> = {
  content: "返回内容目录", products: "返回商品目录", assets: "返回素材目录", orders: "返回订单列表", skills: "返回 Skill 目录",
};

export function AdminRecovery({ area = "content", onReturn, skillDomain = "assessment" }: {
  area?: AdminRecoveryArea; onReturn?: () => void; skillDomain?: StyleSkillManifest["domain"];
}) {
  return <nav className="admin-error-recovery" aria-label="后台恢复入口">
    <Link to={area === "skills" ? `/admin/skills/${skillDomain}` : `/admin/${area}`} reloadDocument={!onReturn} onClick={onReturn ? event => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        onReturn();
      }
    } : undefined}>
      {recoveryLabels[area]}
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
