import { useEffect,useRef,useState,useCallback,type ReactNode } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Link,useSearchParams } from 'react-router-dom';
import { ProjectWorkspaceQuerySchema,ProductConfigurationSchema,AssetAuthoringSchema } from '@orai/contracts/admin';
import { Failure,Loading,useAction } from '../business/shared.js';
import { api } from '../api/consumer.js';
import { projectApi,type ProjectWorkspaceData,type ProjectModule,type ProjectMethod,type ProjectOutput,type ProjectRecord } from './project-api.js';
import { ProjectGraph } from './project-graph.js';
import { moduleSummary,projectDomains,projectPurposes,projectStates,shortId,fileSize } from './project-model.js';
import { experienceApi } from './experience-api.js';
import { ReportHost } from '../experience/report-host.js';
import {useProjectPlanning,PlanningToolbar,PlanningDialog} from './project-planning.js';
import {ProjectMethods} from './project-methods.js';
import {ProductionRunOperations} from './production-run-operations.js';
import {ProductPlanPanel} from './product-plan-panel.js';
import './project-workspace.css';

const when=(value:string)=>new Date(value).toLocaleString('zh-CN',{hour12:false});
export function ProjectWorkspace({productId,productName,onEdit,initialProfile=null,onDirty}:{productId:string;productName:string;onEdit:(tab:string)=>void;
  initialProfile?:ProjectWorkspaceData['profile'];onDirty?:(value:boolean)=>void}){
  const [params,setParams]=useSearchParams(),client=useQueryClient(),[view,setView]=useState<'canvas'|'directory'>(()=>matchMedia('(max-width:820px)').matches?'directory':'canvas'),
    [search,setSearch]=useState(''),[expanded,setExpanded]=useState<string|null>(null),[focus,setFocus]=useState<string|null>(null),[mobileOpen,setMobileOpen]=useState(false),
    [mobile,setMobile]=useState(()=>matchMedia('(max-width:1100px)').matches),dialog=useRef<HTMLDialogElement>(null),inspectorElement=useRef<HTMLElement>(null);
  const parsed=ProjectWorkspaceQuerySchema.safeParse({planRevisionId:params.get('plan')??undefined,runId:params.get('run')??undefined,reviewId:params.get('review')??undefined,
    planPage:params.get('planPage')??1,reviewPage:params.get('reviewPage')??1,runPage:params.get('runPage')??1}),query=parsed.success?parsed.data:null;
  const workspace=useQuery({queryKey:['private','admin','project-workspace',productId,query],enabled:!!query,
    queryFn:({signal})=>projectApi.workspace(productId,query!,signal),refetchOnWindowFocus:false});
  const planningDirty=useRef(false),methodsDirty=useRef(false),runsDirty=useRef(false),lastMethodKey=useRef(''),
    planningChanged=useCallback((value:boolean)=>{planningDirty.current=value;onDirty?.(value||methodsDirty.current||runsDirty.current);},[onDirty]),
    methodsChanged=useCallback((value:boolean)=>{methodsDirty.current=value;onDirty?.(value||planningDirty.current||runsDirty.current);},[onDirty]),
    runsChanged=useCallback((value:boolean)=>{runsDirty.current=value;onDirty?.(value||planningDirty.current||methodsDirty.current);},[onDirty]);
  if(params.get('methodModule'))lastMethodKey.current=params.get('methodModule')!;
  const editor=useProjectPlanning({productId,data:workspace.data,productName,profile:initialProfile,onDirty:planningChanged,
    onSaved:planId=>{change({plan:planId,run:null,review:null,node:null});refreshed();setFocus(null);setExpanded(null);},
    onReload:()=>{change({plan:null,run:null,review:null,node:null});refreshed();},
    onAdded:key=>{setFocus('draft:'+key);setExpanded(null);setSearch('');change({node:'module:draft:'+key});}});
  const selected=params.get('node')??'plan';
  useEffect(()=>{const m=matchMedia('(max-width:1100px)'),change=()=>setMobile(m.matches);m.addEventListener('change',change);return()=>m.removeEventListener('change',change);},[]);
  useEffect(()=>{if(mobile&&mobileOpen&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[mobileOpen,mobile,workspace.data]);
  useEffect(()=>{setExpanded(null);setFocus(null);setMobileOpen(false);},[workspace.data?.plan?.id,workspace.data?.review?.id,workspace.data?.run?.id]);
  useEffect(()=>{inspectorElement.current?.scrollTo(0,0);dialog.current?.scrollTo(0,0);},[selected,workspace.data?.plan?.id,workspace.data?.review?.id]);
  function change(fields:Record<string,string|null>){setParams(current=>{const next=new URLSearchParams(current);for(const [key,value] of Object.entries(fields))value===null?next.delete(key):next.set(key,value);return next;});}
  function select(key:string){
    const data=editor.data,targetId=key.startsWith('module:')?key.slice(7):data?.methods.find(m=>key==='method:'+m.id)?.planModuleId??
      data?.records.find(r=>r.outputs.some(o=>key==='output:'+o.id))?.planModuleId,target=data?.plan?.modules.find(m=>m.id===targetId);
    if(target){
      if(key.startsWith('method:')||key.startsWith('output:'))setExpanded(target.id);
      else if(expanded!==target.id)setExpanded(null);
      if(focus)setFocus(target.id);
      if(search&&!(target.definition.title+' '+target.moduleKey+' '+projectDomains[target.definition.domain]).toLowerCase().includes(search.toLowerCase()))setSearch('');
    }
    change({node:key});setMobileOpen(true);
  }
  function source(kind:'plan'|'run'|'review',id:string){
    if(editor.dirty||editor.active||editor.action.busy){editor.setNotice('请先保存或放弃当前规划，再切换版本。');return;}
    change({plan:!id?workspace.data?.plan?.id??null:null,run:null,review:null,[kind]:id||null,node:null});setExpanded(null);setFocus(null);
  }
  function refreshed(){void client.invalidateQueries({queryKey:['private','admin','project-workspace',productId]});
    void client.invalidateQueries({queryKey:['private','admin','project-canvas',workspace.data?.plan?.id]});}
  if(!query)return <div className="pw-empty" role="alert"><h3>项目链接格式不正确</h3><button onClick={()=>change({plan:null,run:null,review:null,planPage:null,runPage:null,reviewPage:null,node:null})}>回到当前项目</button></div>;
  if(workspace.isPending)return <Loading/>;
  if(workspace.isError)return <Failure error={workspace.error} retry={()=>void workspace.refetch()}/>;
  if(params.has('runOperations')||runsDirty.current)return <ProductionRunOperations productId={productId} productName={productName} runId={params.get('run')}
    onRun={id=>change({run:id,review:null,node:null,runOperations:'1'})} onClose={()=>change({runOperations:null})} onDirty={runsChanged}/>;
  if((params.has('methodModule')||methodsDirty.current)&&workspace.data.plan)return <ProjectMethods data={workspace.data} productName={productName} moduleKey={params.get('methodModule')??lastMethodKey.current}
    onModule={key=>{lastMethodKey.current=key;change({methodModule:key});}} onClose={()=>change({methodModule:null})}
    onPlan={plan=>{change({plan,run:null,review:null,node:null});refreshed();}} onDirty={methodsChanged} onSaved={refreshed}/>;
  const data=editor.data??workspace.data,plan=data.plan,modules=plan?.modules??[],filtered=modules.filter(m=>(m.definition.title+' '+m.moduleKey+' '+projectDomains[m.definition.domain]).toLowerCase().includes(search.toLowerCase())),
    selectedModule=modules.find(m=>selected==='module:'+m.id)||modules.find(m=>data.methods.some(s=>s.planModuleId===m.id&&selected==='method:'+s.id)||data.records.some(r=>r.planModuleId===m.id&&r.outputs.some(o=>selected==='output:'+o.id)));
  const inspector=selected==='review'&&(editor.active||editor.dirty)?<div className="pw-detail-content"><h3>规划编辑中</h3><p>先保存或放弃规划，再对固定版本检查与审核。</p><button onClick={()=>select('plan')}>查看规划</button></div>:
    <Inspector key={data.plan?.id+':'+data.review?.id+':'+data.run?.id} data={data} selected={selected} select={select}
      onEdit={tab=>{if(editor.active||editor.dirty){editor.setNotice('先保存或放弃规划，再打开内容编辑。');return;}onEdit(tab);}}
      onMethods={key=>{if(editor.active||editor.dirty){editor.setNotice('先保存或放弃规划，再设置商品方法。');return;}dialog.current?.close();setMobileOpen(false);change({methodModule:key});}}
      refresh={refreshed} reviewSaved={id=>{source('review',id);refreshed();}}/>;
  return <section className="project-workspace" aria-label="商品项目工作区">
    <div className="pw-context"><div><span className="pw-kicker">PROJECT / WORKSPACE · {data.scope==='demo'?'本地演示范围':'正式范围'}</span><h3>{plan?.plan.title??productName}</h3>
      <p>{data.source==='review_snapshot'?'审核快照 · 内容与原件固定在此修订':data.source==='run'?'固定批次 · 按该次尝试回读成果':'当前计划 · 查看已保存的方法与成果'}</p></div>
      <button type="button" onClick={()=>{if(editor.dirty||editor.active)editor.setNotice('未保存规划已保留，请先保存或放弃再刷新。');else refreshed();}} disabled={workspace.isFetching||editor.action.busy}>{workspace.isFetching?'读取中…':'刷新项目 ↻'}</button></div>
    <div className="pw-sources" aria-label="项目版本选择">
      <label>制作计划<select aria-label="项目制作计划" value={plan?.id??''} onChange={e=>source('plan',e.target.value)}>
        {!plan&&<option value="">尚无计划</option>}{plan&&!data.plans.items.some(p=>p.id===plan.id)&&<option value={plan.id}>r{plan.revision} · {plan.plan.title}</option>}
        {data.plans.items.map(p=><option key={p.id} value={p.id}>r{p.revision} · {p.title}</option>)}</select></label>
      <label>外部制作批次<select aria-label="项目制作批次" value={data.run?.id??''} onChange={e=>source('run',e.target.value)}><option value="">查看计划记录</option>
        {data.run&&!data.runs.items.some(r=>r.id===data.run!.id)&&<option value={data.run.id}>{data.run.runKey}</option>}
        {data.runs.items.map(r=><option key={r.id} value={r.id}>{r.runKey}{r.cancelledAt?' · 已取消':''}</option>)}</select></label>
      <label>审核与留存<select aria-label="项目审核快照" value={data.review?.id??''} onChange={e=>source('review',e.target.value)}><option value="">查看当前工作区</option>
        {data.review&&!data.reviews.items.some(r=>r.id===data.review!.id)&&<option value={data.review.id}>r{data.review.revision} · {projectStates[data.review.status]}</option>}
        {data.reviews.items.map(r=><option key={r.id} value={r.id}>r{r.revision} · {projectStates[r.status]}</option>)}</select></label>
    </div>
    {[['planPage',data.plans],['runPage',data.runs],['reviewPage',data.reviews]].some(([,v])=>(v as typeof data.plans).total>20)&&<details className="pw-history-pages"><summary>更多历史版本</summary>
      {([['planPage',data.plans,'计划'],['runPage',data.runs,'批次'],['reviewPage',data.reviews,'审核']] as const).map(([key,list,label])=>list.total>20&&<div key={key}>
        <span>{label}第 {list.page} / {Math.ceil(list.total/list.pageSize)} 页</span><button disabled={list.page===1} onClick={()=>change({[key]:String(list.page-1)})}>上一页{label}</button>
        <button disabled={list.page*list.pageSize>=list.total} onClick={()=>change({[key]:String(list.page+1)})}>下一页{label}</button></div>)}</details>}
    <div className="pw-toolbar"><span className="pw-summary">查看已有成果、原作业与当前接续条件</span><button disabled={editor.active||editor.dirty||methodsDirty.current} onClick={()=>change({runOperations:'1',review:null,methodModule:null})}>外部制作与接续 →</button></div>
    <PlanningToolbar editor={editor}/>
    <ProductPlanPanel editor={editor}/>
    {editor.notice&&<p className="pw-planning-feedback" role="status">{editor.notice}</p>}
    {editor.conflict&&<p className="pw-planning-feedback" role="alert">计划版本已变化或保存冲突。当前规划保留，可先导出草稿，再放弃并读取最新；不会覆盖其他版本。</p>}
    {editor.permissionLost&&<p className="pw-planning-feedback" role="alert">权限已变化，修改未保存。重新确认管理员身份后，再读取最新计划。</p>}
    {!!editor.action.error&&<Failure error={editor.action.error} retry={editor.conflict?undefined:()=>void editor.save()}/>}
    {editor.canvas.isError&&data.source==='live'&&<Failure error={editor.canvas.error} retry={()=>void editor.canvas.refetch()}/>}
    {!plan?<div className="pw-empty"><span>▱</span><h3>这个项目还没有制作计划</h3><p>{initialProfile?'从添加交付模块开始，保存后会建立计划修订。':'先保存共同创作设定，再添加交付模块。'}</p><button onClick={()=>onEdit('profile')}>查看共同创作设定</button></div>:<>
      <div className="pw-toolbar"><div className="pw-switch" aria-label="项目视图"><button aria-pressed={view==='canvas'} onClick={()=>setView('canvas')}>关系画布</button><button aria-pressed={view==='directory'} onClick={()=>setView('directory')}>目录列表</button></div>
        <span className="pw-summary">{modules.length} 个模块 · {data.records.length} 份制作记录</span>
        <button onClick={()=>{setFocus(focus?null:selectedModule?.id??modules[0]?.id??null);}} aria-pressed={!!focus}>{focus?'完整总览':'聚焦模块'}</button>
        <button className="pw-primary" disabled={editor.active||editor.dirty} onClick={()=>select('review')}>检查与审核</button></div>
      <div className={'pw-workarea'+(view==='directory'?' pw-directory-mode':'')}>
        <nav className="pw-directory" aria-label="项目内容目录"><label className="pw-search">查找模块<input aria-label="查找项目模块" placeholder="名称、领域或标识" value={search} onChange={e=>setSearch(e.target.value)}/></label>
          <button className={'pw-directory-plan'+(selected==='plan'?' is-active':'')} onClick={()=>select('plan')} aria-current={selected==='plan'?'page':undefined}>▱ 制作计划 <small>r{plan.revision}</small></button>
          {filtered.map((module,index)=>{const summary=moduleSummary(data,module);return <div className="pw-folder" key={module.id}>
            <button className={'pw-directory-module'+(selected==='module:'+module.id?' is-active':'')} onClick={()=>select('module:'+module.id)} aria-current={selected==='module:'+module.id?'page':undefined}>
              <span className="pw-folder-number">{String(index+1).padStart(2,'0')}</span><span><strong>{module.definition.title}</strong><small className={summary.warning?'pw-warning':''}>{module.id.startsWith('draft:')?'未保存模块':summary.label} · {module.definition.required?'必需':'可选'}</small></span></button>
            <button className="pw-folder-toggle" onClick={()=>setExpanded(expanded===module.id?null:module.id)} aria-expanded={expanded===module.id} aria-label={`${expanded===module.id?'收起':'展开'}${module.definition.title}文件夹`}>{expanded===module.id?'−':'＋'}</button>
            {(expanded===module.id||view==='directory')&&<div className="pw-folder-files">{summary.methods.map(method=><button key={method.id} onClick={()=>select('method:'+method.id)} aria-current={selected==='method:'+method.id?'page':undefined}>
              <span>⌘</span>{projectPurposes[method.purpose]}<small>v{method.version.number}</small></button>)}
              {summary.record?.outputs.map(output=><button key={output.id} onClick={()=>select('output:'+output.id)} aria-current={selected==='output:'+output.id?'page':undefined}>
                <span>▤</span>{module.definition.outputs.find(o=>o.outputKey===output.outputKey)?.label??output.outputKey}<small>{output.purpose==='authoring'?'清单':output.purpose==='preview'?'预览':'原件'}</small></button>)}
              {!summary.methods.length&&!summary.record&&<small>尚无已保存文件</small>}</div>}
            {editor.active&&editor.canEdit&&<div className="pw-directory-planning"><button onClick={()=>editor.openAdd(module.moduleKey)} disabled={modules.length>=40}>＋ 后续节点</button><button onClick={()=>editor.openConnect(module.moduleKey)}>连接 ↘</button></div>}
            {editor.active&&module.definition.dependsOn.length>0&&<details className="pw-directory-dependencies"><summary>{module.definition.dependsOn.length} 条上游依赖 · 调整</summary>
              {module.definition.dependsOn.map(key=>{const source=modules.find(m=>m.moduleKey===key);return <button key={key} aria-label={`调整${source?.definition.title??key}到${module.definition.title}的依赖`}
                onClick={()=>editor.openConnect(key,module.moduleKey,{source:key,target:module.moduleKey})}>{source?.definition.title??key} → {module.definition.title}</button>;})}</details>}
          </div>;})}{!filtered.length&&<p className="pw-muted">没有匹配的模块。</p>}
          <button className="pw-directory-review" disabled={editor.active||editor.dirty} onClick={()=>select('review')}>✓ 缺项与审核留存</button>
        </nav>
        {view==='canvas'&&<div className="pw-canvas-area"><ProjectGraph key={plan.id} data={data} selected={selected} select={select} expanded={expanded} expand={setExpanded} focus={focus} search={search} editor={editor}/>
          {focus&&<p className="pw-focus-note">聚焦最多 5 个模块，完整依赖可在目录查看。</p>}{expanded&&data.records.find(r=>r.planModuleId===expanded)?.outputs.length!>8&&<p className="pw-focus-note">画布展开前 8 个产物，完整内容见目录。</p>}</div>}
        {!mobile&&<aside ref={inspectorElement} className="pw-inspector" aria-label="项目详情">{inspector}</aside>}
      </div>
      <footer className="pw-statusbar"><span>{data.source==='review_snapshot'?'固定审核快照':data.source==='run'?'固定制作批次':'当前工作区'} · 计划 r{plan.revision}</span><span>读取于 {when(data.observedAt)}</span></footer>
    </>}
    {mobile&&<dialog ref={dialog} className="pw-mobile-dialog" onClose={()=>setMobileOpen(false)} aria-label="项目详情"><button className="pw-mobile-close" onClick={()=>{dialog.current?.close();setMobileOpen(false);}}>← 返回项目</button>{inspector}</dialog>}
    <PlanningDialog editor={editor}/>
  </section>;
}

function Inspector({data,selected,select,onEdit,onMethods,refresh,reviewSaved}:{data:ProjectWorkspaceData;selected:string;select:(key:string)=>void;onEdit:(tab:string)=>void;onMethods:(key:string)=>void;refresh:()=>void;reviewSaved:(id:string)=>void}){
  const module=data.plan?.modules.find(m=>selected==='module:'+m.id),method=data.methods.find(m=>selected==='method:'+m.id),
    record=data.records.find(r=>r.outputs.some(o=>selected==='output:'+o.id)),output=record?.outputs.find(o=>selected==='output:'+o.id);
  if(selected==='review')return <ProjectReviewPanel key={data.review?.id??data.plan?.id} data={data} select={select} refresh={refresh} saved={reviewSaved}/>;
  if(method)return <MethodDetail method={method} data={data} select={select} onMethods={onMethods}/>;
  if(output&&record)return <OutputDetail key={output.id} output={output} record={record} data={data} select={select}/>;
  if(module)return <ModuleDetail module={module} data={data} select={select} onEdit={onEdit} onMethods={onMethods}/>;
  if(selected!=='plan')return <div className="pw-detail-content" role="alert"><h3>这个引用不在当前视图中</h3><p>请核对计划、批次或审核版本，再从目录选择内容。</p><button onClick={()=>select('plan')}>回到制作计划</button></div>;
  return <div className="pw-detail-content"><DetailHeading overline="PROJECT BRIEF" title={data.plan?.plan.title??'项目计划'} badge={'r'+(data.plan?.revision??'—')}/>
    <Section title="共同目标"><dl><dt>情绪价值</dt><dd>{data.profile?.profile.emotionalGoal}</dd><dt>加深理解</dt><dd>{data.profile?.profile.understandingGoal}</dd><dt>留给参与者</dt><dd>{data.profile?.profile.takeaway}</dd></dl></Section>
    <Section title="对象与表达"><p>{data.profile?.profile.audience} · {data.profile?.profile.situation}</p><p>{data.profile?.profile.visual}</p><p>{data.profile?.profile.language}</p></Section>
    <Section title="选题依据"><p>{data.plan?.plan.selection.rationale}</p>{data.plan?.plan.evidence.map(e=><article key={e.evidenceKey} className="pw-evidence"><a href={e.sourceUrl} target="_blank" rel="noreferrer">{e.title} ↗</a><p>{e.summary}</p><small>{e.sourceName} · {e.region==='domestic'?'国内':'国际'}<br/>源发布时间：{e.publishedAt?when(e.publishedAt):'未知'}<br/>检索：{when(e.retrievedAt)}</small></article>)}</Section>
    <Section title="固定版本"><Identity label="计划" value={data.plan?.id??''}/><Identity label="设定" value={data.profile?.id??''}/></Section>
  </div>;
}
function DetailHeading({overline,title,badge}:{overline:string;title:string;badge?:string}){return <header className="pw-detail-heading"><span>{overline}</span><h3>{title}</h3>{badge&&<small>{badge}</small>}</header>;}
function Section({title,children}:{title:string;children:ReactNode}){return <section className="pw-detail-section"><h4>{title}</h4>{children}</section>;}
function Identity({label,value}:{label:string;value:string}){return <details className="pw-identity"><summary>{label} · {shortId(value)}</summary><code>{value}</code></details>;}
function ModuleDetail({module,data,select,onEdit,onMethods}:{module:ProjectModule;data:ProjectWorkspaceData;select:(key:string)=>void;onEdit:(tab:string)=>void;onMethods:(key:string)=>void}){
  const summary=moduleSummary(data,module),attemptId=data.run?.modules.find(m=>m.planModuleId===module.id)?.latestAttemptId;
  return <div className="pw-detail-content"><DetailHeading overline={projectDomains[module.definition.domain]} title={module.definition.title} badge={summary.label}/><p>{module.definition.purpose}</p>
    {summary.reason&&<p className="pw-callout pw-warning">{summary.reason}</p>}
    <Section title="输入依赖">{module.definition.dependsOn.length?module.definition.dependsOn.map(key=>{const source=data.plan!.modules.find(m=>m.moduleKey===key)!;return <button key={key} className="pw-detail-link" onClick={()=>select('module:'+source.id)}>← {source.definition.title}</button>;}):<p className="pw-muted">从共同设定开始，无上游模块。</p>}</Section>
    <Section title="固定方法">{summary.methods.map(method=><button key={method.id} className="pw-detail-link" onClick={()=>select('method:'+method.id)}>⌘ {projectPurposes[method.purpose]}<small>v{method.version.number}{method.customization?' · 商品定制':''}</small></button>)}{!summary.methods.length&&<p className="pw-warning">方法尚未固定。</p>}
      <button disabled={data.source!=='live'||data.plans.page!==1||data.plans.items[0]?.id!==data.plan?.id} onClick={()=>onMethods(module.moduleKey)}>选择或另存制作方法</button></Section>
    <Section title="交付与原件">{module.definition.outputs.map(slot=>{const outputs=summary.record?.outputs.filter(o=>o.outputKey===slot.outputKey)??[];return <div className="pw-slot" key={slot.outputKey}><strong>{slot.label}<small>{slot.required?'必需':'可选'}</small></strong>
      {outputs.length?outputs.map(o=><button key={o.id} className="pw-detail-link" onClick={()=>select('output:'+o.id)}>▤ {o.file?.fileName??(o.purpose==='authoring'?'体验制作清单':'结构化内容')}<small>{o.purpose==='original'?'原件':o.purpose==='authoring'?'另需原包':'预览'}</small></button>):<p className="pw-warning">尚无保存记录</p>}
      {data.originals.filter(f=>f.target.planModuleId===module.id&&f.target.outputKey===slot.outputKey&&!outputs.some(o=>o.originalFileId===f.id)).map(f=><p className="pw-muted" key={f.id}>{f.fileName} · {({pending:'待上传',verifying:'校验中',uploaded:'待完成校验',available:'已导入，尚未关联制作记录',failed:'导入失败',expired:'上传已到期',deleting:'清理中',deleted:'已删除'})[f.status]}</p>)}
      {slot.files.filter(f=>f.sourceUrl).map(f=><p key={f.fileKey} className="pw-muted"><a href={f.sourceUrl!} target="_blank" rel="noreferrer">来源地址 · {f.label} ↗</a><br/>平台原件按上方固定记录取回。</p>)}</div>;})}
      {summary.missing.map((m,i)=><p className="pw-warning" key={i}>{m}</p>)}{data.originalsTruncated&&<p>上传记录较多，仅展示最近 400 项。</p>}</Section>
    {attemptId&&<AttemptDetail id={attemptId}/>}
    <Section title="继续处理"><button onClick={()=>onEdit(module.definition.domain==='experience'?'experience':module.definition.domain)}>打开{projectDomains[module.definition.domain]}编辑</button></Section>
    <Identity label="模块" value={module.id}/>
  </div>;
}
function MethodDetail({method,data,select,onMethods}:{method:ProjectMethod;data:ProjectWorkspaceData;select:(key:string)=>void;onMethods:(key:string)=>void}){
  const records=data.records.filter(r=>r.methods.some(m=>m.snapshotId===method.id));
  return <div className="pw-detail-content"><DetailHeading overline="FIXED SKILL" title={method.version.manifest.name} badge={`基础 v${method.version.number} · 源修订 r${method.sourceRevision}`}/>
    <p>{method.version.manifest.description}</p><p className="pw-muted">{projectPurposes[method.purpose]} · {method.customization?'基础模板＋商品定制':'固定基础模板'}</p>
    <SnapshotDownload value={method} name={'method-'+shortId(method.id)+'.json'} label="取回完整方法快照"/><p className="pw-muted">包含基础版本、完整正文和商品定制。参考附件在下方分别取回。</p>
    <button disabled={data.source!=='live'||data.plans.page!==1||data.plans.items[0]?.id!==data.plan?.id} onClick={()=>onMethods(data.plan!.modules.find(m=>m.id===method.planModuleId)!.moduleKey)}>选择或另存商品方法</button>
    {method.customization&&<Section title="商品参数与补充"><pre>{JSON.stringify(method.customization.parameters,null,2)}</pre><p className="pw-prose">{method.customization.instructions||'无补充方法'}</p></Section>}
    <Section title={method.customization?'本次完整方法正文':'方法正文'}><pre className="pw-prose">{method.customization?.effectiveInstructions??method.version.manifest.instructions}</pre></Section>
    {method.customization&&<details className="pw-base-method"><summary>查看固定基础模板正文</summary><pre className="pw-prose">{method.version.manifest.instructions}</pre></details>}
    <Section title="参考附件">{method.version.files.length?method.version.files.map(({path,file})=><div key={file.id} className="pw-file-row"><strong>{path}</strong><small>{file.mimeType} · {fileSize(file.byteSize)}</small>
      <Download path={data.review?`/api/admin/project-reviews/${data.review.id}/files/method/${file.id}/content`:`/api/admin/project-methods/${method.id}/files/${file.id}/content`} name={file.fileName} label="取回固定版本附件"/></div>):<p className="pw-muted">此方法没有参考附件。</p>}</Section>
    <Section title="使用此方法的产物">{records.flatMap(r=>r.outputs).map(o=><button className="pw-detail-link" key={o.id} onClick={()=>select('output:'+o.id)}>▤ {o.file?.fileName??o.outputKey}</button>)}{!records.length&&<p className="pw-muted">尚未关联本视图中的制作产物。</p>}
      <button className="pw-detail-link" onClick={()=>select('module:'+method.planModuleId)}>← 返回所属模块</button></Section>
    <Identity label="方法快照" value={method.id}/><Identity label="基础版本" value={method.version.id}/><Identity label="快照摘要" value={method.digest}/>
  </div>;
}
function saveDownload(blob:Blob,name:string){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);}
function SnapshotDownload({value,name,label}:{value:unknown;name:string;label:string}){return <button type="button" onClick={()=>saveDownload(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),name)}>{label}</button>;}
function Download({path,name,label}:{path:string;name:string;label:string}){const action=useAction();return <><button type="button" disabled={action.busy} onClick={()=>void action.run(async()=>saveDownload(await api.blob(path),name))}>{action.busy?'读取中…':label}</button>{!!action.error&&<Failure error={action.error}/>}</>;}
function OutputDetail({output,record,data,select}:{output:ProjectOutput;record:ProjectRecord;data:ProjectWorkspaceData;select:(key:string)=>void}){
  const module=data.plan!.modules.find(m=>m.id===record.planModuleId)!,content=data.content.find(c=>c.id===output.contentRevisionId),experience=data.experiences.find(e=>e.id===output.experienceRevisionId),
    configuration=ProductConfigurationSchema.safeParse(content?.snapshot.configuration),authoring=AssetAuthoringSchema.safeParse(content?.snapshot.authoring),[failed,setFailed]=useState(false),action=useAction(),
    [preview,setPreview]=useState<Awaited<ReturnType<typeof experienceApi.preview>>|null>(null);
  const downloadPath=data.review&&output.file?(output.originalFileId?`/api/admin/project-reviews/${data.review.id}/files/original/${output.originalFileId}/content`:
    `/api/admin/project-reviews/${data.review.id}/files/media/${output.fileId}/content`):output.file?.downloadPath;
  return <div className="pw-detail-content"><DetailHeading overline="SAVED OUTPUT" title={module.definition.outputs.find(o=>o.outputKey===output.outputKey)?.label??output.outputKey} badge={`制作记录 r${record.revision}`}/>
    <p className={output.purpose==='original'?'pw-muted':'pw-warning'}>{output.purpose==='authoring'?'体验制作清单；网页或场景原包需单独保存。':output.purpose==='preview'?'这是预览文件；请另行核对原件。':'已保存的固定原件记录'}</p>
    {output.file&&<Section title="平台文件">{failed?<p role="alert">媒体无法读取，请刷新后重试。</p>:output.file.mimeType.startsWith('image/')?<img className="pw-media" src={output.file.downloadPath} alt={output.file.fileName} onError={()=>setFailed(true)}/>:output.file.mimeType.startsWith('video/')?<video className="pw-media" controls preload="metadata" src={output.file.downloadPath} onError={()=>setFailed(true)}/>:<p className="pw-file-type">{output.file.mimeType==='model/gltf-binary'?'3D 场景原件':'网页 / 归档原件'}</p>}
      <p>{output.file.fileName}<br/><small>{output.file.mimeType} · {fileSize(output.file.byteSize)}</small></p>
      <Download path={downloadPath!} name={output.file.fileName} label="取回此版本原件"/>
      {['application/zip','text/html','model/gltf-binary'].includes(output.file.mimeType)&&<p className="pw-muted">原件可取回；实际运行能力需另行验证。</p>}<Identity label="文件摘要" value={output.file.checksum}/></Section>}
    {configuration.success&&<Section title={output.outputKey.includes('report')?'报告方案':'题目原文'}>{output.outputKey.includes('report')?<>
      {configuration.data.report.templates.map(t=><article className="pw-text-card" key={t.resultTypeId}><strong>{configuration.data.resultTypes.find(r=>r.id===t.resultTypeId)?.label}</strong><p>{t.explanation}</p><p>{t.suggestion}</p></article>)}<p className="pw-muted">{configuration.data.report.disclaimer}</p></>:
      configuration.data.questions.map((q,i)=><article className="pw-text-card" key={q.id}><strong>{String(i+1).padStart(2,'0')} / {q.text}</strong><ul>{q.options.map(o=><li key={o.id}>{o.label}</li>)}</ul></article>)}</Section>}
    {authoring.success&&<Section title="内容原文">{authoring.data.content.kind==='copy'?authoring.data.content.blocks.map(b=><article className="pw-text-card" key={b.blockId}><small>{b.role}</small><p className="pw-prose">{b.text}</p></article>):authoring.data.content.kind==='cover'?<><h4>{authoring.data.content.title}</h4><p>{authoring.data.content.description}</p></>:<pre>{JSON.stringify(authoring.data.content,null,2)}</pre>}</Section>}
    {content&&<SnapshotDownload value={content} name={output.outputKey+'-'+shortId(content.id)+'.json'} label="取回此版本结构化原件"/>}
    {experience&&<SnapshotDownload value={experience} name={'experience-'+shortId(experience.id)+'.json'} label="取回此版本体验清单"/>}
    {experience&&<Section title="体验与报告"><p>{experience.manifest.renderer.key} · v{experience.manifest.renderer.version}</p><p>{experience.reportPlan.narrative}</p>
      <button disabled={action.busy} onClick={()=>void action.run(async()=>{
        const assessment=data.content.map(c=>ProductConfigurationSchema.safeParse(c.snapshot.configuration)).find(c=>c.success);
        if(!assessment?.success)throw new Error('此视图缺少固定题库，不能生成演示。');
        return experienceApi.preview(experience.id,{answers:assessment.data.questions.map(q=>({questionId:q.id,optionId:q.options.find(o=>!o.notApplicable)!.id}))});
      },setPreview)}>查看此修订的演示报告</button>{preview&&<div className="pw-preview"><span>演示数据 · 非用户报告</span><ReportHost content={preview.report} presentation={preview.presentation}/></div>}
      {!!action.error&&<Failure error={action.error}/>}<details><summary>查看固定体验清单</summary><pre>{JSON.stringify(experience.manifest,null,2)}</pre></details></Section>}
    <Section title="固定制作来源">{record.methods.map(m=>{const method=data.methods.find(s=>s.id===m.snapshotId);return <button className="pw-detail-link" key={m.snapshotId} onClick={()=>select('method:'+m.snapshotId)}>⌘ {projectPurposes[m.purpose]}<small>{method?'v'+method.version.number:shortId(m.snapshotId)}</small></button>;})}
      {record.inputs.map(input=><button key={input.recordId} className="pw-detail-link" onClick={()=>select('module:'+input.planModuleId)}>← 输入制作记录 {shortId(input.recordId)}</button>)}
      <p className="pw-muted">{record.source==='mcp'?'通过授权 MCP 保存':'外部制作来源申报'} · {record.external.client}</p><p>{record.external.note}</p></Section>
    <button className="pw-detail-link" onClick={()=>select('module:'+module.id)}>← 返回{module.definition.title}</button><Identity label="制作记录" value={record.id}/><Identity label="产物摘要" value={output.digest}/>
  </div>;
}
function AttemptDetail({id}:{id:string}){
  const query=useQuery({queryKey:['private','admin','project-attempt',id],queryFn:({signal})=>projectApi.attempt(id,signal),refetchOnWindowFocus:false});
  return <Section title="外部运行回执">{query.isPending?<Loading/>:query.isError?<Failure error={query.error} retry={()=>void query.refetch()}/>:<>
    <p>{projectStates[query.data.state]} · 第 {query.data.generation} 次尝试</p>{query.data.needsRecheck&&<p className="pw-warning">输入或产物已有新修订，需要复查。</p>}
    {query.data.job&&<p className="pw-job">外部作业：{query.data.job.provider}<code>{query.data.job.jobId}</code>{query.data.job.terminal?'已报告终态':'结果待核对，请先查询原作业'}</p>}
    <ol className="pw-timeline">{query.data.events.map(event=><li key={event.id}><small>{event.step} · {when(event.createdAt)}</small><strong>{projectStates[event.state]}</strong><p>{event.reason}</p></li>)}</ol>
    <p className="pw-muted">用量为制作端申报{query.data.reportedTokens!==null?' · '+query.data.reportedTokens+' token':''}{query.data.reportedCostFen!==null?' · ¥'+(query.data.reportedCostFen/100).toFixed(2):' · 费用未知'}。</p>
  </>}</Section>;
}
function ProjectReviewPanel({data,select,refresh,saved}:{data:ProjectWorkspaceData;select:(key:string)=>void;refresh:()=>void;saved:(id:string)=>void}){
  const action=useAction(),[checked,setChecked]=useState<Awaited<ReturnType<typeof projectApi.check>>|null>(null),[note,setNote]=useState(''),[returnModule,setReturnModule]=useState(data.plan?.modules[0]?.id??''),
    [reason,setReason]=useState(''),[excluded,setExcluded]=useState<string[]>([]),review=data.review,latest=!review||review.revision===data.reviews.total,
    selection={planRevisionId:data.plan!.id,records:data.records.filter(r=>!excluded.includes(r.planModuleId)).map(r=>({recordId:r.id,digest:r.digest}))};
  const issues=checked?.issues??review?.issues??[],busy=action.busy;
  useEffect(()=>{setChecked(null);},[data.observedAt]);
  function transition(kind:'submit'|'return'|'retain'){
    if(!review)return;
    const body={expectedRevision:review.revision,expectedFingerprint:review.fingerprint,expectedFrontierFingerprint:review.frontierFingerprint,note,
      ...(kind==='return'?{returns:[{planModuleId:returnModule,reason}]}:{})};
    void action.run(()=>projectApi.transition(review.id,kind,action.intent('project-'+kind+':'+review.id,body)),value=>saved(value.id));
  }
  return <div className="pw-detail-content"><DetailHeading overline="CHECK / HUMAN REVIEW" title="项目检查与留存" badge={review?`审核 r${review.revision} · ${projectStates[review.status]}`:'准备审核候选'}/>
    <p className="pw-muted">核对固定方法、输入与实际文件。审核留存后，商品仍由上架流程单独管理。</p>
    {review?.status==='retained'&&<p className="pw-callout">此修订已留存，可从目录取回固定内容与原件。</p>}
    {!latest&&<p className="pw-warning">正在查看历史审核修订。可回读；新审核操作需切换最新修订。</p>}
    {!review&&<Section title="纳入本次审核的模块">{data.plan!.modules.map(module=>{const has=data.records.some(r=>r.planModuleId===module.id);return <label className="pw-review-choice" key={module.id}><input type="checkbox" checked={has&&!excluded.includes(module.id)} disabled={!has||module.definition.required}
      onChange={e=>{setChecked(null);setExcluded(current=>e.target.checked?current.filter(id=>id!==module.id):[...current,module.id]);}}/>
      <span>{module.definition.title}<small>{has?module.definition.required?'必需模块':'可选模块':'尚无制作记录'}</small></span></label>;})}</Section>}
    <Section title="原件与引用检查"><button disabled={busy} onClick={()=>void action.run(()=>projectApi.check(data.productId,review?.selection??selection),setChecked)}>{busy?'处理中…':'重新校验原件与引用'}</button>
      {checked&&<p role="status" className={checked.canSubmit?'pw-success':'pw-warning'}>{checked.canSubmit?'本次结构、固定引用与原件检查通过。':'仍有缺项，见下方检查结果。'}</p>}
      {issues.map((issue,i)=><button key={i} className="pw-issue" onClick={()=>issue.planModuleId&&select('module:'+issue.planModuleId)} disabled={!issue.planModuleId}>{issue.message}</button>)}
      {!checked&&!review&&<p className="pw-muted">开始审核前，先读取本次检查结果。</p>}</Section>
    {review?.returns.length!>0&&<Section title="退回意见">{review!.returns.map(item=><button key={item.planModuleId} className="pw-issue" onClick={()=>select('module:'+item.planModuleId)}>{item.reason}</button>)}</Section>}
    {review?.status!=='retained'&&latest&&<Section title="人工处理"><label className="pw-field">审核说明<textarea aria-label="项目审核说明" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="说明此次保存、提交或审核决定"/></label>
      {!review?<button className="pw-primary" disabled={busy||!note.trim()} onClick={()=>void action.run(()=>projectApi.save(data.productId,action.intent('project-review-save',{
        selection,expectedRevision:data.reviews.total,note})),value=>saved(value.id))}>保存审核部分稿</button>:<>
        {['draft','returned'].includes(review.status)&&<button className="pw-primary" disabled={busy||!note.trim()} onClick={()=>transition('submit')}>{review.status==='returned'?'重新提交固定稿':'提交人工审核'}</button>}
        {review.status==='submitted'&&<><button className="pw-primary" disabled={busy||!note.trim()} onClick={()=>transition('retain')}>核对通过并留存</button>
          <div className="pw-return"><label className="pw-field">退回模块<select aria-label="项目退回模块" value={returnModule} onChange={e=>setReturnModule(e.target.value)}>{data.plan!.modules.map(m=><option key={m.id} value={m.id}>{m.definition.title}</option>)}</select></label>
            <label className="pw-field">修改原因<textarea aria-label="项目退回原因" value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy||!note.trim()||!reason.trim()} onClick={()=>transition('return')}>退回此模块</button></div></>}
      </>}
    </Section>}
    {review&&<Section title="补交与新修订"><p className="pw-muted">修改产物后，在当前工作区选择新记录，保存为下一份审核修订。</p><Link to={'/admin/content/'+data.productId+'?tab=project&plan='+review.manifest.plan.id}>回到此计划工作区 →</Link></Section>}
    {!!action.error&&<><Failure error={action.error}/><button onClick={refresh}>重新读取项目版本</button></>}
    {review&&<><Identity label="审核记录" value={review.id}/><Identity label="固定内容指纹" value={review.fingerprint}/></>}
  </div>;
}
