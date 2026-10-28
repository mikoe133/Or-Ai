# A 制作上下文：隔离 TEST 验证

2026-10-28，Task05/06 合成技术范围。使用真实 NestJS 服务、HTTP 机器授权与独立随机 TEST 数据库；不连接云、不写原开发库，不制作正式内容。

## RED

- 测试文件：`apps/api/test/experience-authoring.test.ts`，两项 `synthetic A MCP context`。
- `pnpm --filter @orai/api exec tsc -p tsconfig.test.json`：通过。
- 在 `apps/api` 执行 `node --env-file-if-exists=../../.env --test --test-name-pattern='synthetic A MCP context' .test-build/test/experience-authoring.test.js`：实际执行2项，0通过/2失败。
- 第一项：未选择方法时，错误的固定规划摘要得到 HTTP 200，预期409。
- 第二项：已固定的 A 规划明确指定 `reflection-garden@1/garden-notes@1`，创作形式为兼容的 `web` 时返回 `dom-choice`，预期花园。
- 本地原始日志：`.local/t16-c3-implementation-20261028/a-{compile-red,red}.log`；失败是实际业务断言，不是编译或环境错误。
- fixture 在 after 中关闭应用/连接并删除本轮独立 TEST；没有重放原开发库 seed。

此记录暂为 RED；不能据此认定 A 链已修复、已发布、已完成性能/浏览器/真机验收。
