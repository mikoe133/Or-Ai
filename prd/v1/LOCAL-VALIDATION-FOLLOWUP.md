# 既定任务的本地独立项补测

2026-10-23。真实托管方案、数据库区域和预算仍待用户决定；这不作为全部本地工作的前置。按T10.6 → T09.5可独立校验 → T14.C1依赖核对 → T09.8本地演练的顺序完成下述工作，每项验证后再进入下一项。原O4、T10-L与首批云准备工程记录保持封存；本批证据另存在`.local/local-continuation-20261023/`。没有云资源、真实凭据/客户端、日程、发布、内容生成或模型比较。

## T10.6：受控网络和空缓存

新增[独立浏览器脚本](../../apps/web/e2e/local-network.mjs)，5情境/5图通过，详情见[新证据](../../output/implementation/t10-network-20261023/README.md)。CDP延迟250ms、下行131072B/s、上行65536B/s；新context空Storage、清空/禁用HTTP缓存、禁用service worker，并记录实际请求/缓存来源/字节，缓存命中0。桌面与390px首访、离线首次导航后手动恢复、离线保存未写入及恢复后一次保存/慢速刷新回读均通过，pageerror/外部HTTP请求0。

首轮测试曾误认为离线发送了PUT；实际离线阻断了CSRF前置读取。最终明确断言离线PUT0/答案不变，重连PUT1/答案新增1、刷新读取一致。已发送PUT的同requestId重试沿用原T10-L证据，不拿未发出的请求冒充已传输重试。

这里只覆盖新浏览器JS上下文、空HTTP缓存、新本地TEST进程/Nest实例与临时生产构建preview；数据库已初始化、OS文件缓存未清空，不代表云容器/VM/数据库冷启动。公网、国内三网、真手机和内置浏览器继续未验收，整体T10.6/T10-V/M5不关闭。

## T09.5：入口字节预算一致性

新增[只读校验](../../scripts/upload-budget.mjs)和[空参数样例](../../.env.upload-budget.example)，11项边界检查通过。入口额度`UPLOAD_INGRESS_BODY_BYTES`与请求体封装余量`UPLOAD_REQUEST_ENVELOPE_BYTES`均未配置，样例实际输出`pending`/exit2；这些字段只由离线检查读取，不改变API或SDK运行行为。

校验从实际API配置加载器读取已有应用默认值/覆盖值，从公开Zod schema读取文件上限，从SDK读取200MiB传输上限，分别比较网页与MCP可达上限。图片默认10MiB、视频100MiB、项目原件100MiB、Skill附件5MiB保持；体验图片、HTML等更小用途限制仍由原服务负责，不被上界检查放宽。

验证精确相等/+1字节、100MB与100MiB相差4,857,600字节、实际封装余量、缺参数/非法值/安全整数溢出、API自定义上限与SDK收敛，以及错误不反射秘密。显式0只表示已知裸二进制请求无体封装；不能把未知封装默认为0。预算只针对HTTP请求体，不把HTTP头当体内字节。即使数值一致，`deploymentReady=false`、`actualIngressVerified=false`，不能代替真实入口或云验收。没有擅定90,000,000字节或修改用户契约/默认值，不从付费计算套餐推导站点上传额度。

## T14.C1：依赖原文和现有边界

[T14执行批次](tasks/T14-mcp-ingestion.md#执行批次)明确规定：

> T14-C：`.C1–C3` 仅在 T14-L 和 T09 对应云条件已验证后执行，核对当期官方远程传输/授权发现与真实客户端。

这是本轮未执行C1实现的直接依据，未静默修改依赖。当前[CLI](../../packages/mcp/src/cli.ts)只接`StdioServerTransport`，[SDK配置](../../packages/mcp/src/config.ts)只接受loopback HTTP API，[机器控制器](../../apps/api/src/operations/machine.controller.ts)是受限REST，不能作为已实现的Streamable HTTP或OAuth发现。仓库没有正式`/api/mcp/:domain`、受保护资源发现或远程授权接口。

本轮完成静态依赖/源码摘要核对，并复用原19项SDK传输、领域/权限、大小/hash、重定向、撤销和秘密边界证据；没有重复跑充分通过的19项，也没有新增伪远程服务、loopback HTTP协议替身或签发真实持续权限。T09条件齐备后，C1再按当期官方规范固定远程协议、发现、认证主体到现有scope/项目/skill的映射和客户端配置；C2/C3实际HTTPS、云对象/撤销/多进程与兼容客户端仍待授权。不因已安装SDK含相关能力而宣称商城已接入。精确原文/行号/源SHA在本批`mcp/dependency-audit.json`。

## T09.8：本地数据库和对象恢复

没有找到既有业务DB＋对象恢复证据；T06-O恢复记录只对应本地Auth配置启停，范围不足，故新增[固定TEST演练](../../apps/api/test/local-restore-proof.mjs)。7个检查通过：

- 通过现有受限服务保存实际PNG、Skill参考Markdown及关联版本、项目HTML原件及固定计划/设定，不执行HTML。
- 停止该TEST应用的写入，从只读可重复读事务导出快照，让`pg_dump`使用同一`pg_export_snapshot`；清单包含数据库表摘要、对象key/长度/SHA、dump摘要。
- 在全新空TEST库执行`pg_restore`，74张表/738行与原快照摘要全部一致，26迁移及5个历史release保持；对象三类共3份匹配同一清单。
- 缺失对象和同长度损坏对象均拒绝接受恢复；补回后再次核对通过。
- 先逐表核对完整原始恢复，再明确只重绑定恢复库的TEST环境标记到新库名，重新应用既有受限运行账号权限。没有重放seed或重置源库。
- 恢复后的原有服务能按授权读取媒体、Skill附件和HTML原件，Skill版本附件关联保持，源TEST库摘要不变。
- 两个临时数据库及文件目录全部删除；原开发库、开发服务和`.env`未动。只保留清单/摘要和测试记录，不保留原始数据库dump。

演练只针对隔离合成数据和本地PostgreSQL；没有接入真实Auth或验证云备份调度/加密保管/异地恢复/PITR、生产兼容迁移与部署回滚。清单核对不是全平台备份功能，T09.8整体继续未完成。

## 复现与下一边界

```sh
pnpm test:e2e:local-network
pnpm test:upload-budget
pnpm check:upload-budget --env-file .env.upload-budget.example
pnpm test:local-restore
```

CI包含原13项生产配置检查与本批11项上传预算检查；本地网络与恢复脚本未在远程CI运行。恢复演练依赖项目本地Compose PostgreSQL。原511项、33情境/45图和既有57/7按各自封存范围复用，没有为本批全量重跑。

后续需要用户决定的仍是[云服务/区域/预算和管理范围](CLOUD-READINESS.md)、真实入口的精确请求体额度/封装方式，以及真实账户/客户端/公网与设备验证。供应商无关的上述独立项已完成；T14.C1–C3受明确云前置限制，T10-V、T09剩余云项仍需外部条件。W3内容制作、W6模型比较暂停，T11真实商品/交易、T16-B/T17不自动启动。
