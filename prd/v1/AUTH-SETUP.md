# T06 账户与邮件配置

当前状态：账户身份、Cookie 会话、绑定、列表、运行权限和临时认证页面已通过本地测试；真实 Supabase/SMTP 收信与账户跨设备验收待完成。没有云配置时，匿名兑换继续独立可用；隔离测试不代表真实云端通过。

2026-10-10 用户要求先完成本地功能：T06-L 已通过，T07/T08 不等待本页的云配置；真实认证/邮件作为 T06-C，在 T09.4 验收。需本地手动操作账户和管理员流程时，可另行配置本地 Supabase Auth 与邮件收件工具，目前尚未启动该服务；未配置时页面继续如实提示不可登录。完整边界见 [LOCAL-FIRST.md](LOCAL-FIRST.md)。

2026-10-16 已将真实本地操作环境明确列为 [T06-O](tasks/T06-accounts.md#local-operator-setup)，执行位置见 [ROADMAP.md](ROADMAP.md)。该任务将核对受支持的本地 Auth/收件工具、隔离存储/端口、可重复启停与注册/验证/管理员授权，保留现有业务库、数据卷和稳定密钥；当前仍未配置。本地准备失败不阻塞 T12-A 的模型/API/隔离测试，也不能用 seed UUID 或测试身份开关代替登录。

## 云端准备

1. 使用自己的 Supabase 项目，启用 Email/password 和邮箱确认；正常密码登录不发送邮件。业务表留在私有 `orai` schema，不修改 Supabase 的 `auth` schema。
2. 在 Resend 验证发信域名，将其 SMTP 凭据填入 Supabase Auth 的自定义 SMTP 设置。Resend API key 不需要填到 NestJS 或前端；SMTP 密码不能放入 `VITE_` 配置。
3. Supabase Auth 的 Site URL 和 Redirect URLs 必须列出实际使用的站点和 `/auth/callback`、`/auth/reset` 回调地址。本地分别配置需要的 `http://localhost:5173` 或 `http://127.0.0.1:5173`；公网验收属于 T09，使用确定的 HTTPS 域名，不放行任意外域。
4. 核验 Supabase 发送/登录限流和 SMTP 投递情况，准备一个可以实际收信的测试邮箱。前端处理发送过快、服务失败及回调失效；按钮冷却不是后台限流的替代。

当前固定 SDK 2.117.3 使用 PKCE，显式启用 `appendPkceFlowIdToRedirects`，邮件回调包含 `sb_flow_id`。允许实际站点的 `/auth/callback?sb_flow_id=*`、`/auth/reset?sb_flow_id=*`；仅匹配这两个路径的流程参数，不放行任意主机。检查 Supabase 邮件模板保留默认 `{{ .ConfirmationURL }}` 验证链接，避免手写模板丢弃回调参数。首次邮件需在发起申请的同一浏览器打开，随后可以在其他设备用邮箱密码登录；国内内置浏览器与邮箱之间的实际跳转仍需验收。

## 本地配置

仅在 Git 忽略且权限为 0600 的 `.env` 中填值，不在聊天、日志或文档中粘贴凭据：

| 配置 | 用途 |
| --- | --- |
| `SUPABASE_URL`、`VITE_SUPABASE_URL` | 同一个 Supabase 项目 URL |
| `SUPABASE_PUBLISHABLE_KEY`、`VITE_SUPABASE_PUBLISHABLE_KEY` | 同项目公开 publishable key 或旧 anon key；禁止 service role/secret key |
| `VITE_APP_PUBLIC_ORIGIN` | 正式认证必须填写实际 HTTPS 站点 origin；与浏览器当前 origin 一致，本地可留空 |
| `AUTH_SESSION_ENCRYPTION_KEY` | 仅服务端，32 字节 base64url；`pnpm local:setup` 为自有本地环境生成并保留稳定值 |
| `ACCOUNT_SESSION_DAYS` | 本站账户会话期限，默认 30 天，上限 90 天 |
| `AUTH_REQUEST_TIMEOUT_MS` | Auth 网络请求超时，默认 8000 毫秒 |

不要轮换加密密钥来“修复”登录故障，轮换会令原会话失效。前端 SDK 负责注册、密码登录与回调，后台验证签名/发行方/有效期并读取 Auth 当前状态，业务角色只读业务库；前端持有的凭据向本站安全会话交接后不长期存入浏览器存储。

临时页面：`/auth/register`、`/auth/login`、`/auth/forgot`、`/auth/callback`、`/auth/reset`、`/account`。只采用功能控件，商品/报告/绑定操作已由 T08 接入。验证参数在加载账户页面时从地址栏移除，页面使用 no-referrer。浏览器仅保存最长一小时的 PKCE 验证信息，JWT/刷新凭据留在短期内存；SDK 后台刷新和跨标签广播关闭。重置授权最多十分钟，离开/刷新后需重新申请。

本站认证交接使用 Origin/CSRF 保护的 `/api/account/session`，后台确认访问/刷新凭据对应同一有效 Auth 会话后设置 HttpOnly Cookie。后台以 AES-256-GCM 保存刷新凭据，Cookie 只存随机会话标识。后台刷新使用一次有超时的 Auth REST 请求，返回身份仍经官方 SDK 校验。退出先撤销本站会话，服务商退出失败时如实提示。稳定 Auth 用户 ID 用于商品归属，重新登录不延长商品或报告期限。

## 验收证据

必须实际走通：注册 → 收信 → 验证 → 密码登录 → 显式绑定 → 第二设备恢复；找回 → 收信 → 重置 → 新密码登录；退出/撤权、他人持码、普通用户权限拒绝及失败提示。仅 SDK + 隔离 JWKS/Auth 服务、测试身份、seed 或模拟邮件均不能勾选真实云端验收。

已完成的基础测试使用真实 SDK、隔离 HTTP JWKS/Auth 服务、真实 EC 签名及一次性 PostgreSQL 库，没有生产身份绕过入口。具体测试与待完成项见 [PROGRESS.md](PROGRESS.md)。
