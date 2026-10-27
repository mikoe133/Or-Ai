# T16-B 静心花园 · 本地技术验收

日期：2026-10-26，Asia/Shanghai。结论：小型 Three.js 明确单选模板、配对报告与后台/API/MCP 接入已实现，本地技术检查通过。T16.4 完成；T16.5–.8 的真实设备、成套宣传内容及实机全流程仍待验，整体 T16 不关闭。

## 实现范围

- `reflection-garden@1` / `garden-notes@1` 进入共享注册表。React effect 挂载真实 Three.js 0.186.1，场景使用内置几何体，无大型模型/纹理下载，无新数据库迁移。
- 2–4 个对象、编号按钮和文字 radio 使用同一 questionId/optionId。鼠标横拖/左右观察只改视角，点击「保存答案」才确认。评分、保存恢复、冲突、报告、消费和撤权继续由原服务处理。
- 花园手记使用原结构化报告及配套静态花园插画。旧 `field-notes@1` 默认外观继续使用原小屋插画；不在客户端计算分数。
- 后台按模板更新结果配对与图片限额，方法按固定创作形式匹配。3D 设定不得通过无体验草稿的默认 DOM 发布路径绕过审核。
- 新增显式 `capabilityVersion:2`。后台、原四领域 MCP 与 experience 共同发现三组模板、协议与图形预算。默认省略能力字段，显式 v1 保持原严格结构及两组模板；旧声明遇到 3D 会提示使用 v2。原 supported DOM 值仍是兼容基线，实际组合读取显式 templates/capabilities。
- 模型/音频/脚本、任意场景包、分支/排序/小游戏和无评估交付仍未启用。

## 自动验证

| 范围 | 结果 | 日志 |
| --- | --- | --- |
| 全工作区类型检查（含 contracts 构建） | 通过 | [typecheck.log](typecheck.log) |
| API / web 构建、MCP 构建 | 通过 | [api-build.log](api-build.log)、[web-build.log](web-build.log)、[mcp-test.log](mcp-test.log) |
| web 单元/契约测试 | 91/91 | [web-test.log](web-test.log) |
| 8 组相关 API 集成/回归 | 138/138 | [api-test.log](api-test.log) |
| MCP stdio / SDK 测试 | 19/19 | [mcp-test.log](mcp-test.log) |
| 合计（不重复计算先前 21 项体验专项） | 248/248 | 0 失败、0 跳过 |

执行入口为 `pnpm typecheck`、`pnpm --filter @orai/web build`、`pnpm --filter @orai/web test`、`pnpm --filter @orai/mcp test` 及 `pnpm --filter @orai/api build`。API 测试先在 apps/api 编译 `tsc -p tsconfig.test.json`，再通过 `node --env-file-if-exists=../../.env --test` 运行以下 `.test-build/test/*.test.js`：experience-authoring、experience、production-plans、machine-content、machine、content、content-workflow、runtime。

API 使用自动建立/回收的隔离 TEST 库，真实 MCP SDK 覆盖 3D 形式方法、图片上传、草稿重试、人工审核发布与预览；运行测试覆盖 3D/DOM 同输入同分、服务器进度恢复/冲突、一次消费及退款撤权。未向开发库 seed/reset 或发布商品。最终只读检查：开发环境为 DEVELOPMENT、迁移 26 份、残留临时测试数据库 0。

web 新增射线选择/摄像机与视口一致性、资源去重释放、DPR/像素预算、点击/拖动区别、按需帧/隐藏/销毁，以及严格 v1/v2 发现与精确报告配对检查。此次未重跑整个历史浏览器 E2E 集合；手动浏览器样例验证和后端集成测试分别记录，不能合称完整实机 E2E。

## 图形与加载预算

| 指标 | 固定上限 | 本次证据 |
| --- | --- | --- |
| DPR | 1.5 | 实际画布 918×778；高 DPR/超大尺寸另有单测 |
| 画布像素 | 1,500,000 | 默认与窄屏均低于上限 |
| 三角形 | 14,000 | 初始 6,600，选中 7,080 |
| draw calls | 48 | 初始 22，选中 23 |
| 渲染器及其静态依赖 gzip | 245,760 字节（240 KiB） | 163,912 字节，约 160.1 KiB |
| 商城入口静态依赖 | 不含 Three.js | 构建模块图检查通过 |

`apps/web/vite.config.ts` 的构建检查会在 Three.js/渲染器进入入口静态依赖、注册渲染器缺失或 gzip 超标时失败，并输出 [experience-budget.json](experience-budget.json)。体积包含渲染器及其静态共享依赖，不只统计单一 chunk；压缩算法固定使用 Node gzipSync。Vite 自带体积报告的 gzip 算法参数不同，其单个渲染 chunk 为 543.02 kB raw / 136.45 kB gzip；默认 raw >500 kB 提示保留，未通过调高阈值隐藏。

场景静止不持续绘制。单测验证帧合并、隐藏暂停与销毁后迟到帧丢弃；卸载释放几何体、材质、实例、监听器、ResizeObserver、RAF、renderer 和 context。CPU 资源释放和真实 WebGL 恢复分别有证据，不声称已用手机 GPU profiler 测量。

Three.js 和类型包版本/许可证/完整性见 [three-registry.json](three-registry.json)、[three-types-registry.json](three-types-registry.json) 及锁文件，均为 MIT。在线 Three.js 手册读取曾失败；使用安装包官方 README 与 WebGLRenderer/InstancedMesh 源码核对 API，不将失败的请求记作成功读取。

## 浏览器验收

使用 Codex IAB 和 CUA，在 agent 新建标签中进行；未导航或关闭用户原有两标签。详细结果见 [browser-checks.json](browser-checks.json)。

1. 默认 1280×720 与 390×844 模拟视口：真实 WebGL2 画面、编号/文字选择同步、明确保存、上一/下一题及练习进度。窄屏无横向溢出，编号目标 44×44；模拟视口不是实际手机。
2. 键盘 radio 选择与鼠标左右观察/横拖可用；横拖改变投影位置，答案和进度保持。
3. 强制 `WEBGL_lose_context` 后自动进入有完整样式的同题表单，已确认进度和未确认选项保留；可在简化界面确认，重试后恢复真实 WebGL。
4. 临时使 canvas `getContext('webgl2')` 返回 null，初始化失败后仍能答题/确认；恢复 prototype 后重试成功。测试替换带自动恢复，并已显式清除。
5. 在独立标签中启用网络观测/禁用缓存并只阻断 garden-renderer 模块，实际回退后仍能确认。清空阻断和缓存覆盖后重试成功，选项与已确认进度保留；测试标签已关闭。
6. 花园手记懒加载成功；报告固定排版样本有明确说明，返回题目后当前未确认选项/已确认进度均保留。
7. 现有管理员会话下查看能力 V2；临时选择花园自动配对 garden-notes、预算改为 2 张/1 MiB，切到结果交付仍是花园手记。恢复 DOM / legacy-text 后「无未保存修改」，没有点击保存或审核，临时后台标签已关闭。

本轮 `Input.dispatchTouchEvent` 在 IAB 不受支持，未生成触摸证据；Pointer 输入代码和 44px 目标不能代替真实触摸验收。最终已恢复默认 viewport、减少动态覆盖和触摸模拟状态，清除网络/缓存阻断；保留一张干净的独立预览作为交付。

## 截图

- [最终桌面预览](garden-preview-final.jpg)
- [桌面已确认状态](garden-desktop.jpg)
- [390 像素窄屏未确认状态](garden-mobile.jpg)
- [花园手记窄屏](garden-report-mobile.jpg)
- [context 丢失回退](context-loss-fallback.jpg)
- [无 WebGL 回退](webgl-unavailable-fallback.jpg)
- [模块加载失败回退](module-load-fallback.jpg)
- [后台 V2 与未保存状态](admin-garden-template.jpg)（模板/报告的具体配对由浏览器状态另行核对，截图展示页面顶部）

## 后续验收

下一步补真实 iOS/Android 手机触摸、内置浏览器、冷启动/加载和运行稳定性，再补真实设备上的兑换→选择→确认/恢复→报告→退款撤权。具体设备/浏览器/网络尚无实测记录。

本轮沿用已有六道题做技术练习，没有制作新的 3D 宣传封面、视频或文案。内容生成暂停保持；正式素材需在该范围恢复后与固定体验/结果版本成套核对。独立预览刷新清空练习、固定报告与答案无关，不创建真实答卷或消耗次数。未提交/推送、接云、配置真实客户端或启用日程。来源文件摘要见 [source-manifest.json](source-manifest.json)。
