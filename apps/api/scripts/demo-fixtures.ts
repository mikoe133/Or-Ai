import { createHash } from 'node:crypto';
import { ProductConfigurationSchema, type ProductConfiguration } from '@orai/contracts/admin';
import { PublicReportSampleSchema } from '@orai/contracts';

export function demoId(key: string): string {
  const bytes = createHash('sha256').update('orai-demo-v1:' + key).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

export const DemoCategories = [
  ['relationships', '关系情感'], ['work', '职场工作'], ['self', '自我探索'],
  ['life', '生活消费'], ['fun', '趣味娱乐'],
] as const;
export const DemoTags = [['cooperation', '协作'], ['boundaries', '边界'], ['energy', '电量'], ['demo', '演示']] as const;

function configuration(labels: [string, string], texts: string[], version = 1): ProductConfiguration {
  const resultTypes = [
    { id: 'developing', label: '仍在探索', summary: '先观察自己的节奏。' },
    { id: 'balanced', label: '逐步平衡', summary: '已经找到一些可用的方法。' },
    { id: 'steady', label: '相对稳定', summary: '可以继续保持并定期沟通。' },
  ];
  return ProductConfigurationSchema.parse({
    schemaVersion: 1, engine: 'dimensions_v1', locale: 'zh-CN',
    dimensions: labels.map((label, index) => ({ id: 'dimension-' + (index + 1), label, weight: 1,
      minApplicableAnswers: 1, missingReason: '该维度的适用回答不足，暂不计算分数。' })),
    questions: texts.map((text, index) => ({
      id: 'question-' + (index + 1), text: index === 0 && version === 2 ? text + '（第二版：以最近一周为范围）' : text,
      dimensionId: 'dimension-' + (index % 2 + 1), required: true, weight: 1,
      options: [
        { id: 'rarely', label: '很少如此', points: 0, notApplicable: false },
        { id: 'sometimes', label: '有时如此', points: version === 2 ? 4 : 5, notApplicable: false },
        { id: 'often', label: '经常如此', points: 10, notApplicable: false },
        { id: 'na', label: '不适用', points: null, notApplicable: true },
      ],
    })),
    resultTypes, bands: [
      { resultTypeId: 'developing', min: 0, max: 40 }, { resultTypeId: 'balanced', min: 40, max: 70 }, { resultTypeId: 'steady', min: 70, max: 100 },
    ],
    report: {
      disclaimer: '这是平台功能演示，仅供娱乐与自我观察，不构成专业判断或生活决定。',
      missingDimensionPolicy: 'null',
      templates: resultTypes.map(result => ({ resultTypeId: result.id,
        explanation: '演示规则将当前回答归为“' + result.label + '”。' + (version === 2 ? '这是第二版解释。' : '这是第一版解释。'),
        suggestion: '选一个小场景尝试调整，之后再观察变化。' })),
      insufficient: { id: 'insufficient', label: '信息不足', explanation: '适用回答不足，不能据此计算完整类型。',
        suggestion: '可以保留不适用的选择；请不要把缺失分数当成零分。' },
    },
    retention: { firstRedemptionDays: 30, entitlementDays: 120, rawAnswerDays: 7, reportDays: 90 },
    statisticsMinimum: 20,
  });
}

export const DemoProducts = [
  { slug: 'demo-partner', name: '伴侣协作测试 · 演示', hook: '一起安排生活时，你们的协作节奏是什么？',
    summary: '演示主动分担、回应和共同安排的多维测试。', category: 'relationships', tag: 'cooperation',
    type: 'SCORE' as const, duration: 3, coverUrl: '/demo/partner.svg',
    configurations: [
      configuration(['共同分担', '沟通回应'], ['我会主动讨论待办分工。', '我能及时回应共同安排。', '我们会一起核对完成情况。', '遇到变化时我们会重新沟通。', '我会表达需要的支持。', '我们会为彼此预留休息时间。']),
      configuration(['共同分担', '沟通回应'], ['我会主动讨论待办分工。', '我能及时回应共同安排。', '我们会一起核对完成情况。', '遇到变化时我们会重新沟通。', '我会表达需要的支持。', '我们会为彼此预留休息时间。'], 2),
    ] },
  { slug: 'demo-work', name: '工作边界测试 · 演示', hook: '面对临时任务，你会怎样表达工作边界？',
    summary: '用简短题目验证不同商品共用同一套引擎。', category: 'work', tag: 'boundaries',
    type: 'TENDENCY' as const, duration: 2, coverUrl: null,
    configurations: [configuration(['边界表达', '安排沟通'], ['我会先确认临时任务的优先级。', '下班消息出现时，我会说明能回应的时间。', '时间不足时，我会明确提出取舍。'])] },
  { slug: 'demo-social', name: '社交电量测试 · 演示：观察相处时长、独处恢复和一天中的节奏变化',
    hook: '你的社交节奏，什么时候需要补充电量？', summary: '验证长标题、主题切换与不适用维度的展示。',
    category: 'self', tag: 'energy', type: 'TENDENCY' as const, duration: 2, coverUrl: '/demo/partner.svg',
    configurations: [configuration(['独处恢复', '相处节奏'], ['独处之后，我能恢复精力。', '相处一段时间后，我会表达休息需求。', '我能找到适合自己的社交时长。'])] },
];

export function demoPublicSample(config: ProductConfiguration) {
  return PublicReportSampleSchema.parse({ label: '逐步平衡 · 演示样例', summary: '这是独立编写的公开样例，不来自任何私人报告。',
    dimensions: config.dimensions.map(dimension => ({ label: dimension.label, score: 50 })),
    suggestion: '从一个小场景开始观察自己的选择。', isDemo: true });
}

// Authentication states are test scenarios, not business-database proof of
// verified email. Production must verify them with Supabase in T06.
export const DemoIdentityScenarios = {
  pending: { id: demoId('user-pending'), supabaseUserId: demoId('supabase-pending'), emailVerified: false, role: 'USER' as const },
  verified: { id: demoId('user-verified'), supabaseUserId: demoId('supabase-verified'), emailVerified: true, role: 'USER' as const },
  other: { id: demoId('user-other'), supabaseUserId: demoId('supabase-other'), emailVerified: true, role: 'USER' as const },
  admin: { id: demoId('user-admin'), supabaseUserId: demoId('supabase-admin'), emailVerified: true, role: 'ADMIN' as const },
};
