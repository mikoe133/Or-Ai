# T09 云端接入准备与待确认方案

## 2026-10-26：改用香港 VPS，基础初始化已验证

用户已自行购买香港 4 核/4GB、5Mbps VPS，选择 Ubuntu 24.04；当前网站与 NestJS API 托管目标改为该服务器，原 Workers Paid＋Containers 为历史备选，不再作为必购项。Supabase Free、R2 Standard、Resend Free 的职责保留。用户随后更正：三个服务均已配置，相关连接信息保存在根目录 `.env.memo`；以此更正为准，不再要求重新开通。后文 2026-10-23 的本地准备和原方案费用保留为历史记录。

### 同日补充：现有云配置已完成只读检查

`.env.memo` 已确认受 Git 忽略保护，并收紧为 0600；仅解析 dotenv，不执行其中内容、不合并开发 `.env`，报告只记录字段状态和固定检查结果，不包含凭据。

- Supabase 前后端 Origin/公开密钥一致，Auth settings 与 JWKS 均返回 200，邮箱认证开启、存在 1 个公开签名键。当前认证集成不需要额外 secret key。
- Session Pooler 使用 5432。初次严格 TLS 检查发现缺少 Supabase CA；从其公开证书下载地址取得证书，与此前本地 CA 的 SHA-256 指纹一致，通过进程级 `NODE_EXTRA_CA_CERTS` 补入后，保持证书与主机名验证，实际登录及只读事务通过。`pg_stat_ssl` 显示 TLS 开启；未读取业务记录或写库。
- 当前连接使用 postgres 管理身份，云库尚无 `orai` schema/业务表，public 表数为 0；受限运行/迁移角色和正式 schema 初始化仍需实现，不能直接把该管理连接注入应用。
- R2 使用现有 S3 凭据完成 `ListObjectsV2(max-keys=1)`，返回 200；只验证桶列举权限，未读取对象内容、上传或删除对象，不能据此认定完整读写验收已过。
- Resend SMTP 的 TLS 与 AUTH 认证成功（235），未发送邮件；实际发信域、收信和 Supabase 验证/找回流程仍需端到端验收。
- VPS 上另外验证了数据库 TLS 1.3/证书/主机名、Auth settings、R2 HTTPS 路由及 SMTP TLS。该轮仅传递公开端点、公开 Auth key 和公共 CA，不向服务器传递数据库密码、R2 secret 或 SMTP 密码；数据库登录和 R2 权限的凭据检查在本机执行，两种证据分别记录。

脱敏结果在 `.local/vps/provider-preflight.json` 与 `.local/vps/server-provider-network.json`。云资源已经存在；应用的 R2 适配、VPS 入口和数据库初始化仍是代码/部署工作，不因凭据可用而关闭 T09 验收。

- 实际 SSH 检查确认 Ubuntu 24.04.1 LTS、x86_64、4 个逻辑 CPU、约 3.8GiB 内存；30GB 系统盘和已挂载在 `/www1` 的 20GB 数据盘。未格式化磁盘。
- 专用 SSH 公钥登录成功，后续连接严格校验已记录的主机指纹，不转发本机 agent。现有密码登录保留；systemd 服务定义已重新加载，SSH 服务正常。连接资料仅保存在 Git 忽略的 `.local/vps/`，不包含密码或私钥内容。
- UFW 已启用：默认拒绝入站、允许出站，22/tcp 限速，80/443/tcp 放行，含 IPv6；启用后已通过新 SSH 连接复核。Docker 后续应用只允许入口服务发布端口，不能以 UFW 规则替代容器端口隔离。
- Docker 官方 APT 源签名密钥指纹核对通过；Docker Engine 29.9.2、Compose v5.6.1 已安装。普通容器和 Compose 冒烟均通过；Compose 使用固定镜像摘要、无网络、只读文件系统、移除 capabilities、禁止提权、32MiB 内存和 16 PID 上限。Docker 已启用开机启动，日志使用 local 驱动、每容器单文件 10MB、最多 3 份。
- `/www1/orai/releases`、`shared`、`secrets`、`backups` 已创建，secrets/backups 权限 0700；备份目录存在不代表已有备份或完成恢复演练。
- 本机至服务器 4 次 ICMP 实测平均约 13ms、无丢包；服务器访问 Supabase/Resend 官网返回 200。仅为当前网络样本，不是国内三网、真实数据库、R2 或认证/邮件链路验收。
- 容器默认 bridge 网络出站 HTTPS 另经固定摘要的 Alpine 镜像实测通过，容器使用非 root、只读、无额外 capabilities 和资源限制；测试完成后没有运行中的容器。
- 初始系统自动更新下载大型固件包占锁，等待当前下载完成后通过程序支持的 SIGTERM 正常退出，未删除锁或强制终止 dpkg。首次恢复任务使用了该工具不支持的 `-o` 参数，后续日志复核发现退出码 2；已移除错误参数，通过 `/etc/apt/apt.conf.d/99-orai-no-auto-reboot` 明确禁止自动重启，并重新启动 `orai-initial-security-updates.service`。已通过新日志及实际 updater 进程核对 running，SSH/Docker 正常；两个系统更新 timer 保持 enabled。安全补丁完成和可能需要的重启仍需另核实。

本批未上传或运行业务应用、创建外部项目/桶/邮件账户、修改 DNS 或发布站点。仍需实现 VPS 同域入口、R2 适配、云数据库初始化，再完成真实认证/邮件、持久化、备份恢复和公网业务验收；T09.1–.8、T06-C 不因此关闭。详细基础状态见 `.local/vps/initialization.json`。

后续本地复核已完成：真实云条件未齐时仍补齐了T10.6限速/空缓存5情境、T09.5提供者无关字节预算11项及T09.8本地恢复7项，见[独立项结果](LOCAL-VALIDATION-FOLLOWUP.md)。入口额度/封装参数保持空值，原100MiB契约未改；T14.C1–C3依据任务明文仍待T09云前置。本段更新当前行动，不改写首批已封存的13项/镜像证据。

2026-10-23。T10-L本地正式界面已通过，见[T10-L结果](T10-LOCAL-UI.md)。本批只完成云端接入前的本地准备，没有创建云资源、配置真实凭据、修改DNS/客户端、开通付费、推送镜像或部署。T09.1–.8与T06-C仍未通过；不能据配置齐备或镜像可启动认定平台已上线。

## 已完成的本地准备

| 项目 | 文件/结果 |
| --- | --- |
| 生产配置清单 | [占位样例](../../.env.production.example)，原本机`.env`保留。运行容器、迁移执行器和前端构建的变量分别标注，完整清单不能直接全量注入容器 |
| 离线预检 | [CLI](../../scripts/cloud-preflight.mjs)复用API实际`loadConfiguration`；不连接云/数据库、不合并当前环境与本机`.env`，只输出固定错误码和字段名 |
| 配置检查 | 13项通过：HTTPS/域名与Auth项目/公钥一致、TLS、Session Pooler端口/目标、受限运行与迁移身份分离、独立稳定密钥、禁止额外`VITE_*`及生产本地存储、错误/路径不泄漏秘密 |
| Linux镜像 | [Dockerfile](../../apps/api/Dockerfile)使用原生CPU生成JavaScript/WASM，输出linux/amd64运行镜像，避免ARM本机模拟amd64时Prisma生成器崩溃；清理pnpm保留的仅供迁移使用的schema-engine二进制 |
| 容器隔离检查 | [检查脚本](../../scripts/cloud-container-smoke.mjs)：只用已构建镜像，无网络/端口映射/挂载/真实凭据，根文件系统只读，UID1000；验证不携带原生依赖、开发工具或秘密，liveness200且不可连接数据库时readiness503。最终实测通过：linux/x64、UID1000、原生依赖二进制0，liveness200、readiness503。内存限制1GiB、峰值约654MiB、oom_kill0，含模拟器与检查父进程开销，不作为真实云容量基准 |
| CI | [.github/workflows/ci.yml](../../.github/workflows/ci.yml)加入13项离线配置检查与隔离镜像检查；本地已执行对应命令，尚未推送触发远程CI |

本批证据在`.local/cloud-readiness/`。T10与O4原工程/批准证据独立冻结，不为部署准备改写历史结论。镜像验证使用本机ARM宿主上的amd64模拟运行，不是真实Cloudflare容器/网络/数据库验收。初始512MiB检查中应用进程被SIGKILL，不能宣称512MiB可用；改用已列入方案的1GiB限制后实测通过。失败日志留存，没有通过修改业务接口跳过readiness检查。

运行方式（先使用项目固定Node/pnpm）：

```sh
pnpm test:cloud-readiness
pnpm cloud:preflight --env-file .env.production.example
pnpm docker:build:cloud
node scripts/cloud-container-smoke.mjs
```

样例仍有占位值，预检应返回exit1；真实格式全部有效也只返回exit2并列出代码/云验证缺口，`deployable`始终为false。不要使用开发`.env`代替生产清单；秘密只填在被忽略的副本或厂商Secret管理中，不发到聊天或Git。离线检查不验证真实角色权限、密码、域名所有权、网络连通或额度，也不替代生产变更审批。

## 核对出的实际缺口

1. **同域入口尚无实现。** 仓库没有Worker入口、wrangler配置或Cloudflare容器绑定；API Dockerfile不能自行提供`meetmyworld.com/api/*`和Static Assets路由。待确认托管目标后新增对应实现，保留Cookie/认证头/流式请求/Range/状态码，私密响应禁止公共缓存，`www`保留路径/query转向主域。
2. **生产持久化存储尚无实现。** `configuration.ts`仅允许`local|disabled`且生产拒绝local；`OperationsModule`固定绑定`LocalAssetStorage`，`FilesService.prepare`也只允许local。`AssetStorage.read`返回Node `FileHandle`，图片/视频几何与原件检查依赖随机读，不能只改一行环境变量就接R2。需要独立对象存储读写适配、限额内临时检验/Range读取、上传完整性与失败回收，并保留授权下载、撤权和历史引用。
3. **生产数据库初始化需独立执行器。** 当前运行镜像没有Prisma CLI、SQL迁移目录或维护脚本，启动不自动迁移；本地`db:provision`严格拒绝云目标。需为实际项目准备受控一次性迁移与角色/schema/PRODUCTION标记初始化，保留不可变表与列级权限，核实Session Pooler、证书链和总连接数，不能删掉本地拒绝规则绕过。
4. **认证、邮件与真实设备未验。** Supabase Site URL/回调、Resend发信域DNS、目标邮箱/找回/刷新、第二设备/管理员/退款撤权仍须真实环境验证；Mailpit和本机协议替身不能关闭T06-C。T14-C的远程协议/授权/发现另验，本地stdio仍按原范围可用。
5. **上传入口与应用上限必须一起调整。** 当前视频与项目原件可到100MiB（104,857,600字节）；Cloudflare文档列出Free/Pro站点请求体100MB限制，Workers Paid本身不等于站点Pro/Business或更大的入口上限。真实接入前选定实际限制并以字节实测；建议首期受控代理上传上限设为90,000,000字节并补服务端/契约/SDK边界测试，或另做经授权的直传/分片方案。此为待实施建议，本批没有悄改现有上传契约。
6. **备份与回滚尚无云端演练。** 不能只备数据库而漏原件/skill附件。备份清单须固定对象key/长度/SHA与对应不可变引用，隔离恢复后核对文件可读与历史报告，保留上一镜像/静态资源和兼容迁移记录。

## 建议接入的具体资源

沿用[T09现有默认规划](tasks/T09-cloud-validation.md)，不是本批新开通或默认获批：

| 资源 | 用途与首期建议 | 需要确认 |
| --- | --- | --- |
| 已购Cloudflare Zone | 主域`meetmyworld.com`、`/admin`、`/api/*`、www重定向 | 实际可管理Zone，允许改动的DNS范围与测试子域；先预发布 |
| Workers Paid＋Containers | 静态前端/同域路由＋Nest API；先限制最多1个实例、运行池5、闲时休眠，再按实测调整 | 是否选择该托管方案与付费预算；实例可从basic（1GiB/1⁄4vCPU）开始评估，不预先声称容量足够。容器位置由厂商调度，不承诺固定在数据库同区 |
| Supabase | 独立预发布/生产项目、PostgreSQL＋Auth；数据库区域优先评估新加坡 | 实际项目与区域、免费预发布/生产套餐及恢复要求，受限运行/迁移身份；不复用真实生产数据作测试 |
| R2 Standard私有桶 | 保存已审核商品原件/运行素材与对应skill附件，数据库保存固定引用 | 实际桶/权限/地域约束与保留策略；首期私有授权读取，公开封面只提供经过筛选的公开副本 |
| Resend | Supabase自定义SMTP，验证/找回邮件 | 发信域/发件人、DNS记录及真实测试收件地址；先Free额度评估 |

同一商品/版本的公共视频、封面等被多个用户引用；用户增长主要增加访问与个人答卷/报告，不为每个用户复制一份相同大视频。制作中的大中间文件继续留本地，平台按已有审核留存规则保存应交付的原件及精确skill版本；不能为节省成本删除已审核历史引用。将来清理只处理无引用且满足保留期的文件，并先预演。

建议的受控顺序为：确认上述方案/区域/预算与管理范围 → 完成Worker/R2/云初始化执行器的代码和隔离验证 → 批准后创建预发布资源与受限Secrets → 临时地址验证 → DNS/HTTPS/真实Auth邮件与完整业务流 → 媒体重启/备份恢复/费用与冷启动 → T14-C（启用时）→ T10-V真机/网络 → 再单独批准生产发布。用户取消了UI逐页停审，真实云服务/费用/持续权限和发布仍按既有约定独立确认。

## 费用依据与预算边界

以下官方资料于2026-10-23（Asia/Shanghai）只读核对，缓存时间/SHA位于本批`.local`证据。价格为美元，未包含汇率/税费、域名续费及其他工具，不能视为总账单或预算授权。

| 服务 | 当前官方口径 | 对方案的影响 |
| --- | --- | --- |
| [Workers](https://developers.cloudflare.com/workers/platform/pricing/) | Paid最低$5/月 | Containers必须使用Paid，另计超出额度的请求/资源等 |
| [Containers](https://developers.cloudflare.com/containers/pricing/) | 包含25GiB-hours内存、375vCPU-min、200GB-hours磁盘；超额内存$0.0000025/GiB-second、CPU$0.000020/vCPU-second、磁盘$0.00000007/GB-second | 按运行/资源用量收费，还有Worker/相关调度与网络费用；“$5起”不能当全部托管费用上限 |
| [R2 Standard](https://developers.cloudflare.com/r2/pricing/) | 每月免费10GB-month、Class A 100万、B 1000万；超额$0.015/GB-month、A $4.50/百万、B $0.36/百万，互联网出站免费 | 仅看存储且未超请求额度，100GB约$1.35/月；500GB约$7.35/月。实际按计费单位取整与操作数计费，不能承诺总费用固定 |
| [Supabase](https://supabase.com/pricing) | Free $0、数据库500MB；Pro首项目$25/月，额外项目从$10 | Free可评估隔离预发布；生产套餐取决于可用性/恢复需求，不把数据库价格当媒体存储容量 |
| [Resend](https://resend.com/pricing) | Free每月3000封且每日100封；Pro $20/月起 | 小规模验证可先Free，实际发信/额度/域验证仍要核对 |

因此“Workers Paid＋Supabase Free＋Resend Free”只意味着已知固定项从$5/月起，**不是全平台$5封顶**。若选Supabase Pro，已知固定项至少约$30/月，仍另计用量与额外项目。建议先由用户明确美元月预算/告警阈值；告警不是硬费用封顶，实例数、连接数、上传大小/并发、保留期与暂停触发规则需要实际实现并验证，不能假称厂商会自动替用户截断所有费用。

上传与容器平台依据：[Workers请求限制](https://developers.cloudflare.com/workers/platform/limits/)、[容器规格](https://developers.cloudflare.com/containers/platform/limits/)、[容器调度/临时磁盘FAQ](https://developers.cloudflare.com/containers/faq/)。国内体验仍需实测，不据“全球CDN”宣称国内三网稳定。
