(() => {
  'use strict';
  const data = window.projectFixture, $ = selector => document.querySelector(selector);
  const graph = window.g1Canvas, projectModules = () => graph.store.getSnapshot().modules;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const short = value => value ? value.slice(0,8) : '—';
  const purposes = { assessment_design:'题目设计', report_writing:'报告写作', cover_design:'图片设计', copywriting:'引流文案',
    scene_design:'场景设计', report_presentation:'报告呈现', video_production:'视频制作' };
  const query = new URLSearchParams(location.search), mobile = matchMedia('(max-width:820px)').matches;
  let scene = query.get('scene') || 'work', view = query.get('view') || (mobile ? 'directory' : 'canvas'), detailTab = 'body';
  let selected = 'method:' + data.methods.find(method => method.purpose === 'copywriting').id;
  if (scene === 'failures' || scene === 'upload') selected = 'module:experience';
  if (['review','returned','retained','published'].includes(scene)) selected = 'review';
  let activeModule = 'copy', lastFocus, timer;
  const moduleByKey = key => projectModules().find(module => module.moduleKey === key);
  const methodsFor = module => data.methods.filter(method => method.planModuleId === module.id);
  const recordFor = module => data.productions.find(record => record.planModuleId === module.id);
  const outputsFor = module => recordFor(module)?.outputs || [];
  function state(module) {
    if(module.proposed)return {text:'演示节点 · 待完善',kind:'warn'};
    if (['review','retained','published'].includes(scene)) return module.moduleKey==='video'?{text:'已跳过 · 可选',kind:'neutral'}:{text:scene === 'review' ? '待审核' : '已留存',kind:'ok'};
    if (scene === 'returned' && module.moduleKey === 'copy') return {text:'退回修改',kind:'error'};
    if (scene === 'failures') {
      if (module.moduleKey === 'images') return {text:'上传失败',kind:'error'};
      if (module.moduleKey === 'experience') return {text:'校验失败',kind:'error'};
      if (module.moduleKey === 'copy') return {text:'外部制作中',kind:'neutral'};
    }
    if (scene === 'upload' && module.moduleKey === 'images') return {text:'上传中 · 74%',kind:'warn'};
    if (scene === 'upload' && module.moduleKey === 'experience') return {text:'校验中',kind:'warn'};
    if (module.moduleKey === 'video') return {text:'等待输入',kind:'neutral'};
    const saved = data.inspection.modules.find(row => row.moduleKey === module.moduleKey);
    return saved?.originals === 'recorded_not_revalidated' ? {text:'草稿已保存',kind:'ok'} : {text:'缺少原包',kind:'warn'};
  }
  const field = (label,value,mono=false) => `<div class="field"><span>${escape(label)}</span><strong${mono?' class="mono"':''}>${escape(value)}</strong></div>`;
  const section = (label,content,meta='') => `<section class="inspector-section"><p class="section-label">${escape(label)}<span>${escape(meta)}</span></p>${content}</section>`;
  const note = content => `<p class="inspector-note">${escape(content)}</p>`;
  function toast(message) { clearTimeout(timer); $('#toast').textContent = message; $('#toast').hidden = false; timer = setTimeout(() => $('#toast').hidden = true,4200); }
  function moduleFromSelection() {
    if (selected.startsWith('method:')) { const method=data.methods.find(method=>method.id===selected.slice(7));return method && projectModules().find(module=>module.id===method.planModuleId); }
    if (selected.startsWith('output:')) return projectModules().find(module=>outputsFor(module).some(output=>output.id===selected.slice(7)));
    return moduleByKey(selected.slice(7)) || moduleByKey(activeModule);
  }
  function choose(key,open=true) {
    const inspectorWasClosed=$('.body').classList.contains('inspector-closed');
    lastFocus = document.activeElement; selected = key; detailTab='body';
    $('.body').classList.remove('inspector-closed');
    const module=moduleFromSelection();if(module)activeModule=module.moduleKey;
    graph.select(key);
    if(module&&(key.startsWith('method:')||key.startsWith('output:')))graph.store.expand(module.id);
    renderTree();renderContent();renderInspector();
    if(inspectorWasClosed&&view==='canvas'&&!mobile)graph.reveal(key);
    if (open && matchMedia('(max-width:820px)').matches) { $('#inspector').classList.add('open'); $('#inspector-content [data-close]').focus(); }
    $('#project-tree')?.classList.remove('open');document.querySelector('.project-tree').classList.remove('open');
  }
  function renderTree() {
    $('#module-tree').innerHTML = scene==='empty' ? '<p class="muted" style="padding:9px 11px;font-size:10px">还没有交付模块</p>' : projectModules().map(module=>{
      const status=state(module);return `<button class="tree-module ${activeModule===module.moduleKey?'selected':''}" data-module="${module.moduleKey}" aria-current="${activeModule===module.moduleKey?'true':'false'}"><span><em></em>${escape(module.definition.title)}</span><span class="mini-state ${status.kind==='warn'||status.kind==='error'?'warn':''}">${module.definition.required?'':'可选'}</span></button>`;
    }).join('');
  }
  function outputTitle(module,output) { return module.definition.outputs.find(slot=>slot.outputKey===output.outputKey)?.label || output.outputKey; }
  function directoryRow(module) {
    const status=state(module),open=activeModule===module.moduleKey;
    return `<button class="directory-row ${open?'selected':''}" data-expand="${module.moduleKey}" aria-expanded="${open}"><span><strong>${escape(module.definition.title)}</strong><small>${module.definition.required?'必需交付':'可选交付'} · ${module.definition.target.form}</small></span><span>${methodsFor(module).length} 个方法</span><span>${outputsFor(module).length} 项记录</span><span class="directory-state ${status.kind!=='ok'?'warn':''}">${status.text}</span><span>${open?'⌄':'›'}</span></button>${open?`<div class="directory-children">${methodsFor(module).map(method=>`<button data-select="method:${method.id}"><span>⌘　${purposes[method.purpose]}</span><small>库 v${method.version.number} → 项目快照　›</small></button>`).join('')}${outputsFor(module).map(output=>`<button data-select="output:${output.id}"><span>▤　${outputTitle(module,output)}</span><small>${output.purpose==='authoring'?'制作清单':output.file?'平台原件':'结构化原件'}　›</small></button>`).join('')}<button data-select="module:${module.moduleKey}"><span>查看模块与依赖</span><small>详情　›</small></button></div>`:''}`;
  }
  function renderContent() {
    const target=$('#workspace-content'),canvasActive=view==='canvas'&&scene!=='empty';
    $('#content-scroll').classList.toggle('canvas-mode',canvasActive);
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
    if(!canvasActive)graph.unmount();
    if(scene==='empty') {target.innerHTML=`<div class="empty"><div class="empty-symbol">▱</div><h2>从一份计划开始</h2><p>先说清楚这款商品希望带来什么感受与理解，再确定题目、图片、文案、体验和视频需要交付的内容。</p><button class="primary" data-preview-action="建立创作设定">建立创作设定</button><div class="steps">01　固定共同创作设定<br>02　保存选题依据与制作计划<br>03　将方法和产物归入对应模块</div></div>`;return;}
    const search=$('#search').value.trim().toLowerCase();
    const modules=projectModules().filter(module=>[module.definition.title,module.moduleKey,...methodsFor(module).map(method=>purposes[method.purpose]),...module.definition.outputs.map(output=>output.label)].join(' ').toLowerCase().includes(search));
    if(view==='canvas') {
      if(!$('#flow-root')) {
        target.innerHTML='<div id="flow-root" aria-label="商品项目交互画布"></div>';
        graph.mount($('#flow-root'),{onSelect:key=>choose(key),onNotify:toast});
      }
      return;
    }
    if(view==='directory') target.innerHTML=`<div class="directory"><div class="directory-head"><span>交付模块</span><span>使用方法</span><span>产物记录</span><span>当前状态</span><span></span></div>${modules.map(directoryRow).join('')||'<p class="muted" style="padding-top:30px">没有匹配的模块</p>'}</div>`;
    if(view==='files') {
      const rows=modules.flatMap(module=>outputsFor(module).map(output=>({module,output}))),originals=rows.filter(row=>row.output.file),completeExample=['review','retained','published'].includes(scene);
      target.innerHTML=`<div class="file-list"><p class="file-summary">${originals.length} 项文件原件记录 · 结构化内容与方法参考资料分别保留</p><table class="file-table"><thead><tr><th>名称 / 模块</th><th>保存用途</th><th>版本 / 大小</th><th>保存状态</th></tr></thead><tbody>${rows.map(({module,output})=>`<tr><td><button data-select="output:${output.id}">${outputTitle(module,output)}</button><small>${escape(module.definition.title)}</small></td><td>${output.file?'原件':output.purpose==='authoring'?'制作清单':'结构化内容'}<small>${output.file?'预览：未提供':''}</small></td><td>v1<small>${output.file?output.file.byteSize+' B':'JSON'}</small></td><td class="${output.purpose==='authoring'?'warning':'status'}">${output.purpose==='authoring'?'制作清单已保存':'已保存'}</td></tr>`).join('')}<tr><td><button data-select="module:experience">网页制作原包</button><small>网页体验</small></td><td>原件</td><td>—</td><td class="${completeExample?'status':'warning'}">${completeExample?'已导入 · 状态示例':'尚未导入'}</td></tr></tbody></table></div>`;
    }
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  }
  function renderInspector() {
    const target=$('#inspector-content');let title='',caption='',tags='',body='',type='项目详情';
    if(selected.startsWith('method:')) {
      const method=data.methods.find(method=>method.id===selected.slice(7));if(!method)return;
      type='固定方法';title=purposes[method.purpose];caption=method.version.manifest.name;
      tags='<span class="tag good">项目已固定</span><span class="tag">库草稿 · 未全局启用</span>';
      const refs=method.version.files;
      body=`<div class="inspector-tabs"><button data-detail-tab="body" class="${detailTab==='body'?'selected':''}">正文</button><button data-detail-tab="files" class="${detailTab==='files'?'selected':''}">附件 ${refs.length}</button><button data-detail-tab="source" class="${detailTab==='source'?'selected':''}">来源与版本</button></div>`;
      if(detailTab==='body') body+=section('本次固定指令',`<div class="instructions">${escape(method.version.manifest.instructions)}</div>`,'完整正文')+section('输入要求',field('共同创作设定','v1 · '+data.profile.profile.title)+field('参与视角','单人 · 自我观察')+field('目标形式','网页'))+section('对应产物',outputsFor(moduleFromSelection()).map(output=>`<button class="detail-link" data-select="output:${output.id}">${outputTitle(moduleFromSelection(),output)}<span>v1　↗</span></button>`).join(''));
      if(detailTab==='files') body+=section('随此方法保留的参考资料',refs.length?refs.map(ref=>`<div class="file-ref"><strong>${escape(ref.path)}</strong><small>${ref.file.mimeType} · ${ref.file.byteSize} B · 原摘要保留</small><p class="mono">SHA-256 ${ref.file.checksum}</p><a class="download" href="voice-notes.md" download>取回参考原件</a></div>`).join(''):note('此方法没有参考附件。正文与清单已固定。'))+section('参考内容',`<pre class="code-text">${refs.length?'# 相处节奏写作参考\n\n描述行为与感受，不判断谁对谁错。\n为用户保留表达与选择的空间。':'无附件'}</pre>`);
      if(detailTab==='source') body+=section('共享库 → 商品项目',field('来源','共享 Skill 库 / 候选草稿')+field('库版本',`v${method.version.number} · 草稿修订 r${method.sourceRevision}`)+field('固定到','计划 v1 / '+moduleFromSelection().definition.title)+field('项目快照',short(method.id),true))+section('商品定制',note('本商品的指令已写入此候选正文，并作为独立的项目快照固定。库中继续改稿不会改写本次方法。'))+section('校验摘要',`<p class="mono muted">快照 SHA-256<br>${method.digest}</p><p class="mono muted" style="margin-top:14px">源版本 SHA-256<br>${method.version.digest}</p>`);
      body+=`<div class="inspector-actions"><button data-download-method="${method.id}">取回固定 Skill</button><button data-preview-action="查看源库版本">查看源库版本 ↗</button></div>`;
    } else if(selected.startsWith('output:')) {
      const module=moduleFromSelection(),output=outputsFor(module).find(output=>output.id===selected.slice(7));if(!output)return;
      type='产物详情';title=outputTitle(module,output);caption=module.definition.title+' / 固定产物 v1';tags=`<span class="tag ${output.purpose==='authoring'?'':'good'}">${output.purpose==='authoring'?'制作清单':'原件已保存'}</span><span class="tag">私有</span>`;
      if(output.file) body+=section('原件',`<div class="image-placeholder"><span class="image-label">PNG</span><span>技术占位原件</span><small>1 × 1 px · 合成测试文件</small></div>`+field('文件名',output.file.fileName)+field('文件大小',output.file.byteSize+' B')+field('保存用途','制作原件')+field('预览文件','未提供 · 与原件分开')+`<a class="download" href="synthetic-source.png" download>取回平台原文件</a>`)+section('文件校验',`<p class="mono muted">SHA-256<br>${output.file.checksum}</p>`)+section('来源',field('导入方式','直接上传')+field('外部地址','未声明'));
      else if(module.moduleKey==='copy') body+=section('文案原件',data.copy.authoring.content.blocks.map(block=>`<div style="margin-bottom:20px"><p class="section-label">${({title:'标题',hook:'开场',cta:'行动邀请'})[block.role]||block.role}</p><p class="instructions">${escape(block.text)}</p></div>`).join(''));
      else if(output.purpose==='authoring') body+=section('体验制作稿',field('体验模板','dom-choice @ 1')+field('报告呈现','legacy-text @ 1')+field('场景数量',data.experience.manifest.scenes.length+' 个')+note('体验清单已经保存。网页原包仍待导入，当前不能视为整套原件完整。'));
      else if(output.outputKey==='questions') body+=section('题目内容',`<p class="state-note" style="margin-bottom:15px">固定题库中的合成技术示例，共 ${data.questions.length} 题。</p>`+data.questions.slice(0,3).map((question,index)=>`<div style="margin-bottom:22px"><p class="section-label">问题 ${index+1}</p><p class="instructions">${escape(question.text)}</p><div class="state-note" style="margin-top:9px">${question.options.map(option=>escape(option.label)).join('<br>')}</div></div>`).join(''))+section('版本依据',field('内容修订',short(output.contentRevisionId),true)+field('创作设定','v1 / '+short(data.profile.id)));
      else body+=section('报告结构',`<p class="instructions">${escape(data.experience.reportPlan.title)}</p><p class="state-note" style="margin:12px 0">${escape(data.experience.reportPlan.narrative)}</p>`+data.experience.reportPlan.sections.map(row=>field(row.title,row.purpose)).join(''))+section('固定依据',field('内容修订',short(output.contentRevisionId),true)+field('创作设定','v1 / '+short(data.profile.id)));
      body+=section('使用的方法',methodsFor(module).map(method=>`<button class="detail-link" data-select="method:${method.id}">${purposes[method.purpose]}<span>固定快照　↗</span></button>`).join(''))+section('制作来源',field('来源','外部制作申报')+field('记录',short(recordFor(module).id),true)+`<p class="state-note">${escape(recordFor(module).external.note)}</p>`);
    } else if(selected.startsWith('note:')) {
      const value=graph.store.getSnapshot().notes.find(note=>note.id===selected);if(!value)return;
      type='备注节点';title='项目备注';caption='计划 v1 / 当前演示草稿';tags='<span class="tag">演示新增</span>';
      body=section('提醒内容',`<p class="instructions">${escape(value.title)}</p>`)+section('节点关系',note('备注不参与模块依赖，不代表制作步骤或执行结果。'));
    } else if(selected.startsWith('module:')) {
      const module=moduleByKey(selected.slice(7)),status=state(module);if(!module)return;
      type='模块详情';title=module.definition.title;caption='计划 v1 / '+module.definition.target.form;tags=`<span class="tag">${status.text}</span><span class="tag">${module.definition.required?'必需交付':'可选交付'}</span>`;
      if(scene==='failures'&&module.moduleKey==='experience') body+=section('校验结果',`<div class="error-block">网页原包校验未通过<br>包内必需的入口文件未找到。已保存的体验清单与其他模块保持可读。</div><button data-preview-action="重新导入网页原包">重新导入原包</button><p class="state-note" style="margin-top:10px">失败状态为设计示例。</p>`);
      else if(scene==='upload') body+=section('当前进度',`<p style="font-size:12px">${status.text==='校验中'?'正在检查原件完整性':'正在上传制作原件'}</p><div class="progress-track"><span></span></div><p class="state-note">完成上传后还需校验，校验通过才会保存原件。</p>`);
      else if(module.moduleKey==='experience'&&['review','retained','published'].includes(scene)) body+=section('原件保存',field('网页制作原包','已导入 · 状态示例')+field('体验清单','已保存')+field('运行验证','独立检查')+note('本处展示原件齐备后的界面状态。此设计示例没有在后台导入 ZIP 或启用网页执行。'));
      else if(module.moduleKey==='experience') body+=section('待补齐',`<div class="error-block">缺少网页制作原包</div><p class="instructions">已保存的体验清单支持查看配置，但不能替代制作原文件。</p><button data-preview-action="导入网页制作原包" style="margin-top:15px">导入原包</button>`);
      else if(module.moduleKey==='video') body+=section('等待上游输入',note('网页体验原包尚未就绪。视频制作可保留分镜草稿，实际视频文件需要单独上传。'));
      body+=section('本模块方法',(methodsFor(module).map(method=>`<button class="detail-link" data-select="method:${method.id}">${purposes[method.purpose]}<span>已固定　↗</span></button>`).join('')||note('还没有固定方法。当前只是演示草稿中的新节点。')))+section('交付清单',module.definition.outputs.map(output=>field(output.label,output.original.representation==='file'?'平台文件原件':'结构化原件')).join(''))+section('输入依赖',module.definition.dependsOn.length?module.definition.dependsOn.map(key=>`<button class="detail-link" data-select="module:${key}">${escape(moduleByKey(key).definition.title)}<span>查看固定输入 ↗</span></button>`).join(''):note('本模块没有其他模块的输入依赖。'));
    } else if(selected==='plan'||selected==='profile') {
      type=selected==='plan'?'制作计划':'共同创作设定';title=selected==='plan'?'制作计划 v1':'创作设定 v1';caption=data.plan.plan.title;tags='<span class="tag">固定修订</span><span class="tag">私有草稿</span>';
      body+=section('这款商品想带来什么',field('情绪目标',data.profile.profile.emotionalGoal)+field('理解目标',data.profile.profile.understandingGoal)+field('带走什么',data.profile.profile.takeaway));
      body+=section('选题与依据',field('选题方式','人工选题')+note(data.plan.plan.selection.rationale)+field('热点证据','未引用')+field('新鲜度时间窗',data.plan.plan.freshnessWindowHours+' 小时'));
      body+=section('计划范围',projectModules().map(module=>`<button class="detail-link" data-select="module:${module.moduleKey}">${escape(module.definition.title)}<span>${module.definition.required?'必需':'可选'}　↗</span></button>`).join(''))+section('历史与留存',note('每次修改产生新计划修订。旧方法、旧产物与已留存成果仍指向当时的固定计划。'));
    } else {
      type='审核与留存';title=scene==='returned'?'文案需修改':scene==='retained'?'成果已留存':scene==='published'?'留存与发布':'检查本次成果';caption='计划 v1 / 本次选中的模块与原件';
      const ready=['review','retained','published'].includes(scene);tags=`<span class="tag ${ready?'good':''}">${scene==='retained'?'已留存 · 未上架':scene==='published'?'已留存 · 已发布':scene==='review'?'待审核':scene==='returned'?'退回修改':'尚有缺项'}</span>`;
      if(scene==='returned') body+=section('退回意见',`<div class="error-block">引流文案 / 本次意见<br>请使用具体生活片段，让用户知道将获得什么理解与表达线索。</div><button class="detail-link" data-select="method:${data.methods.find(method=>method.purpose==='copywriting').id}">查看对应方法<span>↗</span></button><p class="state-note" style="margin-top:12px">其他模块保留已提交版本，补交本次修改项。</p>`);
      body+=section('必需交付',projectModules().filter(module=>module.definition.required).map(module=>`<div class="check-row"><span class="${!ready&&module.moduleKey==='experience'?'pending':'checkmark'}">${!ready&&module.moduleKey==='experience'?'!':'✓'}</span><div>${module.definition.title}<small>${!ready&&module.moduleKey==='experience'?'体验清单已保存，原包待导入':ready?'原件与精确方法已固定 · 状态示例':'原件与精确方法已有保存记录'}</small></div></div>`).join(''));
      body+=section('本次范围',field('计划修订','v1 · '+short(data.plan.id))+field('必需 / 可选','4 个必需 / 1 个可选')+field('审核选择摘要',ready?'固定 fingerprint · 状态示例':'补齐后生成'));
      if(ready) body+=section('留存与发布',field('项目留存',scene==='review'?'待管理员确认':'R03 · 状态示例')+field('商品公开状态',scene==='published'?'已发布 · 独立操作':'未上架')+field('全局 Skill','保持原状态')+note('留存固定整套成果。商品上架、公开素材选择与 Skill 全局启用各自处理。'));
      body+=`<div class="inspector-actions"><button ${ready?'':'disabled'} class="primary" ${scene==='review'?'data-open-review':'data-preview-action="查看留存快照"'}>${scene==='review'?'审核本次成果':'查看留存快照'}</button>${scene==='retained'?'<button data-preview-action="进入商品发布页">进入发布页 ↗</button>':''}</div>`;
    }
    target.innerHTML=`<div class="inspector-top"><span>${type}</span><button data-close aria-label="关闭详情">×</button></div><header class="inspector-title"><h2>${escape(title)}</h2><p class="caption">${escape(caption)}</p><div class="inspector-badges">${tags}</div></header>${body}`;
  }
  function renderScene() {
    graph.setScene(scene);
    document.querySelectorAll('[data-flow-add],[data-flow-connect]').forEach(button=>button.disabled=scene!=='work');
    $('.body').classList.remove('inspector-closed');
    $('#scene').value=scene;$('.body').classList.toggle('empty-mode',scene==='empty');
    const good=['retained','published'].includes(scene);
    $('#project-status').textContent=scene==='published'?'已发布':scene==='retained'?'未上架':scene==='review'?'待审核':scene==='returned'?'需修改':'私有草稿';
    $('#project-status').classList.toggle('good',good);$('#short-id').textContent=short(data.product.id);
    $('#module-progress').textContent=scene==='empty'?'尚未建立计划':['review','retained','published'].includes(scene)?'4 / 4 必需模块 · 状态示例':'3 / 4 必需模块已保存原件';
    $('.project-meta button').innerHTML=scene==='empty'?'计划待建立':'计划 v1 <span>⌄</span>';
    $('.tree-version').innerHTML=scene==='empty'?'尚无计划修订':'计划 v1 <span>固定修订</span>';
    const alerts={work:['网页原包尚未导入，整套成果还不能提交审核。','查看缺项'],failures:['2 个模块需要处理，其余已保存稿件保持可读。','查看失败'],upload:['原件正在上传 / 校验；通过校验后才会保存。','查看进度'],review:['本次选中内容已固定，等待管理员审核留存。','检查本次成果'],returned:['文案已退回修改，请只补交需要调整的内容。','查看退回意见'],retained:['本次成果已留存。商品仍未上架，公开状态另行管理。','查看留存快照'],published:['项目成果已留存，商品已通过独立发布流程。','查看版本关系']};
    $('#project-alert').innerHTML=scene==='empty'?'':`<div class="project-alert ${good?'good':''}"><span>${good?'✓':'○'}</span><span>${alerts[scene][0]}</span><button class="alert-link" data-select="${['work','failures','upload'].includes(scene)?'module:experience':'review'}">${alerts[scene][1]} ↗</button></div>`;
    $('#review-project').disabled=!['review','retained','published'].includes(scene);$('#review-project').textContent=scene==='review'?'审核本次成果':good?'查看留存快照':'提交审核';
    $('#footer-state').textContent=scene==='work'?'原件、方法与审核状态分别记录':scene==='empty'?'先固定共同设定，再保存计划':'当前为状态示例 · 不产生业务记录';
    renderTree();renderContent();renderInspector();updateDraftLabel();
    const next=new URLSearchParams({scene,view});if(query.get('size'))next.set('size',query.get('size'));history.replaceState(null,'','?'+next);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-flow-add')){graph.openAdd();return;}
    if(button.hasAttribute('data-flow-connect')){graph.openConnect();return;}
    if(button.hasAttribute('data-flow-export')){graph.exportDraft();return;}
    if(button.hasAttribute('data-flow-reset')){graph.reset();return;}
    if(button.dataset.select){choose(button.dataset.select);return;}
    if(button.dataset.downloadMethod){const method=data.methods.find(method=>method.id===button.dataset.downloadMethod),url=URL.createObjectURL(new Blob([JSON.stringify(method,null,2)+'\n'],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download=method.purpose+'-'+short(method.id)+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
    if(button.dataset.module){activeModule=button.dataset.module;choose('module:'+activeModule,false);if(view==='canvas')graph.focus('module:'+activeModule);return;}
    if(button.dataset.expand){activeModule=button.dataset.expand;selected='module:'+activeModule;renderTree();renderContent();renderInspector();return;}
    if(button.dataset.view){view=button.dataset.view;renderScene();return;}
    if(button.dataset.detailTab){detailTab=button.dataset.detailTab;renderInspector();return;}
    if(button.hasAttribute('data-close')){$('#inspector').classList.remove('open');if(!matchMedia('(max-width:820px)').matches)$('.body').classList.add('inspector-closed');lastFocus?.isConnected&&lastFocus.focus();return;}
    if(button.dataset.previewAction){toast('设计预览：'+button.dataset.previewAction+'，不会写入后台。');return;}
    if(button.hasAttribute('data-open-review')){$('#review-dialog').showModal();return;}
    if(button.id==='review-project'){if(scene==='review')$('#review-dialog').showModal();else choose('review');return;}
    if(button.id==='focus-selection'){if(view==='canvas')graph.focus(selected);else if(mobile)$('#inspector').classList.add('open');return;}
    if(button.id==='open-tree'){$('.project-tree').classList.add('open');$('#close-tree').focus();}
    if(button.id==='close-tree'){$('.project-tree').classList.remove('open');$('#open-tree').focus();}
  });
  $('#scene').addEventListener('change',event=>{scene=event.target.value;selected=['review','returned','retained','published'].includes(scene)?'review':scene==='failures'||scene==='upload'?'module:experience':'method:'+data.methods.find(method=>method.purpose==='copywriting').id;activeModule='copy';renderScene();});
  $('#search').addEventListener('input',()=>{if(view==='canvas'){const value=$('#search').value.trim();const match=projectModules().find(module=>module.definition.title.includes(value)||module.moduleKey.includes(value));if(value&&match)graph.focus('module:'+match.moduleKey);else if(!value){graph.store.focus(null);graph.fit();}}else renderContent();});
  $('#confirm-review').addEventListener('change',event=>$('#confirm-retain').disabled=!event.target.checked);
  $('#review-dialog').addEventListener('close',()=>{if($('#review-dialog').returnValue==='confirm')toast('设计预览结束：未保存审核记录，也未发布商品。');$('#confirm-review').checked=false;$('#confirm-retain').disabled=true;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('#inspector').classList.remove('open');$('.project-tree').classList.remove('open');}});
  function updateDraftLabel(){
    const state=graph.store.getSnapshot();
    $('[data-flow-revision]').textContent='演示草稿 r'+state.draftRevision+' · 刷新还原';
    $('.tree-label span').textContent=String(state.modules.length);
    if(scene==='work'){const required=state.modules.filter(module=>module.definition.required);const saved=required.filter(module=>data.inspection.modules.some(item=>item.moduleKey===module.moduleKey&&item.originals==='recorded_not_revalidated'));$('#module-progress').textContent=saved.length+' / '+required.length+' 必需模块已有原件记录';}
    if(state.draftRevision){$('.project-meta button').innerHTML='基于计划 v1 <span>演示 r'+state.draftRevision+'</span>';$('.tree-version').innerHTML='固定 v1 <span>＋ 演示草稿 r'+state.draftRevision+'</span>';$('#footer-state').textContent='演示草稿未保存；固定方法与产物仍指向原修订';}
  }
  if(query.get('size')==='40'){$('#scene option[value=work]').textContent='40 模块规模示例 · 非业务数据';$('.preview-label').textContent='规模演示 · 不写入后台';}
  window.g1DesignSelect=key=>choose(key);
  window.g1DesignNotify=toast;
  document.addEventListener('g1:graph-change',()=>{renderTree();renderContent();renderInspector();updateDraftLabel();});
  renderScene();
  if(view==='canvas'&&!query.get('detail'))$('.body').classList.add('inspector-closed');
  if(query.get('detail')==='open'){$('#inspector').classList.add('open');}
})();
