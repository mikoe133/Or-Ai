# 05 · 按各商品规划制作模板并转制存量商品

任务标识：T16.C3。状态：等待前置。队列：主线。更新：2026-10-26。

## 目标与现状

已实现的 Three.js 花园只支持 2–4 选项的明确单选，不能代表任意动画、模型或游戏。用户要求全部商品使用 Three.js，但每款商品的世界观、节奏和玩法由其规划决定；原 DOM 小屋仅保留历史样本。

## 前置与执行位置

硬前置：[01 固定每款商品的 Three.js 制作规划](01-product-plan-contract.md)、[03 接通项目制作链与 Three.js 发布校验](03-threejs-publication-gates.md)、[04 盘点并前向升级旧 Skill 和项目方法](04-skill-library-upgrade.md)。

原编号覆盖：`T16.C3`；范围拆分见[编号映射](../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md](../../../../prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md)
- [prd/v1/EXPERIENCE-PLATFORM.md](../../../../prd/v1/EXPERIENCE-PLATFORM.md)
- [packages/contracts/src/experience.ts](../../../../packages/contracts/src/experience.ts)
- [apps/web/src/experience/host.tsx](../../../../apps/web/src/experience/host.tsx)
- [apps/web/src/experience/garden-renderer.ts](../../../../apps/web/src/experience/garden-renderer.ts)
- [apps/api/src/catalog/experience-authoring.ts](../../../../apps/api/src/catalog/experience-authoring.ts)
- [apps/web/src/admin/content-experience.tsx](../../../../apps/web/src/admin/content-experience.tsx)

## 实施步骤

- [ ] T16.C3.1 只读盘点所有计划继续使用的商品/版本，区分正式候选、演示/历史和不再采用；列出每款的规划、Skill、renderer、原件/资源、报告和宣传缺口。
- [ ] T16.C3.2 按商品目标确定模板：可以复用已验证的兼容呈现，也可新增真实 Three.js 模板；视觉/动画参数与输入协议分别固定，不强制同一花园或固定动作。
- [ ] T16.C3.3 新增模板按实际内容/资源/设备预算注册、独立懒加载，保留键盘/触摸/减少动态和同内容回退；任意 JS 包执行或模型上传能力必须另行受控实现。
- [ ] T16.C3.4 需要排序/分配等新答案时先插入任务16，未实现前保留草稿；不把动作/路径塞进 optionId 冒充评估支持。
- [ ] T16.C3.5 以新商品版本固定规划、内容/评估、模板/资源、方法和结果呈现；旧权益/答卷仍锁定旧版，不批量迁移个人进度或改分。
- [ ] T16.C3.6 核对报告承接与待复查传播素材来源；实际内容生成暂停时只完成结构与合成测试，正式成套内容移交任务11，不把样例当正式商品。
- [ ] T16.C3.7 转制采用/发布走任务03的门禁；执行前给出明确对象、差异和恢复方案，不自动上架所有草稿。

## 验证与证据

- 至少用风格/场景决定不同的合成规划验证模板能力按规划生效，避免仅复制标题/同一固定动画。
- 验证存量商品新版本可预览、原版本仍可恢复/读报告，源题与选项相同的评分保持一致；不同版本统计隔离。
- 运行注册表/资源预算/保存恢复/版本发布相关测试及 CUA 场景检查；转制清单包含每个拟保留商品的实际状态。

本任务未开始，以上为执行要求，不是已有测试结果。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成条件

所有计划继续使用的商品都已转制或明确保留待决缺口；被遗留的商品不能默认算合规。新模板及配套引用真实，正式内容与真机仍交后续专项验收。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

停用新商品版本/模板的发布入口，旧固定版本继续服务历史权益；不删除引用中的资源或回写旧结果。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

