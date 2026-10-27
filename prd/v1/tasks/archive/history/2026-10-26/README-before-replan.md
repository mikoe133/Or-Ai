# Or-Ai v1：主平台实施入口

2026-10-26 最新商品规划：所有商品正常体验统一使用 Three.js，动画/镜头/交互依每款商品规划确定，五库七用途 Skill 明确此要求。[统一实现规范](../../../../PRODUCT-IMPLEMENTATION-POLICY.md)与[七用途起始模板](../../../../../../examples/threejs-products/README.md)已交付；后续 T16.C2 → T13.C2–C3 → T16.C3/C4 负责规划/门禁、Skill 升级、商品转制及实机成套验收。现有花园只是一个已实现模板，不代表全部商品已升级，旧版本和历史结果保留。当前顺序见 ROADMAP 顶部。

日期：2026-10-23。O1–O4本地技术与指定正式UI范围已通过，O4[批准独立记录](../../../../../../output/design-review/external-run-configuration-o4-formal-20261023/APPROVAL.md)保留原工程pending。用户上海04:21:08取消后续人工UI停点，按既有平台规划连续开发/隔离验证和自主目视交互验收，不冒称用户批准新画面。[T10-L本地正式视觉](../../../../T10-LOCAL-UI.md)已通过：本批511项、33个新UI情境/45图、57项既有流程与7项管理员入口通过，73模型/26迁移不变。T09本地部署准备已通过（13项配置检查与amd64隔离镜像检查），[具体云方案与待确认事项](../../../../CLOUD-READINESS.md)可审阅，真实云端未验收。T14/W4、整体T10/M5未关闭，真实授权/账户/客户端/真机、云付费/定时/发布与交易仍另验，内容生成/模型比较暂停。

后续顺序见 [ROADMAP.md](ROADMAP-before-replan.md) 和 [平台业务验收](../../../../PLATFORM-BUSINESS-ACCEPTANCE.md)：O1/O2各自设计/正式UI批准保持；O3[设计批准](../../../../../../output/design-review/production-recovery-o3-20261023/APPROVAL.md)与[正式UI批准](../../../../../../output/design-review/production-recovery-o3-formal-20261023/APPROVAL.md)、O4[设计批准](../../../../../../output/design-review/external-run-configuration-o4-20261023/APPROVAL.md)分别记录。O4指定正式UI已获独立批准，后续UI按用户新指令自主验收；内容生成/模型比较继续暂停，真实凭据/云/付费/日程/发布分别审核。

2026-10-21 review 后用户授权平台优先实施；[P1/P2](../../../../PRODUCTION-PLANS.md)、[受限 MCP 初始化](../../../../MCP-PROJECTS.md)、[整套原件审核留存](../../../../PROJECT-RETENTION.md)及[外部运行接续](../../../../EXTERNAL-PRODUCTION-RUNS.md)已分批实现验证。项目工作区的浏览/详情/审核与正式规划编辑范围分别记录在 [PROJECT-WORKSPACE.md](../../../../PROJECT-WORKSPACE.md)；历史批准和测试数量保留在 PROGRESS，不启用实际日程或云资源。

本版按用户最新要求调整：先搭建聚合主平台，商品暂用大致内容占位；手机和网页 Figma 设计已完成，页面覆盖接入前核对。占位内容用于验证平台能力，正式商品题库、营销素材和真实销售不作为平台开发的前置条件。

平台宗旨：提供情绪价值，加深对自己、对方与关系的理解。每款商品的题目/交互、最终报告、封面、视频与文案按同一创作设定配套制作，具体约定见 PRODUCT-CREATIVE-SYSTEM.md；不同形式与风格服务于具体情绪/理解目标。

已补齐[既定任务的本地独立项](../../../../LOCAL-VALIDATION-FOLLOWUP.md)：慢网/空缓存5情境、上传预算11项、本地恢复7项；云前置不扩大为所有本地工作的前置，T14-C明文依赖保持。

## 文档分工

- [PRODUCT-IMPLEMENTATION-POLICY.md](../../../../PRODUCT-IMPLEMENTATION-POLICY.md)：全商品 Three.js 固定规则、按商品规划的动画/交互、七用途 Skill、旧版前向升级与新增任务顺序。
- [PRD.md](../../../../PRD.md)：v1 功能范围、业务规则、数据/API 边界及平台验收。
- [PLACEHOLDERS.md](../../../../PLACEHOLDERS.md)：占位商品与测试数据的制作约定。
- [UI-HANDOFF.md](../../../../UI-HANDOFF.md)：需要设计的页面、状态与 UI 接入边界。
- [LOCAL-FIRST.md](../../../../LOCAL-FIRST.md)：本地优先的开发顺序、T06-L/T06-C 验收边界与后续云端清单。
- [PROGRESS.md](PROGRESS-through-20261026.md)：T01–T08 的实现、测试与执行记录；本地必需验收通过后可推进下一步，原执行范围到 T08 后停止。
- [ROADMAP.md](ROADMAP-before-replan.md)：T08 后推荐执行顺序、技术硬依赖、批次交付/退出条件与待定事项的唯一入口。
- [CLOUD-READINESS.md](../../../../CLOUD-READINESS.md)：T09生产配置/离线预检/镜像证据、Worker/R2/云初始化代码缺口、具体资源/官方费用与待确认事项。
- [AUTH-SETUP.md](../../../../AUTH-SETUP.md)：T06 的 Supabase Auth/Resend 配置步骤与真实认证/收信验收要求。
- [DATA-MODEL.md](../../../../DATA-MODEL.md)：已实现的73个模型/二十六份迁移、账号权限、seed、版本/保留期、会话/文件、交付、体验、项目制作/留存、布局历史、统一连接及运行配置修订约定。
- [API-CONTRACTS.md](../../../../API-CONTRACTS.md)：契约、接口示例和 UI 区域字段映射；目录、兑换、答题/报告/反馈、账户/绑定与 T07 运营 HTTP 已实现。
- [CONTENT-WORKBENCH.md](../../../../CONTENT-WORKBENCH.md)：四类内容工作台、本地归档/预览/正式文件与制作记录的已实现范围。
- [CONTENT-ADOPTION.md](../../../../CONTENT-ADOPTION.md)：引用/反查、差异/复查、固定采用/JSON 导出、受控清理及本机演示包。
- [STYLE-SKILLS.md](../../../../STYLE-SKILLS.md)：T13 四库、专业用途、平台清单/参考附件、固定版本与差异/导出；商品绑定见 [SKILL-BINDINGS.md](../../../../SKILL-BINDINGS.md)。
- [MCP-LOCAL-TRANSPORT.md](../../../../MCP-LOCAL-TRANSPORT.md)：受限机器凭据、后台连接管理、流式上传与本地演示；保留 LA 历史证据。
- [MCP-CONTENT-TOOLS.md](../../../../MCP-CONTENT-TOOLS.md)：T14-LB 领域工具、权限、四任务接续、完整 manifest、最小引用和手动审核；[SDK 核对](../../../../MCP-SDK-NOTES.md)。
- [CONTENT-BACKOFFICE.md](../../../../CONTENT-BACKOFFICE.md)：内容后台、题库/宣传素材、风格 skill 与 MCP 的统一业务约定、数据/接口边界及扩展验收。
- [CONTENT-PRODUCTION-REVIEW.md](../../../../CONTENT-PRODUCTION-REVIEW.md)：制作闭环需求审查与阶段方案；D1 确认平台保存商品原文件及对应 skill 精确版本。实施结果以各任务和 PROGRESS 为准，内容生成/模型效果试验现已暂停。
- [PRODUCT-CREATIVE-SYSTEM.md](../../../../PRODUCT-CREATIVE-SYSTEM.md)：平台宗旨、商品情绪/理解目标、整体创作设定、报告方案、各领域配套制作与成套验收。
- [EXPERIENCE-PLATFORM.md](../../../../EXPERIENCE-PLATFORM.md)：网页/2.5D/Three.js/小游戏商品的内容、评估、交互模板与主题分层，运行协议、兼容性和试点顺序。
- [EXPERIENCE-RUNTIME.md](../../../../EXPERIENCE-RUNTIME.md)：T15 运行/制作接口及固定引用；T16-A 小屋/手记配对、资源预算与 MCP 显式能力发现。
- [QUIET-ROOM-PILOT.md](../../../../QUIET-ROOM-PILOT.md)：T16-A 的创作设定、资源/设备预算、源内容、技术证据和新 UI 审核边界。
- [tasks/](../../..)：按实施顺序拆分的任务；每份包含依赖、子任务、交付物与验收条件。
- [PRODUCT.md](../../../../../../PRODUCT.md)：长期商业方向、内容策略、云服务架构与调研来源；v1 执行顺序以本目录为准。

## 任务总表

所有复选框仅在实际完成并验收后勾选。编号用于引用，不表示已经实现。

| 状态 | 步骤 | 任务 | 前置依赖 | 执行位置/验收边界 |
| --- | --- | --- | --- | --- |
| [x] | T01 | [仓库与开发环境](../../completed/T01-foundation.md) | 无 | 已完成 |
| [x] | T02 | [模型、契约与占位数据](../../completed/T02-models-and-fixtures.md) | T01 | 已完成 |
| [x] | T03 | [商品目录与版本接口](../../completed/T03-catalog.md) | T02 | 已完成 |
| [x] | T04 | [兑换码与匿名权益](../../completed/T04-redemption.md) | T02、T03 | 已完成 |
| [x] | T05 | [动态测试、报告与统计](../../completed/T05-test-runtime.md) | T03、T04 | 已完成 |
| [ ] | T06 | [邮箱账户与权益绑定](T06-accounts.md) | T02、T04；云验收需 Supabase Auth/Resend | T06-L 已通过；T06-C 留在 T09 |
| [x] | T07 | [运营接口与素材管理](../../completed/T07-operations.md) | T03–T05、T06-L | 本地已验收；真实 Auth/对象存储在 T09 |
| [x] | T08 | [前端路由与功能联调](../../completed/T08-functional-web.md) | T03–T05、T06-L、T07 | 本地已验收；云 Auth/邮件仍在 T09 |
| [x] | T06-O | [本地后台登录准备](T06-accounts.md#local-operator-setup) | T06-L、已有本机服务 | 顺序 0 已完成；实际 Auth/收件/管理员操作通过，不算 T06-C |
| [x] | T12-A/B/C | [四类内容与引用关系后台](../../completed/T12-content-backoffice.md#执行批次) | T07、T08；手动验收需 T06-O | 全部本地已验收；引用/复查、固定采用/导出与清理通过 |
| [x] | T13 | [四类 skill 库与版本绑定](T13-style-skills.md#执行批次) | T12 修订/文件/工作台 | 顺序 4；A/B 库维护、五用途绑定及来源已验收 |
| [x] | T14-L | [本地四领域 MCP](T14-mcp-ingestion.md#执行批次) | T12、T13；实际操作凭据需 T06-O | 顺序 5；LA 已验收，LB 实现与真实四域 SDK 已完成，最终回归通过，本地已验收 |
| [x] | T15 | [体验模板与运行协议](../../completed/T15-experience-runtime.md#执行批次) | 基础：T05/T08；authoring：T12–T14-L | 顺序 6；A/B 已验收，B 界面已获用户批准 |
| [ ] | T16-A | [网页/2.5D 试点](T16-immersive-products.md#执行批次) | T15；完整制作复用 T12–T14-L | 顺序 7；小屋/手记及配套内容技术验证通过，待新 UI/真机验收 |
| [x] | T10-L | [正式 UI 本地接入](T10-final-ui.md#执行批次) | T08、已核对正式稿 | 顺序 8；真实业务路由/双端组件，不关闭整体 T10 |
| [ ] | T09 | [云端部署与技术验收](T09-cloud-validation.md#执行位置与外部条件) | T01–T08、真实云账户/域名/预算授权 | 顺序 9；含 T06-C 与公网业务 E2E |
| [ ] | T14-C | [远程 MCP](T14-mcp-ingestion.md#执行批次) | T14-L＋T09 对应云条件 | 顺序 10；远程授权/发现/真实客户端，未启用不阻塞 M5 |
| [ ] | T10-V | [主平台最终验收](T10-final-ui.md#执行批次) | T10-L＋T09 | 顺序 11；完成 M5，关闭必要设计/行为缺口 |
| [ ] | T11 | [正式商品与商业上线](T11-commercial-launch.md#执行批次) | M5、正式内容/政策与真实渠道条件 | 顺序 12；先一款商品试运营，独立 M6 |
| [ ] | T16-B | [Three.js 小型场景](T16-immersive-products.md#执行批次) | T15 基础、T16-A 设备/交互经验 | 后续 A；按需验证手机/加载/回退 |
| [ ] | T17 | [小游戏输入与评估扩展](T17-interactive-evaluation.md#执行位置与选型门槛) | T15、明确玩法/评估；不要求 3D | 后续 B；首期只选一种，新增后端评估 |
| [x] | T14-P | [商品项目制作契约与审核留存](T14-mcp-ingestion.md) | T12/T13/T14-L/T15 | P1–P5 全部本地已验收：受限初始化、整套原件审核留存与回归 |
| [x] | T10-G | [项目文件夹与关系画布](T10-final-ui.md) | 设计需 P1/P2；实际数据需 P3/P4、W1/W2 | G1–G4 浏览/详情/审核通过；G5–G7 技术通过、G8 指定画面已批准；本地 G 完成，真机/平台整体另验 |
| [ ] | T14-W | [Codex 外部制作接续](T14-mcp-ingestion.md#t14-w-外部-agent-制作接续与运行交接待执行) | P；全链画布演练另需 G 审核 | W5/W1/W2 已验收；W6 技术通过、比较调用 0 次且现暂停，W3/W4 未完成，不阻塞平台编辑 |
| [x] | T14-O | [运营授权与制作交接](T14-mcp-ingestion.md) | 复用P/W；各批原技术/批准保持 | O1–O4本地指定范围通过；真实账户/客户端/真机/实际制作另验，T14整体未关闭 |

T12–T14 是 2026-10-16 新增的经营者后台扩展，编号不表示必须等 T11 后执行。建议在 T07/T08 本地验收后依次做 T12 → T13 → T14-L，可先于云部署；原 M5 平台、M6 商业验收范围保持独立，原执行到 T08 的自动执行范围也不随规划扩大。

T15–T17 为后续体验扩展：T15 基础运行在 T08 后可做，T16 按网页/2.5D → 3D 分阶段验证；完整后台制作复用 T12，experience skill/MCP 在 T13/T14 后接入。T17 仅在新答案/评估玩法明确后实施；不把新增引擎计入原 T05 已完成能力，不增加原平台/商业验收前置。

## 云端接入前可以执行到哪一步

**T15、G4、G8、O1/O2/O3各自指定批准保持原范围；O4本地指定正式UI已批，后续UI自主验收；T10-L本地通过，当前继续T09本地准备。** 小屋仅技术样例，质量/真机延期；W6比较与W3内容制作暂停，不作为平台功能硬前置。T09云服务仍需说明服务/费用并另批。

当前本机已配置真实 Auth/Mailpit，可按 AUTH-SETUP 登录基础后台；停用配置时账户页如实显示未配置，匿名兑换仍可用。T06-O 的 25 项配置/运行栈检查、11 项真实 Auth 浏览器流程及停用/恢复通过；没有测试身份登录入口。云端 Auth/Resend 仍待 T06-C/T09。

**T10 视觉实现不依赖公网。** 手机/桌面稿实现为同一套响应式前端，正式设计可按页面接入。只有首页有稿不代表答题、报告、账户和运营后台全部定稿，缺失页面单独保留待设计项。

**T09 后置统一验收云数据库、Supabase Auth＋Resend、对象存储、公网托管及完整业务 E2E。** 主平台整体完成仍要求 T09、T10 都通过；T11 的正式商品、销售权限和交付政策另行验收。详细顺序见 LOCAL-FIRST.md。

## 里程碑

| 里程碑 | 范围 | 完成后可以做什么 |
| --- | --- | --- |
| M1：本地服务基础 | T01–T03 | 用占位商品浏览和筛选真实数据库目录 |
| M2：本地业务接口完成 | T04–T05、T06-L、T07 | 通过真实业务库和隔离身份验证兑换、报告、账户绑定及运营售后 |
| M3：本地功能联调平台 | T08 本地验收 | 用页面完成发码、匿名答题、报告、恢复和撤权；账户/管理员保留权限测试 |
| M4：云端链路通过 | T09，含 T06-C | 通过公网测试地址验证容器、数据库、真实认证、邮件及完整业务流程 |
| M5：主平台 v1 完成 | T10，并完成 T01–T09 验收 | 使用正式 UI 管理和试用平台，占位商品仍是测试内容 |
| M6：可以正式销售 | T11 | 用经过审核的真实商品完成平台允许的销售交付 |
| M7：内容后台本地可用 | T12、T13、T14-L | 四类库及各自 skill/MCP 可用，视频引用题目和文案，后台反查、复查与采用 |

M5 与 M6 分别验收；不把平台开发完成称为已经可以销售占位商品。商品新增与替换通过配置/版本完成，不能为每款商品重建应用。

M7 是新增后台能力的独立里程碑，可在 M4/M6 前本地完成；公网文件、真实身份与远程 MCP 还需 T09/T14-C。本期先保存、版本管理和读取 skill，后台执行模型/生成任务另行排期。

原 M7 不包含本日补齐的热点/商品计划、项目内新方法制作链、统一体验留存或关系画布，不能用已有验收将 P/W/G 勾选完成。最新完整闭环需这些任务分别通过；不增加原 M5/M6 必需前置，也不把外部 Codex 制作改成平台内部模型执行。

## 当前外部依赖

- UI：用户已完成 Figma 手机/网页设计，现有交接入口见 UI-HANDOFF.md；接入前核对页面、状态及最新版本。
- 云服务：当前架构为 React/Vite＋NestJS＋Prisma/Supabase PostgreSQL＋Supabase Auth/Resend＋Cloudflare；Cloudflare Containers 不是免费服务。创建或升级云资源须有明确预算和账户授权；本次只写任务，不开通资源。
- 商品规则：正式价格、首次兑换期限、报告保存期、售后承诺在 T11 前确定；开发值只适用于测试环境。
- 平台渠道：抖音/小红书类目、链接与发码权限在商业上线前核验，不阻塞本地平台开发。

G8、T10-G及O1–O4本地指定范围通过，T10-L已完成本地视觉/流程验收，T09本地部署准备通过；整体T14/W4、T09真实云、T10-V/真机与M5仍未关闭。T16-A仅技术样例；内容生产/模型比较和真实自动化按ROADMAP各自边界保留。
