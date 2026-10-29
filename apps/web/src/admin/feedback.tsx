import { Failure } from "../business/shared.js";
import { AdminRecovery, type AdminRecoveryArea } from "./feedback-view.js";
import type { StyleSkillManifest } from "@orai/contracts/admin";

export function AdminFailure({ error, retry, area, draft = false, onReturn, skillDomain }: {
  error: unknown; retry?: () => void; area?: AdminRecoveryArea; draft?: boolean; onReturn?: () => void; skillDomain?: StyleSkillManifest["domain"];
}) {
  return <div className="admin-failure-panel">
    <Failure error={error} retry={retry} />
    {draft && <p className="admin-draft-retained">当前输入已保留。请核对最新状态后，再决定保存或重新读取。</p>}
    <AdminRecovery area={area} onReturn={onReturn} skillDomain={skillDomain} />
  </div>;
}
