# 受限项目 MCP · T14.P3 实施记录

2026-10-22 已实现并通过本地验收。G1 暗色 React Flow 方案已获批准；正式 UI 的 G4 验收和云接入/真实凭证/付费/发布仍另设关卡。

## 决策

- 商品 `productId` 仍是唯一项目根。管理员创建有到期时间、分类范围、项目数量与每项目方法数量上限的授权工作区；工作区只是机器授权集合。
- 管理员显式把各领域凭证绑定到同一工作区。服务器创建不可变的项目/方法成员关系来扩展范围，客户端不能改原凭证的 `productIds/skillIds`。不同工作区相互隔离；共享工作区内只共享同一项目的计划和最小上下文，方法和写入仍按领域隔离。
- 初始化原子保存私有 DRAFT 商品、固定创作设定、第一份计划及模块。未制作题库时 `productVersionId=null`，不伪造题目来获得文件上传目标。
- 初始化的业务键持久绑定创建凭证和输入摘要，重试窗口之外也能恢复同一项目；另一凭证不能冒认初始化。数量检查在工作区锁内完成。
- 项目候选方法采用独立的固定快照路径。旧五用途 ACTIVE 组合和体验 ACTIVE 方法路径保留。平台只保存外部制作声明和实际产物，不声称执行过 skill。
- 每个机器入口仍经过真实 bearer 的品牌授权、精确目标校验、事务内撤销/到期复查及审计。网页 Cookie/Origin/CSRF 不变；无发布、激活、消费答卷或报告权限。

## 验证边界

先在隔离数据库/目录验证新建、幂等、并发配额、跨工作区/领域/目标、撤销、到期、候选方法和实际文件。迁移仅向前应用；应用前后比较既有业务行和已应用迁移摘要。不签发任何持久的真实 MCP 凭证。

实际工具、端点与证据随实现验收更新；本记录不声明接口已可用。

## 已实现的接口

管理员 Cookie 接口保留原 Origin/CSRF 校验：`GET/POST /api/admin/machine-workspaces`、`POST /api/admin/machine-workspaces/:id/revoke`。工作区参数为 `categoryIds/maxProjects/maxMethodsPerProject/expiresAt`；只有同一管理员、同一 scope 能把凭证绑定到该工作区，凭证不得晚于工作区到期。凭证新增可选 `workspaceId` 与四项显式权限 `projects:read/projects:write/projects:create/methods:create`。已有无工作区凭证保留原白名单流程。

2026-10-22 O1 更新：正式 `/admin/machine` 提供统一业务授权入口，以 `/api/admin/codex-connections` 复用工作区/凭据服务，原子保存连接分组及各领域独立权限；旧单领域页保留在 `?view=legacy`。新工作区可限定分类、商品/每商品方法/运行批次额度和到期，已有工作区不可原地扩大。统一连接的预览摘要、稳定业务键/同请求恢复、一次性交接和整组撤销见 [O1 契约](API-CONTRACTS.md#o1-统一-codex-连接2026-10-22本地-ui-已批准)。R2 指定设计已批准、指定三图正式 UI 已通过；本轮验证只有隔离数据库和身份/剪贴板替身，未配置真实账户连接。

受限机器端点仍为 `POST /api/machine/:domain/tools/:operation`，stdio 适配器使用同名工具：

| 工具 | 权限与范围 |
| --- | --- |
| `project_bootstrap` | assessment，projects:create + projects:write；原子初始化；稳定 projectKey 与输入摘要；创建回执保留最初 IDs |
| `project_list` / `project_get` | projects:read；只读同工作区的项目；get 返回当前计划及最新题库草稿 ID |
| `project_profile_save` / `project_plan_save` | assessment，projects:write；追加不可变修订，保留历史 |
| `project_plan_get` / `project_plan_validate` | projects:read；固定修订与完整依赖图校验 |
| `project_method_create` | methods:create；仅本领域、项目额度内新建 DRAFT 库；methodKey 支持业务重试，服务器分配库标识 |
| `project_method_capture` | methods:create + skills:read；精确源修订/摘要、用途、形式与附件验证；固定该计划模块 |
| `project_method_get` / `project_method_reference_get` | projects:read + skills:read；本领域固定方法；文本附件最多 256 KiB，校验字节与摘要 |
| `project_context_get` | projects:read + context:read；同一计划的共同设定与指定片段；宣传与体验只取具体题目，去掉权重/评分/私有报告模板 |
| `project_draft_save` | content:write + skills:read + context:read；`payload.kind=assessment/asset/experience`；固定候选方法并保存真实私有原生稿；不要求全局 ACTIVE 组合 |
| `project_production_save` | content:write + skills:read + context:read；保存实际产物、固定方法、同计划依赖及外部制作声明 |
| `project_production_list` / `project_production_get` | projects:read + skills:read；本领域固定制作记录及文件元数据 |

四域的 `project_context_get` 直接使用固定 planRevisionId，不需要预建 skillSetId。`project_draft_save` 会生成独立、不可改写的候选稿来源记录，保存 method snapshot IDs/digests、真实 credentialId/requestId 和原生产物摘要。后续 `project_production_save` 声明实际采用哪些产物和依赖；两步均不会发布。原生体验稿只标为 authoring，仍不能替代网页/3D 原件。

机器返回值去掉浏览器下载/上传路径；读取方法参考走专用工具。上传仍走现有 `upload_prepare/file/complete/status` 与本地允许目录限制，动态项目/方法归属也受到 SQL 校验。SDK 固定官方 v2 `@modelcontextprotocol/server/client 2.3.1`，按官方 v2 文档和实际 stdio 客户端验证 schema 兼容，不升级依赖。原生题库/素材旧的 `*_draft_save` 继续要求固定全局 ACTIVE 组合，experience 旧路径也不放宽。

本批不会签发持久使用的工作区或真实机器凭证。现有连接页面继续只签发预建流程的五项权限；工作区签发交互并入后续正式管理 UI 验收，不提前放出无工作区的创建复选项。


## 验收证据

- 新增 `apps/api/test/machine-projects.test.ts` 16 项集成测试，含五个官方 v2 SDK 客户端的实际 stdio → API → 隔离数据库调用。
- `pnpm test`：API 301 + web 50 + SDK 19 = 370，全部通过；`pnpm typecheck` 与 `pnpm build` 通过。没有单独 lint 脚本，不宣称 lint 或覆盖率已达标。
- 隔离迁移全部成功，Prisma schema diff 无差异；本地第 20 份迁移向前应用。62 模型，保留 52 类既有业务表 1157 行旧字段摘要与全部既有迁移校验和，5 份 release 与历史答卷/报告引用正常，临时数据库 0。
- `.local/t14-p3/` 保存测试、构建、schema、迁移和前后数据校验证据。所有新增项目/工作区/凭证都在已清理的隔离库内；没有创建持久真实连接。
- 此批未运行新浏览器业务流程，也未验证远程接入、真实用户 Auth 或云服务。正式界面按已批准 G1 方案后续实现并单独验收。
