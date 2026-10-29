# 任务归档

最近归档：2026-10-29。回到[当前按序任务](../README.md)。完整历史和已验证完成分开存放，归档文件不能作为新的执行入口。

## 完整完成任务

下列9项已按原任务范围验收；本地完成不自动扩展为云端/真机/商业完成，剩余范围已在当前队列持有。

| 原任务 | 归档原文 |
| --- | --- |
| T01 | [T01-foundation.md](completed/T01-foundation.md) |
| T02 | [T02-models-and-fixtures.md](completed/T02-models-and-fixtures.md) |
| T03 | [T03-catalog.md](completed/T03-catalog.md) |
| T04 | [T04-redemption.md](completed/T04-redemption.md) |
| T05 | [T05-test-runtime.md](completed/T05-test-runtime.md) |
| T07 | [T07-operations.md](completed/T07-operations.md) |
| T08 | [T08-functional-web.md](completed/T08-functional-web.md) |
| T12 | [T12-content-backoffice.md](completed/T12-content-backoffice.md) |
| T15 | [T15-experience-runtime.md](completed/T15-experience-runtime.md) |

## 新执行批次完成

[01 商品规划合同（T16.C2-A）](completed/01-product-plan-contract.md)于2026-10-27完成技术范围：555项、类型/构建和19项CUA自主检查通过；不关闭T16父任务或后续发布门禁。源码存档是独立维护动作，实际commit/push由Git回执证明。

[02 Skill服务端商品政策（T13.C2）](completed/02-skill-policy-validation.md)于2026-10-27完成技术范围：564项、类型/构建、24项离线检查和13项自主CUA通过；历史版本保持，后续03完成发布完整性，04旧库升级仍未完成。

[03 项目制作链与Three.js发布校验（T16.C2-B）](completed/03-threejs-publication-gates.md)于2026-10-27完成本地技术范围：581项、类型/构建、24项离线检查、7项实际本地恢复和17项自主CUA通过；开发库73表1508行原内容保持，迁移27→29。旧库升级/商品转制和真机仍由04/05/06/10持有。

[04 旧Skill和项目方法前向升级（T13.C3）](completed/04-skill-library-upgrade.md)于2026-10-28完成本地升级与逐项处置：594项、类型/构建、最终专项13项及16项自主CUA；选定四份旧方法追加为v2 DRAFT，全部六个旧版本字段/生命周期、四组合、三采用包和三份附件原件不变。73表1508→1521行，无reset/seed。新稿未启用或重绑，实际商品规划与方法使用仍由05/11持有。

[07云端应用适配（T09-I）](completed/07-cloud-adapters.md)于2026-10-28完成本地技术范围：626项、类型/构建、35项离线检查、12项初始化专项、最新Linux amd64维护镜像/TLS/非superuser权限/原29迁移、前端12协议与7项恢复通过。两类资源事件和恢复分别留证，原业务库73表1521行、29迁移、3文件摘要保持。真实云部署/认证/邮件/R2/恢复仍由08、真机由10持有，T09父项未归档完成。

## 混合任务已完成的部分

新增[05/06合成模板技术子批次](completed/05-06-synthetic-template-slice-20261028.md)：A实际制作链、B独立正交Three.js/报告、635项及26项自主CUA通过；正式转制与完整性能仍由active的05/06持有，不计为父任务完成。

后续[06首帧/活动/参考图恢复子批次](completed/06-first-frame-activity-recovery-slice-20261028.md)：最终36首帧、24活动、40卸载资源/静默及22恢复通过，636项/类型/构建通过；内存与真实hidden仍未完成，06不整体关闭。

[17根加载浅色闪屏子批次](completed/17-root-loading-flash-slice-20261028.md)：真实RED/GREEN、三个视口及107项/类型/构建通过；八类页面24张静态基线/首轮问题另留证，全站改造/完整状态与05/06前置保持，不算T18父项完成。

[17后台共享骨架与概览子批次](completed/17-admin-shell-overview-slice-20261028.md)：有效SSR RED/GREEN、108前端＋2隔离专项、类型/构建、21组同数据前后比较与20项CUA通过；实际修复导航层级、main/焦点、390px商品溢出及概览可读性，完整T18及05/06依赖保持。

[17商品/内容目录与工作台子批次](completed/17-admin-catalog-workbench-slice-20261029.md)：111前端＋2隔离专项、类型/构建、18组同TEST前后比较与36项CUA通过；缓存/失败/权限/冲突与未保存保护、固定历史、窄屏栏目已留证，其余后台/全站及05/06依赖保持。

[17素材/订单与操作错误恢复子批次](completed/17-admin-media-orders-slice-20261029.md)：111前端＋2隔离专项、类型/构建、21组同TEST前后比较与47项CUA通过；目录/预览/版本辨识、输入保留、权限隐藏、订单确认与同路由恢复已验证。只归档此范围，Skill/连接/项目、全站及05/06依赖保持。

见[已完成批次与证据](completed/BATCHES-20261026.md)：只归档实际完成的本地子批次，父任务的未完成项仍在 active 中。

[17 Skill目录/版本工作台子批次](completed/17-admin-skills-slice-20261029.md)：有效刷新RED/GREEN、112前端＋2专项、类型/构建、24组同TEST前后比较与28项CUA通过，保留草稿、权限隐藏、固定历史与手机跳转已有证据，继续连接配置/项目与完整状态。

## 历史快照

[T18测试夹具断连支持子批次](completed/17-test-fixture-disconnect-slice-20261029.md)：保留6b269c9真实失败run，旧源码/真实连接RED、新实现6项数据库/R2 GREEN及类型检查通过；只改测试清理，有界等待且仍拒绝活动会话，后续精确CI另验。

以下不是 completed：T06、T09、T10、T11、T13、T14、T16、T17 的完整旧文及重排前的总表/进度。旧时间点的 pending、暂停、批准、测试数字不改写；旧路线被本次[当前索引](../README.md)替代。

- [T06-accounts.md](history/2026-10-26/T06-accounts.md)
- [T09-cloud-validation.md](history/2026-10-26/T09-cloud-validation.md)
- [T10-final-ui.md](history/2026-10-26/T10-final-ui.md)
- [T11-commercial-launch.md](history/2026-10-26/T11-commercial-launch.md)
- [T13-style-skills.md](history/2026-10-26/T13-style-skills.md)
- [T14-mcp-ingestion.md](history/2026-10-26/T14-mcp-ingestion.md)
- [T16-immersive-products.md](history/2026-10-26/T16-immersive-products.md)
- [T17-interactive-evaluation.md](history/2026-10-26/T17-interactive-evaluation.md)
- [ROADMAP-before-replan.md](history/2026-10-26/ROADMAP-before-replan.md)
- [PROGRESS-through-20261026.md](history/2026-10-26/PROGRESS-through-20261026.md)
- [README-before-replan.md](history/2026-10-26/README-before-replan.md)
- [ROOT-README-before-replan.md](history/2026-10-26/ROOT-README-before-replan.md)

[新旧映射](../TASK-MAP.md)覆盖原46个未勾条目。来源/归档摘要见[archive-manifest.json](archive-manifest.json)；归档全文只修复 Markdown 相对链接，正文、复选框和原数字保持。旧 Txx 文件仅为兼容入口；历史 output 验收文件没有修改。
