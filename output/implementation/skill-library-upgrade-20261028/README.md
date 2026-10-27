# Task 04 · 旧 Skill 前向升级与保全

日期：2026-10-28（Asia/Shanghai）。本批完成本地维护工具、隔离全链验收及明确选择的四份开发库方法追加升级。没有自动审核/启用、重绑商品或公开发布；不代表所有商品已经转制。

完整结果见 [verification.md](verification.md)，实际对象逐项处置见 [development-upgrade-dispositions.json](development-upgrade-dispositions.json)，开发库保全见 [development-preservation.json](development-preservation.json)。2026-10-27 的[原只读盘点](../skill-library-upgrade-20261027/README.md)保持冻结。

## 本批结果

- 本地 `skills:upgrade inventory/preview/apply`：精确来源、预期修订、摘要、专业适配说明、新草稿、独立事务、审计及幂等恢复；没有新增 HTTP/MCP 写入入口或后台执行队列。
- 选定开发库四个旧 ACTIVE 来源，追加四个 manifest v2 DRAFT。原六个版本所有字段不变，原四个 ACTIVE 仍启用、两个 ARCHIVED 仍归档；四份旧组合、三份采用包及全部历史引用保持。
- 三份 AVAILABLE 参考文件逐字节/SHA-256 复核不变；新稿复用一条既有附件引用，没有复制文件字节。
- 73 张业务表，1508→1521 行。只新增四版本、一附件关联、四审计、四幂等记录，并按既有复制规则推进四个父 Skill 修订。其余68表完全不变，29份迁移校验和不变；无 reset/seed。
- 两个体验用途没有旧方法可迁，不虚构场景/报告制作能力；在任务05/11按实际商品规划补专业方法。四份新稿的审核/启用或项目固定采用也是后续显式步骤。

## 浏览器证据

[browser-checks.json](browser-checks.json) 记录16项自主 CUA，使用真实本机 Auth 与独立 TEST 业务库。隔离样例实际演练旧版只读→五字段差异→新稿→分别审核/启用→固定实际规划的新组合→返回旧组合→归档附件下载。隔离样例的启用动作不代表开发库新稿已启用。

- [新草稿保留原正文及参考](current-draft-desktop.png)
- [新组合固定实际规划和五个用途](new-five-purpose-binding.png)
- [原组合仍引用旧版](historical-binding-preserved.png)
- [390px历史方法](archived-method-mobile.png)
- [后端回读](browser-readback.json)、[原附件下载摘要](download-check.json)

浏览器检查是代理自主验收，未记为用户批准。临时登录已退出、自建页面与测试服务/库/资产目录已清理，原本机 Auth 与数据库服务保留。

## 维护命令

命令在仓库根运行，但 pnpm 子命令工作目录是 `apps/api`，`--file`、`--out` 一律使用绝对路径：

```sh
pnpm skills:upgrade -- inventory --actor <已有业务管理员UUID> --out <新的绝对路径.json>
pnpm skills:upgrade -- preview --actor <已有业务管理员UUID> --file <选择清单绝对路径.json> --out <新的预演绝对路径.json>
pnpm skills:upgrade -- apply --actor <已有业务管理员UUID> --file <已核对预演绝对路径.json> --out <新的回执绝对路径.json>
```

要求现有 schema-owner、本地 loopback、DEVELOPMENT/TEST marker 和真实业务管理员；机器身份拒绝。每批最多25项，同一 Skill 只选一个精确来源。全局来源声明必填 `product-plan`，不绑定某个商品；项目来源则明确选择同商品当前 v2 模块，并保留原定制参数。

输出以 `wx/0600` 新建；已有回执不覆盖。发生 CONFLICT 先检查文件、回执和实际对象，再使用新的绝对输出路径。部分失败沿用原预演与原 requestId 重试，已成功项复用原结果；来源/规划已变化则先重新核对，不能盲目重新选择或覆盖历史。本次相对路径父目录缺失的恢复过程见 [conflict-recovery.json](conflict-recovery.json)。私有完整选择/预演/回执/保全快照留在忽略目录 `.local/t13-c3-20261027/`，不提交。
