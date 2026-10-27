# 接口契约与 UI 字段映射

2026-10-23 O4更新：版本化配置保存/详情/历史/只读核验/导出共8个管理员接口已实现，严格owner/scope/Origin/CSRF、不可变修订和原请求幂等，配置始终未启用。新增23项API集成及双端页面隔离验证通过，指定正式三图已获[独立批准](../../output/design-review/external-run-configuration-o4-formal-20261023/APPROVAL.md)，原工程pending保持；接口详情见文末O4段，业务状态见[PROGRESS](PROGRESS.md)。没有启用、执行或定时器接口。

2026-10-22 O1 更新：统一 Codex 连接的预览、明确确认/原子签发、恢复、详情/分页和整组撤销已实现；指定三图正式 UI 已通过。本轮只用隔离数据库与身份/剪贴板替身，未验证真实账户连接或配置真实客户端，见下方 O1 契约。

2026-10-21：T12–T15 本地已验收，T15-B 界面本次获用户批准。T16-A 新增小屋/手记静态配对，技术验证通过、待新 UI/真机验收；原消费者 API 和四交付物/五用途组合保持兼容。体验接口见 [EXPERIENCE-RUNTIME.md](EXPERIENCE-RUNTIME.md)，试点见 [QUIET-ROOM-PILOT.md](QUIET-ROOM-PILOT.md)，远程 T14-C 仍待云条件。

2026-10-16。已实现健康检查、目录/版本、兑换/恢复/交付、动态答题/报告/群体反馈/清理预演、账户/绑定，以及 T07 运营 HTTP、基础素材/文件和售后接口。真实云端认证/收信与持久化对象存储仍待 T09 验收。示例内容均为演示，不含有效兑换码、用户令牌或真实订单；证据见 PROGRESS.md。

## 边界与通用格式

| 模块 | 导出入口 | 使用范围 |
| --- | --- | --- |
| 公开目录、样例、共有基础类型 | `@orai/contracts` | ProductCard/Detail、CatalogQuery、金额、时间、公开错误；不导出私有配置 |
| 持有者/账户 | `@orai/contracts/private` | 兑换、创建答卷、保存/提交、绑定输入，题目响应、权益/报告与两类分布 |
| 管理 | `@orai/contracts/admin` | 商品/订单/素材输入，版本配置/发布校验；完整计分与模板仅后端或授权管理入口可读 |

客户端 ID 使用 UUID，题目/选项/分类 slug 使用小写 key；数据库枚举大写、API 状态/平台小写。JSON 由 Zod 运行时校验，默认拒绝额外字段。将 shared package 装进前端不代表获得权限；前端不能导入或包含真实商品的私有配置。

请求头 `x-request-id` 用于追踪，不作为重试凭据。只接受最多 31 位 URL 安全字符或 UUID；其他值替换为服务端 UUID，避免把 43 位凭据反射到日志/响应。需要幂等的写操作另传 body `requestId`（UUID）。服务端按主体＋目标操作＋requestId 去重，保存有效载荷摘要；同 ID 不同载荷返回 IDEMPOTENCY_CONFLICT。通常同载荷重放已确认结果；兑换与秘密交付的特殊规则见下文。请求里的 userId、scope、权重、分数不能代替服务端访问上下文。全码/会话令牌不得写入幂等缓存或审计。

示例错误格式：

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "答卷已更新，请重新读取进度后重试。",
    "requestId": "example-save-conflict"
  }
}
```

页面依赖 code，message 仅展示。INVALID_INPUT/VALIDATION_ERROR/INVALID_CONFIGURATION 对应 400；AUTH_REQUIRED 对应 401；FORBIDDEN/EMAIL_UNVERIFIED 对应 403；NOT_FOUND 对应 404；修订/幂等/状态冲突及 VERSION_IMMUTABLE 对应 409；RATE_LIMITED 对应 429；SERVICE_UNAVAILABLE 对应 503。到期、撤权、删除、邮箱及素材错误采用独立业务 code，具体 HTTP 映射随对应 task 实测固定。完整错误码列表见 `packages/contracts/src/shared.ts`，不能把 SQL、密码、邮箱归属或异常栈返回公众。

## 商品目录与筛选

以下四个 GET 端点已在 T03 实现，所有响应使用 `Cache-Control: no-store`：

| 端点 | 响应 | 访问规则 |
| --- | --- | --- |
| `/api/categories` | Category[]，按 order、id 升序 | 共有分类包含空分类；不接受查询参数 |
| `/api/tags` | Tag[]，按 name、id 升序 | 只包含当前环境可见商品的标签；不接受查询参数 |
| `/api/products` | ProductPage | 只返回卡片字段，不含 description/publicSample 或私有规则 |
| `/api/products/:slug` | ProductDetail | 只返回当前公开版本；不接受 version 等查询参数 |

开发/测试目录只展示 DEMO，生产只展示 LIVE。商品和当前同范围版本均须 PUBLISHED，商品须有 publishedAt；草稿、下架、错误范围与不存在的 slug 统一返回 404。scope/include/未知查询参数不允许由调用方改变访问范围，返回 400。分类是共有基础数据，标签按实际可见商品筛选；空目录返回 `items: []`、`total: 0`。

`GET /api/products?q=协作&category=relationships&tags=demo,cooperation&minPriceFen=0&maxDurationMinutes=5&sort=latest&page=1&pageSize=20`

支持 q、category、tags、min/maxPriceFen、min/maxDurationMinutes、experienceType（score/tendency）、sort（latest/recommended）、page、pageSize。q 去首尾空格、最多 100 字，只搜索公开名称/钩子/摘要/描述，大小写不敏感；`%`、`_` 和反斜杠按字面字符匹配，不搜索报告模板。tags 支持逗号列表或重复参数（如 `tags=demo&tags=cooperation`），规范化为去重排序 key；上限 10 个，不接受 `tags[]`。page 默认 1，上限 10000；pageSize 默认 20，最多 50。价格范围为 0–10000000 分，耗时范围为 1–120 分钟，上下界均包含；过滤下限不得高于上限。

分类单选、标签多选，必须同时满足全部所选标签。最新按 publishedAt 降序、id 升序；推荐按 recommended 降序、recommendationOrder 升序、publishedAt 降序、id 升序，未推荐商品排在其后。默认 latest，没有销量/热度排序。total 和 items 在同一 RepeatableRead 事务中使用相同过滤/范围顺序读取；页码超过结果仍返回真实 total 和空 items。T08 前端已将筛选条件与页码写入 URL。

ProductPage 示例（ID 是示意 UUID，不要求与 seed 相同）：

```json
{
  "items": [{
    "id": "00000000-0000-4000-8000-000000000001",
    "slug": "demo-partner",
    "name": "伴侣协作测试 · 演示",
    "hook": "一起安排生活时，你们的协作节奏是什么？",
    "summary": "演示主动分担、回应和共同安排的多维测试。",
    "category": {"id": "00000000-0000-4000-8000-000000000002", "slug": "relationships", "name": "关系情感", "order": 0},
    "tags": [{"id": "00000000-0000-4000-8000-000000000003", "slug": "demo", "name": "演示"}],
    "price": {"amountFen": 990, "currency": "CNY", "isTestPrice": true},
    "durationMinutes": 3,
    "durationIsEstimate": true,
    "questionCount": 6,
    "experienceType": "score",
    "themeKey": "demo-partner",
    "coverUrl": "/demo/partner.svg",
    "isDemo": true,
    "recommended": true,
    "publishedAt": "2026-10-09T11:00:00.000Z",
    "versionNumber": 2
  }],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

`GET /api/products/:slug` 在卡片字段上增加 versionId、description、publicSample、purchaseNotice、purchaseUrl、redemptionNotice。T08 增加的 versionId 是当前公开版本的 UUID，供已存在的浏览事件接口校验目标；列表卡片不增加此字段。公开样例是独立撰写的摘要和演示维度，不来自用户报告，不包含完整结果模板。测试商品 `purchaseUrl: null`，文案明确“演示内容，不用于购买”。公开投影逐字段构造，不返回数据库 record 或完整 configuration。

## 领取、恢复与匿名会话（T04 已实现）

| 端点 | 输入契约 | 响应/访问边界 |
| --- | --- | --- |
| GET /api/session/context | 无查询参数；可无会话 Cookie | AnonymousSessionContext：authenticated、csrfToken、sessionExpiresAt；只初始化页面防护，不授予权益 |
| POST /api/redemptions/claim 或 recover | RedemptionRequest：用户输入 code＋requestId；无查询参数 | 200 RedemptionResponse：entitlement＋disposition（claimed/restored）；新会话凭据只通过 Set-Cookie 交付 |
| GET /api/session/entitlements | 有效匿名 Cookie；page/pageSize | EntitlementPage：items、total、page、pageSize；本机未撤销的未绑定授权，允许展示到期元信息 |
| GET /api/session/entitlements/:id | 有效匿名 Cookie；无查询参数 | 200 Entitlement；必须属于当前会话；未知/其他人的 ID 为 404 |
| POST /api/session/logout | JSON 空对象；无查询参数 | 204；撤销当前会话及其授权，清除会话和 CSRF Cookie；不取消权益，未绑定有效码仍可恢复 |

前端经 Vite/未来 Worker 同域 `/api` 调用：先 GET context，将返回的 csrfToken 仅保存在页面内存；写请求带 `Content-Type: application/json`、`X-CSRF-Token`，浏览器自动携带 Cookie 和本站 Origin。签名 CSRF 默认 3600 秒；过期返回 CSRF_INVALID，重新初始化后重试。authenticated 表示有效匿名会话，不表示邮箱账户已登录。无效或在初始化途中被撤销的会话返回 authenticated=false 并清除旧 Cookie。

code 输入去首尾空白，接受 32–96 位 URL 安全字符；新发码使用 32 字节安全随机数，编码为 43 位。完整码只经 POST body/受保护交付文件使用，不进地址栏、前端持久化、日志、事件、幂等结果或分享卡。数据库保存 SHA-256 摘要。首次领取固定订单原版本、一次报告权益；claim/recover 都能处理首次领取或已有恢复。领取、事件、授权、会话和重试记录同事务完成，五个设备并发领取仍只有一份权益。

首次领取要求订单 fulfilled、码未到首次期限、商品可新领且锁定版本可用；恢复已有权益不重新检查首次期限或商品当前上架状态。它仍须未绑定、未撤权且权益访问期有效。首次截止、权益访问期、匿名会话期限、报告保存期各自判断；恢复不延长权益或报告期限。已绑定码统一返回 ACCOUNT_REQUIRED，不泄露账户邮箱/ID。

重试主体来自签名 CSRF Cookie 摘要，缓存 24 小时，仅存 entitlementId。相同 requestId 改码为 409；重试始终重新检查最新状态并返回当前元信息，disposition 可为 restored。如果上次响应丢失，允许另发新会话 Cookie，数据库和缓存不能保存/重放会话明文。原码换设备恢复同权益，不新增报告次数。分页默认 1/20，上限 10000/50，仅接受 page/pageSize。

Entitlement 字段为 id、productId/Slug/Name、versionId/Number、ownership、status、reportsAllowed/Consumed、claimedAt、accessExpiresAt、attemptId/Status、reportId/State、isDemo。归属 anonymous/account_bound 与状态 active/expired/revoked 分开；报告 absent/available/expired/deleted 不从是否有 reportId 推断。登录不会自动绑定本机商品。

本地 HTTP Cookie 名为 orai_session/orai_csrf；生产或 HTTPS origin 使用 __Host-orai_session/__Host-orai_csrf。均为 HttpOnly、SameSite=Strict、Path=/，HTTPS 时 Secure，无 Domain；会话默认 30 天，数据库只保存凭据摘要。每次访问重新检查凭据、scope、撤销/到期、单项 grant 和权益归属；服务端生成的不可伪造访问上下文也必须通过新鲜检查。仅凭答卷/报告 ID 或任意 Bearer/请求 userId 不能读取私人内容。T05 题目/报告路由已接入该授权，绑定账户的权益仍拒绝匿名访问。

APP_PUBLIC_ORIGIN 指定精确允许来源；生产必须 HTTPS 和稳定随机 CSRF_SIGNING_KEY，本地默认仅 loopback Web/API origin。无来源的写入、未知 origin 和 cross-site Fetch Metadata 拒绝；GET 可直接访问，但不能带其他 origin。默认不信任转发 IP；TRUST_PROXY_CIDRS 只填实际可信代理 IP/CIDR，正式 Worker/容器拓扑在 T09 验证。PostgreSQL 原子限流跨进程共享：兑换/恢复默认同 IP 30 次/900 秒、同码 20 次/900 秒；其他匿名写入默认同 IP 120 次/60 秒，由 ANONYMOUS_WRITE_IP_LIMIT 配置；读取同 IP 120 次/60 秒。答题写入独立窗口，100 题产品可以正常逐题保存和提交。只保存 scope 与 subject 摘要，429 带 Retry-After。Compose 透传这些本地安全设置。

T04/T05 实测错误：CODE_INVALID 为 404；CODE_EXPIRED/CODE_REVOKED/ENTITLEMENT_EXPIRED/ENTITLEMENT_REVOKED/REPORT_EXPIRED/REPORT_DELETED 为 410；ACCOUNT_REQUIRED/CSRF_INVALID/ORIGIN_FORBIDDEN 为 403；无效会话为 401；非法输入为 400；状态/幂等冲突为 409；统计展示失败为 SAMPLE_UNAVAILABLE（503）。跨会话私人 ID 返回 NOT_FOUND（404），未回答题目的反馈返回 FORBIDDEN（403）。

## 测试订单交付维护（T04 已实现）

本机命令与 T07 受保护 HTTP 入口共用交付业务事务。本机命令必须通过真实 owner 连接、明确开发/测试目标、数据库标记及有效 DEMO ADMIN 角色获得授权；ADMIN UUID 本身不是登录凭据。order 记录人工订单，不代表完成真实平台核单或资金退款。

```sh
pnpm delivery:manage order --actor ADMIN_UUID --input /absolute/order.json --request-id REQUEST_UUID
pnpm delivery:manage issue --actor ADMIN_UUID --order ORDER_UUID --output /absolute/delivery.json --request-id REQUEST_UUID
pnpm delivery:manage replace --actor ADMIN_UUID --code-id CODE_RECORD_UUID --output /absolute/replacement.json --request-id REQUEST_UUID
pnpm delivery:manage refund --actor ADMIN_UUID --order ORDER_UUID --request-id REQUEST_UUID
```

将上述 UUID/绝对路径替换为实际开发值；request-id 可省略由工具生成，同一次重试应沿用原值。order.json 使用 AdminOrderInput：platform（douyin/xiaohongshu/manual）、reference、productVersionId、quantity（1–1000）、amountFen、scope:demo；文件上限 512 KiB，拒绝未知字段。平台＋引用唯一，相同内容重用原订单，不同内容冲突。quantity 份随机码、批次、fulfilled 状态、审计和幂等记录同事务保存。

issue/replace 仅首次执行写入秘密交付文件，独占创建、权限 0600、fsync，不覆盖原文件；原文件须受控保管。stdout 只含 receipt、deliveryAvailable、deliveredCount、deliveryFile，不含完整码。24 小时内同 request-id 重放回执，deliveryAvailable=false、deliveries=[]，不会从摘要恢复原码，也不产生新批次。交付文件中的 AdminSecretDelivery 为 receipt＋deliveryAvailable＋deliveries（id/code/claimDeadline）；receipt 本身只有订单、批次、版本、范围、码记录 ID、被替换 ID 和时间。文件保存失败但事务已成功时明确提示按批次核单补发，不重新发一份权益。

补发只允许尚未被替换的叶子码；已领取时保留同一权益、原期限、版本、次数、答卷/报告及账户归属，撤销旧码和该权益的全部匿名 grant。多商品浏览器保留其他有效授权，没有剩余 grant 时会话本身撤销。未领过期码可新设首次截止，已到期/撤销权益不能被补发复活。已绑定的新码仍不能匿名领取。

refund 是测试订单撤权服务，不发起平台资金退款。它在一个事务中撤码、撤权益/匿名授权、使答卷无效并移除其真实回答/结论统计贡献，保留报告快照、已消费次数和绑定；重复请求只有一个退款事件。计数不一致时整体回滚，返回 CONFLICT，修复后重试。T05 清理先只提供预演，实际删答案前必须解决历史贡献账本，不能把保留报告当作原始答案。

## 邮箱账户与绑定（T06 本地已实现，真实认证/收信待验收）

| 端点 | 输入契约 | 响应/访问边界 |
| --- | --- | --- |
| GET /api/account/context | 无查询字段 | AccountContext：configured、account、csrfToken、sessionExpiresAt；无配置不会假装登录 |
| POST /api/account/session | AccountSessionRequest：accessToken＋refreshToken | 确认两个凭据属于同一有效 Auth 会话，交接为 HttpOnly Cookie；不接受 service role |
| POST /api/account/logout | 空 JSON 对象 | AccountLogoutResponse：providerRevoked 为 true/false/null；本站撤销先提交，不虚报服务商退出成功 |
| GET /api/me | 当前 Cookie 账户 | Account；角色来自业务库，普通账户无管理权 |
| GET /api/me/entitlements、GET /api/me/reports | page、pageSize | 当前所属权益/报告元数据分页；不返回报告快照，不接受 userId |
| GET /api/me/entitlements/:id | 权益 ID | 当前账户所属权益元数据；他人权益返回 404 |
| POST /api/me/entitlements/bind | BindEntitlementRequest：code＋requestId＋confirmed:true | 同时要求有效匿名授权、对应码、已验证邮箱及显式确认；绑定后旧匿名授权不可用 |
| POST /api/me/redemptions/claim | BindEntitlementRequest | 确认后领取并绑定新码，或恢复同一所属账户已绑定码；登录不自动合并商品 |

前端 Supabase SDK 负责注册、验证、密码登录、重发、找回/重置。凭据只在短期内存中存在，PKCE 验证信息最长保存一小时；回调只接收本站两个固定路径的 code＋sb_flow_id，不接受任意跳转。交接后刷新由后台完成。配置见 AUTH-SETUP.md；seed 元数据、测试适配器或隔离 SDK 服务都不是生产登录凭据，真实邮件和真实账户跨设备仍待验收。

账户 Cookie 本地名 orai_account，HTTPS/生产名 __Host-orai_account，HttpOnly、SameSite=Strict、Path=/、Secure（HTTPS），无 Domain。随机凭据只存摘要，服务端 Auth 凭据分开加密。账户接口私人 no-store；写入要求本站 Origin、JSON、X-CSRF-Token，绑定/新兑换共享码与 IP 防猜测限流。认证服务故障返回可重试 503，失效返回 401；未验证邮箱不能绑定。旧匿名会话不能读取已绑定权益，他人持码不能通过账户恢复。

## 答题、保存与反馈（T05 已实现）

所有端点按权益归属使用 T04 匿名 Cookie 或 T06 账户 Cookie，并检查最新归属、期限与撤权，私人响应 no-store；写入要求本站 Origin、JSON 和 X-CSRF-Token。业务接口不直接接受 Bearer 身份；Auth 凭据仅在安全会话交接接口使用。

| 端点 | 成功响应 | 输入 |
| --- | --- | --- |
| POST /api/attempts | 200 QuestionsResponse | entitlementId、requestId |
| GET /api/attempts/:id/questions | 200 QuestionsResponse | 无查询参数 |
| PUT /api/attempts/:id/answers/:questionId | 200 SaveAnswerResponse | optionId、expectedRevision、requestId |
| GET /api/attempts/:id/feedback?questionId=question-1 | 200 Feedback | 必填且唯一的 questionId 查询 |
| POST /api/attempts/:id/submit | 200 ReportResponse | expectedRevision、requestId |
| GET /api/reports/:id | 200 ReportResponse | 无查询参数 |
| DELETE /api/reports/:id | 204 空响应 | JSON body：requestId |

除 feedback 外均拒绝查询参数；所有输入拒绝 userId、scope、score 等额外字段。开始/恢复只创建 ordinal=1 的单份答卷，版本来自权益，不扣报告次数，也不会因商品升级或下架切换原版本。INVALID/statsValid=false 答卷不可继续。

`POST /api/attempts` 使用 StartAttemptRequest（entitlementId＋requestId）；重复开始恢复既有答卷，版本来自权益。`GET /api/attempts/:id/questions` 返回 QuestionsResponse 的 attemptId、versionId/Number、revision、status、questions、answers、isDemo。

T15-A 增加可选 `experience: {release, checkpoint}`：固定 release/digest 与严格清单，检查点只由服务端已确认答案和修订生成。保存响应增加可选 checkpoint，报告响应增加可选 presentation；旧字段保持兼容。清单无私有计分或完整报告模板。当前注册 DOM/旧图文及 T16-A 小屋/手记两种精确配对，未知版本或混搭不可发布，见 [EXPERIENCE-RUNTIME.md](EXPERIENCE-RUNTIME.md)。

单题只含 id、text、dimensionId、required、options（id/label/notApplicable）。题量可变，页面根据数组渲染；questions 与已有 answers 分开。公开题目没有 points、weight 或完整模板。

`PUT /api/attempts/:id/answers/:questionId` 的 SaveAnswerRequest 示例：

```json
{
  "optionId": "sometimes",
  "expectedRevision": 1,
  "requestId": "00000000-0000-4000-8000-000000000004"
}
```

expectedRevision 是已读取的答卷整体修订号，首次为 0；每次新的成功保存整体修订加 1，同题答案自身也递增 revision，保留 savedAt。过时请求返回 REVISION_CONFLICT，客户端先重读，不静默覆盖较新答案。断网重试同一保存请求沿用 requestId；用户重新作答用新 ID。同 ID 同载荷重放不加计数/修订；答卷已有后续保存时，旧重放也返回 REVISION_CONFLICT，不能把旧进度显示成当前结果。修改选择替换原选项贡献，选不适用仍是一个有效回答份数；相同选项的新保存不增分母。完成后保存返回 ATTEMPT_COMPLETED（409）。

运行重试按 scope＋entitlementId＋目标操作＋UUID 去重，窗口 24 小时。改载荷或过期重放返回 IDEMPOTENCY_CONFLICT（409）；缓存仅含答卷/题目/报告 ID 与修订，不存报告快照。开始/提交重试仍读取当前状态，删除、到期、撤权后不重放旧报告内容。

SaveAnswerResponse 示例：

```json
{
  "answer": {"questionId": "question-1", "optionId": "sometimes", "revision": 2, "savedAt": "2026-10-09T11:10:00.000Z"},
  "attemptRevision": 2,
  "feedbackStatus": "ready",
  "feedback": {
    "versionId": "00000000-0000-4000-8000-000000000005",
    "questionId": "question-1",
    "updatedAt": "2026-10-09T11:10:00.000Z",
    "isDemo": true,
    "answers": {
      "state": "ready", "sampleSize": 21, "minimumSampleSize": 20, "denominator": "other_valid_answers",
      "items": [
        {"id": "rarely", "label": "很少如此", "count": 7, "percentage": 33.3},
        {"id": "sometimes", "label": "有时如此", "count": 7, "percentage": 33.3},
        {"id": "often", "label": "经常如此", "count": 7, "percentage": 33.3},
        {"id": "na", "label": "不适用", "count": 0, "percentage": 0}
      ]
    },
    "results": {
      "state": "ready", "sampleSize": 21, "minimumSampleSize": 20, "denominator": "other_valid_completed_attempts",
      "items": [
        {"id": "developing", "label": "仍在探索", "count": 7, "percentage": 33.3},
        {"id": "balanced", "label": "逐步平衡", "count": 7, "percentage": 33.3},
        {"id": "steady", "label": "相对稳定", "count": 7, "percentage": 33.3},
        {"id": "insufficient", "label": "信息不足", "count": 0, "percentage": 0}
      ]
    }
  }
}
```

比例由真实 count/sampleSize 计算，可显示一位小数，不强行凑成 100%。每种分布分别判断：sampleSize=0 为 empty，1–19 为 insufficient，达到配置门槛为 ready；前两种 `items: []`。当前答卷从两个分母中排除，结论只统计有效完成答卷，版本不能混合。

保存成功后独立读取展示统计，实际聚合查询失败或计数不一致时仍返回 200、已保存 answer/attemptRevision，以及 `feedback: null`、`feedbackStatus: unavailable`，页面允许继续并重试反馈。该状态不等于 empty/insufficient。GET feedback 必须带 questionId，只允许读取自己已经回答的题目；故障时返回 503。反馈只包含配置中的选项/标准类型标签、计数和比例，不含私人报告、答案列表或身份；信息不足的已完成报告也贡献一次独立结果类型。

`POST /api/attempts/:id/submit` 使用 SubmitAttemptRequest（expectedRevision＋requestId）。首次成功报告快照、完成状态/期限、消费次数、结论计数、COMPLETE 事件和重试引用同一事务提交；未全部回答返回 ANSWERS_INCOMPLETE（400），修订过时为 409，均不扣次。并发或重复提交返回同报告，完成后不再按新请求的修订重算。提交不递增答案修订。聚合写入漂移为 CONFLICT（409），整个完成事务回滚。

## 报告与缺失数据（T05 已实现）

`GET /api/reports/:id` 返回 ReportResponse（id、attemptId、versionId、content、createdAt、expiresAt）。content 含 schemaVersion、productName、versionNumber、resultTypeId/Label、totalScore、dimensions、explanation、suggestion、disclaimer、isDemo。

维度展示项示例：

```json
{
  "id": "dimension-1",
  "label": "共同分担",
  "score": null,
  "applicableAnswers": 0,
  "requiredAnswers": 1,
  "missingReason": "该维度的适用回答不足，暂不计算分数。"
}
```

后端对每题适用选项按该题最小/最大配置分归一到 0–100：`100 × (points − min) / (max − min)`；维度是适用题的题目权重加权均值，总分再按维度权重加权。不适用不计入评分权重；适用数不足 minApplicableAnswers 时维度为 null，任意维度不足总分为 null，并使用配置的信息不足模板。内部使用精确分数与原始阈值比较，展示分数保留两位小数；不会把显示成 66.67 的较低精确分数提前放入从 66.67 开始的档。分段左闭右开，最后包含 100。

不能把 null 渲染成零分。报告输出完成时快照，不重新引用当前商品名或规则。读取、完成重放、删除均重新授权；到期内容不能读取/重放。DELETE 使用 `{requestId}` JSON body，成功/重复删除均 204，置空 snapshot 并留 deletedAt 墓碑，不退回次数，也不能凭码恢复。有效权益可以主动删除已经到期的报告。当前演示保留原始答案、最小结果标识和有效匿名汇总，便于期限预演及退款剔除；不提供原始答案自动删除或整账户抹除。正式删除/汇总政策在 T11 确定。私人报告不生成永久公众链接，分享卡导出在 T08 接入。

## 体验资源（T15-A 本地已实现）

`GET /api/attempts/:id/resources/:resourceId`、`GET /api/reports/:id/resources/:resourceId` 按持有者权益/报告授权，只读取固定 release 同商品版本/scope 的资源，支持 Range，返回 `private, no-store`。文件实际 MIME/大小/SHA-256 不匹配则拒绝。过期、报告删除或退款撤权后不可继续读取；不接受任意 URL/代码包或直接 fileId。

清单最多 8 个资源、合计 16 MiB，当前 DOM 模板仅启用 PNG/JPEG/WebP 插画/纹理，每份最多 4 MiB。T15-B 增加独立 `experience` 文件种类与同名 MCP 制作领域，不复用宣传封面的身份。model/audio/font 虽有用途/MIME 契约，发布、上传和运行继续未启用。

## 体验与报告制作（T15-B 已验收）

后台工作区、历史、草稿保存、兼容校验、人工审核与样例预览的路径、请求修订和响应见 [制作接口表](EXPERIENCE-RUNTIME.md#后台接口)。契约在 `experience-authoring.ts`；保存只追加草稿，审核追加 reviewed 修订，内容发布要求精确捕获最新审核稿。样例预览只计算人工选择的答案，不创建消费或统计。

四类交付物/原五用途组合保持原结构。可选 `experience` 方法领域使用 `scene_design` / `report_presentation`，机器保存必须固定两用途，来源由服务器提供；不开放审核、发布或消费者数据。`POST /api/machine/experience/tools/:operation` 与 16 个 stdio 工具、资源目标和权限见 [experience MCP](EXPERIENCE-RUNTIME.md#experience-mcp)。

T16-A 通过同一接口增加 `quiet-room@1` + `field-notes@1` 配对：最多四个选项、两张图片/单张 512 KiB/合计 1 MiB，标准结果 schema 和评分不变；未知版本/混搭仍拒绝发布。`context_bundle_get` 输入可选 `includeTemplates:true` 才返回 `supported.templates` 的配对/预算；默认响应形状保持兼容。设计预览路由不调用写 API、不创建答卷或客户端计分。无新增 HTTP 身份入口、迁移或工具数量变更。

## 清理预演（T05 已实现）

`pnpm retention:preview --actor ADMIN_UUID --as-of 2027-01-01T00:00:00.000Z --page 1 --page-size 20`。必须满足本机 owner 凭据、开发/测试数据库标记与有效 DEMO ADMIN 角色，拒绝生产、远程目标与伪造身份；没有公众 HTTP 路由或执行删除参数。省略 as-of 使用当前时间，page 默认 1/最大 100000，page-size 默认 20/最大 50。

返回 AdminRetentionPreview：dryRun=true、scope、asOf，以及 rawAnswers/reports 两组独立分页（items/page/pageSize/total）。答案候选仅限 COMPLETED/INVALID、已有 completedAt、答案已到期且仍有原始回答的答卷；STARTED/SUBMITTED 均排除。报告候选为到期、未删除且仍有快照的报告。两组在同一 RepeatableRead 事务读取，按期限和 ID 排序；只列记录/版本 ID、期限与答案份数，不返回选项、快照、归属或凭据，不修改任何内容。

## T03 本地版本维护（已实现）

`VersionsService` 提供 validate/import/preview/replace/review/publish/archive。当前使用实际 owner 数据库凭据的本地维护 CLI；需要匹配的开发/测试数据库标记、非禁用 DEMO ADMIN 记录，且每次操作重新检查角色和环境。管理员 UUID 只是审计主体，不能单独充当权限。授权对象有 5 分钟有效期，不接受调用方伪造；CLI 拒绝生产和非本机目标。

例如，使用本地 seed 管理员 ID 或自行建立的本地管理员记录：

```sh
pnpm catalog:manage validate --actor <admin-uuid> --file /absolute/path/configuration.json
pnpm catalog:manage import --actor <admin-uuid> --product fixture-draft --file /absolute/path/configuration.json --request-id <request-uuid>
pnpm catalog:manage preview --actor <admin-uuid> --product fixture-draft --version 2
pnpm catalog:manage replace --actor <admin-uuid> --product fixture-draft --version 2 --file /absolute/path/configuration.json --request-id <request-uuid>
pnpm catalog:manage review --actor <admin-uuid> --product fixture-draft --version 2 --request-id <request-uuid>
pnpm catalog:manage publish --actor <admin-uuid> --product fixture-draft --version 2 --request-id <request-uuid>
pnpm catalog:manage archive --actor <admin-uuid> --product fixture-draft --request-id <request-uuid>
```

这里的版本号是示意，实际使用 import 返回的 number。JSON 文件最多 512 KiB，只能包含结构化配置。省略 request-id 会生成 UUID；重试写操作应保留原 UUID。幂等窗口 24 小时，以管理员/范围/操作/商品为单位，同 ID 同规范化载荷返回原结果，不同载荷或过期重放返回 IDEMPOTENCY_CONFLICT。商品锁、状态变更、审计和幂等结果在同一事务完成；缓存与审计不含完整配置。

validate 返回 valid/issues；import/replace/review/publish 返回版本 id、productId、scope、number、status、createdAt、publishedAt；archive 返回商品状态。preview 返回 `isPreview: true`、版本信息、私有 configuration 与独立构建的 publicView，仅给授权本地维护者。校验/预览不改变发布状态，import 始终建 DRAFT；修改 REVIEWED 配置重置 DRAFT。publish 只接收 REVIEWED 版本并重新校验配置和公开字段，已发布配置不可改。下架保留原版本、权益、答卷与报告。

T07 已将版本服务接入受保护 `/api/admin/*`，未登录访问已存在的管理路由返回 401，已登录普通用户返回 403；公开商品历史版本 URL 仍返回 404。`RuntimeVersionService.read` 是后端内部历史配置读取能力，必须先校验权益，不是公开访问接口。版本响应新增 `revision`；本机 CLI 保留原调用方式，HTTP 编辑/审核/发布要求预期修订。

## 运营接口（T07 本地已实现）

所有管理控制器位于 `apps/api/src/operations`，复用 `VersionsService` 和 `DeliveryAdminService`。每次请求通过本站不透明账户 Cookie、Supabase 身份/会话、已验证邮箱和数据库当前 ADMIN 角色检查；事务内重查授权。停用、降级或退出会话后立即拒绝访问。角色请求头和前端路由不构成授权。读写响应均为 `private, no-store`；写操作要求本站 Origin、CSRF 和 JSON，只有指定上传内容路由接受二进制。所有输入和查询拒绝未知字段。

普通注册只建立 USER。受控本地角色维护命令为：

```sh
pnpm admin:manage grant --supabase-user <supabase-user-uuid> --request-id <request-uuid>
pnpm admin:manage revoke --supabase-user <supabase-user-uuid> --request-id <request-uuid>
```

它只接受已有业务用户、显式 loopback 开发/测试库、匹配环境标记及真实 schema owner，记录 `administrator.grant/revoke` 审计；运行账号没有更新角色的数据库权限。不提供 HTTP 提权入口。未配置 Auth 时手动管理员登录不可用，本地接口测试使用隔离身份事实和真实 PostgreSQL；真实云端管理员登录仍由 T09 验收。

| 方法与路径（均以 `/api/admin` 开头） | 输入/用途 |
| --- | --- |
| GET /categories、/tags | 管理分类/标签分页；共享目录基础数据 |
| POST /categories、/tags | slug、name、requestId；分类可加 sortOrder |
| PATCH /categories/:id、/tags/:id | expectedRevision、requestId 与可编辑字段 |
| GET /products | query、status、categoryId、page、pageSize |
| POST /products | AdminProductCreateSchema；元数据/公开样例，初始 DRAFT |
| GET /products/:id、PATCH /products/:id | 管理 DTO；PATCH 带 expectedRevision/requestId，可改标签/推荐及 recommendationOrder |
| GET、POST /products/:id/versions | 分页；POST configuration/requestId 创建新草稿版本 |
| GET /products/:id/versions/:versionId/preview | isPreview、version、私有 configuration、公开 publicView |
| PUT /products/:id/versions/:versionId | configuration、expectedRevision、requestId；修改后退回 DRAFT |
| POST /products/:id/versions/:versionId/review、/publish | expectedRevision、requestId；审核/发布依次推进修订 |
| POST /products/:id/archive | requestId；下架保留原权益、版本及历史报告 |
| POST /products/:id/cover | assetId、expectedRevision、requestId；明确选择当前已发布版本的 READY 封面 |
| GET /orders、GET /orders/:id | 列表支持 platform/status/reference 和分页；详情只返回码 ID/状态与批次，不返回码正文/摘要 |
| POST /orders、POST /orders/import | 人工订单；CSV 校验/导入，见下文 |
| POST /orders/:id/issue、/refund | requestId；首次秘密交付、退款撤权 |
| POST /codes/:id/replace | requestId；补发承接原权益/绑定/次数并撤销旧匿名授权 |
| GET /assets、POST /assets、GET /assets/:id、PATCH /assets/:id | 四类基础元数据；编辑采用预期修订 |
| POST /assets/:id/review、/ready、/archive | expectedRevision、requestId；显式状态流转 |
| POST /uploads、GET /uploads/:id、PUT /uploads/:id/content、POST /uploads/:id/complete | 受控上传会话，见下文 |
| GET /files/:id/content | 当前范围管理员授权读取；支持单段字节 Range |
| GET /overview、GET /audit | 真实事件/人工订单口径、审计分页 |

分页统一返回 `{items,total,page,pageSize}`，默认 20 条，上限 50，稳定排序增加 ID 作为次序条件。商品/版本、订单、素材、文件及审计按 DEMO/LIVE 范围隔离。版本及文件使用稳定 ID；新版本不重写历史内容。商品、分类、标签和素材编辑，以及 HTTP 版本修改/审核/发布均有修订检查；旧值返回 409 `REVISION_CONFLICT`，客户端需刷新并重新审核。发布、下架及封面选择也更新商品修订，防止旧表单覆盖状态变更。

普通写入在事务内统一完成业务修改、必要审计和 24 小时幂等结果；不同载荷/过期重试返回 409。CSV 是保留逐行结果的多事务操作，失败后可用同一 requestId/原文件继续；已完成行不会重复建单。发码/补发只在首次事务响应返回完整码，响应以附件 JSON 交付且禁用缓存，重试只有回执。历史查询、审计与幂等缓存没有完整码。资金退款仍需经营者在原平台核对和操作，本站接口负责撤权。

CSV 请求为 `{csv,requestId,dryRun}`，dryRun 默认 true。最多 500,000 字符、1–500 行订单；JSON 请求体上限 2 MiB。表头为 `platform,reference,productVersionId,quantity,amountFen`，允许调换列顺序、UTF-8 BOM、引号内换行和双引号转义。非法表头/未闭合引号/越界结构整份返回 400；业务行错误返回 `rows[{row,status,orderId?,code?,message?}]` 及 accepted/rejected 计数。dryRun 不建单，同批或库内相同平台引用但金额/数量/版本不同会报冲突；相同内容跨批去重。导入不会自动发码。

订单元数据示例（POST /orders 还需 requestId）：

```json
{
  "platform": "manual",
  "reference": "demo:example-order",
  "productVersionId": "00000000-0000-4000-8000-000000000005",
  "quantity": 1,
  "amountFen": 990,
  "scope": "demo"
}
```

AdminAssetCreate 示例（视频未上传状态）：

```json
{
  "productVersionId": "00000000-0000-4000-8000-000000000005",
  "platform": "xiaohongshu",
  "kind": "video",
  "variant": "A",
  "status": "draft",
  "text": null,
  "fileId": null,
  "requestId": "00000000-0000-4000-8000-000000000006"
}
```

素材通过 kind=cover/video/script/copy、platform、productVersionId、status 和分页筛选。创建只能是 DRAFT；PATCH 可改 variant/text/fileId，要求 expectedRevision/requestId，并重置 DRAFT。脚本/文案必须有文本才能审核；媒体只能关联同范围/同版本/同用途的 AVAILABLE 文件。审核后再显式 READY；客户端不能提供 storageKey、校验结果或直接指定 READY。返回 AdminManagedAssetSchema，包含 revision、fileId、实际 MIME/大小/摘要和授权 downloadPath。旧 seed 的占位路径没有真实文件，不视为可用媒体。

上传申请使用 AdminUploadPrepareSchema：productVersionId、kind（cover/video）、fileName、mimeType、byteSize、SHA-256 小写十六进制 checksum、requestId。文件名禁止路径分隔和控制字符。支持 PNG/JPEG/WebP 与 MP4/WebM；默认图片 10 MiB、视频 100 MiB，可配置但最多分别 50/512 MiB。每管理员最多 20 份未到期待完成上传，会话有效一小时。

上传流程为 POST /uploads → PUT uploadPath（`application/octet-stream`，原始字节，保留 Cookie/Origin/CSRF）→ POST /uploads/:id/complete（requestId）。实际字节在受限、背压流中计算长度、媒体签名和 SHA-256；单次流期限两分钟，失败清理部分文件。complete 再次检查实际文件，损坏时置 FAILED 并清理，成功才 AVAILABLE。状态为 pending/verifying/uploaded/available/failed/expired；GET 上传状态与上传/完成限原上传管理员，文件读取则允许当前范围有效管理员。AVAILABLE 文件的内容元数据不可修改，重传需新 fileId。此步检查文件格式签名与完整字节摘要，不做转码或逐帧解码。

文件下载返回实际 Content-Type/Length、nosniff、受控文件名和单段 Range/206；非法范围返回 416。只有通过 /products/:id/cover 明确选用的当前已发布版本 READY 封面，才可经 `/api/assets/:assetId/files/:fileId/content` 公开读取。URL 固定文件 ID；素材编辑、归档、商品下架或切换版本后，条件不符即停止公开访问。其他文件不会因 READY 自动公开。

LocalAssetStorage 仅用于开发/测试，保存到 ASSET_DIRECTORY，API 默认工作目录下 `.local/assets`，文件为 0600、目录为 0700。生产拒绝 local 驱动；默认 disabled 时上传返回 503，云端存储适配器和公网持久化在 T09 验收。开发容器本地文件随容器可写层保存，重建容器不保证保留，不能当生产存储。

`POST /api/events` 通过浏览器来源/CSRF/限流后，仅接受 `{kind:"view",productVersionId,campaignCode?,requestId}`，目标必须是当前可见已发布版本。服务器确定 DEMO/WEB 来源，以浏览器摘要和 requestId 去重；改变目标/渠道返回 409。开始、完成、兑换、退款由对应后端事务产生。overview 按 kind/source 分组，人工订单金额单列 recordedAmountFen、paymentVerified=false，attribution=unconfirmed；浏览仍是客户端观察，不计为确认销售或确认归因。

## T12 内容后台（本地已实现）

2026-10-20，T12-A/B/C 全部本地通过。结构化内容契约为 `packages/contracts/src/content.ts` 与 `content-workflow.ts`，只通过 `@orai/contracts/admin` 导出。所有接口沿用前述管理员/范围/Origin/CSRF/限流/no-store；写请求携带 requestId，追加/更新使用预期修订或固定 fingerprint。具体操作和演示入口见 [CONTENT-ADOPTION.md](CONTENT-ADOPTION.md)。

| 方法与路径（以 `/api/admin` 开头） | 输入/用途 |
| --- | --- |
| GET/POST /products/:id/creative-profiles | 分页读取；POST profile、expectedRevision、requestId，追加共同设定 |
| GET /creative-profiles/:id | 固定设定读取 |
| GET /creative-profiles/:id/diff?to=:revisionId | 同商品两份设定差异 |
| GET /content-revisions、/content-revisions/:id | 分页历史/详情；列表支持 productId/productVersionId/assetId/domain、current、creativeProfileRevisionId/platform/status/style；current=true 必须给 productId |
| POST /content-assets | productVersionId/platform/variant/fileId、authoring、expectedRevision/requestId；修改另给 assetId，原子保存素材/输入/来源 |
| GET /content-references | 按 sourceRevisionId/targetRevisionId 分页反查输入及使用者 |
| GET/POST /production-records | 分页查询来源；POST 为 outputRevisionId 登记 creativeProfileRevisionId/production/requestId |
| POST /content-contexts/resolve | 固定设定、domain、明确输入修订/digest/locator；宣传用途只返回题干/公开选项等必要节选 |
| GET /content-revisions/:id/impact | 固定依赖链、设定/上游更新与归档、fingerprint、needsReview/blocked/reviewNote |
| GET /content-revisions/:id/diff?to=:revisionId | 同一内容历史差异，稳定 ID 对齐、保留顺序变化；最多 500 项，返回 truncated |
| POST /content-revisions/:id/recheck | expectedFingerprint、note、requestId；确认合法旧稿，不绕过归档输入 |
| POST /content-packages/preview | ContentPackageSelection：productId、creativeProfileRevisionId、assessmentRevisionId、assetRevisionIds、reportMode=compatible_standard、label |
| POST /content-packages | selection、expectedFingerprint、expectedPackageNumber、note、consistencyConfirmed=true、requestId；再验后保存固定采用包 |
| GET /content-packages/:id | 固定 manifest/摘要，供管理页面 JSON 导出 |
| GET /products/:id/content-packages | 按包号倒序分页，包含已固定内容 |
| GET /products/:id/cleanup-candidates | 分页列出过期且无当前/历史引用文件 |
| POST /file-cleanups/preview | productId、fileIds（1–50 个）、requestId；返回固定清单/digest，十分钟有效 |
| GET /file-cleanups/:id | 原管理员读取固定计划与恢复结果 |
| POST /file-cleanups/:id/execute | expectedDigest、confirmed=true、requestId；重新检查引用、受控清理/重试 |

设定含独立 authoring-only 报告叙事方案，旧严格运行 schema 保留。引用固定 questionId/blockId/sceneId 等位置、来源摘要、原文和实际使用文本；缩写题干记录 adapted。当前稿先取每对象最新修订再筛选，历史匹配项不冒充当前稿。状态流转保留快照，但不作为内容语义更新；复查 fingerprint 固定当时影响，后续更新重新待复查，历史采用包不变。

采用要求同商品/scope/设定、已审核题库和就绪封面/视频/文案、兼容引用、制作来源、实际完整文件及已处理更新；完整依赖最多 1000 节点。当前只支持单人 web、dimensions_v1 与兼容标准图文报告；双方/3D/新报告 renderer 等拒绝采用。JSON 清单包含内容与受保护文件引用，媒体另行授权下载，没有 ZIP；不包含消费者数据、账户凭据和存储路径。采用不会自动发布商品。

清理在预演和执行时检查当前素材及全部历史修订引用，新增引用会保护文件。prepared 计划到期后需重新预演，running 计划可按原清单恢复，不增加候选。失败结果可重试，同计划不重复追加审计；文件经 deleting/deleted 保留不可变元数据，不能复活。没有新增公众文件读取入口。

## T13-A skill 库（本地已实现）

契约为 `packages/contracts/src/skills.ts`，只从 admin 导出。四领域 `assessment/cover/video/copy` 各自维护；所有路径位于 `/api/admin/skills/:domain`，沿用真实管理员、Cookie、Origin/CSRF、限流、scope 和 private/no-store，没有新身份入口。完整包格式、限制与演示见 [STYLE-SKILLS.md](STYLE-SKILLS.md)。

| 方法与路径（相对于领域入口） | 输入/用途 |
| --- | --- |
| GET / | q、style（精确标签）、purpose、form、status、page/pageSize；status 指包含该状态版本，返回最新稿与 activeVersionId |
| POST / | slug、manifest、requestId；初建固定领域/标识，首版 DRAFT，不带参考文件 |
| GET /:id | 库条目、最新稿、当前启用版本 ID |
| GET /:id/versions | 固定历史分页，仅接受 page/pageSize |
| POST /:id/versions | sourceVersionId、expectedSkillRevision、requestId；复制为独立新草稿，保留原文件引用 |
| GET /:id/versions/:versionId | 固定版本与参考文件元数据 |
| PUT /:id/versions/:versionId | manifest、expectedRevision、requestId；仅编辑 DRAFT |
| POST /:id/versions/:versionId/review、/activate、/archive | expectedRevision、requestId；审核后内容固定，启用新版时归档原 ACTIVE |
| GET /:id/versions/:versionId/diff?to=:id | 同一 skill 两份固定 manifest 差异，最多 500 项并显示截断 |
| GET /:id/versions/:versionId/export | 平台 v1 JSON 包；前端另可导出 Markdown 正文 |
| POST /:id/files | fileName、mimeType、byteSize、checksum、requestId；专用参考上传，最多 20 份未到期待完成会话 |
| GET /:id/files/:fileId | 原上传者查询状态 |
| PUT /:id/files/:fileId/content | octet-stream 字节、Origin/CSRF；复用独占流式写入/摘要/限额与两分钟期限 |
| POST /:id/files/:fileId/complete | requestId；重新检查实际类型/摘要后才 AVAILABLE |
| GET /:id/files/:fileId/content | 当前范围管理员授权下载，attachment/nosniff，支持单段 Range |

平台 v1 manifest 包括 schemaVersion/domain/name/description/purposes/styles/supportedForms、inputs/outputs、instructions、examples、references[{path,fileId}]。必填输入包含 creative-profile；assessment 的专业用途区分 assessment_design/report_writing，其他领域分别为 cover_design/video_production/copywriting。元数据支持形式不表示平台已有对应运行器。Markdown 导入只替换正文，不自动读取 YAML 元数据；JSON 可导入 bare manifest 或平台导出包的 manifest，跨环境先重新上传参考文件。

参考附件接受 UTF-8 .md/.txt/.json、PDF、PNG/JPEG/WebP，每份最多 5 MiB，每版本最多 20 个路径和 25 MiB 唯一字节；拒绝未知类型、损坏文本/JSON、错误文件头/摘要及不安全内部路径。上传与归属独立于 ProductVersion/AssetFile；复用现有存储和文件流，原商品媒体接口不会因此接收文档。保存、审核与启用重新检查文件完整性。没有 skill 附件物理删除或任意路径读取入口。

版本/文件在同 skill/scope 下绑定；审核、启用、归档正文和附件不可覆盖，归档仍可读取/导出/复制。导出含受保护文件引用，文件另行授权下载，不含消费者数据、操作者 ID、凭据或服务端路径。当前不是 ZIP/通用客户端技能包安装格式，也不会执行正文或附件。

## T13-B skill 组合与来源（本地已实现）

严格契约在 `skill-bindings.ts`、`content.ts` 和 `content-workflow.ts`，完整操作与固定/历史规则见 [SKILL-BINDINGS.md](SKILL-BINDINGS.md)。均位于现有 `/api/admin` 管理范围；查询严格拒绝调用者指定 scope，写入沿用真实管理员、Origin/CSRF、预期修订、幂等和审计。

| 方法与路径 | 输入/用途 |
| --- | --- |
| GET /skills/:domain/candidates | 必填 purpose/form，可选 q/page/pageSize；以 ACTIVE 版本自身的 manifest 筛选兼容候选 |
| GET /creative-profiles/:id/skill-sets | page/pageSize；固定组合历史 |
| POST /creative-profiles/:id/skill-sets | bindings[{purpose,skillVersionId}] 五用途、note、expectedRevision、requestId；追加组合 |
| GET /creative-skill-sets/:id | 完整固定组合，不含 actor/owner 或服务端路径 |
| GET /creative-skill-sets/:id/domains/:domain | 可选 purpose，只返回此领域/用途固定版本 |
| GET /creative-skill-sets/:id/domains/:domain/:purpose/references/:fileId/content | 验证文件属于该固定用途后下载，支持单段 Range |

`ProductionSource` 新增可选 skillSetId；选择后由服务端确定主 skillVersionId，并在 ProductionRecord 保存 skillSetId 与本领域 skillVersions（题库/兼容报告分别两项）。单独声明任意 skillVersionId 被拒绝。未关联来源保留原格式；manual/external_ai/mcp 是操作者申报，batchKey 仅分组，不代表执行成功。

`POST /content-contexts/resolve` 可选 skillSetId，须属于同一固定设定，仅提供请求领域的指令和显式输入。`ContentPackageSelection` 可选 skillSetId；含 skill 来源时必须明确指定，并要求题库/报告/宣传根产物同套。新包 schemaVersion=2，保存 skillSet 和来源版本；v1 严格包继续原样读取，不注入新默认字段或改摘要。归档不改变固定正文/参考快照，实际参考损坏阻止新制作/采用，历史包仍可读。

## MCP 本地接入（T14-LA/LB 本地已验收）

### O1 统一 Codex 连接（2026-10-22，本地 UI 已批准）

管理端契约为 `codex-connections.ts`，由 `@orai/contracts/admin` 导出。正式 `/admin/machine` 使用统一入口，`?view=legacy` 保留旧单领域管理；原机器 API、MCP 工具及凭据权限名称兼容。下列路由全部要求当前 owner/scope 的有效人类管理员 Cookie，机器身份不能调用；写请求沿用 Origin/CSRF、严格 JSON 和 `private, no-store`。

| 路径 | 输入与行为 |
| --- | --- |
| GET /api/admin/codex-connections | page/pageSize，分页列出当前管理员自己的连接元数据和领域状态，不返回密钥 |
| GET /api/admin/codex-connections/:id | 返回固定方案/摘要、所属工作区和各域凭据元数据；解释整组撤销/到期、工作区继承失效和部分领域失效 |
| POST /api/admin/codex-connections/preview | `CodexConnectionPlan`；只读核对分类、额度、期限、Skill 白名单、领域和业务操作，返回规范化 plan、scope、summary、digest，不创建工作区或授权 |
| POST /api/admin/codex-connections | `{plan,expectedDigest,confirmed:true,clientKey,requestId}`；事务内重核预览摘要、归属与权限，原子保存新工作区（可选）、连接元数据和各域独立凭据 |
| POST /api/admin/codex-connections/:id/revoke | `{requestId}`；原子撤销该连接及其各域凭据，不撤销工作区或同工作区其他连接；保留历史 |

plan 明确 `actions.createProjects/useSkills/uploadDrafts`、1–5 个独立领域、各域 readSkills/uploadDrafts/skillIds、到期时间，以及新工作区的分类/三种额度或已有工作区 ID。三项业务操作默认 false；至少明确允许一项。上传草稿须同时明确允许对应领域读取方法；共享 Skill 必须在该领域和 scope 的白名单内。assessment 才获得 projects:create/write；不授予 skills:write、审核、上架或消费者数据权限。到期为 1 分钟至 90 天，不能晚于工作区到期；数量为 1–100。

`expectedDigest` 固定确认依据，变化返回 REVISION_CONFLICT；`clientKey` 是同 owner/scope 下持久唯一的连接业务键，`requestId` 保持原幂等语义。部分领域写入失败全部回滚。成功响应丢失或提交后读取失败时，沿用原请求恢复既有记录，原始密钥不可重取；不要改业务键再签发。首次成功返回 `secretState=issued_once` 和一次性 secrets，重试仅返回元数据与 `not_recoverable`；幂等缓存只保存连接 ID。

一次性密钥在数据库仅保存摘要；网页只保留当前内存，复制时才填入连接说明，不放入 DOM、URL、Storage 或查询缓存。复制前重新核对连接状态；离开、隐藏、主动隐藏或身份失效后清除。没有收到或保存说明时需撤销后重新设置。说明中的本机 Node/脚本/API/允许目录需由用户在客户端实际填写；保存授权和复制说明都不代表已经接入客户端或启用日程。

R2 设计批准仅覆盖页面与接口实现；本轮 15 项服务测试和 11 个正式浏览器情境采用隔离数据库及身份/剪贴板替身，真实账户连接、真实客户端配置和真机尚未验证。正式 UI 评审见 [本批材料](../../output/design-review/codex-connections-o1-formal-20261022/README.md)。

### O2 方法运营与制作交接（2026-10-22 技术通过，后续指定 UI 已批准）

契约 `project-method-operations.ts` 由 admin 入口导出。新增路由沿用管理员 Cookie、Origin/CSRF、严格 query/body 与 private/no-store；有效机器身份也不能调用这些运营入口。没有新增 Bearer、公开文件或真实授权签发路径。

| 路径 | 已实现行为 |
| --- | --- |
| GET /api/admin/production-modules/:id/method-candidates | purpose、可选 q/status、page/pageSize（最多20）；精确版本、源修订/摘要/正文/附件、共享或本项目候选归属及兼容原因；排除其他项目候选，归档/形式不匹配可见但不能新固定 |
| POST /api/admin/production-modules/:id/methods | 复用原 ProjectMethodCaptureSchema；管理员控制器经新 wrapper 检查当前计划及候选归属，复用原 captureIn；商品 SHARE 锁与计划保存 UPDATE 锁串行。旧 MCP 服务契约及已成功 requestId 回读不变 |
| GET /api/admin/production-modules/:id/handoff-inputs | dependencyId、可选 recordId、recordPage/page/pageSize；直接依赖的固定记录分页（10条）和明确片段分页；没有默认选中记录，不发送完整私有计分 |
| POST /api/admin/production-modules/:id/handoff/preview | expectedModuleDigest、connectionId（可空）、显式 methods/records/inputs；只读核验，返回 ready/issues/checkedAt，齐备时返回固定 manifest/digest |
| POST /api/admin/production-modules/:id/handoff/export | `{selection,expectedDigest}`；重新执行所有检查并比对摘要，不复用过期预览，不保存交接/运行或启动外部作业 |

预览/导出要求每个用途恰好一份本模块方法、每个直接依赖一份同计划的精确记录，核对摘要、共同设定、必要结构内容及真实原件/方法附件字节。内容输入必须来自所选记录并使用明确 locator；宣传域只能选 assessment 题目节选。缺项返回清楚 issues，不能拼历史累积文件冒充完整输入。

连接必须属于当前管理员/scope，领域、工作区商品归属、撤销/到期及 projects:read/skills:read/context:read/content:read/write 均核查；复用机器目标授权，不把管理员可见当作机器有权使用。实际工具调用仍重查。交接不签发任何凭据。

导出固定商品/计划/设定、模块/输出槽位、完整商品方法、最小输入与核验后的原件元数据；移除下载路径、存储键和机器来源身份，包含 executionStarted=false/credentialIncluded=false。当前 MCP 没有通用原件下载工具，二进制仅提供固定引用/摘要，需管理员按授权取回后提供客户端；不冒称只复制说明就完成接入或制作。

沿用不可变方法快照；交接选择仅当前页保留，导出固定清单，刷新重新选择，不创建“已保存运行”。仍为 71 模型/25 迁移，无新表。16 项新增接口集成测试通过，含当前计划并发、真实 INSERT 回滚、同请求恢复和真实文件字节损坏；全量 468 项、类型/构建、14 个正式页面情境/18 图及 57 项既有浏览器回归通过。使用真实隔离 API/数据库与身份/剪贴板替身，真实权限/客户端/真机未通过；O2 指定三张正式 UI 后续于上海 2026-10-23 00:50:40 获批，[批准独立记录](../../output/design-review/project-methods-o2-formal-20261022/APPROVAL.md)，原技术 pending 保持。O3 新接口仍在设计，不属于本节已实现路径。

### 既有领域工具

受限凭据、独立 Bearer API、上传流和领域业务工具共用现有 NestJS/Prisma 服务。实际路径/票据校验见 [传输交接](MCP-LOCAL-TRANSPORT.md)，完整权限、四任务接续与示例见 [业务接入](MCP-CONTENT-TOOLS.md)。共享契约为 `machine.ts`、`machine-content.ts`；题库配置原样拆到 `product-configuration.ts` 并保持 admin 导出兼容。

每个 stdio 进程固定 assessment/cover/video/copy 之一。内容操作统一 `POST /api/machine/:domain/tools/:operation`；下表 HTTP operation 不含领域前缀，SDK 的前七类工具带 `{domain}_` 前缀。所有请求拒绝调用者指定身份/scope、跨领域、未授权商品/skill 和额外字段。

| operation | 输入概要 | 返回 |
| --- | --- | --- |
| list | productId、page/pageSize、current | 分页本领域修订摘要，不含 snapshot |
| get | revisionId | 本领域修订＋production，不含 actorUserId、Cookie 文件 URL；方法快照还需 skills:read 和对应范围 |
| draft_save（assessment） | productId、可选 productVersionId、configuration、creativeProfileRevisionId、skillSetId、expectedRevision、requestId、可选批次/标签 | 新题库内容修订，固定设定和机器来源 |
| draft_save（cover/video/copy） | ContentAssetSave 的 asset/version/platform/variant/file/authoring；production 要求 skillSetId，拒绝 source/skillVersionId | 新宣传内容修订 |
| skill_list | 空对象 | 凭据授权库摘要，不返回每库完整 manifest |
| skill_version_get | skillId、versionId | 完整 manifest 与文件元数据，移除 uploadPath/downloadPath |
| skill_draft_save | skillId、versionId、expectedRevision、requestId、完整 manifest | 可编辑 skill 草稿 |
| skill_draft_clone | skillId、sourceVersionId、expectedSkillRevision、requestId | 新草稿，保留固定源版本 |
| assessment_validate | productId、configuration；只允许 assessment | valid/issues，不保存 |
| context_bundle_get | creativeProfileRevisionId、skillSetId、inputs[{revisionId,digest,locator}] | 同一共同设定、本领域方法与显式片段 |
| references_validate | 同 context，可选 targetRevisionId | valid、context、impact；reviewNote 固定为 null |
| skill_reference_get | skillSetId、purpose、fileId | fileId/path/mimeType/checksum/text；256 KiB 内 UTF-8 文本 |

`content:read/write`、`skills:read/write`、`context:read` 分别授权。指定固定组合还需 skills:read 与组合内本领域 skill 范围；有输入的写入需 context:read。所有输入修订须处于明确授权商品中并匹配摘要/设定，宣传领域访问 assessment 时必须选 question locator；不能取得完整私有计分、私人报告模板或消费者资料。服务端在最终业务事务内复核权限、到期、撤销与管理员状态。

机器写入由服务端固定 `source=mcp`，保存 `machineCredentialId/machineRequestId`，不能由请求体自报；网页原有手动/外部 AI 来源继续可读。题库保存的配置、设定与制作记录同事务提交，状态修订复制来源；丢响应用相同 requestId 和输入重试。修改内容用新 requestId，旧 expectedRevision 返回 REVISION_CONFLICT。新增元数据不改旧内容快照或 v1/v2 历史采用包。

`references_validate.valid=true` 不表示可以采用；仍要检查 impact.blocked/needsReview。精确引用/改写都须提交实际使用位置与 usedText，来源更新、失效、循环或形式不兼容会阻止相应新操作。MCP 不提供发布、采用、退款、发码、物理删除、新 skill 库创建或 skill 激活。

`skill_reference_get` 仅支持固定用途内的 Markdown/纯文本/JSON；图片/PDF 等二进制参考在后台受控查看。stdio 入站上限 2 MiB，API JSON 响应上限 8 MiB，超限返回 RESPONSE_TOO_LARGE 并提示分页/分批；媒体仍通过独立二进制流上传。工具响应安全错误保留已知业务 code，不回传上游消息、路径或凭据。

本机真实 SDK 已分别完成四域共享设定/组合读取、草稿保存与上传，视频固定引用两道题及 hook/cta；临时凭据均已撤销。最终回归通过，本地已验收，证据见 PROGRESS.md。T14-C 的 `/api/mcp/:domain` 远程 Streamable HTTP、认证发现与真实客户端仍待 T09 云条件；本地 Cookie 和本地 stdio 证据不替代远程授权验收。后台不执行模型、渲染或每日调度。

## 设计区域与字段

后续 [T15–T17 体验协议](EXPERIENCE-PLATFORM.md) 将增加版本化公开体验清单、模板/场景/资源配置和检查点。选择型场景继续按 questionId/optionId 保存；排序、分配、真正分支/动作等由独立 schema/评估引擎定义，不属于目前已实现的保存端点能力。体验公开配置不得包含私有计分，MCP 的 experience 制作入口在对应依赖就绪后扩展，具体端点/DTO 尚未固定。


| UI 区域 | 契约字段/状态 | 展示约定 |
| --- | --- | --- |
| 分类/筛选/分页 | category、tags、q、priceFen 范围、duration 范围、experienceType、sort、page/pageSize/total | 条件写 URL；loading、无商品、无搜索结果、错误分别处理 |
| 商品卡/详情 | name、hook、summary、coverUrl、price、duration、questionCount、tags、publicSample | 无封面兜底、长标题、多标签；测试价与估计耗时标识；无真实销量字段 |
| 购买/兑换区 | purchaseUrl/Notice、redemptionNotice、isDemo；CODE_* 错误 | 演示购买地址为空；兑换码使用表单，错误不透露买家身份 |
| 本机记录/我的商品 | Entitlement 的 ownership/status、attemptStatus、reportState | 匿名列表与账户列表分开；继续、完成、到期、撤权与删除各自展示 |
| 答题主区 | questions/options、answers、revision、attemptRevision | 后端确认后保存成功；保存中/失败/重试/冲突；不适用仍是一个有效选择 |
| 侧栏或移动抽屉 | feedback.answers/results、sampleSize、state、updatedAt、versionId、isDemo | 保存后打开；两个分母分别说明；无样本/不足/网络失败均可继续 |
| 报告区 | totalScore、dimensions、missingReason、explanation、suggestion、expiresAt | null 显示信息不足；历史版本和保存期可见；导出不含码/令牌 |
| 账户/绑定区 | Account.emailVerified/role、confirmed、ownership、AUTH/EMAIL 错误 | 使用真实认证状态；显式确认绑定，不隐式合并 |
| 商品/版本运营 | AdminProductInput、configuration、draft/reviewed/published/archived | 草稿预览与公众展示分开；已发布改动创建新版本 |
| 订单/码/素材运营 | platform、reference、quantity、amountFen；素材 kind/status/storageKey/text | 平台来源和测试标记；补发继承旧权益；视频未上传有独立状态 |

布局、颜色和组件外观继续由用户 UI 决定。T08 已用简单功能页面联调并验证 loading/empty/error/success、unauthorized/expired/revoked、信息不足等状态，正式视觉按 T10 接入。

## T08 浏览器接入（本地已验收）

`apps/web/src/api` 处理同域、no-store、Zod 响应校验、内存 CSRF、超时/取消、原意图单次 CSRF 刷新和身份过期回复丢弃。网络/权限/限流/服务故障不会自动重放写入；明确重试相同操作保留 requestId，修改内容产生新请求意图。私密查询在退出、绑定或身份切换时取消/移除，跨标签页只传变更信号，不传令牌、用户 ID 或内容；页面恢复前重新检查会话。

`apps/web/src/admin/api.ts` 共用上述客户端，并以 AdminCategory/Tag、AdminOrderDetail、AdminCsvResult、AdminOverview、AdminAudit 等响应 schema 验证现有 T07 响应。旧 seed 兑换码的 batchId 可以为 null；概览兑换事件名为 redemption。没有增加管理授权方式或数据库迁移。

真实 `/apps`、`/reports` 用 source 参数分别展示匿名与账户数据；设计预览在 `/preview/*`。报告导出只取 productName/resultLabel/totalScore/versionNumber/isDemo/disclaimer，长内容自适应图片高度，不含报告 ID、账户、答案或凭据。删除使用现有 DELETE/204，恢复和退款继续以服务器状态为准。媒体新文件未校验/保存时不允许审核或采用，修订冲突可重新读取；当前封面商品查询支持跨页查找。

22 项隔离浏览器流程通过。外部认证事实仅由测试提供；长文本和故障响应夹具不计为真实云服务验收。T06-C/T09 的邮件、云 Auth、持久化对象存储和公网链路仍待完成。

## T14.P1 项目计划（已实现并验收）

管理员契约见 production-plans.ts，具体端点见 [项目制作底座](PRODUCTION-PLANS.md)。新增固定计划读写、列表与 validate/inspection，沿用 Cookie、Origin/CSRF、scope、幂等/修订和审计。旧机器凭据不获得这些权限。返回 planning_only，检查区分证据新鲜度、未导入原件/未捕获方法与注册模板配对，不表示可运行或可留存。

## T14.P2 项目候选方法与外部来源（已实现并验收）

project-production.ts 固定候选捕获、来源保存与响应契约；实际 /api/admin 的 methods/productions、精确历史及参考/原件下载路径见 [项目制作底座](PRODUCTION-PLANS.md#p2-管理接口)。继续当前管理员/范围/CSRF/幂等/审计，原 MCP 凭据不能使用；P3 再接受限适配。返回 saved_outputs/platformExecuted=false/archiveReady=false，不接受伪造执行成功或全局启用。动态 inspection 区分方法捕获程度与 declared_not_imported/partially_recorded/recorded_not_revalidated；保存记录不是本次文件再校验或项目审核通过。

### T14.P3 受限项目 MCP（2026-10-22，本地验收通过）

工作区、凭证扩展与 16 个项目工具的实际参数、权限和边界见 [MCP-PROJECTS.md](MCP-PROJECTS.md)。新增管理员工作区接口保留 Cookie/Origin/CSRF；机器仍使用五个领域的 bearer 入口，项目候选路径独立于旧 ACTIVE 方法组合。远程入口未启用。


### T14.P4 项目审核与原件（2026-10-22，本地验收通过）

固定项目选择、预览 fingerprint、部分稿、submit/return/retain、历史原件/媒体/方法取回及 project_original 上传契约见 [PROJECT-RETENTION.md](PROJECT-RETENTION.md)。该 manifest 使用独立 kind/schemaVersion，原有内容包 v1/v2 保持原形和原摘要。审核留存不发布或启用 skill。

## T10.G5 项目画布布局（本地技术验收通过，G8 指定编辑画面已获批）

管理员 GET/POST `/api/admin/production-plans/:id/canvas-layout` 复用真实 Cookie 会话与 scope，写入仍需 Origin/CSRF、expectedRevision、expectedPlanDigest 和 requestId；机器凭据不能使用。契约见 `packages/contracts/src/project-canvas.ts`，服务见 `apps/api/src/operations/project-canvas.service.ts`。

GET 返回精确计划、最新计划 ID、是否可编辑和最新布局；可选 `layoutRevisionId` 只读回看属于该计划的旧布局，不回退其他版本。POST 的 `layout` 为 schemaVersion=1 的位置清单，只接受 `plan` / `module:<该计划稳定 moduleKey>`，最多 41 个唯一节点，x/y 为 ±100000 内有限数值。返回追加的布局版本、摘要和时间；旧计划、旧布局修订竞争或摘要失配返回 `REVISION_CONFLICT`，跨 scope/归属拒绝。

原计划保存 POST 兼容可选 `layout`，新计划与其初始布局原子保存；独立布局保存不追加业务计划修订、不改变计划 digest。固定方法、来源及归属关系不属于可编辑依赖。客户端新增模块/依赖变更仍提交完整计划并沿用既有后端循环/稳定身份/40 模块验证；历史计划/方法/产物/审核不改写。G5–G7 技术结果与 [G8 评审材料](../../output/design-review/project-planning-g7-20261022/README.md)分别记录。

## T14.O3 运行运营与恢复说明（2026-10-23，正式接口已实现）

共享契约 `production-run-operations.ts`，服务 `ProductionRunOperationsService`；下列均为管理员 Cookie API，沿用严格 schema、Origin/CSRF、当前管理员/scope 和 private/no-store。机器 Bearer 不能调用，不新增任意身份或真实授权签发接口。原 W/MCP run/attempt 契约与工具路径保留。

| 路径 | 已实现行为 |
| --- | --- |
| GET /api/admin/production-runs/:id/operations | 服务端 checkedAt、固定 run/商品、工作区归属、批次/阶段/限额诊断、各模块最后申报/认领/成果/复查分列、已知申报与未知标记；不宣称本次重新验过文件字节 |
| GET /api/admin/production-runs/:id/attempts | planModuleId、page/pageSize（最多20）；精确批次/模块历史代次及固定回执分页，无 token |
| POST /api/admin/production-runs/:id/stop/preview | 严格空对象；只读影响摘要、已保存模块数、原未知作业列表和可操作条件，返回固定 digest |
| POST /api/admin/production-runs/:id/stop | expectedDigest、原因、consent=true、requestId；同批次锁内重查影响，只允许工作区 owner；复用原 run 取消字段/幂等/审计，原请求可恢复一次停止 |
| GET /api/admin/production-attempts/:id/recovery-inputs | 原尝试 recordId、page/pageSize（最多50），只给原输入的最小片段/文件原件说明，不返回完整私有计分 |
| POST /api/admin/production-attempts/:id/recovery/preview | expectedRevision/generation、已有 connectionId、明确片段、consent=true；只接受当前尝试，原方法和依赖记录由服务端固定，不允许客户端替换 |
| POST /api/admin/production-attempts/:id/recovery/export | `{selection,expectedDigest}`；重新核对当前状态/代次/权限/文件及摘要，返回 `{digest,manifest}`，不保存或发起恢复任务 |

所有新增 POST 返回 200。停止确认与既有 MCP cancel 共用 `external-run` 事务锁和取消逻辑，回执并发变化拒绝旧影响摘要；结果未知原请求回读，一条取消/审计，不再次停止。停止只约束此 run 的 W 接续；第三方作业、旧 standalone 草稿/上传边界保持，成功方法/成果/文件/历史/审核不删除，不复活或扩大原策略。

恢复严格核对当前 owner/工作区、领域、精确 attempt 的 canonical 机器目标权限、撤销/期限、原方法/记录/最小片段和真实必要原件/参考附件字节。原作业未知时 action=inspect_original_job，有效认领时 inspect_current_attempt，已报告终态且条件满足时才 explicit_retry 并附 retryOfAttemptId；网页不发起 claim。计划头变化时可整理旧作业查询依据，仍使用其原计划/输入，不能把新版接进未知旧 jobId。过期、达限、停止、历史代次或权限不符时不返回可继续的 manifest。

manifest 固定 run/limits、attempt/revision/generation、依据摘要、原 provider/jobId、完整固定方法和最小输入；移除机器凭据、leaseToken、存储键和内部下载路径。嵌套 fixed.instructions 仅说明固定依据，下一步以外层恢复 action/instructions 为准，不能混入直接制作步骤。二进制原件按授权另取，复制不等于客户端接入、原件下载或制作成功。只读预览/导出不写运行、尝试、事件或审计。

恢复兼容既有 W 批次中最多 12 份固定方法，允许保留同用途的原组合；仅内部 fixedHistory 读取使用独立恢复 schema。O2 新选择仍每用途一份、最多两份，公开选择/交接 schema 不放宽。真实集成检查覆盖三份同用途方法的旧批次，恢复/导出完整保留且不新增尝试。

20 项新增接口集成检查、17 个正式浏览器情境/22 图及全量 488 项测试、类型/构建通过；本轮 57 项旧回归及 64 类表/1157 行旧字段、25 迁移与历史引用保全通过，临时库 0，详见 PROGRESS。验证仅真实隔离 API/TEST 库与身份/剪贴板替身，真实权限/客户端/真机未验收，当前正式 UI 独立待审。无新表/迁移，仍 71 模型/25 迁移。


## T14.O4 未启用配置接口计划（尚未实现）

O3指定正式三图已获独立批准，原接口/技术证据保持。O4-C完成实码核查，拟新增管理员`external-run-configurations`的分页/详情/不可变修订保存/只读validate与export；完整职责、nullable草稿、owner/scope、幂等/冲突、固定引用/等待条件、目录默认隐藏及未启用交接见[主能力契约](PLATFORM-BUSINESS-ACCEPTANCE.md#o4-实施契约待新设计批准尚未实现)。

本轮只交具体原型，尚无此路径、共享schema或服务实现，不可调用。没有新增MCP工具、模型调用、客户端配置或定时器；正式实现须先通过O4新设计审核，再隔离验证与独立正式UI验收。

## T14.O4 运行配置正式接口（2026-10-23）

上节为设计交付时记录。用户于上海03:02:52在指定三图审核后回复“继续”，[批准独立记录](../../output/design-review/external-run-configuration-o4-20261023/APPROVAL.md)。正式契约`external-run-configurations.ts`和`ExternalRunConfigurationsService`已实现，下列为管理员Cookie API，严格schema、owner/scope、Origin/CSRF及private/no-store；机器Bearer和普通账户不能使用。全部POST返回200，无执行或启用接口。

| 路径 | 实现职责 |
| --- | --- |
| GET /api/admin/external-run-configurations | 当前管理员/scope分页列表，返回稳定配置及当前修订 |
| GET /api/admin/external-run-configurations/options | workspaceId和分页；仅当前管理员工作区、商品及当前计划精确ID/digest，不自动选择 |
| POST /api/admin/external-run-configurations | document、clientKey、requestId；允许合法不完整草稿，锁定稳定业务身份，首次容器与修订原子保存 |
| GET /api/admin/external-run-configurations/:id | 可选revisionId，返回属于该配置的精确修订及实际currentRevision；历史只读 |
| GET /api/admin/external-run-configurations/:id/revisions | 修订降序分页；旧document和摘要不可覆盖 |
| POST /api/admin/external-run-configurations/:id/revisions | document、expectedRevision、requestId；同配置锁追加下一修订，工作区不可迁移，冲突拒绝覆盖 |
| POST /api/admin/external-run-configurations/:id/validate | revisionId、expectedDigest；只读、同配置锁核对并给checkedAt/validation digest/issues/firstDeclaredTime与固定范围摘要 |
| POST /api/admin/external-run-configurations/:id/export | 前述修订标识＋expectedValidationDigest、consent=true、includeWorkingDirectory布尔值和format=json/markdown；再次核验后返回digest/manifest/可选Markdown |

document固定schemaVersion=1、当前工作区、已有连接、既有商品/精确计划或新题目准备、客户端/私有目录、日期时间/IANA时区/产量、来源、单任务/领域分工、每用途方法及依赖、工具/费用/限额和恢复规则。未知值用null，不代默认实际参数；来源地区/语言/名称/URL可存未知，固定依赖也可先存recordId/digest=null，但此时不得夹带片段。工具未准/费用未知、缺项或引用失效均保持未就绪。

保存只核对引用归属与固定摘要；校验/导出才复用O2真实方法附件/依赖原件字节与canonical机器目标权限检查。等待依赖只声明本批上游条件，无伪造recordId；固定依赖必须选择精确记录、摘要与必要最小片段，不能夹带计分或个人报告。新题目无S0–S2产物时不得携带旧商品/方法。计划/权限等变化使旧校验摘要失效，导出409保留选择后重新确认。

时间检查整个有限重复窗口的夏令时缺失/重复时间、首尾发生时刻、90天范围与连接期限；不代选偏移，不补跑。来源选题仅核对固定证据的时间元数据，发布时间未知/过期/未来不当新鲜，没有执行来源访问或过滤。费用只是声明，未知不当0元；阶段不得扩大总限，平台不保证第三方账单或终止在途作业。

所有结果固定enabled=false、executionStarted=false、externalReadiness=not_verified。字段齐备导出review_only；不完整导出incomplete_review，handoffInstructions为空。JSON/Markdown都不含凭据、leaseToken、内部存储键或下载路径。API必须显式给includeWorkingDirectory；页面每次打开导出都恢复隐藏目录并重新确认。实际外部调用仍重查权限，清单不是账户接入、工具许可或执行授权。

新增两表及第26份迁移，仅保存配置与不可变修订，不写run/attempt或改已有凭据。正式实现使用隔离API/TEST库及必要身份/剪贴板替身验证；本批实际数字与正式UI停止点见[PROGRESS](PROGRESS.md)和[正式评审](../../output/design-review/external-run-configuration-o4-formal-20261023/README.md)。原型和历史pending保持，新的正式UI独立待验收。
# 2026-10-27 · 商品规划 v2（T16.C2-A）

现有 `/api/admin/products/:id/production-plans`、`/production-plans/:id` 与 validate/inspection 路由，以及 `project_plan_get/save/validate` MCP 工具共用 `ProductionPlanDocumentSchema`。v1 保持原字段与规范化顺序；v2 必填 `productPlan`，不向严格 v1 补字段。MCP bootstrap 同样区分两版本，服务器绑定真实 profile 后再次校验。

v2 的 `productPlan.implementation` 固定 `threejs`，视觉、十一项制作决定、设备与预算分别表达；模块/renderer/report 配对仍由 `modules[].target` 唯一拥有。精确来源只允许同商品/scope 的不可变内容、体验版本和项目方法快照，错误 ID 为 NOT_FOUND，错误摘要为 REVISION_CONFLICT，共同设定/领域不一致为 CONFLICT；不读取任意 URL 或文件路径。草稿允许待规划，结构校验不执行场景或认证作者依据。既有管理员/机器授权、expectedRevision、requestId、审计和事务保持。

完整字段与兼容约束见[PRODUCTION-PLANS](PRODUCTION-PLANS.md#2026-10-27t16c2-a-商品规划合同)；正式 Skill 政策与发布门禁分别留给任务02/03。
