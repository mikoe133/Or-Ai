# T01：仓库与本地开发基础

状态：已完成，2026-10-09 本地验收通过。依赖：无。UI 依赖：无。对应需求：FR-12。

## 子任务

- [x] T01.1 建立 pnpm workspace：`apps/web`、`apps/api`、`packages/contracts`、`infra/cloudflare`；锁定兼容 Node LTS 与工具链，先核验实际版本，不使用浮动 latest。
- [x] T01.2 初始化 React/TypeScript/Vite、React Router、TanStack Query、Tailwind CSS 3.4、Radix UI；仅建立页面壳和基础控件，不定正式视觉。
- [x] T01.3 初始化 NestJS 模块边界、输入校验、错误码/请求追踪、`/health/live` 与 `/health/ready`；本地同域代理 API。
- [x] T01.4 提供本地 PostgreSQL 与环境变量示例；运行配置、认证配置与密钥分离，真实值不入库。
- [x] T01.5 建立可复现 Docker 多阶段构建、类型检查/构建命令及 GitHub CI；容器监听 `0.0.0.0`。
- [x] T01.6 将启动/关闭、迁移与检查说明放入工程 README；更新 v1 任务状态只记录已经验证的结果。

## 交付与验收

前后端骨架、本地数据库、锁文件、Dockerfile、环境示例、最小 CI 与启动说明。新环境可以按说明启动页面和健康接口，数据库就绪状态可区分，构建/类型检查通过；产物与 Git 无密码/管理密钥。

本步骤不接入 InsForge，不创建云资源、不配置定时任务；若以后改变厂商，再遵循对应接入要求。

## 验收证据

- `pnpm install --frozen-lockfile`、`pnpm check:toolchain`、`pnpm typecheck`、`pnpm build` 全部通过。
- `pnpm test`：真实 PostgreSQL 上 7 项通过、0 失败、0 跳过；包含正确/错误数据库凭据、验证管线、请求 ID、畸形 JSON、服务异常脱敏及启动配置检查。
- Linux amd64 多阶段 Docker 镜像构建及 Compose 运行通过：进程 UID 1000，API/前端代理的 ready 均返回 200/up，镜像没有 `.env` 和测试接口源码。
- 本地启动/关闭/重启验证通过，数据库卷保留；开发 API、数据库绑定本机，虚拟机多余 DNS 转发已移除，重启后名称解析正常。
- 浏览器确认连接恢复、说明弹窗开关及帮助路由；扫描源码/构建产物没有本机生成的密码，`.env` 被 Git 忽略。
- CI 文件已配置，未触发远程运行。具体命令与环境记录见 [PROGRESS.md](../PROGRESS.md)；迁移/seed 命令在 T02 实现后补充。
