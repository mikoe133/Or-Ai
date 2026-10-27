export const productPlanProfileId = '11111111-1111-4111-8111-111111111111';

// Synthetic planning decisions, not generated product content or runtime evidence.
export function productPlanFixture(variant: 'static' | 'animated' = 'static') {
  const decision = (details: string) => ({ requirement: 'required', status: 'planned', details, evidence: [] });
  return {
    schemaVersion: 2,
    title: '合成商品规划', creativeProfileRevisionId: productPlanProfileId,
    selection: { basis: 'manual', rationale: '验证不同商品拥有独立规划', evidenceKeys: [] },
    freshnessWindowHours: 72, evidence: [], retention: 'platform_originals_and_exact_methods',
    modules: [{ moduleKey: 'experience', title: '商品体验', domain: 'experience', required: true,
      purpose: '按明确选择保存答案', dependsOn: [], target: { form: '3d', runtime: {
        renderer: { key: 'synthetic-gallery', version: 1 }, reportRenderer: { key: 'synthetic-notes', version: 1 },
        inputSchema: 'single_choice_v1', engine: 'dimensions_v1', reportSchema: 'report_content_v1',
      } }, methodPurposes: ['scene_design', 'report_presentation'], methodRetention: 'manifest_instructions_and_references',
      outputs: [{ outputKey: 'scene', label: '场景原件', required: true, kind: 'scene_bundle',
        original: { storage: 'platform', representation: 'file' },
        files: [{ fileKey: 'source', purpose: 'original', label: '原件', required: true, mimeTypes: ['application/zip'], sourceUrl: null }] }],
    }],
    productPlan: {
      schemaVersion: 1, implementation: 'threejs', basedOnPlanRevisionId: null,
      visualDimension: variant === 'static' ? '2.5d' : '3d',
      experienceModuleKey: 'experience', assessmentModuleKey: null,
      decisions: {
        scene: decision(variant === 'static' ? '纸片展厅的固定构图' : '可探索的星图空间'),
        animation: variant === 'static' ? { requirement: 'not_required', status: 'planned', details: '使用静态构图', evidence: [] }
          : decision('选择后播放可跳过的星点连线；减少动态时直接显示结果'),
        camera: decision(variant === 'static' ? '固定正交镜头' : '限制范围的轨道镜头'),
        interaction: decision('触摸或键盘明确选择对象'), feedback: decision('显示选中轮廓和文字反馈'),
        confirmation: decision('点击确认后保存；镜头运动不参与评估'), recovery: decision('恢复服务端已确认答案'),
        report: decision('固定文本报告，承接商品意象'), accessibility: decision('键盘、文字说明和减少动态'),
        fallback: decision('图形失效时使用同题文字回退并允许重试'), resources: decision('内置几何体，不加载外部模型'),
      },
      budgets: { devices: ['desktop', 'ios_safari', 'android_chrome'], maxRendererGzipBytes: 245760,
        maxTotalResourceBytes: 1048576, maxFirstFrameMs: 5000, maxPixelRatio: 1.5, maxCanvasPixels: 1500000,
        maxTriangles: 14000, maxDrawCalls: 48, minFps: 30 },
      sources: [],
    },
  };
}
