# T14-P 商品项目制作底座

## 2026-10-27：T16.C2-A 商品规划合同

制作计划新增严格 v2，沿用现有 Product、ProductionPlanRevision 和模块快照；独立字段 `productPlan` 固定 Three.js 技术基线、视觉维度、每商品制作决定、设备/预算和固定来源。旧 v1 保持原字段、JSON 规范化顺序、摘要和读取，不自动补出动画/交互决定。新建后台计划为 v2，旧计划需明确建立新规划并另存修订。API 与五领域 MCP 共用合同和同一保存服务。

| 事实 | 唯一归属与引用方式 |
| --- | --- |
| 人群、情境、情绪/理解目标、世界观、视觉语言和报告意图 | 原 CreativeProfileRevision；计划固定其 ID 和摘要，不复制为第二份可编辑事实 |
| Three.js、2D/2.5D/3D 视觉、动画/镜头/反馈/确认/恢复/报告承接、无障碍/回退、资源策略和预算 | v2 制作计划的 productPlan；待规划保持 undecided/unplanned，预算空值保持未知 |
| 答案/评估协议、体验 renderer 与报告 renderer 的精确配对 | 原模块 target.runtime；productPlan 通过 experienceModuleKey/assessmentModuleKey 引用模块，不另存一份配对配置 |
| 实际内容、场景映射、资源 ID/摘要、报告内容 | 原 ContentRevision 与 ExperienceRelease；规划 sources 固定同商品/scope 的 ID/digest，发行清单继续拥有实际资源与权限 |
| 实际 Skill 正文、版本与附件 | 原 ProjectMethodSnapshot；规划 sources 可引用其精确快照，新模块仍需重新捕获方法，不能把来源当成已使用 |
| 选题/媒体的外部来源与时间 | 原计划 evidence 与模块来源；只保存引用，不自动检索/下载 |

每项制作决定分别保存 requirement（undecided / required / not_required）、status（unplanned / planned / implemented / verified）、说明和依据。明确不需要不能标为 implemented；required 的 implemented/verified 需要实现引用，verified 还需验证引用。依据属于作者申报，inspection 仍返回 runtimeValidation=not_performed、archiveReady=false，绝不凭 JSON 认证实际场景或设备。未知模板可保存制作草稿，实际发布完整性由任务03负责。

sources 只接受已有不可变 content_revision、experience_release、method_snapshot，不新增裸文件引用或可变 Skill 草稿引用；现有不可变行及附件外键继续保护历史资源。服务与数据库同时核对商品、scope、摘要和已知共同设定；方法来源还核对领域。原内容/方法不会因计划修改而漂移，新增修订只改变新计划的输入。所有全局 Skill 的结构化政策和实际绑定校验仍留给任务02。

后台“商品体验规划”提供独立决定、运行配对、预算、固定来源、变更影响、历史只读和显式升级；未应用的高级 JSON 禁止保存并随草稿导出。并发冲突保留当前草稿；网络/响应格式/代理错误冻结编辑，用相同 requestId 和输入恢复原保存。权限变化继续受原账户/管理员检查和私有缓存清理约束。

新增向前迁移 `20261027010000_product_plan_contract`，仅扩大原计划约束至严格区分 v1/v2 并增加引用守卫；不新增表/列/权限，不修改存量 document、digest、原件或已捕获方法。现有运行账号的 append-only 权限沿用。两份[合成规划](../../examples/threejs-products/README.md#商品规划合同样例)展示静态纸片与动画星图，不代表注册模板或真实交付。

执行与验证见[本批证据](../../output/implementation/product-plan-contract-20261027/verification.md)。下文保留此前 P1–P5 的日期与完成范围，不能用其当年未实现表述替代本段当前状态。

2026-10-26 制作规划更新：所有新正式商品采用 Three.js，视觉、动画、镜头与玩法分别按商品规划确定，所有方法明确此基线，见 [统一规范](PRODUCT-IMPLEMENTATION-POLICY.md)。已有 P1–P5 的保存/来源能力不改写；新政策门禁和计划合同在 T16.C2/T13.C2 接入，旧模块/方法/产物升级追加修订。当前项目体验制作稿登记仍有 `target.form === web` 的历史限制，必须在 T16.C2 按共享注册能力适配并验证 Three.js 配对，不能据模板已注册就宣称项目全链已支持。

2026-10-23当前：O1–O4本地技术与指定正式UI范围已通过，O4[用户批准独立记录](../../output/design-review/external-run-configuration-o4-formal-20261023/APPROVAL.md)保留原pending历史。用户上海04:21:08取消后续人工UI停点，当前按[T10-L](T10-LOCAL-UI.md)连续接入正式视觉并自主验证，不记作用户批准新画面。实际制作/日程未启用，真实账户/客户端/真机、云付费/发布仍另验，W3/W6暂停，整体T14/W4未完成。下述各批日期和交付状态按历史保留。

## P1：计划、证据与模块

项目唯一根为现有 Product。计划修订固定同商品/scope 的创作设定与摘要、国内/国际来源、源发布时间或明确未知、检索时间、选题理由、可配置新鲜度窗口和模块依赖。来源链接只保存，不自动检索或下载。原计划不变，修改追加新修订。

模块有稳定身份和可变的逐计划定义：同商品 moduleKey 保持 moduleId，领域不可换用；名称、依赖、方法要求和交付槽位在每份计划修订中固定。依赖只能指向同计划模块，拒绝自依赖、重复和循环。模块数由实际清单决定，不强制四个任务；支持多图片槽位、可选项及独立题库/报告/体验职责。

每个槽位声明平台保存的结构化原件或文件原件；图片/视频/网页/3D 包必须声明必需 original，preview 与来源 URL 分开。所需方法明确精确 manifest/正文/必要参考附件留存。P1 只保存要求，不把这些声明当成原件导入、方法捕获或运行成功。P2 已捕获候选方法、结构化产物和既有受控图片/视频文件；独立网页/3D 原包导入及统一审核留存仍属 P4。

历史读取返回不可变计划/模块定义及稳定引用，检查接口另按当前时间给出未知/过期/未来来源状态和模板配对能力。已注册配对仍需之后用实际题目/资源验证；未知形式可保存计划，但不冒称可运行。P1 所有计划均为 planning_only，archiveReady=false，不改变公开商品版本或启用 Skill。

## 服务端接口（P1 已实现并验证）

位于既有 /api/admin，沿用当前管理员、scope、Cookie、Origin/CSRF、限流、预期修订、幂等和审计，无新身份入口。

| 接口 | 行为 |
| --- | --- |
| GET /products/:id/production-plans | 分页固定计划修订 |
| POST /products/:id/production-plans | expectedRevision/requestId/plan，追加计划及完整模块快照 |
| GET /production-plans/:id | 精确历史、设定摘要、稳定模块和依赖引用 |
| GET /production-plans/:id/inspection | 当前来源时间与声明/模板状态，不改历史 |
| POST /products/:id/production-plans/validate | 校验未保存计划和同商品设定，返回检查结果 |

P1 不向原 MCP 工具偷偷增加项目创建权限；P3 再接受限创建/规划工具。P1 没有新平台页面，因此不跨过 G1/G4 或 T10-L 的 UI 审核。

## P1 验证证据

新增三表：production_plan_revisions、production_module_identities、production_plan_modules。共 53 模型/18 迁移，实际本地开发库已向前迁移并重新配置受限账号，schema diff 无差异；44 张原业务表的 1157 条记录原字段逐行摘要和前 17 份迁移 checksum 不变，旧 release/答卷/报告关联完整，临时测试库为 0。没有重放 seed 或向实际库新增商品/凭据/计划样例。

8 项新增测试验证证据时间、稳定模块/修订、依赖、文件声明、能力边界、幂等/并发、真实授权和数据库不可变约束。全量 API 274＋web 50＋SDK 19＝343 项唯一测试、类型检查和构建通过；未修改前端，未重跑浏览器验收。日志位于 .local/t14-p1/，历史浏览器数字不计为本批新证据。

## P2：项目候选方法与外部制作来源（已验收）

后续 O2 已将基础 Skill→商品定制→完整预览/明确同意→固定方法→制作交接接入正式后台，入口见 [项目工作区](PROJECT-WORKSPACE.md)。候选归属/当前计划/精确源修订与交接范围重新核验，复用本节不可变方法模型，无新表或迁移；正式实现与隔离验证通过，当前停 [O2 正式 UI 验收](../../output/design-review/project-methods-o2-formal-20261022/README.md)。交接不保存或启动运行，二进制原件按授权另取；下述 P2 数值与验收保持为历史批次记录。

项目方法固定到精确 ProductionPlanModule，包含模块/计划/设定摘要、专业用途、源 SkillVersion 的 ID/版本号/草稿修订与摘要、完整 manifest/正文和必要参考文件元数据。可从兼容的 DRAFT/REVIEWED/ACTIVE 版本捕获；新捕获不选择已归档源，已有快照和参考仍可读。相同源内容可在不同商品/模块形成各自快照，单模块可选多方法。没有新增全局自动启用，也没有放宽五用途 ACTIVE 组合或原 experience 两用途绑定入口。

复用原可变草稿和文件存储，不另建商品 Skill 仓库。源库升级、改稿、移除附件或归档后，项目快照正文与独立参考关联不变；下载按快照关联检查实际字节，不能只看源草稿当前附件。捕获与新来源记录均验证真实必要参考附件；文件损坏阻止新记录，不把仍可读的历史元数据误报为再次校验通过。

ProjectProductionRecord 只记录外部来源申报。它固定所选方法快照与摘要、同计划直接依赖模块的实际记录/摘要、多项真实输出、外部客户端/运行键/声明时间和说明。输出复用 ContentRevision、ExperienceAuthoringRevision 与 AVAILABLE AssetFile；错商品/scope/设定/领域/形式/摘要拒绝，分镜不能代替视频文件。原生体验制作清单标记 authoring，不能代替缺失的网页/3D 原包。只有 Skill、零输出或外部 URL 不能生成有效记录。

来源记录为 saved_outputs、platformExecuted=false、archiveReady=false；不宣称模型内部实际使用已被证明，不等同模块齐备、审核、留存、发布或平台执行。模块内追加序号、预期修订与事务 advisory lock 防止并发覆盖，requestId 的原重试窗口沿用 24 小时。W1 的跨任务认领/尝试/恢复、P3 的机器授权和 P4 的完整提交仍待执行；external.runKey 仅为来源标识，尚不是批次去重能力。

inspection 是动态投影：方法为 required_not_captured/partially_captured/captured；原件根据最新来源记录区分 declared_not_imported/partially_recorded/recorded_not_revalidated。最后一种只说明已保存原件的记录覆盖必需槽位，本次检查没有再次验证文件字节；archiveReady 始终 false。不能把历史累积的任意文件拼成当前完整提交，最终精确选择与重校验留 P4。

### P2 管理接口

仍在既有 /api/admin 下，只有当前人类管理员可用；旧机器凭据明确拒绝，P3 再加受限适配。

| 接口 | 行为 |
| --- | --- |
| GET/POST /production-modules/:id/methods | 分页读取 / 捕获精确源修订的方法快照 |
| GET /project-methods/:id | 固定正文、manifest、源修订与参考元数据 |
| GET /project-methods/:id/files/:fileId/content | 独立快照参考下载，实际摘要校验；attachment/nosniff，支持 Range |
| GET/POST /production-modules/:id/productions | 来源历史 / 追加含真实产物的方法申报 |
| GET /project-productions/:id | 固定来源、依赖输入、方法及多输出引用 |
| GET /project-productions/:id/outputs/:outputId/content | 按历史关联与实际摘要取回既有受控媒体 |

捕获输入固定 expectedModuleDigest/sourceVersionId/expectedSourceRevision/expectedSourceDigest/purpose/requestId。来源输入固定 expectedModuleDigest/expectedRevision/requestId、methods、inputs、outputs、external。完整严格契约位于 packages/contracts/src/project-production.ts；不接受调用者伪造状态、身份、执行成功、scope 或后台权限。

### P2 数据与验证证据

新增五表 project_method_snapshots/project_method_references/project_production_records/project_production_methods/project_production_outputs。复合外键约束同项目/scope/精确模块，延迟约束检查选中方法与输出齐备；五表不可变且运行账号无 UPDATE/DELETE。模块历史保持只读，以事务 advisory lock 序列化新来源记录。独立原件引用加入数据库保护与清理过滤，原文件不能因没有传统内容修订引用而被删除。

11 项新增测试覆盖 DRAFT 制作、旧附件下载、升级/归档后历史、单模块多方法/多输出、跨商品复用与越界拒绝、同计划输入、实际原件、缺失/损坏、经验清单与原包区分、原 ACTIVE 不变量、并发/幂等和数据库回滚。全量 API 285＋web 50＋SDK 19＝354 项唯一测试、类型检查/构建通过。实际本地开发库完成第 19 份向前迁移，58 模型、schema diff 无差异；47 张原业务表的 1157 条记录原字段和前 18 份迁移 checksum 不变，旧 release/答卷/报告关联完整，临时测试库 0。

日志 .local/t14-p2/。没有新增实际开发商品、Skill、计划或机器凭据，没有运行云服务、调度器或发布。G1 设计数据由隔离服务真实保存并读取后导出，全部是合成数据；隔离库和临时文件已清理，不能当实际管理员 UI 或真实生产演练验收。

2026-10-23 后续：O2 指定三图正式 UI 已获批准，见 [独立记录](../../output/design-review/project-methods-o2-formal-20261022/APPROVAL.md)。前文 O2 待验收为交付时记录；O3 正式运行运营实现/隔离验证通过，当前停正式 UI 验收；固定计划、方法与旧制作记录保持，不新增实际执行。


2026-10-23后续：O3指定正式三图于上海02:25:04获批，[独立批准](../../output/design-review/production-recovery-o3-formal-20261023/APPROVAL.md)。O4先核查/设计未启用运行配置；已有精确计划、方法、依赖记录仅作固定引用，新题目没有S0–S2产物时保持未就绪。O4不改变本文件既有计划/DAG契约，也不将未来依赖捏造为已有recordId；新设计获批后才正式实现。

2026-10-23当前：O4设计于上海03:02:52获[独立批准](../../output/design-review/external-run-configuration-o4-20261023/APPROVAL.md)，正式版本化配置保存/历史、精确校验与JSON/Markdown交接已实现，I/V技术通过，停[O4正式UI验收](../../output/design-review/external-run-configuration-o4-formal-20261023/README.md)。新增两配置表及第26迁移，既有计划/DAG、方法和制作回执不改；固定输入或未来等待条件分别保存，导出不自动接新版计划或最新方法。未知时间/来源/工具/费用不代填，新题目无S0–S2仍未就绪。23项新增API、全量511及21个O4页面情境/26图通过，旧数据保全见[PROGRESS](PROGRESS.md)。配置始终未启用，整体O4/T14/W4未关闭，W3/W6暂停。
