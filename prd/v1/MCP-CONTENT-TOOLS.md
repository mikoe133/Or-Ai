# T14-LB：四领域本地 MCP 内容接入

2026-10-27：02已完成新Skill服务端政策。新写入须manifest v2＋productPolicy v1＋共同/专业条款和必填product-plan声明；实际制作固定当前v2规划及对应模块。历史v1仍可读取，复制升级须显式传manifest；MCP同样校验领域、文件与连接权限。正式发布完整性留给03，旧库批量升级留给04。

2026-10-26 商品制作规则：全部商品正常体验统一 Three.js，七用途 Skill 明示要求，动画/镜头/交互依固定商品规划，见 [统一规范](PRODUCT-IMPLEMENTATION-POLICY.md)。四领域及 experience 的 skill/context 工具描述已同步制作指引；真实输入/输出结构、权限与原摘要继续兼容。工具说明不等于服务端强制门禁，后续01/02已补规划和新写入/新绑定校验，发布完整性仍由03持有，旧 Skill 须新版本升级。

2026-10-23：四领域与可选 experience 的 `context_bundle_get` 支持显式 `includeCapabilities:true`，返回共享的 v1 能力/编辑模块/预算和待开发形式；默认旧响应保持。四领域为 `basis=creative_profile`，不据设定选择运行版本；experience 为 `basis=content_version`，依据实际固定内容。能力描述不提供执行、审核或发布权限。`includeTemplates:true` 原体验发现保持兼容，详细约束见 [商品能力](EXPERIENCE-PLATFORM.md#7-2026-10-23--商品能力声明与内容工作台适配本地已完成)。

本地包：`packages/mcp`。共同契约：`packages/contracts/src/machine-content.ts`。机器入口：`/api/machine/:domain`。传输是客户端启动本机进程的 stdio；云端 Streamable HTTP 与 OAuth 发现仍属于 T14-C。

2026-10-21：T15-B 可选 `experience` 制作领域、两用途、独立图片及 16 个 stdio 工具已验收，界面获用户批准。T16-A 新组合通过显式 `context_bundle_get(includeTemplates:true)` 发现，默认响应不变；真实 SDK 已通过新组合的 PNG/草稿联调，新画面待单独审核。配置/工具/权限见 [体验交接](EXPERIENCE-RUNTIME.md)。原四任务/五用途组合继续兼容，没有第五类商业交付物或每日自动任务。

平台把情绪目标、理解目标、参与视角、商品形式、风格、报告方案固定在一份创作设定中。五个专业用途的方法固定在同一个 skill 组合：题目设计、报告写作、封面设计、视频制作、文案。四个任务分别产出内容；保存时校验每份稿件的设定、方法与输入，成套采用时再校验四类产物采用同一份设定和组合。`batchKey` 用于追溯分组，本身不强制全组一致。

## 准备连接

管理员先在后台准备商品、创作设定和五用途 skill 组合，再签发四个对应领域的机器凭据。每份凭据明确指定 `productIds`、`skillIds`、所需权限、到期时间；没有“所有商品/所有库”的隐含通配授权。

| 进程 | 环境中的领域 | 用到的专业用途 |
| --- | --- | --- |
| orai-assessment | assessment | assessment_design、report_writing |
| orai-cover | cover | cover_design |
| orai-video | video | video_production |
| orai-copy | copy | copywriting |

每个进程直接使用当前项目 Node 和已构建的 CLI：

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/orai/packages/mcp/dist/cli.js"],
  "env": {
    "ORAI_MCP_DOMAIN": "video",
    "ORAI_MCP_API_URL": "http://127.0.0.1:4100",
    "ORAI_MCP_ALLOWED_ROOT": "/absolute/path/to/local/video-outputs"
  }
}
```

这是通用进程字段示意，具体外层配置取决于 MCP 客户端。通过客户端安全环境配置额外注入该领域的 `ORAI_MCP_TOKEN`。四个进程各用各自的 token；不把 token 写入仓库、任务提示词或输出产物。不要用会向 stdout 打印提示的包管理器命令作为协议入口。

在仓库根目录构建：

```sh
pnpm --filter @orai/contracts build
pnpm --filter @orai/mcp build
```

`connection_get` 返回当前领域、授权范围和能力列表，新接口的 `stage` 为 `content`。连接成功只说明可以访问已授权能力；不会自动执行 skill、调用生成模型或启动每日任务。

## 工具与权限

`{domain}` 为进程固定的领域。业务工具对应 `POST /api/machine/:domain/tools/:operation`，HTTP operation 不含领域前缀。服务器不依赖工具列表进行授权。

| 工具 | 必要权限与目标 | 输出 |
| --- | --- | --- |
| `{domain}_list` | content:read；明确授权商品 | 分页修订摘要，不含完整 snapshot |
| `{domain}_get` | content:read；本领域授权修订 | 完整本领域 snapshot、制作来源；获 skills:read 时才含获授权的方法快照 |
| `{domain}_draft_save` | content:write；授权商品版本、创作设定；skills:read 与组合内本领域 skill 范围 | 新内容修订、digest |
| `{domain}_skill_list` | skills:read；凭据列明的库 | 库及最新版本摘要 |
| `{domain}_skill_version_get` | skills:read；授权库内明确版本 | 完整 manifest 与安全文件元数据 |
| `{domain}_skill_draft_save` | skills:write；授权库内 DRAFT | 更新后的 skill 草稿 |
| `{domain}_skill_draft_clone` | skills:read、skills:write；授权库内固定源版本 | 新 skill 草稿 |
| `assessment_validate` | 仅 assessment；content:write；授权商品 | `valid` 与有界 `issues`，不保存 |
| `context_bundle_get` | context:read、skills:read；授权商品、组合与本领域方法 | 共同设定、本领域方法、显式片段 |
| `references_validate` | 同上；提供目标修订时另需 content:read | 校验后的 context 与可选 impact |
| `skill_reference_get` | context:read、skills:read；授权组合、本领域用途和实际所属文件 | 受控参考文本 |

保存草稿包含输入引用时，还需要 `context:read`。上传的 fileId 必须已校验、用途和商品版本吻合，并满足当前凭据的文件归属约束。读取其他领域的片段使用 context 工具；直接 get 只允许自己的领域。

五个传输工具继续可用：`connection_get`、`upload_prepare`、`upload_status`、`upload_file`、`upload_complete`。完整文件流流程见 [适配器 README](../../packages/mcp/README.md)。只有上传完成且 `available` 的 fileId 可以用于保存。

没有创建新 skill 库、审核/激活 skill、发布商品、采用内容包、退款、发码或物理删除工具。新库由管理员先创建并加入凭据范围；MCP 在允许的库内读取、复制和编辑草稿。

## 四个任务如何接续

管理员在一次制作批次开始前确定 `productId`、`creativeProfileRevisionId`、`skillSetId` 和 `batchKey`。这些值是任务输入；任务不能自行猜测“最新的风格”并换用另一组方法。

1. **题目/报告任务**：调用 assessment 的 context 与 skill 工具，完成 configuration，先 `assessment_validate` 再 `assessment_draft_save`。记录返回的 revisionId、digest、productVersionId 与实际 questionId。
2. **文案任务**：从同一 profile / set 取得 context，选择需要的题目片段，保存含 title、hook、body、cta 等明确 blockId 的文案草稿。记录文案 revisionId、digest 和 blockId。
3. **封面任务**：按同一设定及封面方法制作，可选择步骤 1 的题目和步骤 2 的 hook。媒体在本地允许目录中生成，流式上传后把 fileId / previewFileId 写入封面草稿。若它不依赖文案，可在题目确定后与文案任务并行。
4. **视频任务**：在输入齐全后读取两道明确题目、hook/cta 和需要的封面片段，再制作视频/脚本。保存具体 sceneId、输入位置和使用文本。大视频留在本地，按既有策略上传实际需要的交付或预览文件。

四个任务可分别把非敏感交接信息写到本地 `runs/<batchKey>/assessment.json`、`copy.json`、`cover.json`、`video.json`。每份文件仅记录共同设定 ID、组合 ID、输出 revisionId / digest、定位 ID、允许的本地档案编号和完成状态；不用同时覆盖同一个共享 JSON，也不保存凭据。

这些文件是任务间的交接依据，服务端的固定修订与摘要仍是保存时的权威。上游重新生成后产生新修订，应由下游明确重新读取并重新保存，不能悄悄把旧引用替换为新内容。

## 最小输入与使用快照

context 请求示意；其中尖括号均替换为实际 ID 或 SHA-256：

```json
{
  "creativeProfileRevisionId": "<共同创作设定修订>",
  "skillSetId": "<固定五用途组合>",
  "inputs": [
    {
      "revisionId": "<题库内容修订>",
      "digest": "<该修订的64位摘要>",
      "locator": { "kind": "question", "questionId": "q1" }
    },
    {
      "revisionId": "<文案内容修订>",
      "digest": "<该修订的64位摘要>",
      "locator": { "kind": "block", "blockId": "hook" }
    }
  ]
}
```

宣传领域访问 assessment 必须指定 question locator；不能选择 whole 后获取完整计分、阈值或私人报告模板。每条输入都须属于凭据授权的商品范围并匹配 digest 和共同设定。其他内容按 whole / block / scene 选择实际需要的片段。

保存宣传草稿时，在 `authoring.inputs` 中说明实际使用情况：

```json
{
  "sourceRevisionId": "<题库内容修订>",
  "sourceDigest": "<该修订的64位摘要>",
  "locator": { "kind": "question", "questionId": "q1" },
  "targetLocator": { "kind": "scene", "sceneId": "opening" },
  "role": "question",
  "mode": "exact",
  "usedText": "这道题在 opening 分镜中实际出现的完整文本"
}
```

`exact` 要求使用文本与来源一致，改写使用 `adapted`；两者都检查 `usedText` 实际出现在目标位置。上下文读取不会自动证明输出使用了该内容，保存时仍要提交使用快照。循环引用、错绑、失效摘要或设定不一致会被拒绝。

`references_validate` 可以在同样的 context 参数外增加 `targetRevisionId`，检查已保存产物是否受上游变化影响。**`valid: true` 仅表示本次输入解析与引用校验成功；不等于可以采用或发布。** 检查 `impact.blocked`、`impact.needsReview` 和 alerts。审核备注不返回，机器也不会自动确认管理员复查。

## 完整 skill manifest

以下是一个完整、可作为草稿基础的 copy manifest。它没有参考附件；如要引用包内文件，先上传并取得可用 fileId，再在 references 中登记实际相对路径，正文引用须与清单匹配。

```json
{
  "schemaVersion": 2,
  "domain": "copy",
  "name": "温柔提问与具体邀请",
  "description": "围绕共同创作设定写宣传文案，邀请用户了解自己或双方关系。",
  "purposes": [
    "copywriting"
  ],
  "styles": [
    "温柔",
    "具体"
  ],
  "supportedForms": [
    "web",
    "cards",
    "2.5d",
    "3d",
    "game"
  ],
  "inputs": [
    {
      "key": "creative-profile",
      "description": "固定创作设定，包含情绪目标、理解目标、参与视角、形式与风格。",
      "required": true
    },
    {
      "key": "selected-fragments",
      "description": "经过授权读取的题目片段及实际定位，不包含私人回答。",
      "required": false
    },
    {
      "key": "product-plan",
      "description": "固定版本的商品规划，含 Three.js 场景、动画/镜头与交互决定；未确定项明确标记待规划",
      "required": true
    }
  ],
  "outputs": [
    {
      "key": "copy",
      "description": "包含稳定 blockId 的 title、hook、body、cta 文案块及实际使用快照。"
    }
  ],
  "instructions": "先阅读共同创作设定，围绕情绪目标和理解目标表达。使用具体场景和邀请式语言，不用诊断性标签或确定性关系判断。形式和语言与当前商品一致。引用题目时保留来源修订、摘要、questionId和实际使用文本；改写明确标注adapted。输出可编辑草稿，交由运营审核。\n\n## 商品实现约束 · Three.js\n\n所有商品的正常体验必须使用 Three.js 制作，并具有实际可运行、与商品内容相关的场景；不能以普通网页表单或空白 Canvas 冒充 Three.js 商品。\nThree.js 是统一实现基线，视觉可以是 2D、2.5D 或 3D。动画、镜头、场景切换、物体操作、确认与反馈均以该商品固定版本的规划为准，不默认套用静心花园、固定动画或小游戏。\n制作前必须读取共同创作设定及商品规划。未明确的动画或交互记为待规划，不自行承诺、补造或把未实现玩法标成可用。\n题目、报告、封面、视频和文案须对应同一商品的场景、风格及真实能力；各交付物按其媒介制作，宣传不得夸大交互和效果。\nDOM 可用于文字、无障碍和设备故障回退；正常商品体验仍须包含实际 Three.js 场景。已有答案、评分、保存恢复及权益语义按已注册能力处理，不以渲染技术替代新玩法的评估协议。\n历史商品、报告和 Skill 版本保持原样，改造须追加新版本并审核。\n\n文案依据商品真实的 Three.js 体验、情绪目标和最终交付表达价值；动画和玩法未确定时不得写成已经具备的卖点。",
  "examples": [
    {
      "title": "邀请用户观察自己的沟通方式",
      "input": "情绪目标是被理解，理解目标是发现自己何时更愿意表达。",
      "output": "hook：你通常在什么时候，才愿意说出真正的感受？cta：留几分钟，看看自己更需要怎样的回应。"
    }
  ],
  "references": [],
  "productPolicy": {
    "schemaVersion": 1,
    "implementation": "threejs",
    "applicability": "all_declared_purposes",
    "planInput": {
      "key": "product-plan",
      "schemaVersion": 2,
      "required": true
    },
    "decisions": "fixed_product_plan"
  }
}
```

保存工具参数还需 `skillId`、`versionId`、`expectedRevision`、`requestId` 与上述 `manifest`。版本已固定时先调用skill_draft_clone；旧manifest升级时显式传入合规v2 manifest，再使用返回的新versionId和revision保存。新清单参考文件仍须属于授权Skill；尚未关联的上传必须由当前连接拥有，复制不扩大上传权限。管理员随后审核、启用并创建新的固定组合；原组合和历史内容继续保留原版本。

首次创建新库、改变授权范围、采用新的风格组合都通过后台完成。MCP 保存 manifest 不会把该 skill 安装到客户端或执行其中的命令。

## 参考文件与容量

`skill_reference_get` 参数是 `skillSetId`、`purpose`、`fileId`，三者必须对应同一个固定用途的真实参考文件。返回 `{fileId,path,mimeType,checksum,text}`；path 为包内相对路径。

首期支持最多 256 KiB 的 UTF-8 `text/markdown`、`text/plain`、`application/json`。图片和 PDF 等二进制参考先在运营后台受控查看，不使用 Base64 塞入 MCP 消息；正文与附件仍受固定版本约束。

stdio 入站上限 2 MiB，足以容纳平台当前 200,000 字符 skill manifest 和 300,000 字符 authoring 的中文文本。API JSON 响应硬上限 8 MiB。修订列表只返回摘要；完整内容通过 get 读取。大量 context 输入按实际需要分批请求，超限得到 `RESPONSE_TOO_LARGE` 和分批提示。媒体字节始终通过独立上传流传输。

## 重试、冲突与人工审核

每次写操作生成一个 requestId。响应丢失时用同一 requestId 和完全相同输入重试；修改输入必须使用新 requestId。`REVISION_CONFLICT` 表示先读取最新状态再决定如何修改，不能直接递增数字绕过检查。相同请求号配不同内容会得到幂等冲突。

机器凭据撤销、到期或管理员停用后，新调用与上传完成都会拒绝。机器内容保留来源、固定设定/方法和输入快照，后台仍能核对合法历史。临时文件失败或未完成不会得到可用 fileId。

产物完成后，运营在后台检查实际题目/报告、封面、视频、文案和引用关系，处理需要复查的来源，再采用一致的内容包。发布及真正每日自动化的启用不由这些内容工具代替。
