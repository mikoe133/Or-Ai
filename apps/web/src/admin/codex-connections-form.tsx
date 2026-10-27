import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Pager,Loading} from '../business/shared.js';
import {ClientError} from '../api/client.js';
import {skillsApi} from './skills-api.js';
import {codexConnectionsApi,type CodexPreview} from './codex-connections-api.js';
import {codexDomainNames,shanghaiInput,type CodexDomain,type CodexForm,type NamedChoice} from './codex-connections-model.js';

export function CodexFailure({error,retry}:{error:unknown;retry?:()=>void}){
  return <div className="cx-error"><p role="alert">{error instanceof ClientError?error.message:'操作未完成，请核对输入或重新读取。'}</p>{retry&&<button type="button" onClick={retry}>重新读取</button>}</div>;
}
export function CodexSummary({plan,summary}:{plan:CodexPreview['plan'];summary:CodexPreview['summary']}){
  const reading=summary.grants.filter(g=>g.permissions.includes('skills:read')).map(g=>codexDomainNames[g.domain]),
    uploading=summary.grants.filter(g=>g.permissions.includes('content:write')).map(g=>codexDomainNames[g.domain]);
  const time=(value:string)=>{try{return shanghaiInput(value).replaceAll('-','/').replace('T',' ');}catch{return '尚未填写';}};
  return <div className="summary-body"><dl><dt>允许做的事</dt><dd data-summary="actions">{summary.grants.length?<ul>
    {plan.actions.createProjects&&<li>在允许分类内创建商品与计划草稿</li>}
    {!!reading.length&&<li>读取并固定 {reading.join('、')} 的商品方法</li>}
    {!!uploading.length&&<li>上传 {uploading.join('、')} 草稿</li>}
  </ul>:<span className="none">尚未允许任何操作</span>}</dd>
    <dt>能访问的商品</dt><dd data-summary="scope">{plan.workspace.kind==='existing'?`所选制作空间已有的 ${summary.existingProjectCount} 个商品，以及后续归入的商品。`:'仅限归入本连接制作空间的商品。'}<br/>分类：{summary.categories.map(c=>c.name).join('、')||'尚未选择'}</dd>
    <dt>Skill 范围</dt><dd data-summary="skills">{reading.length?'所属商品的方法；共享库：'+(summary.sharedSkills.map(s=>s.name).join('、')||'尚未授权'):'尚未允许读取 Skill'}</dd>
    <dt>额度与到期</dt><dd data-summary="limits">{plan.workspace.kind==='existing'?`最多再建 ${Math.max(0,summary.maxProjects-summary.existingProjectCount)} 个商品（总额度 ${summary.maxProjects} 个）`:`最多新建 ${summary.maxProjects||'—'} 个商品`} · 每商品 {summary.maxMethodsPerProject||'—'} 个方法 / {summary.maxRunsPerProject||'—'} 次制作批次<br/>到期：{time(plan.expiresAt)}（上海时间）</dd>
    <dt>授权边界</dt><dd className="restricted">不能审核或上架，不能修改共享 Skill 库；不能读取用户答卷和个人报告。<br/>{summary.grants.length?summary.grants.length+' 个领域分别授权，彼此不能代用。':'各内容领域分别授权。'}</dd>
  </dl></div>;
}
export function CodexDialog({title,children,footer,onClose,returnFocusId,dismissible=true}:{title:string;children:ReactNode;footer:ReactNode;onClose:()=>void;returnFocusId?:string;dismissible?:boolean}){
  const ref=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLElement|null>(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{trigger.current=(returnFocusId?document.getElementById(returnFocusId):null)??(document.activeElement instanceof HTMLElement?document.activeElement:null);ref.current?.showModal();return()=>{ref.current?.close();queueMicrotask(()=>{const target=(returnFocusId?document.getElementById(returnFocusId):null)??trigger.current;if(target?.isConnected)target.focus({preventScroll:true});});};},[]);
  return <dialog ref={ref} className="cx-dialog" aria-labelledby="cx-dialog-title" onCancel={e=>{e.preventDefault();if(dismissible)close.current();}}>
    <div className="dialog-frame"><header className="dialog-head"><h2 id="cx-dialog-title">{title}</h2><button type="button" aria-label="关闭对话框" disabled={!dismissible} onClick={onClose}>×</button></header>
      <div className="dialog-body">{children}</div><footer className="dialog-footer">{footer}</footer></div>
  </dialog>;
}

function CategoryChoices({selected,onChange,locked}:{selected:NamedChoice[];onChange:(choices:NamedChoice[])=>void;locked:boolean}){
  const [page,setPage]=useState(1),query=useQuery({queryKey:['private','admin','codex-categories',page],queryFn:({signal})=>codexConnectionsApi.categories(page,signal),enabled:!locked});
  if(locked)return <p>{selected.map(c=>c.name).join('、')}<small> · 现有工作区范围固定</small></p>;
  return <>{query.isPending?<Loading/>:query.isError?<CodexFailure error={query.error} retry={()=>void query.refetch()}/>:<>
    <div className="chips">{query.data.items.map(c=><label className="chip" key={c.id}><input type="checkbox" aria-label={'允许分类 '+c.name} checked={selected.some(s=>s.id===c.id)} disabled={selected.length>=30&&!selected.some(s=>s.id===c.id)}
      onChange={e=>onChange(e.target.checked?[...selected,{id:c.id,name:c.name}]:selected.filter(s=>s.id!==c.id))}/>{c.name}</label>)}</div>
    <Pager {...query.data} onChange={setPage}/>
    {!!selected.filter(s=>!query.data.items.some(c=>c.id===s.id)).length&&<div className="chips">{selected.filter(s=>!query.data.items.some(c=>c.id===s.id)).map(s=><button type="button" key={s.id} onClick={()=>onChange(selected.filter(c=>c.id!==s.id))}>移除 {s.name}</button>)}</div>}
  </>}</>;
}
function SharedSkills({domain,selected,onChange}:{domain:CodexDomain;selected:NamedChoice[];onChange:(choices:NamedChoice[])=>void}){
  const [page,setPage]=useState(1),[search,setSearch]=useState(''),[open,setOpen]=useState(false);
  const query=useQuery({queryKey:['private','admin','codex-shared-skills',domain,page,search],enabled:open,
    queryFn:({signal})=>skillsApi.list(domain,new URLSearchParams({page:String(page),pageSize:'10',...(search?{q:search}:{})}).toString(),signal)});
  return <details className="cx-skill-choices" onToggle={e=>setOpen(e.currentTarget.open)}><summary>{codexDomainNames[domain]} · 已选 {selected.length} 个</summary>
    <label className="field">搜索{codexDomainNames[domain]} Skill<input aria-label={'搜索 '+codexDomainNames[domain]+' Skill'} value={search} maxLength={100} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>
    {!!selected.length&&<div className="chips">{selected.map(s=><button type="button" key={s.id} aria-label={'移除共享 Skill '+s.name} onClick={()=>onChange(selected.filter(c=>c.id!==s.id))}>{s.name} ×</button>)}</div>}
    {query.isPending?<Loading/>:query.isError?<CodexFailure error={query.error} retry={()=>void query.refetch()}/>:<>
      {!query.data.items.length&&<p className="hint">没有匹配的共享 Skill。仍可使用所属项目的方法。</p>}
      {query.data.items.map(s=><label className="skill-choice" key={s.id}><input type="checkbox" aria-label={'允许共享 Skill '+s.name} checked={selected.some(c=>c.id===s.id)} disabled={selected.length>=100&&!selected.some(c=>c.id===s.id)} onChange={e=>onChange(e.target.checked?[...selected,{id:s.id,name:s.name}]:selected.filter(c=>c.id!==s.id))}/><span>{s.name}<small>{s.description}</small></span></label>)}
      <Pager {...query.data} onChange={setPage}/>
    </>}
  </details>;
}

export function CodexAdvanced({form,setForm,categories}:{form:CodexForm;setForm:(value:CodexForm)=>void;categories:NamedChoice[]}){
  const [open,setOpen]=useState(false),[page,setPage]=useState(1),workspaces=useQuery({queryKey:['private','admin','codex-workspaces',page],enabled:open,
    queryFn:({signal})=>codexConnectionsApi.workspaces(page,signal)}),locked=!!form.workspace;
  const selected=form.workspace,rows=workspaces.data?.items??[],choices=selected&&!rows.some(w=>w.id===selected.id)?[selected,...rows]:rows;
  return <details className="advanced" onToggle={e=>setOpen(e.currentTarget.open)}><summary>高级设置 <small>可选 · 一次设置，后续商品复用</small></summary>
    <div className="advanced-body"><section className="settings-section"><h3>连接与商品范围</h3><div className="fields">
      <label className="field">连接名称<input aria-label="连接名称" value={form.name} maxLength={70} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label className="field">项目归组（工作区）<select aria-label="项目归组" value={form.workspace?.id??'new'} onChange={e=>{const workspace=choices.find(w=>w.id===e.target.value)??null;
        setForm({...form,workspace,...(workspace?{categories:workspace.categoryIds.map(id=>categories.find(c=>c.id===id)??{id,name:'分类名称将在确认前核对'})}:{})});}}>
        <option value="new">自动建立我的制作空间</option>{choices.map(w=><option key={w.id} value={w.id} disabled={w.status!=='active'}>{w.name} · {w.status==='active'?`已有 ${w.projectCount} 个商品`:w.status==='expired'?'已到期':'已撤销'}</option>)}
      </select><small>仅当前管理员自己的私有空间。</small></label>
      {workspaces.isError&&<div className="wide"><CodexFailure error={workspaces.error} retry={()=>void workspaces.refetch()}/></div>}
      {workspaces.data&&workspaces.data.total>workspaces.data.pageSize&&<div className="wide"><Pager {...workspaces.data} onChange={setPage}/></div>}
      <fieldset className="wide"><legend>允许的商品分类</legend><CategoryChoices selected={form.categories} locked={locked} onChange={values=>setForm({...form,categories:values})}/>
        {locked&&<p className="hint">现有工作区范围和额度固定。它已有的商品访问也会列在确认摘要中。</p>}</fieldset>
    </div></section>
    <section className="settings-section"><h3>各类内容的访问权限</h3><p>主页面勾选操作后，才会请求下方对应权限；新建商品与共同计划仅由题目与报告连接负责。</p>
      <table className="domain-table"><thead><tr><th>允许的内容</th><th>读取 Skill</th><th>上传草稿</th></tr></thead><tbody>{(Object.keys(codexDomainNames) as CodexDomain[]).map(domain=>{const d=form.domains[domain];
        const changed=(patch:Partial<typeof d>)=>setForm({...form,domains:{...form.domains,[domain]:{...d,...patch}}});
        return <tr key={domain}><td><label><input type="checkbox" aria-label={codexDomainNames[domain]} checked={d.enabled} onChange={e=>changed({enabled:e.target.checked,...(!e.target.checked?{skills:[]}: {})})}/>{codexDomainNames[domain]}</label></td>
          <td><input type="checkbox" aria-label={codexDomainNames[domain]+'读取 Skill'} checked={d.readSkills} disabled={!d.enabled} onChange={e=>changed({readSkills:e.target.checked})}/></td>
          <td><input type="checkbox" aria-label={codexDomainNames[domain]+'上传草稿'} checked={d.uploadDrafts} disabled={!d.enabled} onChange={e=>changed({uploadDrafts:e.target.checked})}/></td></tr>;})}</tbody></table>
      <p className="hint">这里是待确认的范围，不会自动勾选主页面操作。</p>
    </section>
    <section className="settings-section"><h3>允许使用的共享 Skill（可选）</h3><p>不选择时，仅可处理所属项目的方法。共享库只读，商品定制版本另存。</p>
      {(Object.keys(codexDomainNames) as CodexDomain[]).filter(d=>form.domains[d].enabled&&form.domains[d].readSkills).map(domain=><SharedSkills key={domain} domain={domain} selected={form.domains[domain].skills}
        onChange={skills=>setForm({...form,domains:{...form.domains,[domain]:{...form.domains[domain],skills}}})}/>)}
    </section>
    <section className="settings-section"><h3>数量与有效期</h3><div className="fields">
      {([['maxProjects','最多新建商品数'],['maxMethodsPerProject','每商品方法上限'],['maxRunsPerProject','每商品制作批次上限']] as const).map(([key,label])=><label className="field" key={key}>{label}<input type="number" aria-label={label} min={1} max={100} disabled={locked} value={form.workspace?.[key]??form[key]}
        onChange={e=>setForm({...form,[key]:Number(e.target.value)})}/><small>1–100，{key==='maxRunsPerProject'?'仅限制记录，不启动制作。':locked?'现有工作区额度固定。':'后续商品复用同一连接。'}</small></label>)}
      <label className="field">连接到期时间<input aria-label="连接到期时间" type="datetime-local" value={form.expiresLocal} onChange={e=>setForm({...form,expiresLocal:e.target.value})}/><small>上海时间 · {form.workspace?'不能晚于空间到期：'+shanghaiInput(form.workspace.expiresAt).replace('T',' '):'最长 90 天，空间与连接同日到期。'}</small></label>
    </div><p className="hint">超额或到期后停止新建和写入，已保存的成果保留。</p></section>
  </div></details>;
}
