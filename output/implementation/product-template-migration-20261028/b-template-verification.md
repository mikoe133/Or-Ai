# B 独立 Three.js 模板验证

2026-10-28，Task05/06 合成技术范围。候选组合 `relationship-atlas-prototype@1/atlas-notes-prototype@1`，固定正交2.5D、无环境/镜头动画、2–4明确单选；正式商品未选择。

## RED

- `apps/web/test/atlas.test.ts` 首次直接引用待实现的 atlas model/scene 与图形预算，编译确实失败：缺少两个实现模块与 `relationshipAtlasGraphics` 导出。测试覆盖固定正交投影/选项映射、实际几何/资源释放、像素上限和拖动返回原点不误选择。
- API 测试编译成功，隔离 TEST 实际执行 `synthetic B pins...`，得到 `capabilities.status=blocked`，预期该实现完成后的 `compatible`。失败明确源于候选组合尚未注册，不是数据库/依赖失败。
- 命令分别为 `pnpm --filter @orai/web exec tsc -p tsconfig.test.json`，及在apps/api编译后执行 `node --env-file-if-exists=../../.env --test --test-name-pattern='synthetic B pins' .test-build/test/experience-authoring.test.js`。
- 原始日志：`.local/t16-c3-implementation-20261028/b-{web-red,api-compile-red,api-red}.log`。原29份迁移未改；后续如扩展严格发布配对，只新增前向迁移。

## GREEN：实现及隔离链

- 新增独立 atlas model/scene/renderer、体验组件与报告；真实正交相机、分层坐标台几何体、固定镜头、按需绘制，没有环境或相机动画。文字/键盘选择与明确确认继续使用原答案协议，报告只呈现服务器字段。
- 新组合独立注册并惰性加载；共用宿主为该模板提供同题故障回退及重试，保留原花园入口和旧模板。
- 首轮注册完成后，B 实际链到达数据库发布时再次 RED：原触发器返回23514，仅接受花园。保留原29份迁移，新增 `20261028010000_atlas_template_pair` 扩展两处严格配对检查；新旧配对均用null安全比较，其他固定输入/快照/审核/原件检查保留。当前总迁移30份，未作用于原开发库。
- 重跑同一 B 隔离链：**1/1通过**。真实 SDK 上传/制作/方法捕获、预览、审核、TEST发布、恢复/冲突、服务器报告、一次消费、退款撤权及旧DOM读取全部执行。
- atlas 与原 garden 单元测试：**8/8通过**，包含2–4选项/不同视口的固定正交相机、对象拾取、图形预算、一次释放及拖动返回原点不误选。
- 前端类型/构建通过。构建门禁对两个renderer各自计算完整静态依赖gzip，入口均不引入Three.js：A **165093/245760字节**；B **164495/225280字节**。此为构建体积，不是首帧/真机成绩。
- 日志：`b-api-db-red.log`、`b-api-green.log`、`b-web-{compile-green,green,typecheck,build}.log`，均位于本批 `.local` 目录。

本实现仍为合成技术原型。浏览器/失败恢复、完整回归、实际性能与正式商品范围继续分别验收，尚不关闭05/06。

后续结果：完整回归635项与26项自主CUA已通过，包含B键盘/窄屏、context丢失、模块失败、离线保存/恢复和独立报告。A/B原生项目产物与两个方法快照也实际保存并复跑通过。最终构建数字和仍未测的首帧/FPS/内存范围见[本批验证](verification.md)，上述GREEN数值保留当时检查点口径。
