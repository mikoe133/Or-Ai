# 数据模型与维护约定

2026-10-20。现有业务与 T12-A/B/C 内容后台已实现，共 37 模型/11 迁移；真实云端认证/收信和对象存储验收待 T09。内容修订与混合存储见 [CONTENT-FOUNDATION.md](CONTENT-FOUNDATION.md)，采用/清理见 [CONTENT-ADOPTION.md](CONTENT-ADOPTION.md)，证据见 PROGRESS.md。字段以 `apps/api/prisma/schema.prisma` 为准，额外约束以迁移 SQL 为准。

## 模型分组

| 组 | 业务表 | 关键约束 |
| --- | --- | --- |
| 环境 | environment_marker | 单例环境/数据库名称标记；运行账号只读；生产标记拒绝演示 seed |
| 目录 | categories、tags、products、product_tags | slug 唯一；每商品一个主分类、多标签；价格存整数分；当前版本必须属于同一商品和数据范围 |
| 版本 | product_versions | 商品＋版本号唯一；结构化配置；发布后不能覆盖、删除或退回草稿 |
| 交付 | orders、code_batches、redemption_codes | 平台＋订单引用唯一；码摘要唯一；订单、版本、权益、批次的数据范围一致；补发关联旧码 |
| 身份 | users、entitlement_bindings | Supabase 用户 ID 唯一；无邮箱密码；每权益最多一份绑定，绑定与所有者在同一事务中一致 |
| 账户会话 | account_sessions | 本站 Cookie 摘要；Auth 会话＋scope 唯一；访问/刷新凭据分别认证加密；撤销时清空凭据，重新交接不延长期限 |
| 权益 | entitlements、access_sessions、access_grants | 归属与有效状态分开；版本锁定；消费次数不能回退；会话可持有多个权益，每条授权可单独撤销 |
| 答卷 | attempts、attempt_answers、reports | 权益＋答卷序号唯一；答卷＋题目唯一；每答卷唯一报告；历史版本和报告快照锁定；删除报告留下墓碑 |
| 汇总 | question_stats、question_option_stats、result_stats、result_type_stats | 按版本聚合；题目/选项、类型复合键唯一；计数非负；回答与完成答卷使用不同分母 |
| 运营 | campaign_assets、campaigns、events | 素材按版本＋平台＋类别＋变体唯一；事件去重键唯一；演示事件强制使用 DEMO 来源 |
| 文件/上传 | asset_files | 同一记录管理上传状态与文件；版本/上传者/scope 复合引用；就绪元数据不可改；READY 媒体要求匹配的 AVAILABLE 文件 |
| 内容底座 | creative_profile_revisions、content_revisions、content_references、production_records | 共同创作设定、旧题库/素材快照、固定输入位置与制作来源；历史只追加、同商品/scope 复合引用、拒绝循环 |
| 复查/采用 | content_review_records、content_packages、content_package_items | 影响 fingerprint、不可变采用清单与依赖；同商品/scope、包序号唯一、只追加 |
| 清理计划 | file_cleanup_plans | 固定文件清单/摘要、执行结果、到期/重试状态；仅原管理员/范围读取和执行，保留元数据 |
| 重试/审计 | idempotent_requests、admin_audit_logs | 主体＋操作＋请求 ID 唯一；请求摘要和到期时间；运行账号不能修改或删除审计 |
| 防猜测 | request_rate_buckets | scope＋种类＋主体的摘要主键；正数 hits 与 window_ends_at；数据库原子窗口计数，跨 API 进程共享 |

共 37 个模型、十一份迁移，均位于私有 `orai` schema。T07 为第七份迁移，T12-A 追加结构迁移与独立历史回填，T12-B 再追加媒体实际尺寸/时长迁移，T12-C 追加复查/采用/清理计划与文件终态迁移，旧迁移未改写。业务 ID 默认由 Prisma 生成 UUIDv7，数据库快照/交付/文件也可生成 UUIDv4，演示 seed 使用确定性 UUID。时间存带时区时间戳，API 输出 ISO 8601；金额以分存储。

T07 为 categories/tags/products/product_versions/campaign_assets 增加非负 revision。AssetFile 保存服务端文件键、原始名称、实际 MIME/字节数/SHA-256、上传者、到期/验证时间及 PENDING/VERIFYING/UPLOADED/AVAILABLE/FAILED/EXPIRED/DELETING/DELETED；当前将上传会话与最终文件合为一表。CampaignAsset.fileId 使用同版本/scope 复合外键，数据库触发器进一步检查用途、AVAILABLE 状态和元数据逐项一致；缺文件媒体不能 READY。AVAILABLE 内容元数据冻结，替换需新文件。旧占位素材可以保留非 READY 状态，不冒充真实文件。

T12-B 的 `width / height / durationMs` 在新上传完成时从真实文件探测并保存，AVAILABLE 后不可修改。旧文件保留空值并明确显示未记录。第八/九份迁移为 T12-A 结构及历史回填，第十份为 `20261019110000_verified_media_metadata`。详情见 [工作台交接](CONTENT-WORKBENCH.md)。

### 内容后台底座与后续扩展

[CONTENT-BACKOFFICE.md](CONTENT-BACKOFFICE.md#41-逻辑数据实体) 定义扩展实体。T12-A 已实现设定修订、题库/素材历史、跨内容引用/使用快照及制作来源四表，计入 33 模型；文件复用 AssetFile，原件归档元数据放在受校验的 authoring 中。T12-C 已增加 ContentReviewRecord、ContentPackage、ContentPackageItem、FileCleanupPlan 四模型，计入当前 37 模型。StyleSkill/绑定及 MCP 凭据仍待后续迁移。

- 题目/计分/报告模板复用 `ProductVersion.configuration`，素材沿用 `CampaignAsset` 的商品版本、平台、类别和变体；变体与历史修订分别记录。
- 文件记录受控存储键与实际元数据，视频/图片字节由存储适配器保存。上传可用状态与素材审核状态独立，历史缺失文件不视为已就绪。
- 商品与 skill/素材包固定引用明确版本/修订；新 skill 或新采用稿不改变历史制作记录，消费者报告快照仍走原权益与期限规则。
- 单题引用固定 productVersionId/questionId，草稿额外带配置修订/摘要；文案块固定素材修订/blockId，视频分镜记录使用位置、引用/改写及实际使用快照。上游新稿触发影响提示，不覆盖既有视频；采用组合 manifest 固定全部输入。
- skill 按 assessment/cover/video/copy 四领域校验和授权，共用存储底座；方法版本绑定与产物间内容引用分别保存。循环、失效、越范围和领域不匹配的引用拒绝写入/采用。
- 机器凭据保存摘要与授权范围，版本/文件引用校验 DEMO/LIVE 范围；MCP 与网页共用业务服务，不给适配器 owner 数据库连接。

共享说明已在 T12-A 固定为商品创作设定修订，含情绪/理解目标、参与视角、世界观、形式、视觉/语言/声音及独立报告方案草稿。新方案是 authoring-only，旧 report 运行 schema 不变；呈现 renderer 与兼容投影留 T15，旧结果事实和个人报告快照不受设定更新影响。

第十一份迁移 `20261020010000_content_adoption_and_cleanup` 固定历史采用/复查、商品级内容写锁与文件引用锁。清理仅允许过期且无当前/历史引用文件，经预演确认后进入 DELETING/DELETED；保留文件名/摘要/大小等不可变元数据，禁止复活或直接删除记录。采用包保存完整内容/输入快照及受保护文件引用，不含消费者数据或存储路径；采用不会发布商品。新表权限由 db:provision 收紧，旧迁移不改写。

### 多形态体验扩展规划 尚未迁移

[EXPERIENCE-PLATFORM.md](EXPERIENCE-PLATFORM.md) 为 T15–T17 定义待实现的体验发布清单/模板与资源版本、场景题目映射、检查点及未来类型化答案/任务状态。现有 `engine=dimensions_v1`、单选答案与严格 v1 配置保持原含义；运行器扩展需要契约和向前迁移，不能直接向 JSON 添加未校验字段。

内容、体验模板和实际使用资源固定引用；首期不同正式交互模板使用独立商品版本以沿用现有统计隔离。旧权益/答卷仍使用原版本，新输入/玩法按独立引擎验收，不增加当前“已实现模型数”。

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
