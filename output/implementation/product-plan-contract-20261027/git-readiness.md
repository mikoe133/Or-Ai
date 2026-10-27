> 2026-10-27后续：用户已授权把当前项目全部安全改动提交并正常推送，覆盖此前“仅01/261候选/不push”的范围限制。下文提交待确认与最小化建议保留为授权扩大前的历史分析，不再是执行限制。实际存档结果以本轮Git回执为准；555项技术证据保持。

# 01 本地提交范围核对

日期：2026-10-27。当前分支 `mikoe33/t06-local-operations`，HEAD `40c39deca7f288a8b8448962b06160cb6dc1bcbc`。尚无本批commit；暂存区未变，所有既有改动保留。

01技术验证已完成：最终555项、类型/构建及19项CUA通过。以下仅做只读依赖分析，暂停commit，供父会话向用户确认扩展范围；不会把patch文件当成代码提交。

## HEAD缺失的10个直接底座

| 路径 | 01为何依赖 | 此前批次 |
| --- | --- | --- |
| `apps/api/test/production-plans.test.ts` | 01 adds v2/history/reference tests to the existing P1/G5–G7 plan and canvas integration harness. | T14-P1/P2 / T10-G5–G8 |
| `apps/api/test/machine-projects.test.ts` | 01 adds v2 admin↔official-SDK and concurrency tests to the existing P3 workspace/bootstrap/grant harness. | T14-L/P3–P5/W1–W2 / T16-B/C1 tool evolution |
| `apps/api/src/operations/production-plan-inspection.ts` | The existing P1/P2 inspection function is the entry for v2 pending/declared-evidence warnings. | T14-P1/P2 / T10-G5–G8 |
| `apps/api/src/operations/production-plans.service.ts` | The existing P1 save/read/validate transaction owns immutable plan revisions, administrator checks, idempotency and G5 canvas persistence. | T14-P1/P2 / T10-G5–G8 |
| `apps/web/src/admin/project-planning.tsx` | The G6/G7 planning session owns draft preservation, save intents, revision conflicts and layout state used by the new panel. | T10-G1–G8 / T14-O2/O3 workspace integration |
| `apps/web/src/admin/project-planning-model.ts` | G6/G7 module/dependency/layout helpers are extended with v2 defaults and exact runtime identity. | T10-G1–G8 / T14-O2/O3 workspace integration |
| `apps/web/src/admin/project-workspace.tsx` | The G1–G8 workspace mounts the new panel; its existing O2/O3 imports require method/run UI dependencies. | T10-G1–G8 / T14-O2/O3 workspace integration |
| `packages/mcp/src/project-tools.ts` | P3 project tool registration exposes the shared plan contracts over the existing five-domain SDK transport. | T14-L/P3–P5/W1–W2 / T16-B/C1 tool evolution |
| `packages/contracts/src/production-plans.ts` | P1/G5 immutable plan/module/layout contracts are extended by the strict v1/v2 union. | T14-P1/P2 / T10-G5–G8 |
| `packages/contracts/src/machine-projects.ts` | P3 bootstrap and plan tools must consume the same strict versioned plan schema. | T14-L/P3–P5/W1–W2 / T16-B/C1 tool evolution |

另有已跟踪的 `packages/contracts/src/admin.ts`：01只新增一项导出，但整文件还含更早契约拆分/导出，必须按片段处理。原版本由任务起点摘要精确复核。

## 可机器核对的具体范围

- [commit-dependencies.json](commit-dependencies.json)记录每条路径、HEAD有无、工作区状态、SHA-256、任务起点摘要（已记录者）、导入来源、依赖理由和批次；其requiredChanges不是整文件暂存许可。
- [minimal-feature-paths.txt](minimal-feature-paths.txt)：以当前API/Web/MCP入口、共享契约、01相关测试及包/模型/连续迁移为根，静态导入闭包得到233个有改动的候选路径，其中7个是01新源码，226个含历史底座或混合改动。原HEAD提供的未变文件无需重复提交。
- 保留现有完整555回归范围还需清单中的35个额外文件，形成268个有改动路径：7个01新源码＋261个历史/混合路径（200个未跟踪，61个已跟踪需片段审阅）。见[完整历史候选](required-history-paths.txt)。
- 346行普通Git状态展开为1610个文件；[排除清单](excluded-history-paths.txt)保留1342个不在上述构建/测试/UI依赖根中的改动，包括大批历史输出、设计图、云部署准备和运行数据；不能默认纳入。必要01任务记录/说明单独审阅，不借正文链接把历史output或样例数据装进提交。

该233是已列明入口与接口保持不变时的静态路径候选，不是已证明的绝对最小片段集。61个已跟踪文件中哪些历史hunk必须进入，尚需在获准的候选快照中验证；当前555结果属于工作树，不能宣称候选提交已经可复现。通过改入口删除历史功能来缩小范围会形成另一份未验证实现，本轮没有这样操作。

关键额外底座包括：`apps/api/src/operations/operations.module.ts` 的项目/方法/运行服务入口；`apps/api/prisma/schema.prisma` 的相关模型及前序迁移；`apps/api/scripts/local-database.ts` 的受限权限初始化；契约barrel/子路径export；`packages/mcp/package.json`、CLI与传输/工具；Web项目图、方法/运行界面、对应CSS；根package/lock及Three.js、React Flow、MCP SDK依赖。每个具体文件均在JSON内列明。若遗漏前序 `20261021030000_production_plans/migration.sql`，01迁移引用的表在HEAD不存在；若仅新增7文件，类型/入口同样不完整。

## 待用户选择

1. 推荐：授权把必要历史底座按该清单及片段核对单独整理成本地基线提交，再应用01精确增量并单独提交；对两个实际快照分别验证后报告commit ID。先扩展授权，再决定具体历史hunk，保留其他改动。
2. 保持“只允许01”范围：暂缓commit，保留工作树、基线、补丁与证据；技术前置已满足的02可以按既有授权独立推进，Git范围另行确认。

两种方案均未执行。没有提交所有346行状态，没有push/合并/发布/部署，也未制造残缺的“01完成”代码快照。
