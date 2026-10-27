# 07 · 实现云端路由、持久存储与初始化适配

任务标识：T09-I。状态：方案已定，可独立实施。队列：主线。更新：2026-10-27。

## 目标与现状

沿用 [CLOUD-READINESS 的 2026-10-26 最新记录](../../CLOUD-READINESS.md)：用户已购买香港 4核/4GB、5Mbps VPS，选择 Ubuntu 24.04；Supabase、R2、Resend 已配置并完成基础连通/凭据检查。VPS 的 SSH、防火墙、Docker/Compose 和目录初始化已有证据。当前主方案为 VPS 托管前端与 NestJS API，Workers Paid＋Containers 仅保留为历史备选，不再重复选型或要求开通。

生产配置、镜像、上传字节预算与本地恢复准备已完成；仍需实现 VPS 同域入口、R2 持久存储适配和受控云数据库初始化执行器。云数据库尚无业务 schema，现有管理连接不能直接交给应用；资源可访问不代表应用已部署或真实业务已验收。

| 平台/服务 | 当前职责 | 本任务与后续验收 |
| --- | --- | --- |
| Cloudflare 与 meetmyworld.com | 域名、DNS、按实际配置使用的代理/缓存与 HTTPS 入口 | 本任务准备路由配置；任务08验证预发布 DNS/HTTPS/回调 |
| 已购香港 VPS | 静态前端、运营后台、NestJS API 与反向代理 | 本任务实现容器/入口/回滚配置；任务08部署验证 |
| Supabase PostgreSQL＋Auth | 业务数据、固定版本和账户认证 | 本任务准备受限角色与一次性初始化；任务08验真实登录/权限/恢复 |
| R2 Standard 私有桶 | 商品交付文件、媒体、Skill 附件及固定历史引用 | 本任务实现存储适配；任务08验真实读写、撤权与备份恢复 |
| Resend SMTP | Supabase 验证与密码找回邮件 | 任务08验发信域、回调与真实收信 |

制作中的大中间文件继续留本地；云端按既有审核/交付规则保存成品、必需原件和精确版本。同一商品版本的封面/视频共享引用，不因新增用户复制一份相同大文件；不以节省容量为由删除已有历史引用。

## 前置与执行位置

硬前置：既有本地平台与部署准备已通过，VPS＋Supabase＋R2＋Resend 方案已确定；实施时核对实际项目/区域/限额与配置，不重新开通已有资源。新 Three.js 发布门禁不是云适配代码的技术前置。
推荐排期在 [06 完成 Three.js 商品本地业务与性能验收](06-local-experience-acceptance.md) 之后；这是排期建议，不增加技术硬依赖。

原编号覆盖：`T09.1`、`T09.2`、`T09.3`、`T09.5`、`T09.6`、`T09.7`、`T09.8`；范围拆分见[编号映射](../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/CLOUD-READINESS.md](../../../../prd/v1/CLOUD-READINESS.md)
- [prd/v1/LOCAL-VALIDATION-FOLLOWUP.md](../../../../prd/v1/LOCAL-VALIDATION-FOLLOWUP.md)
- [apps/api/src/operations/asset-storage.ts](../../../../apps/api/src/operations/asset-storage.ts)
- [apps/api/src/operations/files.service.ts](../../../../apps/api/src/operations/files.service.ts)
- [apps/api/src/operations/operations.module.ts](../../../../apps/api/src/operations/operations.module.ts)
- [apps/api/scripts/local-database.ts](../../../../apps/api/scripts/local-database.ts)
- [apps/api/Dockerfile](../../../../apps/api/Dockerfile)

## 实施步骤

- [ ] T09-I.1 基于已购 VPS 和已有 Supabase/R2/Resend 固定部署清单，核对数据库区域、受限身份、存储接口、DNS 管理范围与额度；凭据从已有受保护配置独立注入，不执行配置文件、不合并开发环境、不重复创建资源。
- [ ] T09-I.2 实现 VPS 反向代理与容器配置，覆盖 /api/* 同域路由、静态前端、www 重定向、健康检查、Cookie/认证头、流式/Range/错误转发及私密缓存策略；对接 Cloudflare 时按实际代理与 TLS 配置验证。
- [ ] T09-I.3 实现 R2 持久 AssetStorage 与有限临时检验/随机读/Range 适配，覆盖图片、视频、Skill 附件和商品原件；完整性、权限、失败回收与历史引用沿用现有规则。
- [ ] T09-I.4 把实际 Cloudflare 代理、VPS 反向代理、应用和 SDK 大小/并发额度按字节统一；启用有100MB限制的入口时解决现有100MiB冲突，同时考虑5Mbps带宽的上传超时，不把未配置预算视为有效限制。
- [ ] T09-I.5 准备独立的一次性迁移/角色权限/PRODUCTION 标记初始化和恢复工具；运行容器启动不自动迁移，不移除本地目标拒绝。
- [ ] T09-I.6 补 VPS 容器重启/开机恢复、CPU/内存/磁盘/带宽/数据库连接限制、错误和费用观测、备份对象清单/摘要、部署与回滚配置；核实已有初始化记录中的系统安全更新/重启状态，不把仅本地隔离验证记为已部署。

## 验证与证据

- 离线配置、真实协议替身/隔离对象存储、上传边界、完整性、Range、撤权和历史引用测试；模拟故障/重启/恢复。
- 构建厂商支持架构的镜像并用非 root/受限文件系统验证；现有本地服务和数据保持。
- 形成可审阅的部署清单、DNS/Secret名称、用量限制和回滚步骤，真实密钥不进入文档或 Git。

本任务的应用适配尚未开始；此前服务器初始化和服务基础检查按上述独立证据保留，以上实施步骤不是已有测试结果。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成条件

VPS 入口、R2 适配、云初始化代码与部署配置可审阅，本地隔离测试通过，才可关闭本任务07；真实云部署和业务验证仍由任务08/10持有，不能据此归档整个 T09。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

停云写入/新部署并使用已知镜像；持久数据与旧对象保留，数据库向前修复或按已验恢复方案操作。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

