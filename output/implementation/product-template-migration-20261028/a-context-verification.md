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

## GREEN

- `MachineExperienceService.context_bundle_get` 现在复用现有固定规划绑定校验，即使方法列表为空也核对商品、范围、设定、修订、摘要和明确模块。
- 有明确运行声明时，制作清单采用该模块的场景/报告组合；未实现的答案/评估/报告协议拒绝。解析或选择模板不授予发布资格。
- 能力提示只复用属于同一固定规划/模块/配置的旧稿；不会让旧稿覆盖当前规划的默认组合。未显式提供规划的旧读取行为保留。
- 重跑同一编译及两项 HTTP 测试：**2/2通过**。同时实际执行错误模块400、不存在规划404及规划仍为planned时审核资格false的断言。
- GREEN日志：`.local/t16-c3-implementation-20261028/a-{compile-green,green}.log`。

## A 实际制作与消费者链

- 新增 `synthetic A pins its actual plan and methods...`，从已保存的 A 规划建立新修订；逐项固定实际仓库实现来源，不填写 verified，也不生成正式媒体或报告正文。
- 真实 stdio MCP SDK 读取固定规划与两用途方法，上传已有测试 JPEG 的实际字节，校验、保存、同 requestId 重试、读取固定稿和来源。
- 核对规划/模块摘要、两个方法快照及资源 SHA；通过服务器报告预览、体验审核与隔离 TEST 版本发布，再核对 runtime 的精确清单。
- 用独立匿名消费者会话实际执行发码/兑换、确认保存、相同请求重试、旧修订409、刷新读取恢复、完成答题、服务器报告、重复提交一次消费及退款后拒绝答卷/报告。
- 报告内容与服务器预览一致；旧 DOM 固定版本仍可读。所有订单/身份/内容均为合成 TEST，不是生产发布或真实交易。
- 编译通过后顺序执行 `experience-authoring.test.js` 与 `experience.test.js`：**24/24通过**，耗时约15.3秒。日志 `.local/t16-c3-implementation-20261028/a-chain-{compile,regression}.log`。

A 制作上下文及此合成制作/消费者链已通过。B 独立模板、性能/浏览器/真机及正式商品仍未完成；不据这24项关闭整个05/06。

## A 拖动判定 RED

浏览器确认左右观察不改变答案后，补充往返拖动边界：`gardenTap` 只检查首尾距离，忽略整次手势已发生拖动。新测试编译成功并实际执行1项，返回true而预期false。日志 `a-gesture-{compile-red,red}.log`。此失败尚未修复，先保留RED检查点；同一规划要求镜头拖动不能变成答案选择。

## A 拖动判定 GREEN

`garden-renderer` 在移动过程中锁定 `dragged`，`gardenTap` 同时核对手势历史与首尾距离；往返、纵向拖动均不能在抬起时误选。编译通过，原失败用例随完整前端回归 **106/106通过**，前端构建也通过。A/B模板均按自身容器宽度重排，局部控件不再被商城通用按钮样式覆盖；商城/账户/后台整体样式没有修改。实际浏览器复查继续记在当批CUA证据中。
