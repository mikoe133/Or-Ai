# 02 · 让全部商品 Skill 的 Three.js 要求在服务端生效

任务标识：T13.C2。状态：实施中。队列：主线。更新：2026-10-27。

## 目标与现状

五库七用途的默认正文已经声明 Three.js，编辑页有补入入口，MCP 工具说明也已同步；现在任意 JSON/MCP 保存仍可能绕过这条制作规则。历史 manifest、方法快照及摘要必须继续按原样可读。

## 前置与执行位置

硬前置：[01 商品规划合同（已完成）](../archive/completed/01-product-plan-contract.md)。

原编号覆盖：`T13.C2`；范围拆分见[编号映射](../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/STYLE-SKILLS.md](../../../../prd/v1/STYLE-SKILLS.md)
- [prd/v1/SKILL-BINDINGS.md](../../../../prd/v1/SKILL-BINDINGS.md)
- [packages/contracts/src/product-policy.ts](../../../../packages/contracts/src/product-policy.ts)
- [packages/contracts/src/skills.ts](../../../../packages/contracts/src/skills.ts)
- [packages/contracts/src/skill-bindings.ts](../../../../packages/contracts/src/skill-bindings.ts)
- [apps/api/src/operations/skills.service.ts](../../../../apps/api/src/operations/skills.service.ts)
- [apps/api/src/operations/skill-bindings.service.ts](../../../../apps/api/src/operations/skill-bindings.service.ts)
- [apps/api/src/operations/project-production.service.ts](../../../../apps/api/src/operations/project-production.service.ts)
- [apps/api/src/operations/machine-content.service.ts](../../../../apps/api/src/operations/machine-content.service.ts)

## 实施步骤

### 本批实现合同（2026-10-27）

- 新写入使用 manifest v2，内含严格的 `productPolicy` v1：Three.js 基线、适用全部声明用途、必填 v2 `product-plan` 输入及按固定商品规划决定具体玩法。共同正文和每个声明用途的专业条款同时检查；不向全局方法写商品 ID。
- v1 manifest 仍按原字段顺序解析、读取和导出。新建、保存、复制、审核和启用复用同一服务端门禁；复制历史版本时显式提交升级后的新清单，历史固定版本不变。
- 实际绑定使用单独版本化的 `productPlanInput`，固定计划修订/摘要、模块修订/摘要及形式；用途和精确方法版本仍由原绑定字段承载。新商品组合及体验方法把该输入写进原有固定快照；没有该字段的历史快照保持原样。项目方法已具备固定计划/模块归属，复用该归属校验。
- 新绑定/使用拒绝缺计划、v1 计划、商品或 scope 不符、设定不符、模块不符、摘要或当前修订过期、用途/形式不符、政策不合规的方法。历史读取、导出和已固定恢复回执不经过新写入门禁；发布完整性留给03。
- 后台显示缺项；补入政策、复制升级和选定计划需保留本地未保存内容。API 与 MCP 调用相同服务；导入旧 JSON 只表示可读，不表示可用于新制作。

- [ ] T13.C2.1 在任务01的规划合同上定义可验证的 Skill 政策版本/结构，明确适用五库七用途、Three.js 基线及必填商品规划输入的声明；全局可复用 Skill 不绑定某个商品 ID 或具体规划修订，不能只用正文关键词或单个 supportedForms 值认定合规。
- [ ] T13.C2.2 保留明示的正文条款，与结构化政策共同检查；不替换各专业用途的方法，报告/媒体按其媒介承接商品。
- [ ] T13.C2.3 统一网页与 MCP 的新建/保存/复制/审核/启用检查；在新商品组合或项目方法捕获/使用时，才要求绑定实际商品的规划修订、用途、形式和精确方法版本。声明输入与提供实际输入分别验证。
- [ ] T13.C2.4 固定旧 manifest 的读取和历史恢复路径；新增合规版本需要新 ID/修订与摘要，禁止修改原快照后沿用原 digest。
- [ ] T13.C2.5 后台给出缺项及复制升级/修复入口，保留未保存输入；服务端返回同一明确错误，导入成功不代表政策已满足。
- [ ] T13.C2.6 逐项列清执行边界：兼容读取不受新规则追溯阻断；新正式商品不得靠旧组合或候选方法绕过校验。

## 验证与证据

- 每个领域验证新建/保存：缺政策、正文缺条款、缺必填规划输入声明均拒绝；合规全局 Skill 在尚无具体商品时仍可保存。再验证商品/项目新绑定缺实际规划、错用途/旧修订/跨 scope 均拒绝；报告写作及报告呈现分别覆盖。
- 测试旧 Skill/归档版、历史组合/采用包/恢复回执继续可读；有真实固定引用的旧方法不能被静默重写。
- 运行相关 skills、machine、experience-authoring、project-production 集成，web/MCP 及类型检查；补网页/MCP同规则验收。

本任务实施中，退出条件尚未通过。当前先增加并实际运行合同与真实 HTTP 的 RED 测试，再实现统一政策与绑定校验。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成条件

七用途的共同要求无法通过直接 API、MCP 或新绑定绕过；旧历史仍可读，错误可修复，摘要/引用不漂移。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

关闭新的采用/绑定入口并保留历史；修复新规则后再恢复，不靠放宽旧权限或覆盖 ACTIVE 版本解决。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

