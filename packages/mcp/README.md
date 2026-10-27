# Or AI 本地 MCP 适配器

T14-L 提供独立的 `assessment` / `cover` / `video` / `copy` stdio 进程。每个进程只使用一份对应领域的机器凭据，服务端仍独立检查权限、商品或 skill 范围、到期及撤销。

保留 T14-LA 的五个传输工具：`connection_get`、`upload_prepare`、`upload_status`、`upload_file`、`upload_complete`。T14-LB 接入领域草稿、skill、共享创作上下文和固定来源；assessment 共 16 个工具，其他领域各 15 个工具。

## 构建与启动

在仓库根目录使用既定 Node 24.21.0 与 pnpm 10.33.2：

```sh
pnpm --filter @orai/contracts build
pnpm --filter @orai/mcp build
pnpm --filter @orai/mcp test
```

MCP 客户端必须直接运行 Node 与已编译入口，例如：

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/orai/packages/mcp/dist/cli.js"],
  "env": {
    "ORAI_MCP_DOMAIN": "cover",
    "ORAI_MCP_API_URL": "http://127.0.0.1:4100",
    "ORAI_MCP_ALLOWED_ROOT": "/absolute/path/to/local/cover-outputs"
  }
}
```

通过客户端的安全环境配置为该进程注入 `ORAI_MCP_TOKEN`。凭据不写入仓库、命令参数或项目 `.env`。每个客户端采用自己的 MCP 配置格式；以上为进程配置字段示意，不表示所有客户端都支持相同的配置文件。

不要把 `pnpm start` 直接作为客户端协议入口：包管理器可能把脚本提示写到 stdout。适配器自身 stdout 只写 MCP 消息，stderr 只写固定、安全的启动或协议错误。

| 连接名称建议 | `ORAI_MCP_DOMAIN` | 注入的凭据 | 允许读取的本地目录 |
| --- | --- | --- | --- |
| orai-assessment | assessment | assessment 领域凭据 | 题目与报告输出目录 |
| orai-cover | cover | cover 领域凭据 | 封面输出目录 |
| orai-video | video | video 领域凭据 | 视频输出目录 |
| orai-copy | copy | copy 领域凭据 | 文案输出目录 |

API 地址仅接受 HTTP 的 `127.0.0.1`、`[::1]` 或 `localhost` 根地址；`localhost` 固定为 `127.0.0.1`。禁止 URL 中的用户名、密码、子路径、查询参数和 fragment，也不跟随 HTTP 重定向。本批没有远程 HTTP MCP 入口。

## 上传流程

1. `connection_get` 检查当前凭据、领域、范围和当前能力。新接口返回 `stage: "content"`，适配器兼容旧传输阶段的 `stage: "transport"`。
2. `upload_prepare` 提交 `requestId`、目标、文件名、MIME、字节数、SHA-256。目标为 `media`（`productVersionId` 和 `kind`），或 `skill_reference`（`skillId`）。相同请求重试时保留相同 `requestId` 和元数据。
3. `upload_file` 提交 `uploadId`、短期 `ticket` 和本地 `filePath`。可用目录内相对路径或绝对路径；不是 URL。客户端核对实际文件大小与 SHA-256，再以最多 64 KiB 的块流式 PUT；最高 200 MiB，服务端按用途收紧限制。上传正文不进入 MCP 参数。
4. `upload_complete` 提交 `uploadId`、同一 `ticket` 与独立的完成 `requestId`。只有服务端校验完成、状态为 `available` 时才返回可使用的 `fileId`。
5. 丢响应后先用 `upload_status` 查看。`upload_file` 遇到 `uploaded` 或 `available` 不重传。完成重试使用同一 `requestId`。失败、过期或撤销返回工具错误，不会伪装为已完成。

票据在 prepare 结果中返回，供后续两步使用；status 不返回票据。长期凭据只在 HTTP Authorization 头中发送，票据只用于 `x-orai-upload-ticket`。接口无网页 Cookie/Origin。工具无法指定任意 API 路径、用户身份或另一个领域。

`filePath` 的规范路径必须位于允许目录内；文件必须是普通文件。拒绝 `..` 越界、文件/目录软链接逃逸、目录、大小不符和 hash 不符。已打开文件保持同一 descriptor，流式读取期间再次检查长度和 hash；服务端仍负责最终字节检查。

工具输出为 `{ "ok": true, "data": ... }`，或 `isError: true` 与 `{ "ok": false, "error": { "code", "message", "retryable" } }`。API 错误正文、原始异常、磁盘路径和长期凭据不回传。业务层的详细审计在管理员后台查看。

## 领域业务工具

下表 `{domain}` 是当前进程固定的四域之一。所有工具调用 `POST /api/machine/:domain/tools/:operation`，服务端根据凭据和目标再次授权；参数不能选择另一个领域、伪造操作者或传入任意 API 路径。

| 工具 | 能力 |
| --- | --- |
| `{domain}_list` | 指定授权商品，分页列出本领域修订；默认读取当前修订 |
| `{domain}_get` | 读取本领域某一修订及制作来源，仅返回本领域固定 skill 快照 |
| `{domain}_draft_save` | 按预期修订保存题库/报告配置，或封面、视频/脚本、文案草稿 |
| `{domain}_skill_list` | 列出凭据明确授权的 skill 库摘要 |
| `{domain}_skill_version_get` | 读取指定库的某一版 manifest 和参考文件元数据 |
| `{domain}_skill_draft_save` | 更新可编辑的 skill 草稿，携带 `expectedRevision` 和 `requestId` |
| `{domain}_skill_draft_clone` | 从固定版本复制新草稿，携带 `expectedSkillRevision` 和 `requestId` |
| `assessment_validate` | 仅 assessment 提供，校验配置并返回 `valid` / `issues`，不保存 |
| `context_bundle_get` | 读取同一创作设定、当前领域的方法和逐条显式选定的输入片段 |
| `references_validate` | 校验所选输入；可给 `targetRevisionId` 检查来源更新或阻断，不代替管理员批准 |
| `skill_reference_get` | 读取固定组合中属于某个专业用途的一个参考文本 |

制作时先取得共同的 `creativeProfileRevisionId` 和 `skillSetId`，再请求各自领域的上下文。`inputs` 中每项必须提供 `revisionId`、`digest` 和 `locator`；宣传任务引用题目时使用 `{ "kind": "question", "questionId": "..." }`。`context:read` 只允许凭据指定商品内的显式片段，宣传任务不会获得完整计分、阈值或私人报告模板。

题库草稿参数包含 `productId`、可选 `productVersionId`、`configuration`、`expectedRevision`、`requestId`、`creativeProfileRevisionId` 和 `skillSetId`。宣传草稿沿用内容 authoring 结构，但 `production` 只接受固定 `skillSetId` 与可选批次/来源标签；`source=mcp`、身份和具体用途版本由服务端确定。内容保存不会发布或激活商品。

更新冲突保留 `REVISION_CONFLICT` 等已知业务错误码。`requestId` 仅用于同一请求的幂等重试；修改内容后应读取最新修订并使用新请求 ID。`references_validate` 的 `impact` 会提示来源更新或阻断，运营审核备注不返回。

skill 的审核版、启用版和归档版保持不可编辑；先复制新草稿。上传参考附件后可把可用 fileId 放入 manifest。读取 skill 不代表运行它；这里没有自动安装或执行技能的工具。

`skill_reference_get` 输入为 `{ "skillSetId", "purpose", "fileId" }`。首期支持不超过 **256 KiB** 的 UTF-8 `text/markdown`、`text/plain`、`application/json`，返回文本、包内路径、MIME 与 checksum。图片/PDF 等二进制参考在此工具中明确拒绝，保留后台受控下载能力。所有机器 skill 输出均移除网页 Cookie 上传/下载 URL。

stdio 单条入站消息上限 2 MiB，API JSON 响应上限 8 MiB；大列表请减小 pageSize，较多输入请按所需片段分批读取。超过响应上限返回 `RESPONSE_TOO_LARGE` 和分批提示。媒体上传仍走流式二进制。

## 兼容与验证

SDK 固定为 `@modelcontextprotocol/server@2.3.1`；测试客户端固定为 `@modelcontextprotocol/client@2.3.1`。同一入口通过官方 `serveStdio` 支持既有 initialize 握手与 `2026-07-28` 协议。19 项适配器测试覆盖四领域 tools/list、固定业务路由与 schema、来源伪造拒绝、冲突码、响应超限、真实文件流、重复调用、权限拒绝、路径逃逸、hash/大小、重定向和凭据不泄漏。

此外，API 集成测试通过 `test/real-backend-client.mjs` 启动真实 SDK 客户端，分别用四领域受限凭据连接 Nest/PostgreSQL 隔离环境，实际完成准备、流式上传、完成及重试，并核对数据库记录与实际字节。它仍不代表已经安装用户的 Codex 连接或完成四任务业务内容制作。

官方文档核对、版本来源与本批范围见 [MCP-SDK-NOTES.md](../../prd/v1/MCP-SDK-NOTES.md)。
四个任务的接续、完整 manifest、最小引用、权限和审核流程见 [MCP-CONTENT-TOOLS.md](../../prd/v1/MCP-CONTENT-TOOLS.md)。
