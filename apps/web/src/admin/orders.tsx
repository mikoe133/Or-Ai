import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AdminCreateOrderSchema } from "@orai/contracts/admin";
import { adminApi } from "./api.js";
import { ProductVersionSelect } from "./shared.js";
import {
  Demo,
  Failure,
  Loading,
  Pager,
  useAction,
} from "../business/shared.js";
import { downloadBlob } from "../business/download.js";
import "./management.css";
const orderStatuses: Record<string, string> = { pending: "待交付", fulfilled: "已交付", refunded: "已退款", cancelled: "已取消" };
const orderPlatforms: Record<string, string> = { manual: "人工", douyin: "抖音", xiaohongshu: "小红书" };
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
  const list = useQuery({
    queryKey: ["private", "admin", "orders", params.toString()],
    queryFn: ({ signal }) =>
      adminApi.orders(
        new URLSearchParams({
          page: String(page),
          ...(params.get("reference")
            ? { reference: params.get("reference")! }
            : {}),
          ...(params.get("status") ? { status: params.get("status")! } : {}),
          ...(params.get("platform")
            ? { platform: params.get("platform")! }
            : {}),
        }).toString(),
        signal,
      ),
  });
  const detail = useQuery({
    queryKey: ["private", "admin", "order", orderId],
    queryFn: ({ signal }) => adminApi.order(orderId, signal),
    enabled: Boolean(orderId),
  });
  useEffect(() => {
    headingRef.current?.scrollIntoView({ block: "start" });
    setSecret(null);
    setConfirmed(false);
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
        <div><span className="admin-eyebrow">COMMERCE / ORDERS</span><h2>{view === "manual" ? "人工录入订单" : view === "csv" ? "CSV 订单导入" : orderId ? "订单详情" : "订单与售后"}</h2>
          <p>人工登记用于交付与售后，不代表平台核单或资金到账。</p>
        </div>
        <div className="biz-row">{view !== "list" || orderId ? <button type="button" disabled={action.busy} onClick={() => showView("list")}>返回订单列表</button> : <>
          <button type="button" disabled={action.busy} onClick={() => showView("csv")}>CSV 导入</button>
          <button type="button" className="admin-primary" disabled={action.busy} onClick={() => showView("manual")}>人工录入 <span aria-hidden="true">↗</span></button>
        </>}</div>
      </header>
      <Demo show={scope === "demo"} />
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
          <ProductVersionSelect value={version} onChange={setVersion} />
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
      {view === "csv" && <section className="admin-form-panel">
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
            defaultValue={params.get("reference") ?? ""}
          />
        </label>
        <label>
          筛选状态
          <select
            aria-label="筛选状态"
            name="status"
            defaultValue={params.get("status") ?? ""}
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
            defaultValue={params.get("platform") ?? ""}
          >
            <option value="">全部</option>
            {["manual", "douyin", "xiaohongshu"].map((value) => (
              <option key={value} value={value}>{orderStatuses[value] ?? orderPlatforms[value] ?? value}</option>
            ))}
          </select>
        </label>
        <button>筛选订单</button>
      </form>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <Failure error={list.error} retry={() => void list.refetch()} />
      ) : (
        <>
          <div className="admin-section-heading"><h3>订单记录</h3><span>{list.data.total} 笔人工登记订单</span></div>
          <div className="biz-table-wrap admin-data-table">
            <table>
              <thead>
                <tr>
                  <th>引用</th><th>平台</th><th>数量</th>
                  <th>状态</th>
                  <th>金额</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((value) => (
                  <tr key={value.id}>
                    <td><strong>{value.reference}</strong></td>
                    <td>{orderPlatforms[value.platform] ?? value.platform}</td><td>{value.quantity} 份</td>
                    <td><span className="admin-status" data-status={value.status}>{orderStatuses[value.status] ?? value.status}</span></td>
                    <td>¥ {(value.amountFen / 100).toFixed(2)}</td>
                    <td>
                      <button onClick={() => selected(value.id)}>
                        查看订单
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data.total === 0 && <p>没有匹配的订单。</p>}
          <Pager
            {...list.data}
            onChange={(next) =>
              setParams({ ...Object.fromEntries(params), page: String(next) })
            }
          />
        </>
      )}
      </>}
      {view === "list" && orderId && (
        <section className="admin-form-panel admin-order-detail">
          <div className="admin-section-heading"><h3>交付与售后</h3><span>完整兑换码仅首次显示</span></div>
          {detail.isPending ? (
            <Loading />
          ) : detail.isError ? (
            <Failure error={detail.error} retry={() => void detail.refetch()} />
          ) : (
            <>
              <div className="admin-facts-row">
                <div><span>订单引用</span><strong>{detail.data.reference}</strong></div>
                <div><span>订单状态</span><strong>{orderStatuses[detail.data.status] ?? detail.data.status}</strong></div>
                <div><span>数量 / 金额</span><strong>{detail.data.quantity} 份 / ¥ {(detail.data.amountFen / 100).toFixed(2)}</strong></div>
              </div>
              <button
                className="admin-primary"
                disabled={action.busy || detail.data.status !== "pending"}
                onClick={() => void deliver()}
              >
                发码
              </button>
              {detail.data.codes.map((code) => (
                <div key={code.id} className="biz-row">
                  <small>
                    码 ID {code.id} · {code.status}
                  </small>
                  <button
                    disabled={
                      action.busy ||
                      code.status === "revoked" ||
                      detail.data.status === "refunded"
                    }
                    onClick={() => void deliver(code.id)}
                  >
                    补发该码
                  </button>
                </div>
              ))}
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
                  !confirmed ||
                  detail.data.status === "refunded" ||
                  detail.data.status === "cancelled"
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
      {Boolean(action.error) && (
        <Failure error={action.error} retry={changed} />
      )}
    </div>
  );
}
