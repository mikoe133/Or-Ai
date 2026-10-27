2026-10-22 后续批准：用户已批准本文件对应的新版 G1（桌面聚焦、40 模块总览、手机版）。下文保留本次制作/评审时的范围与证据；原“待批准”停止已由本次明确批准解除。可以按稿落实正式页面，G4 实际 UI 仍独立审核；云/凭证/付费/发布另批。

# G1 画布修订交接 · 2026-10-22

状态：仅独立 G1 设计原型，重新提交审核；旧 G1 未批准，P3、正式 G2/G3、云服务、发布、小屋打磨均未推进。沿用当前工作区、分支、模型和设置，没有使用子代理。

## 组件核实

使用 @xyflow/react 12.12.0，实际 npm registry、安装包及 package-lock 的版本/integrity 一致，LICENSE 原文为 MIT。其 React、React DOM、types peer 均为 >=17；独立包保留现有 React / React DOM / types 19.3.0，实际依赖树无 peer 错误、TypeScript/Vite 浏览器构建通过。浏览器从真实运行时读取 React / React DOM 版本，不只是展示硬编码标签。免费节点、端口、边、Controls、MiniMap、Background 和 Provider 足够，不引用 Pro 扩展、不移除 attribution。

官方资料已实际查阅：

- [Dark Mode](https://reactflow.dev/examples/styling/dark-mode)：显式 colorMode=dark。
- [Add Node On Edge Drop](https://reactflow.dev/examples/nodes/add-node-on-edge-drop)：从模块源端口拖到空白处打开添加表单。
- [Theming](https://reactflow.dev/learn/customization/theming)：保留组件必要样式，用变量/自定义节点匹配 B 精密工具紫。
- [Preventing Cycles](https://reactflow.dev/examples/interaction/prevent-cycles)：连线前验证可达路径。
- [Performance](https://reactflow.dev/learn/advanced-use/performance)：稳定组件定义、按需展开与可视区渲染。

固定版本资料见 dependency-verification.json，原文和 notices 见 licenses/。构建仅用于浏览器；依赖中的 use client 指令产生 bundler 提示，不涉及本原型的 SSR，实际浏览器检查另有证据。

## 图与关系

复用原 Product/planRevision/moduleId/方法快照/来源记录。原始 fixture 始终为基准，编辑不写回它。计划归属使用低对比点线；模块依赖使用紫色箭头，方向为上游到下游。方法引用是只读点线，产物来源是只读虚线；可以查看具体方法/产物，但不能重接或删除依据。只读不是禁止挪动显示位置。

自定义节点为计划、专业模块、固定方法、产物、依据分组和备注，均通过稳定的 nodeTypes 表注册。新增专业模块仍限定既有领域；备注不算业务模块、没有依赖端口，不冒称平台支持新的执行形式。扩展其他节点类型时继续用组件类型表，不改全局 DOM 绘图器。

模块依赖校验同 planRevisionId、存在端点、没有自依赖、重复和循环。编辑/重接是一次内存状态替换，失败不丢原边；排除正在重接的旧边后再校验。只读关系 ID 不接受重接或删除。计划最多 40 模块；单模块可有多方法和多产物。

## 编辑、导航与规模

默认只看模块，一次展开一个模块的固定方法和产物。展开时进入该模块的依据分组；“全部模块”恢复全图。聚焦最多展示当前模块及 4 个邻居，避免 40 模块样例的扇出把字缩成不可读的列表。全图仍可通过缩略图和平移浏览，目录与搜索可以精确定位未展开的节点。40 模块样例含多个交付槽位，默认不渲染所有产物；它不是正式性能基准或容量承诺。

顶部“添加节点”“连接模块”在画布与目录均可用，手机可完整点选操作。模块内还有“后续节点”入口；拖源端口到空白处会预填上游，确认名称/领域后再添加。自依赖/循环提示原因，不只静默拒绝连线。

当前页面保留独立演示草稿 rN，新增节点用稳定 UUID；原 planRevisionId/digest、模块身份、Skill 精确版本和产物不变。切换历史状态显示原始基准，编辑入口禁用；回制作中恢复同一份内存草稿和 ID。刷新恢复初始资料。导出明确是 g1_design_draft、persisted=false，不能冒充已经保存的 ProductionPlan。正式实现仍需新计划修订与服务端权威校验，本轮没有开放写 API。

## 验证与范围保护

模型检查覆盖基准不变、固定版本/ID、跨计划/自依赖/循环/重复拒绝、原子重接/移除、多类型添加、40 模块上限、历史只读和草稿恢复。浏览器通过真实鼠标/触屏操作检查拖动、平移/缩放、端口连接、空白处加节点、添加/连接/调整表单、只读边、精确 Skill 下载、双端、状态和规模。当前结果与用例逐项见 flow-verification.json；截图在 flow-screens/。

没有把模拟手机称为真机，也没有用静态原型替代真实 Auth/管理员/后台业务验收。所有请求仅为静态读取；业务写请求计数另有验证。没有重跑或引用历史 354 项测试来声称新组件已经完成正式集成。

正式前后端/共享包及根依赖 421 份文件的前后摘要相同，日志在 .local/g1-flow/。无迁移、数据库写入、正式业务样例、云资源、自动化、MCP 新权限或发布。当前没有 .agents/skills，沿用已读取的全局 frontend-design 指引；未修改任何 skill。

## 审核关卡

请确认：默认总览与展开层级、编辑依赖/只读依据的区分、添加及调整流程、手机操作与目录回退。新版仍是待审 G1；G1/整体 G 不勾选。按本次用户要求，验证完成后在此停止，不以旧后台 B/T15-B 的批准替代本次审核，也不继续 P3。
