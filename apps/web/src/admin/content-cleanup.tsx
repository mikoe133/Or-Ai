import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loading, Pager, useAction } from "../business/shared.js";
import { ClientError } from "../api/client.js";
import { AdminFailure } from "./feedback.js";
import { AdminEmptyState } from "./feedback-view.js";
import { isAccessFailure, RefreshNotice } from "./refresh-notice.js";
import { workflowApi } from "./workflow-api.js";

type Plan = Awaited<ReturnType<typeof workflowApi.cleanupPlan>>;
type CleanupRequest =
  | { kind: "preview"; body: { productId: string; fileIds: string[]; requestId: string } }
  | { kind: "execute"; plan: Plan; body: { expectedDigest: string; confirmed: true; requestId: string } };
const uncertainResponse = (error: unknown) => error instanceof ClientError &&
  (error.status === 0 || error.status >= 500 || error.status === 408 || error.code === "INVALID_RESPONSE");
const when = (value: string) => new Date(value).toLocaleString("zh-CN");
const size = (bytes: number) => (bytes / 1024).toFixed(1) + " KiB";

export function CleanupPanel({ productId, active, onDirty }: {
  productId: string; active: boolean; onDirty?: (value: boolean) => void;
}) {
  const [params, setParams] = useSearchParams(), location = useLocation(), navigate = useNavigate();
  const action = useAction(), [page, setPage] = useState(1), [selected, setSelected] = useState<string[]>([]);
  const [localPlan, setPlan] = useState<Plan | null>(null), [confirmation, setConfirmation] = useState<string | null>(null);
  const [pending, setPending] = useState<CleanupRequest | null>(null), [accessError, setAccessError] = useState<unknown>(null);
  const [retrying, setRetrying] = useState(false), [notice, setNotice] = useState("");
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const requestOrigin = useRef(location.pathname + location.search);
  const planId = pending?.kind === "execute" ? pending.plan.id : params.get("cleanup") ?? "";
  const candidates = useQuery({
    queryKey: ["private", "admin", "content-cleanup-candidates", productId, page],
    queryFn: ({ signal }) => workflowApi.candidates(productId, page, signal),
    enabled: active, refetchOnWindowFocus: false,
  });
  const restored = useQuery({
    queryKey: ["private", "admin", "cleanup-plan", planId],
    queryFn: ({ signal }) => workflowApi.cleanupPlan(planId, signal),
    enabled: active && !!planId, refetchOnWindowFocus: false,
  });
  const plan = pending?.kind === "execute" ? pending.plan :
    localPlan?.id === planId && localPlan.productId === productId ? localPlan :
      restored.data?.productId === productId ? restored.data : null;
  const reads = [candidates, ...(planId ? [restored] : [])];
  const denial = [candidates.error, restored.error, action.error].find(isAccessFailure) ?? accessError;
  const checking = retrying || reads.some(query => query.isFetching);
  const unavailable = reads.some(query => query.isPending || query.isError);
  const locked = action.busy || !!pending || checking || unavailable || !!denial || needsRecheck;
  const planKey = plan ? plan.id + ":" + plan.digest : "";
  const confirmed = confirmation === planKey && !!planKey;
  const expired = !!plan && Date.parse(plan.expiresAt) <= Date.now();

  useEffect(() => { onDirty?.(action.busy || !!pending); return () => onDirty?.(false); }, [action.busy, pending, onDirty]);
  useEffect(() => { if (denial) { setAccessError(denial); setConfirmation(null); } }, [denial]);
  useEffect(() => { setConfirmation(null); }, [planKey]);
  useEffect(() => {
    if (!pending) return;
    if (location.pathname + location.search !== requestOrigin.current) {
      navigate(requestOrigin.current, { replace: true });
      setNotice("清理结果尚未确认，原请求已保留。请先核对原请求再离开。");
    }
  }, [pending, location.pathname, location.search, navigate]);

  async function retryReads() {
    if (retrying || action.busy) return;
    setRetrying(true);
    try {
      await Promise.all(reads.map(query => query.refetch({ throwOnError: true })));
      if (isAccessFailure(action.error) || needsRecheck) action.resetError();
      setNeedsRecheck(false);
      setAccessError(null);
      requestAnimationFrame(() => document.getElementById("cleanup-refresh")?.focus({ preventScroll: true }));
    } catch { /* Retained private plans stay hidden until every required read succeeds. */ }
    finally { setRetrying(false); }
  }

  async function send(request: CleanupRequest) {
    if (action.busy || denial) return;
    const originalUnknown = !!pending;
    if (!originalUnknown) requestOrigin.current = location.pathname + location.search;
    await action.run(async () => {
      try {
        const value = request.kind === "preview" ? await workflowApi.cleanupPreview(request.body) :
          await workflowApi.cleanup(request.plan.id, request.body);
        setPending(null); setConfirmation(null); setPlan(value);
        setParams(current => { const next = new URLSearchParams(current); next.set("cleanup", value.id); return next; }, { replace: true });
        setNotice(request.kind === "preview" ? "预演已保存，请核对固定文件清单后确认。" : "清理结果已回读，请查看各文件的实际处理记录。");
        if (request.kind === "execute") { setSelected([]); void candidates.refetch(); }
        return value;
      } catch (error) {
        if (error instanceof ClientError && error.status === 409) setNeedsRecheck(true);
        if (uncertainResponse(error) || originalUnknown && isAccessFailure(error)) setPending(request);
        else { setPending(null); setConfirmation(null); }
        throw error;
      }
    });
  }

  if (denial) return active ? <AdminFailure error={denial} retry={retrying ? undefined : () => void retryReads()} /> : null;
  return <section className="content-editor content-cleanup-editor" aria-label="临时文件清理工作台">
    <header className="cleanup-heading"><div><h3>临时文件清理</h3>
      <p>核对过期且无引用的文件，再决定是否清理。归档稿、历史预览和采用包的引用继续保留。</p></div>
      <button id="cleanup-refresh" disabled={action.busy || checking} onClick={() => void retryReads()}>更新清理状态</button>
    </header>
    {reads.some(query => query.isError && query.data) && <RefreshNotice busy={checking} retry={() => void retryReads()} />}
    {!!notice && <p role="status" className="content-note">{notice}</p>}
    {pending && <div className="cleanup-unknown" role="status">
      <p>{pending.kind === "execute" ? "未收到完整清理结果，原预演与请求已保留。" : "未收到完整预演结果，原文件选择与请求已保留。"}核对前不能提交另一份请求。</p>
      <button disabled={action.busy || checking} onClick={() => void send(pending)}>用原请求核对{pending.kind === "execute" ? "清理结果" : "预演结果"}</button>
    </div>}
    <ol className="content-process-steps" aria-label="清理流程">
      <li><span>01</span> 选择过期文件</li><li><span>02</span> 生成清理预演</li><li><span>03</span> 核对后执行</li>
    </ol>
    {!candidates.data ? candidates.isError ? <AdminFailure error={candidates.error} retry={() => void retryReads()} /> :
      <Loading label="正在读取清理候选…" /> : <>
      <div className="cleanup-selection"><strong>候选文件 <span>{candidates.data.total}</span></strong><span>已选 {selected.length} / 50</span></div>
      {candidates.data.total === 0 ? <AdminEmptyState title="没有符合清理条件的文件">当前或历史内容仍在引用的文件不会进入此列表。</AdminEmptyState> :
        <div className="biz-table-wrap" aria-busy={checking}><table><thead><tr><th>选择</th><th>文件</th><th>大小</th><th>状态</th><th>上传期限</th></tr></thead>
          <tbody>{candidates.data.items.map(file => <tr key={file.id}>
            <td><input type="checkbox" aria-label={"清理候选 " + file.fileName} checked={selected.includes(file.id)} disabled={locked}
              onChange={event => setSelected(current => event.target.checked ? [...current, file.id] : current.filter(id => id !== file.id))} /></td>
            <td>{file.fileName}</td><td>{size(file.byteSize)}</td><td>{({ pending: "待校验", uploaded: "已上传", expired: "已过期" } as Record<string, string>)[file.status] ?? file.status}</td><td>{when(file.expiresAt)}</td>
          </tr>)}</tbody></table></div>}
      {candidates.data.total > candidates.data.pageSize && <fieldset disabled={locked}><Pager {...candidates.data} onChange={setPage} /></fieldset>}
    </>}
    <button disabled={locked || selected.length === 0 || selected.length > 50} onClick={() => void send({ kind: "preview",
      body: action.intent("cleanup-preview:" + productId, { productId, fileIds: selected }) })}>生成清理预演</button>
    {planId && !plan && (restored.isError ? <AdminFailure error={restored.error} retry={() => void retryReads()} /> : <Loading label="正在读取清理预演…" />)}
    {plan && <section className="content-block cleanup-plan" aria-label="文件清理预演">
      <header><div><p className="cleanup-caption">固定清理清单</p><h4>清理预演 · {plan.status === "complete" ? "已完成" : plan.status === "running" ? "进行中 / 可重试" : "等待确认"}</h4></div>
        <span>{plan.files.length} 份文件 · {size(plan.files.reduce((sum, file) => sum + file.byteSize, 0))}</span></header>
      <p className="content-note">预演有效期至 {when(plan.expiresAt)}。执行时会重新检查引用与状态。</p>
      <ul className="cleanup-files">{plan.files.map(file => <li key={file.id}><strong>{file.fileName}</strong><span>{size(file.byteSize)}</span></li>)}</ul>
      <details className="cleanup-identifiers"><summary>查看固定文件标识与摘要</summary><ul>{plan.files.map(file => <li key={file.id}>{file.fileName} · {file.id}</li>)}</ul><p>{plan.digest}</p></details>
      {plan.results.map(result => <p key={result.fileId}>{result.fileId}：{result.message}</p>)}
      {plan.status !== "complete" && <fieldset disabled={locked || expired} className="cleanup-confirmation">
        {expired && <p role="status">此预演已过期，请重新选择文件并生成预演。</p>}
        <label className="content-inline"><input type="checkbox" checked={confirmed} onChange={event => setConfirmation(event.target.checked ? planKey : null)} />
          我确认清理以上过期且无引用的文件字节，保留元数据和审计记录</label>
        <button disabled={!confirmed} onClick={() => void send({ kind: "execute", plan,
          body: action.intent("cleanup:" + plan.id, { expectedDigest: plan.digest, confirmed: true as const }) })}>{plan.status === "running" ? "重试此清理计划" : "执行已预演清理"}</button>
      </fieldset>}
      <p className="content-note">预演后被引用的文件会保留。失败时重试同一计划，已删除的文件不会重新上传或激活。</p>
    </section>}
    {!!action.error && <AdminFailure error={action.error} retry={pending ? undefined : () => void retryReads()} />}
  </section>;
}
