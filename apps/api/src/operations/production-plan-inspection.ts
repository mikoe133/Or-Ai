import { experienceTemplate } from '@orai/contracts/experience';
import { ProductionPlanInspectionSchema, productPlanPendingFields, type ProductionPlanDocument } from '@orai/contracts/admin';

export function inspectProductionPlan(plan: ProductionPlanDocument, now = new Date()) {
  const issues: { code: string; severity: 'warning'; message: string; moduleKey: string | null; evidenceKey: string | null }[] = [];
  if (plan.schemaVersion === 2) {
    const pending = productPlanPendingFields(plan.productPlan);
    if (pending.length) issues.push({ code: 'PRODUCT_PLAN_PENDING', severity: 'warning',
      message: `有${pending.length}项商品规划或预算待确定；草稿可以保存，不能据此认定已交付。`, moduleKey: null, evidenceKey: null });
    const module = plan.modules.find(item => item.moduleKey === plan.productPlan.experienceModuleKey), runtime = module?.target.runtime;
    const capability = runtime ? experienceTemplate({ renderer: runtime.renderer, report: { renderer: runtime.reportRenderer } }) : undefined;
    if (module && capability?.presentation !== 'webgl_3d') issues.push({ code: 'THREEJS_IMPLEMENTATION_PENDING', severity: 'warning',
      message: '所选运行配对尚不能证明使用 Three.js；规划声明不等于实际场景已经实现。', moduleKey: module.moduleKey, evidenceKey: null });
    if (Object.values(plan.productPlan.decisions).some(item => ['implemented', 'verified'].includes(item.status)))
      issues.push({ code: 'DECLARED_EVIDENCE_NOT_REVALIDATED', severity: 'warning', message: '实现/验证阶段及依据由作者申报；本次检查未执行场景、设备或证据。', moduleKey: null, evidenceKey: null });
  }
  const window = plan.freshnessWindowHours * 3600000;
  const timing = (value: string) => {
    const age = now.getTime() - Date.parse(value);
    return age < 0 ? 'future_dated' as const : age > window ? 'stale' as const : 'fresh' as const;
  };
  const evidence = plan.evidence.map(item => {
    const publicationTime = item.publishedAt === null ? 'unknown' as const : timing(item.publishedAt), retrievalTime = timing(item.retrievedAt);
    if (publicationTime !== 'fresh' || retrievalTime !== 'fresh') issues.push({ code: 'SOURCE_TIMING', severity: 'warning',
      message: publicationTime === 'unknown' ? '源发布时间未知，不能证明热点新鲜度；检索时间另行保留。' : '来源或检索时间超出窗口/位于未来，请人工核对。', moduleKey: null, evidenceKey: item.evidenceKey });
    if (item.publishedAt && Date.parse(item.publishedAt) > Date.parse(item.retrievedAt)) issues.push({ code: 'SOURCE_TIME_ORDER', severity: 'warning',
      message: '记录的源发布时间晚于检索时间，请核对原始证据。', moduleKey: null, evidenceKey: item.evidenceKey });
    return { evidenceKey: item.evidenceKey, publicationTime, retrievalTime };
  });
  const modules = plan.modules.map(module => {
    const runtime = module.target.runtime;
    const expectsRuntime = module.domain === 'experience' && module.outputs.some(output => ['web_bundle', 'scene_bundle'].includes(output.kind));
    const capability = runtime ? experienceTemplate({ renderer: runtime.renderer, report: { renderer: runtime.reportRenderer } }) : undefined;
    const registered = capability && runtime && capability.authoringForms.some(form => form === module.target.form) &&
      runtime.inputSchema === capability.inputSchema && runtime.engine === capability.engine && runtime.reportSchema === capability.contentSchema;
    const template = runtime || expectsRuntime ? registered ? 'registered_pair' as const : 'unregistered' as const : 'content_validation_required' as const;
    if (template === 'unregistered') issues.push({ code: 'UNREGISTERED_RUNTIME', severity: 'warning',
      message: '当前仅保存制作计划；此运行形式/配对未注册，上传原件也不会使其可执行。', moduleKey: module.moduleKey, evidenceKey: null });
    return { moduleKey: module.moduleKey, required: module.required, template,
      originals: 'declared_not_imported' as const, methods: 'required_not_captured' as const };
  });
  return ProductionPlanInspectionSchema.parse({ checkedAt: now.toISOString(), valid: true, runtimeValidation: 'not_performed', archiveReady: false,
    issues, evidence, modules });
}
