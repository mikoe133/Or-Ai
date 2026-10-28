import { useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Demo, Failure, Loading, Pager } from "../business/shared.js";
import { adminApi } from "./api.js";
import { HorizontalBars, RingChart, formatCount } from "./overview-charts.js";
import {
  auditActionLabels, auditCounts, auditEntityLabels, eventLabels, eventSources,
  experienceCounts, labelFor, sourceCounts, statusCounts, type EventSource, type OverviewData,
} from "./overview-model.js";
import "./overview.css";
import { isAccessFailure, RefreshNotice } from "./refresh-notice.js";

function Metric({ label, value, note, icon }: { label: string; value: ReactNode; note: string; icon: string }) {
  return <div className="admin-stat">
    <span className="overview-metric-label"><span>{label}</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={icon} /></svg></span>
    <strong>{value}</strong><small>{note}</small>
  </div>;
}

function EventCharts({ overview }: { overview: OverviewData }) {
  const [source, setSource] = useState<EventSource | "all">("all");
  const counts = experienceCounts(overview.events, source);
  const sourceName = source === "all" ? "全部来源" : eventSources.find(item => item.key === source)!.label;
  return <>
    <div className="overview-chart-grid">
      <section className="overview-chart-panel overview-event-panel" aria-label="体验事件">
        <div className="overview-panel-heading"><h3>体验事件</h3><span className="overview-scope">累计次数</span></div>
        <div className="overview-segmented" role="group" aria-label="筛选事件来源">
          {[{ key: "all", label: "全部来源" }, ...eventSources].map(item => <button key={item.key} type="button" aria-pressed={source === item.key} onClick={() => setSource(item.key as EventSource | "all")}>{item.label}</button>)}
        </div>
        <div aria-live="polite" aria-atomic="true" className="admin-sr-only">{sourceName}，共 {formatCount(counts.reduce((sum, item) => sum + item.count, 0))} 次事件。</div>
        <HorizontalBars data={counts} label={`体验事件数量 · ${sourceName}`} empty={`${sourceName}暂无体验事件。`} />
        <p className="overview-chart-note">按事件次数独立统计，同一用户可产生多次事件。</p>
      </section>
      <section className="overview-chart-panel" aria-label="订单状态分布">
        <div className="overview-panel-heading"><h3>订单状态</h3><Link to="/admin/orders">查看订单 ↗</Link></div>
        <RingChart data={statusCounts(overview.orders.statuses)} label="人工登记订单状态分布" unit="笔登记订单" />
        <p className="overview-chart-note">来自人工登记记录，登记金额未核实平台支付。</p>
      </section>
    </div>
    <details className="overview-data-details">
      <summary>查看体验事件明细<span>按事件与来源核对原始数量</span></summary>
      <div className="biz-table-wrap"><table>
        <thead><tr><th>事件</th><th>来源</th><th>数量</th></tr></thead>
        <tbody>{overview.events.map(event => <tr key={event.kind + event.source}>
          <td title={event.kind}>{eventLabels[event.kind]}</td>
          <td title={event.source}>{eventSources.find(item => item.key === event.source)!.label}</td>
          <td>{formatCount(event.count)}</td>
        </tr>)}{overview.events.length === 0 && <tr><td colSpan={3}>暂无体验事件。</td></tr>}</tbody>
      </table></div>
    </details>
  </>;
}

function Audit() {
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState<"action" | "entityKind">("action");
  const audit = useQuery({ queryKey: ["private", "admin", "audit", page], queryFn: ({ signal }) => adminApi.audit(page, signal), placeholderData: keepPreviousData });
  const data = isAccessFailure(audit.error) ? undefined : audit.data;
  return <section className="overview-audit" aria-label="操作审计" aria-busy={audit.isFetching}>
    <div className="admin-section-title"><h3>操作审计</h3>{data && <span className="overview-scope">共 {formatCount(data.total)} 条记录</span>}</div>
    {!data ? (audit.isError ? <Failure error={audit.error} retry={() => void audit.refetch()} /> : <Loading />) : <>
      {audit.isError && <RefreshNotice busy={audit.isFetching} retry={() => void audit.refetch()} />}
      <div className="overview-chart-panel overview-audit-chart">
        <div className="overview-panel-heading"><div><h4>当前页操作分布</h4><p aria-live="polite">第 {data.page} 页 · 本页 {data.items.length} 条{audit.isPlaceholderData && ` · 正在读取第 ${page} 页`}</p></div>
          <div className="overview-segmented" role="group" aria-label="审计图表分组">
            <button type="button" aria-pressed={groupBy === "action"} onClick={() => setGroupBy("action")}>按操作</button>
            <button type="button" aria-pressed={groupBy === "entityKind"} onClick={() => setGroupBy("entityKind")}>按对象</button>
          </div>
        </div>
        <HorizontalBars data={auditCounts(data.items, groupBy)} label={`当前页审计${groupBy === "action" ? "操作" : "对象"}分布`} empty="当前页暂无操作记录。" />
        <p className="overview-chart-note">仅统计当前页，翻页后同步更新。</p>
      </div>
      <div className="overview-audit-detail-heading"><h4>操作明细</h4><span>按时间倒序</span></div>
      <div className="biz-table-wrap"><table>
        <thead><tr><th>时间</th><th>操作</th><th>对象</th></tr></thead>
        <tbody>{data.items.map(item => <tr key={item.id}>
          <td><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("zh-CN")}</time></td>
          <td title={item.action}>{labelFor(auditActionLabels, item.action)}</td>
          <td title={item.entityKind}>{labelFor(auditEntityLabels, item.entityKind)}<span className="admin-audit-object">{item.entityId}</span></td>
        </tr>)}{data.items.length === 0 && <tr><td colSpan={3}>暂无操作记录。</td></tr>}</tbody>
      </table></div>
      <fieldset className="overview-pagination" disabled={audit.isPlaceholderData} aria-label="审计分页"><Pager {...data} onChange={setPage} /></fieldset>
    </>}
  </section>;
}

export function Overview() {
  const result = useQuery({ queryKey: ["private", "admin", "overview"], queryFn: ({ signal }) => adminApi.overview(signal) });
  const data = isAccessFailure(result.error) ? undefined : result.data;
  return <div className="admin-overview">
    <div className="admin-heading"><div><h2>运营概览</h2><p>查看累计登记、体验事件与最近操作。</p></div><Link className="biz-button admin-primary" to="/admin/content">进入内容工作台 ↗</Link></div>
    {!data ? (result.isError ? <Failure error={result.error} retry={() => void result.refetch()} /> : <Loading />) : <>
      <Demo show={data.scope === "demo"} />
      <div className="admin-stat-strip">
        <Metric label="人工登记订单" value={formatCount(data.orders.recordedCount)} note="运营记录 · 笔" icon="M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3" />
        <Metric label="登记金额" value={`¥${(data.orders.recordedAmountFen / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} note="未核实平台支付" icon="m7 4 5 7 5-7 M6 12h12 M6 16h12 M12 11v10" />
        <Metric label="商品" value={formatCount(data.products)} note="商品资料 · 款" icon="M4 7h16v14H4z M8 7V3h8v4 M4 12h16" />
        <Metric label="素材" value={formatCount(data.assets)} note="已登记内容 · 份" icon="M3 5h18v15H3z M3 16l5-6 5 5 3-3 5 5 M16 8h.01" />
      </div>
      <div className="overview-update-note"><span className="overview-chart-key" aria-hidden="true" />累计数据 · 截至 <time dateTime={data.generatedAt}>{new Date(data.generatedAt).toLocaleString("zh-CN")}</time></div>
    </>}
    <div className="admin-overview-grid">
      <div className="admin-overview-main">
        {data && <EventCharts overview={data} />}
        <Audit />
      </div>
      <aside className="admin-overview-aside" aria-label="运营工作入口">
        {data && <section className="overview-source-panel" aria-label="事件来源占比"><h3>事件来源</h3><RingChart data={sourceCounts(data.events)} label="所有体验事件的来源占比" unit="次累计事件" /><p className="overview-chart-note">按事件记录来源统计，来源归因尚未确认。</p></section>}
        <section><h3>继续工作</h3>
          {[{ to: "/admin/content", title: "制作与核对内容", note: "题库、报告、封面、视频与文案" }, { to: "/admin/skills", title: "维护制作方法", note: "五类 Skill 与固定参考资料" }, { to: "/admin/orders", title: "处理订单与交付", note: "人工登记、发码与售后" }, { to: "/admin/machine", title: "查看 Codex 连接", note: "授权范围与调用记录" }].map(item => <Link key={item.to} className="admin-shortcut" to={item.to}><span><strong>{item.title}</strong><small>{item.note}</small></span><span>↗</span></Link>)}
        </section>
        <section><h3>数据口径</h3><p>登记金额未核实平台支付，不等于实际收入。</p><p>浏览来自客户端观察；兑换、开始、完成与退款由业务事务记录。事件次数不等于用户人数。</p></section>
      </aside>
    </div>
  </div>;
}
