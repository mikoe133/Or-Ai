# T15：体验与报告运行及制作入口

日期：2026-10-21。T15-A/B 已验收，用户已批准 T15-B 界面。T16-A 新增安静小屋/手记组合，335 项测试与 57 项完整浏览器流程通过；具体新画面待本批 UI 审核，真实手机/内置浏览器另验。任务与排期见 [T15](tasks/T15-experience-runtime.md)、[ROADMAP](ROADMAP.md)，试点见 [QUIET-ROOM-PILOT](QUIET-ROOM-PILOT.md)。

## 当前能力

体验清单与私有 `ProductConfigurationSchema` 分开。已有商品继续使用 `dimensions_v1`、`single_choice_v1` 和 `report_content_v1`，不向旧配置增加未知字段，不向前端返回分值、权重、阈值或报告生成模板。静态注册组合为 `dom-choice@1` + `legacy-text@1`，以及 T16-A 新增的 `quiet-room@1` + `field-notes@1`；混搭、未知版本及超预算组合在发布和运行读取时拒绝。旧版本继续固定原模板。

每个商品版本固定一份不可变 `ExperienceRelease`。清单保存内容版本、固定创作设定引用、情绪/理解目标、意象/语言、体验/报告模板版本、主题标识与修订、场景/题目/选项映射和资源摘要。已有历史版本的创作设定可为空；不会取最新设定冒充历史依据。发布时验证全部题目及选项按原顺序完整覆盖，设定必须与内容版本一致。主题只固定标识和修订，T15-B 可编辑这两项，尚无实际画风/样式编辑器。

答卷通过复合外键锁定同范围、同商品版本的 release，保存答案和检查点在同一事务内完成。选中选项后仍需明确点击“保存答案”；本地未提交选择不算进度。刷新以后从已保存答案与服务端修订恢复到首个未答题；幂等重试或冲突不能覆写新的回答。已完成答卷在原始答案清理后仍保持完成，报告快照独立保留。

报告生成时捕获 release、内容 schema、renderer 与主题，之后不可改写。报告内容、分数、样本统计、导出/删除与保存期沿用现有服务；重复提交返回原报告，只消费一次权益次数。

## 运行与资源接口

| 接口 | 返回/行为 |
| --- | --- |
| `POST /api/attempts`、`GET /api/attempts/:id/questions` | 原有题目/答案字段，加可选 `experience: { release, checkpoint }` |
| `PUT /api/attempts/:id/answers/:questionId` | 原确认保存，加可选服务端 `checkpoint` |
| `POST /api/attempts/:id/submit`、`GET /api/reports/:id` | 原报告快照，加可选 `presentation` |
| `GET /api/attempts/:id/resources/:resourceId` | 按答卷权益读取该固定清单中的文件，支持 Range |
| `GET /api/reports/:id/resources/:resourceId` | 同时验证报告与权益可读后读取固定资源，支持 Range |

资源接口沿用浏览器身份、范围、所有权、过期和退款撤权检查，使用 `private, no-store`。不会用任意 fileId、URL 或客户端声明的发布版本读取文件。读取前重查真实文件签名、大小、MIME 与 SHA-256；报告过期/删除或权益过期/撤销时停止访问。

`ExperienceResource` 使用独立的运行用途和固定 release/file 引用，保护历史文件不进入受控清理候选；清理执行前也重查引用。T15-A 复用已有可验证图片文件，未扩展原媒体上传的类型白名单。

| 用途 | 当前状态 |
| --- | --- |
| `illustration`、`texture` | 基线允许 PNG/JPEG/WebP；单份最多 4 MiB，整份清单最多 8 项、合计 16 MiB |
| `model`、`audio`、`font` | 仅预留严格用途/MIME 契约；当前 renderer 拒绝，上传/制作/播放尚未启用 |

浏览器资源请求有时间和大小上限，校验摘要后才创建临时图片 URL，离开/切换降级时释放。资源权限失败还会重新读取答卷，避免把权益撤销误当作可继续的资源故障。

## 宿主与兼容回退

`apps/web/src/experience/` 内注册并懒加载 DOM 单选和旧图文报告模块，复用原答题/报告业务。模板、资源或图片解码失败时回到同内容简化呈现，也可手动选择简化界面。回退保留当前选择、已确认答案、答卷与权益，不创建第二份答卷或重新生成报告。报告模块失败时使用同一结构化报告内容和固定主题元数据。

已有 DTO 的新增字段可选，旧响应仍能以兼容模式显示。商城、账户与后台的设计继续沿用已有页面；本批只接入答题与报告宿主。

## 数据迁移与后续

第十六份向前迁移 `20261021010000_experience_runtime` 新增两表和答卷/报告运行字段，回填已发布/归档版本及既有答卷/报告的固定引用。新发布版本由触发器生成默认清单，发布事务再做兼容校验；未注册形式回滚。运行账户不能 UPDATE/DELETE 两张新表，数据库触发器同时保护 release、资源绑定、答卷 release 和报告呈现的不可变性。

迁移不改既有计分配置、答案、报告内容、制作来源或采用包。验收记录和数据保留摘要见 [PROGRESS](PROGRESS.md)，私有运行日志在 `.local/t15-a/`。新增回归覆盖明确确认/冲突/恢复、相同输入评分一致、历史报告、资源完整性/所有权/撤权/过期、模块失败与移动端降级、不重复消费。

T15-B 在下节记录制作入口。任意新报告方案、主题或上传成功仍不代表新形式可发布。网页/2.5D 试点在 T16-A，Three.js 在 T16-B，新答案与评估机制在 T17。

## T15-B 制作入口（已验收，界面已批准）

内容工作台增加「体验与报告」页签，运营人员可配置交互/报告模板、主题标识与修订、题目到场景/选项到对象映射、插画/纹理，以及场景设计与报告呈现两种固定方法。页面沿用后台 B 精密工具紫，支持手机宽度、历史修订查看、跨页签未保存保护、显式读取最新稿和冲突处理。

保存只追加 `draft` 修订；审核再追加一份 `reviewed` 修订。每份固定题库配置摘要、创作设定、情绪/理解目标、报告方案、方法版本及其完整快照、资源元数据与制作来源。已归档方法只允许在相同设定和相同用途下保留。机器来源与请求由服务端记录，手工不能填入已核实 MCP 身份。

发布仍由现有人工商品流程执行：只捕获最新、已审核且与当前题库配置/固定设定兼容的修订，`ExperienceRelease.authoringRevisionId` 指向该精确历史。内容、设定、方法附件或资源不一致时拒绝发布；有 authoring 的版本不能退回默认清单绕过审核。旧版本没有 authoring 时继续生成兼容默认清单，已发布版本和旧报告不改写，更新使用新内容版本。

四类交付物及原五用途 Skill 组合的结构保持兼容。`ProductionDomainSchema` 增加可选 `experience` 制作领域，`scene_design` / `report_presentation` 两用途独立固定方法；没有给原四交付物或五用途组合强加第六项。后台 Skill 库和 MCP 连接管理可选择该领域。

体验资源使用独立 `AssetKind.EXPERIENCE`，不借用宣传封面的身份。上传、完成与发布均核验实际 PNG/JPEG/WebP、大小和摘要，单份 4 MiB、最多 8 项/合计 16 MiB。`ExperienceAuthoringResource` 保护所有历史草稿的文件引用，移除当前资源不使历史文件进入清理候选。公开消费者继续按固定 release 和权益读取，不返回存储路径。

T15-B 验收时仅有 DOM/旧图文组合；T16-A 随后增加下节的小屋/手记，不改变 `report_content_v1`。未注册模板或不兼容报告方案可以保存为待修正草稿，但不得通过审核/发布。章节描述用于制作约束，不会变成任意新报告布局。后台预览使用人工选择的样例答案和现有评分服务，返回演示报告，不创建权益、真实答卷、消费或统计。主题保存标识/修订，由静态注册模板负责实际画风；Three.js、新评分玩法、云端和自动调度仍在后续批次。

### 后台接口

所有接口位于 `/api/admin`，沿用当前管理员、scope、Origin/CSRF 和幂等保护。

| 接口 | 行为 |
| --- | --- |
| `GET /products/:product/versions/:version/experience` | 当前/默认清单、固定报告方案、公开题目投影、最新 authoring 与已发布 release |
| `GET /products/:product/versions/:version/experience/history` | 分页不可变修订 |
| `POST /products/:product/versions/:version/experience` | 用 `expectedRevision` / `expectedVersionRevision` / `requestId` 保存新草稿 |
| `POST /products/:product/versions/:version/experience/validate` | 返回 `valid` 和有限 `issues`，不写审核状态 |
| `GET /experience-revisions/:id` | 指定历史修订及两种方法快照 |
| `POST /experience-revisions/:id/review` | 校验当前配置、方法和实际文件，追加 reviewed 修订 |
| `POST /experience-revisions/:id/preview` | 接受样例 questionId/optionId，返回 `isPreview=true` 的固定清单与报告 |

### experience MCP

本地 stdio 连接可固定 `ORAI_MCP_DOMAIN=experience`。该领域共 16 个工具：原 5 个连接/上传工具，加 11 个业务工具。业务工具为 `experience_list`、`experience_get`、`experience_draft_save`、`experience_validate`、`context_bundle_get`、`references_validate`、`skill_reference_get`，以及 `experience_skill_list` / `experience_skill_version_get` / `experience_skill_draft_save` / `experience_skill_draft_clone`。

仍通过 `POST /api/machine/experience/tools/:operation` 调用服务端业务。凭据明确白名单控制商品、Skill 与读写/context 权限；每次读取、写入事务和返回前重查撤销/到期/停用。上下文仅含固定设定、公开题目/选项、报告制作方案和授权方法，不含分值、阈值、私有模板或消费者数据。机器保存必须固定两种用途的方法，不能审核、启用 Skill、发布或访问订单。

上传目标为 `{type:'experience_resource', productVersionId, purpose:'illustration'|'texture'}`。服务端限制资源归属；适配器继续只读取允许目录内的文件，不下载任意 URL。Skill 参考文本沿用固定用途/附件绑定与 256 KiB 上限。

新增两模型及第十七份向前迁移 `20261021020000_experience_authoring`。数据库保护修订/资源不可变、同商品/版本/scope 引用、可信方法/机器来源、齐备资源和精确审核发布；运行账号无新表 UPDATE/DELETE 权限。旧十六份迁移不改写。

用户本次已认可 T15-B 桌面、手机和报告预览，批准启动 T16-A；该批准不覆盖新画面。T16-A 下一个 UI 审核节点仍须停止，T09 云端接入前另行说明服务和费用并等待批准。

## T16-A 安静小屋与观察手记

新增 `quiet-room@1` / `field-notes@1` 配对，通过 T15-B 工作台、人工审核和精确发布进入已有权益链。房间使用本地静态 SVG、DOM 和 CSS，不新增依赖、评估引擎或迁移。对象编号只明确选择原选项，不从家具、路径或反应时间推断结果。手记只排版后端固定的结果事实，空分数保持为空，不画零分进度条。

房间每题 2–4 选项；可选插画/纹理最多两张、单张 512 KiB、合计 1 MiB。DOM 原预算保持不变。模板/手记/插画/CSS 分块按需加载，新模板文件 gzip 实测 6172 字节（不含既有 React/共享契约），低于 45 KiB 预算。键盘、触摸、明确确认、刷新恢复、减少动态和同内容回退继续复用原协议。

MCP 工具数仍为 16，默认上下文响应保持原形状。调用 `context_bundle_get` 显式传 `includeTemplates:true` 后，`supported.templates` 才增加配对和预算信息。真实 SDK 已验证新组合、PNG 上传、草稿/重试与固定来源；未注册代码仍不能通过上传进入运行器。

本地源内容在 `examples/social-battery-room/`，封面与静音录屏均来自相同可信插画/运行组件，视频引用两题和 hook/CTA，受保护后台按固定设定登记来源及成套采用。原采用包继续保存四类内容，体验精确 release 另在试点 manifest 中固定；没有向旧 v1/v2 包补入新默认字段或改写摘要。

`/preview/experience/quiet-room` 是显式设计样例：只练习选择/确认，报告是独立标注的固定排版样本，不调用写 API、不产生实际答卷，也不在浏览器计算用户分数。真实业务证据来自隔离 PostgreSQL 权益链；实际手机/内置浏览器尚未验证，模拟视口不计为真机验收。本批新画面等待单独 UI 审核，T16-B Three.js 尚未开始。
