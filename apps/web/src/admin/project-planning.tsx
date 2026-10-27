import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ProductionPlanDocumentSchema,emptyProductImplementationPlan, type ProductionPlanDocument,type ProductImplementationPlan} from '@orai/contracts/admin';
import {projectApi,type ProjectWorkspaceData} from './project-api.js';
import {useAction} from '../business/shared.js';
import {ClientError} from '../api/client.js';
import {addPlanningModule,editPlanningDependency,emptyProjectPlan,layoutForPlan,planningWorkspace,positionsFromLayout,isPlanningSaveUncertain,
  type CanvasPositions,type PlanningDomain} from './project-planning-model.js';
import {projectDomains} from './project-model.js';

type Dependency={source:string;target:string};
type Dialog={kind:'add';upstream?:string;position?:{x:number;y:number}}|{kind:'connect';source?:string;target?:string;previous?:Dependency}|{kind:'reference';title:string};
type Session={base:ProjectWorkspaceData;document:ProductionPlanDocument;positions:CanvasPositions;initialPositions:CanvasPositions;layoutRevision:number;active:boolean};
type Options={productId:string;data?:ProjectWorkspaceData;productName:string;profile:ProjectWorkspaceData['profile'];onDirty?:(dirty:boolean)=>void;
  onSaved:(planId:string)=>void;onReload:()=>void;onAdded?:(moduleKey:string)=>void};
export function useProjectPlanning({productId,data,productName,profile,onDirty,onSaved,onReload,onAdded}:Options){
  const client=useQueryClient(),action=useAction(),[session,setSession]=useState<Session|null>(null),[dialog,setDialog]=useState<Dialog|null>(null),[notice,setNotice]=useState(''),[savedPlanId,setSavedPlanId]=useState<string|null>(null),
    [jsonDrafts,setJsonDrafts]=useState<Record<string,string>>({});
  const canvas=useQuery({queryKey:['private','admin','project-canvas',data?.plan?.id],enabled:!!data?.plan&&data.source==='live',
    queryFn:({signal})=>projectApi.canvas(data!.plan!.id,signal),refetchOnWindowFocus:false});
  const current=session&&productId===session.base.productId?session:null,
    stale=!!current&&(current.base.plan?.id!==data?.plan?.id||current.base.source!==data?.source||current.base.run?.id!==data?.run?.id||current.base.review?.id!==data?.review?.id),
    planDirty=!!current&&JSON.stringify(current.document)!==JSON.stringify(current.base.plan?.plan),
    layoutDirty=!!current&&JSON.stringify(current.positions)!==JSON.stringify(current.initialPositions),
    pendingJson=Object.keys(jsonDrafts).length>0,
    dirty=!!current&&(planDirty&&current.document.modules.length>0||layoutDirty||pendingJson),
    permissionLost=[action.error,canvas.error].some(error=>error instanceof ClientError&&(error.status===401||error.status===403)),
    pendingPlanRead=!!savedPlanId&&data?.plan?.id!==savedPlanId,
    canEdit=!pendingPlanRead&&!permissionLost&&!canvas.isError&&!!data&&data.source==='live'&&(data.plan?canvas.data?.planRevisionId===data.plan.id&&canvas.data.editable:!!profile&&data.plans.total===0),
    uncertain=isPlanningSaveUncertain(action.error),
    conflict=stale||action.error instanceof ClientError&&action.error.code==='REVISION_CONFLICT',
    active=!!current?.active,
    positions=current?.positions??positionsFromLayout(canvas.data?.layout?.layout);
  const viewData=useMemo(()=>current?planningWorkspace(current.base,current.document,profile):data,[current,data,profile]);
  useEffect(()=>{onDirty?.(dirty||active);return()=>onDirty?.(false);},[dirty,active,onDirty]);
  useEffect(()=>{setSession(null);setDialog(null);setNotice('');setSavedPlanId(null);setJsonDrafts({});},[productId]);
  useEffect(()=>{if(savedPlanId&&data?.plan?.id===savedPlanId&&canvas.data?.planRevisionId===savedPlanId)setSavedPlanId(null);},[savedPlanId,data?.plan?.id,canvas.data?.planRevisionId]);
  useEffect(()=>{if(stale&&!dirty){setSession(null);setDialog(null);}},[stale,dirty]);
  function ensure():Session|null{
    if(action.busy||uncertain||conflict||!canEdit||!data){setNotice(uncertain?'保存结果尚未确认，请先用相同请求再次确认保存。':'当前版本不可编辑，请读取最新计划。');return null;}
    return current??{base:data,document:structuredClone(data.plan?.plan??emptyProjectPlan(profile!.id,productName+'制作计划')),
      positions:positionsFromLayout(canvas.data?.layout?.layout),initialPositions:positionsFromLayout(canvas.data?.layout?.layout),layoutRevision:canvas.data?.layout?.revision??0,active:false};
  }
  function begin(){const value=ensure();if(value){setSession({...value,active:true});setNotice('模块依赖可以编辑；固定方法与产物来源保持只读。');}}
  function upgrade(){const value=ensure();if(!value||value.document.schemaVersion!==1)return;
    setSession({...value,active:true,document:{...value.document,schemaVersion:2,productPlan:emptyProductImplementationPlan(value.base.plan?.id??null)}});
    setNotice('已在未保存草稿中建立 v2 商品规划。旧计划保留，具体场景、动画和预算仍待决定。');}
  function updateProductPlan(productPlan:ProductImplementationPlan){const value=ensure();if(!value||value.document.schemaVersion!==2)return;
    setSession({...value,active:true,document:{...value.document,productPlan}});}
  function updateRuntime(moduleKey:string,target:ProductionPlanDocument['modules'][number]['target']){const value=ensure();if(!value)return;
    setSession({...value,active:true,document:{...value.document,modules:value.document.modules.map(module=>module.moduleKey===moduleKey?{...module,target}:module)}});}
  function jsonDraft(key:string,value:string|null){setJsonDrafts(previous=>{const next={...previous};if(value===null)delete next[key];else next[key]=value;return next;});}
  function openAdd(upstream?:string,position?:{x:number;y:number}){const value=ensure();if(!value)return;setSession({...value,active:true});setDialog({kind:'add',upstream,position});}
  function openConnect(source?:string,target?:string,previous?:Dependency){const value=ensure();if(!value)return;setSession({...value,active:true});setDialog({kind:'connect',source,target,previous});}
  function connect(source:string,target:string,previous?:Dependency){
    const value=ensure();if(!value)return false;
    try{setSession({...value,active:true,document:editPlanningDependency(value.document,source,target,previous)});setNotice('依赖已加入未保存规划。');return true;}
    catch(error){setNotice(error instanceof Error?error.message:'依赖关系不正确。');return false;}
  }
  function valid(source:string,target:string,previous?:Dependency){
    if(!active||!current||!canEdit||uncertain||conflict)return false;
    try{editPlanningDependency(current.document,source,target,previous);return true;}catch{return false;}
  }
  function add(input:{title:string;domain:PlanningDomain;required:boolean;upstream?:string;position?:{x:number;y:number}}){
    const value=ensure();if(!value)return false;
    try{const moduleKey='module-'+crypto.randomUUID(),document=addPlanningModule(value.document,{...input,moduleKey});
      setSession({...value,active:true,document,positions:input.position?{...value.positions,['module:'+moduleKey]:input.position}:value.positions});
      onAdded?.(moduleKey);
      setNotice('模块已加入未保存规划，保存后会生成新的计划修订。');return true;
    }catch(error){setNotice(error instanceof Error?error.message:'请检查节点信息。');return false;}
  }
  function remove(source:string,target:string){
    const value=ensure();if(!value)return false;
    try{setSession({...value,document:editPlanningDependency(value.document,source,target,undefined,true)});setNotice('依赖已从未保存规划中移除。');return true;}
    catch(error){setNotice(error instanceof Error?error.message:'无法移除此依赖。');return false;}
  }
  function move(nodeKey:string,position:{x:number;y:number}){const value=ensure();if(value)setSession({...value,positions:{...value.positions,[nodeKey]:position}});}
  function arrange(){const value=ensure();if(value){setSession({...value,positions:{}});setNotice('已整理布局，保存后可在刷新时恢复。');}}
  async function save(){
    if(!current||!dirty||conflict||stale||permissionLost||action.busy||pendingJson)return;
    await action.run(async()=>{
      const layout=layoutForPlan(current.positions,current.document);
      if(planDirty){const result=await projectApi.savePlan(current.base.productId,action.intent('planning:'+current.base.productId,{
        plan:current.document,expectedRevision:current.base.plan?.revision??0,layout}));
        setSavedPlanId(result.id);setSession(null);setDialog(null);onDirty?.(false);onSaved(result.id);setNotice('新计划已保存。旧方法、产物与审核仍保留在原计划。');
      }else if(current.base.plan){await projectApi.saveLayout(current.base.plan.id,action.intent('layout:'+current.base.plan.id,{
        layout,expectedRevision:current.layoutRevision,expectedPlanDigest:current.base.plan.digest}));
        setSession(null);setDialog(null);onDirty?.(false);await client.invalidateQueries({queryKey:['private','admin','project-canvas',current.base.plan.id]});setNotice('布局已保存，业务计划修订保持不变。');}
    });
  }
  function discard(reload=false){if(action.busy)return;setSession(null);setDialog(null);setSavedPlanId(null);setJsonDrafts({});action.resetError();onDirty?.(false);setNotice('已放弃未保存修改。');if(reload)onReload();}
  function exportDraft(){if(!current)return;const blob=new Blob([JSON.stringify({kind:'project_planning_draft',schemaVersion:1,
    basePlanRevisionId:current.base.plan?.id??null,expectedRevision:current.base.plan?.revision??0,plan:current.document,
    layout:layoutForPlan(current.positions,current.document),unappliedJson:jsonDrafts,persisted:false},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='project-planning-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const validation=planDirty&&current?ProductionPlanDocumentSchema.safeParse(current.document):null;
  return {data:viewData,active,dirty,planDirty,layoutDirty,canEdit,conflict,uncertain,permissionLost,pendingPlanRead,positions,dialog,setDialog,notice,setNotice,action,canvas,
    validation,upgrade,updateProductPlan,updateRuntime,jsonDrafts,jsonDraft,pendingJson,basePlan:current?.base.plan?.plan??data?.plan?.plan,
    begin,openAdd,openConnect,connect,valid,add,remove,move,arrange,save,discard,exportDraft,
    reference:(title:string)=>setDialog({kind:'reference',title})};
}
export type ProjectPlanning=ReturnType<typeof useProjectPlanning>;

export function PlanningToolbar({editor}:{editor:ProjectPlanning}){
  const count=editor.data?.plan?.modules.length??0;
  return <div className="pw-planning-toolbar" aria-label="项目规划编辑">
    {!editor.active&&editor.canEdit&&<button onClick={editor.begin} disabled={editor.action.busy||editor.uncertain||editor.conflict}>编辑规划</button>}
    {(editor.active||!editor.data?.plan)&&editor.canEdit&&<><button onClick={()=>editor.openAdd()} disabled={count>=40||editor.action.busy||editor.uncertain||editor.conflict}>＋ 添加节点</button>
      <button onClick={()=>editor.openConnect()} disabled={count<2||editor.action.busy||editor.uncertain||editor.conflict}>连接模块</button></>}
    <span className="pw-planning-state">{editor.pendingPlanRead?'正在读取已保存的新计划…':editor.dirty?'有未保存修改':editor.canEdit?'模块依赖可编辑 · 方法与来源只读':'固定版本 · 只读'}{editor.active?` · ${count} / 40`:''}</span>
    {(editor.active||editor.layoutDirty)&&<><button onClick={editor.exportDraft} disabled={!editor.dirty||editor.action.busy}>导出草稿</button>
      <button onClick={()=>editor.discard(editor.conflict)} disabled={editor.action.busy}>{editor.conflict?'放弃并读取最新':'放弃修改'}</button>
      <button className="pw-primary" onClick={()=>void editor.save()} disabled={!editor.dirty||editor.action.busy||editor.conflict||editor.permissionLost||editor.pendingJson||editor.validation?.success===false}>
        {editor.action.busy?'保存中…':editor.uncertain?'再次确认保存':editor.planDirty?'保存新计划':'保存布局'}</button></>}
  </div>;
}
export function PlanningDialog({editor}:{editor:ProjectPlanning}){
  const ref=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLElement|null>(null),d=editor.dialog,
    [title,setTitle]=useState(''),[domain,setDomain]=useState<PlanningDomain>('copy'),[source,setSource]=useState(''),[target,setTarget]=useState(''),[required,setRequired]=useState(true);
  useEffect(()=>{if(!d)return;trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    setTitle('');setDomain('copy');setSource(d.kind==='add'?d.upstream??'':d.kind==='connect'?d.source??'':'');setTarget(d.kind==='connect'?d.target??'':'');setRequired(true);
    ref.current?.showModal();return()=>{ref.current?.close();trigger.current?.focus();};},[d]);
  if(!d)return null;
  const close=()=>editor.setDialog(null),modules=editor.data?.plan?.modules??[],options=modules.map(m=><option key={m.moduleKey} value={m.moduleKey}>{m.definition.title}</option>);
  return <dialog ref={ref} className="pw-planning-dialog" aria-labelledby="pw-planning-title" onCancel={close}>
    <form onSubmit={event=>{event.preventDefault();const ok=d.kind==='add'?editor.add({title,domain,required,upstream:source||undefined,position:d.position}):
      d.kind==='connect'?editor.connect(source,target,d.previous):true;if(ok)close();}}>
      <header><span>计划 r{editor.data?.plan?.revision??0} · {d.kind==='reference'?'固定依据':'未保存规划'}</span><button type="button" aria-label="关闭画布操作" onClick={close}>×</button></header>
      <h2 id="pw-planning-title">{d.kind==='add'?'添加节点':d.kind==='connect'?d.previous?'调整模块依赖':'连接模块':d.title}</h2>
      {d.kind==='reference'?<p>此关系来自固定计划、方法或产物来源，只可查看依据。请编辑模块依赖来调整规划。</p>:<>
        {d.kind==='add'&&<><label>节点类型<span>交付模块</span></label><label>名称<input aria-label="节点名称" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required autoFocus/></label>
          <label>专业领域<select aria-label="专业领域" value={domain} onChange={e=>setDomain(e.target.value as PlanningDomain)}>{Object.entries(projectDomains).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></>}
        <label>{d.kind==='add'?'上游依赖（可选）':'上游模块'}<select aria-label="上游模块" value={source} onChange={e=>setSource(e.target.value)} required={d.kind==='connect'}><option value="">{d.kind==='add'?'暂不连接上游':'选择上游模块'}</option>{options}</select></label>
        {d.kind==='connect'&&<><p className="pw-planning-direction">↓ 下游使用上游输入</p><label>下游模块<select aria-label="下游模块" value={target} onChange={e=>setTarget(e.target.value)} required><option value="">选择下游模块</option>{options}</select></label></>}
        {d.kind==='add'&&<label className="pw-planning-check"><input type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)}/>必需交付模块 <small>{modules.length} / 40</small></label>}
        <p className="pw-planning-footnote">保存会追加计划修订，旧方法、产物和审核记录保留。此处只调整规划。</p>
      </>}
      {editor.notice&&<p className="pw-planning-notice" role="status">{editor.notice}</p>}
      <footer><button type="button" onClick={close}>返回画布</button>{d.kind!=='reference'&&<button className="pw-primary" type="submit">{d.kind==='add'?'添加到画布':'确认连接'}</button>}
        {d.kind==='connect'&&d.previous&&<button type="button" onClick={()=>{if(editor.remove(d.previous!.source,d.previous!.target))close();}}>移除此依赖</button>}</footer>
    </form>
  </dialog>;
}
