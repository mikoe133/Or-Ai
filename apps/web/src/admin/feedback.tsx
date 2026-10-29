import { Failure } from "../business/shared.js";
import { AdminRecovery } from "./feedback-view.js";

export function AdminFailure({ error, retry, area, draft = false }: {
  error: unknown; retry?: () => void; area?: "content" | "products"; draft?: boolean;
}) {
  return <div className="admin-failure-panel">
    <Failure error={error} retry={retry} />
    {draft && <p className="admin-draft-retained">当前输入已保留。请核对最新状态后，再决定保存或重新读取。</p>}
    <AdminRecovery area={area} />
  </div>;
}
