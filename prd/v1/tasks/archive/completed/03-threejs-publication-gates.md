# 03 · 接通项目制作链与 Three.js 发布校验

任务标识：T16.C2-B。状态：已完成（技术范围）。队列：主线。更新：2026-10-27。

## 目标与现状

花园 renderer/report 已注册，但普通 DOM 默认发布技术路径仍存在；项目体验制作稿登记还有 target.form 必须为 web 的历史分支。需要以真实注册能力和固定商品规划统一项目、体验、采用和发布检查。

## 前置与执行位置

硬前置已满足：[01 商品规划合同](01-product-plan-contract.md)、[02 Skill服务端商品政策](02-skill-policy-validation.md)。02已校验新方法绑定/使用的实际规划；本任务继续负责原件/制作稿配对、审核、采用与正式发布完整性。

原编号覆盖：`T16.C2`；范围拆分见[编号映射](../../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/EXPERIENCE-PLATFORM.md](../../../EXPERIENCE-PLATFORM.md)
- [packages/contracts/src/product-capabilities.ts](../../../../../packages/contracts/src/product-capabilities.ts)
- [apps/api/src/operations/production-plan-inspection.ts](../../../../../apps/api/src/operations/production-plan-inspection.ts)
- [apps/api/src/operations/project-production.service.ts](../../../../../apps/api/src/operations/project-production.service.ts)
- [apps/api/src/operations/content-packages.service.ts](../../../../../apps/api/src/operations/content-packages.service.ts)
- [apps/api/src/operations/experience-authoring.service.ts](../../../../../apps/api/src/operations/experience-authoring.service.ts)
- [apps/api/src/catalog/experience-authoring.ts](../../../../../apps/api/src/catalog/experience-authoring.ts)
- [apps/api/src/catalog/versions.service.ts](../../../../../apps/api/src/catalog/versions.service.ts)

## 实施步骤

- [x] T16.C2-B.1 把项目体验制作稿的 web-only 条件替换为共享注册能力校验，验证 Three.js 配对、内容/规划修订、原件与 authoring 清单的用途区别；不能只删除条件。
- [x] T16.C2-B.2 逐入口核查：项目方法/产物登记、体验保存/审核、成套采用、默认/自定义发布以及受控管理命令都使用同一政策检查。
- [x] T16.C2-B.3 新正式商品必须有实际注册的 Three.js 场景与完整固定规划、匹配 Skill/报告/资源；普通网页、无体验稿、空白 Canvas 和未实现玩法不能凭枚举或客户端自报通过。
- [x] T16.C2-B.4 未定动画/交互可保留在草稿；阻止其被当作正式已交付能力发布。正常 Three.js 与必要 DOM 文字/无障碍/故障回退分别校验。
- [x] T16.C2-B.5 区分注册兼容、内容审核与设备/商品验收，精确固定被审核的规划、方法和清单，不把兼容检查等同于已验收。
- [x] T16.C2-B.6 旧已发布商品/权益/答卷/报告继续按原锁定版本读取与恢复；旧正式商品升级走任务05，不追溯改写历史。

## 验证与证据

- 用真实 API/SDK 走 Three.js 计划→方法→制作稿/原件→审核→采用→发布；验证 web-only 缺口已修复。
- 逐个验证绕过：直接版本发布、无体验稿默认发布、错报告配对、过量/损坏资源、缺政策方法、伪装正常体验均拒绝。
- 测试并发审核/发布、被替换修订、真实 INSERT 失败回滚，以及旧商品/报告/退款恢复回归。

本任务本地技术退出已通过：581项完整测试、类型/构建、24项离线检查、7项实际本地恢复和17项自主CUA；开发库73表1508行原内容保持，前向迁移27→29。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成记录

2026-10-27完成，证据见[本批验证](../../../../../output/implementation/threejs-publication-gates-20261027/verification.md)。已按共享注册能力接通项目制作、审核、采用和发布；新采用清单为v3，历史v1/v2及旧权益/报告保持。前向迁移只新增规划输入和数据库完整性约束；未升级真实旧库或商品、未执行公开发布。04旧Skill升级的硬前置已满足。UI为自主验收，不记为用户批准。

## 完成条件

所有新正式发布路径使用统一规则，合法 Three.js 完整链可通过，旧兼容读取仍通过；不能靠界面隐藏或文档承诺满足退出条件。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../../README.md)与[进度](../../../PROGRESS.md)；按[归档规则](../../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

禁止新政策商品发布并保留新旧历史，回退应用入口；数据库仅向前修复，不重新开放绕过路径。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

