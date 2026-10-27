# 数据模型与维护约定

2026-10-23。当前73模型/26迁移；平台优先的T14-P/W、G5布局历史及O1统一连接已分批向前迁移，O2/O3复用既有方法/run模型，本地指定范围已通过。O4在设计批准后新增稳定配置容器与不可变修订两表，第26迁移已应用，保存/历史、校验/导出及隔离验证通过，指定正式三图已获[独立批准](../../output/design-review/external-run-configuration-o4-formal-20261023/APPROVAL.md)，原技术pending不改写。64类表1157行旧字段、原25迁移校验和及历史引用保持，新配置/修订与临时库均0，详见文末O4约定。G8、本地T10-G及O1–O3指定批准范围保持，真实账户连接/真机另验。T15-B批准保留，T16-A小屋/手记仅技术样例，云端验收留T09。内容修订见[CONTENT-FOUNDATION.md](CONTENT-FOUNDATION.md)，采用/清理见[CONTENT-ADOPTION.md](CONTENT-ADOPTION.md)，体验运行/制作见[EXPERIENCE-RUNTIME.md](EXPERIENCE-RUNTIME.md)，项目当前范围见[PROJECT-WORKSPACE.md](PROJECT-WORKSPACE.md)；字段和额外约束以Prisma schema/迁移SQL为准。

## 模型分组

| 组 | 业务表 | 关键约束 |
| --- | --- | --- |
| 环境 | environment_marker | 单例环境/数据库名称标记；运行账号只读；生产标记拒绝演示 seed |
| 目录 | categories、tags、products、product_tags | slug 唯一；每商品一个主分类、多标签；价格存整数分；当前版本必须属于同一商品和数据范围 |
| 版本 | product_versions | 商品＋版本号唯一；结构化配置；发布后不能覆盖、删除或退回草稿 |
| 交付 | orders、code_batches、redemption_codes | 平台＋订单引用唯一；码摘要唯一；订单、版本、权益、批次的数据范围一致；补发关联旧码 |
| 身份 | users、entitlement_bindings | Supabase 用户 ID 唯一；无邮箱密码；每权益最多一份绑定，绑定与所有者在同一事务中一致 |
| 机器接入 | machine_credentials、machine_uploads、machine_calls | 凭据/票据只存摘要；单领域/范围、有效期、不可变授权/上传关联/日志；仅可追加撤销，详见 MCP-LOCAL-TRANSPORT |
| Codex 连接 | codex_connections | 当前管理员/scope 的持久连接业务键、固定授权摘要与工作区/各域凭据分组；不保存原始密钥，仅可追加撤销 |
| 账户会话 | account_sessions | 本站 Cookie 摘要；Auth 会话＋scope 唯一；访问/刷新凭据分别认证加密；撤销时清空凭据，重新交接不延长期限 |
| 权益 | entitlements、access_sessions、access_grants | 归属与有效状态分开；版本锁定；消费次数不能回退；会话可持有多个权益，每条授权可单独撤销 |
| 答卷 | attempts、attempt_answers、reports | 权益＋答卷序号唯一；答卷＋题目唯一；每答卷唯一报告；历史版本和报告快照锁定；删除报告留下墓碑 |
| 体验发布/资源 | experience_releases、experience_resources | 每商品版本一份不可变清单；固定设定/内容/主题/模板与资源摘要；答卷锁定同版本/scope release，报告呈现不可改写 |
| 体验制作/资源 | experience_authoring_revisions、experience_authoring_resources | 草稿/审核均追加历史；固定配置摘要/设定/两方法/资源与可信来源，发布捕获精确最新审核稿；草稿资源亦受清理保护 |
| 汇总 | question_stats、question_option_stats、result_stats、result_type_stats | 按版本聚合；题目/选项、类型复合键唯一；计数非负；回答与完成答卷使用不同分母 |
| 运营 | campaign_assets、campaigns、events | 素材按版本＋平台＋类别＋变体唯一；事件去重键唯一；演示事件强制使用 DEMO 来源 |
| 文件/上传 | asset_files | 同一记录管理上传状态与文件；版本/上传者/scope 复合引用；就绪元数据不可改；READY 媒体要求匹配的 AVAILABLE 文件 |
| 内容底座 | creative_profile_revisions、content_revisions、content_references、production_records | 共同创作设定、旧题库/素材快照、固定输入位置与制作来源；历史只追加、同商品/scope 复合引用、拒绝循环 |
| 项目制作 | production_plan_revisions、production_module_identities、production_plan_modules、project_method_snapshots、project_method_references、project_production_records、project_production_methods、project_production_outputs | 精确计划/模块/设定与方法/实际产物来源，不可变、同项目/scope、完整性与原件清理保护；不代表执行或审核留存 |
| 项目画布布局 | project_canvas_layout_revisions | 精确计划/商品/scope，独立顺序与摘要，仅可追加；坐标不改变业务计划摘要或方法/审核依据 |
| 复查/采用 | content_review_records、content_packages、content_package_items | 影响 fingerprint、不可变采用清单与依赖；同商品/scope、包序号唯一、只追加 |
| 清理计划 | file_cleanup_plans | 固定文件清单/摘要、执行结果、到期/重试状态；仅原管理员/范围读取和执行，保留元数据 |
| skill 库 | style_skills、style_skill_versions、skill_reference_files、style_skill_attachments | 四领域及可选 experience 专业用途、稳定标识、版本与参考路径；同 skill/scope 外键，单一 ACTIVE，审核后内容/文件不可覆盖 |
| 重试/审计 | idempotent_requests、admin_audit_logs | 主体＋操作＋请求 ID 唯一；请求摘要和到期时间；运行账号不能修改或删除审计 |
| 防猜测 | request_rate_buckets | scope＋种类＋主体的摘要主键；正数 hits 与 window_ends_at；数据库原子窗口计数，跨 API 进程共享 |

当前共 71 个模型、二十五份迁移，均位于私有 `orai` schema。T07 为第七份迁移，T12-A 追加结构迁移与独立历史回填，T12-B 再追加媒体实际尺寸/时长迁移，T12-C 追加复查/采用/清理计划与文件终态迁移，T15-A/B 增加体验运行/制作及精确发布约束；后续 T14-P/W、G5 和 O1 增加项目、留存、外部回执、布局历史及统一连接，旧迁移未改写。业务 ID 默认由 Prisma 生成 UUIDv7，数据库快照/交付/文件也可生成 UUIDv4，演示 seed 使用确定性 UUID。时间存带时区时间戳，API 输出 ISO 8601；金额以分存储。

T07 为 categories/tags/products/product_versions/campaign_assets 增加非负 revision。AssetFile 保存服务端文件键、原始名称、实际 MIME/字节数/SHA-256、上传者、到期/验证时间及 PENDING/VERIFYING/UPLOADED/AVAILABLE/FAILED/EXPIRED/DELETING/DELETED；当前将上传会话与最终文件合为一表。CampaignAsset.fileId 使用同版本/scope 复合外键，数据库触发器进一步检查用途、AVAILABLE 状态和元数据逐项一致；缺文件媒体不能 READY。AVAILABLE 内容元数据冻结，替换需新文件。旧占位素材可以保留非 READY 状态，不冒充真实文件。

T12-B 的 `width / height / durationMs` 在新上传完成时从真实文件探测并保存，AVAILABLE 后不可修改。旧文件保留空值并明确显示未记录。第八/九份迁移为 T12-A 结构及历史回填，第十份为 `20261019110000_verified_media_metadata`。详情见 [工作台交接](CONTENT-WORKBENCH.md)。

### 内容后台底座与后续扩展

[CONTENT-BACKOFFICE.md](CONTENT-BACKOFFICE.md#41-逻辑数据实体) 定义扩展实体。T12-A 已实现设定修订、题库/素材历史、跨内容引用/使用快照及制作来源四表，计入 33 模型；文件复用 AssetFile，原件归档元数据放在受校验的 authoring 中。T12-C 已增加 ContentReviewRecord、ContentPackage、ContentPackageItem、FileCleanupPlan 四模型，该批达到 37 模型。T13-A 又新增 StyleSkill、StyleSkillVersion、SkillReferenceFile、StyleSkillAttachment，达到 41 模型；T13-B 新增 CreativeSkillSet/CreativeSkillBinding 并扩展 ProductionRecord，达到 43 模型；T14-LA 新增三类机器记录达到 46 模型。T14-LB 增加题库版本的固定设定引用及机器制作来源字段，模型数不变、累计 15 迁移。组合/绑定只追加，按设定固定五用途快照与同 scope 的版本外键；机器权限与共用业务服务在每次读取和写入事务中复核。

- 题目/计分/报告模板复用 `ProductVersion.configuration`，素材沿用 `CampaignAsset` 的商品版本、平台、类别和变体；变体与历史修订分别记录。
- 文件记录受控存储键与实际元数据，视频/图片字节由存储适配器保存。上传可用状态与素材审核状态独立，历史缺失文件不视为已就绪。
- 商品与 skill/素材包固定引用明确版本/修订；新 skill 或新采用稿不改变历史制作记录，消费者报告快照仍走原权益与期限规则。
- 单题引用固定 productVersionId/questionId，草稿额外带配置修订/摘要；文案块固定素材修订/blockId，视频分镜记录使用位置、引用/改写及实际使用快照。上游新稿触发影响提示，不覆盖既有视频；采用组合 manifest 固定全部输入。
- 原 skill 组合按 assessment/cover/video/copy 四领域校验和授权；T15-B 的可选 experience 另存场景/报告呈现方法。共用存储底座，方法绑定与产物间内容引用分别保存。循环、失效、越范围和领域不匹配的引用拒绝写入/采用。
- 机器凭据保存摘要与授权范围，版本/文件引用校验 DEMO/LIVE 范围；MCP 与网页共用业务服务，不给适配器 owner 数据库连接。

共享说明已在 T12-A 固定为商品创作设定修订，含情绪/理解目标、参与视角、世界观、形式、视觉/语言/声音及独立报告方案草稿。新方案仍是 authoring-only，旧 report 运行 schema 不变；T15-A 注册旧图文报告，T15-B 增加制作/兼容校验与样例预览，任意新 renderer 的实现继续留后续批次。旧结果事实和个人报告快照不受设定更新影响。

第十一份迁移 `20261020010000_content_adoption_and_cleanup` 固定历史采用/复查、商品级内容写锁与文件引用锁。清理仅允许过期且无当前/历史引用文件，经预演确认后进入 DELETING/DELETED；保留文件名/摘要/大小等不可变元数据，禁止复活或直接删除记录。采用包保存完整内容/输入快照及受保护文件引用，不含消费者数据或存储路径；采用不会发布商品。新表权限由 db:provision 收紧，旧迁移不改写。

第十二份迁移 `20261020020000_style_skill_libraries` 新建上述四表与 SkillVersionStatus。参考文件独立于商品媒体用途，复用受控流式存储；本批不改 AssetFile 的商品关系或给媒体上传开放文档类型。skill 领域/标识不可变，版本按修订锁更新，审核后正文与附件固定；启用新版会归档原版，数据库约束每个 skill 最多一份 ACTIVE。版本和文件元数据无物理删除权限，触发器固定 orai search_path。详见 [skill 库交接](STYLE-SKILLS.md)。

第十三份迁移 `20261020030000_creative_skill_bindings` 固定五用途组合和制作记录的方法快照。第十四份 `20261020040000_machine_transport` 增加机器凭据、上传绑定和调用日志；长期凭据和票据只保存摘要，权限/范围不可原地扩大，撤销后保留合法历史。

第十五份 `20261020050000_machine_content_provenance` 已在本机应用：`ProductVersion.creativeProfileRevisionId` 以同商品/scope 复合外键固定设定；`ProductionRecord.machineCredentialId/machineRequestId` 成对保存，只有 source=mcp 时允许存在。数据库触发器核对凭据领域、内容写权限、商品范围和操作者归属；服务端写入事务另检查即时有效期/撤销/停用状态。审核、就绪等状态修订复制完整机器来源与输入，不改历史含义。

旧题库没有固定设定字段时，内容快照继续保持旧 JSON 形状与 digest，不给旧版本/旧采用包注入新默认值。迁移及本机四域新稿之后，23 类既有表每条旧记录摘要一致；对新增结构列按迁移前字段投影比较。没有 reset、重播 seed 或覆盖历史题目/报告/采用包。最终 Prisma validate、迁移/provision 与 schema diff 检查通过。实际样例和最终验证证据见 `.local/t14-lb/` 与 PROGRESS.md。

### T15-A 体验兼容运行底座

第十六份迁移 `20261021010000_experience_runtime` 新增 ExperienceRelease/ExperienceResource，以及 Attempt.experienceReleaseId/runtimeCheckpoint、Report.presentation。可用历史版本回填默认 DOM/图文清单，答卷/报告回填固定引用；新发布、开始和报告生成通过触发器捕获。清单摘要、设定一致性、同版本/scope 资源及不可变性在数据库检查，发布/读取另验证严格契约、注册模板和全部题目/选项映射。运行账号不能更新或删除两张新表。

现有 `engine=dimensions_v1`、单选答案、报告结果与严格 v1 配置保持原含义。确认答案和服务端检查点原子保存；完成后原始答案移除也不能重新进入未完成状态。资源只读取权益/报告所属 release 的已验证文件，并保护其历史清理引用。当前仅启用插画/纹理图片；model/audio/font 为未启用契约，T15-B 的后台制作/图片上传见下节。

本机迁移/provision、Prisma validate、隔离和实际 schema diff 全部通过。40 类表共 1151 条旧记录按迁移前字段摘要一致，前十五份已应用迁移校验和不变；没有 reset、重播 seed 或替换旧报告。详见 [运行交接](EXPERIENCE-RUNTIME.md) 与 `.local/t15-a/`。

### T15-B 体验与报告制作

第十七份迁移 `20261021020000_experience_authoring` 已本机应用：新增 ExperienceAuthoringRevision/ExperienceAuthoringResource，ExperienceRelease 增 nullable authoringRevisionId 同版本/scope 复合引用。保存 draft、审核 reviewed 均只追加，固定配置摘要、设定/报告方案、两用途方法快照、制作来源与资源引用；数据库检查方法版本/可信机器来源、资源齐备、同版本绑定及精确最新审核发布。原来没有 authoring 的版本继续使用默认发布清单；有 authoring 时不能绕过审核。

AssetKind 增 EXPERIENCE，独立限制 PNG/JPEG/WebP 和 4 MiB。style_skills / machine_credentials / machine_calls 的领域检查扩展为可选 experience，原四类交付物与五用途组合不变。新表无 UPDATE/DELETE 权限，历史草稿和发布清单都保护文件引用；移除当前资源不会释放历史引用。

隔离与实际 schema diff 均无差异，实际 migrate/provision 完成；42 类表共 1156 条旧记录按迁移前字段摘要一致，前十六份迁移 checksum 不变。5 个旧 release 保留、答卷/报告无缺失引用，临时测试库残留 0。没有 reset、重播 seed 或新增实际商品/订单/机器凭据。私有证据在 `.local/t15-b/`；T15-B 界面本次已获用户批准。

T16-A 复用同一模型：静态注册 `quiet-room@1` / `field-notes@1`，后台和机器继续保存原 authoring/release/资源与来源；四类采用包保持原形状，试点 manifest 额外固定精确 experience release。所有新业务样本均来自一次性隔离库，开发库无新增商品/订单/凭据。回归后再次核验同一 42 类表/1156 旧记录、17 迁移和历史引用一致，实际 schema diff 无差异、临时测试库残留 0，证据 `.local/t16-a/`。

[EXPERIENCE-PLATFORM.md](EXPERIENCE-PLATFORM.md) 中的 2.5D/Three.js 模板和未来类型化答案/任务状态仍待 T16/T17。首期不同正式交互模板使用独立商品版本以沿用现有统计隔离，新输入/玩法按独立引擎验收。

## 账号与 schema 隔离

- `MIGRATION_DATABASE_URL` 是迁移/本地 seed 的 owner 连接，只供维护命令使用，不传给 API 容器或浏览器。Prisma 迁移配置不会回退到运行账号。
- `DATABASE_URL` 是受限 `orai_app` 运行连接；Compose 使用同一账号的 `DATABASE_CONTAINER_URL`，主机改为 `db:5432`。
- 本地 provision 只允许明确的 loopback 开发/测试库；创建无 superuser、createdb、createrole、bypassRLS 权限的账号。已有高权限角色拒绝复用，已有密码不会自动重置。
- 运行账号无 schema 创建、迁移元数据写入、环境标记写入权限；用户只能以 USER 初始角色插入，只能更新禁用时间和更新时间；ADMIN 初始化由 owner 执行。审计仅可读/追加。
- 迁移撤销 PUBLIC 及存在的 Supabase anon/authenticated/authenticator 对 `orai` 的直接权限；不修改 `auth` 或在 `public` 建业务表。部署时保持 `orai` 不在 PostgREST 公开 schema 中；不能将其授权给浏览器角色。
- 这些数据库权限不代替业务鉴权。T04 检查匿名 Cookie/归属/期限/撤权；T06/T07 检查 Supabase 身份、本地账户会话、已验证邮箱及当前数据库角色；Prisma 不自动提供按用户隔离。受控本地 `admin:manage grant/revoke` 用 owner 修改已有用户角色并审计，不提供 HTTP 提权入口。

本地验证已创建独立 `auth` 哨兵表，在空库应用迁移后确认其未被修改，并实测运行账号不能读取它。真实 Supabase 权限配置与公网连接在 T09 验收。

## 迁移、重复 seed 与恢复

在项目 Node 版本下，先启动本地数据库，然后执行：

```sh
pnpm build
pnpm db:validate
pnpm db:migrate
pnpm db:provision
pnpm db:seed
pnpm db:status
pnpm test
```

`db:migrate` 使用 `migrate deploy` 应用已保存迁移，不重置数据。`db:provision` 在迁移后设置账号权限和环境标记。seed 在事务中校验并装载占位商品；重复执行保留稳定 ID、码摘要、快照和会话，不新增副本。公开 CLI 不输出完整码或会话令牌。

前七份迁移依次是 `20261009113000_initial_business`、`20261009114500_binding_trigger_record`、`20261009115500_user_role_insert_guard`、`20261009121000_delivery_scope_consistency`、`20261009133000_anonymous_rate_control`、`20261009155000_account_sessions`、`20261016171000_operations_and_files`。第 2/3 份修复绑定触发器与 USER 初始插入，第 4 份补齐交付复合引用，第 5 份新增限流表，第 6 份新增账户会话，第 7 份新增修订、文件/上传、素材文件关系和检查。新表的本地运行账号授权由迁移后的 db:provision 设置。不得改写已经应用的迁移。

新增模型或约束时，在独立开发库生成并审阅新迁移，包含必要的数据回填、CHECK/触发器和运行账号授权；不能仅运行 `db push` 代替迁移记录。跨 scope、版本锁定等手写约束也必须保留在迁移中。

迁移失败时先用 `db:status` 和 owner 查明失败原因；事务失败会回滚该份迁移。修复后依据数据库真实状态处理 failed migration 记录，再重试。不要自动 reset、删除卷或随意将失败迁移标为已应用。若已应用迁移存在缺陷，以新迁移修复。正式数据恢复、备份和云端权限操作属于 T09，尚未验收。

集成测试在同一本地 PostgreSQL 上创建带随机后缀的 `orai_test_t02_*` 至 `orai_test_t06_*` 空库；测试迁移、权限、seed 与业务服务后关闭所有连接，确认无残留，再普通删除自己创建的测试库。开发库与数据卷不删除。连接池会等待底层 socket 真正关闭。

## 发布与历史版本

1. 新配置从 DRAFT 开始，Zod 校验题目、选项、维度、分值、阈值、模板及期限。配置只允许结构化数据，不接受可执行脚本或额外字段。
2. T03 已实现 REVIEWED 后发布事务：重新校验配置和独立公开样例/元数据，写 publishedAt 并切换同商品/同范围当前版本；修改已审核配置重置为 DRAFT。商品写锁串行分配版本号/切换版本，审计与 24 小时幂等记录一同提交。
3. PUBLISHED/ARCHIVED 版本不能原地改题、规则、模板、版本号或发布时间，也不能删除。调整创建新版本，更新商品当前版本。
4. 订单、码、权益和答卷都保存原版本 ID。已有权益不自动升级；v1 暂无升级/转移入口。T03 下架从公开目录移除商品，不改/删旧权益和版本；内部 RuntimeVersionService 可读取原 PUBLISHED/ARCHIVED 配置，不依赖商品当前可见性。T04 已拒绝下架商品新的领取，允许有效旧权益恢复原版本；T05 调用历史配置前须通过 T04 授权服务。
5. 报告保存当时的商品名、版本号、结果类型、维度、解释、建议及说明快照。改商品或删原始答案不触发重算；主动删除置空快照、记录 `deletedAt`，不能恢复内容或重置消费次数。

`pnpm catalog:manage`、`pnpm delivery:manage` 与 `pnpm retention:preview` 保留受保护本机维护用途；T07 的 HTTP 入口使用已验证账户与当前 ADMIN 角色，复用版本及交付事务。CLI owner 与 API 受限运行连接分离。预览含私有规则，交付只在首次返回完整码，清理只列候选元数据；任何路径均不能将本地维护授权当作邮箱登录。命令、DTO、修订/幂等与上传状态见 [API-CONTRACTS.md](API-CONTRACTS.md)。

## 匿名授权与交付事务

- 首次领取按订单、码、权益、会话顺序加锁；领取/恢复创建相同权益并固定原版本，码明文和新会话明文只在交付/HTTP 内存中使用。授权对象通过私有 WeakMap 记录来源与摘要，每次用当前数据库状态核验，不能用同形对象伪造。
- 私人访问采用权益 → 会话 → grant → 答卷/统计的锁顺序；退款先按 ID 排序锁定全部相关权益和会话，再修改答卷/统计，避免领取/退出/退款相互死锁。T05/T06 必须沿用此顺序并在写事务中重新授权。
- 订单平台＋引用唯一；一次批量发码按 quantity 发足随机码，缓存只含回执。首次秘密交付文件为 0600；相同 requestId 只重放回执，不保留码或会话明文。兑换缓存只存 entitlementId，重试重新判断最新撤权/期限，返回当前元信息。
- 补发新码引用原权益，保留原版本/消费/期限/归属；旧码和对应全部匿名 grant 撤销，多商品会话保留其他 grant。没有有效 grant 时会话本身撤销；绑定仍不能用码匿名恢复。
- 退款是测试业务撤权，不执行平台资金退款；码、权益、grant、有效答卷统计贡献、事件和审计同事务完成。统计漂移导致整体回滚；快照、使用次数与账户绑定保留。实际删除原始回答前须有可用贡献账本，T05 当前只实现清理预演。
- 限流桶只存范围/主体摘要和计数/截止时间，窗口在数据库原子更新，过期索引已建立；没有后台定时清理器。正式流量下的过期桶维护与代理来源配置需要在云运维阶段安排。

## 评分与保留期

T06 账户会话只将随机 Cookie 的 SHA-256 摘要用于查找；Auth 的访问/刷新凭据用独立密钥 AES-256-GCM 加密，分别认证 scope/会话 ID/凭据类别。刷新串行锁定会话行；本地撤销或到期的 Auth 会话不能以旧凭据重新打开，退出清空两种凭据。重新交接旋转 Cookie，保持已有绝对设备期限。业务账户以稳定 Supabase 用户 ID 关联，禁用状态/角色/邮箱验证每次重查，不保存密码或邮箱。

显式绑定按订单 → 码 → 权益 → 账户会话/用户 → 排序的匿名会话/grant 加锁。匿名读取使用共享锁，绑定先取得相关会话的独占锁，避免多商品绑定升级锁死锁。唯一归属、撤销旧授权和绑定记录同事务，不修改版本、答卷、报告、次数、期限或统计贡献。绑定后运行接口使用当前账户所属权益授权，旧匿名授权被拒绝；未绑定权益保持匿名使用，即使认证服务临时不可用。隔离测试已覆盖这些行为，真实云端验收仍待完成。

`dimensions_v1` 配置支持 1–100 题、1–12 维，题目归属维度，题目/维度各有权重。适用选项含整数分，不适用选项含 `points: null`；至少有一个不适用选项。题量、名称、维度与报告类型不写死在模型中。

阈值按顺序完整覆盖 0–100，不允许空隙、重叠或未知类型；下界包含、上界不包含，最后一档包含 100。演示分段为 `[0,40)`、`[40,70)`、`[70,100]`。每种正常结果恰有一套模板；信息不足使用独立结果 ID。

T05 后端对每题按适用选项最小/最大分归一至 0–100，再按题目权重计算维度均值、维度权重计算总分。不适用不计评分权重；适用回答少于 `minApplicableAnswers` 时返回 `score: null` 与原因，任意维度不足总分为 null，使用信息不足报告。全部不适用不产生零分。阈值使用精确有理数比较，显示分数保留两位小数。评分/完整性/边界和真实 100 题、12 维 HTTP 提交流程已有测试；seed 报告仍是明确标记的合成联调快照。

T05 的锁顺序为权益 → 会话 → grant → 答卷 → 题目聚合父行/选项 → 结果聚合父行/类型。逐题保存和贡献替换同事务，答卷整体修订与单题修订分别递增；完成快照、消费、完成事件、结论贡献及重试引用原子提交。展示反馈在保存提交后单独读取，排除自己的单题/完成贡献，分别判断回答与结论分母/门槛。父子计数不一致时写入回滚、展示返回不可用，不显示假零样本。有效已删除报告仍贡献汇总，退款依据保留的 resultTypeId 和原始答案剔除贡献。

运行幂等窗口 24 小时，主体包含权益/范围/目标操作。缓存只存引用与修订，不含报告内容，重放先重新授权并读取删除/到期状态。报告读取在权益锁与授权检查后重读快照，实际阻塞删除并发测试确保不会返回旧内容。

| 期限 | 固定字段/起点 | 当前演示值 |
| --- | --- | --- |
| 首次兑换 | 配置 firstRedemptionDays；发码时固定 code.claimDeadline | 30 天 |
| 权益访问 | 配置 entitlementDays；领取时固定 entitlement.accessExpiresAt | 120 天 |
| 原始答案保留 | 配置 rawAnswerDays；完成时固定 attempt.answersExpireAt | 7 天 |
| 报告保留 | 配置 reportDays；完成时固定 report.expiresAt | 90 天 |
| 匿名会话/重试记录 | session.expiresAt、idempotent request.expiresAt，独立于上述期限 | 默认会话 30 天；重试记录 24 小时 |

这些值仅供开发，不是售后承诺。首次兑换截止不截断已领权益；权益访问、会话和报告保存分别判断，不合并成一个 expiry。进行中答卷不设置答案清理时间。T05 的 `retention:preview` 仅列完成/无效答卷的过期答案、未删除报告的过期快照候选；按独立分页输出 ID/期限/份数，不读取或输出回答内容，不删除任何数据。主动删除仅清空报告快照并留墓碑，保留原始答案、汇总与消费；重复 seed 也不恢复已删快照。退款/无效答卷同步剔除统计。正式保留期、原始答案贡献账本与删除后汇总政策在 T11 确定。

## 演示数据边界

seed 同时要求：development/test 环境、非 production NODE_ENV、loopback、`orai_dev` 或受控 `orai_test_*` 名称、显式 DEMO_SEED_DATABASE、分别配置的 owner/runtime 账号、匹配的环境标记和实际数据库身份。生产标记或远程目标会在写入前拒绝。

演示商品/订单/码/权益/答卷/报告/素材/文件/事件使用 DEMO 范围，跨 DEMO/LIVE 引用被复合外键阻止。生产目录排除 DEMO，开发/测试仅展示 DEMO；T07 管理查询、上传和售后也检查范围，公开封面仅允许当前可见商品明确采用的文件。隔离由服务端检查，真实云端认证验收仍待完成。

三款主占位商品、状态 fixture、统计口径和真实认证限制见 [PLACEHOLDERS.md](PLACEHOLDERS.md)。完整码/令牌仅在 seed 库函数首次创建时返回内存，数据库只保存 SHA-256 摘要；seed CLI 丢弃秘密，重复 seed 不恢复完整码。delivery:manage 与 T07 受保护 HTTP 均执行受控首次交付。

T13-B 的组合快照不保存生命周期状态或上传会话；ProductionRecord 增加 skillSetId/skillVersions，主 skillVersionId 受同范围外键约束。审核/发布/就绪修订复制完整来源。v1 历史包原样解码，新 v2 包固定完整 skillSet。详见 [SKILL-BINDINGS.md](SKILL-BINDINGS.md)。

## T14.P1 商品计划与稳定模块（已验收）

production_plan_revisions 固定同商品/scope 的设定、证据、模块声明与摘要；production_module_identities 维持 productId/moduleKey 的稳定 ID 和不可换用领域；production_plan_modules 固定逐计划位置/定义/依赖。三表不可变，完整性与依赖循环由延迟约束校验；规划不表示文件已导入、方法已捕获或模板已运行。详见 [实现与证据](PRODUCTION-PLANS.md)。

## T14.P2 项目方法与外部来源（已验收）

project_method_snapshots 固定精确计划模块、源 Skill 草稿修订、用途/正文/manifest/摘要；project_method_references 独立保留参考文件，不依赖源草稿当前附件。project_production_records 固定同计划依赖输入与外部申报；project_production_methods 约束同模块方法，project_production_outputs 固定实际内容/体验稿/文件及摘要。五表不可变，受限账号无 UPDATE/DELETE，延迟约束验证完整性；文件清理与数据库状态变化均保护原件。原生体验清单不等于网页/3D 原包，不新增执行器或全局激活，见 [实现与证据](PRODUCTION-PLANS.md)。

### T14.P3 受限项目授权（2026-10-22，本地验收通过）

迁移 `20261022010000_machine_projects` 新增四个模型：`MachineProjectWorkspace`（范围、有限额度、到期/撤销）、`MachineProject`（不可变的工作区/商品归属和初始化业务键）、`MachineProjectSkill`（本项目领域候选库归属和方法业务键）、`ProjectCandidateDraft`（固定方法、原生稿及机器来源）。`MachineCredential.workspaceId` 可空，旧凭证不变；P2 方法/制作记录新增可空的成对机器来源；experience authoring 新增可空 `projectPlanModuleId`，旧记录不追写。商品仍为唯一项目根；新记录均受 scope 外键与 SQL 校验，成员关系和候选来源禁止 UPDATE/DELETE。详见 [MCP-PROJECTS.md](MCP-PROJECTS.md)。


### T14.P4 项目留存（2026-10-22，本地验收通过）

迁移 `20261022020000_project_retention` 新增 ProjectOriginalFile、ProjectReviewRevision、ProjectReviewRecord，累计 21 迁移/65 模型。原件按 planModule/输出/文件槽位绑定，AVAILABLE 元数据/字节记录不可重写；MachineUpload 和 ProjectProductionOutput 增加可空 originalFileId，旧行不追写。审核修订/所选记录链接不可改写，状态、固定选择和完整链接由 SQL 约束保障；文件取回重新校验字节。56 类原有业务表 1157 行及旧迁移摘要保留，详见 [PROJECT-RETENTION.md](PROJECT-RETENTION.md)。

### T10.G5 计划布局历史（2026-10-22，本地技术验收通过）

迁移 `20261022040000_project_canvas_layouts` 追加 `ProjectCanvasLayoutRevision`，从 W1/W2 的 69 模型/22 迁移增至 70 模型/23 迁移。每行固定计划修订、商品、scope、独立序号、布局 JSON、摘要和创建者；数据库限制同计划归属、连续追加及不可变历史，运行账号无 UPDATE/DELETE。布局只保存计划根/稳定模块坐标，独立保存不修改业务计划摘要，初始布局可与新计划同事务写入；方法/产物/审核的旧关系不变。

G5 当批 schema diff 无差异；G6/G7 最终保全再次确认 63 类既有表 1157 行旧字段、旧迁移校验和、5 份 release/历史答卷报告引用保持，临时库 0。最终 427 项测试/类型/构建与真实本地 Auth 编辑验证见 [PROJECT-WORKSPACE.md](PROJECT-WORKSPACE.md)；G8 后续仅指定三图获批，原验证时的 pending 状态保留为历史证据。

### T14.O1 统一 Codex 连接（2026-10-22，本地 UI 已批准）

第 24 份向前迁移 `20261022050000_codex_connections` 新增 `CodexConnection`，累计 71 模型。连接保存 owner/scope、所属工作区、稳定 clientKey、规范化输入摘要、预览摘要和固定授权 document；`MachineCredential.codexConnectionId` 可空，旧单领域授权不追写或改动。owner/scope/clientKey 唯一，各连接/domain 唯一，同 owner/工作区/scope 复合外键和延迟约束保证凭据领域/权限/Skill/到期与固定方案完整一致。工作区（可选新建）、分组元数据和独立领域凭据在同一业务事务创建；任一写入失败则全部回滚。

元数据及关联不可变，仅允许追加 revoked_at；运行账号无整表 UPDATE/DELETE，单独授予撤销字段更新权限。原始 bearer 仍只存既有凭据摘要，连接 document、审计和幂等缓存均不保存原文；缓存只含连接 ID。提交后响应丢失，按业务键和原请求找回同一记录，不能恢复密钥。整组撤销只更新该分组的凭据和连接撤销时间，不撤销共享工作区或其他连接。

第 25 份 `20261022060000_codex_connection_legacy_compat` 仅将凭据完整性延迟触发器限定为 `codex_connection_id IS NOT NULL` 的新分组记录，避免旧凭据维护产生无关待决事件；新连接完整性约束保留。已应用的第 24 份 SQL 不改写，修复通过独立向前迁移完成。最初逐领域 R1“无需新表”是当时的假设；R2 获批后要求持久分组、原子签发/恢复和整组撤销，因此明确修正，不抹去旧方案证据。

本机只向前应用结构/权限，未在开发库创建连接或签发凭据。接口和页面验证仅在自动回收的隔离 TEST 库使用身份/剪贴板替身；真实账户持续访问、真实客户端和正式 UI 均不因此通过。最终 schema diff、旧字段/迁移摘要保全及测试结果见 [PROGRESS.md](PROGRESS.md) 与 [本批评审](../../output/design-review/codex-connections-o1-formal-20261022/README.md)。

### T14.O2 商品方法运营与只读交接（2026-10-22，技术通过，正式 UI 待验收）

复用 ProjectMethodSnapshot/ProjectMethodReference：精确计划模块、用途、基础 Skill 版本/修订/摘要、完整 manifest/附件、商品参数/补充与展开正文继续不可变。运营捕获先核对当前计划及候选归属，商品 SHARE 锁与保存计划 UPDATE 锁串行；真实并发测试保证不能在已过期计划上新固定，已成功 requestId 仍可恢复原历史。商品定制追加另一快照，不修改共享库或旧产物来源。

没有新增交接表、运行记录或迁移，累计仍为 71 模型/25 迁移。方法选择/依赖记录/最小片段/连接仅留当前页面，关闭/重开保留，刷新重新选择；服务端只读预览与重新核验后导出固定清单，不将内存或 LocalStorage 冒充业务保存。清单固定真实商品名、计划/模块/共同设定、方法与输入摘要、必要原件/附件元数据，不带凭据、producer credentialId、内部存储键/下载路径或消费者答卷/报告；二进制原件需按授权另行取回。

本批 64 类表/1157 行旧字段、25 迁移与源 SQL 校验和、5 份 release/历史引用保持，schema diff 无差异；临时库、开发库 Codex 连接/分组凭据均 0。验证仅使用隔离 API/TEST 库、身份/剪贴板替身；[正式 UI 仍待验收](../../output/design-review/project-methods-o2-formal-20261022/README.md)，不扩大为真实权限、客户端或真机通过。

O2 后续正式 UI 批准见 [独立记录](../../output/design-review/project-methods-o2-formal-20261022/APPROVAL.md)；上节交付时 pending 保持为历史。2026-10-23 O3 仅进行实码核查及内存交互原型，不增加正式源码、模型/迁移、业务写入或运行记录。

### T14.O3 运行运营与恢复核验（2026-10-23，技术通过，正式 UI 待验收）

没有新增模型或迁移，仍 71/25。管理员停止复用 ExternalProductionRun 的 cancelledAt/cancelReason/cancelActorUserId，与原 MCP 共用 run 锁和取消逻辑；现有 AdminMutation/IdempotentRequest/AdminAuditLog 保证同请求恢复、一条取消/审计及真实 SQL 故障回滚。旧方法、文件、成功成果、代次/事件与审核引用保持，不复活或扩限，不改第三方作业。

运营读投影从现有 run/attempt/lease 和审核/制作记录解释当前条件；历史保存成果不限于最新失败尝试，最后外部申报与当前认领/权限分列，GET 不宣称重新验过字节。恢复仅当前页选择、只读核验/导出，既有固定方法/依赖记录及最小片段不可静默换版；当前代次、期限/预算、连接和真实原件/附件字节重新核查，不创建 run/attempt/lease/event 或恢复任务，不返回凭据/认领 token/内部存储路径。

最终 64 类表/1157 行旧字段、全部 25 迁移及源 SQL 校验和、5 份 release/历史答卷报告/设定引用保持，schema diff 无差异；临时库和开发库 Codex 连接/分组凭据均 0。488 项及正式隔离 API/页面验证见 [PROGRESS](PROGRESS.md)，[正式 UI 独立待验收](../../output/design-review/production-recovery-o3-formal-20261023/README.md)。


## O4 运行配置持久化计划（待设计审核，未应用）

O3指定正式UI已批，原schema仍71模型/25迁移。实码未发现配置草稿存储；O4拟采用`ExternalRunConfiguration`稳定容器与`ExternalRunConfigurationRevision`不可变修订两模型，owner/scope、clientKey、expectedRevision、requestId和写锁防止重复/覆盖，草稿JSON及摘要独立于run/attempt。具体约束见[主能力契约](PLATFORM-BUSINESS-ACCEPTANCE.md#o4-实施契约待新设计批准尚未实现)。

两模型及一份向前迁移是待审设计，不是已创建对象。本轮不读写业务库、不应用迁移、不将内存原型当持久化；沿用O3保全证据且不冒称本轮重跑。设计获批后再写schema、追加迁移并复核旧业务行/全部迁移SQL校验和/历史release与答卷报告引用。

## O4 正式配置持久化 · 2026-10-23

上节为设计时提案。O4-A指定三图于上海03:02:52批准后，已新增`ExternalRunConfiguration`与`ExternalRunConfigurationRevision`，向前应用第26份迁移`20261023010000_external_run_configurations`；现在73模型/26迁移。没有更新旧业务表字段或回填旧行，原25迁移源码保持。

稳定容器固定id/scope/owner/workspace/clientKey/首次inputDigest及createdAt，只允许currentRevision向后推进一位。修订固定配置/作用域、连续revision、document/digest、创建者/时间，禁止UPDATE/DELETE。数据库约束和延迟触发器核查工作区所有者、修订创建者/归属与完整头；运行角色对修订无修改/删除权限，对容器仅可更新currentRevision。完整document格式、额度和引用语义由服务端严格schema核对。

创建/保存沿用管理员幂等和审计，同配置写锁与expectedRevision避免覆盖。真实INSERT故障全部回滚；相同requestId恢复原响应，稳定clientKey避免创建重试复制配置。修改追加修订，历史与其精确计划/方法/依赖不追随新版。配置引用的旧方法/回执/原件继续依托既有不可变快照和文件保留规则，校验/导出重新读取真实字节。

配置始终未启用，没有执行状态表、定时器、模型worker或新权限签发。校验结果不长期保存为授权，导出不另写运行/回执/审计。当前没有删除配置接口；回滚应用入口仍保留历史表，任何后续结构修正以新的向前迁移处理，不改已应用SQL。

迁移后复核64类表/1157行旧字段、原25迁移及全部26份源SQL校验和、5份release与历史答卷/报告/设定引用保持。开发库新配置/修订、Codex连接和分组凭据为0，业务样例仅在隔离TEST库。最终清理/健康及完整验证见[PROGRESS](PROGRESS.md)和[正式评审](../../output/design-review/external-run-configuration-o4-formal-20261023/README.md)。
