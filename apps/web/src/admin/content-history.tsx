import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Failure, Loading, useAction } from "../business/shared.js";
import { allPages, contentApi, type Revision } from "./content-api.js";
import { workflowApi } from "./workflow-api.js";
import { domains, statuses, stringField } from "./content-model.js";
import { MediaPreview } from "./content-media.js";
export function ImpactBadge({
  revisionId,
  active,
}: {
  revisionId: string;
  active: boolean;
}) {
  const result = useQuery({
    queryKey: ["private", "admin", "content-impact", revisionId],
    queryFn: ({ signal }) => workflowApi.impact(revisionId, signal),
    enabled: active,
    refetchOnWindowFocus: false,
  });
  return (
    <span
      className={
        "content-badge" + (result.data?.needsReview ? " content-warning" : "")
      }
    >
      {result.isError
        ? "影响状态读取失败"
        : result.data?.blocked
          ? "存在归档输入"
          : result.data?.needsReview
            ? "上游更新 · 待复查"
            : result.data?.reviewed
              ? "已确认固定旧稿"
              : result.data
                ? "输入无待复查更新"
                : "影响检查中"}
    </span>
  );
}
export function ContentHistory({
  productId,
  active,
  initialId,
  onInspected,
}: {
  productId: string;
  active: boolean;
  initialId: string;
  onInspected: (id: string) => void;
}) {
  const client = useQueryClient(),
    action = useAction(),
    [selectedId, setSelectedId] = useState(initialId),
    [compareId, setCompareId] = useState(""),
    [note, setNote] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (initialId) {
      setSelectedId(initialId);
      setNote("");
      setCompareId("");
    }
  }, [initialId]);
  const history = useQuery({
    queryKey: ["private", "admin", "content-history", productId],
    queryFn: ({ signal }) =>
      allPages((page) =>
        contentApi.revisions(
          new URLSearchParams({
            productId,
            page: String(page),
            pageSize: "50",
          }).toString(),
          signal,
        ),
      ),
    enabled: active,
    refetchOnWindowFocus: false,
  });
  const selected =
      history.data?.find((row) => row.id === selectedId) ?? history.data?.[0],
    currentId = selected?.id ?? "";
  const detail = useQuery({
      queryKey: ["private", "admin", "content-history-detail", currentId],
      queryFn: ({ signal }) => contentApi.revision(currentId, signal),
      enabled: active && !!currentId,
      refetchOnWindowFocus: false,
    }),
    impact = useQuery({
      queryKey: ["private", "admin", "content-impact", currentId],
      queryFn: ({ signal }) => workflowApi.impact(currentId, signal),
      enabled: active && !!currentId,
      refetchOnWindowFocus: false,
    }),
    links = useQuery({
      queryKey: ["private", "admin", "content-links", currentId],
      queryFn: async ({ signal }) => ({
        inputs: await allPages((page) =>
          workflowApi.references(
            new URLSearchParams({
              targetRevisionId: currentId,
              page: String(page),
              pageSize: "50",
            }).toString(),
            signal,
          ),
        ),
        usedBy: await allPages((page) =>
          workflowApi.references(
            new URLSearchParams({
              sourceRevisionId: currentId,
              page: String(page),
              pageSize: "50",
            }).toString(),
            signal,
          ),
        ),
      }),
      enabled: active && !!currentId,
      refetchOnWindowFocus: false,
    });
  const comparisons =
      history.data?.filter(
        (row) =>
          row.id !== currentId &&
          row.domain === selected?.domain &&
          row.assetId === selected?.assetId,
      ) ?? [],
    to = compareId || comparisons[0]?.id;
  const diff = useQuery({
    queryKey: ["private", "admin", "content-diff", currentId, to],
    queryFn: ({ signal }) => workflowApi.diff(currentId, to!, signal),
    enabled: active && !!currentId && !!to,
    refetchOnWindowFocus: false,
  });
  function choose(id: string) {
    setSelectedId(id);
    setCompareId("");
    setNote("");
    setNotice("");
    onInspected(id);
  }
  const label = (row: Revision) =>
    `${domains[row.domain]} · ${stringField(row.snapshot.variant) || "题库 v" + String(row.snapshot.versionNumber)} · r${row.sourceRevision} · ${statuses[stringField(row.snapshot.status)]}`;
  if (history.isPending) return active ? <Loading /> : null;
  if (history.isError)
    return (
      <Failure error={history.error} retry={() => void history.refetch()} />
    );
  if (!selected) return <p>当前商品尚无内容修订。</p>;
  return (
    <section className="content-editor" aria-label="引用与历史工作台">
      <h3>引用、影响与修订历史</h3>
      <p>
        选择固定修订查看原稿。上游更新只产生待复查提示，历史内容与采用包不会跟着变化。
      </p>
      <label>
        查看修订
        <select
          aria-label="查看修订"
          value={currentId}
          onChange={(event) => choose(event.target.value)}
        >
          {history.data.map((row) => (
            <option key={row.id} value={row.id}>
              {label(row)}
            </option>
          ))}
        </select>
      </label>
      <div className="content-block">
        <strong>{label(selected)}</strong>
        <p>固定 ID：{selected.id}</p>
        <small>SHA-256：{selected.digest}</small>
      </div>
      {impact.isPending ? (
        <Loading />
      ) : impact.isError ? (
        <Failure error={impact.error} retry={() => void impact.refetch()} />
      ) : (
        <div className="content-block" aria-label="影响清单">
          <h4>
            {impact.data.blocked
              ? "存在归档输入"
              : impact.data.needsReview
                ? "上游更新 · 待复查"
                : impact.data.reviewed
                  ? "已确认继续使用固定旧稿"
                  : "当前没有待复查更新"}
          </h4>
          <ul>
            {impact.data.alerts.map((alert, index) => (
              <li key={index}>
                {alert.message}{" "}
                {history.data.some((row) => row.id === alert.latestId) ? (
                  <button type="button" onClick={() => choose(alert.latestId)}>
                    查看新修订
                  </button>
                ) : (
                  <small>请到创作设定切换修订核对。</small>
                )}
              </li>
            ))}
          </ul>
          {impact.data.reviewNote && <p>复查结论：{impact.data.reviewNote}</p>}
          {impact.data.needsReview && !impact.data.blocked && (
            <>
              <label>
                继续使用旧稿的复查说明
                <textarea
                  aria-label="继续使用旧稿的复查说明"
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <button
                disabled={action.busy || !note.trim()}
                onClick={() =>
                  void action.run(
                    () =>
                      workflowApi.recheck(
                        currentId,
                        action.intent("recheck:" + currentId, {
                          expectedFingerprint: impact.data.fingerprint,
                          note,
                        }),
                      ),
                    () => {
                      void client.invalidateQueries({
                        queryKey: ["private", "admin", "content-impact"],
                      });
                      setNotice("复查结论已保存；后续再有更新会重新提示。");
                    },
                  )
                }
              >
                确认继续使用此固定稿
              </button>
            </>
          )}
        </div>
      )}
      {links.isPending ? (
        <Loading />
      ) : links.isError ? (
        <Failure error={links.error} />
      ) : (
        <div className="content-fields">
          <section>
            <h4>此稿使用的固定输入</h4>
            {links.data.inputs.length === 0 && <p>没有引用输入。</p>}
            {links.data.inputs.map((input) => (
              <div className="content-reference-row" key={input.id}>
                <strong>
                  {input.locatorKey} → {input.targetLocatorKey} ·{" "}
                  {input.mode === "adapted" ? "改写" : "原文"}
                </strong>
                <p>{input.usedText}</p>
                <button onClick={() => choose(input.sourceRevisionId)}>
                  查看来源修订
                </button>
              </div>
            ))}
          </section>
          <section>
            <h4>哪些稿件使用了此修订</h4>
            {links.data.usedBy.length === 0 && <p>没有下游使用记录。</p>}
            {links.data.usedBy.map((input) => (
              <div className="content-reference-row" key={input.id}>
                <p>
                  {input.role} · {input.targetLocatorKey}
                </p>
                <p>{input.usedText}</p>
                <button onClick={() => choose(input.targetRevisionId)}>
                  查看使用稿件
                </button>
              </div>
            ))}
          </section>
        </div>
      )}
      <h4>内容差异</h4>
      {to ? (
        <>
          <label>
            对比修订
            <select
              aria-label="对比修订"
              value={to}
              onChange={(event) => setCompareId(event.target.value)}
            >
              {comparisons.map((row) => (
                <option key={row.id} value={row.id}>
                  {label(row)}
                </option>
              ))}
            </select>
          </label>
          {diff.isPending ? (
            <Loading />
          ) : diff.isError ? (
            <Failure error={diff.error} />
          ) : (
            <>
              <p>
                从当前查看修订 → 对比修订；题目、文案块、分镜和章节按稳定 ID
                对齐。
              </p>
              {diff.data.changes.length === 0 && <p>内容相同。</p>}
              {diff.data.changes.map((value, index) => (
                <details className="content-block" key={index}>
                  <summary>{value.path}</summary>
                  <div className="content-fields">
                    <div>
                      <strong>查看修订</strong>
                      <pre>{JSON.stringify(value.before, null, 2)}</pre>
                    </div>
                    <div>
                      <strong>对比修订</strong>
                      <pre>{JSON.stringify(value.after, null, 2)}</pre>
                    </div>
                  </div>
                </details>
              ))}
              {diff.data.truncated && (
                <p>差异超过 500 处，请分段核对原始快照。</p>
              )}
            </>
          )}
        </>
      ) : (
        <p>还没有可对比的修订。</p>
      )}
      {detail.isPending ? (
        <Loading />
      ) : detail.isError ? (
        <Failure error={detail.error} />
      ) : (
        <>
          <div className="content-media-grid">
            <MediaPreview
              key={"preview" + detail.data.id}
              file={detail.data.previewFile}
              label="历史预览"
            />
            <MediaPreview
              key={"delivery" + detail.data.id}
              file={detail.data.deliveryFile}
              label="历史正式"
            />
          </div>
          <details>
            <summary>固定原始内容与制作来源</summary>
            <pre>
              {JSON.stringify(
                {
                  snapshot: detail.data.snapshot,
                  production: detail.data.production,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
    </section>
  );
}

export function CreativeProfileDiff({
  fromId,
  toId,
  active,
}: {
  fromId?: string;
  toId?: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false),
    diff = useQuery({
      queryKey: ["private", "admin", "profile-diff", fromId, toId],
      queryFn: ({ signal }) => workflowApi.profileDiff(fromId!, toId!, signal),
      enabled: active && open && !!fromId && !!toId,
      refetchOnWindowFocus: false,
    });
  if (!fromId || !toId || fromId === toId) return null;
  return (
    <section className="content-editor">
      <button onClick={() => setOpen((value) => !value)}>
        {open ? "收起设定差异" : "查看与相邻设定修订的差异"}
      </button>
      {open &&
        (diff.isPending ? (
          <Loading />
        ) : diff.isError ? (
          <Failure error={diff.error} />
        ) : (
          <>
            {diff.data.changes.length === 0 ? (
              <p>设定内容相同。</p>
            ) : (
              diff.data.changes.map((value, index) => (
                <details className="content-block" key={index}>
                  <summary>{value.path}</summary>
                  <strong>所选修订</strong>
                  <pre>{JSON.stringify(value.before, null, 2)}</pre>
                  <strong>相邻修订</strong>
                  <pre>{JSON.stringify(value.after, null, 2)}</pre>
                </details>
              ))
            )}
          </>
        ))}
    </section>
  );
}
