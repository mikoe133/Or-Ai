# T18 后台覆盖矩阵（体验与结果呈现恢复子批次后）

2026-10-30。30个后台表面中18项有代表状态最终证据、8项局部、3项未独立审计、1项外部范围。代表状态通过不等于所有状态通过；完整T18及05/06继续。详见[机器矩阵](coverage-after.json)。

| 表面 | 入口 | 分类 | 剩余边界 |
| --- | --- | --- | --- |
| access-shell | `/admin/*` | 代表状态有最终证据 | Every route re-entry on overview/account transient/access errors is not separately proven. |
| overview-audit | `/admin` | 代表状态有最终证据 | Dedicated audit detail/error/filter combinations remain to be enumerated. |
| products | `/admin/products` | 代表状态有最终证据 | All create/version transition dialogs and unknown save results are not exhaustively covered. |
| assets | `/admin/assets` | 代表状态有最终证据 | Actual upload/download bytes and every review/ready/archive transition need their own scope. |
| orders | `/admin/orders` | 代表状态有最终证据 | Actual issuance/refund/CSV commit not executed by T18 design checks. |
| content-index | `/admin/content` | 代表状态有最终证据 | No assertion of every combined filter/page state. |
| content-project | `/admin/content/:productId?tab=project` | 代表状态有最终证据 | All graph/record/history nested states are not proven. |
| content-profile | `/admin/content/:productId?tab=profile` | 代表状态有最终证据 | Dedicated profile diff nested denial and all restoration states remain. |
| content-skills | `/admin/content/:productId?tab=skills` | 局部 | Skill-set editor is separate from the five standalone Skill libraries; requires direct refresh/access/conflict/history audit. |
| content-assessment | `/admin/content/:productId?tab=assessment` | 代表状态有最终证据 | Actual accepted version/source writes, a changed remote base while dirty, nested bound Skill reads, and every history/identity combination remain unverified by this read-only UI slice. |
| content-experience | `/admin/content/:productId?tab=experience` | 代表状态有最终证据 | Real accepted save/review/upload bytes, released-version combinations, remote revision changes while dirty, paginated history beyond the fixture, and every identity/route combination remain outside this read-only representative UI slice. |
| content-result | `/admin/content/:productId?tab=result` | 代表状态有最终证据 | Real accepted save/review/upload bytes, released-version combinations, remote revision changes while dirty, paginated history beyond the fixture, and every identity/route combination remain outside this read-only representative UI slice. |
| content-cover | `/admin/content/:productId?tab=cover` | 局部 | Cover asset editor and nested references/files are not covered by the standalone media catalog. |
| content-video | `/admin/content/:productId?tab=video` | 局部 | Scene editor, source references and file states require direct audit. |
| content-copy | `/admin/content/:productId?tab=copy` | 局部 | Copy blocks, source references and file states require direct audit. |
| content-preview | `/admin/content/:productId?tab=preview` | 未独立审计 | Suite preview/public sample and protected media states have no dedicated final three-viewport/interaction batch. |
| content-history | `/admin/content/:productId?tab=history` | 局部 | Top history screenshot does not verify impact/links/diff/detail nested errors. |
| content-adoption | `/admin/content/:productId?tab=adoption` | 未独立审计 | Preview/package history/selected package/errors/unknown adoption require direct audit. |
| content-cleanup | `/admin/content/:productId?tab=cleanup` | 代表状态有最终证据 | Running/expired plan transitions, actual object bytes, accepted cleanup writes and every cross-route identity failure are not individually verified by this read-only UI batch. |
| methods | `/admin/content/:productId?tab=project (methods query state)` | 代表状态有最终证据 | Real successful capture/export/recovery with actual identity/attachments remains external; not a new route. |
| run-operations | `/admin/content/:productId?tab=project (run-operations query state)` | 代表状态有最终证据 | Real successful capture/export/recovery with actual identity/attachments remains external; not a new route. |
| skills-assessment | `/admin/skills/assessment` | 代表状态有最终证据 | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-experience | `/admin/skills/experience` | 代表状态有最终证据 | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-cover | `/admin/skills/cover` | 局部 | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-video | `/admin/skills/video` | 局部 | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| skills-copy | `/admin/skills/copy` | 局部 | Shared library/editor behavior has evidence; domain-specific inputs/attachments/policies are not all separately proven. |
| connections | `/admin/machine` | 代表状态有最终证据 | Actual credential issuance/revocation not performed; no inferred permission expansion. |
| configurations | `/admin/machine/configurations` | 代表状态有最终证据 | Actual client import/schedule activation remain external; configurations stay disabled. |
| admin-not-found | `/admin/* (unknown child)` | 未独立审计 | Dedicated not-found recovery/focus/three-viewport audit remains. |
| external-cloud-client | `08 / 09 / 14 / 15` | 外部范围 | Real cloud identities/files, clients, content jobs and schedules remain in their original tasks. |
