# T12-A 内容底座交接

2026-10-19。实现范围为后端契约、创作设定修订、题库/素材历史、稳定引用、制作来源和混合存储元数据。后台编辑界面已由 [T12-B](CONTENT-WORKBENCH.md) 完成，成套采用与影响分析已由 [T12-C](CONTENT-ADOPTION.md) 完成；skill 库、MCP 和自动任务尚未实现。

后续状态（2026-10-20）：T13-A/B 的 [skill 库](STYLE-SKILLS.md) 与 [五用途绑定/来源](SKILL-BINDINGS.md) 已完成，下一批次 T14-L。

## 数据与版本

- `CreativeProfileRevision`：一个 Product 的不可变创作设定。`creativeProfileRevisionId` 是唯一共同依据，不另维护 brief 版本。保存使用最新序号的 expectedRevision，每次追加新记录。
- `ContentRevision`：复用 ProductVersion/CampaignAsset，数据库触发器捕获修订；旧维护 CLI 和 T07 API 同样保留历史。题目用修订 ID＋questionId，文案/分镜用修订 ID＋blockId/sceneId 定位。状态变化也保留快照。
- `ContentReference`：保存目标/来源修订、稳定位置、摘要、服务端提取的原文快照及实际使用文本，区分原文/改写。位置或摘要失效、商品/scope 不同、明确设定不一致、循环引用均拒绝。
- `ProductionRecord`：关联输出、设定、固定输入、实际管理员、申报来源和可选 batchKey。来源由操作者申报，审计记录实际写入者，不表示后台运行了模型。T12 原记录的 skillVersionId 为空；T13-B 新来源可关联固定组合及具体版本；batchKey 仅作来源分组，不是任务认领或执行队列。

独立 `ReportPlanDraftSchema` 随设定修订固定，包含稳定章节 ID、叙事和呈现要求，标记 runtimeSupport=authoring_only。旧 dimensions_v1 配置不接收这些新字段；新 renderer/双方作答仍待后续任务，原评分和个人报告快照不变。

## 媒体存储

- `authoring.media.localArchive` 登记归档编号、文件名、SHA-256、大小及可选尺寸/时长。允许大于上传上限的本地母版，因为没有上传字节；登记不等于后台已检查本地文件。
- 不接受绝对路径、本地路径字段或任意下载 URL。T14 本地适配器再按配置目录校验和传输文件。
- `authoring.media.previewFileId` 为经过 T07 上传/校验的预览文件，素材 `fileId` 为正式交付文件，分别校验版本、scope 和用途。
- `storage.localArchiveRegistered / previewUploaded / deliveryUploaded` 分别返回，后两项依据服务端文件记录。本机上传仍由 local 驱动保存，不宣称上云；旧 storageKey 占位不会被计为已上传。实际取文件仍处理缺失和读取错误。
- T07 媒体 review/ready 仍要求正式文件；本地原件/预览可先保存草稿。T12-B 已接入预览/正式文件编辑，采用稿流程与受控清理已由 T12-C 完成。

历史存储策略为本地/NAS 原件归档、平台按需保存预览/采用稿；这描述当时能力，不代表已满足最新原件留存要求。用户 2026-10-21 已确认后续由平台保存图片、视频、网页/3D 包等商品原文件及对应 skill 精确版本，外部地址仅作来源、不得唯一存储，待 T14-P 实现，见 [审查决策](CONTENT-PRODUCTION-REVIEW.md#5-产品决策与交接)。T12-C 已实现的清理预演/受控执行和历史元数据继续保留，任何当前/历史修订引用文件仍受保护，不绕过 verified file 的不可变约束；本轮不导入原件或执行迁移。

## HTTP 入口

以下位于 `/api/admin`，沿用已验证管理员、Cookie、Origin/CSRF、限流、scope 和 private/no-store，没有新身份入口。

| 方法/路径 | 作用 |
| --- | --- |
| GET/POST `/products/:id/creative-profiles` | 分页读设定；按 expectedRevision＋requestId 追加修订 |
| GET `/creative-profiles/:id` | 固定读取某份设定 |
| GET `/content-revisions`、`/content-revisions/:id` | 按商品/版本/素材/领域查询快照、输入与来源 |
| POST `/content-assets` | 原子保存结构化素材、引用及制作来源 |
| GET `/content-references` | 按 sourceRevisionId/targetRevisionId 查询基础上下游关系 |
| GET/POST `/production-records` | 查询来源；为题库修订登记来源和设定 |
| POST `/content-contexts/resolve` | 按设定、domain 和明确位置解析输入 |

具体字段以 `packages/contracts/src/content.ts` 为准。copy 正文使用 blocks，video/script 使用 scenes，cover 使用 title/description。创建不传 assetId 且 expectedRevision=0，修改传 assetId 和当前修订；写入均传 UUID requestId。相同请求返回同一结果，变更内容复用编号或旧修订写入会冲突。

旧 T07 文本接口拒绝绕过结构化编辑；仍可读取或合法流转状态。状态修订复制固定引用和原制作来源，重新编辑产生新草稿/来源，旧快照不变。

context 输入项为 `{ revisionId, digest, locator }`。视频/封面/文案读取 assessment 时须明确 questionId，仅返回题干和公开选项，不包含分值、阈值、完整私有报告模板或消费者记录；assessment 编辑用途可明确读取完整配置。当前调用者均为管理员，T14 还须独立检查机器的 domain 和逐项输入权限。

## 验证与迁移

```sh
pnpm test:content
pnpm test
pnpm typecheck
pnpm build
```

test:content 使用独立测试库、隔离身份事实及临时媒体目录，验证真实 PostgreSQL 和 HTTP，不算云 Auth/远程 MCP 验收。本机需执行新增迁移及 db:provision，不 reset 或重新 seed。

`20261019100000_content_foundation` 加表/列/索引/约束；`20261019101000_content_history_backfill` 单独回填快照。不改旧题目、订单、权益、答卷或报告。撤回应用时保留历史表、触发器与原文件，停用新编辑入口，以向前迁移修复；不自动删除历史。私有验证证据在 `.local/t12-a/`。
