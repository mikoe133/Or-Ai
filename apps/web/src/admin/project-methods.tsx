import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useLocation,useNavigate} from 'react-router-dom';
import {ProjectHandoffSelectionSchema,type ContentLocator} from '@orai/contracts/admin';
import {ClientError} from '../api/client.js';
import {Pager,useAction} from '../business/shared.js';
import type {ProjectWorkspaceData,ProjectModule,ProjectMethod} from './project-api.js';
import {projectMethodsApi,type MethodCandidate,type HandoffOptions,type HandoffSelection,type HandoffPreview} from './project-methods-api.js';
import {methodCustomization,methodParameters,effectiveMethod,methodInputKey,type MethodParameter} from './project-methods-model.js';
import {codexConnectionsApi} from './codex-connections-api.js';
import {projectPurposes,projectDomains} from './project-model.js';
import './project-methods.css';

type InputChoice=HandoffOptions['fragments']['items'][number];
type RecordChoice=NonNullable<HandoffOptions['selectedRecord']>;
function ErrorMessage({error,retry}:{error:unknown;retry?:()=>void}){return <div className="pm-error"><p role="alert">{error instanceof ClientError||error instanceof Error?error.message:'操作未完成，请重新核对。'}</p>{retry&&<button onClick={retry}>重新读取</button>}</div>;}
function MethodDialog({title,children,footer,close,busy=false,returnFocusId}:{title:string;children:ReactNode;footer:ReactNode;close:()=>void;busy?:boolean;returnFocusId?:string}){
 const ref=useRef<HTMLDialogElement>(null),previous=useRef<HTMLElement|null>(null);
 useEffect(()=>{previous.current=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{requestAnimationFrame(()=>{const target=returnFocusId?document.getElementById(returnFocusId):previous.current;if(target?.isConnected)target.focus();});};},[]);
 return <dialog ref={ref} className="handoff-dialog" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)close();}}><header><h2>{title}</h2><button type="button" className="icon-button" disabled={busy} onClick={close} aria-label={'关闭'+title}>×</button></header><div className="pm-handoff-body">{children}</div><footer>{footer}</footer></dialog>;
}
export function ProjectMethods({data,productName,moduleKey,onModule,onClose,onPlan,onDirty,onSaved}:{data:ProjectWorkspaceData;productName:string;moduleKey:string;onModule:(key:string)=>void;
 onClose:()=>void;onPlan:(id:string)=>void;onDirty?:(dirty:boolean)=>void;onSaved:()=>void}){
 const client=useQueryClient(),location=useLocation(),navigate=useNavigate(),[context,setContext]=useState(data),[active,setActive]=useState(()=>data.plan?.modules.find(m=>m.moduleKey===moduleKey)?.moduleKey??data.plan?.modules[0]?.moduleKey??''),
  [purpose,setPurpose]=useState<string>(()=>data.plan?.modules.find(m=>m.moduleKey===moduleKey)?.definition.methodPurposes[0]??data.plan?.modules[0]?.definition.methodPurposes[0]??'copywriting'),
  [step,setStep]=useState(1),[candidate,setCandidate]=useState<MethodCandidate|null>(null),[parameters,setParameters]=useState<MethodParameter[]>([]),[instructions,setInstructions]=useState(''),
  [dirty,setDirty]=useState(false),[consent,setConsent]=useState(false),[notice,setNotice]=useState(''),[localError,setLocalError]=useState(''),[pending,setPending]=useState<(()=>void)|null>(null),
  [selected,setSelected]=useState<Record<string,ProjectMethod>>({}),[q,setQ]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(1),[methodPage,setMethodPage]=useState(1),
  [handoffOpen,setHandoffOpen]=useState(false),[connectionId,setConnectionId]=useState<string|null>(null),[connectionPage,setConnectionPage]=useState(1),
  [records,setRecords]=useState<Record<string,RecordChoice>>({}),[inputs,setInputs]=useState<InputChoice[]>([]),[preview,setPreview]=useState<HandoffPreview|null>(null),[copyNotice,setCopyNotice]=useState('');
 const action=useAction(),handoffAction=useAction(),captureIntent=useRef<Parameters<typeof projectMethodsApi.capture>[1]|null>(null),previewSelection=useRef<HandoffSelection|null>(null),
  url=useRef(location.pathname+location.search),protectedRef=useRef(false),editor=useRef<HTMLElement>(null),pendingFocus=useRef<string|undefined>(undefined);
 const module=context.plan?.modules.find(m=>m.moduleKey===active),plan=context.plan,
  current=context.source==='live'&&context.plans.page===1&&context.plans.items[0]?.id===plan?.id,
  uncertain=!!captureIntent.current&&action.error instanceof ClientError&&(action.error.status===0||action.error.status>=500),
  permissionLost=[action.error,handoffAction.error].some(e=>e instanceof ClientError&&[401,403].includes(e.status)),
  stale=data.plan?.id!==context.plan?.id||data.source!==context.source,
  busy=action.busy||handoffAction.busy,locked=busy||uncertain||permissionLost||!current||stale,
  selectionKey=module?.id+':'+purpose,snapshot=selected[selectionKey],
  candidates=useQuery({queryKey:['private','admin','method-candidates',context.productId,module?.id,purpose,query,status,page],enabled:!!module&&current&&!stale,
   queryFn:({signal})=>projectMethodsApi.candidates(module!.id,{purpose,q:query||undefined,status:status||undefined,page},signal),refetchOnWindowFocus:false}),
  methods=useQuery({queryKey:['private','admin','module-methods',context.productId,module?.id,methodPage],enabled:!!module,
   queryFn:({signal})=>projectMethodsApi.methods(module!.id,methodPage,signal),refetchOnWindowFocus:false}),
  connections=useQuery({queryKey:['private','admin','codex-connections',context.scope,connectionPage],enabled:handoffOpen,
   queryFn:({signal})=>codexConnectionsApi.list(connectionPage,signal),refetchOnWindowFocus:false});
 protectedRef.current=dirty||uncertain||busy;
 useEffect(()=>{onDirty?.(dirty||uncertain||busy);return()=>onDirty?.(false);},[dirty,uncertain,busy,onDirty]);
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(q.trim());setPage(1);},250);return()=>clearTimeout(timer);},[q]);
 useEffect(()=>{if(moduleKey===active||protectedRef.current)return;const next=context.plan?.modules.find(m=>m.moduleKey===moduleKey);if(next){reset();setActive(next.moduleKey);setPurpose(next.definition.methodPurposes[0]!);}},[moduleKey]);
 useEffect(()=>{if(data===context)return;if(protectedRef.current){if(data.plan?.id!==context.plan?.id||data.source!==context.source)setNotice('计划或链接已变化，未保存的方法保留。请先核对保存结果，或放弃后读取当前计划。');return;}
  setContext(data);if(data.plan?.id!==context.plan?.id){setCandidate(null);setStep(1);setSelected({});setRecords({});setInputs([]);setPreview(null);setPurpose(data.plan?.modules.find(m=>m.moduleKey===active)?.definition.methodPurposes[0]??data.plan?.modules[0]?.definition.methodPurposes[0]??'copywriting');}
 },[data]);
 useEffect(()=>{if(!protectedRef.current)url.current=location.pathname+location.search;},[location.pathname,location.search]);
 useEffect(()=>{const pop=()=>{if(protectedRef.current){navigate(url.current,{replace:true});setNotice('未保存的方法已保留。请先保存、核对结果或放弃，再离开。');}};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[navigate]);
 useEffect(()=>{if(permissionLost){setPreview(null);setHandoffOpen(false);setCopyNotice('');}},[permissionLost]);
 function guard(next:()=>void,returnFocusId?:string){if(busy||uncertain){setNotice('保存结果尚未确认，请先用原请求核对。');return;}if(dirty){pendingFocus.current=returnFocusId||(document.activeElement as HTMLElement)?.id||undefined;setPending(()=>next);return;}next();}
 function reset(){setCandidate(null);setParameters([]);setInstructions('');setStep(1);setConsent(false);setDirty(false);setLocalError('');captureIntent.current=null;action.resetError();setPage(1);setMethodPage(1);setQ('');setQuery('');setStatus('');setPreview(null);previewSelection.current=null;}
 function changeModule(next:ProjectModule){guard(()=>{reset();setActive(next.moduleKey);setPurpose(next.definition.methodPurposes[0]!);setRecords({});setInputs([]);setConnectionId(null);onModule(next.moduleKey);},'pm-module-'+next.moduleKey);}
 function changePurpose(next:string){guard(()=>{reset();setPurpose(next);});}
 function changed(){setDirty(true);setConsent(false);captureIntent.current=null;action.resetError();setLocalError('');setPreview(null);}
 function go(next:number){if(locked&&next>1)return;try{if(next>1&&!candidate)return;if(next===3)methodCustomization(parameters,instructions);setStep(next);setConsent(false);setLocalError('');
  if(matchMedia('(max-width:760px)').matches)queueMicrotask(()=>editor.current?.scrollIntoView({block:'start'}));
 }catch(e){setLocalError(e instanceof Error?e.message:'请检查商品参数。');}}
 function pick(value:MethodCandidate){if(locked||!value.compatible)return;setCandidate(value);changed();}
 async function save(){if(!module||!candidate||!consent||busy||permissionLost||(!uncertain&&locked))return;
  let body=captureIntent.current;if(!body){try{body=action.intent('method-capture:'+module.id,{expectedModuleDigest:module.digest,purpose,sourceVersionId:candidate.versionId,
    expectedSourceRevision:candidate.revision,expectedSourceDigest:candidate.version.digest,customization:methodCustomization(parameters,instructions)});captureIntent.current=body;
   }catch(e){setLocalError(e instanceof Error?e.message:'请检查方法');return;}}
  await action.run(()=>projectMethodsApi.capture(module.id,body),value=>{setSelected(old=>({...old,[module.id+':'+value.purpose]:value}));setStep(4);setDirty(false);setConsent(false);captureIntent.current=null;
   setNotice('商品方法已固定。共享基础和历史版本保持原样，尚未启动制作。');void client.invalidateQueries({queryKey:['private','admin','module-methods',context.productId,module.id]});onSaved();});
 }
 async function another(value:ProjectMethod){if(locked||!module)return;await action.run(()=>projectMethodsApi.candidates(module.id,{purpose:value.purpose,q:value.version.manifest.name,pageSize:20}),page=>{
   const source=page.items.find(c=>c.versionId===value.version.id);setParameters(methodParameters(value.customization?.parameters??{}));setInstructions(value.customization?.instructions??'');setPurpose(value.purpose);
   setCandidate(source?.compatible?source:null);setStep(source?.compatible?2:1);setDirty(true);setConsent(false);captureIntent.current=null;
   if(!source?.compatible)setNotice('旧基础版本当前不可用于新固定。定制已保留，请重新选择基础方法。');
   else if(source.revision!==value.sourceRevision)setNotice('基础草稿已有新修订。旧方法保留，请核对当前基础和定制后再固定。');
   void client.invalidateQueries({queryKey:['private','admin','method-candidates',context.productId,module.id]});
  });}
 async function recheckSource(){if(!module||!candidate||locked)return;await action.run(()=>projectMethodsApi.candidates(module.id,{purpose,q:candidate.version.manifest.name,pageSize:20}),value=>{
  const source=value.items.find(c=>c.versionId===candidate.versionId);captureIntent.current=null;setConsent(false);setDirty(true);
  setCandidate(source?.compatible?source:null);setStep(source?.compatible?2:1);setNotice('基础版本已重新读取，商品定制保留。请核对当前基础后重新预览和确认。');
  void client.invalidateQueries({queryKey:['private','admin','method-candidates',context.productId,module.id]});
 });}
 function openHandoff(){if(locked)return;if(dirty){setNotice('请先固定或放弃当前商品定制，再整理交接说明。');return;}setPreview(null);previewSelection.current=null;setCopyNotice('');setHandoffOpen(true);}
 function invalidateHandoff(){setPreview(null);previewSelection.current=null;setCopyNotice('');handoffAction.resetError();}
 async function checkHandoff(){if(!module||locked)return;const body=ProjectHandoffSelectionSchema.parse({expectedModuleDigest:module.digest,connectionId,
  methods:module.definition.methodPurposes.flatMap(p=>{const value=selected[module.id+':'+p];return value?[{snapshotId:value.id,digest:value.digest}]:[];}),
  records:Object.values(records).map(r=>({recordId:r.id,digest:r.digest})),inputs:inputs.map(({revisionId,digest,locator})=>({revisionId,digest,locator}))});
  await handoffAction.run(()=>projectMethodsApi.preview(module.id,body),value=>{previewSelection.current=body;setPreview(value);});
 }
 async function exportHandoff(copy:boolean){if(!module||!preview?.ready||!preview.digest||!previewSelection.current||locked)return;
  await handoffAction.run(async()=>{const value=await projectMethodsApi.export(module.id,{selection:previewSelection.current,expectedDigest:preview.digest}),text=JSON.stringify(value,null,2)+'\n';
   if(copy){try{await navigator.clipboard.writeText(text);}catch{throw new ClientError('COPY_FAILED','复制未完成，请检查浏览器剪贴板权限后重试。',400);}}
   else{const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='project-method-'+module.moduleKey+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
   setCopyNotice(copy?'制作说明已复制，不含密钥；尚未发送或启动制作。':'固定清单已导出，不含密钥；尚未启动制作。');
  });
 }
 if(!plan||!module)return <div className="project-method-operations"><p>当前计划没有可设置的方法模块。</p><button onClick={onClose}>返回项目</button></div>;
 const chosen=Object.values(selected).filter(m=>m.planModuleId===module.id),history=methods.data?.items.filter(m=>m.purpose===purpose)??[],full=()=>{try{return candidate?effectiveMethod(candidate,parameters,instructions):'';}catch{return '';}};
 return <section className="project-method-operations" aria-label="商品方法与交接"><button className="pm-return" onClick={()=>guard(onClose)}>← 返回商品项目</button>
  <div className="page-title"><div><small className="eyebrow">PRODUCT / METHODS</small><h2>为商品选好制作方法</h2><p>选基础 Skill，补上这款商品的要求，再把固定版本交给 Codex。</p></div><button id="pm-handoff-open" className="primary" disabled={locked} onClick={openHandoff}>整理交接说明 ↗</button></div>
  <div className="project-context"><div><span className="context-label">当前商品</span><strong>{productName}</strong><span className="tag">{current?'当前计划':'历史只读'}</span></div><div><span>制作计划 r{plan.revision}</span><span>共同设定 r{context.profile?.revision??'—'}</span>
   <select aria-label="查看计划版本" value={plan.id} disabled={busy||uncertain} onChange={e=>{const value=e.target.value;guard(()=>{reset();onPlan(value);});}}>{!context.plans.items.some(p=>p.id===plan.id)&&<option value={plan.id}>r{plan.revision}</option>}{context.plans.items.map(p=><option key={p.id} value={p.id}>r{p.revision} · {p.title}</option>)}</select></div></div>
  <div className="goal"><span>这款商品留给用户的体验</span><p>{context.profile?.profile.takeaway??'按当前固定共同设定继续。'}</p></div>
  {notice&&<p className="notice" role="status">{notice}</p>}{(!current||stale)&&<p className="pm-readonly">{stale?'当前页面与原计划不同，草稿保留。':'历史计划和审核/运行视图只读。'}<button disabled={busy||uncertain} onClick={()=>guard(()=>{reset();setContext(data);onClose();})}>放弃未保存修改并返回项目</button></p>}
  {permissionLost&&<p className="callout error" role="alert">管理员权限已变化，已停止写入和交接。请重新确认身份。</p>}
  <div className="workspace"><aside className="modules"><header><h2>交付模块</h2><small>按专业用途分别固定</small></header>{plan.modules.map((m,i)=><button id={'pm-module-'+m.moduleKey} key={m.id} disabled={busy||uncertain} aria-current={m.id===module.id?'page':undefined} onClick={()=>changeModule(m)}><span className="module-number">{String(i+1).padStart(2,'0')}</span><strong>{m.definition.title}</strong><small>{m.definition.methodPurposes.filter(p=>selected[m.id+':'+p]).length} / {m.definition.methodPurposes.length} 个用途已选</small></button>)}<div className="module-foot">各模块沿用同一份商品设定。<br/>为本次制作明确选择固定方法。</div></aside>
   <section className="method-editor"><header className="module-heading" ref={editor} tabIndex={-1}><div><small>{module.definition.domain.toUpperCase()} / {module.definition.target.form.toUpperCase()}</small><h2>{module.definition.title}</h2><p>{module.definition.purpose}</p></div><span className={'tag'+(snapshot?' green':'')}>{snapshot?'已选固定方法':'待选方法'}</span></header>
    {module.definition.methodPurposes.length>1&&<div className="purpose-list">{module.definition.methodPurposes.map(p=><button key={p} disabled={busy||uncertain} className={purpose===p?'selected':''} onClick={()=>changePurpose(p)}>{projectPurposes[p]}<small>{selected[module.id+':'+p]?'已选择':'待选择'}</small></button>)}</div>}
    <div className="steps">{['选择基础 Skill','商品定制','确认并固定'].map((label,i)=><button key={label} disabled={uncertain||busy||(i>0&&!candidate)} aria-current={Math.min(step,3)===i+1?'step':undefined} onClick={()=>go(i+1)}>0{i+1}<span>{label}</span></button>)}</div>
    <div className="pm-editor-body">
     {step===1&&<><div className="body-intro"><h3>先选一种适合这款商品的方法</h3><p>固定精确版本，共享库升级不会悄悄换掉它。</p></div><div className="template-search"><input aria-label="搜索基础 Skill" placeholder="搜索名称或标识" value={q} disabled={locked} onChange={e=>setQ(e.target.value)}/><select aria-label="基础方法状态" value={status} disabled={locked} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">全部可用状态</option><option value="active">已启用</option><option value="reviewed">已审核</option><option value="draft">草稿</option><option value="archived">已归档</option></select></div>
      {!current||stale?<p>此视图只读，可在下方查看已固定的方法。</p>:candidates.isPending?<p className="pm-loading">正在读取候选方法…</p>:candidates.isError?<ErrorMessage error={candidates.error} retry={()=>void candidates.refetch()}/>:<><div className="template-list">{candidates.data.items.map(c=><label key={c.versionId} className="template-choice"><input type="radio" name="pm-base" aria-label={'选择'+c.version.manifest.name+' v'+c.version.number} disabled={locked||!c.compatible} checked={candidate?.versionId===c.versionId} onChange={()=>pick(c)}/><div><div className="template-title"><strong>{c.version.manifest.name} <small>v{c.version.number} / r{c.revision}</small></strong><span className={'tag'+(c.status==='active'?' green':'')}>{c.unavailableReason??(c.status==='active'?'已启用':c.status==='reviewed'?'已审核 · 未启用':c.origin==='project'?'本商品候选 · 草稿':'共享草稿')}</span></div><p>{c.version.manifest.description}</p><small>{projectPurposes[purpose as keyof typeof projectPurposes]} · {c.version.manifest.supportedForms.join(' / ')} · {c.version.files.length} 份参考附件</small></div></label>)}</div>{!candidates.data.total&&<p>没有匹配的方法。可调整搜索，或先在 Skill 库/受限项目中保存候选方法。</p>}<Pager {...candidates.data} onChange={setPage}/></>}
      <p className="callout">只选择基础版本，不修改共享库，也不启动内容制作。</p></>}
     {step===2&&candidate&&<><div className="body-intro"><h3>把这款商品的要求补充清楚</h3><p>基础模板保持原样，参数和补充说明只属于本商品方法。</p></div><div className="base-reference"><div><strong>{candidate.version.manifest.name} · v{candidate.version.number}</strong><small>固定源修订 r{candidate.revision}</small></div><button disabled={locked} onClick={()=>go(1)}>更换基础方法</button></div>
      <div className="section-label"><div><h3>商品参数</h3><p>文字、数字或开关，最多 40 项。</p></div><button disabled={locked||parameters.length>=40} onClick={()=>{setParameters(v=>[...v,{key:'',type:'text',value:''}]);changed();}}>＋ 添加</button></div>
      <div className="parameters">{parameters.map((p,i)=><div className="parameter-row" key={i}><input aria-label={'参数'+(i+1)+'名称'} placeholder="如 audience" disabled={locked} value={p.key} onChange={e=>{setParameters(v=>v.map((r,j)=>j===i?{...r,key:e.target.value}:r));changed();}}/><select aria-label={'参数'+(i+1)+'类型'} disabled={locked} value={p.type} onChange={e=>{const type=e.target.value as MethodParameter['type'];setParameters(v=>v.map((r,j)=>j===i?{...r,type,value:type==='boolean'?'false':r.value}:r));changed();}}><option value="text">文字</option><option value="number">数字</option><option value="boolean">开关</option></select>
       {p.type==='boolean'?<select data-field="value" aria-label={'参数'+(i+1)+'值'} disabled={locked} value={p.value} onChange={e=>{setParameters(v=>v.map((r,j)=>j===i?{...r,value:e.target.value}:r));changed();}}><option value="false">false</option><option value="true">true</option></select>:<input data-field="value" aria-label={'参数'+(i+1)+'值'} disabled={locked} value={p.value} onChange={e=>{setParameters(v=>v.map((r,j)=>j===i?{...r,value:e.target.value}:r));changed();}}/>}
       <button aria-label={'移除参数'+(i+1)} disabled={locked} onClick={()=>{setParameters(v=>v.filter((_,j)=>j!==i));changed();}}>×</button></div>)}</div>
      <label className="wide-label">给这款商品的补充说明<small>希望呈现的场景、语言尺度、应该避开的表达。</small><textarea aria-label="商品补充说明" disabled={locked} value={instructions} maxLength={8000} onChange={e=>{setInstructions(e.target.value);changed();}}/></label></>}
     {step===3&&candidate&&<><div className="body-intro"><h3>{uncertain?'保存结果待确认':'确认本次固定的完整方法'}</h3><p>基础版本、商品定制与附件一起固定在当前计划和模块。</p></div><div className="review-block"><dl><dt>所属商品</dt><dd>{productName} · 计划 r{plan.revision}</dd><dt>模块与用途</dt><dd>{module.definition.title} / {projectPurposes[purpose as keyof typeof projectPurposes]}</dd><dt>基础版本</dt><dd>{candidate.version.manifest.name} · v{candidate.version.number} / 源 r{candidate.revision}</dd><dt>参考附件</dt><dd>{candidate.version.files.length?candidate.version.files.map(f=>f.path).join('、'):'无参考附件'}</dd></dl></div><div className="review-block"><h3>最终完整方法正文</h3><pre className="body-copy">{full()}</pre></div><p className="callout">修改会另存商品方法，旧版本和成果来源保留。保存不表示已制作或审核。</p></>}
     {step===4&&snapshot&&<><div className="saved-hero"><span className="saved-check">✓</span><div><h3>商品方法已固定</h3><p>{snapshot.version.manifest.name} · 基础 v{snapshot.version.number} / 源 r{snapshot.sourceRevision}</p></div></div><div className="review-block"><h3>本次完整方法正文</h3><pre className="body-copy">{snapshot.customization?.effectiveInstructions??snapshot.version.manifest.instructions}</pre></div></>}
     {methods.isError&&<ErrorMessage error={methods.error} retry={()=>void methods.refetch()}/>}<details open={step===4} className="technical"><summary>已固定的本用途方法 · 为本次交接选择精确版本</summary>{history.map(m=><label key={m.id} className="history-choice"><input type="radio" name="pm-snapshot" disabled={busy||uncertain||dirty} checked={snapshot?.id===m.id} aria-label={'交接使用方法 '+m.id} onChange={()=>{setSelected(v=>({...v,[selectionKey]:m}));setStep(4);}}/><div><strong>{m.version.manifest.name} · 基础 v{m.version.number} / 源 r{m.sourceRevision}</strong><small>{new Date(m.createdAt).toLocaleString('zh-CN')} · {m.customization?.instructions||'沿用基础方法'}</small></div></label>)}{methods.data&&<Pager {...methods.data} onChange={setMethodPage}/>}</details>
     {localError&&<p role="alert" className="pm-error">{localError}</p>}{!!action.error&&<ErrorMessage error={action.error}/ >}{action.error instanceof ClientError&&action.error.status===409&&!uncertain&&<button disabled={locked} onClick={()=>void recheckSource()}>重新核对基础版本</button>}</div>
    <footer className="editor-actions pm-editor-actions">{step===3&&<label className="consent"><input type="checkbox" aria-label="我已核对基础版本、商品定制与参考附件" checked={consent} disabled={locked} onChange={e=>setConsent(e.target.checked)}/>我已核对基础版本、商品定制与参考附件，按此版本固定商品方法。</label>}<small>{uncertain?'结果未知，修改与切换暂时锁定。':'定制只属于本商品；内容制作需要另行安排。'}</small><div className="buttons">
     {step===1&&<button className="primary" disabled={!candidate||locked} onClick={()=>go(2)}>继续，补充商品要求</button>}
     {step===2&&<><button disabled={locked} onClick={()=>go(1)}>返回选择</button><button className="primary" disabled={locked} onClick={()=>go(3)}>预览完整商品方法</button></>}
     {step===3&&(uncertain?<button className="primary" disabled={busy||permissionLost} onClick={()=>void save()}>核对保存结果</button>:<><button disabled={busy||permissionLost} onClick={()=>go(2)}>返回修改</button><button className="primary" disabled={!consent||locked} onClick={()=>void save()}>{busy?'正在保存…':'保存为商品方法'}</button></>)}
     {step===4&&snapshot&&<><button disabled={locked} onClick={()=>void another(snapshot)}>另存一版商品定制</button><button id="pm-prepare-handoff" className="primary" disabled={locked} onClick={openHandoff}>整理交接说明</button></>}
    </div></footer>
   </section></div>
  {dirty&&!uncertain&&!busy&&<p className="pm-links"><button onClick={()=>guard(()=>{reset();setContext(data);})}>放弃未保存的方法设置</button></p>}
  {pending&&<MethodDialog title="保留这份商品定制？" returnFocusId={pendingFocus.current} close={()=>setPending(null)} footer={<><button onClick={()=>setPending(null)}>继续编辑</button><button className="danger" onClick={()=>{const next=pending;setPending(null);setDirty(false);next();}}>放弃并切换</button></>}><p>修改尚未固定。可以继续编辑，或放弃本次修改再切换。</p></MethodDialog>}
  {handoffOpen&&<MethodDialog title="交给 Codex 制作" close={()=>setHandoffOpen(false)} busy={handoffAction.busy} returnFocusId={step===4?'pm-prepare-handoff':'pm-handoff-open'} footer={<><button disabled={handoffAction.busy} onClick={()=>setHandoffOpen(false)}>返回方法</button>{preview?.ready?<><button disabled={locked} onClick={()=>void exportHandoff(false)}>导出固定清单</button><button className="primary" disabled={locked} onClick={()=>void exportHandoff(true)}>复制制作说明</button></>:<button className="primary" disabled={locked} onClick={()=>void checkHandoff()}>{handoffAction.busy?'正在核对…':'核对并整理制作说明'}</button>}</>}>
   {preview?.ready&&preview.manifest?<><div className="saved-hero"><span className="saved-check">✓</span><div><h3>制作说明已整理</h3><p>固定范围已带入，尚未发送、运行或安排日程。</p></div></div><div className="check-row"><span>商品与设定</span><span>{preview.manifest.productName} / 计划 r{plan.revision}</span></div><div className="check-row"><span>本次交付</span><span>{module.definition.title} · {preview.manifest.methods.length} 个固定方法</span></div><ol className="handoff-list"><li><b>01</b>读取选定的固定方法，保留基础版本和商品定制。</li><li><b>02</b>只读取明确选中的 {preview.manifest.inputs.length} 个输入片段，按固定引用制作。</li><li><b>03</b>保存本领域草稿和制作来源，回到后台查看与审核。</li></ol><p className="callout">说明不含密钥，不建立授权或启动制作；实际工具调用仍须重新检查权限。平台原件只带引用与摘要，二进制文件需按授权另行取回。</p><button disabled={handoffAction.busy} onClick={invalidateHandoff}>返回核对范围</button><details className="technical"><summary>查看固定引用与交接字段</summary><pre>{JSON.stringify(preview.manifest,null,2)}</pre></details></>:
    <><div className="handoff-context"><span>{productName} · {module.definition.title}</span><span>计划 r{plan.revision}</span></div><div className="review-block"><h3>本次固定方法</h3>{module.definition.methodPurposes.map(p=><p key={p}>{projectPurposes[p]}：{chosen.find(m=>m.purpose===p)?.version.manifest.name??'尚未选择精确版本'}</p>)}</div>
     <label className="handoff-label">使用哪份已有连接<select aria-label="选择制作连接" value={connectionId??''} disabled={handoffAction.busy} onChange={e=>{setConnectionId(e.target.value||null);invalidateHandoff();}}><option value="">请选择 · 不签发新授权</option>{connectionId&&!connections.data?.items.some(c=>c.id===connectionId)&&<option value={connectionId}>已选连接 · 待核对</option>}{connections.data?.items.map(c=><option value={c.id} key={c.id}>{c.name} · {c.status==='active'?'有效':c.status==='revoked'?'已撤销':'需核对范围/状态'}</option>)}</select></label>{connections.isError&&<ErrorMessage error={connections.error} retry={()=>void connections.refetch()}/ >}{connections.data&&<Pager {...connections.data} onChange={setConnectionPage}/>}
     {module.definition.dependsOn.map(key=>{const dependency=plan.modules.find(m=>m.moduleKey===key)!;return <InputPicker key={module.id+':'+dependency.id} module={module} dependency={dependency} selected={records[dependency.id]??null} inputs={inputs} disabled={handoffAction.busy} onRecord={r=>{setRecords(old=>{const next={...old};if(r)next[dependency.id]=r;else delete next[dependency.id];return next;});setInputs(old=>old.filter(i=>i.recordId!==records[dependency.id]?.id));invalidateHandoff();}} onInput={(input,checked)=>{setInputs(old=>checked?[...old.filter(i=>methodInputKey(i)!==methodInputKey(input)),input]:old.filter(i=>methodInputKey(i)!==methodInputKey(input)));invalidateHandoff();}}/>;})}
     {!!preview?.issues.length&&<div className="callout amber" role="status">交接还差：{preview.issues.map((i,index)=><p key={index}>{i.message}</p>)}</div>}<p className="muted">本页保留这次选择，导出时固定清单；刷新后需重新选择。</p></>}
   {!!handoffAction.error&&<ErrorMessage error={handoffAction.error}/>}<p role="status">{copyNotice}</p>
  </MethodDialog>}
 </section>;
}
function InputPicker({module,dependency,selected,inputs,disabled,onRecord,onInput}:{module:ProjectModule;dependency:ProjectModule;selected:RecordChoice|null;inputs:InputChoice[];disabled:boolean;onRecord:(value:RecordChoice|null)=>void;onInput:(input:InputChoice,checked:boolean)=>void}){
 const [recordPage,setRecordPage]=useState(1),[page,setPage]=useState(1),query=useQuery({queryKey:['private','admin','handoff-inputs',module.id,dependency.id,selected?.id,recordPage,page],
  queryFn:({signal})=>projectMethodsApi.inputs(module.id,{dependencyId:dependency.id,recordId:selected?.id,recordPage,page},signal),refetchOnWindowFocus:false});
 return <section className="pm-input-picker"><h3>输入依据 · {dependency.definition.title}</h3>{query.isPending?<p className="pm-loading">正在读取固定输入…</p>:query.isError?<ErrorMessage error={query.error} retry={()=>void query.refetch()}/>:<>
  <select aria-label={'选择'+dependency.definition.title+'记录'} disabled={disabled} value={selected?.id??''} onChange={e=>{const id=e.target.value;setPage(1);onRecord(query.data.records.items.find(r=>r.id===id)??null);}}><option value="">请选择一份固定记录</option>{selected&&!query.data.records.items.some(r=>r.id===selected.id)&&<option value={selected.id}>{selected.title} · r{selected.revision}</option>}{query.data.records.items.map(r=><option key={r.id} value={r.id}>{r.title} · r{r.revision} · {new Date(r.createdAt).toLocaleString('zh-CN')}</option>)}</select>
  <Pager {...query.data.records} onChange={setRecordPage}/>{query.data.fileOnly&&<p>按这份记录核验平台原件；交接只带固定引用和摘要。</p>}
  <div className="pm-fragments">{query.data.fragments.items.map(input=><label key={methodInputKey(input)}><input type="checkbox" disabled={disabled} aria-label={'使用输入片段 '+input.label} checked={inputs.some(i=>methodInputKey(i)===methodInputKey(input))} onChange={e=>onInput(input,e.target.checked)}/><span>{input.label}<small> · {input.locator.kind==='question'?'题目节选':input.locator.kind==='block'?'文案片段':'明确内容'}</small></span></label>)}</div><Pager {...query.data.fragments} onChange={setPage}/>
 </>}</section>;
}
