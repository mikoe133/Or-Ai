# 06 · 完成 Three.js 商品本地业务与性能验收

任务标识：T16.C4-L。状态：A/B合成业务链、构建预算与恢复部分已验；首帧/FPS/内存及完整矩阵待验。队列：主线。更新：2026-10-28。

最新[实际技术验证](../../../../output/implementation/product-template-migration-20261028/verification.md)通过635项、类型/构建及26项自主CUA；仅关闭下列已证实的A/B合成范围，不认定全部05/06、真机或正式商品通过。

## 目标与现状

T16-B 已有浏览器样例和隔离 API 证据，但模板扩展和新政策会改变完整制作链。此任务只关闭新增商品的本地功能/预算部分；真实手机与公网验收由任务10完成，不能把整个 T16.C4 或 T16.5–.8 提前关闭。

## 前置与执行位置

硬前置：[05 按各商品规划制作模板并转制存量商品](05-product-template-migration.md)。

原编号覆盖：`T16.C4`、`T16.5`、`T16.6`、`T16.8`；范围拆分见[编号映射](../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [output/implementation/t16b-threejs-20261026/verification.md](../../../../output/implementation/t16b-threejs-20261026/verification.md)
- [prd/v1/EXPERIENCE-RUNTIME.md](../../../../prd/v1/EXPERIENCE-RUNTIME.md)
- [apps/api/test/experience.test.ts](../../../../apps/api/test/experience.test.ts)
- [apps/api/test/experience-authoring.test.ts](../../../../apps/api/test/experience-authoring.test.ts)
- [apps/web/test/garden.test.ts](../../../../apps/web/test/garden.test.ts)
- [apps/web/src/experience/host.tsx](../../../../apps/web/src/experience/host.tsx)
- [apps/web/vite.config.ts](../../../../apps/web/vite.config.ts)

## 实施步骤

- [ ] T16.C4-L.1 为每个实际启用模板固定目标设备/浏览器、冷启动/加载、资源体积、像素/DPR、draw calls/三角形、内存/运行稳定性与回退合格阈值；未测不填成绩。
- [x] T16.C4-L.2 A/B隔离TEST真实本地服务链执行兑换→场景选择/明确确认→保存冲突/重试→刷新恢复→报告→一次消费→退款撤权，固定实际新版本模板；CUA另核对匿名答题与报告，不冒称真实云账户或正式交易。
- [ ] T16.C4-L.3 模拟可控制的模块/图片加载失败、无 WebGL、context 丢失/恢复、网络断开、隐藏/卸载和资源释放，保留已确认及当前未确认输入。
- [ ] T16.C4-L.4 测试键盘、指针拖动与点击区别、减少动态、窄屏长文和不适用/null 结果；相机/动画不改变答案和评分。
- [x] T16.C4-L.5 A/B构建自动约束独立懒加载和每模板完整依赖gzip预算，商城首屏不引入整套 Three.js；报告不在客户端重新评分。
- [ ] T16.C4-L.6 输出本地通过与任务10待验的实机清单，留下具体机型/网络测试要求；发现问题修复后只回归相关范围。

## 验证与证据

2026-10-28已形成[05/06技术准备合同](../../PRODUCT-TEMPLATE-PREPARATION.md)：两种有差异的合成规划、renderer/资源/首帧/DPR/canvas/三角形/draw calls/活动帧率目标，以及确认/冲突/断网/WebGL/context/释放/撤权/历史恢复矩阵。两份原合同保留planned；其后实际A/B实现、业务/构建与26项CUA已经验证，下列未测首帧/FPS/内存和设备范围仍不填通过成绩。1440/768/390视口与真机范围分别持有。

- 重跑受影响模板/能力/Skill与完整运行链的 API/web/MCP 测试、类型和构建，必要时对迁移做隔离结构/数据保全。
- 浏览器操作使用 CUA 并保留前后端实际版本/场景/失败恢复截图；开发机或模拟视口明确标注。
- 检查原商品/报告读取、服务器评分、统计、消费、权限及退款的旧回归。

本任务A/B合成业务链与构建预算已通过，恢复/键盘/窄屏/不适用部分已有CUA证据；首帧/FPS/内存与剩余矩阵仍待完成。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成条件

本地 Three.js 技术与业务链可重复通过，预算不超标，旧数据不变；真机、公网及正式商品情绪/内容价值尚未通过时明确交给任务10/11。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

禁用新模板入口/新发布，保留原固定版本与资源；按失败情境修复，不以取消确认、重置答卷或忽略 WebGL 错误过验收。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

