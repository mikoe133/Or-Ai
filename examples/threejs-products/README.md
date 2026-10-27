# Three.js 商品 Skill 起始模板

2026-10-26。对应[统一实现规范](../../prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md)，五库七用途全部明确：商品正常体验必须使用 Three.js，动画/镜头/交互以每款商品的固定规划为准。模板不预设所有商品都是静心花园，也不提供尚未实现的玩法。

| 库 | 用途与可导入清单 |
| --- | --- |
| assessment | [题目与规则](skills/assessment_design.skill.json)、[报告写作](skills/report_writing.skill.json) |
| cover | [封面](skills/cover_design.skill.json) |
| video | [视频与分镜](skills/video_production.skill.json) |
| copy | [文案](skills/copywriting.skill.json) |
| experience | [场景与交互](skills/scene_design.skill.json)、[报告呈现](skills/report_presentation.skill.json) |

每份均为现有严格 v1 manifest，必填输入为共同设定 `creative-profile` 与固定商品规划 `product-plan`。索引见 [skill-index.json](skill-index.json)。在对应后台 Skill 库导入 JSON 后，补充该方法的具体步骤、风格、参考和示例，再按正常流程保存/审核；这些只是起始模板，不是已执行或已启用的方法。

旧 Skill 需复制新版本再升级；后台“补入 Three.js 商品要求”可对当前草稿追加共同条款和规划输入，保留专属正文及引用。任意导入仍可包含不合规文本，不能把导入成功等同于发布政策已检查；服务端统一门禁列在 T13.C2/T16.C2。

所有模板已通过平台 schema 校验。本批未向数据库批量导入、启用或绑定，不改写 `social-battery-room` 的原 DOM 历史样本。

## 商品规划合同样例

2026-10-27新增两份严格 v2 的合成规划：[静态纸片展厅](plans/static-plan.json)、[带动画的星图](plans/animated-plan.json)。两者均明确 Three.js，但动画、镜头和视觉维度各自决定。占位 profile ID 和 `synthetic-*` renderer 只用于合同测试，不能直接视为可运行商品；导入前需替换为同商品真实设定和已规划模块/来源，实际能力另行验证。

字段唯一归属、版本策略与作者申报依据的含义见[制作规划](../../prd/v1/PRODUCTION-PLANS.md#2026-10-27t16c2-a-商品规划合同)。这些样例是人工静态验收数据，不是恢复已暂停的实际内容/媒体生成。
