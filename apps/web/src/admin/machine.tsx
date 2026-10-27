import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { MachineCredentialCreateSchema } from "@orai/contracts/admin";
import { Demo, Failure, Loading, Pager, useAction } from "../business/shared.js";
import { adminApi } from "./api.js";
import { machineApi, type MachineCredential } from "./machine-api.js";
import { skillsApi } from "./skills-api.js";
import { skillDomains } from "./skills-model.js";
import "./management.css";
import "./machine.css";

type Domain = MachineCredential["domain"];
type Permission = MachineCredential["permissions"][number];
type Choice = { id: string; name: string };
const permissions: Record<Permission, string> = {
  "content:read": "读取本领域内容",
  "content:write": "写入本领域草稿与媒体",
  "skills:read": "读取本领域 skill",
  "skills:write": "写入本领域 skill 与参考附件",
  "context:read": "读取授权商品的创作上下文",
  "projects:read": "读取工作区项目与固定计划",
  "projects:write": "追加项目共同设定与计划",
  "projects:create": "在工作区额度内创建项目草稿",
  "methods:create": "在工作区额度内创建项目方法",
};
const prebuiltPermissions: Permission[] = ['content:read','content:write','skills:read','skills:write','context:read'];
const statuses = { active: "有效", expired: "已到期", revoked: "已撤销", disabled: "管理员已停用" };
const credentialStatus = (value: MachineCredential) => value.unavailableReason === 'workspace_revoked' ? '所属工作区已撤销' :
  value.unavailableReason === 'workspace_expired' ? '所属工作区已到期' : statuses[value.status];
const outcomes = { success: "成功", denied: "已拒绝", failed: "失败" };
const expiry = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const date = (value: string) => new Date(value).toLocaleString("zh-CN");

function ScopePicker({ kind, domain, selected, onChange }: {
  kind: "product" | "skill"; domain: Domain; selected: Choice[]; onChange: (values: Choice[]) => void;
}) {
  const [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const title = kind === "product" ? "商品" : "skill";
  const options = useQuery({
    queryKey: ["private", "admin", "machine-scope", kind, domain, search, page],
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams({ [kind === "product" ? "query" : "q"]: search, page: String(page), pageSize: "10" }).toString();
      return kind === "product" ? adminApi.products(query, signal) : skillsApi.list(domain, query, signal);
    },
  });
  return (
    <fieldset className="machine-scope">
      <legend>{title}范围 · 已选 {selected.length}/100</legend>
      <label>搜索{title}
        <input aria-label={"搜索授权" + title} value={search} maxLength={100} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      </label>
      {selected.length > 0 && <ul className="machine-selections" aria-label={"已选授权" + title}>
        {selected.map(value => <li key={value.id}><span>{value.name}</span><button type="button" aria-label={"移除授权" + title + " " + value.name}
          onClick={() => onChange(selected.filter(item => item.id !== value.id))}>移除</button></li>)}
      </ul>}
      {options.isPending ? <Loading /> : options.isError ? <Failure error={options.error} retry={() => void options.refetch()} /> : <>
        {!options.data.items.length && <p>没有匹配的{title}。</p>}
        {options.data.items.map(value => <label className="machine-check" key={value.id}>
          <input type="checkbox" aria-label={"授权" + title + " " + value.name} checked={selected.some(item => item.id === value.id)}
            disabled={selected.length >= 100 && !selected.some(item => item.id === value.id)}
            onChange={event => onChange(event.target.checked ? [...selected, { id: value.id, name: value.name }] : selected.filter(item => item.id !== value.id))} />
          <span>{value.name}<small>{value.id}</small></span>
        </label>)}
        <Pager {...options.data} onChange={setPage} />
      </>}
    </fieldset>
  );
}

function Calls({ credential }: { credential: MachineCredential }) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["private", "admin", "machine-calls", credential.id, page],
    queryFn: ({ signal }) => machineApi.calls(credential.id, page, signal),
  });
  return <section className="biz-card" aria-label={"调用记录 " + credential.name}>
    <div className="biz-row"><h3>{credential.name} · 调用记录</h3><button type="button" onClick={() => void result.refetch()}>刷新调用记录</button></div>
    <p>记录授权检查与操作结果，可用于核对内容读取、草稿保存和文件上传；不会展示凭据原文或文件内容。</p>
    {result.isPending ? <Loading /> : result.isError ? <Failure error={result.error} retry={() => void result.refetch()} /> : <>
      {result.data.items.length ? <div className="biz-table-wrap"><table><thead><tr><th>时间</th><th>操作</th><th>结果</th><th>对象 / 错误</th></tr></thead><tbody>
        {result.data.items.map(value => <tr key={value.id}><td>{date(value.createdAt)}</td><td>{value.operation}</td><td>{outcomes[value.outcome]}</td><td>{value.errorCode ?? value.entityId ?? "—"}</td></tr>)}
      </tbody></table></div> : <p>暂无调用记录。</p>}
      <Pager {...result.data} onChange={setPage} />
    </>}
  </section>;
}

export function MachineConnections({ scope }: { scope: "demo" | "live" }) {
  const headingRef = useRef<HTMLElement>(null);
  const client = useQueryClient(), action = useAction(), location = useLocation();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1), [name, setName] = useState(""), [domain, setDomain] = useState<Domain>("assessment");
  const [grants, setGrants] = useState<Permission[]>(["content:read", "context:read"]);
  const [products, setProducts] = useState<Choice[]>([]), [skills, setSkills] = useState<Choice[]>([]);
  const [days, setDays] = useState(30), [expiresAt, setExpiresAt] = useState(() => expiry(30));
  // One-time secrets are never placed in a query cache, URL or browser storage.
  const [issued, setIssued] = useState<Awaited<ReturnType<typeof machineApi.create>> | null>(null);
  const [notice, setNotice] = useState(""), [selected, setSelected] = useState<MachineCredential | null>(null);
  const [revokeId, setRevokeId] = useState(""), [signingAttempt, setSigningAttempt] = useState(0);
  useEffect(() => { headingRef.current?.scrollIntoView({ block: "start" }); }, [creating, selected?.id]);
  const list = useQuery({
    queryKey: ["private", "admin", "machine-credentials", page],
    queryFn: ({ signal }) => machineApi.list(page, signal),
  });
  useEffect(() => { setIssued(null); setNotice(""); }, [location.key]);
  useEffect(() => {
    const hide = () => setIssued(null);
    window.addEventListener("pagehide", hide);
    return () => window.removeEventListener("pagehide", hide);
  }, []);
  const needsProducts = grants.some(value => value.startsWith("content:") || value === "context:read");
  const needsSkills = grants.some(value => value.startsWith("skills:"));
  function clearSecret() { setIssued(null); setNotice(""); }
  function changed() {
    void client.invalidateQueries({ queryKey: ["private", "admin", "machine-credentials"] });
    void client.invalidateQueries({ queryKey: ["private", "admin", "audit"] });
  }
  async function create() {
    clearSecret();
    await action.run(() => machineApi.create(MachineCredentialCreateSchema.parse(action.intent("create-machine-credential:" + signingAttempt, {
      name, domain, permissions: grants, productIds: needsProducts ? products.map(value => value.id) : [],
      skillIds: needsSkills ? skills.map(value => value.id) : [], expiresAt,
    }))), value => {
      setIssued(value);
      setCreating(false);
      setSelected(null);
      changed();
    });
  }
  async function revoke(credential: MachineCredential) {
    clearSecret();
    await action.run(() => machineApi.revoke(credential.id, action.intent("revoke-machine:" + credential.id, {})), value => {
      setNotice("连接已撤销，后续调用及上传完成将被拒绝。");
      setRevokeId("");
      if (selected?.id === value.id) setSelected(value);
      changed();
    });
  }
  return <div className="admin-management admin-machine">
    <header ref={headingRef} className="admin-management-heading">
      <div><span className="admin-eyebrow">INTEGRATIONS / MCP</span><h2>{creating ? "创建 MCP 连接" : selected ? "调用记录" : "MCP 连接"}</h2>
        <p>{creating ? "明确连接的领域、权限、商品与 skill 范围后签发凭据。" : "为四类制作任务建立独立连接，控制授权范围并查看调用记录。"}</p>
      </div>
      <div className="biz-row">{creating || selected ? <button type="button" disabled={action.busy} onClick={() => { clearSecret(); setCreating(false); setSelected(null); }}>返回连接列表</button> :
        <button type="button" className="admin-primary" disabled={action.busy} onClick={() => { clearSecret(); setCreating(true); }}>创建连接 <span aria-hidden="true">↗</span></button>}
      </div>
    </header>
    <Demo show={scope === "demo"} />
    {creating && <div className="admin-machine-create-layout"><section className="admin-form-panel" aria-label="创建 MCP 连接">
      <div className="admin-section-heading"><h3>连接资料与权限</h3><span>独立领域授权</span></div>
      <p>每个连接只授权一个领域，沿用当前管理员的{scope === "demo" ? "演示" : "正式"}数据范围。新商品和新 skill 需要重新签发授权。</p>
      <form onSubmit={event => { event.preventDefault(); void create(); }} onChange={clearSecret} onClickCapture={() => { if (issued) clearSecret(); }}>
        <fieldset disabled={action.busy}>
          <div className="biz-grid">
            <label>连接名称<input aria-label="连接名称" required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="例如：每日封面制作" /></label>
            <label>内容领域<select aria-label="连接领域" value={domain} onChange={event => { setDomain(event.target.value as Domain); setSkills([]); }}>
              {Object.entries(skillDomains).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select></label>
            <label>有效期<select aria-label="连接有效期" value={days} onChange={event => { const value = Number(event.target.value); setDays(value); setExpiresAt(expiry(value)); }}>
              {[1, 7, 30, 90].map(value => <option value={value} key={value}>{value} 天</option>)}
            </select></label>
          </div>
          <small>到期时间：{date(expiresAt)}。到期、撤销或管理员停用后立即停止授权。</small>
          <fieldset><legend>允许的操作</legend>
            {prebuiltPermissions.map(value => <label className="machine-check" key={value}><input type="checkbox" aria-label={permissions[value]}
              checked={grants.includes(value as Permission)} onChange={event => setGrants(event.target.checked ? [...grants, value as Permission] : grants.filter(item => item !== value))} /><span>{permissions[value]}</span></label>)}
          </fieldset>
          <div className="biz-grid">
            {needsProducts && <ScopePicker kind="product" domain={domain} selected={products} onChange={value => { clearSecret(); setProducts(value); }} />}
            {needsSkills && <ScopePicker key={domain} kind="skill" domain={domain} selected={skills} onChange={value => { clearSecret(); setSkills(value); }} />}
          </div>
          {((needsProducts && !products.length) || (needsSkills && !skills.length)) && <p>请为所选权限明确选择{needsProducts && !products.length ? "商品" : ""}{needsProducts && !products.length && needsSkills && !skills.length ? "及" : ""}{needsSkills && !skills.length ? " skill" : ""}范围。</p>}
          <div className="biz-row">
            <button type="submit" className="admin-primary" disabled={!name.trim() || !grants.length || (needsProducts && !products.length) || (needsSkills && !skills.length)}>签发连接凭据</button>
            <button type="button" onClick={() => { clearSecret(); action.resetError(); setSigningAttempt(value => value + 1); setExpiresAt(expiry(days)); }}>开始新的签发</button>
          </div>
          <small>同一请求重试不会重复创建。原凭据遗失时，请先撤销旧连接，再选择「开始新的签发」。</small>
        </fieldset>
      </form>
    </section>
      <aside className="admin-machine-summary" aria-label="授权摘要">
        <h3>授权摘要</h3>
        <dl><dt>内容领域</dt><dd>{skillDomains[domain]}</dd><dt>有效期</dt><dd>{days} 天</dd>
          <dt>商品范围</dt><dd>{needsProducts ? `${products.length} 个已选商品` : "未请求商品访问"}</dd>
          <dt>Skill 范围</dt><dd>{needsSkills ? `${skills.length} 个已选 skill` : "未请求 skill 访问"}</dd>
          <dt>允许的操作</dt><dd>{grants.length} 项</dd></dl>
        <p className="admin-context-note">凭据只在签发后显示一次，请保存到本地客户端的安全环境配置。</p>
        <p>任务产物会保存为草稿，审核与采用请前往内容工作台。</p>
      </aside>
    </div>}
    {issued && <section className="biz-card machine-secret" aria-label="新签发连接">
      <h3>{issued.credential.name} · 已签发</h3>
      {issued.token ? <>
        <p>凭据只在本次响应显示。请保存到本地客户端的安全环境配置；离开页面或开始其他操作后会清除。</p>
        <label>一次性连接凭据<input aria-label="一次性连接凭据" value={issued.token} readOnly autoComplete="off" spellCheck={false} /></label>
        <div className="biz-row">
          <button type="button" onClick={async () => {
            const token = issued.token;
            if (!token) return;
            try {
              await navigator.clipboard.writeText(token);
              setNotice("已复制，请保存到安全的本地配置。");
            } catch {
              setNotice("复制未完成，请手动选择并复制凭据。");
            }
          }}>复制凭据</button>
          <button type="button" onClick={clearSecret}>已保存，隐藏凭据</button>
        </div>
      </> : <p role="status">此签发请求已经处理，凭据原文不会再次返回。如未保存，请撤销此连接后重新签发。</p>}
    </section>}
    {notice && <p role="status">{notice}</p>}
    {Boolean(action.error) && <Failure error={action.error} />}
    {!creating && !selected && <section className="admin-machine-list-panel" aria-label="已有 MCP 连接">
      <div className="admin-section-heading"><h3>已有连接{list.data ? ` · ${list.data.total}` : ""}</h3><button type="button" disabled={action.busy} onClick={() => { clearSecret(); void list.refetch(); }}>刷新连接列表</button></div>
      {list.isPending ? <Loading /> : list.isError ? <Failure error={list.error} retry={() => { clearSecret(); void list.refetch(); }} /> : <>
        {!list.data.items.length && <p>尚未创建连接。</p>}
        <div className="machine-list">{list.data.items.map(value => <article className="machine-entry" key={value.id} aria-label={"连接 " + value.name}>
          <div className="machine-entry-identity"><h4>{value.name}</h4><span>{skillDomains[value.domain]}</span></div>
          <div className="machine-entry-meta"><span className="admin-status" data-status={value.status}>{credentialStatus(value)}</span><small>到期 {date(value.expiresAt)}</small></div>
          <div className="machine-entry-permissions"><p>{value.permissions.map(permission => permissions[permission]).join(" · ")}</p><small>{value.workspaceId?'包含所属工作区的项目和本领域方法 · ':''}固定商品 {value.productIds.length} 个 · 共享 skill {value.skillIds.length} 个</small></div>
          <details onToggle={event => { if (event.currentTarget.open) clearSecret(); }}><summary>查看授权范围</summary>
            <p>连接 ID：{value.id}</p><p>数据范围：{value.scope === "demo" ? "演示" : "正式"}</p>
            {value.workspaceId&&<p>所属工作区：{value.workspaceId}</p>}
            <p>固定商品：{value.productIds.join("、") || (value.workspaceId?"按工作区归属授权":"未授权")}</p><p>共享 skill：{value.skillIds.join("、") || (value.workspaceId?"仅所属项目的方法":"未授权")}</p>
          </details>
          <div className="biz-row machine-entry-actions">
            <button type="button" disabled={action.busy} onClick={() => { clearSecret(); setSelected(value); }}>查看调用记录</button>
            {!value.revokedAt && <button type="button" className="admin-danger" disabled={action.busy} onClick={() => { clearSecret(); setRevokeId(value.id); }}>撤销连接</button>}
          </div>
          {revokeId === value.id && <div role="group" aria-label={"确认撤销 " + value.name}>
            <p>撤销后此凭据无法恢复；需要继续制作时可签发新连接。</p>
            <div className="biz-row"><button type="button" className="admin-danger" disabled={action.busy} onClick={() => void revoke(value)}>确认撤销连接</button><button type="button" disabled={action.busy} onClick={() => setRevokeId("")}>取消</button></div>
          </div>}
        </article>)}</div>
        <Pager {...list.data} onChange={value => { clearSecret(); setPage(value); }} />
      </>}
    </section>}
    {selected && <Calls key={selected.id} credential={selected} />}
    {!creating && !selected && <p className="admin-context-note">连接支持读取授权内容与固定 skill、获取创作上下文、校验引用、上传文件及保存草稿。内容采用由管理员在工作台完成。</p>}
  </div>;
}
