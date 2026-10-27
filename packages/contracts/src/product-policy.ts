import type { StyleSkillManifest } from './skills.js';
import { z } from 'zod';

// Authoring policy, separate from registered runtime capabilities and immutable releases.
export const productImplementationPolicy = {
  id: 'threejs-products-v1', runtime: 'threejs', form: '3d',
  summary: '所有商品的正常体验统一使用 Three.js；动画、镜头和交互按每款商品的固定规划确定。',
  mcpInstructions: 'Product authoring policy: every normal product experience must use Three.js. New Skill writes require manifest schemaVersion=2, productPolicy v1, the required product-plan input, and the shared plus purpose-specific clauses. A reusable Skill must not bind a product ID. Actual use requires the fixed v2 product plan, matching module, purpose, form and exact method version. Animation, camera and interaction are determined by the fixed product plan; do not assume a universal scene or game. Preserve immutable historical versions and declare unsupported capabilities honestly.',
} as const;

export const threejsSkillInstructions = `## 商品实现约束 · Three.js

所有商品的正常体验必须使用 Three.js 制作，并具有实际可运行、与商品内容相关的场景；不能以普通网页表单或空白 Canvas 冒充 Three.js 商品。
Three.js 是统一实现基线，视觉可以是 2D、2.5D 或 3D。动画、镜头、场景切换、物体操作、确认与反馈均以该商品固定版本的规划为准，不默认套用静心花园、固定动画或小游戏。
制作前必须读取共同创作设定及商品规划。未明确的动画或交互记为待规划，不自行承诺、补造或把未实现玩法标成可用。
题目、报告、封面、视频和文案须对应同一商品的场景、风格及真实能力；各交付物按其媒介制作，宣传不得夸大交互和效果。
DOM 可用于文字、无障碍和设备故障回退；正常商品体验仍须包含实际 Three.js 场景。已有答案、评分、保存恢复及权益语义按已注册能力处理，不以渲染技术替代新玩法的评估协议。
历史商品、报告和 Skill 版本保持原样，改造须追加新版本并审核。`;

export const threejsPurposeInstructions = {
  assessment_design: '将题意和可确认的答案映射到商品规划中的 Three.js 场景任务；操作语义与评估规则分别定义，不根据镜头、路径或动画擅自推断结果。',
  report_writing: '报告承接 Three.js 商品的世界观、真实选择与理解目标，提供具体解释和行动线索；场景回顾必须有真实输入依据，报告形式依商品规划。',
  cover_design: '封面对应商品规划中的 Three.js 世界、物件和配色；真实体验画面与概念示意分别标识，不展示尚未实现的交互承诺。',
  video_production: '视频展示商品实际具备的 Three.js 场景、动画和交互；未实现部分只作为明确的分镜方案，不把脚本或概念镜头当作成片与已交付体验。',
  copywriting: '文案依据商品真实的 Three.js 体验、情绪目标和最终交付表达价值；动画和玩法未确定时不得写成已经具备的卖点。',
  scene_design: '按商品规划制作实际 Three.js 场景、资源和交互映射；镜头与动画按需设计，兼顾性能、键盘、触摸与减少动态，不把所有商品固定成同一场景。',
  report_presentation: '结果呈现承接 Three.js 商品的场景意象、配色和节奏；报告的图文、可导出或交互形式按商品规划和已注册能力选择，保留可读性与恢复能力。',
} as const;

export const SkillProductPolicySchema = z.object({
  schemaVersion: z.literal(1), implementation: z.literal('threejs'), applicability: z.literal('all_declared_purposes'),
  planInput: z.object({ key: z.literal('product-plan'), schemaVersion: z.literal(2), required: z.literal(true) }).strict(),
  decisions: z.literal('fixed_product_plan'),
}).strict();
export const currentSkillProductPolicy = SkillProductPolicySchema.parse({
  schemaVersion: 1, implementation: 'threejs', applicability: 'all_declared_purposes',
  planInput: { key: 'product-plan', schemaVersion: 2, required: true }, decisions: 'fixed_product_plan',
});
type PolicyCandidate = { schemaVersion: number; productPolicy?: unknown; supportedForms: string[];
  inputs: { key: string; required: boolean }[]; instructions: string; purposes: (keyof typeof threejsPurposeInstructions)[] };
export function threejsSkillPolicyIssues(manifest: PolicyCandidate): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (manifest.schemaVersion !== 2 || !SkillProductPolicySchema.safeParse(manifest.productPolicy).success)
    issues.push({ path: 'productPolicy', message: '需要 manifest v2 和完整的 Three.js 商品政策 v1' });
  if (!manifest.supportedForms.includes('3d')) issues.push({ path: 'supportedForms', message: '需要声明 Three.js 商品形式 3d' });
  if (!manifest.inputs.some(input => input.key === 'product-plan' && input.required))
    issues.push({ path: 'inputs', message: '必须声明 product-plan 为必填输入' });
  if (!manifest.instructions.includes(threejsSkillInstructions))
    issues.push({ path: 'instructions', message: '正文缺少共同 Three.js 商品条款' });
  for (const purpose of manifest.purposes) if (!manifest.instructions.includes(threejsPurposeInstructions[purpose]))
    issues.push({ path: 'instructions', message: '正文缺少专业用途条款：' + purpose });
  return issues;
}

export function withThreejsSkillPolicy(manifest: StyleSkillManifest): StyleSkillManifest {
  const hasPlan = manifest.inputs.some(input => input.key === 'product-plan');
  const clauses = [threejsSkillInstructions, ...manifest.purposes.map(purpose => threejsPurposeInstructions[purpose])];
  return {
    ...manifest,
    schemaVersion: 2,
    productPolicy: structuredClone(currentSkillProductPolicy),
    supportedForms: manifest.supportedForms.includes('3d') ? [...manifest.supportedForms] : [...manifest.supportedForms, '3d'],
    inputs: hasPlan ? manifest.inputs.map(input => input.key === 'product-plan' ? { ...input, required: true } : { ...input }) : [
      ...manifest.inputs.map(input => ({ ...input })),
      { key: 'product-plan', description: '固定版本的商品规划，含 Three.js 场景、动画/镜头与交互决定；未确定项明确标记待规划', required: true },
    ],
    instructions: [manifest.instructions.trim(), ...clauses.filter(clause => !manifest.instructions.includes(clause))].join('\n\n'),
  };
}

export function hasThreejsSkillPolicy(manifest: StyleSkillManifest) {
  return threejsSkillPolicyIssues(manifest).length === 0;
}
