# O4 未启用运行配置 · 具体设计审核

2026-10-23。O3指定正式三图已获[独立批准](../production-recovery-o3-formal-20261023/APPROVAL.md)，当前按既有顺序准备O4。**本轮仅实码核查、最小契约和具体交互原型，停在O4-A新设计审核；正式保存/API/页面、配置迁移尚未实现。** O3原技术pending与24份原产物保持。

[打开交互原型](http://127.0.0.1:5187/)（本机静态预览） · [主能力契约](../../../prd/v1/PLATFORM-BUSINESS-ACCEPTANCE.md#o4-c-能力保存一份未启用的运行安排) · [任务清单](../../../prd/v1/tasks/T14-mcp-ingestion.md) · [原型检查结果](verification.json)

页面明确标记“设计预览/仅内存”：所有保存、复制与JSON导出只进入内存替身，刷新清空；没有业务API、真实授权、系统剪贴板或外部调用。当前日期、数量、目录、来源、方法、连接和费用均为合成演示，不能当用户已经选择或批准的实际运行参数。

## 本次设计

沿用B精密工具紫：暗色底、细边框、稀疏紫色操作、一条业务导航选中、运营区域独立滚动。入口拟放在Codex连接下的“运行配置草稿”；已存草稿详情与只读历史分开，六步编辑保持同一份未保存修改。

| 步骤 | 用户能核对的内容 |
| --- | --- |
| 范围与客户端 | 既有工作区/连接、客户端与私有本机目录、固定商品/计划；新题目无S0–S2产物时保持未就绪 |
| 时间与产量 | 单次/每日/每周、本地日期时间、IANA时区、结束日期、数量及错过/重叠处理；不自动补跑或选择夏令时偏移 |
| 来源与输入 | 国内/国际来源、语言、地址、新鲜度与有界检索；未知发布时间不当新鲜，缺来源不产出或交人工 |
| 方法与分工 | 题目/报告分别固定用途，单任务或按领域分工；已有回执固定摘要，未来上游仅声明等待条件 |
| 工具与限制 | 明确工具允许状态、费用已知/未知、次数/时长、总与阶段限制、原jobId/暂停/恢复规则 |
| 核对与导出 | 字段齐备只说明可供审核，外部环境始终未验证；缺项清单无制作步骤，完整清单也始终未启用 |

设计样例演示4类交付；正式实现仍按真实计划的模块/领域与用途读取，兼容既有可选体验域，不把样例数量写成平台硬限制。所有角色共享固定计划与共同设定，只交换必要回执，不各自重复创建run。

## 三张主要画面

桌面1600×1100、手机390×844（模拟视口，非真机）。

![O4桌面：运行配置草稿总览](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/external-run-configuration-o4-20261023/desktop-overview.png>)

![O4桌面：固定方法、领域分工与依赖](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/external-run-configuration-o4-20261023/desktop-task-handoff.png>)

![O4手机：核对未启用交接清单](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/external-run-configuration-o4-20261023/mobile-export-confirm.png>)

## 其他页面和状态

| 页面/状态 | 设计图 |
| --- | --- |
| 空白新建与已有范围 | [空白草稿](desktop-blank-draft.png) / [客户端与范围](desktop-client-scope.png) |
| 时间与时区 | [桌面时间](desktop-timing.png) / [无效时间](desktop-invalid-time.png) / [手机时间](mobile-timing.png) |
| 来源与输入 | [国内/国际来源](desktop-sources.png) / [新题目准备](desktop-new-topic-preparation.png) |
| 固定方法与上游 | [方法和依赖](desktop-methods-dependencies.png) / [手机分工](mobile-task-handoff.png) |
| 工具与限制 | [工具/阶段限制](desktop-tools-limits.png) / [未批准工具](desktop-unapproved-tool.png) / [固定依据失效](desktop-reference-blocked.png) |
| 保存与历史 | [历史只读](desktop-history.png) / [保存失败](desktop-save-failure.png) / [并发冲突](desktop-save-conflict.png) / [响应丢失](desktop-save-unknown.png) |
| 核对与交接 | [桌面核对](desktop-review.png) / [桌面交接](desktop-handoff.png) / [待补项清单](desktop-incomplete-handoff.png) / [导出前变化](desktop-export-conflict.png) |
| 手机等价入口 | [总览](mobile-overview.png) / [客户端](mobile-client.png) / [核对](mobile-review.png) / [运营滚动](mobile-operating-scroll.png) / [360px交接](mobile-narrow-handoff.png) / [空列表](mobile-empty.png) |

## 技术和业务界线

28项原型交互检查、29张图通过；页面错误、HTTP请求、业务写入、系统剪贴板写入、实际下载均0。包括不代填未知值、显式新建、时间/时区/DST、最小依赖、两专业用途、领域分工、未知费用、越界、引用失效、新题目引用清空、追加历史、故障/冲突/原请求恢复、导出再核对、目录默认隐藏、手机/窄屏/焦点/滚动和刷新清空。主要桌面/手机图已目视检查；具体记录见[verification.json](verification.json)。

这不是O4正式API、数据库保存、真实Auth、客户端配置、工具权限、正常限流或真机验收。最近正式实现的488项、17个O3页面情境、57项旧回归与旧数据保全沿用[O3工程证据](../production-recovery-o3-formal-20261023/README.md)，本轮未重跑，也不作为O4已保存的证明。正式非Markdown源码与商城/消费者前端保持本批基线，仍71模型/25迁移；本轮无业务库读写或迁移。

未来持久化拟用稳定配置容器＋不可变修订两模型及一份向前迁移，保存不完整合法草稿、刷新回读、并发保护、幂等和审计由服务端实现。方案尚未应用，设计批准后才编写。新鲜来源未知/工具未准/费用未知保持未就绪；平台字段齐备也不代表外部可执行。审核文件无凭据，目录默认不带出，二进制原件另取；没有客户端配置文件、shell/cron命令或可启用的日程指令。

当前只审核这些界面和交互，不批准演示时间、预算或工具。O4-A通过后再逐项正式实现与隔离验证，并有新的O4-UI验收；W3内容生成/W6模型比较继续暂停，W4真实全链和无人值守保持未通过。完整保全/批准核对在`.local/o4-planning/verification.json`，不暂存/提交/推送或跨线程回信。
