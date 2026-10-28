# B 独立 Three.js 模板验证

2026-10-28，Task05/06 合成技术范围。候选组合 `relationship-atlas-prototype@1/atlas-notes-prototype@1`，固定正交2.5D、无环境/镜头动画、2–4明确单选；正式商品未选择。

## RED

- `apps/web/test/atlas.test.ts` 首次直接引用待实现的 atlas model/scene 与图形预算，编译确实失败：缺少两个实现模块与 `relationshipAtlasGraphics` 导出。测试覆盖固定正交投影/选项映射、实际几何/资源释放、像素上限和拖动返回原点不误选择。
- API 测试编译成功，隔离 TEST 实际执行 `synthetic B pins...`，得到 `capabilities.status=blocked`，预期该实现完成后的 `compatible`。失败明确源于候选组合尚未注册，不是数据库/依赖失败。
- 命令分别为 `pnpm --filter @orai/web exec tsc -p tsconfig.test.json`，及在apps/api编译后执行 `node --env-file-if-exists=../../.env --test --test-name-pattern='synthetic B pins' .test-build/test/experience-authoring.test.js`。
- 原始日志：`.local/t16-c3-implementation-20261028/b-{web-red,api-compile-red,api-red}.log`。原29份迁移未改；后续如扩展严格发布配对，只新增前向迁移。

尚未GREEN，不能认定B已实现或通过浏览器/性能/正式商品验收。
