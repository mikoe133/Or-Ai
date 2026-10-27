# 09 · 实现并验收远程 MCP 连接

任务标识：T14-C。状态：等待云条件。队列：条件分支。更新：2026-10-26。

## 目标与现状

五领域本地 stdio 与受控业务 API 已通过，远程 Streamable HTTP、授权发现及真实远程客户端仍未实现/验收。原明文要求先完成 T09 对应真实认证/HTTPS/存储条件。

## 前置与执行位置

硬前置：[08 预发布部署与真实账户、邮件、存储验收](08-cloud-auth-validation.md)。

原编号覆盖：`T14.C1`、`T14.C2`、`T14.C3`；范围拆分见[编号映射](../TASK-MAP.md)。步骤前缀只表示队列位置，原业务编号不重用。

## 开始前读取

- [prd/v1/MCP-LOCAL-TRANSPORT.md](../../../../prd/v1/MCP-LOCAL-TRANSPORT.md)
- [prd/v1/MCP-CONTENT-TOOLS.md](../../../../prd/v1/MCP-CONTENT-TOOLS.md)
- [prd/v1/MCP-SDK-NOTES.md](../../../../prd/v1/MCP-SDK-NOTES.md)
- [packages/mcp/src/content-tools.ts](../../../../packages/mcp/src/content-tools.ts)
- [packages/mcp/src/experience-tools.ts](../../../../packages/mcp/src/experience-tools.ts)
- [apps/api/src/operations/machine-request.guard.ts](../../../../apps/api/src/operations/machine-request.guard.ts)

## 实施步骤

- [ ] T14-C.1 执行前核对当期官方协议、SDK和真实目标客户端兼容；沿用领域/范围/到期/撤销，不把本地配置改地址即视为远程。
- [ ] T14-C.2 实现受控 /api/mcp/:domain Streamable HTTP、授权/发现、代理与客户端配置；连接不授予审核/发布/退款/消费者数据权限。
- [ ] T14-C.3 将新的商品规划和七用途 Skill 规则纳入远程调用，与网页/本地 MCP 同样校验。
- [ ] T14-C.4 实际验证 HTTPS、短期上传/下载、字节/超时限制、撤销/到期、断线/多进程幂等和来源审计。
- [ ] T14-C.5 从真实兼容客户端读取固定 Skill/规划、上传成品/保存草稿，后台核对同一对象、版本和来源；只开放已授权目标。

## 验证与证据

- 协议与 API 相关自动测试，加至少一个真实远程客户端全链；保存实际客户端/协议版本和限制。
- 验证同请求断线接续不复制文件、撤销后后续工具/上传完成拒绝；不泄漏token、下载路径或私人报告。

本任务未开始，以上为执行要求，不是已有测试结果。实施时沿用当前 NestJS/Prisma/PostgreSQL、React/Vite、现有权限与数据卷；数据库验证使用隔离 TEST fixture，浏览器交互使用 CUA。与任务无关的商城视觉、设置、分支和历史文件保持。

## 完成条件

T14.C1–C3 均有真实远程证据。若本次不启用远程 MCP，则此任务保持未启用/待验，不阻塞普通商城 M5/M6。

必需项全部有证据后才可关闭。把实际版本、通过/失败/待验、日志/截图和范围写入当批记录，更新[任务索引](../README.md)与[进度](../../PROGRESS.md)；按[归档规则](../README.md#完成与归档规则)归档此任务。仅代码完成、配置存在或模拟通过时不得归档为整体完成。

## 回退与操作边界

停远程传输入口并撤销该测试连接，保留原本地 MCP 与已保存合法历史。

本次重新规划不授权启用已暂停的内容/模型作业、外部日程、云收费资源、真实持续权限或公开发布/交易。需要这些实际动作时，先完成已授权的准备并形成可审结果，再按既有具体授权边界执行。

