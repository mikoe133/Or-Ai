import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {ExternalRunConfigurationDocument} from '@orai/contracts/admin';
import {Pager} from '../business/shared.js';
import {projectMethodsApi} from './project-methods-api.js';
import type {ProjectWorkspaceData,ProjectModule} from './project-api.js';
import type {CodexConnection} from './codex-connections-api.js';
import {projectDomains} from './project-model.js';
type Module=ExternalRunConfigurationDocument['modules'][number];
type Dependency=Module['dependencies'][number];
const purposeNames:Record<string,string>={assessment_design:'题目设计',report_writing:'报告写作',copywriting:'引流文案',cover_design:'封面设计',video_production:'视频制作',scene_design:'场景设计',report_presentation:'报告呈现'};
const inputKey=(v:{revisionId:string;locator:unknown})=>v.revisionId+JSON.stringify(v.locator);
function DependencyChoice({module,dependency,value,onChange}:{module:ProjectModule;dependency:ProjectModule;value:Dependency|undefined;onChange:(v:Dependency|null)=>void}){
 const [recordPage,setRecordPage]=useState(1),[page,setPage]=useState(1),recordId=value?.kind==='fixed'?value.recordId:null;
 const query=useQuery({queryKey:['private','admin','configuration-inputs',module.id,dependency.id,recordId,recordPage,page],enabled:value?.kind==='fixed',refetchOnWindowFocus:false,
  queryFn:({signal})=>projectMethodsApi.inputs(module.id,{dependencyId:dependency.id,...(recordId?{recordId}:{}),recordPage,page,pageSize:10},signal)});
 return <div className="dependency"><strong>{module.definition.title} ← {dependency.definition.title}</strong><label className="field">输入方式<select aria-label={module.definition.title+'依赖'+dependency.definition.title+'的输入方式'} value={value?.kind??''}
  onChange={e=>{setRecordPage(1);setPage(1);onChange(e.target.value==='waiting'?{kind:'waiting',planModuleId:dependency.id}:e.target.value==='fixed'?{kind:'fixed',planModuleId:dependency.id,recordId:null,digest:null,inputs:[]}:null);}}>
  <option value="">请明确选择，不自动使用最新回执</option><option value="waiting">等待本批上游成功回执</option><option value="fixed">选择已有精确回执与最小片段</option></select></label>
 {value?.kind==='waiting'&&<small>只声明等待条件。取得同批次/计划/模块的成功回执及摘要后才能绑定输入，没有捏造recordId。</small>}
 {value?.kind==='fixed'&&<>{query.isPending?<p>正在读取固定回执…</p>:query.isError?<p role="alert">固定输入未能读取，请重新选择或稍后核对。</p>:<>
  <label className="field">精确制作记录<select aria-label={module.definition.title+'依赖'+dependency.definition.title+'的精确回执'} value={recordId??''} onChange={e=>{const record=[...query.data.records.items,...(query.data.selectedRecord?[query.data.selectedRecord]:[])].find(v=>v.id===e.target.value);setPage(1);onChange(record?{kind:'fixed',planModuleId:dependency.id,recordId:record.id,digest:record.digest,inputs:[]}:{...value,recordId:null,digest:null,inputs:[]});}}><option value="">请选择明确记录</option>
   {recordId&&!query.data.records.items.some(v=>v.id===recordId)&&<option value={recordId}>当前固定记录 · r{query.data.selectedRecord?.revision??'历史'}</option>}
   {query.data.records.items.map(r=><option key={r.id} value={r.id}>{r.title} · r{r.revision}</option>)}</select></label><Pager {...query.data.records} onChange={setRecordPage}/>
  {recordId&&<><p>明确选择最小内容片段：</p>{query.data.fileOnly?<small>此回执只有原件。服务端核对实际字节，文件按授权另行取回。</small>:query.data.fragments.items.map(v=><label className="inline-check" key={inputKey(v)}><input type="checkbox" checked={value.inputs.some(i=>inputKey(i)===inputKey(v))} onChange={e=>{const inputs=e.target.checked?[...value.inputs,{revisionId:v.revisionId,digest:v.digest,locator:v.locator}]:value.inputs.filter(i=>inputKey(i)!==inputKey(v));onChange({...value,inputs});}}/>{v.label}</label>)}<Pager {...query.data.fragments} onChange={setPage}/></>}
 </>}</>}
 </div>;
}
export function ExternalConfigurationMethods({document,workspace,connections,onChange}:{document:ExternalRunConfigurationDocument;workspace:ProjectWorkspaceData|undefined;connections:CodexConnection[];onChange:(modules:Module[])=>void}){
 const plan=workspace?.plan,rows=plan?.modules??[];
 if(!plan)return <p className="callout">先在“范围与客户端”选择工作区商品和固定计划；新题目没有S0–S2产物时保持未就绪。</p>;
 function patch(row:Module,next:Partial<Module>){onChange(document.modules.map(v=>v.planModuleId===row.planModuleId?{...v,...next}:v));}
 return <><p className="muted">计划 r{plan.revision} · {rows.length} 个模块。方法逐用途明确选择，既有固定版本保持。</p>
  {!document.modules.length&&<button id="ec-add-modules" onClick={()=>onChange(rows.map(m=>({planModuleId:m.id,digest:m.digest,methods:[],dependencies:[],connectionId:null})))}>加入此计划的模块，不自动选择方法或输入</button>}
  {document.modules.map(selected=>{const module=rows.find(m=>m.id===selected.planModuleId);if(!module)return <p className="callout" key={selected.planModuleId}>原模块引用保留；当前计划中未找到，需重新核对。</p>;
   return <section className="fixed-box" data-module={module.moduleKey} key={module.id}><h3>{module.definition.title}<small> · {projectDomains[module.definition.domain]}</small></h3>
    <div className="form-grid">{module.definition.methodPurposes.map(purpose=>{const current=selected.methods.find(m=>m.purpose===purpose),choices=workspace?.methods.filter(m=>m.planModuleId===module.id&&m.purpose===purpose)??[];
     return <label className="field" key={purpose}>{purposeNames[purpose]??purpose}<select aria-label={module.definition.title+'的'+(purposeNames[purpose]??purpose)+'固定方法'} value={current?.snapshotId??''} onChange={e=>{const method=choices.find(m=>m.id===e.target.value);patch(selected,{methods:[...selected.methods.filter(m=>m.purpose!==purpose),...(method?[{snapshotId:method.id,digest:method.digest,purpose}]:[])]});}}>
      <option value="">请选择精确快照，不自动使用最新</option>{current&&!choices.some(m=>m.id===current.snapshotId)&&<option value={current.snapshotId}>原固定快照 {current.snapshotId.slice(0,8)} · 待核对</option>}{choices.map(m=><option key={m.id} value={m.id}>{m.version.manifest.name} · v{m.version.number} / {m.id.slice(0,8)}</option>)}</select><small>无可选方法时先到商品工作区固定对应用途；这里不创建或启用Skill。</small></label>;
    })}</div>
    {document.orchestration==='multiple'&&<label className="field">本领域连接<select aria-label={module.definition.title+'的领域连接'} value={selected.connectionId??''} onChange={e=>patch(selected,{connectionId:e.target.value||null})}><option value="">请明确选择同工作区的领域连接</option>
     {selected.connectionId&&!connections.some(c=>c.id===selected.connectionId)&&<option value={selected.connectionId}>原选连接 {selected.connectionId.slice(0,8)} · 待核对</option>}
     {connections.filter(c=>c.workspace.id===document.workspaceId).map(c=><option key={c.id} value={c.id}>{c.name} · {c.status==='active'?'已有授权，实际接入未验':'已失效，仍可回看'}</option>)}</select></label>}
    {module.definition.dependsOn.map(key=>{const dependency=rows.find(m=>m.moduleKey===key);return dependency?<DependencyChoice key={dependency.id} module={module} dependency={dependency} value={selected.dependencies.find(v=>v.planModuleId===dependency.id)} onChange={value=>patch(selected,{dependencies:[...selected.dependencies.filter(v=>v.planModuleId!==dependency.id),...(value?[value]:[])]})}/>:null;})}
   </section>;
  })}
  <p className="callout">每个任务共用同一固定计划与批次身份，只读取本领域方法和必要回执。成功成果复用；未知原作业先核对，不重复生成。</p>
 </>;
}
