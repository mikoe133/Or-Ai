# 02 · Skill 服务端商品政策验证

2026-10-27，T13.C2 本地技术范围完成。五库七用途的新写入和新方法绑定使用统一服务端政策；历史版本、组合、方法及恢复读取保留原样。项目发布完整性、存量库升级和商品转制分别由03、04、05持有。

## 实现

- 严格区分 manifest v1 历史与 v2 当前清单。v2 的 `productPolicy` v1 明确 Three.js、全部声明用途、必填 v2 `product-plan` 输入及按固定商品规划确定具体玩法；共同正文与每个专业用途条款同时检查。全局 Skill 不含商品 ID。
- 新建、保存、复制、审核、启用共用 `requireSkillProductPolicy`。复制历史版本须显式提供升级后的 manifest，追加新版本和摘要；不能改领域。MCP 升级复制同样检查参考文件授权，不能借复制采用另一连接尚未关联的上传。
- 新组合和直接体验方法把版本化 `productPlanInput` 写进原固定快照，保存计划/模块 ID 与摘要及形式；用途和精确方法版本沿用原字段。项目方法复用已固定的计划/模块归属。新绑定、制作上下文、方法捕获、项目产物登记及新 run 认领校验当前 v2 规划、同商品/scope/设定、模块、用途和形式。
- 历史清单和快照不补默认字段，不重算摘要。原作业恢复只读取原固定方法并校验引用字节，不因后来新增规划而替换它们；该读取不授权新制作。体验固定引用检查与新绑定检查分开。
- 后台显示缺项，支持显式复制升级、补齐政策及规划/模块选择。补齐使用当前未保存的输入规范，保留专属正文。过期规划、坏输入和响应丢失保留表单；原请求可恢复已提交的组合。新增控件只在后台，沿用精密工具紫，窄屏摘要完整换行。

主要入口：`packages/contracts/src/{skills,product-policy,skill-bindings,experience-authoring}.ts`；`apps/api/src/operations/skill-product-policy.ts` 及原 Skill、组合、体验、项目和 run 服务；后台 `skills.tsx`、`content-skills.tsx`、`content-experience.tsx` 与 `skill-plan-input.tsx`。

## 验证

| 检查 | 实际结果 |
| --- | --- |
| `CSRF_SIGNING_KEY='' pnpm test` | API443＋web101＋MCP20＝564，全部通过 |
| 全工作区 typecheck / build | 通过；既有动态 Three.js 渲染预算检查通过 |
| 云配置与上传字节预算离线检查 | 24/24；不表示云接入验收 |
| 政策核心覆盖率 | 两文件共100%行、94%分支、100%函数；服务端规划校验100%行、88.46%分支 |
| 自主 CUA | 13/13；桌面与390px窄屏，已有本机真实 Auth 登录，独立 TEST 业务库 |
| 浏览器 → 官方 MCP SDK 回读 | 固定方法的 ID、manifest 和 digest 与浏览器保存组合一致；临时测试凭据已撤销 |

浏览器是代理自主交互和目视验收，不是用户批准。检查包含历史只读/复制升级、未保存正文和输入规范保留、审核/启用、五用途组合、过期规划拒绝、显式重选、提交后响应丢失与同请求恢复、两种体验用途的必填规划和实际保存。回读确认仅3份组合修订，无重复第4份；原 v1 清单与摘要不变，体验稿固定两种用途与同一规划。

证据：[browser-checks.json](browser-checks.json)、[browser-readback.json](browser-readback.json)；[旧版缺项](legacy-policy.png)、[升级启用](upgraded-active.png)、[输入保留](missing-input-preserved.png)、[过期规划](stale-plan-preserved.png)、[响应丢失](response-loss-preserved.png)、[体验规划绑定](experience-plan-desktop.png)、[窄屏验证](plan-modules-mobile-verified.png)。`plan-modules-mobile.png` 保留首次发现摘要裁切的状态，修复后的结果使用 `-verified` 文件，不把前者作为通过证据。

RED 已实际编译和执行后才实现：`8aae7ba`（清单/HTTP政策缺口）、`df3fde8`（实际规划绑定）、`86a75dc`（直接体验输入）、`da4f867`（历史升级与错领域复制）、`1a88cc4`（MCP复制上传授权）。原始日志在忽略目录 `.local/t13-c2-20261027/`，包括 `red-*.log`、`full-test-final.log`、`typecheck-final.log`、`build-final.log`、`coverage-policy-final.log` 和专项检查。

## 保全与边界

本批无数据库迁移或新增依赖；沿用27份原迁移和原权限。数据库测试均使用独立 TEST fixture，未 reset/seed 开发库。一次清理检查曾看到非客户端 PostgreSQL 后台进程；该单一遗留 TEST 库经 marker、27份迁移和无客户端连接核对后回收。临时 UI 库、资产目录、API/Vite、浏览器标签已清理，视口已复原，本机 Auth 服务保持。

未批量升级开发库的旧 Skill/组合，没有执行模型比较、正式内容/美术生成、云部署、持续凭据或客户端配置、日程、公开上架或交易。正常商品实际 Three.js 发布门禁仍需03；不能把本批政策声明、合法规划或合成草稿视为商品已经实现和验收。

完整项目存档为 `17b2ffcbee353defad61cb35d3730b581a425f56`；其独立 CSRF 测试修复 `f39a4cbcba9475c4191a5f7658256fd58a301c5b` 已正常推送且 [CI40490839010](https://github.com/mikoe133/Or-Ai/actions/runs/40490839010) 全部通过。本批新增提交及托管 CI 结果单独回执，不用旧 CI 冒充本批通过。
