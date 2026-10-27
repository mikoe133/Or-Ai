# Or-Ai

2026-10-23平台业务优先。O1–O4本地技术与各自指定正式UI已通过；O4三图于上海04:20:50获用户“可以”，[批准独立记录](../../../../../../output/design-review/external-run-configuration-o4-formal-20261023/APPROVAL.md)，原技术pending保持。用户04:21:08明确“现在无需审核，帮我一直处理完所有任务”，后续在既有规划内连续开发与自主UI验收，[T10-L正式视觉接入](../../../../T10-LOCAL-UI.md)本地通过，T09本地部署准备已通过，见[具体资源/费用与接入缺口](../../../../CLOUD-READINESS.md)；真实云端仍未验收。真实授权/持续凭据、客户端、云付费、真实日程、发布与交易仍需具体批准；内容打磨/生成和档位比较暂停。

平台定位为提供情绪价值的自我与关系探索平台。不同商品的题目/交互、报告、视频、文案和封面，按同一份[商品创作设定](../../../../PRODUCT-CREATIVE-SYSTEM.md) 配套制作，帮助用户获得具体理解、表达与沟通线索；新风格/报告/双人能力仍按各任务范围验收。

主平台正在按 [v1 任务](README-before-replan.md) 开发；商品先使用测试占位内容，用户已完成 Figma 手机/网页设计，采用[本地开发优先](../../../../LOCAL-FIRST.md)、云端接入后置。

O4最近全量证据（2026-10-23）：511 项测试（API 423/web 69/SDK 19）、类型检查、构建及本轮57项既有浏览器回归通过；O4新增23项API检查、21个正式页面情境/26图通过。最后两处新UI修订后已重验web69、全量类型/构建和O4页面，旧57在该小修前通过。正式组件使用真实隔离 API/TEST 库及身份/剪贴板替身；73模型/26迁移，64类表/1157行旧字段、原25迁移及历史引用保持，临时库和开发库配置均0，见 [PROGRESS](PROGRESS-through-20261026.md)。手机为模拟视口；各批历史批准及 T10/T09/T11 独立边界保持。

2026-10-14 已接入 Figma 商城主页的本地视觉与搜索、分类、收藏等预览交互，现保留在独立的[设计预览](http://127.0.0.1:5173/preview)。双端截图与验证见[主页实现记录](../../../../../../output/implementation/homepage/README.md)。

2026-10-15 的 Figma 流程预览现位于[商品详情](http://127.0.0.1:5173/preview/products/partner) → [兑换](http://127.0.0.1:5173/preview/redeem) → [成功](http://127.0.0.1:5173/preview/redeem/success) → [答题与反馈](http://127.0.0.1:5173/preview/assessment/partner) → [完整报告](http://127.0.0.1:5173/preview/reports/partner)。示例码 `DEMO-XXXX-XXXX` 和 16 道公开示例题只用于设计预览；真实业务入口使用后端发布的商品、题量与权益。预览实现依据见[实现记录](../../../../../../output/implementation/store-flow/README.md)。

T01–T05、T06-L、T07 和 T08 本地功能已验收。[业务商城](http://127.0.0.1:5173/)已接入真实目录、兑换、答题、报告和简单运营页面。后端 158 项、前端 40 项测试及 22 项浏览器流程通过。真实 Supabase/Resend 收信、云端账户和对象存储持久化仍待 T09；正式双端视觉在 T10。证据见[执行记录](PROGRESS-through-20261026.md)。

2026-10-19 [T12-A 内容底座](../../../../CONTENT-FOUNDATION.md) 已完成：创作设定与内容历史、稳定引用、来源记录及混合存储元数据接口。`pnpm test:content` 的 20 项新增检查和完整后端 178＋前端 40 项回归、类型/构建通过；本机实际迁移保留既有业务数据，该批次为 33 模型/9 迁移。T12-B/C 工作台和成套采用现已完成，[T13-A skill 库](../../../../STYLE-SKILLS.md) 现已完成，T13-B 绑定也已完成，[T14 MCP](T14-mcp-ingestion.md) 已完成 LA 底座，LB 当前进度见上方说明。具体约定见[内容规划](../../../../CONTENT-BACKOFFICE.md)。

2026-10-19 [T12-B 四类内容工作台](http://127.0.0.1:5173/admin/content) 已完成：创作设定、题库/报告、封面、视频分镜、文案块、三类媒体状态、制作来源与整套试读。后端 182＋前端 42 项测试、31 项隔离浏览器流程及类型/构建通过；该批次为 33 模型/10 迁移，六类原业务表内容不变。11 项完整真实 Auth 流程沿用此前证据。

2026-10-20 [T12-C 引用与成套采用](../../../../CONTENT-ADOPTION.md) 已完成，整项 T12 本地验收通过：固定引用与上下游反查、差异/更新复查、不可变采用包/JSON 导出、清理预演/恢复和完整演示视频可用。后端 195＋前端 43，共 238 项测试、35 项浏览器流程及类型/构建通过；该批次为 37 模型/11 迁移。迁移保留旧业务，另新增未发布的[关系花园演示商品](http://127.0.0.1:5173/admin/content/01a157f3-3f92-77db-8967-0d27328e3eb6?version=01a157f3-3fcf-704d-8cca-1706f9d52a2a&profile=01a157f3-3fed-768f-9f0b-f373cf84150d&tab=adoption)和采用包；媒体另行授权下载，采用不会发布。

2026-10-20 [T13-A 四类 skill 库](../../../../STYLE-SKILLS.md) 已完成：[题库与报告](http://127.0.0.1:5173/admin/skills/assessment)、封面、视频、引流文案可独立维护专业用途、风格、正文和参考资料；版本审核/启用/归档、复制/差异、Markdown 与 JSON 导出可用。T13-A 阶段通过 251 项测试、38 项浏览器流程，达到 41 模型/12 迁移；旧业务/内容摘要不变。T13-B 商品绑定与来源现已完成，见 [绑定交接](../../../../SKILL-BINDINGS.md)；后台不会执行 skill。

2026-10-20 [T13-B 五用途绑定](../../../../SKILL-BINDINGS.md) 已完成：题目/报告/封面/视频/文案固定版本、制作来源、领域上下文与 v2 采用包；升级保留旧组合和旧包。全量 260 项测试、41 项浏览器流程通过，43 模型/13 迁移。可打开[配套演示商品](http://127.0.0.1:5173/admin/content/01a15846-9112-73f9-8a2d-9ec2c5cc809a?tab=skills)。

2026-10-20 [T14-LA 本地机器权限与上传](../../../../MCP-LOCAL-TRANSPORT.md) 已完成：[MCP 连接管理](http://127.0.0.1:5173/admin/machine) 支持按领域/商品/skill 签发、撤销和调用记录；五个 stdio 工具可传真实媒体与参考文件。291 项测试、43 项浏览器流程通过，46 模型/14 迁移，旧数据逐行保持；实际四域联调凭据已全部撤销。这些数字为 LA 历史记录；领域业务读取/草稿/来源现已在 T14-LB 实现，[本地接入说明](../../../../../../packages/mcp/README.md)。

2026-10-20 [T14-LB 领域内容工具](../../../../MCP-CONTENT-TOOLS.md) 已实现：四域读取与草稿保存、固定上下文/引用、skill 复制/编辑与机器来源。真实 SDK 已分别连接四域，在[配套演示工作台](http://127.0.0.1:5173/admin/content/01a15846-9112-73f9-8a2d-9ec2c5cc809a?version=01a158a6-74fd-76d9-b624-e2d42940e8d0&profile=01a15846-914a-71db-9b3c-9542906686a5&tab=video)新增四稿，视频引用两道题及 hook/cta。新稿未发布；314 项唯一测试与 44 项浏览器流程通过，证据见执行记录。

后续[多形态商品规划](../../../../EXPERIENCE-PLATFORM.md) 拆为 T15 体验模板/协议、T16 网页/2.5D/Three.js 试点、T17 小游戏新输入/评估。明确选择型沉浸呈现可复用现有计分，排序/分支/动作需另实现后端能力；这些是规划，当前没有 3D 或游戏运行器。

T08、T06-O、T12、T13、T14-L与T15已完成；[任务路线](ROADMAP-before-replan.md)当前推进T10-L正式视觉接入与本地回归，O1–O4指定本地范围通过。运行配置入口为[Codex连接→运行配置草稿](http://127.0.0.1:5173/admin/machine/configurations)，仍未启用。后续UI自主验证；真实云/付费/定时/发布等非UI边界仍独立确认。

本机账户环境使用独立 Supabase Auth 与 Mailpit。执行 `pnpm auth:setup`、`pnpm auth:up` 后重启本项目 `pnpm dev`，即可[登录](http://127.0.0.1:5173/auth/login)并访问[后台](http://127.0.0.1:5173/admin)，邮件在[本地收件箱](http://127.0.0.1:54324/)。本轮私有管理员凭据在 Git 忽略的 `.local/auth/operator-account.json`，操作和恢复步骤见 [AUTH-SETUP.md](../../../../AUTH-SETUP.md)。25 项新增配置/运行栈检查、11 项真实 Auth 浏览器流程及停用/恢复通过，原 198 项测试与 22 项业务浏览器回归亦通过；云端/外部邮件仍待 T09。

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

`db:migrate` 使用 owner 应用私有 `orai` schema 的迁移，不改 Supabase auth；`db:provision` 只为明确的本地开发/测试库设置受限账号和环境标记。`db:seed` 拒绝生产/远程目标，装载三款主占位和状态样本，重复执行不复制数据、不输出完整码或令牌。具体模型/权限/维护说明见 [DATA-MODEL.md](../../../../DATA-MODEL.md)，前端和设计字段见 [API-CONTRACTS.md](../../../../API-CONTRACTS.md)。

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

`.github/workflows/ci.yml` 配置了固定工具链、PostgreSQL service、相同检查和 Linux 容器构建；尚未推送触发远程 CI。

## 商品目录与版本维护

T03 已实现分类/标签、商品列表和 slug 详情，开发/测试仅展示 DEMO，生产仅展示 LIVE；列表只含公开卡片字段，详情增加独立公开样例与购买/兑换说明。可直接通过 API 或 Vite 同域代理验证：

```sh
curl --fail http://127.0.0.1:4100/api/categories
curl --fail http://127.0.0.1:5173/api/tags
curl --fail 'http://127.0.0.1:5173/api/products?category=relationships&tags=demo,cooperation&sort=latest&page=1&pageSize=20'
curl --fail http://127.0.0.1:5173/api/products/demo-partner
```

公开路由不能读取完整题目、计分或报告模板。配置校验/导入/预览/修改/审核/发布/下架可用受保护本机 `pnpm catalog:manage`，T07 同时提供经账户/已验证邮箱/服务端 ADMIN 角色保护的版本 HTTP 接口。预览含私有配置，普通用户不可访问；具体命令、过滤/排序和返回字段见 [接口说明](../../../../API-CONTRACTS.md)。

## 运营与素材接口

后端实现在 `apps/api/src/operations`，入口为 `/api/admin/*`；商品版本和售后复用现有事务。支持商品/分类/标签/推荐、配置导入/预览/审核/发布/下架，人工订单与 500 行 CSV 的预演/部分失败/去重，首次秘密发码、补发退款、审计与真实口径概览。编辑携带 expectedRevision/requestId，状态变化更新修订；历史报告和已消耗次数保留。

封面、视频、脚本、文案有独立基础素材记录。媒体走申请→流式上传→服务端实际签名/大小/SHA-256 校验→完成→素材审核/READY；返回稳定 assetId/fileId，不接受客户端 storageKey。上传者、版本、范围、用途、期限和并发配额均校验，下载需当前管理员权限并支持字节 Range。只有明确选为商品封面的当前版本 READY 图片才公开，视频等不会自动公开。完整端点和状态见 [运营接口](../../../../API-CONTRACTS.md#运营接口t07-本地已实现)。

本地角色初始化使用 `pnpm admin:manage grant --supabase-user <uuid> --request-id <uuid>`，撤销用 revoke。命令只接受已有用户、明确的本地目标、环境标记与 schema owner，并审计；没有 HTTP 提权入口。T06-O 已通过真实本机 Auth 用户登录/授权/撤销，配置步骤见 [本地/云端 Auth](../../../../AUTH-SETUP.md)，隔离测试身份没有作为登录后门交付。

ASSET_STORAGE_DRIVER 默认在开发/测试为 local，ASSET_DIRECTORY 相对 API 工作目录，通常为 `apps/api/.local/assets`。图片默认上限 10 MiB，视频 100 MiB；可用 `.env.example` 中的设置调整。开发容器预建非 root 可写的 0700 目录，文件不进入镜像或 Git；重建容器不会保留可写层文件。生产拒绝 local 驱动，云存储适配/持久化在 T09 接入。

后台覆盖率验证可在 `pnpm test` 编译后从 `apps/api` 运行：

```sh
node --env-file=../../.env --test --experimental-test-coverage --test-coverage-include='.test-build/src/operations/**' --test-coverage-include='.test-build/scripts/admin-command.js' --test-coverage-lines=80 --test-coverage-functions=80 --test-coverage-branches=80 .test-build/test/operations.test.js .test-build/test/asset-storage.test.js
```

T08 已接入受保护的简单管理页面；T12 已完成四类内容工作台、素材历史/固定引用与成套采用。T13-A/B 已完成 skill 库、五用途组合和制作来源；四领域本地 MCP 已实现；远程 MCP 与 3D/小游戏继续按 T14-C、T15–T17 推进。

## 本地功能页面（T08 已验收）

真实业务页面共用现有布局和临时功能样式：`/`、`/products/:slug`、`/redeem`、`/apps`、`/reports`、`/attempts/:id`、`/reports/:id`。商城筛选、排序与页码保存在 URL；匿名/账户列表用 `source=anonymous|account` 独立显示。答题只将服务端确认的答案计入进度，断网重试保留原请求 ID；统计暂不可用仍能继续。报告支持缺失分数、完整声明的 PNG 摘要导出和确认后永久删除。

`/admin`、`/admin/products`、`/admin/assets`、`/admin/orders` 接入真实 T07 API，支持商品资料与配置版本、发布/下架、四类素材、文件校验/预览/封面采用、CSV 预演/导入、首次交付/补发/退款和审计概览。代码/文件/报告权限由服务器复核；退出或切换身份会取消并清除私密查询，通知其他打开的标签页。

T06-O 已接入真实本机 Auth，可按 [AUTH-SETUP.md](../../../../AUTH-SETUP.md) 登录基础后台。下面的 T08 业务回归仍在隔离 Nest 测试进程替换外部身份事实；新增 `pnpm test:e2e:local-auth` 则使用实际注册用户、Mailpit 和现有开发服务，二者分别记录证据。没有交付测试登录后门。

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

`pnpm delivery:manage` 提供 order/issue/replace/refund，使用同样的本地 owner＋ADMIN 权限；订单为手工测试记录，不代表平台核单/资金退款。完整兑换码只在首次写入的独占 0600 文件中交付，stdout/日志/数据库无明文；同 request-id 重放只有回执。补发承接原权益、次数、报告与绑定，退款同步撤权并剔除统计贡献。命令、返回字段及异常规则见 [接口说明](../../../../API-CONTRACTS.md)。

`.env.example` 包含来源、签名密钥、会话期限和限流设置，Compose 也会透传。生产要求 HTTPS APP_PUBLIC_ORIGIN 和稳定随机 CSRF_SIGNING_KEY；HTTPS Cookie 使用 Secure 和 __Host- 前缀。默认不信任转发 IP，TRUST_PROXY_CIDRS 按实际可信代理配置；正式代理拓扑与公网链路在 T09 验证。私人响应统一 no-store。

## 动态答题、报告与清理预演

T05 提供 attempts 创建/题目读取、逐题保存、已答题反馈、提交，以及 reports 读取/删除。每个有效权益只对应一份锁定版本答卷，保存采用整体修订号，报告完成才原子消费一次；重复提交返回同报告。统计排除自己的回答/结论，分别使用其他有效回答与完成答卷的分母。详细请求、评分规则、故障/重试与 T08 状态交接见 [接口说明](../../../../API-CONTRACTS.md)。

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

`.env.example` 分隔运行与认证配置，示例中的 `SUPABASE_*`、`VITE_SUPABASE_*` 默认留空。本机 `pnpm auth:setup` 配置真实 Auth，`pnpm auth:disable` 可撤回其管理字段；停用时认证页如实提示未配置，匿名兑换独立可用。按 [账户配置](../../../../AUTH-SETUP.md) 区分本机服务与后续云端 Supabase/Resend。浏览器只能使用公开的 `VITE_` 配置，数据库密码、服务端加密密钥及 service role 不得使用此前缀；不用在聊天中粘贴凭据。

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

每次按 ROADMAP 处理一个明确批次并验证。O3指定正式UI已获批准，O4先核查/设计，到新的O4-A设计审核停下；不提前实现配置表/API或正式页面。W6 模型比较与 W3 内容制作继续暂停，历史批准和调用前停止记录保持；真实权限/客户端/真机、未来 UI 与云服务独立审核。未创建 Goal、自动化或云资源；证据见 [PROGRESS.md](PROGRESS-through-20261026.md)。
