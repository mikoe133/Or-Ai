# Or-Ai

2026-10-28：所有正常商品体验使用Three.js，视觉、动画、镜头与交互按每款商品规划确定。01规划合同、02 Skill政策、03项目/发布校验和04旧方法前向升级已完成各自本地范围；API/MCP/后台固定v2规划及精确方法，新采用包v3，旧版本与历史数据保留。04选定四份方法追加为DRAFT，未自动启用或重绑。

- [按序任务](prd/v1/tasks/README.md)：01–04及07本地范围已归档，当前05/06合成技术准备；包含新增17在内的其余12批仍按依赖与暂停边界执行。
- [路线与条件](prd/v1/ROADMAP.md)、[当前进度](prd/v1/PROGRESS.md)：04代码594项、类型/构建，最终专项13项及16项自主CUA通过；完整Git存档与后续功能完成分别记录。
- [已完成归档](prd/v1/tasks/archive/README.md)：保留9份原完整任务及当前01–04、07完成范围，云端/真机/正式商品/商业验收仍有独立任务持有。
- [项目设计Skill](.agents/skills/anti-ai-web-design/SKILL.md)已保存并完整阅读，[17/T18后续全站设计任务](prd/v1/tasks/active/17-frontend-design-refinement.md)已登记；后台共享骨架/概览、商品/内容目录与工作台首批已实现并验证；商城用户端需先截图审核，全站改造未完成，商品Three.js差异规划保留。
- [商品实现规范](prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md)、[v1文档入口](prd/v1/README.md)：固定产品规则与工程/制作合同。

当前按用户授权对已有安全项目改动正常提交推送，结果以Git回执为准；按依赖继续任务。旧托管CI run40524842978的失败断言因403权限尚不可读，见[独立调查](output/implementation/ci-investigation-20261028.md)，不冒称已修复。真实云部署、商业发布和交易未完成；内容/模型比较暂停，日更配置未启用。

## 本地工具链

Node.js 24.21.0（LTS）、pnpm 10.33.2、TypeScript 5.9.3；版本在 `.nvmrc`、`package.json` 与锁文件中固定。

在仓库根目录，使用 nvm 切换项目版本；不需要改全局默认 Node：

```sh
nvm install
nvm use
npm install --global pnpm@10.33.2
pnpm install --frozen-lockfile
```

已经具备相同 pnpm 版本时无需重复安装。`nvm` 尚未加载时先执行 `source ~/.nvm/nvm.sh`。

## 本地启动

macOS 使用项目独立的 Colima 虚拟机，需要先安装 Homebrew 和以下工具：

```sh
brew install colima docker docker-compose docker-buildx
```

Linux 使用已有 Docker Engine、Compose 与 Buildx。Windows 可在配置好 Docker 的 WSL 环境运行。以下命令在仓库根目录执行：

```sh
pnpm local:setup
pnpm runtime:start
pnpm db:up
pnpm build
pnpm db:migrate
pnpm db:provision
pnpm db:seed
pnpm dev
```

`local:setup` 首次生成权限为 `0600` 的 `.env`，分别使用随机 owner/运行账号密码和稳定随机 `CSRF_SIGNING_KEY`。对于本项目生成且仍匹配的旧本地配置，它补充分离账号/缺失签名配置并保留其余设置；自定义/外部数据库不会自动改写。`.env` 被 Git 和 Docker 构建忽略。`POSTGRES_PASSWORD`/`MIGRATION_DATABASE_URL` 供容器初始化/迁移，`DATABASE_URL` 是受限 `orai_app`，`DATABASE_CONTAINER_URL` 是该账号在容器网段的连接。已有数据卷或角色不会因修改环境变量自动重置密码。

`db:migrate` 使用 owner 应用私有 `orai` schema 的迁移，不改 Supabase auth；`db:provision` 只为明确的本地开发/测试库设置受限账号和环境标记。`db:seed` 拒绝生产/远程目标，装载三款主占位和状态样本，重复执行不复制数据、不输出完整码或令牌。具体模型/权限/维护说明见 [DATA-MODEL.md](prd/v1/DATA-MODEL.md)，前端和设计字段见 [API-CONTRACTS.md](prd/v1/API-CONTRACTS.md)。

打开 [本地页面](http://127.0.0.1:5173/)。Vite 将 `/api`、`/health` 同域代理到 NestJS，避免浏览器直接持有数据库配置。默认 Web 端口 `5173`、API 端口 `4100`、数据库端口 `55432`；可在 `.env` 修改。端口被占用时先关闭对应的本项目进程。

macOS 的 `runtime:start` 只启动 `orai-dev` profile，不修改现有 Docker context 或全局 SSH 配置；缺少 Homebrew Compose/Buildx 插件时只补充缺失的插件链接。虚拟机默认使用 2 核、2 GB 内存与项目所在卷上的独立存储，路径记录在 `.env` 的 `ORAI_RUNTIME_HOME`。启动脚本会修复已知的 guest DNS 悬空链接，并关闭未使用的 guest DNS 服务以避免额外端口转发，不改主机 DNS。`pnpm docker …` 始终连接这个 profile；Linux 使用已有 Docker 连接。

## 健康检查和验证

```sh
curl --fail http://127.0.0.1:4100/health/live
curl --fail http://127.0.0.1:4100/health/ready
pnpm check:toolchain
pnpm typecheck
pnpm build
pnpm test
```

`/health/live` 验证进程存活，`/health/ready` 实际执行经过认证的 `SELECT 1`；数据库断开或密码错误时返回 `503` 和 `database: down`，不输出连接信息。API 提供请求 ID、统一公开错误格式与输入校验。

`pnpm test` 需要上述迁移/provision 完成后的真实本地 PostgreSQL 和明确开发/测试配置。覆盖健康/输入/配置、隐私、数据库约束/权限、重复 seed、目录/版本、兑换并发/恢复/安全 Cookie/CSRF/限流/期限、补发/退款回滚，以及答题修订、评分边界、并发完成、分母/版本隔离、统计读取故障、报告删除与受保护维护 CLI。还验证了默认写入限流下的 100 题、12 维完整 HTTP 流程。模型与业务测试使用 owner 创建随机命名的空测试库，迁移/验证后确认全部连接关闭再删除自己创建的库，不清空开发库。`pnpm db:validate` 校验 Prisma schema，`pnpm db:status` 检查已保存迁移状态。

Prisma 7.10.0、pg 适配器和客户端版本一致，生成客户端/维护脚本/测试产物被 Git/Docker 忽略；构建与检查会重新生成客户端。Zod 固定 4.6.5，公开入口不导出私有配置；seed 报告/身份场景仍是合成 fixture。T05 验收使用实际接口生成的报告，真实认证/收信由 T06 验收。

`.github/workflows/ci.yml`配置固定工具链、PostgreSQL、相同检查和Linux镜像；04提交7dbc175的托管CI已成功，当前批次的推送/CI结果单独记录，不能替代旧失败run的原始断言。

## 商品目录与版本维护

T03 已实现分类/标签、商品列表和 slug 详情，开发/测试仅展示 DEMO，生产仅展示 LIVE；列表只含公开卡片字段，详情增加独立公开样例与购买/兑换说明。可直接通过 API 或 Vite 同域代理验证：

```sh
curl --fail http://127.0.0.1:4100/api/categories
curl --fail http://127.0.0.1:5173/api/tags
curl --fail 'http://127.0.0.1:5173/api/products?category=relationships&tags=demo,cooperation&sort=latest&page=1&pageSize=20'
curl --fail http://127.0.0.1:5173/api/products/demo-partner
```

公开路由不能读取完整题目、计分或报告模板。配置校验/导入/预览/修改/审核/发布/下架可用受保护本机 `pnpm catalog:manage`，T07 同时提供经账户/已验证邮箱/服务端 ADMIN 角色保护的版本 HTTP 接口。预览含私有配置，普通用户不可访问；具体命令、过滤/排序和返回字段见 [接口说明](prd/v1/API-CONTRACTS.md)。

## 运营与素材接口

后端实现在 `apps/api/src/operations`，入口为 `/api/admin/*`；商品版本和售后复用现有事务。支持商品/分类/标签/推荐、配置导入/预览/审核/发布/下架，人工订单与 500 行 CSV 的预演/部分失败/去重，首次秘密发码、补发退款、审计与真实口径概览。编辑携带 expectedRevision/requestId，状态变化更新修订；历史报告和已消耗次数保留。

封面、视频、脚本、文案有独立基础素材记录。媒体走申请→流式上传→服务端实际签名/大小/SHA-256 校验→完成→素材审核/READY；返回稳定 assetId/fileId，不接受客户端 storageKey。上传者、版本、范围、用途、期限和并发配额均校验，下载需当前管理员权限并支持字节 Range。只有明确选为商品封面的当前版本 READY 图片才公开，视频等不会自动公开。完整端点和状态见 [运营接口](prd/v1/API-CONTRACTS.md#运营接口t07-本地已实现)。

本地角色初始化使用 `pnpm admin:manage grant --supabase-user <uuid> --request-id <uuid>`，撤销用 revoke。命令只接受已有用户、明确的本地目标、环境标记与 schema owner，并审计；没有 HTTP 提权入口。T06-O 已通过真实本机 Auth 用户登录/授权/撤销，配置步骤见 [本地/云端 Auth](prd/v1/AUTH-SETUP.md)，隔离测试身份没有作为登录后门交付。

ASSET_STORAGE_DRIVER 默认在开发/测试为 local，ASSET_DIRECTORY 相对 API 工作目录，通常为 `apps/api/.local/assets`。图片默认上限 10 MiB，视频 100 MiB；可用 `.env.example` 中的设置调整。开发容器预建非 root 可写的 0700 目录，文件不进入镜像或 Git；重建容器不会保留可写层文件。生产拒绝 local 驱动，云存储适配/持久化在 T09 接入。

后台覆盖率验证可在 `pnpm test` 编译后从 `apps/api` 运行：

```sh
node --env-file=../../.env --test --experimental-test-coverage --test-coverage-include='.test-build/src/operations/**' --test-coverage-include='.test-build/scripts/admin-command.js' --test-coverage-lines=80 --test-coverage-functions=80 --test-coverage-branches=80 .test-build/test/operations.test.js .test-build/test/asset-storage.test.js
```

T08 已接入受保护的简单管理页面；T12 已完成四类内容工作台、素材历史/固定引用与成套采用。T13-A/B 已完成 skill 库、五用途组合和制作来源；四领域本地 MCP 已实现；远程 MCP 与 3D/小游戏继续按 T14-C、T15–T17 推进。

## 本地功能页面（T08 已验收）

真实业务页面共用现有布局和临时功能样式：`/`、`/products/:slug`、`/redeem`、`/apps`、`/reports`、`/attempts/:id`、`/reports/:id`。商城筛选、排序与页码保存在 URL；匿名/账户列表用 `source=anonymous|account` 独立显示。答题只将服务端确认的答案计入进度，断网重试保留原请求 ID；统计暂不可用仍能继续。报告支持缺失分数、完整声明的 PNG 摘要导出和确认后永久删除。

`/admin`、`/admin/products`、`/admin/assets`、`/admin/orders` 接入真实 T07 API，支持商品资料与配置版本、发布/下架、四类素材、文件校验/预览/封面采用、CSV 预演/导入、首次交付/补发/退款和审计概览。代码/文件/报告权限由服务器复核；退出或切换身份会取消并清除私密查询，通知其他打开的标签页。

T06-O 已接入真实本机 Auth，可按 [AUTH-SETUP.md](prd/v1/AUTH-SETUP.md) 登录基础后台。下面的 T08 业务回归仍在隔离 Nest 测试进程替换外部身份事实；新增 `pnpm test:e2e:local-auth` 则使用实际注册用户、Mailpit 和现有开发服务，二者分别记录证据。没有交付测试登录后门。

本机 PostgreSQL 和 `.env` 就绪后运行：

```sh
pnpm test
pnpm test:e2e
```

E2E 自动迁移、初始化并清理自己的随机测试库，启动独立测试 API 与 Vite `5175`，不使用开发业务库。macOS 默认使用已安装 Chrome，可通过 `ORAI_BROWSER_PATH` 指定浏览器；Linux 先执行 `pnpm exec playwright install chromium`。截图和结果位于忽略目录 `.local/t08/e2e/`。断网、统计不可用和长文本展示采用显式故障/响应夹具；数据库事务、恢复、绑定、删除及撤权实际执行。真实邮件/云 Auth 验收仍由 T09 完成。

数据客户端、身份缓存、请求意图、筛选模型和分享导出的单元覆盖率为行 98.49%、分支 91.41%、函数 97.30%，不是整个 React 页面覆盖率。可在 `pnpm test` 编译后从根目录重跑：

```sh
node --test --experimental-test-coverage --test-coverage-lines=80 --test-coverage-branches=80 --test-coverage-functions=80 --test-coverage-include='apps/web/.test-build/src/api/{client,privacy,intent}.js' --test-coverage-include='apps/web/.test-build/src/business/{model,download}.js' apps/web/.test-build/test/runtime-client.test.js apps/web/.test-build/test/share-card.test.js
```

## 兑换与测试交付

T04 已实现 session/context、redemptions/claim/recover、session/entitlements（分页/单项）及 session/logout。浏览器先经同域 GET context 获取签名 CSRF，再用 JSON、X-CSRF-Token 和本站 Origin 发起兑换；会话凭据只放在 HttpOnly Cookie。没有登录要求，换设备输入未绑定有效码恢复同一权益，重试不增报告次数。到期、绑定、补发旧码和退款撤权均由后端检查。T05 提供题目/报告接口，T08 已完成对应功能页面接入。

`pnpm delivery:manage` 提供 order/issue/replace/refund，使用同样的本地 owner＋ADMIN 权限；订单为手工测试记录，不代表平台核单/资金退款。完整兑换码只在首次写入的独占 0600 文件中交付，stdout/日志/数据库无明文；同 request-id 重放只有回执。补发承接原权益、次数、报告与绑定，退款同步撤权并剔除统计贡献。命令、返回字段及异常规则见 [接口说明](prd/v1/API-CONTRACTS.md)。

`.env.example` 包含来源、签名密钥、会话期限和限流设置，Compose 也会透传。生产要求 HTTPS APP_PUBLIC_ORIGIN 和稳定随机 CSRF_SIGNING_KEY；HTTPS Cookie 使用 Secure 和 __Host- 前缀。默认不信任转发 IP，TRUST_PROXY_CIDRS 按实际可信代理配置；正式代理拓扑与公网链路在 T09 验证。私人响应统一 no-store。

## 动态答题、报告与清理预演

T05 提供 attempts 创建/题目读取、逐题保存、已答题反馈、提交，以及 reports 读取/删除。每个有效权益只对应一份锁定版本答卷，保存采用整体修订号，报告完成才原子消费一次；重复提交返回同报告。统计排除自己的回答/结论，分别使用其他有效回答与完成答卷的分母。详细请求、评分规则、故障/重试与 T08 状态交接见 [接口说明](prd/v1/API-CONTRACTS.md)。

`pnpm retention:preview --actor ADMIN_UUID --as-of 2027-01-01T00:00:00.000Z --page 1 --page-size 20` 使用受保护本机 owner/ADMIN 权限，分页列出过期答案/报告的 ID、期限和份数。只做预演，排除进行中答卷，不读取或输出私人内容，不执行删除。主动删除报告会永久清空快照、留墓碑且不返还次数；演示环境暂留原始答案与有效汇总，正式删除/保留政策由 T11 确定。

运行引擎覆盖率可在 `pnpm test` 编译后，从 `apps/api` 目录运行：

```sh
node --env-file=../../.env --test --experimental-test-coverage --test-coverage-include='.test-build/src/runtime/**/*.js' --test-coverage-lines=80 --test-coverage-functions=80 --test-coverage-branches=80 .test-build/test/runtime.test.js .test-build/test/scoring.test.js
```

## API 容器

先用 `Ctrl+C` 关闭本地 API，释放 `4100`，再运行：

```sh
pnpm docker:build
pnpm docker compose --profile app up -d --no-build --wait api
curl --fail http://127.0.0.1:4100/health/ready
pnpm docker compose --profile app stop api
```

Dockerfile 使用多阶段构建、锁文件安装、OpenSSL 3/CA 证书与非 root 运行用户；镜像不含本地 .env、测试或维护源码。容器 API 监听 `0.0.0.0:4100`；Compose 只将本地端口绑定到 `127.0.0.1`，宿主机开发 API 默认监听 `127.0.0.1`。需要验证目标 Linux 架构时运行：

```sh
pnpm docker build --platform linux/amd64 -f apps/api/Dockerfile -t orai-api:local .
```

Compose 的 `app` profile 用开发配置连接同网段本地数据库。生产容器默认要求 `DATABASE_SSL_MODE=verify-full`，必须传入经过验证的数据库连接配置，不可直接复用本地 `.env`。T09 再进行云端托管与公网验证。

## 配置与关闭

`.env.example` 分隔运行与认证配置，示例中的 `SUPABASE_*`、`VITE_SUPABASE_*` 默认留空。本机 `pnpm auth:setup` 配置真实 Auth，`pnpm auth:disable` 可撤回其管理字段；停用时认证页如实提示未配置，匿名兑换独立可用。按 [账户配置](prd/v1/AUTH-SETUP.md) 区分本机服务与后续云端 Supabase/Resend。浏览器只能使用公开的 `VITE_` 配置，数据库密码、服务端加密密钥及 service role 不得使用此前缀；不用在聊天中粘贴凭据。

临时账户页面为 `/auth/register`、`/auth/login`、`/auth/forgot`、`/auth/callback`、`/auth/reset`、`/account`。邮箱确认与找回首次回调需在发起申请的同一浏览器打开，验证后可在其他设备密码登录。后台 Cookie 负责业务会话与刷新，登录不自动绑定商品。根 `pnpm test` 同时运行 API 与前端认证逻辑测试，测试不会调用真实邮件服务。

开发终端按 `Ctrl+C` 关闭 API/Web，然后：

```sh
# 已配置本机 Auth 时执行以下第一行。
pnpm auth:down
pnpm db:down
pnpm runtime:stop
```

关闭命令保留数据库数据卷，下次可继续使用。不要用删除数据卷的命令代替关闭操作。NestJS 退出时会关闭数据库连接池。

## 进度与执行方式

每次按 ROADMAP 处理一个明确批次并验证。O3指定正式UI已获批准，O4先核查/设计，到新的O4-A设计审核停下；不提前实现配置表/API或正式页面。W6 模型比较与 W3 内容制作继续暂停，历史批准和调用前停止记录保持；真实权限/客户端/真机、未来 UI 与云服务独立审核。未创建 Goal、自动化或云资源；证据见 [PROGRESS.md](prd/v1/PROGRESS.md)。
