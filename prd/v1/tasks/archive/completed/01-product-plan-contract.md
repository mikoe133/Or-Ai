# 01 · 固定每款商品的 Three.js 制作规划

任务标识：T16.C2-A。状态：已完成（技术范围）。队列：主线。更新：2026-10-27。

## 目标与现状

v2 商品规划合同、API/MCP 统一保存、后台编辑/差异、固定引用和向前迁移已实现并通过本地验收。555项全量测试、类型检查、构建及19项CUA自主检查通过；本地开发库73表1508行原数据与前26份迁移摘要保持不变。本文件归档01的技术范围，后续02/03/04/05仍各自持有Skill政策、发布门禁和存量升级。

## 前置与执行位置

硬前置：既有已验收底座，无新增硬前置。

原编号覆盖：`T16.C2`；范围拆分见[编号映射](../../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md](../../../../../prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md)
- [prd/v1/PRODUCT-CREATIVE-SYSTEM.md](../../../../../prd/v1/PRODUCT-CREATIVE-SYSTEM.md)
- [prd/v1/PRODUCTION-PLANS.md](../../../../../prd/v1/PRODUCTION-PLANS.md)
- [packages/contracts/src/content.ts](../../../../../packages/contracts/src/content.ts)
- [packages/contracts/src/production-plans.ts](../../../../../packages/contracts/src/production-plans.ts)
- [packages/contracts/src/experience.ts](../../../../../packages/contracts/src/experience.ts)
- [apps/api/src/operations/production-plans.service.ts](../../../../../apps/api/src/operations/production-plans.service.ts)
- [apps/web/src/admin/project-planning.tsx](../../../../../apps/web/src/admin/project-planning.tsx)

## 实施步骤

- [x] T16.C2-A.1 核对既有设定/计划/体验清单，确定每个字段唯一归属；新增严格版本化合同及旧版读取策略，不向严格 v1 任意补字段。
- [x] T16.C2-A.2 将实现基线固定为 Three.js；视觉维度 2D/2.5D/3D、具体场景和评估/玩法独立，不默认选择花园。
- [x] T16.C2-A.3 为动画、镜头、交互、反馈、确认和报告承接定义明确决定：需要/明确不需要/待规划，区分 planned、implemented、verified 的实际状态；静态构图可以是合法决定，待定不能冒充已交付。
- [x] T16.C2-A.4 固定内容/评估、renderer/report 配对、资源、Skill/方法、媒体来源及规划修订引用；必需设备/加载/渲染预算在制作前可核验。
- [x] T16.C2-A.5 后台接入可编辑规划与变更影响；API/MCP 共用合同、权限、修订号与幂等，新输入不覆盖旧草稿。商品内容和新规划可保存未定项，后续发布由任务03判断完整性。
- [x] T16.C2-A.6 如需要数据库变更，仅追加向前迁移，补运行账号的表/列权限；默认值不自动给存量商品伪造已确定规划。

## 验证与证据

- 覆盖合法/非法合同、待定/不需要区别、旧 schema、跨 scope、并发修订、同请求恢复、历史版本不漂移。
- 在隔离 TEST 库验证后台保存→MCP读取同一修订；用两个风格不同的合成规划证明没有固定动画或固定花园语义。
- 运行 contracts 构建、全工作区类型检查、相关计划/体验 API 集成及 web/MCP 测试；后台交互用 CUA 检查并留图。

上述技术范围已完成，证据见[本批验证](../../../../../output/implementation/product-plan-contract-20261027/verification.md)。继续沿用现有框架、权限与固定版本；浏览器均用 CUA，测试数据及临时凭据随隔离 TEST 库回收。没有真实云接入/部署、模型作业、公开发布或日程启用。

## 完成记录与源码存档

2026-10-27完成本任务技术退出。原来追加的“仅01本地提交”范围已由用户扩大为当前项目全部安全改动的完整提交及正常推送，允许包含此前未提交的源码、配置、测试、迁移、文档和项目资产；不再受01/261候选限制。该存档是独立维护动作，实际commit与远端一致性以本轮Git回执为准，不表示后续业务或上线任务完成。

[验证记录](../../../../../output/implementation/product-plan-contract-20261027/verification.md)保留本批证据；[原范围分析](../../../../../output/implementation/product-plan-contract-20261027/git-readiness.md)和源码增量仅作历史审阅证据。下一任务为[02 Skill服务端政策](../../active/02-skill-policy-validation.md)。

## 完成条件

规划可独立保存、读取、固定引用和展示差异；正常商品明确 Three.js，动画/交互由具体商品决定；未定项、旧版及权限/冲突均有证据。此任务不宣称发布门禁或存量迁移已完成。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../../README.md)与[进度](../../../PROGRESS.md)；按[归档规则](../../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

停用新规划写入口，保留已追加修订及旧读取；有迁移时向前修复，不 reset 或将旧版本批量补成已完成。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

