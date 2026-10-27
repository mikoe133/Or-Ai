# 16 · 按商品需要选择并实现首个新玩法

任务标识：T17。状态：待玩法选型。队列：按需插入。更新：2026-10-26。

## 目标与现状

当前真实运行协议仍是 single_choice_v1/dimensions_v1。Three.js 必选并不意味着排序、分配、分支、动作或计时已经支持。本任务在某款商品确需新输入时插入任务05之前，不强制首款商品开发小游戏。

## 前置与执行位置

硬前置：[01 固定每款商品的 Three.js 制作规划](01-product-plan-contract.md)、[02 让全部商品 Skill 的 Three.js 要求在服务端生效](02-skill-policy-validation.md)、[03 接通项目制作链与 Three.js 发布校验](03-threejs-publication-gates.md)。所选玩法的协议设计可以提前准备，正式制作/绑定/发布沿用统一门禁。

原编号覆盖：`T17.1`、`T17.2`、`T17.3`、`T17.4`、`T17.5`、`T17.6`、`T17.7`、`T17.8`；范围拆分见[编号映射](../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/EXPERIENCE-PLATFORM.md](../../../../prd/v1/EXPERIENCE-PLATFORM.md)
- [prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md](../../../../prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md)
- [packages/contracts/src/product-configuration.ts](../../../../packages/contracts/src/product-configuration.ts)
- [packages/contracts/src/experience.ts](../../../../packages/contracts/src/experience.ts)
- [apps/api/src/runtime/attempts.service.ts](../../../../apps/api/src/runtime/attempts.service.ts)
- [apps/api/src/runtime/reports.service.ts](../../../../apps/api/src/runtime/reports.service.ts)

## 实施步骤

- [ ] T17.1 先明确首个玩法的情绪/理解目标、输入、操作/确认、完成与解释依据；首期排序或分配选一种，具体选择仍待产品确定。
- [ ] T17.2 注册严格版本化答案/事件 schema 与独立 engine key，不向旧 v1 塞任意JSON或把复杂行为挤成optionId。
- [ ] T17.3 实现服务端合法性/完整性：排序无重复/遗漏，或分配总量/边界；若选分支须独立定义可达与该路径完成，客户端不能自报完成/分数。
- [ ] T17.4 实现可重复评估、结果/报告、不适用规则、原子完成/消费/贡献及幂等并发。
- [ ] T17.5 保存权威任务/答案快照、修订/事件序号，支持暂停/刷新/断线/过期/撤权；计时只有另定服务端起止和精度后才加入。
- [ ] T17.6 定义专属群体反馈/分母/版本分组与不足策略，没有可比单选分布时明确不适用，不伪造百分比。
- [ ] T17.7 接入实际 Three.js 模板、受保护编辑入口和合规 Skill；动画/镜头按该商品规划，不执行任意上传脚本。
- [ ] T17.8 在真实隔离本地业务库完成新玩法边界、伪造/陈旧/重复输入、预算/路径约束、恢复、并发完成/消费、统计和原商品回归；未选玩法逐项保持待开发。

## 验证与证据

- 覆盖输入边界、伪造/陈旧/重复事件、约束、恢复、并发完成、统计、消费/退款，以及原单选商品/报告完整回归。
- 实际本地业务与 Three.js 操作联调；真实设备最终按任务10验，其他未实现玩法继续待开发。

本任务未开始，以上为执行要求，不是已有测试结果。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成条件

一个明确玩法的协议/后端/前端/报告/统计及恢复证据全部通过；不能据此宣称支持任意游戏、多人实时或无报告交付。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

禁用新 engine/模板的新采用，保留已锁定版本与兼容读取；不把新答案强行迁回旧单选计分。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

