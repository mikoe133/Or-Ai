# G1 项目工作台 · React Flow 交互画布

2026-10-22。**用户已批准本版暗色 React Flow G1，包含桌面聚焦、40 模块总览和手机版。** 后续可按此稿落实正式页面；新的正式 UI 仍需独立验收。

[打开新版画布](http://127.0.0.1:5187/?scene=work&view=canvas) · [目录视图](http://127.0.0.1:5187/?scene=work&view=directory) · [40 模块规模示例](http://127.0.0.1:5187/?scene=work&view=canvas&size=40)

本版已用 **@xyflow/react 12.12.0** 替换原来的 CSS 三列和装饰连线。默认暗色，支持拖动、平移、缩放、缩略图、端口连线、拖线到空白处添加后续节点，也保留“添加节点”“连接模块”表单。手机默认等价目录，可点选添加、连接并打开完整详情。

紫色模块依赖可编辑；固定方法引用和产物来源只读。模型拒绝跨计划、自依赖、重复和循环，计划最多 40 模块。方法/产物默认折叠，一次只展开一组；聚焦视图最多显示当前模块及 4 个邻居，全部关系可通过全图、目录和搜索定位。

原始 P1/P2 计划、稳定模块身份、精确方法和产物未改。演示修改另显示草稿 rN；切换历史状态显示基准，再回制作中恢复同一份内存草稿，刷新还原。草稿导出是 g1_design_draft、persisted=false，不是保存成功的业务计划。

## 审阅画面

| 关注点 | 截图 |
| --- | --- |
| 桌面关系与层级 | [模块总览](flow-screens/desktop-overview.png)、[展开固定依据](flow-screens/desktop-expanded.png) |
| 固定 Skill 内容 | [正文与版本](flow-screens/desktop-method-detail.png)、[只读引用边](flow-screens/desktop-readonly-reference.png) |
| 添加与校验 | [拖线添加后续节点](flow-screens/desktop-add-on-edge-drop.png)、[循环被拒绝](flow-screens/desktop-cycle-rejected.png) |
| 规模 | [40 模块聚焦](flow-screens/desktop-40-focused.png)、[全部模块](flow-screens/desktop-40-overview.png) |
| 手机 | [等价目录](flow-screens/mobile-directory.png)、[添加表单](flow-screens/mobile-add-node.png)、[画布](flow-screens/mobile-canvas.png)、[方法详情](flow-screens/mobile-method-detail.png) |

请重点评审节点层级、边的语义、展开后的可读性、添加/连接流程与手机操作。**G1 已批准，后续从 P3 等依赖继续；正式 G4 界面仍须独立审核。**

## 版本、许可与验证

所选组件实际包为 12.12.0，React、React DOM 和对应 types 的 peer 均为 >=17。原型继续使用与项目一致的 **React / React DOM 19.3.0**；独立依赖树没有 peer 错误，TypeScript/Vite 构建和实际浏览器交互另行验证。未仅凭版本范围确认可用，也未升级正式项目。

实际安装包的 LICENSE 为 **MIT**；[原文](licenses/xyflow-react-12.12.0-MIT.txt)和[依赖 notices](licenses/THIRD-PARTY-NOTICES.txt)已保留。只用免费开源能力，未购买 Pro，保留 React Flow attribution。包元数据、tarball integrity、安装版本及官方来源见 [dependency-verification.json](dependency-verification.json)。依赖及锁文件仅在 canvas/ 内，根 package.json、pnpm-lock 和正式代码不变，见 [范围核对](scope-verification.json)。

本轮 7 项模型测试、34 项浏览器交互检查通过，pageerror=0、业务写请求=0；23 张新截图，详见 [flow-verification.json](flow-verification.json)。本轮详细交接见 [CANVAS-REVIEW.md](CANVAS-REVIEW.md)。检查与截图不等于真实手机/内置浏览器或正式管理员业务验收；此前平台的 354 项测试和旧 G1 的 24 项静态检查没有冒充本轮结果。

## 范围与重现

基础资料仍是原隔离服务导出的 5 模块、7 方法、4 来源记录，均为合成数据，图片仍是 1×1 PNG。40 模块扩展、备注、审核/留存/发布状态均是设计示例。原件缺失时仍不能提交审核；体验清单不是网页原包，留存与上架仍分开。

没有修改正式商城/后台前端、业务数据库或根依赖，没有连接云服务、调用模型、发布商品或打磨小屋。编辑只在当前页面；正式业务没有收到写入请求。G1 设计已通过，整体 G 与正式页面验收仍待完成。

从本目录运行 `python3 -m http.server 5187 --bind 127.0.0.1` 可恢复预览。重建在 canvas/ 使用 Node 24.21.0 执行 `npm ci --workspaces=false --ignore-scripts --no-audit --no-fund`，再运行 `npm run build` 和 `npm run test:model`；静态服务使用 canvas/bundle/，不调用后台 API。

2026-10-21 的旧图与证据保留为[历史评审记录](REVIEW-20261021.md)。
