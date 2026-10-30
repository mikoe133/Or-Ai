import {ExternalRunConfigurations} from './external-run-configurations.js';
import {useEffect,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link,useLocation} from 'react-router-dom';
import {Loading,Pager,useAction} from '../business/shared.js';
import {ClientError} from '../api/client.js';
import {MachineConnections} from './machine.js';
import {codexConnectionsApi,type CodexConnection,type CodexPreview,type CodexIssued} from './codex-connections-api.js';
import {codexDefaults,codexDraftPlan,codexFormIssues,draftCodexSummary,connectionHandoff,codexDomainNames,type NamedChoice} from './codex-connections-model.js';
import {CodexAdvanced,CodexDialog,CodexFailure,CodexSummary,type CodexAccessFailure} from './codex-connections-form.js';
import {isAccessFailure,RefreshNotice} from './refresh-notice.js';
import './management.css';
import './codex-connections.css';

function Heading({active=false}:{active?:boolean}){return <header className="heading"><h2 className="cx-title">{active?'我的 Codex 连接':'连接我的 Codex'}</h2>
  <p>{active?'后续商品沿用这份连接范围。你可以随时查看权限或撤销访问，不用每做一款商品重新配置。':'让 Codex 帮你创建商品、使用允许的 Skill、上传题目和宣传素材草稿。一次连接，后续多个商品都可沿用。'}</p></header>;}
function NewConnection({categories,onCreated,onCancel,blocked,onAccessFailure}:{categories:NamedChoice[];onCreated:(result:CodexIssued)=>void;onCancel?:()=>void;blocked:boolean;onAccessFailure:CodexAccessFailure}){
  const [form,setForm]=useState(()=>codexDefaults(categories[0])),[issues,setIssues]=useState<string[]>([]),[preview,setPreview]=useState<CodexPreview|null>(null),[reviewOpen,setReviewOpen]=useState(false),[consent,setConsent]=useState(false);
  const action=useAction(),clientKey=useRef(crypto.randomUUID()),creation=useRef<Parameters<typeof codexConnectionsApi.create>[0]|null>(null);
  const uncertain=action.error instanceof ClientError&&(action.error.status===0||action.error.status>=500)&&!!creation.current,
    permissionLost=isAccessFailure(action.error),locked=blocked||action.busy||uncertain||permissionLost,
    localPlan=codexDraftPlan(form),summary=draftCodexSummary(form);
  useEffect(()=>{if(permissionLost)onAccessFailure(action.error);},[action.error]);
  useEffect(()=>{if(blocked){setReviewOpen(false);setConsent(false);}else if(permissionLost)action.resetError();},[blocked]);
  const update=(value:typeof form)=>{if(locked)return;setForm(value);if(issues.length)setIssues(codexFormIssues(value));action.resetError();};
  async function prepare(){if(locked)return;const errors=codexFormIssues(form);setIssues(errors);if(errors.length)return;
    creation.current=null;await action.run(()=>codexConnectionsApi.preview(codexDraftPlan(form)),value=>{setConsent(false);setPreview(value);setReviewOpen(true);});}
  async function save(){if(!preview||(!consent&&!creation.current)||action.busy||permissionLost||blocked)return;
    const body=creation.current??action.intent('codex-connection-create',{plan:preview.plan,expectedDigest:preview.digest,confirmed:true,clientKey:clientKey.current});creation.current=body;
    await action.run(()=>codexConnectionsApi.create(body),value=>{setReviewOpen(false);setPreview(null);creation.current=null;onCreated(value);});}
  if(blocked)return null;
  return <><Heading/><nav className="cx-page-links" aria-label="连接页内导航"><a href="#codex-setup">编辑连接范围</a><a href="#cx-summary">查看权限摘要</a></nav><div className="layout"><section className="panel"><div className="section-title"><h3>你希望 Codex 帮你做什么？</h3><small>由你选择允许的操作</small></div>
    <form id="codex-setup" noValidate onSubmit={e=>{e.preventDefault();void prepare();}}><fieldset disabled={locked}>
      <fieldset aria-label="允许 Codex 做的事">{([
        ['createProjects','创建商品项目','根据选题建立商品和制作计划，先保存为草稿。'],
        ['useSkills','使用允许的 Skill','读取允许的方法，为商品保存独立的方法版本；共享库保持原样。'],
        ['uploadDrafts','上传商品草稿','上传题目、报告方案、封面、视频或文案，留给你查看和审核。'],
      ] as const).map(([key,title,description])=><label className="action-choice" key={key}><input type="checkbox" aria-label={title} checked={form.actions[key]} onChange={e=>update({...form,actions:{...form.actions,[key]:e.target.checked}})}/><span><strong>{title}</strong><p>{description}</p></span></label>)}</fieldset>
      <div className="business-boundary"><span>↳</span><span>审核和上架仍由你操作。Codex 不能读取用户答卷和个人报告。</span></div>
      <CodexAdvanced form={form} setForm={update} categories={categories} onAccessFailure={onAccessFailure}/>
    </fieldset>{!!issues.length&&<p className="error" role="alert">{issues.join(' ')}</p>}
      {!!action.error&&<CodexFailure error={action.error}/>}
    </form>
  </section><aside id="cx-summary" tabIndex={-1} className="summary" aria-label="连接权限摘要"><div className="section-title"><h3>这次连接允许什么</h3><small>确认前请核对</small></div><CodexSummary plan={localPlan} summary={summary}/></aside></div>
    <div className="setup-actions"><small>先核对权限摘要，再由你确认连接。<br/>内容制作和定时任务需要之后另行安排。</small><div className="cx-buttons">{onCancel&&<button type="button" disabled={action.busy} onClick={onCancel}>返回已有连接</button>}
      {uncertain?<button id="cx-connect-button" type="button" className="primary" onClick={()=>void save()}>确认保存结果</button>:<button id="cx-connect-button" form="codex-setup" type="submit" className="primary" disabled={locked||!Object.values(form.actions).some(Boolean)}>连接我的 Codex</button>}</div></div>
    {preview&&reviewOpen&&<CodexDialog returnFocusId="cx-connect-button" dismissible={!action.busy} title={uncertain?'保存结果待确认':'确认连接范围'} onClose={()=>{if(!action.busy){setReviewOpen(false);if(!uncertain)setPreview(null);}}} footer={<>
      <label className="consent"><input type="checkbox" aria-label="我允许按上方范围建立连接" checked={consent} disabled={action.busy||uncertain||permissionLost} onChange={e=>setConsent(e.target.checked)}/>我允许按上方列出的操作、商品、Skill 范围和有效期建立连接。</label>
      <div className="dialog-actions"><button type="button" disabled={action.busy} onClick={()=>{setReviewOpen(false);if(!uncertain)setPreview(null);}}>{uncertain?'稍后核对':'返回修改'}</button>
        <button type="button" className="primary" disabled={!consent||action.busy||permissionLost} onClick={()=>void save()}>{action.busy?'正在保存…':uncertain?'确认保存结果':'确认连接'}</button></div>
    </>}><p>{uncertain?'保存响应没有收到。请用同一请求核对结果，暂时不要重新设置或重复签发。':'请核对以下范围。确认会为这些内容领域分别建立有限授权，客户端接入仍由你另行配置。'}</p>
      <CodexSummary plan={preview.plan} summary={preview.summary}/>{!!action.error&&<CodexFailure error={action.error}/>}
    </CodexDialog>}
  </>;
}

function MainConnections({scope}:{scope:'demo'|'live'}){
  const client=useQueryClient(),location=useLocation(),action=useAction();
  const [page,setPage]=useState(1),[selectedId,setSelectedId]=useState<string|null>(null),[creating,setCreating]=useState(false),
    [modal,setModal]=useState<'permissions'|'copy'|'revoke'|null>(null),[notice,setNotice]=useState(''),[hasSecrets,setHasSecrets]=useState(false),[accessError,setAccessError]=useState<unknown>(null),[retrying,setRetrying]=useState(false);
  const secrets=useRef<{connectionId:string;values:CodexIssued['secrets']}|null>(null);
  const accessCheck=useRef<(()=>Promise<unknown>)|null>(null),blockedRef=useRef(false);
  const list=useQuery({queryKey:['private','admin','codex-connections',scope,page],queryFn:({signal})=>codexConnectionsApi.list(page,signal),refetchOnWindowFocus:false}),
    categories=useQuery({queryKey:['private','admin','codex-categories',1],queryFn:({signal})=>codexConnectionsApi.categories(1,signal),refetchOnWindowFocus:false}),
    currentId=selectedId??list.data?.items.find(c=>['active','partial'].includes(c.status))?.id??list.data?.items[0]?.id,
    detail=useQuery({queryKey:['private','admin','codex-connection',scope,currentId],enabled:!!currentId&&!creating,
      queryFn:({signal})=>codexConnectionsApi.read(currentId!,signal),refetchOnWindowFocus:false});
  const connection=detail.data,showNew=creating||(!currentId&&!list.isPending);
  function clear(){secrets.current=null;setHasSecrets(false);}
  useEffect(()=>{const hide=()=>{clear();setModal(null);};const visibility=()=>{if(document.hidden)hide();};window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visibility);
    return()=>{secrets.current=null;window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visibility);};},[]);
  useEffect(()=>{clear();setModal(null);},[location.key]);
  const denied=[list.error,categories.error,detail.error,action.error].find(isAccessFailure)??accessError;
  blockedRef.current=!!denied;
  useEffect(()=>{if(denied){clear();setModal(null);setAccessError(denied);}},[denied]);
  const accessFailed:CodexAccessFailure=(error,verify)=>{accessCheck.current=verify??null;setAccessError(error);};
  function created(result:CodexIssued){clear();if(result.secrets.length&&!blockedRef.current){secrets.current={connectionId:result.connection.id,values:result.secrets};setHasSecrets(true);}
    client.setQueryData(['private','admin','codex-connection',scope,result.connection.id],result.connection);setSelectedId(result.connection.id);setCreating(false);
    setNotice(result.secretState==='not_recoverable'?'已确认原授权记录。一次性凭据无法再次取回；如未收到说明，请先撤销，再重新设置。':'授权记录已保存。请妥善保存一次性连接说明，再在 Codex 中添加；这不代表客户端已经连接。');
    void client.invalidateQueries({queryKey:['private','admin','codex-connections']});}
  async function copyOpen(){if(!connection||action.busy)return;await action.run(()=>codexConnectionsApi.read(connection.id),value=>{
    if(value.status!=='active')throw new ClientError('CONFLICT','连接状态已变化，请重新读取后核对。',409);
    if(!secrets.current||secrets.current.connectionId!==value.id)throw new ClientError('SECRET_UNAVAILABLE','一次性说明已隐藏或未收到，不能重新取回。',409);
    connectionHandoff(value,secrets.current.values);client.setQueryData(['private','admin','codex-connection',scope,value.id],value);setModal('copy');});}
  async function copy(){if(!connection||!secrets.current||action.busy)return;await action.run(async()=>{
    const current=await codexConnectionsApi.read(connection.id);if(secrets.current?.connectionId!==current.id)throw new ClientError('SECRET_UNAVAILABLE','一次性说明已隐藏。',409);
    const payload=connectionHandoff(current,secrets.current.values);try{await navigator.clipboard.writeText(payload);}catch{throw new ClientError('COPY_FAILED','复制未完成。请检查浏览器剪贴板权限后重试。',400);}
    setNotice('连接说明已复制。请保存到本地安全配置；此页面没有安装客户端或启用任务。');});}
  async function revoke(){if(!connection||action.busy)return;await action.run(()=>codexConnectionsApi.revoke(connection.id,action.intent('codex-revoke:'+connection.id,{})),value=>{
    clear();setModal(null);client.setQueryData(['private','admin','codex-connection',scope,value.id],value);setNotice('该连接的各领域授权已撤销，历史商品和成果保留。');
    void client.invalidateQueries({queryKey:['private','admin','codex-connections']});void client.invalidateQueries({queryKey:['private','admin','machine-credentials']});});}
  const retry=async()=>{if(retrying)return;setRetrying(true);try{await Promise.all([list.refetch({throwOnError:true}),categories.refetch({throwOnError:true}),...(currentId&&!creating?[detail.refetch({throwOnError:true})]:[]),...(accessCheck.current?[accessCheck.current()]:[])]);accessCheck.current=null;setAccessError(null);if(isAccessFailure(action.error))action.resetError();}catch{/* Keep the access boundary until every read succeeds. */}finally{setRetrying(false);}};
  const accessNotice=denied?<CodexFailure error={denied} retry={()=>void retry()} busy={retrying}/>:null;
  if(denied&&(!showNew||!list.data||!categories.data))return accessNotice;
  if(!list.data)return list.isError?<CodexFailure error={list.error} retry={retry}/>:<Loading/>;
  if(!categories.data)return categories.isError?<CodexFailure error={categories.error} retry={retry}/>:<Loading/>;
  const refreshing=list.isError||categories.isError||(!showNew&&detail.isError),refreshNotice=refreshing?<RefreshNotice busy={retrying} retry={()=>void retry()}/>:null;
  if(showNew)return <div className="admin-management codex-connections">{accessNotice??refreshNotice}<NewConnection key={creating?'explicit-new':'first'} categories={categories.data.items.map(c=>({id:c.id,name:c.name}))} onCreated={created}
    blocked={!!denied} onAccessFailure={accessFailed} onCancel={currentId?()=>setCreating(false):undefined}/>{!denied&&<p className="cx-legacy"><Link to="?view=legacy">管理已有单领域连接</Link></p>}</div>;
  if(!connection)return detail.isError?<CodexFailure error={detail.error} retry={retry}/>:<Loading/>;
  const off=connection.status!=='active',revoked=connection.status==='revoked',expired=connection.status==='expired',partial=connection.status==='partial';
  return <div className="admin-management codex-connections">{refreshNotice}<Heading active/>{notice&&<p className="cx-notice" role="status">{notice}</p>}
    {!!action.error&&<CodexFailure error={action.error} retry={()=>void detail.refetch()}/>}
    <div className="layout"><section className="panel"><div className="active-header"><div><h3>{connection.name}</h3><span className={'state-badge'+(off?' off':'')}>{revoked?'已撤销':expired?'已到期':partial?'部分领域不可用':off?'连接已停用':'授权已建立'}</span></div></div>
      {off?<div className="end-state"><h3>{partial?'请核对这份连接的领域授权':'这份连接不再提供访问权限'}</h3><p>{connection.unavailableReason==='workspace_revoked'?'所属工作区已撤销。':connection.unavailableReason==='workspace_expired'?'所属工作区已到期。':partial?'部分领域凭据已单独撤销或失效。':''}已有商品、方法和成果保留。撤销本平台访问不代表已终止第三方作业。</p></div>:<><p>下一步，在 Codex 中添加连接说明。后续商品复用这份授权；此页面不会修改你的客户端配置。</p>
        <div className="steps"><div className="step"><span>01</span><div><h3>获取这份连接说明</h3><p>各类内容仍分别授权。一次性说明包含接入凭据，请保存到本地安全配置。</p>
          <button id="cx-copy-trigger" type="button" className="primary" disabled={action.busy||!hasSecrets} onClick={()=>void copyOpen()}>复制连接说明</button>
          {!hasSecrets&&<p className="hint">一次性说明已隐藏或未收到，无法再次取回。如果尚未保存，请先撤销，再重新设置。</p>}</div></div>
          <div className="step"><span>02</span><div><h3>在 Codex 中添加，然后按商品继续制作</h3><p>保留同一商品项目与固定方法版本。题目和宣传素材回到后台后，由你审核与上架。</p></div></div></div></>}
      <div className="connection-actions"><button id="cx-permissions-trigger" type="button" disabled={action.busy} onClick={()=>setModal('permissions')}>查看权限</button>
        {!revoked&&<button id="cx-revoke-trigger" type="button" className="danger" disabled={action.busy} onClick={()=>setModal('revoke')}>撤销连接</button>}
        {hasSecrets&&<button type="button" disabled={action.busy} onClick={()=>{clear();setModal(null);setNotice('一次性说明已清除，后续刷新不会恢复凭据。');}}>已保存，隐藏凭据</button>}
        {revoked&&<button type="button" className="primary" onClick={()=>{clear();setCreating(true);setNotice('');}}>重新设置连接</button>}
      </div>
    </section><aside id="cx-summary" tabIndex={-1} className="summary" aria-label="连接权限摘要"><div className="section-title"><h3>{off?'原授权记录':'这次连接允许什么'}</h3><small>{off?'当前请核对状态':'固定授权范围'}</small></div><CodexSummary plan={connection.plan} summary={connection.summary}/></aside></div>
    {list.data.total>1&&<details className="cx-other"><summary>其他已保存连接（{list.data.total}）</summary><ul>{list.data.items.map(c=><li key={c.id}><button type="button" disabled={c.id===connection.id||action.busy} onClick={()=>{clear();setSelectedId(c.id);setNotice('');setModal(null);}}>{c.name} · {c.status==='active'?'有效':c.status==='revoked'?'已撤销':'需核对'}</button></li>)}</ul><Pager {...list.data} onChange={setPage}/></details>}
    <p className="cx-legacy"><Link to="?view=legacy">管理已有单领域连接</Link> · <button type="button" className="quiet" onClick={()=>{clear();setCreating(true);setNotice('');}}>设置另一份连接</button></p>
    {modal&&<CodexDialog key={modal+connection.id} returnFocusId={modal==='copy'?'cx-copy-trigger':modal==='revoke'?'cx-revoke-trigger':'cx-permissions-trigger'} dismissible={!action.busy} title={modal==='revoke'?'撤销我的 Codex 连接？':modal==='copy'?'连接说明预览':'查看连接权限'} onClose={()=>{if(!action.busy)setModal(null);}} footer={<div className="dialog-actions">
      <button type="button" disabled={action.busy} onClick={()=>setModal(null)}>{modal==='revoke'?'保留连接':'关闭'}</button>
      {modal==='revoke'&&<button type="button" className="danger" disabled={action.busy} onClick={()=>void revoke()}>{action.busy?'正在撤销…':'确认撤销'}</button>}
      {modal==='copy'&&<button type="button" className="primary" disabled={action.busy||!hasSecrets} onClick={()=>void copy()}>复制连接说明</button>}
    </div>}>
      {modal==='copy'?<><p>此说明包含一次性凭据。请保存到本地安全配置，各领域分别接入；复制不会安装客户端或启用日程。</p><pre className="copy-preview">{`名称：${connection.name}\n内容：${connection.credentials.map(c=>codexDomainNames[c.domain]).join('、')}\n有效期：${connection.expiresAt}\n凭据：仅在复制时填入，不在页面中展示\n本机路径与输出目录：需要在客户端明确填写\n日程：尚未启用`}</pre></>:<><p>{modal==='revoke'?'撤销后，这份连接内各领域将停止访问商品和上传草稿。历史内容保留；不代表已停止第三方正在执行的作业。':'以下是已保存的固定授权范围，查看不会扩大授权。'}</p><CodexSummary plan={connection.plan} summary={connection.summary}/></>}
      {!!action.error&&<CodexFailure error={action.error}/>}
    </CodexDialog>}
  </div>;
}
export function CodexConnections({scope}:{scope:'demo'|'live'}){
  const location=useLocation();if(location.pathname.endsWith('/configurations'))return <ExternalRunConfigurations scope={scope}/>;return <><nav className="cx-surface-tabs" aria-label="连接与配置"><span aria-current="page">连接与权限</span><Link to="/admin/machine/configurations">运行配置草稿</Link></nav>{new URLSearchParams(location.search).get('view')==='legacy'?<><p className="cx-legacy"><Link to="/admin/machine">← 返回我的 Codex 连接</Link></p><MachineConnections scope={scope}/></>:<MainConnections key={scope} scope={scope}/>}</>;
}
