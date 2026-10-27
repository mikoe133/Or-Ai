'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const sampleModules=[
 {key:'assessment',name:'题目与报告',domain:'ASSESSMENT',saved:'题目 / 报告 · 原件已留存',label:'已审核留存',kind:'good',note:'第 1 次尝试 · 保留固定结果',next:'查看成果'},
 {key:'copy',name:'引流文案',domain:'COPY',saved:'文案原稿 · 已保存',label:'需要复查',kind:'warn',note:'关联题目已有新修订',next:'复查依据'},
 {key:'cover',name:'封面图片',domain:'COVER',saved:'封面原图 · 已保存',label:'已校验保存',kind:'good',note:'尚待人工审核',next:'查看成果'},
 {key:'video',name:'宣传视频',domain:'VIDEO',saved:'尚未收到已校验的视频原件',label:'认领已到期',kind:'warn',note:'原外部作业结果待核对',next:'核对原作业'},
 {key:'experience',name:'互动体验',domain:'EXPERIENCE',saved:'可选模块 · 尚无制作记录',label:'尚未开始',kind:'',note:'缺少场景设计方法',next:'补齐输入'}
];
const state={scenario:'normal',selected:'video',tab:'basis',history:'latest',cancelled:false,cancelRequests:0,cancelRequestId:null,cancelUnknown:false,cancelConflict:false,
 stopReason:'',recovery:{connection:'',consent:false,preview:false,dirty:false,conflict:false},clipboardSamples:[],exportSamples:[],refreshes:0,savedRecordIds:['sample-record-assessment','sample-record-copy','sample-record-cover']};
let returnFocus=null,toastTimer;
const recovery=$('#recovery-dialog'),cancel=$('#cancel-dialog'),leave=$('#leave-dialog');
function notice(text){$('#run-notice').textContent=text;$('#run-notice').classList.toggle('hidden',!text);}
function toast(text){$('#toast').textContent=text;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3200);}
function clearToast(){clearTimeout(toastTimer);$('#toast').classList.add('hidden');}
function focusBack(){requestAnimationFrame(()=>{const target=document.querySelector(returnFocus);(target&&!target.disabled?target:$('#refresh')).focus();});}
function runBlocked(){return state.cancelled||['expired','limit','foreign'].includes(state.scenario);}
function video(){
 const row={...sampleModules[3]};
 if(state.scenario==='active')Object.assign(row,{label:'有效认领中',note:'另一客户端正在接续',next:'只核对状态'});
 if(state.scenario==='terminal')Object.assign(row,{label:'制作失败',kind:'bad',note:'制作端已申报原作业终态',next:'整理接续'});
 if(state.scenario==='changed')Object.assign(row,{label:'需要复查',note:'输入已更新 · 原作业待核对',next:'先查原作业'});
 return row;
}
function rows(){return sampleModules.map(m=>m.key==='video'?video():{...m});}
function jobBox(){return `<div class="job-box"><small>原外部作业 · ${state.scenario==='terminal'?'制作端已报告失败终态':'结果尚未确认'}</small><code>sample-render / sample-job-video-024</code><p>平台未向该外部服务查询状态，也没有重新创建作业。</p></div>`;}
function render(){
 const empty=$('#run-select').value==='empty';$('#production-layout').classList.toggle('hidden',empty);$('#summary').classList.toggle('hidden',empty);$('#empty').classList.toggle('hidden',!empty);
 $('#stop-run').disabled=empty||runBlocked();$('#stop-run').textContent=state.cancelled?'本批已停止接续':state.scenario==='foreign'?'其他管理员工作区 · 只读':'停止本批接续';
 let message=state.cancelled?'本批已停止平台接续。3 组已保存成果与历史回执保留；外部作业仍需另行核对。':state.scenario==='expired'?'本批制作期限已到，不能恢复认领或提交新回执。已有成果保留，请交人工处理。':state.scenario==='limit'?'本批尝试次数已达上限，不再准备新的认领。已有成果保留，不自动增加额度。':state.scenario==='foreign'?'当前为其他管理员工作区，只读查看；不能使用其连接或停止本批接续。':'';
 notice(empty?'':message);
 $('#summary').innerHTML='<div><strong>3</strong><span>组已保存成果</span><small>含 1 组仍需复查的旧稿</small></div><div><strong>2</strong><span>项需要处理</span><small>输入变化 / 外部作业待核对</small></div><div><strong>1</strong><span>项尚未开始</span><small>可选模块 · 等待方法补齐</small></div><div><strong>1</strong><span>份原作业回执</span><small>终态由制作端另行核实</small></div>';
 const q=$('#search').value.trim(),visible=rows().filter(m=>(m.name+m.label+m.note).includes(q));
 $('#modules').innerHTML=visible.length?visible.map(m=>`<button class="module-row ${state.selected===m.key?'selected':''}" data-module="${m.key}" aria-label="查看${m.name}" aria-pressed="${state.selected===m.key}"><span><strong>${m.name}</strong><small>${m.saved}</small></span><span class="status"><span class="tag ${m.kind}">${m.label}</span><small>${m.note}</small></span><span class="next">${m.next} →</span></button>`).join(''):'<p class="list-footnote" role="status">没有匹配模块。已保存成果未改变。</p>';
 $$('[data-module]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.module;state.tab='basis';state.history='latest';render();if(matchMedia('(max-width:960px)').matches)$('#detail').scrollIntoView({block:'start',behavior:'auto'});});
 renderDetail();
}
function renderDetail(){
 const m=rows().find(m=>m.key===state.selected),isVideo=m.key==='video';
 let content='';
 if(state.tab==='history'){
  content=`<div class="history-switch"><label for="attempt-history">尝试历史</label><select id="attempt-history"><option value="latest" ${state.history==='latest'?'selected':''}>第 2 次 · 当前尝试</option><option value="old" ${state.history==='old'?'selected':''}>第 1 次 · 历史只读</option></select></div>${state.history==='old'?'<p class="callout">历史尝试只读。接续必须回到当前尝试重新核对，不能恢复旧代次。</p>':''}<ol class="timeline"><li><strong>认领与输入已固定</strong><small>00:12 · 第 ${state.history==='old'?1:2} 次尝试</small><p>固定方法 v2、题目片段与文案记录，不使用最新版自动替换。</p></li><li><strong>制作端申报：上传中</strong><small>00:24 · 最后一次回执</small><p>已记录原外部 jobId；没有已校验视频原件，不能记为成功。</p></li><li><strong>${state.scenario==='active'?'当前认领仍有效':'认领期限已到'}</strong><small>00:29 · 服务端时间核对</small><p>${state.scenario==='active'?'由原客户端继续处理，其他客户端不得抢占。':'上传中为旧申报；当前能否接续须重新核查。'}</p></li></ol>`;
  if(!isVideo)content=`<ol class="timeline"><li><strong>固定方法与输入</strong><small>计划 r3 · 历史依据保留</small><p>精确商品方法与原输入记录均可回读。</p></li><li><strong>${m.key==='experience'?'尚未创建尝试':'已有成果保存记录'}</strong><small>${m.label}</small><p>${m.saved}</p></li></ol>`;
 }else if(state.tab==='outputs'){
  content=isVideo?'<p class="callout warn">本次尝试尚无已校验视频原件。</p><div class="original"><h3>输入原件与已完成成果</h3><p>固定题目、文案及封面输入仍保留；分镜与上传申报不代表视频文件已经交付。</p></div>':`<div class="original"><h3>${m.name} · 固定成果</h3><p>${m.saved}</p><p>按原方法、原内容修订与记录摘要保留，接续不会覆盖此份记录。</p></div><p class="callout ${m.key==='copy'?'warn':'good'}">${m.key==='copy'?'原稿仍可回读，但关联题目已变更；复查前不当作当前可采用成果。':'已保存状态保持。无需重新发起制作。'}</p>`;
 }else if(isVideo){
  content=`<p class="callout ${state.scenario==='terminal'?'':'warn'}">${state.scenario==='active'?'另一客户端仍持有有效认领。本页只整理核对依据，不准备新的认领。':state.scenario==='terminal'?'制作端已申报原作业失败。先复核固定输入，再由外部客户端明确申请新一次尝试。':state.scenario==='changed'?'输入出现新修订，原外部作业仍使用旧输入。先核对原作业，不能把新输入接到旧 jobId。':'最后回执是“上传中”，但认领已经到期。先核对原作业，避免重复发起制作。'}</p><dl class="fact-list"><dt>最近尝试</dt><dd>第 2 次 · 原客户端 video-local</dd><dt>最后外部申报</dt><dd>${state.scenario==='terminal'?'失败 · 00:31':'上传中 · 00:24'}</dd><dt>当前认领</dt><dd>${state.scenario==='active'?'有效至 00:49 · 其他客户端占用':'已于 00:29 到期'}</dd><dt>固定依据</dt><dd>视频方法 v2 · 计划 r3 / 设定 r2</dd><dt>费用</dt><dd>未知 · 来自制作端申报</dd></dl><h3>先处理这一项</h3>${jobBox()}<p class="muted">已保存的题目、文案和封面继续保留。本页不会自动调用生成工具，也不把历史回执当作当前作业状态。</p>`;
 }else{
  content=`<p class="callout ${m.kind==='good'?'good':'warn'}">${m.key==='copy'?'固定旧稿保留。关联题目已出现新修订，需先比较原输入和新版本，再决定是否另做。':m.key==='experience'?'此可选模块尚无尝试。先在商品方法中补齐场景设计，不把尚未开始显示成制作失败。':'固定成果已保存，历史方法和原件继续保留，无需重复制作。'}</p><dl class="fact-list"><dt>固定计划</dt><dd>计划 r3 · 共同设定 r2</dd><dt>当前情况</dt><dd>${m.label}</dd><dt>已有成果</dt><dd>${m.saved}</dd><dt>下一步</dt><dd>${m.next}</dd></dl>`;
 }
 const historical=state.history==='old';
 const button=isVideo?`<button id="open-recovery" class="primary" ${runBlocked()||historical?'disabled':''}>${historical?'历史只读 · 回到当前尝试':'terminal'===state.scenario?'整理显式接续说明':'整理原作业核对说明'}</button><p class="muted">${runBlocked()?'本批不允许继续接续；先保全现有记录并交人工处理。':'说明只固定依据，不认领尝试、不创建外部作业。'}</p>`:'';
 $('#detail').innerHTML=`<div class="detail-heading"><div><p class="eyebrow">${m.domain} / MODULE</p><h2>${m.name}</h2><small>固定计划 r3 · ${state.history==='old'?'历史尝试':'当前回执'}</small></div><span class="tag ${m.kind}">${m.label}</span></div><nav class="detail-tabs" aria-label="模块详情"><button data-tab="basis" class="${state.tab==='basis'?'active':''}" aria-current="${state.tab==='basis'?'page':'false'}">处理依据</button><button data-tab="history" class="${state.tab==='history'?'active':''}">尝试历史</button><button data-tab="outputs" class="${state.tab==='outputs'?'active':''}">已保存成果</button></nav><div class="detail-body">${content}${button}</div>`;
 $$('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;if(state.tab!=='history')state.history='latest';renderDetail();});
 if($('#attempt-history'))$('#attempt-history').onchange=e=>{state.history=e.target.value;renderDetail();};
 if($('#open-recovery'))$('#open-recovery').onclick=openRecovery;
}
function openRecovery(){
 clearToast();returnFocus='#open-recovery';state.recovery={connection:'',consent:false,preview:false,dirty:false,conflict:false};renderRecovery();recovery.showModal();
}
function manifest(){return {kind:'design_sample_recovery_handoff',run:'sample-run-02',plan:'sample-plan-r3',module:'sample-video-module',attempt:'sample-attempt-video-02',
 methods:[{snapshotId:'sample-video-method-v2',digest:'a'.repeat(64)}],inputs:[{recordId:'sample-assessment-record-r3',digest:'b'.repeat(64)},{recordId:'sample-copy-record-r2',digest:'c'.repeat(64)},{recordId:'sample-cover-record-r1',digest:'d'.repeat(64)}],
 action:state.scenario==='terminal'?'explicit_retry_by_external_client':'inspect_original_job_first',retryOfAttemptId:state.scenario==='terminal'?'sample-attempt-video-02':null,
 originalJob:{provider:'sample-render',jobId:'sample-job-video-024',terminalReported:state.scenario==='terminal'},leaseTokenIncluded:false,credentialIncluded:false,executionStarted:false};}
function renderRecovery(){
 const r=state.recovery,terminal=state.scenario==='terminal';$('#recovery-title').textContent=terminal?'整理显式接续说明':'先核对原外部作业';
 if(r.preview){
  $('#recovery-body').innerHTML=`<div class="handoff-success"><b>✓</b><div><h3>${terminal?'接续依据已整理':'原作业核对依据已整理'}</h3><p>没有认领尝试、发送请求或启动制作。</p></div></div><div class="fixed-list"><div><span>商品 / 批次</span><strong>把话说开之前 / 第 2 批</strong></div><div><span>固定方法与输入</span><strong>视频方法 v2 · 3 份原输入记录</strong></div><div><span>现有连接</span><strong>内容工作区 A · 视频</strong></div></div><ol class="handoff-steps"><li><b>01</b><span>外部客户端重新读取原批次与当前尝试，核对方法、输入和权限。</span></li><li><b>02</b><span>${terminal?'明确携带原尝试标识申请重试，再按服务端 nextAction 处理。':'向原外部服务核对 sample-job-video-024，先查结果，不重复创建作业。'}</span></li><li><b>03</b><span>保存或上传响应不明时，复用原客户端的 requestId 核对结果；本页无法找回未保存的原请求标识。</span></li></ol><p class="callout">说明不含凭据或认领 token。${terminal?'重试由外部客户端明确发起，仍受原次数、并发和期限限制。':'结果未知先继续核对，不能据此直接重新生成。'}二进制原件仍需按授权另取。</p><details><summary>查看固定引用与交接字段</summary><pre>${JSON.stringify(manifest(),null,2)}</pre></details><p id="recovery-error" class="error hidden" role="alert"></p>`;
  $('#recovery-actions').innerHTML='<button id="recovery-back">返回核对依据</button><button id="export-handoff">导出固定清单</button><button id="copy-handoff" class="primary">复制核对说明</button>';
  $('#recovery-back').onclick=()=>{r.preview=false;r.consent=false;renderRecovery();};
  $('#copy-handoff').onclick=()=>exportHandoff('copy');$('#export-handoff').onclick=()=>exportHandoff('export');return;
 }
 $('#recovery-body').innerHTML=`<div class="steps"><span class="active">01 核对固定依据</span><span>02 整理交接说明</span></div><p class="dialog-lead">宣传视频 <span class="tag ${terminal?'bad':'warn'}">${terminal?'制作端申报失败':'原作业待核对'}</span></p><div class="fixed-list"><div><span>商品 / 批次</span><strong>把话说开之前 / 第 2 批</strong></div><div><span>计划与设定</span><strong>计划 r3 · 共同设定 r2</strong></div><div><span>方法</span><strong>视频制作 v2 · 精确商品快照</strong></div><div><span>输入</span><strong>原题目 / 原文案 / 原封面记录</strong></div><div><span>原尝试</span><strong>第 2 次 · 不使用旧代次</strong></div></div>${jobBox()}<p class="callout ${state.scenario==='changed'?'warn':''}">${state.scenario==='changed'?'新输入不能接入旧作业。本次只能整理原作业查询依据；继续制作前须重新复查。':state.scenario==='active'?'当前认领仍由其他客户端持有。本次仅整理查询依据，不准备新的认领。':terminal?'本页仅整理显式重试的固定依据，真正的认领仍由外部客户端发起。':'先核对原作业结果。没有确认终态前，不创建替代作业。'}</p><label class="field" for="recovery-connection">用哪份已有连接核对<select id="recovery-connection"><option value="">选择现有视频连接</option><option value="original">内容工作区 A · 视频（原连接）</option><option value="foreign">其他工作区 · 视频（不属于本批）</option><option value="revoked">已撤销的视频连接</option></select></label><p id="recovery-error" class="error ${r.conflict?'':'hidden'}" role="alert">${r.conflict?'回执或权限依据已变化，请重新核对后再整理说明。':''}</p>`;
 $('#recovery-actions').innerHTML=`<label class="consent"><input id="recovery-consent" type="checkbox">${terminal?'我已核对固定依据，理解网页不会自动认领或开始制作。':'我理解应先核对原作业，不会据此重复发起制作。'}</label><button id="recovery-cancel">返回模块</button><button class="primary" id="recovery-preview" disabled>核对并整理说明</button>`;
 $('#recovery-connection').value=r.connection;$('#recovery-consent').checked=r.consent;
 function changed(){r.connection=$('#recovery-connection').value;r.consent=$('#recovery-consent').checked;r.dirty=true;$('#recovery-preview').disabled=!r.connection||!r.consent;}
 $('#recovery-connection').onchange=changed;$('#recovery-consent').onchange=changed;$('#recovery-preview').disabled=!r.connection||!r.consent;
 $('#recovery-cancel').onclick=closeRecovery;$('#recovery-preview').onclick=()=>{
  const e=$('#recovery-error');e.classList.add('hidden');
  if(r.connection!=='original'){e.textContent=r.connection==='revoked'?'这份连接已撤销，请选择有效连接重新核对。':'所选连接不属于本批工作区，不能读取或接续此批次。';e.classList.remove('hidden');return;}
  if(runBlocked()){e.textContent='本批已经失效或停止，不能准备继续接续。';e.classList.remove('hidden');return;}
  r.preview=true;r.conflict=false;renderRecovery();
 };
}
function exportHandoff(kind){
 const r=state.recovery;
 if(state.scenario==='export-conflict'){r.preview=false;r.consent=false;r.conflict=true;renderRecovery();return;}
 if(runBlocked()||r.connection!=='original'){r.preview=false;r.consent=false;r.conflict=true;renderRecovery();return;}
 (kind==='copy'?state.clipboardSamples:state.exportSamples).push(manifest());
 toast(kind==='copy'?'设计样例：说明已记录在内存，未写入系统剪贴板。':'设计样例：固定清单已记录在内存，未创建下载或运行。');
}
function closeRecovery(){if(state.recovery.dirty){leave.showModal();return;}recovery.close();focusBack();}
$('#recovery-close').onclick=closeRecovery;recovery.oncancel=e=>{e.preventDefault();closeRecovery();};
$('#leave-keep').onclick=()=>{leave.close();requestAnimationFrame(()=>$('#recovery-close').focus());};
$('#leave-discard').onclick=()=>{leave.close();recovery.close();state.recovery.dirty=false;focusBack();};
leave.oncancel=e=>{e.preventDefault();$('#leave-keep').click();};
function updateCancel(){state.stopReason=$('#cancel-reason').value;$('#cancel-confirm').disabled=!state.stopReason.trim()||!$('#cancel-consent').checked;}
function openCancel(){clearToast();returnFocus='#stop-run';state.cancelUnknown=false;state.cancelConflict=false;$('#cancel-reason').disabled=false;$('#cancel-reason').value='';$('#cancel-consent').checked=false;$('#cancel-consent').disabled=false;$('#cancel-error').classList.add('hidden');$('#cancel-confirm').classList.remove('hidden');$('#cancel-confirm').disabled=true;$('#cancel-recheck').classList.add('hidden');cancel.showModal();}
$('#stop-run').onclick=openCancel;$('#cancel-reason').oninput=updateCancel;$('#cancel-consent').onchange=updateCancel;
function closeCancel(){if(state.cancelUnknown){toast('停止结果尚未确认，请先用原请求核对。');return;}cancel.close();focusBack();}
$('#cancel-close').onclick=closeCancel;$('#cancel-back').onclick=closeCancel;cancel.oncancel=e=>{e.preventDefault();closeCancel();};
$('#cancel-confirm').onclick=()=>{
 if(state.scenario==='cancel-conflict'&&!state.cancelConflict){state.cancelConflict=true;$('#cancel-error').textContent='回执已出现新修订，请重新核对影响后再次确认。停止原因已保留。';$('#cancel-error').classList.remove('hidden');$('#cancel-consent').checked=false;$('#cancel-confirm').disabled=true;return;}
 state.cancelRequestId??='sample-cancel-request-01';state.cancelRequests++;
 if(state.scenario==='save-failure'){$('#cancel-error').textContent='设计样例：停止未成功，原因和确认依据保留。可核对后用原请求重试。';$('#cancel-error').classList.remove('hidden');return;}
 if(state.scenario==='unknown'){state.cancelUnknown=true;state.cancelled=true;$('#cancel-error').textContent='未收到完整响应，停止结果待确认。请用原请求核对，不要重复停止。';$('#cancel-error').classList.remove('hidden');$('#cancel-reason').disabled=true;$('#cancel-consent').disabled=true;$('#cancel-confirm').classList.add('hidden');$('#cancel-recheck').classList.remove('hidden');return;}
 state.cancelled=true;cancel.close();render();toast('设计样例：本批已停止平台接续，已有成果保留。');focusBack();
};
$('#cancel-recheck').onclick=()=>{state.cancelUnknown=false;state.cancelled=true;cancel.close();render();toast('设计样例：原请求已核对，本批已停止，未再次提交停止。');focusBack();};
$('#search').oninput=render;$('#run-select').onchange=render;
$('#refresh').onclick=()=>{state.refreshes++;$('#observed').textContent='设计样例 · 已重新核对 '+state.refreshes+' 次';render();};
$('#scenario').onchange=()=>{clearToast();state.scenario=$('#scenario').value;state.cancelled=state.scenario==='cancelled';state.selected='video';state.tab='basis';state.history='latest';state.cancelRequestId=null;state.cancelRequests=0;state.stopReason='';$('#run-select').value='current';$('#search').value='';render();};
function closeNav(){if(!$('#sidebar').classList.contains('open'))return;$('#sidebar').classList.remove('open');$('.workspace').inert=false;$('#nav-toggle').focus();}
$('#nav-toggle').onclick=()=>{$('#sidebar').classList.add('open');$('.workspace').inert=true;$('#nav-close').focus();};$('#nav-close').onclick=closeNav;
document.addEventListener('keydown',e=>{if(!$('#sidebar').classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();closeNav();}if(e.key==='Tab'){const a=$$('#sidebar a,#sidebar button'),first=a[0],last=a.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
matchMedia('(max-width:760px)').addEventListener('change',e=>{if(!e.matches)closeNav();});
window.__o3={state,manifest};render();
