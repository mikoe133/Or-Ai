# 外部制作运行与接续

2026-10-23当前：O1–O4本地技术与指定正式UI范围已通过，O4[用户批准独立记录](../../output/design-review/external-run-configuration-o4-formal-20261023/APPROVAL.md)保留原pending历史。用户上海04:21:08取消后续人工UI停点，当前按[T10-L](T10-LOCAL-UI.md)连续接入正式视觉并自主验证，不记作用户批准新画面。实际制作/日程未启用，真实账户/客户端/真机、云付费/发布仍另验，W3/W6暂停，整体T14/W4未完成。下述各批日期和交付状态按历史保留。

2026-10-22。本地 W1/W2、W6 方法复用与批次/阶段策略已验证；W6 实际比较已获有限条件批准，但计费控制/完整零工具隔离未证实，未启动。最终验收状态以 T14 任务和本轮验证记录为准；本文不是已启用定时生产的证明。

平台持久保存外部运行回执，不启动模型、渲染器、生成 worker 或外部定时器。实际工具是否运行、费用与语义质量，仍需制作端和人工核实。

## 固定身份与权限

一个 run 固定商品、计划修订、共同设定摘要和限制。相同凭证、商品、runKey 与相同输入恢复同一 run；有意变体或新计划用新 runKey。每个工作区的 `maxRunsPerProject` 默认 20，可设 1–100。

每次模块尝试固定方法快照、依赖制作记录及摘要、输入指纹、源版本指纹、连接身份与 clientKey。服务器签发短期认领 token，只存摘要；重试响应从真实 bearer 重新推导，不将 token 写入幂等缓存。不同客户端竞争同一 run/module 时只有一个有效认领者；续期不能复活已过期、取消、结束或被替换的尝试。

assessment 的 `projects:write + projects:read` 可以创建/取消本工作区 run；各领域的尝试写入还要求 `content:write + projects:read + skills:read + context:read`。领域凭据只能读写自己的完整尝试，跨领域 run 只返回必要的计划/状态摘要，不返回其他领域的方法正文或失败细节。管理员 Cookie 接口沿用权限、Origin/CSRF 和 no-store。

## 实际工具

| 工具 | 作用 |
| --- | --- |
| production_run_create / get / list / cancel | 创建或回读固定批次、模块状态与审核关联；取消只停止平台接续 |
| module_attempt_claim / get | 认领或回读固定尝试，返回下一步及原 jobId |
| module_attempt_event | 追加 waiting_input、producing、uploading、validation_failed、failed、cancelled 的有限外部申报 |
| module_attempt_renew | 在 run/凭证期限内续期，要求当前 token 与 expectedRevision |
| module_attempt_complete | 校验实际制作记录、必需原件、原生结构/体验资源、精确方法与输入后接受 saved_draft |

assessment 暴露全部 9 个工具，其他四域不暴露 create/cancel。工具总数为 assessment 41、cover/copy/video 各 35、experience 36。SDK 与服务器均按领域/权限校验，工具列表不是授权依据。

管理员读取：`GET /api/admin/products/:id/production-runs`、`/production-runs/:id`、`/production-attempts/:id`。回执中的 pending_review、returned、retained 来自 P4 的真实审核修订，并包含 reviewId。

## 恢复规则

1. 先读取 run 和尝试，再决定下一步。相同 clientKey/固定输入的有效认领可恢复同一尝试；已保存结果直接复用。
2. failed/expired 后明确传 `retryOfAttemptId`。旧外部作业结果未知时，还必须传原 `resumeJobId`，先查原作业；不能改换 provider/jobId，也不能把原作业冒用于不同方法/输入。
3. 收到上传/保存的未知响应，复用原 requestId 回读状态，避免重复上传与制作。完成回执幂等，不复制制作记录。
4. 上游计划、依赖的制作记录/原生稿，或本模块已保存原生稿发生变化，显示需复查。已有固定历史结果仍可读，新输入要创建新的尝试。
5. 过期执行者不能追加 W 事件、续期或完成回执。取消不会停止外部服务里的真实作业，操作者需单独核对该作业。

**兼容边界：**认领隔离适用于 W 的认领、事件、续期与完成入口。既有 standalone `project_draft_save`、`project_production_save` 和上传仍保留原有权限与 expectedRevision；本轮没有把这些旧入口全局改为认领必填。旧入口产生的新稿不会覆盖固定 W 回执，回读会标记版本变化；新审核也会重新核对可变头。不能将本轮描述为所有旧写接口都被租约锁住。

## 方法复用与检查

`project_method_capture` 可选 `customization`：最多 40 个有限商品参数与 8000 字补充方法。基础版本、完整 manifest/附件、参数、补充方法和确定性展开正文一起固定；改定制层得到新快照/新尝试，重复相同参数（含不同键顺序）恢复同一快照。共享库保持不变，不全局启用候选方法。旧无 customization 的快照继续原格式回读。

完成只证明固定结构、引用和实际文件已保存并经过检查。脚本、分镜、预览和体验 JSON 不能代替必需的视频/网页/场景原件。语义一致性、情绪价值和具体质量由独立检查或人工审核负责，不凭客户端 finished 宣称完成。

## 限制与费用

run 固定模块尝试数 1–10、总尝试数 1–400、并发 1–8、总时长 60–86400 秒及可选外部申报金额/token 上限；每次尝试最多 201 条事件，认领 10–1800 秒且不超过 run、阶段和凭证到期时间。

可选 `limits.stageLimits` 为 S3/S4/S5 分别配置 `maxAttempts`、`maxConcurrency`、`maxDurationSeconds`、`maxReportedCostFen` 和 `maxReportedTokens`。服务端固定 assessment→S3、copy/experience→S4、cover/video→S5；同阶段跨领域共享次数、有效认领并发和累计申报量，客户端 `event.step` 不改变归属。阶段期限从本 run 该阶段的第一条尝试起算，换模块、重试或续期不能重新计时。未配置的阶段只受总限制约束；旧 run 不补写该字段。空策略、未知阶段、超过批次总限制的阶段数值在创建前拒绝。

尝试数、并发或已知申报额度达到限制时拒绝新的认领；已有有效尝试仍可记录结果或保存部分成果，申报金额/token 不做预算预留，也不自动终止外部在途作业。阶段期限到达后，新的认领、续期、事件与完成回执拒绝，已保存的回执/原件不删除。批次或阶段金额上限为 0 时，首次认领即拒绝；未知费用仍为 null，不能视作免费。需要新的批次或修订时交人工处理，不能静默扩大原固定策略。

金额/token 明确为 `external_declaration`，未知值保持 null，不能当作支付账单或真实模型计量。平台只能限制自己的接续与次数，不能替外部工具强制扣费上限；实际制作配置还必须约束工具时长/收费、预估预算和未知费用的人工处理。复用 jobId 避免平台协议重复认领，不能据此宣称第三方绝不会重复收费。

W6 的低档/基线档与必要高档或 Ultra 小样本质量、耗时、用量比较尚未执行；[待审方案](W6-EFFORT-COMPARISON.md) 固定样本、提示词、输出 schema 与评分办法，本轮未发起模型调用。热点新鲜度、去重、版权及不适宜选题规则仍作为可配置建议，不冒充现成过滤服务。

## 本地验证

专项涵盖双 HTTP 客户端竞争、过期/续期/替换、原 jobId 接续、真实结构完成及丢响应、无原件/假 finished 拒绝、源变更、部分视频失败、撤销/取消、额度、真实 INSERT 故障回滚和不可变历史。官方 v2 SDK 2.3.1 的两个独立进程先后退出/启动，证明从同一持久 run/attempt 恢复原合成 jobId；测试没有实际生成媒体或向模型发请求。

W6 追加 6 项集成检查，覆盖阶段共享并发/次数、申报额度与未知值、首次尝试起算和续期封顶、零预算、无效策略事务拒绝、固定策略重试/旧批次兼容；其中通过官方 SDK 实际 stdio 创建/回读阶段策略。专项共 26 项通过。全量 API 341＋web 54＋SDK 19＝414 项、typecheck/build 通过，本机 schema diff 无差异。本次未新增迁移或模型：22 迁移/69 模型，59 类旧表 1157 行旧字段及历史引用保留，临时库 0。

原证据在 `.local/t14-w12/`，W6 追加证据在 `.local/t14-w6/`。本批只改契约、服务、测试和交接资料，没有新增 UI；57 项浏览器回归和 G4 的 18 项真实本地 Auth 检查沿用上一批证据，本批未重跑。模型设置、云接入、真实生产凭证和定时器不由本实现自动变更。

## 运营接续界面的当前范围 · 2026-10-23

O2 指定正式 UI 已批准后，O3 完成实码核查和[独立具体设计](../../output/design-review/production-recovery-o3-20261023/README.md)，当前停新设计审核；本节没有新增已实现接口或正式 UI。拟将最后申报、认领/批次/阶段当前条件、已保存成果和复查信号分列，补管理员明确停止与无凭据恢复交接；实际 claim 仍由外部客户端发起。停止只约束既有 W 接续，不终止第三方作业，不扩大旧 standalone 写入口的兼容边界。精确核查与拟议职责见 [业务契约](PLATFORM-BUSINESS-ACCEPTANCE.md#o3-外部运行状态与失败恢复--核查和设计契约)，内容生成/比较仍暂停，不进入 O4。

## O3 正式运营实现 · 2026-10-23

上节为设计交付时状态。指定三图设计于上海01:23:23获批后，正式 ProductionRunOperations 和7个管理端状态/历史/停止/恢复输入/核验/导出入口已实现；精确路径见 [API-CONTRACTS](API-CONTRACTS.md#t14o3-运行运营与恢复说明2026-10-23正式接口已实现)。旧 MCP schema/工具、认领/续期/完成及 standalone 兼容边界保持；停止与原 MCP 共用锁/取消逻辑，不伪造机器身份，不终止第三方作业。

恢复只整理原代次/输入/方法/原作业与最小片段。未知作业先inspect_original_job，有效认领inspect_current_attempt，条件允许的终态才给explicit_retry标识；过期/达限/撤销/停止/旧代次不输出继续制作步骤。实际调用由外部客户端重查，网页没有发起认领、外部查询/生成或新运行。488项与17正式页面情境/22图、57旧回归和保全通过，当前停 [O3-UI 正式界面验收](../../output/design-review/production-recovery-o3-formal-20261023/README.md)，不进入O4，真实权限/客户端/真机及内容生成/模型比较不扩大。


## O3本地范围批准与O4当前边界

上节为O3正式实现交付时状态。用户在运行总览、恢复说明、手机停止确认三图审核后于上海2026-10-23 02:25:04回复“继续”，[独立批准](../../output/design-review/production-recovery-o3-formal-20261023/APPROVAL.md)。O3本地范围闭合，原pending保持。O4核查/设计的是可保存但未启用的运行配置，不是run、认领或外部定时器；具体[能力契约](PLATFORM-BUSINESS-ACCEPTANCE.md#o4-c-能力保存一份未启用的运行安排)与[新设计](../../output/design-review/external-run-configuration-o4-20261023/README.md)另审。W3/W6暂停，W4真实全链/无人值守仍未通过，本轮不接正式API/页面或迁移。

## O4正式配置保存与导出 · 当前边界

2026-10-23，O4设计于上海03:02:52获[独立批准](../../output/design-review/external-run-configuration-o4-20261023/APPROVAL.md)，正式配置容器/不可变修订、8个管理员接口及六步桌面/手机页面已实现，I/V技术通过，停[O4正式UI验收](../../output/design-review/external-run-configuration-o4-formal-20261023/README.md)。此为前节设计历史之后的新结果；原型及O1–O3批准/技术pending保持。

配置保存不写run/attempt、扩展期限或改变凭据；校验和导出重查精确计划/方法/输入、真实附件及canonical机器目标权限。已有回执明确固定，未来依赖仅等待；未知客户端/时间/来源/工具/费用保留未就绪。两种交接均未启用，缺项清单无制作步骤；目录每次重开默认隐藏，真实原件按授权另取。没有执行/启用API、第三方调用、来源检索、实际制作或真实定时器。

23项新增API、全量511项、类型/构建、21个O4页面情境/26图及本轮57项旧回归通过。最后新UI小修后重验web69、全量类型/构建和O4页面，旧57在小修前通过；仅隔离API/TEST库与身份/剪贴板替身。73模型/26迁移只追加配置两表，旧64类表1157行、原25迁移与历史引用保持，临时库/开发库配置/修订/新增连接均0。整体O4/T14/W4、真实账户/客户端/真机、完整制作和无人值守仍未验收，W3/W6暂停。
