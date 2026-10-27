export { isAccessFailure } from "../api/access-verification.js";

export function RefreshNotice({ retry, busy = false }: { retry: () => void; busy?: boolean }) {
  return <div className="admin-refresh-notice" role="status">
    <span>数据更新暂时失败，当前内容已保留。</span>
    <button type="button" onClick={retry} disabled={busy}>重新读取</button>
  </div>;
}
