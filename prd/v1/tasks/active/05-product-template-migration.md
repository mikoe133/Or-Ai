# 05 · 按各商品规划制作模板并转制存量商品

任务标识：T16.C3。状态：A实际制作链与B独立模板/报告及自主CUA通过；正式商品与存量转制待做。队列：主线。更新：2026-10-28。

最新[合成技术批次](../../../../output/implementation/product-template-migration-20261028/verification.md)通过635项、类型/构建及26项CUA；[只归档该子批次](../archive/completed/05-06-synthetic-template-slice-20261028.md)。原商品没有转制，新迁移只用于TEST，05父任务继续未完成。以下准备阶段盘点/预算原记录按当时事实阅读。

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

- [x] T16.C3.1 只读盘点所有计划继续使用的商品/版本，区分正式候选、演示/历史和不再采用；列出每款的规划、Skill、renderer、原件/资源、报告和宣传缺口。当前7商品/10版本均为DEMO，没有默认选为正式；实际保留/首个转制选择仍明确待决定。
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

2026-10-28只读盘点已完成，见[本批记录](../../../../output/implementation/product-template-migration-20261028/README.md)与[逐版本清单](../../../../output/implementation/product-template-migration-20261028/inventory.json)。7个商品/10个版本均为演示，已有5份DOM发布清单、0 Three.js release、0体验制作修订、0当前v2商品规划；原数据没有修改。首个商品偏好尚未回复，但不构成技术准备的阻塞：07本地范围收尾后自行安排非正式合成规划、差异模板与06技术验证；不把旧小屋、DEMO或合成草案认定为用户认可的正式商品。04新方法草稿仍未启用，两个空体验用途须按商品补专业方法。步骤2–7仍未完成，不因盘点归档05。实施沿用当前框架、权限与数据卷，隔离TEST/CUA验证，商城视觉、分支和历史文件保持；全站去AI味需求独立记入17，不在本任务顺手改造商城。

## 完成条件

2026-10-28前期[准备合同](../../PRODUCT-TEMPLATE-PREPARATION.md)与[只读结果](../../../../output/implementation/product-template-migration-20261028/technical-preparation-verification.json)作为原始输入保留。其后A/B实际仓库实现、隔离制作/方法/原生产物/消费者链与26项CUA已通过，详见本页顶部最新批次。原JSON仍为planned，未绑定为正式商品；剩余2–7的正式商品处置、专业方法/媒体和完整性能另行接续，不把本批TEST发布记成真实上线。

所有计划继续使用的商品都已转制或明确保留待决缺口；被遗留的商品不能默认算合规。新模板及配套引用真实，正式内容与真机仍交后续专项验收。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

停用新商品版本/模板的发布入口，旧固定版本继续服务历史权益；不删除引用中的资源或回写旧结果。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

