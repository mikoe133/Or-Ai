# VPS 应用适配、维护与恢复

2026-10-28。Task07 的代码/本地隔离操作说明；真实域名、云数据库、R2、邮件、容量及恢复由 Task08/10 实验记录关闭。沿用现有香港 VPS、Cloudflare、Supabase、R2 和 Resend，不重新开通资源。本文件不包含真实连接信息。

## 配置与部署包

- [compose.production.yml](../../compose.production.yml) 运行 web/API 两个容器。仅 web 发布 80/443；API 没有宿主端口。入口使用 [vps-routing.mjs](../../scripts/vps-routing.mjs) 生成的配置，提供 SPA 和 `/api/*` 同域 HTTPS、www 重定向、Cookie/CSRF/Authorization、错误及 Range 转发。未知主机拒绝。
- 使用 [生产配置样例](../../.env.production.example) 的受保护副本作为离线清单。[vps-env.mjs](../../scripts/vps-env.mjs) 分别导出 API 运行配置和三项公开前端构建配置，输出新建且 0600，不覆盖已有文件。迁移/管理身份不进入 API，R2/数据库/SMTP 秘密不进入前端。Compose 用 `format: raw` 保留密码中的 `$`。
- API 的固定代理信任是 `172.30.84.2/32`。Nginx 覆盖来访转发头，不信任任意客户端 IP 声明。Task08 必须实测 Cloudflare 代理模式、真实来源 IP 和限流；不能在验证前把所有请求的代理 IP 当作独立消费者 IP。
- 前端镜像是 [Dockerfile.frontend](../../infra/vps/Dockerfile.frontend)；构建复用实际浏览器 Auth 配置解析器，只接受三个公开 VITE 输入。API 的 `runtime` 镜像保持原应用启动，不迁移/seed。
- 镜像以精确标签和摘要记录在发布目录，保留上一套前端/API/入口配置。镜像构建无需云秘密，配置、TLS 私钥及公共数据库 CA 分别挂载。不要把整份离线清单作为运行 `env_file`。

离线准备命令使用绝对输入/输出路径；以下路径均为示意，不是现有真实凭据：

```sh
node scripts/cloud-preflight.mjs --env-file /absolute/private/inventory.env
node scripts/vps-env.mjs --env-file /absolute/private/inventory.env --api-out /absolute/private/api.env --web-out /absolute/private/web.env
node scripts/vps-routing.mjs --env-file /absolute/private/inventory.env --out /absolute/release/nginx.conf
node scripts/upload-budget.mjs --env-file /absolute/private/inventory.env
node scripts/docker.mjs build --platform linux/amd64 --target runtime -f apps/api/Dockerfile -t orai-api:reviewed .
node scripts/docker.mjs build --platform linux/amd64 --target maintenance -f apps/api/Dockerfile -t orai-maintenance:reviewed .
```

离线预检的 `deployable` 仍为 false，配置有效也不能代替真实验收。真实 Compose 的环境需指定已验证镜像、API env 路径、Nginx 配置、TLS 目录、数据库公共 CA 文件；路径存在性/权限和真实预发布隔离在 Task08 核对。

## 独立数据库维护

维护工具读取 [maintenance.env.example](../../infra/vps/maintenance.env.example) 对应的独立 0600 普通文件，不合并进程环境、开发 `.env` 或 `.env.memo`。必须固定现有 projectRef、5432 Session Pooler/直连主机、数据库、公共 CA 摘要，以及三个不同的管理/迁移/运行密码。真实凭据只从已授权的受保护配置提供，不写入参数、文档或 Git。

```sh
pnpm db:cloud -- preview --config-file /absolute/private/maintenance.env --mode bootstrap --out /absolute/private/bootstrap-plan.json
pnpm db:cloud -- apply --config-file /absolute/private/maintenance.env --file /absolute/private/bootstrap-plan.json --confirm-target REVIEWED_PLAN_FINGERPRINT --out /absolute/private/bootstrap-attempt-001.jsonl
```

`--config-file` 与直接 Node 使用的 `--env-file` 意义相同；pnpm 独立可执行版会抢先解释 Node 同名参数，包命令统一用前者。两者同时指定会拒绝。所有计划/回执都新建，旧输出不覆盖；apply 明确确认计划中的目标摘要不是交互式批准记录。

1. preview 不连接数据库，固定目标、CA 和全部迁移的名称/字节 SHA-256。apply 重新核对计划和确认摘要，先 fsync `started` 回执再建立连接。
2. bootstrap 管理连接检查数据库身份、环境标记、角色、未知表/视图/序列/函数和迁移历史；创建缺少的 `orai_owner`/`orai_app`。已有角色密码不重置，角色不得有 superuser/createdb/createrole/bypassrls/继承或外部成员身份。
3. 迁移账号只有自己的维护凭据，获得当前数据库 CONNECT/CREATE 及 `orai` schema 所有权。数据库 CREATE 是原首份迁移中 `CREATE SCHEMA IF NOT EXISTS` 的实际要求，不等于 CREATEDB 系统权限；运行账号没有数据库/schema CREATE。PostgreSQL17 的非超级用户管理身份创建角色后，需明确得到对自己所创建 `orai_owner` 的 SET 权限，INHERIT 保持 false；schema 去除 PUBLIC 权限时只在该事务 SET LOCAL ROLE。后续私有 schema/迁移历史检查使用独立 owner 连接，不要求提供者管理身份继承业务 schema。隔离测试已覆盖 CREATEROLE、数据库所有者、非超级用户的管理身份；真实 Supabase 角色/Pooler 兼容仍由08确认。
4. 原 29 份迁移由官方 Prisma 7.10.0 `migrate deploy` 执行，保留各迁移自己的事务和官方迁移历史。CA 摘要验证后复制到工具自己的 0700 临时目录；Node pg 和 Prisma 迁移子进程均保持证书/主机名检查。退出删除本进程的 CA 临时文件。
5. 重用本地 provision 的同一份精确表/列权限，写 PRODUCTION 标记；不 seed、不创建业务管理员，不修改 Auth/public schema。管理权限不提供给应用。
6. 同一完整 bootstrap 重试只验证，不改历史/权限；初始化在迁移前或迁移后、授权前中断时，只有历史确认为完成的连续前缀且无未标记业务数据，精确重试才可继续。失败/不匹配迁移历史必须人工复核，工具不伪造 finished/rolled_back 记录。
7. 现有生产库升级或明确恢复运行权限，另生成 `--mode migrate` 计划并再次确认新摘要。全部迁移已完成时官方命令是无迁移操作，随后只重用精确授权；bootstrap 不会悄悄修复异常权限。失败的原迁移记录仍会拒绝，不能用 migrate 绕过。
8. 回执按阶段追加 `roles_ready`、`migrations_applied`、`runtime_verified`、`completed`；失败写固定码。完成后若清理失败追加 `cleanup_failed` 并返回固定清理错误，先检查回执和目标，不能因返回错误就当作业务操作未发生。

维护镜像单独运行、非 root、只读根文件系统，只给 `/tmp` 和新回执输出目录可写容量；不加入生产 API 的自动重启服务。真实维护只挂载所需 env/CA/计划/新回执目录，任务结束移除临时容器；不为方便而长期保留管理连接权限。原本地维护工具继续严格拒绝远程目标。

## 上传、临时盘与资源预算

| 环节 | 本地已实现的配置/边界 |
| --- | --- |
| 请求体 | 例值 90,000,000 字节，原始二进制 PUT 的 body envelope 为 0；不是 90MiB。有效文件上限取用途、契约、`ingress - envelope` 的最小值 |
| 超时 | 例值入口/API/R2 360,000ms；本地 MCP 通过 `ORAI_MCP_UPLOAD_TIMEOUT_MS=360000` 配置，缺省仍120,000ms，合法范围1,000–600,000ms；仍只接受 loopback HTTP |
| API | 1实例，2CPU、1536MiB、256 PID、Node heap768MiB，连接池5，非root、只读、禁提权 |
| R2检验临时盘 | 进程内总256MiB/2文件；容器 `/tmp` 320MiB，超限明确拒绝。此额度是单进程额度，不是多实例全局额度 |
| web | 0.5CPU、128MiB、64 PID、16MiB临时盘，非root、只读 |
| 日志 | 每容器10MB×3，URL查询串、凭据与厂商响应体不写入口访问日志 |

5Mbps 带宽传90MB单程理论下限约144秒，真实上传还包括客户端网络、检验和 VPS→R2；360秒只是有界配置，不是完成时间保证。Task08 要验证实际 Cloudflare/反代超时、入口字节边界、并发及 5Mbps 往返路径，必要时降低首次交付大小。直传/分片属于后续另行实现，当前没有开放。

上传在有限私有临时盘完整检验后通过条件创建写 R2，不覆盖同 key。读取固定 HEAD/ETag，验证长度及完整 SHA，再交给原来的类型、几何、原件和 Range 检查。下载中断和失败释放临时句柄/容量；对象桶仍私有，链接和撤权继续通过 API。前端/API容器重建不应影响云DB或对象；tmpfs 会丢失，不能用来保留成品。

## 备份清单与隔离恢复

备份必须同时包含同一数据库快照与该快照引用的固定对象。仅有 `backups/` 目录、R2 桶可列举、或 pg_dump 成功都不代表可恢复。

1. 在已授权的维护窗口停止新增写入、上传完成与清理，记录应用/镜像/迁移摘要。开启 REPEATABLE READ READ ONLY 事务并导出 snapshot；`pg_dump --format=custom --schema=orai --no-owner --no-acl --snapshot=...` 与对象清单读取同一 snapshot。使用与目标兼容的 PostgreSQL 客户端，不转储/覆盖厂商 Auth/public schema。
2. 执行 [backup-objects.sql](../../infra/vps/backup-objects.sql)，记录三类表的固定ID、scope、状态、key、长度、SHA、MIME。不能只备媒体而漏 Skill 参考和商品原件。清单包含各状态：AVAILABLE 必须完整备份；UPLOADED/PENDING 等逐项记录存在/缺失和恢复处理，不能把缺对象当作已校验。
3. 对每个存在的对象固定 HEAD/ETag 后复制到独立备份位置，以流式 SHA-256 和长度核对。清单补录 source ETag、目标 key/版本、实际长度/摘要、验证时间、snapshot ID、数据库 dump SHA/字节、清单自身 SHA、应用镜像和全部迁移摘要。临时文件/不明孤儿对象只盘点，不在备份过程中清理。
4. 数据库及媒体备份均私有，备份日志不含凭据或报告正文。至少保留上一份验证过的恢复点；保留周期、RPO/RTO、容量和月预算在 Task08 按实际资源固定，不能用默认值宣称已满足。Supabase Auth 的提供者备份/恢复是另一项真实服务配置，应用 `orai` dump 不包含它。
5. 恢复到新的隔离数据库和新的私有桶/前缀，先校验 dump/清单/每个必需对象。保留原环境；先比较原始表/固定版本/摘要与对象字节，缺失、同长度损坏或变更 ETag 均拒绝接受恢复。原件作为文件检查，不执行上传的 HTML/JS。
6. 若恢复目标数据库名变化，完成原始恢复摘要核对后，只在已复核的新目标显式重绑 environment_marker.database_name，记录前后值；工具不会代改。以新目标、固定CA、原始迁移及独立凭据生成 migrate 计划，重施运行权限并验证身份。不可变业务引用、历史记录和原环境标记不改写。
7. 在隔离入口走已有报告读取、Skill附件/原件、授权下载、Range、第二身份拒绝和撤权检查，再记录恢复耗时、对象数、表/行摘要、业务结果。未实际恢复和实际读文件时保持 Task08 待验。

本地已存在的 [恢复证明](../../apps/api/test/local-restore-proof.mjs) 验证三类文件、同一快照、每表摘要、缺失/损坏拒绝、独立 TEST 恢复与权限重施。当前 R2/维护协议证明仅说明适配可运行，不能替代真实 R2 复制、云 Auth 备份或云权限验收。

## 观察、重启和回滚

- 本轮本机Colima仍为原2GB内存/12GB虚拟盘，没有扩容或改系统设置。首次完整测试与构建重叠时出现SQLSTATE53100/No space left，恢复后完整测试通过；随后维护镜像构建另触发业务库和本地Auth库的OOMKilled/137，这是独立的内存事件。两次分别留证，原卷未删除/重建，业务库恢复后73表1521行、29迁移及3参考文件摘要一致，Auth容器恢复healthy且本地health200。Auth库事前未留每表摘要，不据健康检查声称已做全量字节比对。
- 不在该小型profile再次叠加构建与业务/测试负载。本轮已验证镜像导出到工作盘、核对归档摘要后移除对应本轮标签/可重建缓存；以后构建需先核实磁盘与内存峰值预算或使用既有独立构建环境，不以清空数据库卷、全盘prune、扩大系统资源或修改全局设置解围。最终维护镜像证明使用768MiB/1CPU和256MiB隔离TLS数据库，在实测余量满足后执行，原业务/Auth容器保持。
- 使用容器 health/readiness、`docker compose ps`、`docker stats --no-stream`、有界错误日志、宿主 `df -B1` 和数据库实际连接数观察。入口日志去除 query；真实服务告警目标由 Task08 固定，不额外创建监控服务或发送通知。
- 首轮观察阈值建议：宿主/临时盘使用80%、容器内存75%、CPU持续80%、实际数据库连接/存储额度80%，以及 readiness失败、5xx、413、上传超时、校验失败、R2请求错误持续增加。记录窗口和基线后调整；阈值是告警建议，当前没有声称已装好监控或硬费用封顶。
- 费用分别看 VPS续费/带宽、R2容量与Class A/B、Supabase数据库/出站/连接、Resend发送额度。每日制作预算和生成模型比较仍由13–15持有。未知额度/费用先保持真实作业未启用，不通过自动扩容或创建付费资源解围。
- Docker 已有开机启动，Compose `restart: unless-stopped`。Task08 必须验证容器重建、宿主重启、生产配置/TLS权限、持久对象/DB可读和仍受限的端口；2026-10-26安全更新与可能重启状态也仍需真实服务器核对。
- 应用回滚：停止新写入，使用上一个已验证的 API/前端/入口配置组合；先检查当前 schema 与旧代码兼容，保留新对象、原件、回执及历史版本。数据库迁移向前修复；不改旧SQL、倒写迁移历史或在原库 reset。需要数据恢复时使用已验恢复点到新目标，验证后再受控切换。
- 生产启动、部署失败与容器重启均不 seed，不运行自动迁移。关闭远程入口/回滚应用不撤销既有合法权益，也不删除历史对象。

参考：[Prisma7升级与TLS](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)、[Prisma PostgreSQL SSL参数](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)、[Prisma数据库SSL排查](https://www.prisma.io/postgres/ssl-connection-error)。当前代码用已固定版本的官方CLI和真实隔离TLS实测，不根据文档示例关闭证书检查。
