# O2 商品方法与制作交接 · 正式 UI 验收

2026-10-22。按已批准的三张指定设计完成正式后台与必要 API，技术验证通过，**当前停在用户保留的 O2-UI 正式界面验收；O2 整体未关闭，O3/O4 未启动**。设计批准独立记录于 [APPROVAL.md](../project-methods-o2-20261022/APPROVAL.md)，原型源码、图像和交付时 pending 证据保持。

正常入口：[内容工作台](http://127.0.0.1:5173/admin/content)→已有商品→项目工作区→模块→“选择或另存制作方法”；方法详情也可进入。截图使用已回收的隔离样例，没有可继续访问的测试商品 URL。正常商品需要先有已保存计划，历史计划/运行/审核只读；页面不会自动生成内容。

## 本批实现

1. 按模块专业用途搜索真实基础 Skill，展示精确版本/修订、共享或本商品候选、归档与形式不兼容原因。默认不选方法，不静默换为最新版。
2. 填写文字/数字/布尔参数和商品补充，核对完整展开正文及参考附件，再明确同意固定为商品方法。商品定制追加历史，不修改共享库或旧方法。保存响应未知时锁定修改，用原请求确认；源冲突保留定制，重读后再次确认。
3. 为本次交接显式选择每用途的一份固定方法、每个直接依赖的一条精确记录及最小片段，选择已有连接。服务端检查当前计划、归属/权限/撤销/期限和真实必要原件/附件字节，导出时重新核验。
4. 复制无凭据制作说明或下载固定 JSON 清单。交接选择只留当前页，关闭/重开保留、刷新重新选择；没有“交接已保存”的运行记录，也不启动制作或安排日程。

清单保留真实商品名、计划/模块/共同设定、完整固定方法、最小输入与原件引用/摘要，不包含密钥、内部存储键、下载路径或个人答卷/报告。**当前 MCP 没有通用二进制原件下载工具；原件须管理员按授权另行取回供客户端使用。**复制或下载不等于客户端已接入、文件已自动下载或制作成功；实际工具调用仍重新核查授权。

桌面、手机使用同一套正式组件；运营区域独立滚动，固定侧栏/顶栏保持。切模块/用途/计划、关闭、切页签及浏览器返回有未保存保护。新样式仅作用于后台方法区域，本批商城及消费者源码保持基线。

## 核对画面

桌面 1600×1100、手机 390×844；手机为模拟视口，不代表真机验收。桌面选择/定制/确认、手机确认/交接已目视核对。

![正式桌面：基础方法选择](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/project-methods-o2-formal-20261022/desktop-method-picker.png>)

![正式桌面：完整方法固定确认](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/project-methods-o2-formal-20261022/desktop-confirm.png>)

![正式手机：制作交接](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/project-methods-o2-formal-20261022/mobile-handoff.png>)

| 画面 | 核对内容 |
| --- | --- |
| [商品定制](desktop-customization.png) / [手机定制](mobile-customization.png) | 类型参数、补充与完整正文 |
| [保存结果未知](desktop-unknown-save.png) | 原请求恢复，一份快照 |
| [固定方法](desktop-fixed-method.png) / [手机固定方法](mobile-fixed-method.png) | 持久快照回读、刷新后显式选择 |
| [另存新版本](desktop-new-version.png) | 共享库升级不改旧商品快照 |
| [数据库写入失败](desktop-insert-failure.png) | 真 SQL INSERT 回滚，原请求可重试 |
| [源版本冲突](desktop-source-conflict.png) | 保留定制，重新核对基础 |
| [输入缺项](desktop-handoff-blocked.png) / [其他工作区连接](desktop-handoff-wrong-workspace.png) | 服务端拒绝无效交接 |
| [桌面交接](desktop-handoff.png) / [撤销后导出](desktop-export-revoked.png) | 预览/导出均核查当前权限，不包含凭据 |
| [手机确认](mobile-confirm.png) | 长正文与确认操作可达 |
| [离开保护](desktop-unsaved-navigation.png) / [历史只读](desktop-historical.png) | 原草稿保留，旧计划不新固定 |

共 18 张图，完整情境和结果见 [verification.json](verification.json)。

## 实际验证与范围

| 检查 | 结果 |
| --- | --- |
| 全量测试 | API 380＋web 69＋SDK 19＝468，失败/跳过均 0 |
| 本批新增 | 16 项 API 集成、4 项 web 模型测试 |
| 类型/构建 | `pnpm typecheck`、`pnpm build` 均退出 0 |
| 正式页面浏览器 | 14 个情境、18 图；页面错误、非预期 HTTP、非本机网络均 0 |
| 既有业务浏览器回归 | 57 项通过，本轮最终进程退出 0 |
| 数据结构 | 71 模型/25 迁移，无新表/迁移，schema diff 无差异 |
| 数据保全 | 64 类表/1157 行旧字段、全部迁移及源 SQL 校验和、5 份 release/历史引用保持，临时库 0 |
| 开发授权与服务 | Codex 连接/分组凭据均 0；原 API 4100 ready、Vite 5173 均 200，未停止原服务 |

正式组件使用真实独立 Nest API/TEST 数据库，SupabaseAuthGateway 身份与剪贴板使用替身。真实 JSON 下载已验证；系统剪贴板/客户端配置写入均 0。测试 API/浏览器、TEST 库、文件与临时下载目录已回收，未使用真实登录账号、真实账户持续授权或真实客户端。

覆盖候选归属/精确历史/两用途、共享更新、并发计划与捕获、原请求恢复、真实 INSERT 故障回滚、源冲突、真实文件损坏、输入分页隐私、其他工作区/管理员/收窄权限/到期/撤销、Cookie/Origin/CSRF/普通用户及手机/焦点/未保存保护。SQL INSERT 500 为有意注入的故障，既有回归的资源/模块失败也属于显式回退测试。O2 测试读写预算为 3000，不声称正常限流或真实 Auth 接入通过。

没有模型调用、实际内容生成、真实权限签发/客户端接入、真机、云/付费/日程/发布、Goal、新分支/worktree、暂存/提交/推送或跨线程回信。本地完整工程证据为 `.local/o2-implementation/verification.json`，最新状态见 [PROGRESS](../../../prd/v1/PROGRESS.md) 和 [任务清单](../../../prd/v1/tasks/T14-mcp-ingestion.md)。

**本批只等待正式 UI 验收。**批准设计不自动通过正式 UI，当前不推进 O3，也不索取真实账户或客户端授权；内容生成与模型档位比较继续暂停。
