# T14-LA：MCP SDK、协议与本地凭据约定

核对日期：2026-10-20。实现位置：`packages/mcp`。本记录覆盖本地 stdio SDK 与受限机器 API；T14-LB 扩展见末节，T14-C 远程接入仍单独验收。

## 官方来源与版本选择

本次直接读取官方仓库、官方协议文档，并用 npm registry 查询当期已发布版本：

| 来源 | 核对的事实 |
| --- | --- |
| [TypeScript SDK 官方 README](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md) | 当前稳定代际是拆包的 v2；v1 `@modelcontextprotocol/sdk` 已进入维护线 |
| [SDK 构建服务端教程](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server) | `McpServer.registerTool`、标准 schema 输入/输出和 `serveStdio` 入口 |
| [SDK 构建客户端教程](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-client) | `Client`、`StdioClientTransport`、`listTools`、`callTool` 与进程关闭 |
| [SDK 协议版本](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions) | 既有 initialize 握手与 2026-07-28 的现代协议可由同一入口服务；客户端默认 legacy，支持显式 pin |
| [2026-07-28 stdio 规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio) | newline JSON-RPC、stdout 仅协议，stderr 可日志；关闭输入后退出 |
| [2026-07-28 授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) | STDIO SHOULD NOT 采用 HTTP 授权发现流程，应从环境获取凭据 |
| [npm server 包](https://www.npmjs.com/package/@modelcontextprotocol/server) / [npm client 包](https://www.npmjs.com/package/@modelcontextprotocol/client) | 核对当时 latest 均为 `2.3.1`，Node 要求 `>=20` |

初步查询旧包 `@modelcontextprotocol/sdk` 得到维护版 `1.32.1`，随后从官方 README 发现稳定代际已更新；最终选择新拆包 `2.3.1`。不把旧包的 latest 标签误当作整个 SDK 的最新代际。

代码与 lock 固定版本：

- `@modelcontextprotocol/server`: `2.3.1`。
- `@modelcontextprotocol/client`: `2.3.1`，仅测试依赖。
- `zod`: `4.6.5`，沿用仓库契约版本。
- TypeScript `5.9.3`、Node 类型 `24.10.1`；仓库运行时 Node `24.21.0` / pnpm `10.33.2`。

下载后又核对上述固定包的实际 `.d.mts` 签名。使用 `registerTool(name, { inputSchema, outputSchema, annotations }, callback)` 与 `serveStdio(factory, { legacy: "serve", transport, onerror })`。T14-LA stdio 收包上限 256 KiB，T14-LB 为中文 manifest / authoring 调整到 2 MiB；不把媒体字节编码成工具参数。

## 机器凭据与传输边界

每个进程的 `ORAI_MCP_DOMAIN` 固定为四域之一，`ORAI_MCP_TOKEN` 由客户端安全环境配置注入。适配器只发送 Bearer 到固定的本机 API 根地址；上传票据通过 `x-orai-upload-ticket` 发送。机器权限、范围、到期、撤销和业务服务由 API 独立检查；`tools/list` 不是授权边界。

后台管理员 Cookie 入口仍使用既有 CSRF / Origin 约束。MCP 不借用管理员 Cookie，不携带用户自报身份，也不获得数据库凭据。

HTTP 调用路径固定：

| 工具 | 受控机器 API |
| --- | --- |
| `connection_get` | `GET /api/machine/:domain/connection` |
| `upload_prepare` | `POST /api/machine/:domain/uploads` |
| `upload_status` | `GET /api/machine/:domain/uploads/:uploadId` |
| `upload_file` | 先查 status；`PUT /api/machine/:domain/uploads/:uploadId/content` |
| `upload_complete` | `POST /api/machine/:domain/uploads/:uploadId/complete` |

HTTP 请求不跟随重定向。仅允许 loopback HTTP origin，无 URL credentials/query/fragment/path；`localhost` 规范为 `127.0.0.1`，不经过 DNS。T14-LA JSON 响应上限为 2 MiB，T14-LB 调整到 8 MiB，普通调用 30 秒、流式传输 120 秒超时。错误只返回固定结构和安全消息；不回显 API 原始错误正文、堆栈或长期 token。长期 token 即使意外出现在成功响应字符串中也会被替换。

`ORAI_MCP_ALLOWED_ROOT` 必须为现有本地目录。选中文件先规范路径、确认目录边界、拒绝最终软链接替换、核对打开前后的文件 inode/dev，再从同一 descriptor 核对大小和 SHA-256，流式发送时复查。客户端硬上限 200 MiB，服务端继续按内容用途及运营配置收紧。真实视频仍由直接 HTTP 二进制流传输。

## 已验证范围

`pnpm --filter @orai/mcp test` 使用固定版本的真实 SDK stdio 客户端启动适配器子进程，连接受控本机 HTTP API。测试涵盖：

- 四个领域各自的 `tools/list`、严格参数/输出 schema、固定领域路径和拒绝任意路径输入。
- 默认 legacy 握手与显式 pin `2026-07-28` 的现代握手。
- 准备 → 真实本地文件字节流 → 完成 → 状态、相同请求重试不重复传输、仅 available 返回可用文件引用。
- `..`、软链接文件/目录逃逸、URL、长度/hash 不符和超限参数。
- 撤销拒绝响应、成功/错误响应与 stderr 不含长期 token、HTTP 重定向不带出凭据。
- 非本机或带敏感 URL 成分的配置失败；启动失败 stdout 保持为空，正常执行 stdout 只包含协议消息。

上述 11 项适配器测试验证协议和受控 API 传输。另由 API 集成测试调用 `packages/mcp/test/real-backend-client.mjs`，用真实 SDK 子进程连接真实 Nest/PostgreSQL 隔离环境：assessment / copy 上传参考附件，cover / video 上传媒体文件；四域均验证准备幂等、实际流式字节、uploaded 状态、完成幂等和最终可用 fileId，并核对数据库与磁盘字节。

真实 SDK→API→数据库的测试仍不代表用户 Codex 已安装连接、四类产物已生成或远程 OAuth 已验收。测试环境、命令与完整证据由 T14-LA 主任务记录；四领域业务草稿及完整来源在 T14-LB 接入。

## T14-LB SDK 扩展

SDK 版本和 transport 保持上述固定版本。`packages/contracts/src/machine-content.ts` 提供严格共享输入/输出契约；题库配置原样抽到 `product-configuration.ts` 并由 admin 重新导出，避免机器契约反向依赖 admin 导致模块循环。

新增业务工具使用固定的 `POST /api/machine/:domain/tools/:operation`。领域名称固定在进程配置中，工具参数无法变更领域、任意 API 路由或管理员身份。每域暴露 list/get/draft_save、skill_list/skill_version_get/skill_draft_save/skill_draft_clone，另有共享 context_bundle_get/references_validate/skill_reference_get；assessment 独有 assessment_validate。完整名称和使用流程见适配器 README。

skill/version/context/production 输出移除 Cookie 上传/下载路径和不必要操作者信息；固定组合只回传当前领域用途。参考读取固定在组合、专业用途、fileId 三者关系内，只支持最多 256 KiB 的 UTF-8 Markdown、纯文本或 JSON；二进制参考不通过 Base64 返回。

错误处理从有大小限制的标准 API 错误结构中保留已知错误码（如 REVISION_CONFLICT），丢弃上游错误正文；超出 8 MiB 返回 RESPONSE_TOO_LARGE 和分批提示。新增 8 项 SDK 测试使总数成为 19 项，覆盖四域业务操作映射、共享输入、来源伪造、幂等请求参数、已知冲突码、响应超限，以及拒绝包含管理员文件 URL 的不兼容响应。禁止发布/激活/删除等工具以及跨域工具均未注册，SDK 客户端得到标准协议错误。
