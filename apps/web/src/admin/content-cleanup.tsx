import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Failure, Loading, Pager, useAction } from "../business/shared.js";
import { workflowApi } from "./workflow-api.js";
export function CleanupPanel({
  productId,
  active,
}: {
  productId: string;
  active: boolean;
}) {
  const [params, setParams] = useSearchParams(),
    planId = params.get("cleanup") ?? "";
  const action = useAction(),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [localPlan, setPlan] = useState<Awaited<
      ReturnType<typeof workflowApi.cleanupPreview>
    > | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const candidates = useQuery({
    queryKey: [
      "private",
      "admin",
      "content-cleanup-candidates",
      productId,
      page,
    ],
    queryFn: ({ signal }) => workflowApi.candidates(productId, page, signal),
    enabled: active,
    refetchOnWindowFocus: false,
  });
  const restored = useQuery({
    queryKey: ["private", "admin", "cleanup-plan", planId],
    queryFn: ({ signal }) => workflowApi.cleanupPlan(planId, signal),
    enabled: active && !!planId,
    refetchOnWindowFocus: false,
  });
  const plan =
    localPlan ??
    (restored.data?.productId === productId ? restored.data : null);
  return (
    <section className="content-editor" aria-label="临时文件清理工作台">
      <h3>临时文件清理</h3>
      <p>
        仅列出上传期限已过、没有任何当前或历史内容引用的文件。归档稿、历史预览和采用包使用过的文件继续保留。
      </p>
      {candidates.isPending ? (
        <Loading />
      ) : candidates.isError ? (
        <Failure
          error={candidates.error}
          retry={() => void candidates.refetch()}
        />
      ) : (
        <>
          <div className="biz-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>选择</th>
                  <th>文件</th>
                  <th>大小</th>
                  <th>状态</th>
                  <th>上传期限</th>
                </tr>
              </thead>
              <tbody>
                {candidates.data.items.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={"清理候选 " + file.fileName}
                        checked={selected.includes(file.id)}
                        disabled={action.busy}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, file.id]
                              : current.filter((id) => id !== file.id),
                          )
                        }
                      />
                    </td>
                    <td>{file.fileName}</td>
                    <td>{(file.byteSize / 1024).toFixed(1)} KiB</td>
                    <td>{file.status}</td>
                    <td>{new Date(file.expiresAt).toLocaleString("zh-CN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {candidates.data.total === 0 && <p>没有符合清理条件的文件。</p>}
          <Pager {...candidates.data} onChange={setPage} />
        </>
      )}
      <button
        disabled={action.busy || selected.length === 0 || selected.length > 50}
        onClick={() =>
          void action.run(
            () =>
              workflowApi.cleanupPreview(
                action.intent("cleanup-preview:" + productId, {
                  productId,
                  fileIds: selected,
                }),
              ),
            (value) => {
              setPlan(value);
              setParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  next.set("cleanup", value.id);
                  return next;
                },
                { replace: true },
              );
              setConfirmed(false);
            },
          )
        }
      >
        生成清理预演
      </button>
      {restored.isError && <Failure error={restored.error} />}
      {plan && (
        <div className="content-block" aria-label="文件清理预演">
          <h4>
            清理预演 ·{" "}
            {plan.status === "complete"
              ? "已完成"
              : plan.status === "running"
                ? "进行中 / 可重试"
                : "等待确认"}
          </h4>
          <p>
            {plan.files.length} 份文件，共{" "}
            {(
              plan.files.reduce((sum, file) => sum + file.byteSize, 0) / 1024
            ).toFixed(1)}{" "}
            KiB。预演有效期至 {new Date(plan.expiresAt).toLocaleString("zh-CN")}
            。
          </p>
          <ul>
            {plan.files.map((file) => (
              <li key={file.id}>
                {file.fileName} · {file.id}
              </li>
            ))}
          </ul>
          {plan.results.map((result) => (
            <p key={result.fileId}>
              {result.fileId}：{result.message}
            </p>
          ))}
          {plan.status !== "complete" && (
            <>
              <label className="content-inline">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                我确认清理以上过期且无引用的文件字节，保留元数据和审计记录
              </label>
              <button
                disabled={action.busy || !confirmed}
                onClick={() =>
                  void action.run(
                    () =>
                      workflowApi.cleanup(
                        plan.id,
                        action.intent("cleanup:" + plan.id, {
                          expectedDigest: plan.digest,
                          confirmed: true,
                        }),
                      ),
                    (value) => {
                      setPlan(value);
                      setConfirmed(false);
                      setSelected([]);
                      void candidates.refetch();
                    },
                  )
                }
              >
                {plan.status === "running"
                  ? "重试此清理计划"
                  : "执行已预演清理"}
              </button>
            </>
          )}
          <p className="content-note">
            执行时会再次检查引用和状态。预演后被使用的文件会保留；删除失败可重试同一计划，已删除的文件不会重新上传或激活。
          </p>
        </div>
      )}
      {Boolean(action.error) && (
        <Failure error={action.error} retry={() => void candidates.refetch()} />
      )}
    </section>
  );
}
