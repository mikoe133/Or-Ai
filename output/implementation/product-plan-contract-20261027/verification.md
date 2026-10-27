> 2026-10-27后续：用户已授权把当前项目全部安全改动提交并正常推送，覆盖此前“仅01/261候选/不push”的范围限制。下文提交待确认与最小化建议保留为授权扩大前的历史分析，不再是执行限制。实际存档结果以本轮Git回执为准；555项技术证据保持。

# 01 商品规划合同：实际验证

日期：2026-10-27（Asia/Shanghai）。标识 T16.C2-A。技术实施与验收已完成；追加的本地 Git 提交因历史基线范围待确认而尚未完成。555 项验证针对当前工作树，不能替代待选 Git 快照的复验。任务02已满足技术前置，本报告不表示02已经实施。

## 本批实现

- 原 CreativeProfileRevision 保存价值/世界观；原 ProductionPlanRevision 的严格 v2 productPlan 保存 Three.js、视觉维度、十一项制作决定和预算；模块继续唯一拥有 renderer/report/评估配对，实际资源仍由发行清单持有。
- required/not_required/undecided 与 unplanned/planned/implemented/verified 分开。实现/验证依据是作者申报，检查不会执行或认证场景。静态构图合法，不默认选择花园。
- 固定来源只接受同商品/scope 的不可变内容、体验版本与方法快照；校验精确摘要、已知共同设定和方法领域。引用方法来源不等于新模块已捕获或使用。
- 原 API/MCP 同一保存服务、修订/权限/事务/幂等；后台编辑、差异、待定提示、历史只读、草稿导出及恢复。运行选择器同时比较 renderer/report 版本与输入/评估协议。
- 保留旧 v1 严格字段与 JSON 规范化顺序，避免影响历史摘要及相同请求重试；不改旧快照或批量补规划。

## 最终自动验证

| 检查 | 实际结果 |
| --- | --- |
| 全工作区 pnpm test | API 434＋web 101＋MCP 20＝555；全部通过，零跳过/失败 |
| pnpm typecheck | contracts/API/web/MCP 全部通过 |
| pnpm build | 全部通过；既有 Three.js 动态依赖与渲染模块字节门禁通过 |
| 新合同与规划模型覆盖率 | 行100%，分支88.97%，函数96%；只统计所列核心文件，不冒称整个仓库覆盖率 |
| 引用校验服务覆盖率 | 行100%，分支95.65%，函数100%；21项计划 API 回归通过 |
| 最后两项修正 | v1规范化顺序回归及精确运行配对用例纳入上述555；改后界面另行复验 |

原始日志保存在 `.local/t16-c2a-20261027/`：tests-verified.log、typecheck-verified.log、build-verified.log、coverage-contracts.log、coverage-api.log。RED日志分别记录合同缺失、数据库仅支持v1、默认规划旧版、恢复判断和运行选择缺失、v1顺序差异；修复后复验通过。遵循当时不自动提交的边界，先保留RED/GREEN日志，收到本地提交要求后进入独立范围核对。

## 自主交互验收

[19项检查](browser-checks.json)全部通过；[最终官方MCP回读](browser-mcp-plan.json)与后台保存的同一计划ID/修订/摘要相同。全部使用 CUA 与真实既有本地 Auth，业务写入隔离 TEST 库，无身份注入、终端浏览器自动化或真实生成。

覆盖旧v1显式升级、静态无动画、待定保存、缺验证依据拒绝、未应用JSON阻止保存及原文导出、刷新/历史只读、提交后丢响应同请求恢复、并发冲突保留草稿、小屏编辑保存、撤权关闭工作区且不新增修订、错误renderer版本/报告配对显示为自定义及正确配对保存。390×844 为浏览器响应式检查，不是真机性能验收；截图均为自主检查，未记作用户批准。

截图：desktop-final.png、desktop-draft.png、response-loss.png、revision-conflict.png、mobile-overview.png、mobile-edit.png、permission-revoked.png、runtime-pair-mismatch.png、runtime-pair-saved.png。三次有效交互场景的临时业务库、服务和TEST凭据均已回收，视口复原，临时标签关闭。

## 本地数据与迁移

新增唯一向前迁移 `20261027010000_product_plan_contract`，为原计划CHECK增加v2及固定来源守卫；无新表/列或扩大运行账号权限。隔离验证通过后，本机 DEVELOPMENT 库迁移由26升至27份；73张业务表、1508行原记录逐表JSON摘要完全一致，前26份迁移checksum不变。未reset或重播开发seed；未向开发库新增测试商品/Skill/计划/凭据。TEST库只在自身创建/清理。

## 提交与后续范围

[提交核对](git-readiness.md)、[机器清单](commit-dependencies.json)、[精确源码增量](task01-source-increment.patch)独立保留。11份被修改的既有源码精确还原到任务起点SHA-256，新源码7份；补丁应用检查通过，但它不是可复现的Git代码提交。当前HEAD缺10个直接底座文件和更多传递依赖。未暂存、提交、推送或新建分支/重建工作树。

Skill服务端政策、正式发布门禁、存量升级仍留任务02/03/04/05。没有真实云部署、新服务上传、模型/媒体生成、全商品转制、公开发布、交易、自动化启用或持续权限扩大。
