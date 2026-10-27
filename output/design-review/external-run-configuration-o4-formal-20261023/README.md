# O4 运行配置 · 正式界面验收

2026-10-23。按[已批准的O4设计](../external-run-configuration-o4-20261023/APPROVAL.md)接入正式持久化、校验、导出和桌面/手机页面。**正式UI仍待独立验收，整体O4/T14/W4未关闭。** 原型35份原产物及原README/verification的pending保持；本批批准和正式证据分开保存。

正常入口：[Codex连接](http://127.0.0.1:5173/admin/machine)→“运行配置草稿”，或直接访问[配置页面](http://127.0.0.1:5173/admin/machine/configurations)。以下图像来自隔离TEST业务库和身份替身；测试样例自动回收，开发库没有本轮配置、授权或持续可访问的样例URL。

## 已实现的业务

- 配置真实保存到稳定容器与不可变修订表。允许保存合法的不完整草稿，客户端、时间/时区、数量、来源/费用等未知值保留null；刷新回读，旧修订只读，不覆盖历史。
- 保存以当前管理员、scope和工作区归属校验，不能转移归属、夹带其他工作区连接或替换成其他商品方法。expectedRevision、配置锁、requestId及稳定clientKey保护并发和真正重试；SQL故障全部回滚，失败或成功响应丢失用原请求恢复，不重复追加。
- 服务端单独核对当前修订、计划头、精确方法/用途、已有领域权限、实际方法附件/必需原件与最小片段。题目设计/报告写作分别固定；既有回执明确选择recordId/digest/locator，未来上游只声明等待条件，不捏造回执或自动选最新。
- 时间显式声明单次/每日/每周、IANA时区、产量和错过/重叠处理；检查完整重复窗口的夏令时缺失/重复时间、首尾发生时间、90天范围和连接期限，不代选偏移、不自动补跑。发生时间按配置时区显示并附标签，不用浏览器时区代替。来源地区、语言、名称或地址尚未明确时仍未就绪，不把发布时间未知当新鲜，也不实际检索来源。
- 单任务或多个领域任务按同一计划交接，所有角色共享总限制。工具提供者、允许状态、费用、次数/时长和恢复规则明确声明；未知费用/未获准工具或越界阶段策略不能成为完整审核清单。平台不验证真实账单或替第三方终止在途作业。
- JSON与Markdown导出前再次校验当前依据。缺项只给incomplete_review清单且无制作步骤；字段齐备只给review_only。始终未启用、外部环境未验证，没有创建run、认领、Codex任务、模型调用或真实定时器；目录每次重开导出窗口都恢复隐藏，仅本次明确同意才带出，二进制另行按授权取回。

新题目入口只能准备草稿，尚无S0–S2证据/固定计划/方法时不携带旧商品引用、不输出制作步骤。配置不存在启用或执行API；示例时间、预算、数量和工具均不是实际运行批准。

## 三张主要正式画面

桌面1600×1100，手机390×844模拟视口；另验证360px窄屏，不等于真机。

![O4正式桌面：配置总览与不可变修订](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/external-run-configuration-o4-formal-20261023/desktop-overview.png>)

![O4正式桌面：未启用交接核对与导出](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/external-run-configuration-o4-formal-20261023/desktop-handoff.png>)

![O4正式手机：交接确认](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/external-run-configuration-o4-formal-20261023/mobile-export-confirm.png>)

| 其他正式画面 | 核对内容 |
| --- | --- |
| [未补齐草稿](desktop-incomplete-draft.png) / [待补项交接](desktop-incomplete-review.png) | 真实保存和刷新回读，未知值不代填，无制作步骤 |
| [客户端与范围](desktop-client-scope.png) / [时间](desktop-timing.png) / [来源](desktop-sources.png) | 已有工作区/固定计划，明确时区/数量与国内/国际来源 |
| [方法与分工](desktop-methods-tasks.png) / [历史只读](desktop-history.png) | 五专业用途、多个领域与等待依赖，原修订保留 |
| [目录许可重置](desktop-directory-consent-reset.png) | 关闭后重开导出窗口不沿用上次目录许可 |
| [SQL故障](desktop-save-failure.png) / [结果未知](desktop-save-unknown.png) / [并发冲突](desktop-save-conflict.png) | 原请求恢复，不重复追加；保留本地修改再选择是否载入新版 |
| [未知费用](desktop-unknown-cost.png) / [导出时撤权](desktop-export-revoked.png) / [计划变化](desktop-plan-changed.png) | 真实服务端再次核验，变化后旧预览/同意失效 |
| [手机总览](mobile-overview.png) / [客户端](mobile-client.png) / [时间](mobile-timing.png) / [方法](mobile-methods.png) | 同一套正式组件与真实固定数据 |
| [手机核对](mobile-review.png) / [运营滚动](mobile-operating-scroll.png) / [离开保护](mobile-unsaved-navigation.png) | 顶栏/侧栏保持、弹窗Escape焦点恢复、原生Back保留未保存修改 |
| [不完整来源](mobile-partial-source.png) / [窄屏审核](mobile-narrow-review.png) | 地区和地址可保存为未知，360px内容与操作可达 |

## 验证与限制

23项新增API集成、511项全量测试（API423＋web69＋SDK19，失败/跳过均0）、类型/构建、21个正式页面情境/26图和本轮57项既有浏览器回归已通过。正式页面无页面错误、非预期HTTP或非本机网络。保存/刷新/只读历史、真实SQL故障回滚、丢成功响应的原请求恢复、并发冲突、未知费用/不完整来源、撤权/计划变化后的导出409、目录许可重置、配置时区标签和手机焦点/滚动/Back均有实际检查，见[浏览器验证记录](verification.json)。

证据范围：全量511与旧57先通过；之后仅在新增配置UI修正“目录许可每次重开重置”和“发生时间按配置时区显式显示”。小修后重新通过web69、全量类型检查/构建及21个O4页面情境/26图（流水线80757退出0）；后端/SDK/既有消费者源码未改。旧57未在小修后重复运行，不能将它冒称为最终UI版本的新一轮全量浏览器结果。仓库没有单独lint脚本，本批未生成覆盖率百分比。

第26份迁移只新增配置容器与修订两表，现在73模型/26迁移；schema diff无差异。64类表/1157行旧字段、原25迁移和全部26份源SQL校验和、5份release/历史答卷报告/设定引用保持。开发库配置/修订、Codex连接和分组凭据均0；业务样例仅在自动回收的TEST库内创建。旧数据与原型/历史批准不改写。

正式组件使用独立Nest API/TEST库、合成计划与方法、SupabaseAuthGateway身份和剪贴板替身；未使用真实登录账号、真实账户持续权限、客户端或真机。读写预算3000、测试中的真实SQL INSERT故障和模拟丢成功响应是受控检查，不是正常限流/真实Auth或工具执行证明。真正JSON浏览器下载已逐字段核对并删除，Markdown复制走剪贴板替身，系统剪贴板/客户端配置写入0。

本批按用户保留的关卡停在新的O4正式UI验收。真实来源检索、模型/媒体制作、档位比较、定时器、真实授权/客户端/云付费/发布均未执行；原目录/分支/模型/设置保持，不暂存/提交/推送或跨线程回信。最终完整工程记录在`.local/o4-implementation/verification.json`，规划见[PROGRESS](../../../prd/v1/PROGRESS.md)与[任务清单](../../../prd/v1/tasks/T14-mcp-ingestion.md)。
