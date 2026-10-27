# O3 外部制作与接续 · 具体设计评审

2026-10-23。O2 三张指定正式 UI 已获批准，记录见 [APPROVAL.md](../project-methods-o2-formal-20261022/APPROVAL.md)。本批按既有路线完成 O3 实码核查与具体交互设计，**停在 O3-A 新设计审核，尚未接正式页面/API**；O2 批准不自动覆盖这批新设计。

业务意义：制作中断后，运营者能看懂卡在哪里、保留已完成成果，再整理继续处理所需的依据。精确缺口、权限/状态/兼容边界及拟补接口职责见 [O3 能力契约](../../../prd/v1/PLATFORM-BUSINESS-ACCEPTANCE.md#o3-外部运行状态与失败恢复--核查和设计契约)。

## 这版如何操作

1. 一页看到各模块的当前情况、最后外部申报和已保存成果。将“尚未开始”“认领到期”“输入变化需复查”分开，成功成果继续保留。
2. 宣传视频原作业结果不明时，查看固定方法/输入、历史尝试、原 provider/jobId；整理原作业核对说明。已有客户端认领有效时，只查询依据，不准备抢占；历史代次只读。
3. 制作端已申报原作业终态，且当前权限、输入和限制允许时，整理携带原尝试标识的显式接续说明；真正的认领与后续动作由外部客户端明确发起。平台不查询第三方、不自动重试或调用模型。
4. “停止本批接续”明确只影响这份 run：先看影响、填原因并明确同意。已保存成果与历史回执保留；停止不会终止第三方作业，也不能恢复此份已停止 run。未知响应锁定修改，用原请求确认，不重复提交。
5. 恢复说明固定方法/输入/代次和原作业；只使用本批工作区内的有效连接，不包含凭据或认领 token。导出前重新核对，依据变化则撤销旧预览。二进制原件仍按授权另取，不宣称已自动下载或开始制作。

批次/阶段期限、次数或已知申报限额达到时不准备继续接续，保留成果交人工处理；未知费用不当成免费。首期只停止整份批次，不提供未经既有契约支持的单模块停止；不创建新 run、不扩大额度、不实现 O4 日程配置。

## 三张主要画面

维持 B 精密工具紫：暗色工作区、细边框、明确的状态色，左侧固定业务导航；正文在运营区域独立滚动。桌面 1600×1100，手机 390×844；另检查 360×780，不等于真机验收。

![桌面：制作状态、已有成果与处理依据](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/production-recovery-o3-20261023/desktop-overview.png>)

![桌面：停止本批接续的范围确认](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/production-recovery-o3-20261023/desktop-stop-confirm.png>)

![手机：按原作业整理核对说明](</Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/design-review/production-recovery-o3-20261023/mobile-recovery-handoff.png>)

## 其他画面

| 画面 | 核对内容 |
| --- | --- |
| [成功成果](desktop-preserved-output.png) / [需复查](desktop-needs-recheck.png) | 旧稿保留，变化不伪装成当前可采用成果 |
| [历史尝试](desktop-history.png) | 旧代次只读，不冒充当前接续目标 |
| [核对固定依据](desktop-recovery-check.png) / [说明](desktop-recovery-handoff.png) | 精确方法/输入与原 jobId，连接默认不选 |
| [连接不匹配](desktop-connection-blocked.png) | 其他工作区或已撤销连接不能整理交接 |
| [显式接续](desktop-explicit-retry.png) | 原尝试标识与外部客户端下一步，不自动认领 |
| [只读工作区](desktop-readonly.png) / [导出冲突](desktop-handoff-conflict.png) | 禁止越权，变化需重新核对 |
| [停止失败](desktop-stop-failure.png) / [结果未知](desktop-stop-unknown.png) / [已停止](desktop-stopped.png) | 原因保留、原请求恢复、成果保全 |
| [手机总览](mobile-overview.png) / [模块详情](mobile-module-detail.png) | 等价列表与可读的处理依据 |
| [手机核对](mobile-recovery-check.png) / [停止确认](mobile-stop-confirm.png) | 长内容与底部确认操作可达 |
| [运营区域滚动](mobile-operating-scroll.png) / [360px 交接](mobile-narrow-handoff.png) | 顶栏保持、无横向溢出、导航 Escape/焦点恢复 |

共 21 张图，主要桌面/手机画面已目视检查。可审原型源码为 [index.html](index.html)；展开底部“设计评审情境”可切换合成状态。正式商品页面尚未添加此入口。

## 验证范围与停止点

`node output/design-review/production-recovery-o3-20261023/check.mjs` 最终 26 项原型交互检查通过，页面错误/HTTP 请求均 0。覆盖两种等待、成功保留、需复查、历史只读、有效认领、原作业未知/终态、显式重试身份、错工作区/撤销、停止确认/失败/冲突/丢响应、当前页选择保护、导出依据变化、手机滚动/导航/焦点及窄屏。结果见 [verification.json](verification.json)。

这是独立原型，所有读取、停止、核验、复制/导出均为内存样例：业务 API 未连接，业务写入/真实凭据/系统剪贴板/实际下载/第三方查询/模型调用均 0。正式源码、迁移和依赖保持本批基线；原 O2 图像、README/verification 的 pending、设计与正式 UI 批准均保全。O2 既有 468 项、14 个正式页面情境、57 项旧回归仅是历史证据，本批不重复计算，也不用原型代替新的接口或权限验收。

当前只等待这批新设计批准，再按 O3-I 正式实现→O3-V 隔离 API/TEST 库及身份/剪贴板替身验证→O3-UI 正式界面验收；各关卡分别通过。O3 整体未关闭，O4 未启动。真实账户/持续授权/客户端/真机、云/付费/日程/发布仍独立批准，内容生成与模型档位比较继续暂停。
