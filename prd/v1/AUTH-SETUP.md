# T06 账户与邮件配置

当前状态：T06-L 的账户逻辑已通过隔离测试，T06-O 已接通真实本机 Supabase Auth 和 Mailpit。本页区分本机操作环境与 T06-C/T09 的真实云端、外部邮箱和 Resend 验收；本机成功不关闭云端待办。

2026-10-10 用户要求先完成本地功能：T06-L 已通过，T07/T08 不等待云配置；真实云端认证/邮件作为 T06-C，在 T09.4 验收。未启用任何 Auth 时页面继续如实提示不可登录，匿名兑换独立可用。完整边界见 [LOCAL-FIRST.md](LOCAL-FIRST.md)。

2026-10-16 执行 [T06-O](tasks/T06-accounts.md#local-operator-setup)，执行位置见 [ROADMAP.md](ROADMAP.md)。本地认证使用官方 Auth 服务和本地收件箱，保留业务库、数据卷与稳定密钥；没有 seed 登录或测试身份入口。

## 真实本机操作环境（T06-O）

运行栈固定为 Supabase Auth `v2.197.0`、PostgreSQL `17.10-bookworm`、Mailpit `v1.31.6` 和 nginx `1.28.3-alpine`。nginx 基础镜像另固定官方 manifest 摘要。这里只运行 Auth 所需服务，不提供完整 Supabase Studio、PostgREST 或云项目。Supabase JS 继续固定 `2.117.3`，业务仍是现有 NestJS/Prisma/PostgreSQL。

核对依据：[官方自托管配置（固定提交）](https://github.com/supabase/supabase/blob/bc27d2661edd09a5d0b8d76ce33da6d4071a756e/docker/docker-compose.yml)、[Auth 固定版本说明](https://github.com/supabase/auth/blob/v2.197.0/README.md)、[Mailpit 固定版本](https://github.com/axllent/mailpit/releases/tag/v1.31.6)、[Mailpit Docker 文档](https://mailpit.axllent.org/docs/install/docker/)。Auth 自己执行其上游迁移；本项目只初始化独立库的角色/schema，不改写 Auth 表结构。

| 入口/存储 | 默认值与隔离范围 |
| --- | --- |
| 本站 | `http://127.0.0.1:5173` |
| Auth base URL | `http://127.0.0.1:54321`，实际路由 `/auth/v1/*` |
| Mailpit 收件箱 | `http://127.0.0.1:54324`；SMTP 1025 仅容器内可见 |
| 独立认证数据库 | `auth-db:5432/orai_auth`，不映射主机端口 |
| 独立认证数据卷 | `orai-auth-local_auth-pgdata` |
| 独立邮件数据卷 | `orai-auth-local_auth-maildata`，最多保留 100 封开发邮件 |
| 原业务数据库/卷 | 继续使用本机 55432 与 `orai_pgdata`，Auth 不连接它 |

两个主机入口只绑定 `127.0.0.1`。认证数据库与 Auth 在独立内部网络，只有网关和 Mailpit 提供本机入口。邮件只进入 Mailpit，不配置 SMTP relay、真实外部邮箱或发信服务。网关仅放行配置中的本站网页 Origin，处理 SDK 的 `apikey` 预检；认证、回调和严格 issuer 校验仍由现有 SDK/后端执行。

### 首次配置与日常启停

先完成根 README 的 `local:setup`、运行时、业务库迁移和 provision。在同一仓库终端切换 `.nvmrc` 指定的 Node 后执行：

```sh
pnpm auth:setup
pnpm auth:up
pnpm auth:status
pnpm dev
```

已有 `pnpm dev` 时，配置后停止并重新启动**本项目**的开发进程，使 NestJS 和 Vite 都读取新的 `.env`。浏览器统一使用 `127.0.0.1:5173`；本配置不将 `localhost` 视为相同回调来源。手动入口为 [邮箱登录](http://127.0.0.1:5173/auth/login)、[注册](http://127.0.0.1:5173/auth/register)、[后台](http://127.0.0.1:5173/admin)和 [Mailpit](http://127.0.0.1:54324/)。

本节验收使用主机 `pnpm dev`。容器 API 的 Auth 地址需使用容器可达且 issuer 一致的入口，不能将主机 `127.0.0.1` 当作容器内的 Auth 服务；本轮不将其计为整栈容器认证已通过。

```sh
pnpm auth:down
pnpm auth:up
pnpm auth:restart
```

`auth:down` 只停止独立认证项目的容器，保留两份卷；不停止业务库、API 或 Vite，不删除账户。`auth:up` 按固定 Dockerfile 构建并等待健康；`auth:restart` 使用现有镜像，按数据库/邮件健康依赖重建容器并等待就绪，不使用并发 `compose restart`。`auth:status` 分别报告 Auth、邮件和应用配置状态。首次启动需从官方镜像仓库获取镜像。命令使用项目已有的 `pnpm docker` 连接方式，不切换全局 Docker context 或主机 DNS。

`auth:setup` 只接受明确的本机 development/test 业务目标、分离的 owner/运行账号以及已存在的稳定 CSRF/账户加密密钥。已有远程、自定义或不完整 Auth 配置会被拒绝，不覆盖它。它生成并保留 `LOCAL_AUTH_DB_PASSWORD`、`LOCAL_AUTH_JWT_SECRET` 和仅有 `anon` 角色的公开 key；不生成或向浏览器分发 service-role key。本地采用上游仍支持的 HS256，后端仍通过真实 Auth 当前账户状态和刷新验证，未放宽发行方或账户检查。

配置只写 Git 忽略的 `0600 .env`，恢复记录在 `0600 .local/auth/config-restore.json`。重复 setup 不换密钥。原业务数据库密码、`CSRF_SIGNING_KEY`、`AUTH_SESSION_ENCRYPTION_KEY` 不变。首次启动数据库只创建受限 `supabase_auth_admin` 以及上游迁移所需的无登录 `postgres` 角色，均不具有集群管理权限；专用 owner 留在认证容器内部。

### 注册、收信与管理员授权

1. 在本站注册页使用本地测试地址（例如保留域名 `@orai.test`）和独立密码。未验证邮箱不能密码登录，也不能取得管理员权限。
2. 在 Mailpit 找到确认邮件，将验证链接在**发起注册的同一浏览器**打开。可以在该浏览器中打开收件箱，也可复制链接回原浏览器；不要将链接粘贴到聊天或日志。
3. 回到账户页后验证参数会从地址栏清除；退出后再以邮箱密码登录。第一次有效会话交接才同步业务用户，默认角色为普通用户。
4. 在终端用现有 owner 维护命令授权。参数是**真实 Auth 用户 UUID**，不是业务用户 UUID，也不是 seed 中的管理员 UUID。可从本轮私有账户文件获取，或在专用认证库只读查询自己的本地账户：

```sh
pnpm docker compose --project-name orai-auth-local --file compose.auth.yml exec auth-db psql -U auth_owner -d orai_auth -c 'SELECT id,email,email_confirmed_at FROM auth.users ORDER BY created_at DESC LIMIT 10'
pnpm admin:manage grant --supabase-user <真实Auth用户UUID> --request-id <新UUID>
```

重新读取后台即可使用现有商品/版本、素材、人工订单与审计页面。授权命令仍要求对应业务用户已登录同步、DEMO 范围、受控本地数据库标记及 schema owner，写入审计；相同 request-id 的同一操作保持幂等。普通注册或修改用户资料不会提权。

```sh
pnpm admin:manage revoke --supabase-user <真实Auth用户UUID> --request-id <另一个新UUID>
```

撤销后，已打开页面的新读写请求立即被拒绝。退出同时撤销本站会话；复制的旧 Cookie 也不能恢复后台访问。`/auth/forgot` 的邮件同样进入 Mailpit；重置后旧密码失效，新密码可在另一个浏览器登录。

本轮验收账户保存在 Git 忽略的 `0600 .local/auth/operator-account.json`，包含可供经营者本机操作的管理员、普通账户和当前密码。不要提交或转发此文件。再次运行真实验收会新建账户、更新该文件并保留 DEMO 订单/草稿/审计，不替换历史数据。T14 尚未实现，后台目前不能签发 MCP 机器凭据。

### 停用配置与恢复

```sh
pnpm auth:disable
pnpm auth:down
```

随后重启本项目 API/Vite。`auth:disable` 只将它管理的五个前后端认证字段恢复为启用前值，保留认证密钥、独立卷和其他后来编辑的配置；无 Auth 时页面如实显示未配置。若字段已被经营者改为其他服务，它会拒绝覆盖。重新执行 `auth:setup`、`auth:up` 并重启 API/Vite，就会使用原密钥和账户。

故障恢复规则：

- 就绪失败时先执行 `auth:status`；容器命令的原始诊断在 `0600 .local/auth/runtime-last.log`，只在本机阅读，避免转发原始日志、邮件验证链接或令牌。
- 端口冲突时先确认占用者。首次启用前可在 `.env` 设置 `LOCAL_AUTH_PORT`/`LOCAL_MAIL_PORT`；改变已启用环境的端口或 WEB_PORT 前先停用配置，再调整并重新 setup/up。已有卷不因端口变化重置。
- 镜像仓库连接中断时保留服务和数据，恢复网络后重试对应固定镜像的构建/启动；已存在容器可独立停止/重启。不要修改全局 context、DNS 或用 `down -v` 修复问题。
- SMTP 验证失败时检查 Mailpit 就绪、容器内 SMTP 1025 和回调 origin，不切换为自动确认。邮件链接过期、已使用、错浏览器或缺失 PKCE 时从本站重新申请，保留 `sb_flow_id` 和默认 `ConfirmationURL` 模板。
- 恢复记录丢失、密钥缺失或密钥与卷不匹配时，恢复配套的私有 `.env`/恢复记录与运行卷备份；不要重新生成密码或删除卷。普通账户登录失败先区分密码/邮箱未验证、限流与服务故障。
- 长流程测试会遵守真实 API 读限流，等待现有窗口结束；不清理限流表或提高实际运行阈值。数据库备份/完整恢复与云端高可用仍在 T09 验收。

### 本地验证命令与证据

```sh
pnpm test:local-auth
pnpm test:local-auth:stack
pnpm test:local-auth:restart
node --test scripts/test/local-auth-fresh.test.mjs
pnpm test:e2e:local-auth
```

前两项分别验证配置/生命周期保护和实际运行栈。restart 测试会重启真实本地认证服务，检查账户、邮件及环境保留。空卷测试创建随机命名的临时认证项目，只清理它自己创建的容器与卷；不选择主认证项目或业务卷。真实浏览器测试直接访问正在运行的 5173/54321/54324，经真实注册、收件、PKCE 和业务会话登录，没有 Nest 身份替身、测试 JWT 注入或 Auth 管理员代建用户。验收期间避免并行执行 `db:generate`/编译生成文件，以免触发开发 API 的自动重启。

证据保存在忽略目录 `.local/t06-o/`，浏览器最终清单为 `e2e/result.json`，不记录密码、JWT、刷新令牌或邮件验证 URL。原有 `pnpm test:e2e` 仍使用独立测试库/身份事实，保留其业务回归价值，不将它冒充本节的真实 Auth 证据。

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
