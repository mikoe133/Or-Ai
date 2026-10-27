# O3 外部制作与接续 · 正式 UI 验收

2026-10-23。按已批准的运行总览、恢复核对说明、手机停止确认三张设计接入正式后台和业务接口；设计批准独立记录见 [APPROVAL.md](../production-recovery-o3-20261023/APPROVAL.md)。**正式 UI 待独立验收，O3 整体未关闭，O4 未启动。**原型源码、图像和交付时 pending 保持，不能用设计批准代替本轮正式 UI 批准。

正常入口：[内容工作台](http://127.0.0.1:5173/admin/content)→已有商品→项目工作区→“外部制作与接续”→明确选择已有制作批次。没有批次时显示空状态，不自动创建 run。截图是已回收的隔离样例，没有可继续访问的测试商品 URL；正常开发服务没有本轮测试连接或成果。

## 本批实现

- 服务端分别解释尚未开始、缺输入、有效认领、认领到期、最后制作端申报、输入/成果需复查、批次/阶段期限、次数/并发/已知申报额度和连接状态。页面使用服务端核对结果，不凭浏览器时间或旧回执推断当前授权。
- 保存成果单独展示，包括非最新尝试留下的成功记录；可回读固定记录和按权限取回原件。停止或需复查不删除旧稿、方法、文件、事件与审核依据，也不把旧稿冒称当前可采用成果。
- 停止前读取真实影响，填写原因并明确同意，只停止当前管理员所属工作区的一份精确批次。与原 MCP 停止共用批次锁和取消逻辑；冲突重新确认，失败或未知响应保留原请求核对，不重复取消或产生多条审计。
- 恢复只整理当前尝试的原方法、原依赖记录、明确选择的最小片段与已有连接。原作业未知时先按原 provider/jobId 查询；有效认领不抢占；已报告终态且条件允许时才整理显式 retryOfAttemptId 说明。历史代次只读，新代次不自动沿用旧选择。
- 预览和复制/导出都重新核验状态、权限、代次、固定摘要与真实原件/附件字节。复制得到无凭据 manifest，JSON 下载含 `{digest, manifest}`；二进制原件仍按授权另取。计划头变化时仍固定原作业使用的旧计划/输入，不静默换成新版。
- 既有 W 批次中同用途的多份固定方法可按原组合恢复，最多 12 份；内部恢复读取独立兼容，O2 新选择仍每用途一份、最多两份。真实三份同用途旧组合的恢复/导出完整保留，不新增尝试。

停止不会终止第三方作业，不复活或扩限此 run。旧独立草稿/上传入口仍遵循原权限与修订规则，不宣称平台停止会关闭所有写入。恢复说明不发起认领、不签发 leaseToken、不查询第三方、不调用模型/生成工具，也不启动日程；实际外部调用仍重查权限和 nextAction。过期或限额时不输出继续制作步骤，未知费用不当成免费。

交接选择只保留当前页面，刷新重新选择；关闭/离开需处理未确认选择。页内 Back 和跨文档离开的浏览器原生确认均已验证，取消离开保留当前选择。手机与桌面使用同一套正式组件，正文和长弹窗在运营区域内滚动，侧栏/顶栏保持，新 CSS 仅作用于后台运行区域。

## 三张主要画面

桌面 1600×1100、手机 390×844 模拟视口；不是实体手机验收。

![正式桌面：运行状态、保存成果与原作业](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/production-recovery-o3-formal-20261023/desktop-overview.png>)

![正式桌面：恢复核对说明](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/production-recovery-o3-formal-20261023/desktop-recovery-handoff.png>)

![正式手机：停止本批接续确认](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/production-recovery-o3-formal-20261023/mobile-stop-confirm.png>)

| 其他画面 | 核对内容 |
| --- | --- |
| [固定成果](desktop-preserved-output.png) / [历史代次](desktop-history.png) | 旧成果可读，旧代次不能恢复 |
| [恢复依据](desktop-recovery-check.png) / [工作区不匹配](desktop-connection-blocked.png) | 连接默认不选、最小片段明确勾选、服务端拒绝错范围 |
| [新代次冲突](desktop-handoff-conflict.png) / [撤销后导出](desktop-export-revoked.png) | 已准备的说明不能绕过当前核验 |
| [停止确认](desktop-stop-confirm.png) / [真实 SQL 失败](desktop-stop-failure.png) | 原因和明确同意、实际回滚后用原请求重试 |
| [停止结果未知](desktop-stop-unknown.png) / [停止后](desktop-stopped.png) | 成功响应丢失后恢复一条取消/审计，已有成果保留 |
| [手机总览](mobile-overview.png) / [模块详情](mobile-module-detail.png) | 同一真实状态、等价模块选择 |
| [手机核对](mobile-recovery-check.png) / [核对说明](mobile-recovery-handoff.png) | 长输入、固定引用和底部操作可达 |
| [运营区域滚动](mobile-operating-scroll.png) / [离开保护](mobile-unsaved-navigation.png) | 顶栏固定、原生离开确认和选择保留 |
| [输入需复查](desktop-needs-recheck.png) / [显式接续](desktop-explicit-retry.png) / [批次到期](desktop-expired.png) | 原输入保留、外部客户端明确发起、不得复活或扩限 |

共 22 张图，完整情境见 [浏览器结果](verification.json)。主要桌面/手机画面已目视检查。

## 技术验证

| 检查 | 实际结果 |
| --- | --- |
| 全量测试 | API 400＋web 69＋SDK 19＝488，失败/跳过均 0 |
| 新接口专项 | 20 项集成检查，含真实 SQL 回滚、并发停止、旧成功成果、旧多方法组合、权限/时限/预算和真实文件损坏；与 O2 既有 16 项合计 36 项兼容专项通过 |
| 类型/构建 | `pnpm typecheck`、`pnpm build` 均退出 0 |
| 正式页面 | 17 个情境、22 图；页面错误、非预期 HTTP、非本机网络均 0 |
| 既有浏览器回归 | 本轮 57 项通过，最终进程退出 0 |
| 数据结构 | 71 模型/25 迁移，无新表/迁移，schema diff 无差异 |
| 数据保全与清理 | 64 类表/1157 行旧字段、25 迁移校验和、5 份 release/历史引用保持；临时库与开发库新增连接均 0 |

正式组件使用独立 Nest API/TEST 数据库与实际业务服务。SupabaseAuthGateway 身份与剪贴板使用替身；未用真实登录账号，没有签发真实账户持续访问或写客户端配置。真实 PNG/方法文本仅为测试文件，不是本轮内容生产。测试使用受控业务时钟与读写预算 3000，不声称正常限流、真实 Auth、真机或外部工具执行通过。

一次数据库 UPDATE 500 是有意注入的停止回滚测试；成功响应丢失也由传输替身模拟。系统剪贴板写入 0，真实临时 JSON 下载已核验并删除；测试 API/浏览器、TEST 库和文件目录均自动回收。

当前按用户保留的关卡停在 O3-UI。没有新模型/迁移、后台生成 worker、实际内容生成、模型比较、真实权限/客户端/真机、云/付费/日程/发布、Goal、新分支/worktree、暂存/提交/推送或跨线程回信。完整本地工程证据记录于 `.local/o3-implementation/verification.json`，最新状态见 [PROGRESS](../../../prd/v1/PROGRESS.md) 与 [任务清单](../../../prd/v1/tasks/T14-mcp-ingestion.md)。
