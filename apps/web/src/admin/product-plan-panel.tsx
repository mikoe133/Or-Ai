import { useState } from 'react';
import { ProductImplementationPlanSchema, ProductPlanDecisionSchema, ProductionPlanModuleSchema,
  productPlanDecisionKeys, productPlanDifference, productPlanPendingFields,
  type ProductImplementationPlan, type ProductPlanDecision } from '@orai/contracts/admin';
import { registeredExperiences } from '@orai/contracts/experience';
import type { ProjectPlanning } from './project-planning.js';
import { planningRuntimeKey } from './project-planning-model.js';
import './product-plan-panel.css';

const labels = { scene: '场景与构图', animation: '动画', camera: '镜头', interaction: '交互与玩法', feedback: '操作反馈',
  confirmation: '明确确认', recovery: '保存与恢复', report: '报告承接', accessibility: '无障碍与减少动态', fallback: '设备故障回退', resources: '资源制作' };
const requirementLabels = { undecided: '待规划', required: '需要', not_required: '明确不需要' };
const statusLabels = { unplanned: '尚未规划', planned: '已规划', implemented: '已实现（附依据）', verified: '已验证（附依据）' };
const budgetLabels: Record<Exclude<keyof ProductImplementationPlan['budgets'], 'devices'>, string> = {
  maxRendererGzipBytes: '渲染模块 gzip 上限（字节）', maxTotalResourceBytes: '资源总量上限（字节）', maxFirstFrameMs: '首帧上限（毫秒）',
  maxPixelRatio: '像素比上限', maxCanvasPixels: '画布像素上限', maxTriangles: '三角面上限', maxDrawCalls: '绘制调用上限', minFps: '最低帧率',
};
const devices = { desktop: '桌面', ios_safari: 'iOS Safari', android_chrome: 'Android Chrome', wechat: '微信', platform_webview: '销售平台内置浏览器' } as const;
const runtimeOptions = registeredExperiences.filter(item => 'graphics' in item).map(item => {
  const runtime = { renderer: { key: item.key, version: item.version }, reportRenderer: { key: item.reportKey, version: item.reportVersion },
    inputSchema: item.inputSchema, engine: item.engine, reportSchema: item.contentSchema };
  return { value: planningRuntimeKey(runtime), label: item.label + ' → ' + item.reportLabel, runtime };
});

function JsonInput({ label, value, editable, onApply, editor }: { label: string; value: unknown; editable: boolean;
  onApply: (value: unknown) => void; editor: ProjectPlanning }) {
  const serialized = JSON.stringify(value, null, 2), text = editor.jsonDrafts[label] ?? serialized, [error, setError] = useState('');
  if (!editable) return <pre>{serialized}</pre>;
  return <div className="pp-json"><textarea aria-label={label + ' JSON'} value={text} rows={5} maxLength={100000}
    onChange={event => { editor.jsonDraft(label, event.target.value === serialized ? null : event.target.value); setError(''); }} />
    <button type="button" disabled={text === serialized} onClick={() => {
      try { onApply(JSON.parse(text)); editor.jsonDraft(label, null); setError(''); }
      catch (issue) { setError(issue instanceof Error ? issue.message.slice(0, 300) : '请核对 JSON'); }
    }}>应用{label}</button>{text !== serialized && <small>此段编辑尚未应用到规划草稿</small>}{error && <p role="alert">{error}</p>}</div>;
}

function Decision({ name, value, editable, change, editor }: { name: typeof productPlanDecisionKeys[number]; value: ProductPlanDecision;
  editable: boolean; change: (value: ProductPlanDecision) => void; editor: ProjectPlanning }) {
  return <details className="pp-decision"><summary><strong>{labels[name]}</strong><span>{requirementLabels[value.requirement]} · {statusLabels[value.status]}</span></summary>
    <div className="pp-decision-content"><div className="pp-grid">
      <label>是否需要<select aria-label={labels[name] + '需求'} disabled={!editable} value={value.requirement} onChange={event => {
        const requirement = event.target.value as ProductPlanDecision['requirement'];
        change({ ...value, requirement, status: requirement === 'undecided' ? 'unplanned' : 'planned', evidence: [] });
      }}>{Object.entries(requirementLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label>实际阶段<select aria-label={labels[name] + '阶段'} disabled={!editable || value.requirement === 'undecided'} value={value.status}
        onChange={event => change({ ...value, status: event.target.value as ProductPlanDecision['status'] })}>
        {Object.entries(statusLabels).filter(([key]) => value.requirement === 'undecided' ? key === 'unplanned' :
          key !== 'unplanned' && !(value.requirement === 'not_required' && key === 'implemented')).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div><label>具体决定与触发条件<textarea aria-label={labels[name] + '说明'} rows={3} maxLength={4000} value={value.details} disabled={!editable}
      placeholder="说明该商品如何呈现、触发、退出或减少动态；待定可以留空" onChange={event => change({ ...value, details: event.target.value })} /></label>
      <details><summary>实现与验证依据 · {value.evidence.length} 项</summary><p>此处保存作者申报的文件或验收记录引用。检查规划不会执行或认证这些依据。</p>
        <JsonInput label={labels[name] + '依据'} editable={editable} value={value.evidence} editor={editor}
          onApply={input => change({ ...value, evidence: ProductPlanDecisionSchema.shape.evidence.parse(input) })} /></details>
    </div></details>;
}

export function ProductPlanPanel({ editor }: { editor: ProjectPlanning }) {
  const document = editor.data?.plan?.plan;
  if (!document) return null;
  const editable = editor.active && editor.canEdit && !editor.action.busy && !editor.uncertain && !editor.conflict && !editor.permissionLost;
  if (document.schemaVersion === 1) return <details className="pp-panel"><summary><strong>商品体验规划</strong><span>旧版 v1 · 尚无独立规划合同</span></summary>
    <div className="pp-body"><p>旧版形式字段保留历史含义。建立 v2 后再明确视觉、动画、镜头和交互；保存会追加新修订。</p>
      <button type="button" onClick={editor.upgrade} disabled={!editor.canEdit || editor.action.busy || editor.uncertain || editor.conflict}>建立 Three.js 商品规划</button>
      {!editor.canEdit && <p>当前为固定历史版本；请回到最新计划编辑。</p>}</div></details>;
  const plan = document.productPlan, pending = productPlanPendingFields(plan),
    before = editor.basePlan?.schemaVersion === 2 ? editor.basePlan.productPlan : null,
    changes = editor.planDirty ? productPlanDifference(before, plan) : [],
    experience = document.modules.find(module => module.moduleKey === plan.experienceModuleKey), runtime = experience?.target.runtime;
  const change = (next: Partial<ProductImplementationPlan>) => editor.updateProductPlan({ ...plan, ...next });
  return <details className="pp-panel"><summary><strong>商品体验规划</strong><span>Three.js · v2 · {pending.length ? `${pending.length} 项待确定` : '决定已填写 · 运行另验'}</span></summary>
    <div className="pp-body"><div className="pp-heading"><div><h4>按这款商品决定如何体验</h4><p>用户价值、世界观和视觉风格沿用固定创作设定。这里保存制作决定与预算。</p></div>
      {!editor.active && editor.canEdit && <button type="button" onClick={editor.begin}>编辑商品规划</button>}</div>
      <div className="pp-policy"><strong>Three.js</strong><span>正常商品体验必须实际使用；动画、镜头、玩法分别规划。</span></div>
      <div className="pp-grid">
        <label>视觉维度<select aria-label="商品视觉维度" disabled={!editable} value={plan.visualDimension}
          onChange={event => change({ visualDimension: event.target.value as ProductImplementationPlan['visualDimension'] })}>
          <option value="undecided">待规划</option><option value="2d">2D</option><option value="2.5d">2.5D</option><option value="3d">3D</option></select></label>
        <label>体验模块<select aria-label="商品体验模块" disabled={!editable} value={plan.experienceModuleKey ?? ''}
          onChange={event => change({ experienceModuleKey: event.target.value || null })}><option value="">待规划</option>
          {document.modules.filter(module => module.domain === 'experience').map(module => <option key={module.moduleKey} value={module.moduleKey}>{module.title}</option>)}</select></label>
        <label>内容与评估模块<select aria-label="商品评估模块" disabled={!editable} value={plan.assessmentModuleKey ?? ''}
          onChange={event => change({ assessmentModuleKey: event.target.value || null })}><option value="">尚未选择</option>
          {document.modules.filter(module => module.domain === 'assessment').map(module => <option key={module.moduleKey} value={module.moduleKey}>{module.title}</option>)}</select></label>
      </div>
      {experience && <details className="pp-section"><summary>运行与报告配对 · {runtime ? runtime.renderer.key + ' / ' + runtime.reportRenderer.key : '待规划'}</summary>
        <p>此处编辑体验模块的唯一运行目标。选择模板只固定制作要求，实际场景与资源另行验收。</p>
        <label>已注册 Three.js 配对<select aria-label="商品运行配对" disabled={!editable}
          value={planningRuntimeKey(runtime ?? null)} onChange={event => {
            const selected = runtimeOptions.find(item => item.value === event.target.value);
            editor.updateRuntime(experience.moduleKey, { form: '3d', runtime: selected ? structuredClone(selected.runtime) : null });
          }}><option value="">待规划</option>{runtime && !runtimeOptions.some(item => item.value === planningRuntimeKey(runtime)) &&
            <option value={planningRuntimeKey(runtime)}>现有 / 自定义：{runtime.renderer.key}@{runtime.renderer.version} → {runtime.reportRenderer.key}@{runtime.reportRenderer.version}</option>}
          {runtimeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <details><summary>自定义运行目标</summary><JsonInput label="运行目标" value={experience.target} editable={editable} editor={editor}
          onApply={value => editor.updateRuntime(experience.moduleKey, ProductionPlanModuleSchema.shape.target.parse(value))} /></details>
      </details>}
      <h4>制作决定</h4><p>静态构图可以明确选择。待规划、明确不需要、已实现和已验证分别保存。</p>
      <div className="pp-decisions">{productPlanDecisionKeys.map(key => <Decision key={key} name={key} value={plan.decisions[key]} editable={editable} editor={editor}
        change={value => change({ decisions: { ...plan.decisions, [key]: value } })} />)}</div>
      <details className="pp-section"><summary>设备与制作预算</summary><p>空白表示待规划。填写上限不代表实际资源或设备已达标。</p>
        <div className="pp-devices">{Object.entries(devices).map(([key, label]) => <label key={key}><input type="checkbox" disabled={!editable}
          checked={plan.budgets.devices.includes(key as keyof typeof devices)} onChange={event => change({ budgets: { ...plan.budgets,
            devices: event.target.checked ? [...plan.budgets.devices, key as keyof typeof devices] : plan.budgets.devices.filter(device => device !== key) } })} />{label}</label>)}</div>
        <div className="pp-grid">{Object.entries(budgetLabels).map(([key, label]) => <label key={key}>{label}<input type="number" min={key === 'maxPixelRatio' ? 0.1 : 0}
          step={key === 'maxPixelRatio' ? 0.1 : 1} aria-label={label} disabled={!editable} value={plan.budgets[key as keyof typeof budgetLabels] ?? ''}
          placeholder="待规划" onChange={event => change({ budgets: { ...plan.budgets, [key]: event.target.value === '' ? null : Number(event.target.value) } })} /></label>)}</div>
      </details>
      <details className="pp-section"><summary>固定内容、资源与方法来源 · {plan.sources.length} 项</summary>
        <p>填写 sourceKey、目标 moduleKey、kind、id、digest。支持 content_revision、experience_release、method_snapshot；方法快照包含精确 Skill 和附件，体验版本包含实际资源清单。保存时校验同商品、范围和摘要。选题与宣传来源 URL 沿用本计划的证据清单。</p>
        <JsonInput label="固定来源" value={plan.sources} editable={editable} editor={editor} onApply={value => change({ sources: ProductImplementationPlanSchema.shape.sources.parse(value) })} />
        {plan.basedOnPlanRevisionId && <p>规划来源修订：<code>{plan.basedOnPlanRevisionId}</code></p>}
      </details>
      {editor.pendingJson && <p role="status">有高级 JSON 编辑尚未应用，请先应用或放弃这部分输入，再保存计划。导出草稿会保留原始输入。</p>}
      {editor.validation?.success === false && <div className="pp-validation" role="alert"><strong>请补充或修正规划</strong><ul>{editor.validation.error.issues.slice(0, 8)
        .map((issue, index) => <li key={index}>{issue.path.join('.')}：{issue.message}</li>)}</ul></div>}
      {changes.length > 0 && <details className="pp-section"><summary>本次变更与影响 · {changes.length} 项</summary>
        <p>保存后生成新的计划与模块快照。旧方法、产物和审核仍固定在原修订，新制作需重新选择依据。</p><ul>{changes.map(item =>
          <li key={item.path}><strong>{labels[item.path.replace('decisions.', '') as keyof typeof labels] ?? budgetLabels[item.path.replace('budgets.', '') as keyof typeof budgetLabels] ?? item.path}</strong>
            <span>{JSON.stringify(item.before)?.slice(0, 160)} → {JSON.stringify(item.after)?.slice(0, 160)}</span></li>)}</ul></details>}
      <p className="pp-foot">{editor.planDirty ? '当前修改尚未保存，请使用上方「保存新计划」。' : '此处读取固定计划修订。'}规划检查不执行场景，正式发布完整性由后续发布校验负责。</p>
    </div></details>;
}
