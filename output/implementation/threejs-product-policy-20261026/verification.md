# 全商品 Three.js 规划与 Skill 起始要求

2026-10-26。用户明确所有商品使用 Three.js、所有商品 Skill 明示该要求，动画与交互按具体商品规划决定。本批完成 T16.C1 / T13.C1 的规划、创作入口及指引；没有将全部存量商品/Skill 标记为已转制。

## 已交付

- [统一商品规范](../../../prd/v1/PRODUCT-IMPLEMENTATION-POLICY.md)：Three.js 为固定技术基线，2D/2.5D/3D 视觉及具体动画/镜头/交互分别按商品规划；不统一套用花园，不把未实现玩法标成可用。
- 五库七用途的[起始模板](../../../examples/threejs-products/README.md)：题目/评估、报告写作、封面、视频、文案、场景设计及报告呈现。全部正文含共同 Three.js 条款，默认形式 3d，creative-profile 与 product-plan 必填。
- 新建商品设定默认 Three.js，体验节奏/视觉强调按商品规划决定；历史形式显示兼容或待适配说明。未改商城、登录和账户界面。
- Skill 页显示全局要求。当前草稿可显式补入条款/3d 支持/商品规划输入，保留专属正文、原输入说明和附件引用；操作不自动保存。固定历史版本只读，提示复制新版本后升级，正文与摘要不变。
- 五领域 MCP 的 context/skill 读取/草稿保存/复制工具说明同步制作规则；没有变更严格输入/响应 schema、授权、历史 manifest 或 digest。
- 规划与任务已同步：下一项 T16.C2 固定商品规划/发布门禁，随后 T13.C2–C3 的服务端 Skill 校验/旧方法升级、T16.C3 商品新版本转制和 C4 真机成套验收。

## 验证结果

| 检查 | 实际结果 |
| --- | --- |
| contracts 构建 | 通过 |
| 全工作区类型检查 | 通过，含 API/web/MCP |
| web 生产构建 | 通过 |
| web 测试 | 92/92 |
| MCP stdio / SDK 测试 | 20/20 |
| 七份起始 JSON | 全部通过现有严格 StyleSkillManifestSchema 和共同条款检查 |
| 浏览器 | 五库新建默认值、显式补入/恢复、历史只读提示通过 |

本批共 112 项自动测试，非全仓测试总数；此前 T16-B 的 248 项属于独立历史批次，不重复累计。没有修改 API 业务服务，此次未重跑全部数据库集成和历史浏览器 E2E。命令为 `pnpm --filter @orai/contracts build`、`pnpm --filter @orai/web test`、`pnpm --filter @orai/mcp test`、`pnpm typecheck`、`pnpm --filter @orai/web build`。

新增验证覆盖七用途都声明 Three.js、按商品规划决定动画/交互；补入操作幂等且不改变原对象、不丢引用/输入说明；旧严格 manifest 仍可读取。既有 v1 DOM 能力测试显式使用历史 web 设定，保留原断言；未为配合新默认值放宽兼容检查。MCP 实际 tools/list 覆盖四领域及 experience 的相同指引。

构建的 Three.js 动态加载/入口隔离检查仍通过，完整花园渲染依赖 gzip 163,912 字节，原 240 KiB 上限保持。Vite 单 chunk raw >500 kB 的提示保留，未提高阈值。

## 浏览器范围与证据

在新建的隐藏 IAB 标签中使用已有管理员会话。五库新建草稿均显示 Three.js、3d 默认值及 product-plan；临时删除正文后补入条款，专属文本保留，再恢复原未保存内容。旧固定 Skill 仍保留原正文、编辑控件禁用，同时显示当前全局规则与新版本升级提示。未点击保存/审核/激活，未修改商品数据；测试标签已关闭，原用户标签保留。详情见 [browser-checks.json](browser-checks.json)。

- [新建题目 Skill 的共同规则](new-skill-threejs.jpg)
- [体验 Skill 默认值](experience-skill-threejs.jpg)
- [历史 Skill 的升级提示](historical-skill-policy.jpg)

## 明确保留的后续项

本批是规划与创作入口调整，服务端新的保存/审核/新绑定/发布门禁尚未落地；任意导入或 MCP 保存仍不能仅凭工具说明认定已符合新政策。存量商品、数据库旧 Skill、固定方法快照、报告和采用包未批量升级，原网页发布技术路径尚在。它们分别由 T16.C2–C4 / T13.C2–C3 前向实现并验证。

核实另有项目体验制作稿登记的 web-only 判断，应在 T16.C2 按共享注册能力适配 Three.js。未直接修改此服务，也未把现有花园 authoring 专项等同于项目全链已适配。

没有生成商品成套媒体、启用日程、接云、创建真实凭据或提交/推送。内容生成/模型比较此前的暂停保持。
