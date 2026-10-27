# Or-Ai v1：实施入口

更新：2026-10-27。平台为情绪价值、自我与关系探索提供商品体验。所有商品正常体验使用 Three.js，世界观、视觉、动画、镜头和交互由每款商品规划决定；题目/报告/封面/视频/文案使用同一固定设定和合规Skill。

**执行从[当前任务索引](tasks/README.md)开始，01/02/03技术范围已完成，下一项为[04旧Skill与项目方法升级](tasks/active/04-skill-library-upgrade.md)。** 主线和条件/暂停分支已重写；已完成任务与旧排期不再混入当前队列。

## 任务与状态

- [ROADMAP](ROADMAP.md)：阶段、优先级、可独立推进和真实外部条件。
- [tasks/README](tasks/README.md)：16个有稳定编号的执行任务（01–03已归档），每项有背景/工程入口/步骤/验证/完成和回退要求。
- [PROGRESS](PROGRESS.md)：当前实施事实、未完成范围及下一任务，不再累计旧排期。
- [归档](tasks/archive/README.md)：9份完整完成任务、混合任务已完成批次与历史快照。
- [新旧编号映射](tasks/TASK-MAP.md)：原46个未勾项逐项去向；[registry](tasks/registry.json)保存机器可读依赖与状态。

## 产品与制作合同

- [商品统一实现规范](PRODUCT-IMPLEMENTATION-POLICY.md)：Three.js固定基线、按商品决定动画/交互、七用途Skill及前向升级边界。
- [商品创作设定](PRODUCT-CREATIVE-SYSTEM.md)：情绪/理解目标、参与视角、世界观和报告/传播承接。
- [PRD](PRD.md)、[长期产品方向](../../PRODUCT.md)：功能/商业范围与产品决策；当前任务顺序以本目录索引为准。
- [内容后台](CONTENT-BACKOFFICE.md)、[工作台](CONTENT-WORKBENCH.md)、[引用与采用](CONTENT-ADOPTION.md)：四类内容、固定输入/输出、原件与人工审核。
- [Skill库](STYLE-SKILLS.md)、[固定组合](SKILL-BINDINGS.md)、[七用途模板](../../examples/threejs-products/README.md)：可复用全局方法与实际商品规划绑定分层。
- [体验平台](EXPERIENCE-PLATFORM.md)、[运行/制作](EXPERIENCE-RUNTIME.md)：真实注册能力、答案/评估、场景/报告配对与恢复；旧DOM样例仅保留历史兼容。

## 工程与运营入口

- [AUTH-SETUP](AUTH-SETUP.md)：本机账户/管理员与云认证的独立范围；Mailpit不是外部邮箱验收。
- [云接入准备](CLOUD-READINESS.md)、[本地独立验证](LOCAL-VALIDATION-FOLLOWUP.md)、[本地优先边界](LOCAL-FIRST.md)：已购香港 VPS 与已有 Supabase/R2/Resend 的基础检查；应用适配/部署及真实业务验收由任务07/08/10继续持有。
- [数据模型](DATA-MODEL.md)、[API合同](API-CONTRACTS.md)、[占位隔离](PLACEHOLDERS.md)：现有数据库/接口/演示数据约束。
- [本地MCP](MCP-CONTENT-TOOLS.md)、[传输](MCP-LOCAL-TRANSPORT.md)、[SDK](MCP-SDK-NOTES.md)：已实现领域工具；远程接入单独验收。
- [项目制作](PRODUCTION-PLANS.md)、[工作区](PROJECT-WORKSPACE.md)、[原件审核留存](PROJECT-RETENTION.md)：计划/模块/方法/产物的固定来源。
- [外部运行](EXTERNAL-PRODUCTION-RUNS.md)、[Codex交接](CODEX-PRODUCTION-HANDOFF.md)、[制作闭环审查](CONTENT-PRODUCTION-REVIEW.md)、[业务验收](PLATFORM-BUSINESS-ACCEPTANCE.md)：回执/恢复/未启用配置及暂停分支。
- [UI交接](UI-HANDOFF.md)、[本地正式UI结果](T10-LOCAL-UI.md)：现有设计与本地已验证范围；未来页面自主验证不等于用户已批准具体新图。

## 保持的执行边界

01规划合同、02方法政策、03项目/发布校验已实现并本地验收，原业务数据保持；当前做用户授权的完整安全源码存档，实际提交/推送另据Git回执。后续继续按队列推进，不创建Goal/自动化。继续 NestJS/Prisma/PostgreSQL、React/Vite和既有权限/固定版本；不reset或重播开发seed。内容生成/实际模型比较暂停，日程未启用。云收费资源、真实持续权限、客户端、公开发布与真实交易按具体目标/范围和既有授权处理。

历史执行入口与旧任务总表见[重排前README](tasks/archive/history/2026-10-26/README-before-replan.md)，不是当前执行顺序。
