import { experienceTemplate, supportsExperience, type ExperienceManifest } from './experience.js';
import { productPlanPendingFields } from './product-plan.js';
import type { ProductionPlanDocument } from './production-plans.js';

type Module = ProductionPlanDocument['modules'][number];
/** A form is authoring intent; only a registered renderer/report pair grants support. */
export function registeredPlanRuntime(module: Module) {
  const runtime = module.target.runtime;
  if (!runtime) return undefined;
  const template = experienceTemplate({ renderer: runtime.renderer, report: { renderer: runtime.reportRenderer } });
  return template && template.authoringForms.some(form => form === module.target.form) &&
    runtime.inputSchema === template.inputSchema && runtime.engine === template.engine &&
    runtime.reportSchema === template.contentSchema ? template : undefined;
}

/** These are delivery compatibility checks, never a device or commercial acceptance certificate. */
export function threejsPublicationIssues(plan: ProductionPlanDocument, module: Module, manifest: ExperienceManifest) {
  const issues: string[] = [], template = registeredPlanRuntime(module), actual = experienceTemplate(manifest);
  if (module.domain !== 'experience' || !template || template !== actual || template.presentation !== 'webgl_3d' || !supportsExperience(manifest))
    issues.push('正常商品必须使用实际注册且与商品规划配对的 Three.js 场景和报告；DOM 仅用于文字、无障碍与故障回退');
  if (plan.schemaVersion !== 2) return [...issues, '新正式商品需要包含 Three.js 商品规划的 v2 计划'];
  const fixed = plan.productPlan;
  if (productPlanPendingFields(fixed).length || !fixed.assessmentModuleKey)
    issues.push('商品规划、动画、交互与预算仍有待定项，请先固定完整规划');
  if (fixed.experienceModuleKey !== module.moduleKey)
    issues.push('体验制作稿必须使用商品规划明确指定的体验模块');
  if (Object.values(fixed.decisions).some(decision => decision.requirement === 'required' && !['implemented', 'verified'].includes(decision.status)))
    issues.push('规划中必需的功能尚未声明实现并提供依据，不能作为已交付体验审核');
  if (template?.presentation === 'webgl_3d') {
    const graphics = 'graphics' in template ? template.graphics : undefined, budgets = fixed.budgets;
    if (manifest.resources.reduce((sum, resource) => sum + resource.byteSize, 0) > (budgets.maxTotalResourceBytes ?? 0))
      issues.push('实际体验资源超过固定商品预算');
    if (graphics && (['maxRendererGzipBytes', 'maxPixelRatio', 'maxCanvasPixels', 'maxTriangles', 'maxDrawCalls'] as const)
      .some(key => budgets[key] !== null && graphics[key] > budgets[key]))
      issues.push('注册场景的图形上限超出固定商品预算，请选择可满足预算的实现或建立新规划');
  }
  return issues;
}
