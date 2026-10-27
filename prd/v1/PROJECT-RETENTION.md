# 项目草稿审核与原件留存 · T14.P4

2026-10-22 已实现并通过本地验收；第 21 份向前迁移已应用。沿用已批准 G1 设计，正式 UI 与 G4 验收后续独立进行。没有部署、真实凭证或定时器配置。

## 已实现的边界

商品仍为唯一项目根。`ProjectReviewRevision` 追加保存 `draft → submitted → returned / retained`，每次选择固定计划及每模块一份制作记录。可保存部分稿，缺必需项时不能整套提交/通过。退回明确模块和原因，补交产生新修订；旧稿不改。

新的版本化 manifest 使用 `kind=project_retention/schemaVersion=1`，独立于旧内容包 v1/v2，不改它们的形状或摘要。固定计划、共同设定、全部选定制作记录、精确方法/附件、原生内容修订、独立 experience authoring、实际体验资源与文件元数据。留存无需先有运行 release；`runtimeValidation=not_performed/publicationEffect=none/activationEffect=none`。

审核先校验实际字节，再在商品/内容/模块写锁内重新计算固定 manifest 和所有可变头版本。提交/批准必须匹配 `expectedRevision/expectedFingerprint/expectedFrontierFingerprint`；扫描期间或提交之后发生相关改稿，旧提交不能批准。审核记录、所选记录链接、审计与幂等缓存同事务提交。重复批准不复制留存版本。

## 原件导入

图片/视频继续使用已验证的 AssetFile。新增 `ProjectOriginalFile` 只处理计划文件槽位内的 ZIP、HTML、GLB 原件；100 MiB 上限，HTML 2 MiB，最多 20 个待完成上传。元数据、文件名/扩展、长度、SHA-256、容器结构与目标用途均验证；中断/失败/缺文件不标 AVAILABLE。

所有内容仍进入现有本地受控存储，按 UUID 分配文件名。ZIP 不落地解包，HTML 不执行，GLB 不加载为运行模板；不读取任意路径或来源 URL。ZIP 验证目录/本地条目边界，拒绝加密、多卷、超限、穿越及符号链接等成员；不宣称完成任意运行包的语义或运行验证。

管理员新增 `/api/admin/project-originals` 的 prepare、status、PUT content、complete 和 GET content。机器沿用现有五个上传工具，增加目标 `{type:project_original,planModuleId,outputKey,fileKey}`，仍受领域、工作区、固定槽位、票据、撤销与到期限制。只有服务端验证后的 fileId 才可用 `project_production_save` 的 `kind=original_file` 记录。体验制作 JSON、预览和外部地址均不能替代文件原件。

## 管理接口

- `GET/POST /api/admin/products/:id/project-reviews`：历史与保存部分/完整草稿。
- `POST /api/admin/products/:id/project-reviews/preview`：固定选择与当前头版本、真实文件校验。
- `GET /api/admin/project-reviews/:id`：读取固定审核修订。
- `POST /api/admin/project-reviews/:id/submit|return|retain`：严格预期版本及 fingerprint 的状态动作。
- `GET /api/admin/project-reviews/:id/files/:kind/:fileId/content`：按该版本取回 original/media/method，验证实际字节与固定摘要。

均保留管理员 Cookie/Origin/CSRF 校验，机器不能调用整套审核或下载接口。HTML/ZIP/GLB 下载强制 attachment，并加 `nosniff` 与 sandbox CSP。原件、方法附件和原生体验资源保留历史引用与清理保护；源地址失效、方法草稿修改或归档不改变旧 manifest/附件。

## 当前验证

13 项隔离集成测试已通过：新选题 → 候选方法 → 五领域产物/体验/资源/实际 HTML → 提交 → 指定模块退回 → 重提 → 留存；从零 3D GLB 原件；并发、跨范围、改稿冲突、缺件/损坏、中断/撤销、历史方法归档、真实 INSERT 故障回滚、ZIP 容器验证，以及官方 MCP SDK 的真实原件流式上传。商品保持 DRAFT，未新增运行 release 或全局 ACTIVE 方法。

完整回归为 API 314 + web 50 + SDK 19 = 383，全部通过；typecheck/build 和隔离/本地 schema diff 均通过。迁移后 65 模型，56 类原有业务表 1157 行旧字段摘要与旧迁移校验和保持一致；5 个历史 release、答卷与报告引用无缺项，临时数据库 0。日志 `.local/t14-p4/`。

没有新建持久工作区、机器凭证或业务样例，也未验证新的浏览器管理流程或远程/云条件。P5 继续补查同名新变体与真正重试并完成最终交接，正式 UI 按 G1 设计实现后停在 G4 供用户验收。
