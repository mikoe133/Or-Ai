# T14-L：本地机器权限、上传与业务交接

当前状态（2026-10-22）：O1 R2 指定设计获批后已实现 [连接我的 Codex](http://127.0.0.1:5173/admin/machine) 统一入口、有限工作区与各领域独立授权的原子签发/恢复/整组撤销，指定三图正式 UI 已通过。旧单领域管理在 [`?view=legacy`](http://127.0.0.1:5173/admin/machine?view=legacy) 保留，旧凭据和本地协议兼容。当前 71 模型/25 迁移；本轮只用隔离身份/剪贴板替身，没有验证真实账户连接或配置客户端。新契约见 [API-CONTRACTS](API-CONTRACTS.md#o1-统一-codex-连接2026-10-22本地-ui-已批准)，四任务接续见 [MCP-CONTENT-TOOLS.md](MCP-CONTENT-TOOLS.md)，远程 T14-C 仍待云条件。

2026-10-21 历史批次：T14-L 与 T15 已验收，T15-B 界面获用户批准；46 模型/15 迁移及后续 T16-A 的 50 模型/17 迁移证据保留。小屋/手记与真实 SDK 技术验证不等于质量/真机验收，详见 [体验交接](EXPERIENCE-RUNTIME.md)。

以下 LA 章节保留当时交付范围和验收数字，当前 LB 能力及样例见文末。
## T14-LA 已实现（历史批次）

- 每个凭据绑定真实管理员、DEMO/LIVE 数据范围和一个领域，明确列举商品/skill ID，分别声明 content:read/write、skills:read/write、context:read。授权不自动包含后来新增的商品或 skill。只允许 1 分钟以上至 90 天的有效期；授权字段不可更改，变更范围要签发新凭据。
- 凭据由服务端生成 256 位随机值，只存 SHA-256 摘要。首次响应显示原文，幂等重试只返回元数据和 `token:null`；遗失后撤销旧连接再新签发。网页原文只存在局部状态，不进入 query cache、URL 或浏览器存储；复制需操作者主动点击。
- `/api/admin/machine-credentials` 仍需真实管理员 Cookie，写入仍需 Origin/CSRF。独立 `/api/machine/:domain` 只接受 Bearer，拒绝 Cookie/Origin、自报用户/角色、额外字段、跨领域和范围。生产环境此入口保持 503，远程接入在 T14-C 验收。
- 长期凭据、上传票据、管理员状态在每次调用和共用文件服务的提交事务内复查。撤销与上传提交按数据库锁排序；撤销先提交则不能继续入库，流传途中被撤销会拒绝并清理未完成字节。
- 五个本地 stdio 工具：`connection_get`、`upload_prepare`、`upload_status`、`upload_file`、`upload_complete`。SDK 固定 server/client 2.3.1，兼容默认既有握手及 2026-07-28 协议。版本依据见 [SDK 核对记录](MCP-SDK-NOTES.md)，配置见 [适配器 README](../../packages/mcp/README.md)。
- 文件目标为 `media`（固定商品版本与 cover/video 用途）或 `skill_reference`（固定领域/skill）。题目和文案正文将在 LB 通过结构化草稿工具保存，当前不能把媒体上传完成等同于内容草稿完成。
- 上传票据最长 15 分钟，且不超过凭据/文件会话有效期，绑定凭据、目标和底层文件。只保存票据摘要；同一 prepare 重试可重新获得同一票据。跨连接即使同属一个管理员也不可访问对方上传。
- 复用 FilesService/SkillFilesService 的大小、扩展名、MIME、checksum、真实媒体/参考解析和并发状态校验。MCP 本地目录经过 realpath、普通文件和 inode/dev 校验，禁止越界/软链接逃逸/任意 URL。最多 200 MiB，服务端按用途继续收紧；以二进制 HTTP 流传输，不接收 Base64 工具文件参数。
- `available` 才返回可复用 fileId；pending/verifying/uploaded 不伪装就绪。先查状态恢复丢响应，不重复传字节。相同请求号的两种上传共用机器幂等命名空间，错目标重试与并发均不会留下多余上传。
- 后台展示范围、有效/过期/撤销/停用状态和调用结果；审计保留成功/拒绝/失败、固定操作名、对象、错误码、请求号，不记录原文凭据、票据、内容或本地路径。未知随机 token 不保存审计，入口有 IP/凭据共享限流。

## T14-LA API 与实现位置（历史批次）

| 入口 | 功能 |
| --- | --- |
| `GET/POST /api/admin/machine-credentials` | 管理员分页查询/签发 |
| `POST /api/admin/machine-credentials/:id/revoke` | 管理员撤销 |
| `GET /api/admin/machine-credentials/:id/calls` | 管理员查询调用记录 |
| `GET /api/machine/:domain/connection` | 检查领域、权限和当前传输能力 |
| `POST /api/machine/:domain/uploads` | 准备上传及短期票据 |
| `GET /api/machine/:domain/uploads/:id` | 查询状态 |
| `PUT /api/machine/:domain/uploads/:id/content` | octet-stream 字节流 |
| `POST /api/machine/:domain/uploads/:id/complete` | 服务端校验并完成 |

两个上传写入端点同时校验 Bearer 与 `x-orai-upload-ticket`。路径、操作、领域由适配器固定；客户端无法指定任意管理路由。content/skills 读权限、context 权限的实际业务路由留 LB，本批只开放上述传输入口。

契约：`packages/contracts/src/machine.ts`、`codex-connections.ts`；API：`apps/api/src/operations/machine*.ts`、`codex-connections*.ts`；授权：`apps/api/src/catalog/admin-access.service.ts`、`machine-authorization.ts`；前端：`apps/web/src/admin/codex-connections.tsx`，旧单领域页为 `machine.tsx`；适配器：`packages/mcp/src`。

新增 `MachineCredential`、`MachineUpload`、`MachineCall` 三模型，第十四份向前迁移 `20261020040000_machine_transport` 已在本机应用。共 46 模型/14 迁移。机器授权只允许更新 revoked_at，上传关联与调用记录不可更新/删除；FK、scope、目标绑定和用途由 SQL 约束再次保护。已应用迁移不得改写，后续改动追加迁移。

## T14-LA 本地验证与操作（历史证据）

1. 旧单领域演练使用 `/admin/machine?view=legacy`，选一个领域、需要的权限和明确商品/skill 范围。新的统一项目授权使用 `/admin/machine`，先核对业务范围再明确确认；一次性说明中仍按领域独立配置。本段为操作说明，本轮 O1 验证不使用真实账号、不为用户签发或配置持久连接。
2. 构建 `@orai/contracts`、`@orai/mcp`；客户端直接运行 Node 的 `packages/mcp/dist/cli.js`，分别配置四个 domain。包管理器提示会污染协议 stdout，不把 `pnpm start` 作为客户端协议入口。
3. 先 `connection_get` 核对范围，再准备/上传/完成真实文件。后台调用记录可核对 fileId 和重试；四域完整内容制作在 LB 交付。
4. 不再使用时撤销连接。已验证文件历史保留；撤销不会更改已有内容或采用包。

验收结果：后端 235、前端 45、SDK 11，共 **291 项测试**；**43 项浏览器流程**；typecheck/build/db validate、实际 migrate/provision、schema diff 无差异、冻结安装通过。新增 20 项机器集成包含真实 SDK stdio → Nest → PostgreSQL 四域实传、丢响应重试、混合目标并发、传输途中撤销、错误文件/目录与范围拒绝。

实际开发库另用既有管理员和 T13 演示商品/四库创建了四条联调连接：封面/视频传现有小型测试媒体，assessment/copy 传人工文本参考，全部验证并撤销。后台可查看 `T14-LA 联调 · assessment/cover/video/copy` 的成功及撤销后拒绝记录；没有留存活跃测试凭据或改变旧题目/报告/采用包。本批未安装用户 Codex 持久连接，也未运行生成模型、定时任务、云资源或发布商品。

证据：`.local/t14-la/` 中 tests/typecheck/build/e2e/migrate/provision/schema-diff、database-before/after/after-samples、local-sample；浏览器结构化结果 `.local/t08/e2e/result.json`。20 类原业务/内容/skill 表每条旧记录摘要一致。实际截图 `output/mcp/machine-calls-actual.png`。T06-O 11 项完整真实 Auth 流程沿用原证据，本批实际管理员页面访问另验，隔离身份事实不当作云认证。

## T14-LB 当前业务能力与实际演示

领域工具现已接入同一 NestJS/Prisma 业务服务：修订摘要/详情、题库与宣传草稿、skill 读取/草稿复制/编辑、固定上下文、引用校验及受控参考文本。assessment 共 16 个工具，其他领域各 15 个；HTTP 统一为 `POST /api/machine/:domain/tools/:operation`，具体输入和权限见 [接入指南](MCP-CONTENT-TOOLS.md)。机器输出只含获授权领域的方法和明确片段，宣传任务不能取得完整私有计分或消费者资料。

真实四域 SDK 已在开发库保存同一创作设定和五用途组合下的新题库、文案、封面、视频。打开[配套演示工作台](http://127.0.0.1:5173/admin/content/01a15846-9112-73f9-8a2d-9ec2c5cc809a?version=01a158a6-74fd-76d9-b624-e2d42940e8d0&profile=01a15846-914a-71db-9b3c-9542906686a5&tab=video)，可核对视频引用两道题及 hook/cta、真实上传文件、机器凭据/请求来源。四份临时凭据已撤销，撤销后调用返回 401；新稿未发布。

第十五份向前迁移 `20261020050000_machine_content_provenance` 为题库版本增加固定设定引用，并保存机器凭据与请求来源。当前 46 模型/15 迁移；23 类原表旧行摘要一致。314 项唯一测试（后端 250＋前端 45＋SDK 19）和 44 项浏览器流程通过，最终 typecheck/build、安装与数据库检查通过；最新证据统一记录于 PROGRESS.md 和 `.local/t14-lb/`；实际样例清单为 `.local/t14-lb/local-sample.json`，没有记录可用秘密。

本批不会自动执行 skill 或生成模型，也没有安装用户持久 MCP 连接、开启每日自动任务、云资源、公开发布或提交推送。参考文本工具仅支持 256 KiB 内 UTF-8 Markdown/纯文本/JSON，图片和 PDF 等二进制参考继续在后台受控查看。

## 下一步 T15-A

先固定兼容体验/报告 schema 与注册表、版本化发布清单，再接现有 DOM 单选宿主、确认保存、刷新恢复和同内容回退。旧答卷、报告及评分语义保持可用；T15-B 再扩展后台 authoring 和 experience skill/MCP。远程 MCP 留在 T14-C，依赖 T09 的真实认证、HTTPS 与存储条件。
