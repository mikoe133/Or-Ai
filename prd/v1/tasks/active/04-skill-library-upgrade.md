# 04 · 盘点并前向升级旧 Skill 和项目方法

任务标识：T13.C3。状态：可执行。队列：主线。更新：2026-10-27。

## 目标与现状

目前没有批量修改数据库中的旧 Skill。全局库、商品固定组合和项目内候选/定制方法相互独立，不能只升级全局 ACTIVE 就声称所有商品方法已升级。

## 前置与执行位置

硬前置已满足：[02 让全部商品 Skill 的 Three.js 要求在服务端生效](../archive/completed/02-skill-policy-validation.md)、[03 接通项目制作链与 Three.js 发布校验](../archive/completed/03-threejs-publication-gates.md)。

原编号覆盖：`T13.C3`；范围拆分见[编号映射](../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/STYLE-SKILLS.md](../../../../prd/v1/STYLE-SKILLS.md)
- [prd/v1/SKILL-BINDINGS.md](../../../../prd/v1/SKILL-BINDINGS.md)
- [prd/v1/PROJECT-RETENTION.md](../../../../prd/v1/PROJECT-RETENTION.md)
- [apps/api/src/operations/skills.service.ts](../../../../apps/api/src/operations/skills.service.ts)
- [apps/api/src/operations/project-method-operations.service.ts](../../../../apps/api/src/operations/project-method-operations.service.ts)
- [apps/api/src/operations/project-production.service.ts](../../../../apps/api/src/operations/project-production.service.ts)
- [apps/web/src/admin/project-methods.tsx](../../../../apps/web/src/admin/project-methods.tsx)

## 实施步骤

- [ ] T13.C3.1 提供只读盘点，按五库七用途、ACTIVE/归档/草稿、组合与项目方法列出政策缺项、专属方法需补的部分及影响引用，不读取消费者私人答卷。
- [ ] T13.C3.2 输出带预期修订/摘要和作用范围的升级预演；先用隔离样例完成全链，再对明确选中的真实对象执行。
- [ ] T13.C3.3 追加合规新草稿，保留专属正文/参数、附件与基础版本来源。全局库声明必填商品规划输入，不绑定单一商品；商品组合/项目方法在新捕获时固定实际规划修订。幂等重试不重复建稿。
- [ ] T13.C3.4 需要人工补充的动画/玩法方法留待完善，不自动伪造产品决定；审核/启用与商品/项目重绑按显式操作分别执行。
- [ ] T13.C3.5 项目有效方法快照使用新 ID/摘要；历史 ACTIVE、组合、制作记录和采用包不覆盖，不把单个新稿状态传播为全项目已合规。
- [ ] T13.C3.6 输出可恢复的迁移清单：已升级、待专属补充、待审核/重绑、跳过/不再使用，旧引用始终可定位。

## 验证与证据

- 隔离库演练有附件、定制参数、多个固定引用、归档基础方法与部分失败的升级；重复/并发执行仍唯一。
- 验证升级前后原方法、组合、产物摘要与引用不变，新方法有可审差异；越权对象不能纳入预演或执行。
- 后台检查盘点→差异→新稿→新绑定→历史返回，记录真实操作范围；未选中的商品/Skill 不变。

本任务未开始，以上为执行要求，不是已有测试结果。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成条件

应继续使用的旧库与项目方法均有明确处置和可恢复证据；需要业务决定/专属补充的对象保持待办，不能靠批量加文字就全勾完成。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

停止新方法采用/重绑，保留新草稿和原绑定；回到固定旧版本不改变既有答卷或报告。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

