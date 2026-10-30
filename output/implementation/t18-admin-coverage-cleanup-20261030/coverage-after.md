# T18 后台覆盖矩阵（文件清理子批次后）

2026-10-30。30个审计表面包含路由、页签、领域和查询状态，不是30个独立页面。四份入口源码共有44条Route声明，其中14条属于后台入口及嵌套声明；其余含商城、认证和预览。源码摘要见[JSON](coverage-after.json)。

当前15项有代表性最终证据，11项仅父级或局部证据，3项尚无独立审计，1项由真实外部任务持有。**代表状态通过不等于该表面的每个状态通过，更不等于整个后台或T18完成。**

| 表面 | 实际入口 | 覆盖分类 | 已封存或本批证据 | 剩余边界 |
| --- | --- | --- | --- | --- |
| access-shell | `/admin/*` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-shell-20261028](../../../output/implementation/t18-admin-shell-20261028/verification.md) | Every route re-entry on overview/account transient/access errors is not separately proven. |
| overview-audit | `/admin` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-shell-20261028](../../../output/implementation/t18-admin-shell-20261028/verification.md) | Dedicated audit detail/error/filter combinations remain to be enumerated. |
| products | `/admin/products` | 代表状态有最终源码、三视口和交互证据 | [t18-catalog-content-20261029](../../../output/implementation/t18-catalog-content-20261029/verification.md)、[t18-admin-media-orders-20261029](../../../output/implementation/t18-admin-media-orders-20261029/verification.md) | All create/version transition dialogs and unknown save results are not exhaustively covered. |
| assets | `/admin/assets` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-media-orders-20261029](../../../output/implementation/t18-admin-media-orders-20261029/verification.md) | Actual upload/download bytes and every review/ready/archive transition need their own scope. |
| orders | `/admin/orders` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-media-orders-20261029](../../../output/implementation/t18-admin-media-orders-20261029/verification.md) | Actual issuance/refund/CSV commit not executed by T18 design checks. |
| content-index | `/admin/content` | 代表状态有最终源码、三视口和交互证据 | [t18-catalog-content-20261029](../../../output/implementation/t18-catalog-content-20261029/verification.md) | No assertion of every combined filter/page state. |
| content-project | `/admin/content/:productId?tab=project` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-project-20261030](../../../output/implementation/t18-admin-project-20261030/README.md) | All graph/record/history nested states are not proven. |
| content-profile | `/admin/content/:productId?tab=profile` | 代表状态有最终源码、三视口和交互证据 | [t18-catalog-content-20261029](../../../output/implementation/t18-catalog-content-20261029/verification.md) | Dedicated profile diff nested denial and all restoration states remain. |
| content-skills | `/admin/content/:productId?tab=skills` | 仅父级、共享或部分证据 | 无独立最终批次 | Skill-set editor is separate from the five standalone Skill libraries; requires direct refresh/access/conflict/history audit. |
| content-assessment | `/admin/content/:productId?tab=assessment` | 仅父级、共享或部分证据 | 无独立最终批次 | Config/source nested reads and draft retention require direct audit. |
| content-experience | `/admin/content/:productId?tab=experience` | 仅父级、共享或部分证据 | 无独立最终批次 | Workspace/history/action access and ordinary failure require direct audit. |
| content-result | `/admin/content/:productId?tab=result` | 仅父级、共享或部分证据 | 无独立最终批次 | Both result paths and product-specific report controls require direct audit. |
| content-cover | `/admin/content/:productId?tab=cover` | 仅父级、共享或部分证据 | 无独立最终批次 | Cover asset editor and nested references/files are not covered by the standalone media catalog. |
| content-video | `/admin/content/:productId?tab=video` | 仅父级、共享或部分证据 | 无独立最终批次 | Scene editor, source references and file states require direct audit. |
| content-copy | `/admin/content/:productId?tab=copy` | 仅父级、共享或部分证据 | 无独立最终批次 | Copy blocks, source references and file states require direct audit. |
| content-preview | `/admin/content/:productId?tab=preview` | 尚无独立最终审计 | 无独立最终批次 | Suite preview/public sample and protected media states have no dedicated final three-viewport/interaction batch. |
| content-history | `/admin/content/:productId?tab=history` | 仅父级、共享或部分证据 | [t18-catalog-content-20261029](../../../output/implementation/t18-catalog-content-20261029/verification.md) | Top history screenshot does not verify impact/links/diff/detail nested errors. |
| content-adoption | `/admin/content/:productId?tab=adoption` | 尚无独立最终审计 | 无独立最终批次 | Preview/package history/selected package/errors/unknown adoption require direct audit. |
| content-cleanup | `/admin/content/:productId?tab=cleanup` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-coverage-cleanup-20261030](../../../output/implementation/t18-admin-coverage-cleanup-20261030/README.md) | Running/expired plan transitions, actual object bytes, accepted cleanup writes and every cross-route identity failure are not individually verified by this read-only UI batch. |
| methods | `/admin/content/:productId?tab=project (methods query state)` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-methods-runs-20261030](../../../output/implementation/t18-admin-methods-runs-20261030/README.md) | Real successful capture/export/recovery with actual identity/attachments remains external; not a new route. |
| run-operations | `/admin/content/:productId?tab=project (run-operations query state)` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-methods-runs-20261030](../../../output/implementation/t18-admin-methods-runs-20261030/README.md) | Real successful capture/export/recovery with actual identity/attachments remains external; not a new route. |
| skills-assessment | `/admin/skills/assessment` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-skills-20261029](../../../output/implementation/t18-admin-skills-20261029/README.md) | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-experience | `/admin/skills/experience` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-skills-20261029](../../../output/implementation/t18-admin-skills-20261029/README.md) | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-cover | `/admin/skills/cover` | 仅父级、共享或部分证据 | [t18-admin-skills-20261029](../../../output/implementation/t18-admin-skills-20261029/README.md) | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-video | `/admin/skills/video` | 仅父级、共享或部分证据 | [t18-admin-skills-20261029](../../../output/implementation/t18-admin-skills-20261029/README.md) | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-copy | `/admin/skills/copy` | 仅父级、共享或部分证据 | [t18-admin-skills-20261029](../../../output/implementation/t18-admin-skills-20261029/README.md) | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| connections | `/admin/machine` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-connections-20261030](../../../output/implementation/t18-admin-connections-20261030/README.md) | Actual credential issuance/revocation not performed; no inferred permission expansion. |
| configurations | `/admin/machine/configurations` | 代表状态有最终源码、三视口和交互证据 | [t18-admin-connections-20261030](../../../output/implementation/t18-admin-connections-20261030/README.md) | Actual client import/schedule activation remain external; configurations stay disabled. |
| admin-not-found | `/admin/* (unknown child)` | 尚无独立最终审计 | 无独立最终批次 | Dedicated not-found recovery/focus/three-viewport audit remains. |
| external-cloud-client | `08 / 09 / 14 / 15` | 真实外部条件另行持有 | 无独立最终批次 | Real cloud identities/files, clients, content jobs and schedules remain in their original tasks. |

后续优先顺序：商品内容/结果交付的配置与来源读取 → 体验及其历史 → Skill组合 → 封面/视频/文案编辑器和嵌套引用 → 成套采用/整套预览/历史明细 → 概览审计及父级重入、未知后台地址。每项仍须取得实际故障、修复、交互与适用视口证据。商城审核、05/06和08/09/13–15保持原状态。
