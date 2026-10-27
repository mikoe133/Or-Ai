import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ExperienceDraftInputSchema } from '@orai/contracts/admin';
import { experienceTemplate, registeredExperiences } from '@orai/contracts/experience';
import { Failure, Loading, Pager, useAction } from '../business/shared.js';
import { ReportHost } from '../experience/report-host.js';
import { experienceApi, type ExperienceWorkspace } from './experience-api.js';
import { adminApi, type Upload } from './api.js';
import { allPages, type Profile } from './content-api.js';
import { bindingsApi } from './skill-bindings-api.js';
import { fileDigest } from './content-media.js';
import { ProductionOrigin } from './content-parts.js';
import './experience.css';
import { SkillPlanInput } from './skill-plan-input.js';

type Proposal=ReturnType<typeof ExperienceDraftInputSchema.parse>;
type Revision=NonNullable<ExperienceWorkspace['latest']>;
const methodNames={scene_design:'场景与交互设计',report_presentation:'报告呈现'} as const;
export function ExperienceDesk({productId,versionId,profile,active,view='experience',contentDirty=false,onDirty,onChanged}:{productId:string;versionId:string;profile?:Profile;active:boolean;view?:'experience'|'result';contentDirty?:boolean;onDirty:(v:boolean)=>void;onChanged:()=>void}) {
  const query=useQuery({queryKey:['private','admin','experience',productId,versionId,profile?.id],enabled:!!versionId&&active,
    queryFn:({signal})=>experienceApi.workspace(productId,versionId,profile?.id,signal),refetchOnWindowFocus:false});
  const [session,setSession]=useState<ExperienceWorkspace|null>(null),[page,setPage]=useState(1),[selected,setSelected]=useState(''),[epoch,setEpoch]=useState(0),[dirty,setDirty]=useState(false),[notice,setNotice]=useState('');
  const history=useQuery({queryKey:['private','admin','experience-history',versionId,page],enabled:!!versionId&&active,
    queryFn:({signal})=>experienceApi.history(productId,versionId,page,signal),refetchOnWindowFocus:false});
  useEffect(()=>{if(query.data&&!session)setSession(query.data);},[query.data,session]);
  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
  async function reload(message='已读取最新体验配置。') {
    const result=await query.refetch();await history.refetch();
    if(result.data){setSession(result.data);setSelected('');setEpoch(n=>n+1);setDirty(false);setNotice(message);onChanged();}
  }
  if(!versionId)return <p className="content-note">{profile && !['web','3d'].includes(profile.profile.experienceForm)
    ? '此创作形式的体验与结果制作尚未启用，可先在项目工作区完善方案。'
    : '先在“商品内容”保存或选择一个单选内容版本，再配置体验设计与结果呈现。'}</p>;
  if(!session)return query.isError?<Failure error={query.error} retry={()=>void query.refetch()}/>:active?<Loading/>:null;
  const row=selected?history.data?.items.find(r=>r.id===selected)??session.latest:session.latest;
  const remoteChanged=query.data?.latest?.revision!==session.latest?.revision||query.data?.versionRevision!==session.versionRevision;
  return <section className="content-editor experience-desk" aria-label={view==='result'?'结果呈现制作工作台':'体验设计制作工作台'}>
    <div className="content-section-heading"><div><span className="content-eyebrow">{view==='result'?'RESULT / PRESENTATION':'EXPERIENCE / SCENES'}</span><h3>{view==='result'?'结果呈现与叙事方案':'体验设计'}</h3><p>{view==='result'?'核对结构化结果如何呈现，以及它怎样承接体验。':'按注册能力把商品内容映射为交互场景，保留明确确认与恢复。'}</p></div>
      <span className="content-badge">{session.release?'已固定发布':row?`r${row.revision} · ${row.status==='reviewed'?'已审核':'草稿'}`:'尚未制作'}</span></div>
    {notice&&<p role="status" className="content-note">{notice}</p>}
    {contentDirty&&<p className="content-note">商品内容或结果文案有未保存修改。体验修订引用服务器上已保存的内容；先保存内容草稿并重新校验后，再审核或生成演示结果。</p>}
    {remoteChanged&&<p role="status">体验或题库已有新修订。当前输入已保留，读取最新稿后再继续。</p>}
    <div className="experience-toolbar"><label>体验修订<select aria-label="体验修订" value={selected} disabled={dirty} onChange={e=>setSelected(e.target.value)}>
      <option value="">当前稿{session.latest?` · r${session.latest.revision}`:''}</option>
      {history.data?.items.map(v=><option key={v.id} value={v.id}>r{v.revision} · {v.status==='reviewed'?'已审核':'草稿'} · {v.source==='mcp'?'MCP 制作':'运营制作'}</option>)}
    </select></label><button type="button" onClick={()=>void reload()} disabled={query.isFetching}>读取最新稿{dirty?'（放弃当前修改）':''}</button></div>
    {history.data&&history.data.total>history.data.pageSize&&<Pager page={page} total={history.data.total} pageSize={history.data.pageSize} onChange={value=>{if(!dirty)setPage(value);}}/>}
    <ExperienceEditor key={`${selected}:${epoch}`} productId={productId} workspace={session} row={row} historical={!!selected&&selected!==session.latest?.id}
      view={view} contentDirty={contentDirty} onDirty={setDirty} onSaved={message=>reload(message)} />
    {history.isError&&<Failure error={history.error} retry={()=>void history.refetch()}/>}
  </section>;
}
function ExperienceEditor({productId,workspace,row,historical,view,contentDirty,onDirty,onSaved}:{productId:string;workspace:ExperienceWorkspace;row:Revision|null;historical:boolean;view:'experience'|'result';contentDirty:boolean;onDirty:(v:boolean)=>void;onSaved:(v:string)=>Promise<void>}) {
  const initial:Proposal={manifest:row?.manifest??workspace.release?.manifest??workspace.defaultManifest,
    reportPlan:row?.reportPlan??workspace.reportPlan??{schemaVersion:1,title:'旧版兼容报告',narrative:'按原版本展示',presentation:'standard',sections:[{sectionId:'report',title:'观察与建议',purpose:'保留已有结果'}]},
    methods:row?.methods.map(m=>({purpose:m.purpose as 'scene_design'|'report_presentation',skillVersionId:m.version.id,planModuleId:m.productPlanInput?.planModuleId}))??[],
    productPlan:row?.methods[0]?.productPlanInput?{revisionId:row.methods[0].productPlanInput.planRevisionId,digest:row.methods[0].productPlanInput.planDigest}:undefined,
    note:row?.note??'按共同创作设定制作体验与报告'};
  const [form,setForm]=useState<Proposal>(initial),[original]=useState(JSON.stringify(initial)),[raw,setRaw]=useState(JSON.stringify(initial,null,2)),
    [check,setCheck]=useState<Awaited<ReturnType<typeof experienceApi.check>>|null>(null),[preview,setPreview]=useState<Awaited<ReturnType<typeof experienceApi.preview>>|null>(null),
    [uploading,setUploading]=useState(false),[pending,setPending]=useState(false),[questionIndex,setQuestionIndex]=useState(0),
    [answers,setAnswers]=useState<Record<string,string>>(Object.fromEntries(workspace.questions.map(q=>[q.id,q.options[0]!.id])));
  const action=useAction(),readonly=historical||['published','archived'].includes(workspace.versionStatus)||workspace.capabilities?.modules.experience==='read_only'||workspace.capabilities?.modules.experience==='planned',
    jsonPending=raw!==JSON.stringify(form,null,2),dirty=!readonly&&(JSON.stringify(form)!==original||jsonPending||pending);
  const template=experienceTemplate(form.manifest),maxResources=template?.limits.maxResources??0,
    remainingBytes=(template?.limits.maxTotalResourceBytes??0)-form.manifest.resources.reduce((sum,r)=>sum+r.byteSize,0);
  const methodForm=workspace.capabilities?.intentForm??'web';
  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
  const candidates=useQuery({queryKey:['private','admin','experience-method-candidates',methodForm],enabled:!readonly,
    queryFn:()=>Promise.all((['scene_design','report_presentation'] as const).map(purpose=>allPages(page=>bindingsApi.candidates('experience',new URLSearchParams({purpose,form:methodForm,pageSize:'50',page:String(page)}).toString())))),refetchOnWindowFocus:false});
  function update(next:Proposal){setForm(next);setRaw(JSON.stringify(next,null,2));setCheck(null);setPreview(null);}
  function proposal(){if(jsonPending)throw new Error('请先应用 JSON 修改。');return ExperienceDraftInputSchema.parse(form);}
  const q=workspace.questions[questionIndex]!;
  const anyMethodMissing=form.methods.some(m=>!m.skillVersionId);
  return <>
    {(readonly||!form.manifest.creativeProfileRevisionId)&&<p className="content-note">{historical?'正在查看历史修订。':workspace.capabilities?.status==='blocked'?'此设定超出当前已注册能力，现有体验与结果以只读方式保留。':readonly?'此版本的体验和结果已固定。请在商品内容页签派生新版本后继续制作。':'请先选择共同创作设定，保存时会固定到此内容版本。'}</p>}
    {form.manifest.intent&&<div className="experience-intent" hidden={view!=='experience'}><p><span>希望带来的感受</span>{form.manifest.intent.emotionalGoal}</p><p><span>希望获得的理解</span>{form.manifest.intent.understandingGoal}</p><p><span>共同意象</span>{form.manifest.intent.world}</p><p><span>表达方式</span>{form.manifest.intent.language}</p></div>}
    {row&&<ProductionOrigin source={{source:row.source,machineCredentialId:row.machineCredentialId??undefined,machineRequestId:row.machineRequestId??undefined}}/>}
    <fieldset disabled={readonly||action.busy||uploading}>
      <section className="content-form-section"><header className="content-form-section-heading"><h4>{view==='result'?'02 / 结果模板与叙事方案':'01 / 形式与主题'}</h4><p>{view==='result'?'结果模板需与体验模板成对兼容；与体验设计共用同一份修订草稿。':'只采用已注册、能够完成交付的模板组合。'}</p></header>
        <div className="content-fields"><label hidden={view!=='experience'}>交互模板<select aria-label="交互模板" value={`${form.manifest.renderer.key}@${form.manifest.renderer.version}`} onChange={event=>{
          const template=registeredExperiences.find(item=>`${item.key}@${item.version}`===event.target.value);
          if(template)update({...form,manifest:{...form.manifest,renderer:{key:template.key,version:template.version},report:{contentSchema:'report_content_v1',renderer:{key:template.reportKey,version:template.reportVersion}}}});
        }}>
          {registeredExperiences.map(template=><option key={template.key} value={`${template.key}@${template.version}`}>{template.label}</option>)}
          {!registeredExperiences.some(template=>template.key===form.manifest.renderer.key&&template.version===form.manifest.renderer.version)&&<option value={`${form.manifest.renderer.key}@${form.manifest.renderer.version}`}>{form.manifest.renderer.key} · 尚未注册</option>}</select></label>
          <label hidden={view!=='result'}>结果呈现模板<select aria-label="报告呈现模板" value={`${form.manifest.report.renderer.key}@${form.manifest.report.renderer.version}`} onChange={event=>{
            const template=registeredExperiences.find(item=>`${item.reportKey}@${item.reportVersion}`===event.target.value);
            if(template)update({...form,manifest:{...form.manifest,report:{contentSchema:'report_content_v1',renderer:{key:template.reportKey,version:template.reportVersion}}}});
          }}>
            {registeredExperiences.filter(template=>template.key===form.manifest.renderer.key&&template.version===form.manifest.renderer.version).map(template=><option key={template.reportKey} value={`${template.reportKey}@${template.reportVersion}`}>{template.reportLabel}</option>)}
            {!registeredExperiences.some(template=>template.key===form.manifest.renderer.key&&template.version===form.manifest.renderer.version&&template.reportKey===form.manifest.report.renderer.key&&template.reportVersion===form.manifest.report.renderer.version)&&<option value={`${form.manifest.report.renderer.key}@${form.manifest.report.renderer.version}`}>{form.manifest.report.renderer.key} · 当前组合未兼容</option>}</select></label>
          <label hidden={view!=='experience'}>主题标识<input aria-label="体验主题标识" value={form.manifest.theme.key} onChange={e=>update({...form,manifest:{...form.manifest,theme:{...form.manifest.theme,key:e.target.value}}})}/></label>
          <label hidden={view!=='experience'}>主题修订<input aria-label="体验主题修订" type="number" min={1} value={form.manifest.theme.revision} onChange={e=>update({...form,manifest:{...form.manifest,theme:{...form.manifest.theme,revision:Number(e.target.value)}}})}/></label></div>
        <p className="content-note">{view==='result'?`当前配对体验：${template?.label??'未注册'}。结果文案沿用上方的结构化报告；手记等呈现由模板决定。`:'主题标识和修订与模板一起固定。安静小屋为 2.5D 插画，静心花园为 3D 内置几何体；任意模型、音频和自定义脚本尚未启用。'}</p>
        {view==='experience'&&form.manifest.renderer.key==='reflection-garden'&&<p className="content-note"><Link to="/preview/experience/reflection-garden">查看独立的 3D 交互样例</Link> · 使用固定示例题目，不代表当前商品的预览或发布。</p>}
        <details className="content-block" hidden={view!=='result'} open={view==='result'}><summary>叙事方案 · {form.reportPlan.title}</summary><p>{form.reportPlan.narrative}</p><p>形式：{form.reportPlan.presentation==='standard'?'标准图文':form.reportPlan.presentation}</p>
          {form.reportPlan.sections.map(s=><p key={s.sectionId}><strong>{s.title}</strong> · {s.purpose}</p>)}<small>当前仍按既有图文结构展示，章节描述用于制作约束。调整报告方案时先建立新的设定修订。</small></details>
      </section>
      <section className="content-form-section" hidden={view!=='experience'}><header className="content-form-section-heading"><h4>02 / 题目与场景映射</h4><p>选择必须对应原选项，点击确认后才保存。分支、任务与自由探索尚未启用。</p></header>
        {form.manifest.scenes.map((scene,i)=><details className="content-block experience-scene" key={i} open={i===0}><summary>{String(i+1).padStart(2,'0')} · {workspace.questions.find(q=>q.id===scene.questionId)?.text??scene.questionId}</summary>
          <div className="content-fields"><label>场景标识<input aria-label={`场景 ${i+1} 标识`} value={scene.sceneId} onChange={e=>update({...form,manifest:{...form.manifest,scenes:form.manifest.scenes.map((s,j)=>j===i?{...s,sceneId:e.target.value}:s)}})}/></label>
          <label>恢复检查点<input aria-label={`场景 ${i+1} 检查点`} value={scene.checkpointId} onChange={e=>update({...form,manifest:{...form.manifest,scenes:form.manifest.scenes.map((s,j)=>j===i?{...s,checkpointId:e.target.value}:s)}})}/></label></div>
          {scene.choices.map((choice,k)=><label className="experience-choice-map" key={k}><span>{workspace.questions.find(q=>q.id===scene.questionId)?.options.find(o=>o.id===choice.optionId)?.label??choice.optionId}<code>{choice.optionId}</code></span>
            <input aria-label={`场景 ${i+1} 选项 ${k+1} 对象`} value={choice.objectId} onChange={e=>update({...form,manifest:{...form.manifest,scenes:form.manifest.scenes.map((s,j)=>j===i?{...s,choices:s.choices.map((c,n)=>n===k?{...c,objectId:e.target.value}:c)}:s)}})}/></label>)}
        </details>)}
      </section>
      <section className="content-form-section" hidden={view!=='experience'}><header className="content-form-section-heading"><h4>03 / 体验资源</h4><p>插画与纹理独立于宣传素材，最多 {maxResources} 项、合计 {(template?.limits.maxTotalResourceBytes??0)/1024/1024} MiB。</p></header>
        {form.manifest.resources.length===0&&<p className="content-note">尚无图片资源。基础单选可直接运行。</p>}
        <div className="experience-resource-grid">{form.manifest.resources.map((r,i)=><article className="content-block" key={r.fileId+':'+i}>
          {r.mimeType.startsWith('image/')&&<img className="experience-resource-image" src={`/api/admin/files/${r.fileId}/content`} alt={r.label}/>}
          <div className="content-fields"><label>资源标识<input aria-label={`体验资源 ${i+1} 标识`} value={r.resourceId} onChange={e=>update({...form,manifest:{...form.manifest,resources:form.manifest.resources.map((v,j)=>j===i?{...v,resourceId:e.target.value}:v)}})}/></label>
          <label>用途<select aria-label={`体验资源 ${i+1} 用途`} value={r.purpose} onChange={e=>update({...form,manifest:{...form.manifest,resources:form.manifest.resources.map((v,j)=>j===i?{...v,purpose:e.target.value as 'illustration'|'texture'}:v)}})}><option value="illustration">场景插画</option><option value="texture">纹理图片</option></select></label></div>
          <label>图片说明<input aria-label={`体验资源 ${i+1} 说明`} value={r.label} onChange={e=>update({...form,manifest:{...form.manifest,resources:form.manifest.resources.map((v,j)=>j===i?{...v,label:e.target.value}:v)}})}/></label>
          <small>{(r.byteSize/1024).toFixed(1)} KiB · {r.mimeType}</small><details><summary>文件摘要</summary><code>{r.checksum}</code></details>
          <button type="button" onClick={()=>update({...form,manifest:{...form.manifest,resources:form.manifest.resources.filter((_,j)=>j!==i)}})}>移除此资源</button></article>)}</div>
        {form.manifest.resources.length<maxResources&&remainingBytes>0&&!readonly&&<ExperiencePictureUpload versionId={workspace.productVersionId} maxBytes={Math.min(template?.limits.maxResourceBytes??0,remainingBytes)} onBusy={setUploading} onPending={setPending} onUploaded={file=>update({...form,manifest:{...form.manifest,resources:[...form.manifest.resources,
          {resourceId:'picture-'+crypto.randomUUID().slice(0,8),fileId:file.id,purpose:'illustration',label:file.fileName,checksum:file.checksum,byteSize:file.byteSize,mimeType:file.mimeType as 'image/jpeg'}]}})}/>}
      </section>
      <section className="content-form-section"><header className="content-form-section-heading"><h4>04 / 制作方法与说明</h4><p>方法版本与当前体验修订一起保留。</p></header>
        <label className="content-checkbox"><input type="checkbox" checked={form.methods.length===0} onChange={e=>update({...form,methods:e.target.checked?[]:[{purpose:'scene_design',skillVersionId:''},{purpose:'report_presentation',skillVersionId:''}]})}/>人工制作（不绑定方法）</label>
        {!!form.methods.length && <SkillPlanInput productId={productId} profileId={form.manifest.creativeProfileRevisionId ?? ''} form={methodForm}
          purposes={form.methods.map(method=>method.purpose)} value={{reference:form.productPlan,modules:Object.fromEntries(form.methods.map(method=>[method.purpose,method.planModuleId??'']))}}
          disabled={readonly||action.busy||jsonPending} onChange={choice=>update({...form,productPlan:choice.reference,
            methods:form.methods.map(method=>({...method,planModuleId:choice.modules[method.purpose]}))})} />}
        {form.methods.map((m,i)=>{const options=candidates.data?.[m.purpose==='scene_design'?0:1]??[],fixed=row?.methods.find(v=>v.purpose===m.purpose)?.version;return <label key={m.purpose}>{methodNames[m.purpose]}<select aria-label={methodNames[m.purpose]+'方法'} value={m.skillVersionId} onChange={e=>update({...form,methods:form.methods.map((v,j)=>j===i?{...v,skillVersionId:e.target.value}:v)})}>
          <option value="">选择已启用版本</option>{fixed&&!options.some(v=>v.id===fixed.id)&&<option value={fixed.id}>{fixed.manifest.name} · v{fixed.number}（固定历史）</option>}
          {options.map(v=><option key={v.id} value={v.id}>{v.manifest.name} · v{v.number}</option>)}</select></label>;})}
        {!readonly&&<Link to="/admin/skills/experience">管理体验制作 Skill</Link>}
        <label>制作说明<textarea aria-label="体验制作说明" value={form.note} maxLength={2000} onChange={e=>update({...form,note:e.target.value})}/></label>
      </section>
      <details className="content-block"><summary>结构化清单 · JSON</summary><textarea aria-label="体验清单 JSON" className="content-json" rows={14} value={raw} onChange={e=>setRaw(e.target.value)}/>
        <button type="button" onClick={()=>void action.run(async()=>ExperienceDraftInputSchema.parse(JSON.parse(raw)),value=>update(value))}>应用 JSON 修改</button></details>
    </fieldset>
    <div className="biz-row experience-actions"><button type="button" disabled={action.busy||uploading||pending||anyMethodMissing||!form.manifest.creativeProfileRevisionId} onClick={()=>void action.run(()=>experienceApi.check(productId,workspace.productVersionId,proposal()),setCheck)}>检查兼容性</button>
      <button type="button" disabled={readonly||action.busy||uploading||pending||anyMethodMissing||jsonPending||!form.manifest.creativeProfileRevisionId} onClick={()=>void action.run(()=>experienceApi.save(productId,workspace.productVersionId,action.intent('experience-save',{
        ...proposal(),expectedRevision:workspace.latest?.revision??0,expectedVersionRevision:workspace.versionRevision})),saved=>onSaved(`体验与结果草稿 r${saved.revision} 已保存。`))}>保存体验与结果草稿</button>
      <button type="button" disabled={readonly||dirty||contentDirty||action.busy||!row||row.status!=='draft'} onClick={()=>void action.run(()=>experienceApi.review(row!.id,action.intent('experience-review',{expectedRevision:row!.revision})),saved=>onSaved(`体验 r${saved.revision} 已审核，可随题库版本发布。`))}>审核体验</button></div>
    {check&&<div className="content-note" role="status">{check.valid?'兼容性检查通过。':<><strong>仍有待修正项</strong><ul>{check.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></>}</div>}
    {Boolean(action.error)&&<Failure error={action.error}/>}
    <section className="content-form-section experience-preview" hidden={view!=='result'} aria-label="体验与报告演示预览"><header className="content-form-section-heading"><h4>03 / 演示结果预览</h4><p>选择只用于样例计算，不会创建用户答卷或消耗报告次数。</p></header>
      {dirty&&<p className="content-note">先保存当前草稿，再预览这一修订。</p>}
      {q&&<div className="content-block"><p>第 {questionIndex+1}/{workspace.questions.length} 题</p><h4>{q.text}</h4>
        {q.options.map(o=><label className="biz-option" key={o.id}><input type="radio" name="experience-preview-answer" checked={answers[q.id]===o.id} onChange={()=>{setAnswers(v=>({...v,[q.id]:o.id}));setPreview(null);}}/>{o.label}</label>)}
        <div className="biz-row"><button type="button" disabled={questionIndex===0} onClick={()=>setQuestionIndex(i=>i-1)}>预览上一题</button><button type="button" disabled={questionIndex===workspace.questions.length-1} onClick={()=>setQuestionIndex(i=>i+1)}>预览下一题</button></div></div>}
      <button type="button" disabled={!row||dirty||contentDirty||action.busy} onClick={()=>void action.run(()=>experienceApi.preview(row!.id,{answers:workspace.questions.map(q=>({questionId:q.id,optionId:answers[q.id]}))}),setPreview)}>生成演示预览</button>
      {preview&&!contentDirty&&<div className="experience-preview-result" data-preview-revision={preview.revisionId}><span className="content-badge">演示报告 · {preview.manifest.theme.key} / r{preview.manifest.theme.revision}</span>
        <ReportHost content={preview.report} presentation={preview.presentation}/></div>}
    </section>
  </>;
}
function ExperiencePictureUpload({versionId,maxBytes,onUploaded,onBusy,onPending}:{versionId:string;maxBytes:number;onUploaded:(v:Upload)=>void;onBusy:(v:boolean)=>void;onPending:(v:boolean)=>void}) {
  const [file,setFile]=useState<File|null>(null),[ticket,setTicket]=useState<Upload|null>(null),[epoch,setEpoch]=useState(0),[reset,setReset]=useState(0),action=useAction();
  return <div className="experience-upload"><label>添加体验图片<input key={reset} aria-label="体验图片文件" type="file" accept="image/png,image/jpeg,image/webp" disabled={action.busy}
    onChange={e=>{const value=e.target.files?.[0]??null;setFile(value);setTicket(null);setEpoch(n=>n+1);onPending(!!value);}}/></label>
    <div className="biz-row"><button type="button" disabled={!file||action.busy} onClick={()=>void action.run(async()=>{
      onBusy(true);try{
        if(!file||file.size<1||file.size>maxBytes)throw new Error(`请选择不超过 ${maxBytes/(1024*1024)} MiB 的 PNG/JPEG/WebP 图片。`);
        let current=ticket?await adminApi.status(ticket.id):await adminApi.prepare(action.intent('experience-picture:'+epoch,{productVersionId:versionId,kind:'experience',fileName:file.name,mimeType:file.type,byteSize:file.size,checksum:await fileDigest(file)}));
        setTicket(current);if(current.status==='pending'){current=await adminApi.upload(current.id,file);setTicket(current);}
        if(current.status==='uploaded')current=await adminApi.complete(current.id,action.intent('experience-complete:'+current.id,{}));
        if(current.status!=='available')throw new Error('上传尚未完成，请等待后重试或重新选择文件。');return current;
      }finally{onBusy(false);}
    },value=>{onUploaded(value);setFile(null);setTicket(null);setEpoch(n=>n+1);setReset(n=>n+1);onPending(false);})}>上传并校验体验图片</button>
    {file&&<button type="button" disabled={action.busy} onClick={()=>{setFile(null);setTicket(null);setEpoch(n=>n+1);setReset(n=>n+1);onPending(false);}}>取消待上传图片</button>}</div>
    <small>每份最多 {maxBytes/(1024*1024)} MiB；保存后资源会随体验修订固定。</small>{Boolean(action.error)&&<Failure error={action.error}/>}</div>;
}
