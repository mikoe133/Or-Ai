import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AdminCreateOrderSchema } from "@orai/contracts/admin";
import { adminApi } from "./api.js";
import { ProductVersionSelect } from "./shared.js";
import {
  Demo,
  Loading,
  Pager,
  useAction,
} from "../business/shared.js";
import { AdminFailure as Failure } from "./feedback.js";
import { AdminEmptyState, AdminListProgress } from "./feedback-view.js";
import { isAccessFailure, RefreshNotice } from "./refresh-notice.js";
import { downloadBlob } from "../business/download.js";
import "./management.css";
const orderStatuses: Record<string, string> = { pending: "待交付", fulfilled: "已交付", refunded: "已退款", cancelled: "已取消" };
const orderPlatforms: Record<string, string> = { manual: "人工", douyin: "抖音", xiaohongshu: "小红书" };
const codeStatuses: Record<string, string> = { issued: "待兑换", claimed: "已兑换", expired: "已过期", revoked: "已撤销" };
type Delivery = Awaited<ReturnType<typeof adminApi.issue>>;
export function Orders({ scope }: { scope: "demo" | "live" }) {
  const headingRef = useRef<HTMLElement>(null);
  const [params, setParams] = useSearchParams(),
    client = useQueryClient(),
    action = useAction(),
    [version, setVersion] = useState(""),
    [view, setView] = useState<"list" | "manual" | "csv">("list"),
    [csv, setCsv] = useState(""),
    [csvResult, setCsvResult] = useState<Awaited<
      ReturnType<typeof adminApi.csv>
    > | null>(null),
    [secret, setSecret] = useState<Delivery | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const orderId = params.get("order") ?? "",
    page = Number(params.get("page")) || 1;
  const appliedReference = params.get("reference") ?? "", appliedStatus = params.get("status") ?? "", appliedPlatform = params.get("platform") ?? "";
  const [referenceDraft, setReferenceDraft] = useState(appliedReference), [statusDraft, setStatusDraft] = useState(appliedStatus), [platformDraft, setPlatformDraft] = useState(appliedPlatform);
  useEffect(() => { setReferenceDraft(appliedReference); setStatusDraft(appliedStatus); setPlatformDraft(appliedPlatform); }, [appliedReference, appliedStatus, appliedPlatform]);
  const listQuery = new URLSearchParams({ page: String(page), ...(appliedReference ? { reference: appliedReference } : {}), ...(appliedStatus ? { status: appliedStatus } : {}), ...(appliedPlatform ? { platform: appliedPlatform } : {}) }).toString();
  const list = useQuery({
    queryKey: ["private", "admin", "orders", listQuery],
    queryFn: ({ signal }) =>
      adminApi.orders(listQuery, signal),
    placeholderData: keepPreviousData,
  });
  const detail = useQuery({
    queryKey: ["private", "admin", "order", orderId],
    queryFn: ({ signal }) => adminApi.order(orderId, signal),
    enabled: Boolean(orderId),
  });
  const accessError = [list.error, orderId && detail.error, action.error].find(isAccessFailure);
  const accessDenied = Boolean(accessError);
  const listData = accessError ? undefined : list.data;
  const detailData = accessError ? undefined : detail.data;
  const filtered = Boolean(appliedReference || appliedStatus || appliedPlatform);
  function clearFilters() { setReferenceDraft(""); setStatusDraft(""); setPlatformDraft(""); setParams({}); }
  async function recoverAccess() {
    const results = await Promise.all([list.refetch(), ...(orderId ? [detail.refetch()] : [])]);
    if (results.every(result => result.isSuccess)) action.resetError();
  }
  useEffect(() => {
    if (accessDenied) { setSecret(null); setConfirmed(false); }
  }, [accessDenied]);
  useEffect(() => {
    headingRef.current?.scrollIntoView({ block: "start" });
    setSecret(null);
    setConfirmed(false);
    action.resetError();
  }, [orderId, view]);
  function changed() {
    void client.invalidateQueries({ queryKey: ["private", "admin", "orders"] });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "order", orderId],
    });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "overview"],
    });
  }
  function selected(id: string) {
    action.resetError();
    setView("list");
    setParams({ ...Object.fromEntries(params), order: id });
  }
  async function deliver(replaceId?: string) {
    setSecret(null);
    await action.run(
      () =>
        replaceId
          ? adminApi.replaceCode(
              replaceId,
              action.intent("replace:" + replaceId, {}),
            )
          : adminApi.issue(orderId, action.intent("issue:" + orderId, {})),
      (value) => {
        setSecret(value);
        changed();
      },
    );
  }
  function showView(next: "list" | "manual" | "csv") {
    action.resetError();
    setView(next);
    setSecret(null);
    setConfirmed(false);
    const nextParams = new URLSearchParams(params);
    nextParams.delete("order");
    setParams(nextParams);
  }
  return (
    <div className="admin-management admin-orders">
      <header ref={headingRef} className="admin-management-heading">
        <div><h2>{view === "manual" ? "人工录入订单" : view === "csv" ? "CSV 订单导入" : orderId ? "订单详情" : "订单与售后"}</h2>
          <p>人工登记用于交付与售后，不代表平台核单或资金到账。</p>
        </div>
        <div className="biz-row">{view !== "list" || orderId ? <button type="button" disabled={action.busy || Boolean(accessError)} onClick={() => showView("list")}>返回订单列表</button> : <>
          <button type="button" disabled={action.busy || Boolean(accessError)} onClick={() => showView("csv")}>CSV 导入</button>
          <button type="button" className="admin-primary" disabled={action.busy || Boolean(accessError)} onClick={() => showView("manual")}>人工录入 <span aria-hidden="true">↗</span></button>
        </>}</div>
      </header>
      <Demo show={scope === "demo"} />
      {accessError ? <Failure area="orders" error={accessError} retry={() => void recoverAccess()} /> : <>
      {view === "manual" &&
      <section className="admin-form-panel">
        <div className="admin-section-heading"><h3>订单资料</h3><span>人工登记</span></div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void action.run(
              () =>
                adminApi.createOrder(
                  AdminCreateOrderSchema.parse(
                    action.intent("create-order", {
                      platform: String(data.get("platform")),
                      reference: String(data.get("reference")),
                      productVersionId: version,
                      quantity: Number(data.get("quantity")),
                      amountFen: Number(data.get("amountFen")),
                      scope,
                    }),
                  ),
                ),
              (value) => {
                selected(value.id);
                changed();
              },
            );
          }}
        >
          <ProductVersionSelect area="orders" value={version} onChange={setVersion} />
          <div className="biz-grid">
            <label>
              平台
              <select aria-label="平台" name="platform">
                <option value="manual">人工</option>
                <option value="douyin">抖音</option>
                <option value="xiaohongshu">小红书</option>
              </select>
            </label>
            <label>
              订单引用
              <input
                aria-label="订单引用"
                name="reference"
                maxLength={120}
                required
              />
            </label>
            <label>
              数量
              <input
                aria-label="数量"
                name="quantity"
                type="number"
                min="1"
                max="1000"
                defaultValue="1"
                required
              />
            </label>
            <label>
              金额（分）
              <input
                aria-label="金额（分）"
                name="amountFen"
                type="number"
                min="0"
                max="10000000"
                defaultValue="990"
                required
              />
            </label>
          </div>
          <button type="submit" className="admin-primary" disabled={action.busy || !version}>
            记录订单
          </button>
        </form>
      </section>}
      {view === "csv" && <section className="admin-form-panel admin-order-csv">
        <div className="admin-section-heading"><h3>批量导入</h3><span>先预演，再导入</span></div>
        <p>
          表头：platform,reference,productVersionId,quantity,amountFen。最多 500
          行；先预演核对，再执行导入。
        </p>
        <label>
          CSV 内容
          <textarea
            aria-label="CSV 内容"
            value={csv}
            maxLength={500000}
            onChange={(event) => {
              setCsv(event.target.value);
              setCsvResult(null);
            }}
          />
        </label>
        <label>
          选择 CSV 文件
          <input
            aria-label="选择 CSV 文件"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void action.run(
                async () => {
                  if (file.size > 2 * 1024 * 1024)
                    throw new Error("CSV too large");
                  return file.text();
                },
                (text) => {
                  setCsv(text);
                  setCsvResult(null);
                },
              );
            }}
          />
        </label>
        <div className="biz-row">
          {[true, false].map((dryRun) => (
            <button
              className={dryRun ? undefined : "admin-primary"}
              key={String(dryRun)}
              disabled={
                action.busy ||
                !csv ||
                (!dryRun && (!csvResult?.dryRun || csvResult.accepted === 0))
              }
              onClick={() =>
                void action.run(
                  () =>
                    adminApi.csv(
                      action.intent("csv:" + dryRun, { csv, dryRun }),
                    ),
                  (value) => {
                    setCsvResult(value);
                    if (!dryRun) changed();
                  },
                )
              }
            >
              {dryRun ? "预演 CSV" : "导入通过的行"}
            </button>
          ))}
        </div>
        {csvResult && (
          <>
            <p role="status">
              通过 {csvResult.accepted} 行，失败 {csvResult.rejected} 行
            </p>
            <p>
              {csvResult.dryRun
                ? "仅预演，未创建订单。"
                : "导入结果已保存；重试相同内容不会重复建单。"}
            </p>
            <div className="biz-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>行号</th>
                    <th>结果</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {csvResult.rows.map((row) => (
                    <tr key={row.row}>
                      <td>{row.row}</td>
                      <td>{row.status === "accepted" ? "通过" : "失败"}</td>
                      <td>
                        {row.orderId ? (
                          <button onClick={() => selected(row.orderId!)}>
                            查看订单
                          </button>
                        ) : (
                          (row.message ?? "可导入")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>}
      {view === "list" && !orderId && <>
      <form
        className="biz-row admin-filterbar"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setParams({
            reference: String(data.get("reference") ?? ""),
            status: String(data.get("status") ?? ""),
            platform: String(data.get("platform") ?? ""),
            page: "1",
            ...(orderId ? { order: orderId } : {}),
          });
        }}
      >
        <label>
          筛选订单引用
          <input
            aria-label="筛选订单引用"
            name="reference"
            value={referenceDraft}
            maxLength={120}
            onChange={event => setReferenceDraft(event.target.value)}
          />
        </label>
        <label>
          筛选状态
          <select
            aria-label="筛选状态"
            name="status"
            value={statusDraft}
            onChange={event => setStatusDraft(event.target.value)}
          >
            <option value="">全部</option>
            {["pending", "fulfilled", "refunded", "cancelled"].map((value) => (
              <option key={value} value={value}>{orderStatuses[value] ?? orderPlatforms[value] ?? value}</option>
            ))}
          </select>
        </label>
        <label>
          筛选平台
          <select
            aria-label="筛选平台"
            name="platform"
            value={platformDraft}
            onChange={event => setPlatformDraft(event.target.value)}
          >
            <option value="">全部</option>
            {["manual", "douyin", "xiaohongshu"].map((value) => (
              <option key={value} value={value}>{orderStatuses[value] ?? orderPlatforms[value] ?? value}</option>
            ))}
          </select>
        </label>
        <button>筛选订单</button>
        {filtered && <button type="button" onClick={clearFilters}>清除筛选</button>}
      </form>
      {!listData ? (
        list.isError ? <Failure area="orders" error={list.error} retry={() => void list.refetch()} /> :
          <div className="admin-list-loading"><Loading label="正在读取订单列表…" /></div>
      ) : (
        <section className="admin-list-results" aria-label="订单列表" aria-busy={list.isFetching}>
          {list.isError && <RefreshNotice busy={list.isFetching} retry={() => void list.refetch()} />}
          {list.isFetching && <AdminListProgress pending={list.isPlaceholderData} />}
          <div className="admin-section-heading"><h3>{filtered ? "筛选结果" : "订单记录"}</h3>
            <div className="admin-catalog-actions"><span>{listData.total} 笔人工登记订单</span><button type="button" aria-label="更新订单列表" disabled={list.isFetching} onClick={() => void list.refetch()}>更新列表</button></div>
          </div>
          {listData.items.length > 0 ? <>
          <div className="biz-table-wrap admin-data-table">
            <table>
              <caption className="admin-sr-only">人工登记订单，金额为记录值，不代表平台资金到账。</caption>
              <thead>
                <tr>
                  <th>引用</th><th>平台</th><th>数量</th>
                  <th>状态</th>
                  <th>金额</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {listData.items.map((value) => (
                  <tr key={value.id}>
                    <td><strong>{value.reference}</strong></td>
                    <td>{orderPlatforms[value.platform] ?? value.platform}</td><td>{value.quantity} 份</td>
                    <td><span className="admin-status" data-status={value.status}>{orderStatuses[value.status] ?? value.status}</span></td>
                    <td className="admin-order-amount">¥ {(value.amountFen / 100).toFixed(2)}</td>
                    <td>
                      <button className="admin-table-action" disabled={action.busy || list.isPlaceholderData} onClick={() => selected(value.id)}>
                        查看订单
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <fieldset className="admin-list-pagination" disabled={list.isPlaceholderData}>
          <Pager
            {...listData}
            onChange={(next) =>
              setParams({ ...Object.fromEntries(params), page: String(next) })
            }
          />
          </fieldset>
          </> : <AdminEmptyState title={filtered ? "没有匹配的订单" : "还没有订单"}
            actions={filtered ? <button type="button" onClick={clearFilters}>清除筛选</button> : <button type="button" onClick={() => showView("manual")}>人工录入</button>}>
            {filtered ? "调整订单引用、平台或状态，也可以清除筛选查看全部记录。" : "完成外部平台核单后，可人工录入或通过 CSV 导入。"}
          </AdminEmptyState>}
        </section>
      )}
      </>}
      {view === "list" && orderId && (
        <section className="admin-form-panel admin-order-detail">
          <div className="admin-section-heading"><h3>交付与售后</h3><div className="admin-catalog-actions"><span>完整兑换码仅首次显示</span><button type="button" aria-label="更新订单详情" disabled={detail.isFetching} onClick={() => void detail.refetch()}>更新详情</button></div></div>
          {!detailData ? (
            detail.isError ? <Failure area="orders" error={detail.error} retry={() => void detail.refetch()} /> : <Loading label="正在读取订单详情…" />
          ) : (
            <>
              {detail.isError && <RefreshNotice busy={detail.isFetching} retry={() => void detail.refetch()} />}
              <div className="admin-facts-row">
                <div><span>订单引用</span><strong>{detailData.reference}</strong></div>
                <div><span>订单状态</span><strong className="admin-status" data-status={detailData.status}>{orderStatuses[detailData.status] ?? detailData.status}</strong></div>
                <div><span>数量 / 登记金额</span><strong>{detailData.quantity} 份 / ¥ {(detailData.amountFen / 100).toFixed(2)}</strong></div>
              </div>
              <button
                className="admin-primary"
                disabled={action.busy || detail.isFetching || detailData.status !== "pending"}
                onClick={() => void deliver()}
              >
                发码
              </button>
              <ul className="admin-order-codes" aria-label="兑换码记录">{detailData.codes.map((code) => (
                <li key={code.id}>
                  <div><span className="admin-status" data-status={code.status}>{codeStatuses[code.status] ?? code.status}</span><code>{code.id}</code></div>
                  <button
                    disabled={
                      action.busy ||
                      detail.isFetching ||
                      code.status === "revoked" ||
                      detailData.status === "refunded"
                    }
                    onClick={() => void deliver(code.id)}
                  >
                    补发该码
                  </button>
                </li>
              ))}</ul>
              {detailData.codes.length === 0 && <p className="admin-order-no-codes">尚无兑换码记录。核对订单后再执行发码。</p>}
              {secret && (
                <section className="biz-card">
                  <h3>
                    {secret.deliveryAvailable
                      ? "首次交付，请及时保存"
                      : "这次只有回执，完整码不会再次导出"}
                  </h3>
                  {secret.deliveryAvailable && (
                    <>
                      <label>
                        本次交付内容
                        <textarea
                          aria-label="本次交付内容"
                          readOnly
                          value={JSON.stringify(secret, null, 2)}
                        />
                      </label>
                      <div className="biz-row">
                        <button
                          onClick={() =>
                            downloadBlob(
                              new Blob([JSON.stringify(secret, null, 2)], {
                                type: "application/json",
                              }),
                              "delivery.json",
                            )
                          }
                        >
                          保存交付文件
                        </button>
                        <button onClick={() => setSecret(null)}>
                          隐藏本次交付
                        </button>
                      </div>
                    </>
                  )}
                </section>
              )}
              <div className="admin-danger-zone"><h3>退款与撤权</h3>
              <label className="biz-option">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                已核对订单并在原平台处理退款
              </label>
              <button
                className="admin-danger"
                disabled={
                  action.busy ||
                  detail.isFetching ||
                  !confirmed ||
                  detailData.status === "refunded" ||
                  detailData.status === "cancelled"
                }
                onClick={() =>
                  void action.run(
                    () =>
                      adminApi.refund(
                        orderId,
                        action.intent("refund:" + orderId, {}),
                      ),
                    () => {
                      setSecret(null);
                      setConfirmed(false);
                      changed();
                    },
                  )
                }
              >
                退款并撤权
              </button>
              <p>
                此操作撤销本站访问，不处理平台资金。绑定归属、历史报告快照和已消耗次数保留。
              </p></div>
            </>
          )}
        </section>
      )}
      </>}
      {Boolean(action.error) && (
        !accessError && <Failure area="orders" error={action.error} retry={changed} draft={view !== "list"} onReturn={() => showView("list")} />
      )}
    </div>
  );
}
