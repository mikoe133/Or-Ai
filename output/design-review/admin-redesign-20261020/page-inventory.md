# 后台页面清单与设计覆盖

日期：2026-10-20。依据当前 `apps/web/src/admin` 与 `store/flow-shell.tsx` 的实际实现，只读梳理。设计内容与账号、凭据、生产业务无关联；全部样例标为「设计示例」。

## 覆盖口径

当前有 **7 个后台导航入口**：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。另有指向 `/account` 的账户链接，属于后台外页面，不列入此次后台主体。

本次拆出 **31 个主体页面／关键工作状态 + 1 个权限页面 = 32 个设计画面**，每画面提供 A / B / C / D 四风格，共 128 个可比较的设计视图。这里的「画面」是设计覆盖单元，不承诺新增 32 个正式路由：当前商品、素材、订单、MCP 及 skill 的列表、创建、详情大量共址长页，重设计将其整理为清晰的列表与详情／抽屉状态。

内容工作台真实存在 **10 个页签**，全部独立设计：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。skill 库四领域共享结构，但各有列表和详情设计，不以一张通用图替代其他领域。

同模板的空态、加载、失败、未保存、只读、确认状态保留为设计注记，不按每种组合再重复计页。题库的报告解释、公开样例和高级配置作为同一专业编辑器的分区／内部页签；商品版本管理作为商品详情内部页签。

## 所有页面

| 序号 | Page ID | 页面／工作状态 | kind | 主操作 | 实际入口 |
|---:|---|---|---|---|---|
| 01 | `overview` | 概览与审计 | `overview` | 进入内容工作台 | `/admin` |
| 02 | `products-list` | 商品与版本 | `table` | 新建商品 | `/admin/products` |
| 03 | `product-detail` | 商品资料与版本 | `product` | 保存商品资料 | `/admin/products（选中商品）` |
| 04 | `content-list` | 内容工作台 | `table` | 管理商品资料 | `/admin/content` |
| 05 | `content-profile` | 创作设定 | `profile` | 保存为新修订 | `/admin/content/:productId?tab=profile` |
| 06 | `content-bindings` | skill 组合 | `bindings` | 保存新组合 | `/admin/content/:productId?tab=skills` |
| 07 | `content-assessment` | 题库与报告 | `assessment` | 保存题库草稿 | `/admin/content/:productId?tab=assessment` |
| 08 | `content-cover` | 封面 | `cover` | 保存封面草稿 | `/admin/content/:productId?tab=cover` |
| 09 | `content-video` | 视频与分镜 | `video` | 保存视频草稿 | `/admin/content/:productId?tab=video` |
| 10 | `content-copy` | 引流文案 | `copy` | 保存文案草稿 | `/admin/content/:productId?tab=copy` |
| 11 | `content-preview` | 整套预览 | `preview` | 去成套采用 | `/admin/content/:productId?tab=preview` |
| 12 | `content-references` | 引用与历史 | `references` | 确认继续使用固定稿 | `/admin/content/:productId?tab=history` |
| 13 | `content-adoption` | 成套采用 | `adoption` | 校验采用组合 | `/admin/content/:productId?tab=adoption` |
| 14 | `content-cleanup` | 文件清理 | `cleanup` | 生成清理预演 | `/admin/content/:productId?tab=cleanup` |
| 15 | `media-list` | 素材与文件 | `media` | 新建素材 | `/admin/assets` |
| 16 | `media-detail` | 素材详情 | `media` | 保存素材修改 | `/admin/assets（选中素材）` |
| 17 | `skills-assessment` | 题库与报告 skill 库 | `skills` | 新建 skill | `/admin/skills/assessment` |
| 18 | `skill-assessment-editor` | 关系观察设计 | `skill-editor` | 保存 skill 草稿 | `/admin/skills/assessment?skill=:skillId&version=:versionId` |
| 19 | `skills-cover` | 封面 skill 库 | `skills` | 新建 skill | `/admin/skills/cover` |
| 20 | `skill-cover-editor` | 纸感留白封面 | `skill-editor` | 保存 skill 草稿 | `/admin/skills/cover?skill=:skillId&version=:versionId` |
| 21 | `skills-video` | 视频 skill 库 | `skills` | 新建 skill | `/admin/skills/video` |
| 22 | `skill-video-editor` | 日常片段叙事 | `skill-editor` | 保存 skill 草稿 | `/admin/skills/video?skill=:skillId&version=:versionId` |
| 23 | `skills-copy` | 引流文案 skill 库 | `skills` | 新建 skill | `/admin/skills/copy` |
| 24 | `skill-copy-editor` | 温柔提问文案 | `skill-editor` | 保存 skill 草稿 | `/admin/skills/copy?skill=:skillId&version=:versionId` |
| 25 | `machine-list` | MCP 连接 | `machine` | 创建连接 | `/admin/machine` |
| 26 | `machine-new` | 创建 MCP 连接 | `machine-new` | 签发连接凭据 | `/admin/machine（创建状态）` |
| 27 | `machine-calls` | 连接调用记录 | `machine-calls` | 刷新调用记录 | `/admin/machine（选中连接）` |
| 28 | `orders-list` | 订单与售后 | `table` | 人工录入 | `/admin/orders` |
| 29 | `order-new` | 人工录入订单 | `order-new` | 记录订单 | `/admin/orders（录入状态）` |
| 30 | `orders-csv` | CSV 订单导入 | `csv` | 导入通过的行 | `/admin/orders（CSV 状态）` |
| 31 | `order-detail` | 订单详情与售后 | `order` | 发码 | `/admin/orders?order=:orderId` |
| 32 | `access` | 管理员访问 | `access` | 邮箱登录 | `/admin（未登录或权限不足）` |

## 页面业务要求与布局调整

以下问题由源码结构及 CSS 得出，不将未经现场确认的像素效果表述为截图事实。

### 共用框架

- 当前后台沿用消费者 `FlowShell` 的 header、rail、我的空间 sidebar、footer，再在内容区加入后台导航；后台身份和具体模块有两层导航。重设计应使用直接可识别的后台侧栏，保留返回网站入口，当前模块明确选中。
- `Page` 每页先输出「运营后台」H1，各业务又输出 H2 与英文 eyebrow，内容工作台还有商品名、两个版本选择器、四类齐备面板、十个页签。这些框架占据首屏大量空间。应压缩为上下文栏 + 页面标题 + 当前工作区，齐备信息放紧凑状态带。
- 现有 `.flow-admin-page` 已固定为 `100dvh`，`.biz-view` 是独立纵向滚动区域；**保留「侧栏固定，右侧运营工作区上下滚动」**的既有需求。长表、侧栏各自滚动时应有明确边界，避免整个浏览器滚动。
- `.content-tabs` 允许十个页签换行，多个筛选器又使用大号输入区。建议把商品内导航做成稳定的二级导航，编辑区自身拥有清晰分栏，避免标题反复堆叠。
- 顶层统一有 1 个高优先级主操作，危险操作与次要操作不使用同一紫色实心权重。保存状态、数据范围、当前修订需就近显示，长 ID／hash 只在详情中展开。
- 所有页面应带有可读的空态、错误重试、分页、未保存提示；不要沿用通用 Failure 中面向消费者的「兑换码恢复／我的应用」来处理后台错误。

### 概览与审计（01）

现有两块数字和两张长表缺少任务入口。新的首屏可用克制数字列、事件摘要、最近审计表和内容工作台入口。必须保留人工登记金额未核实这一事实，不能变成收入看板、在线用户或未实现的增长仪表盘。

### 商品与版本（02–03）

当前卡片列表、分类／标签参考、商品 JSON 编辑器、全部配置版本、题库 JSON 与发布按钮纵向相接。列表应便于比较名称、状态、版本；详情分为资料、配置版本、公开预览。元数据与完整配置 JSON 收进高级模式，保留导入为新版本、保存草稿、审核、发布、下架动作及其状态约束。商品信息可以设计为可读表单，但正式开发需映射同一契约。

### 内容工作台（04–14）

- **04 入口**：现有商品名称／简介／状态列表可重做成有秩序的工作列表。跨商品齐备度尚无该列表查询依据，不能画成已完成统计。
- **05 创作设定**：现有十一段文本与多组选择平铺。建议按「用户与目标」「语气与世界」「形式与交付」「报告叙事」分节。保留面向谁、使用情境、情绪目标、理解目标、带走什么、节奏、世界观、语言、视觉、声音，以及参与视角、形式、渠道、交付物。报告叙事先保存方案，当前运行端仍用兼容模板；3D／2.5D／小游戏及双方参与不可标为已上线。
- **06 skill 组合**：五个用途选框与历史纵向堆积。用五行对齐的职责、库名、固定版本、状态展示；同域 assessment 的题目设计与报告写作是不同用途，不能压成四个绑定项。右侧摘要可显示固定设定与本次变更说明。
- **07 题库与报告**：当前每个题目用 details 叠加复杂表单，报告模板及完整 JSON 在页底。设计为题目目录、当前题目编辑、说明／来源三层；报告解释、信息不足模板、公开样例分别有清晰分区。题目 ID、维度、必答、选项 ID／文字／分值／不适用、报告区间不可丢。
- **08 封面**：稿件表 + 编辑器 + 来源 + 本地归档 + 两种文件 + 引用容易形成长页。采用视觉预览为中心、资料与版本在侧的结构；必须区分本地原件登记、预览文件、正式文件。封面不是图片生成器。
- **09 视频**：保留视频与纯脚本两种模式，分镜 ID、开始结束时间、文字、预览和正式文件。可用分镜条目与大预览，但不能增加尚未实现的剪辑、生成或渲染功能。题目和文案引用应贴着对应分镜显示。
- **10 文案**：标题／hook／正文／话题／字幕／口播／CTA 都是独立文案块；以阅读与编辑体验组织，稳定 ID 放次级信息，按用途展示可被视频引用的位置。
- **11 整套预览**：避免把原始字段重复堆出一页。按用户体验→报告→传播成套展示，固定制作依据可展开；不是消费者真实测评页。
- **12 引用与历史**：完整 UUID、hash、原始 JSON 当前很显眼。改为来源与去向两列，差异与复查在中间工作区；允许展开核验固定标识。上游有新修订仅提示复查，不覆盖旧稿；继续使用旧稿需复查说明。
- **13 成套采用**：清晰表达选择修订→校验→一致性确认→保存固定包。已采用包应有可读摘要与导出入口。采用不会自动发布商品。历史包及历史用户报告保持原样。
- **14 文件清理**：候选表、容量、预演和确认构成独立操作区。仅清理过期无引用的字节；当前／历史／归档／采用包引用都受保护。清理动作不可伪装普通保存。

### 素材与文件（15–16）

现有新建／编辑表单排在筛选与素材列表之前。应先可检索的素材库，再进入详情。文件预览、平台、版本、状态、校验及正式采用动作有明确层级。封面、视频、脚本、文案四类别都需可展示，不能仅做漂亮图库。素材 ready 与文件 available 属不同状态维度。

### 四领域 skill 库（17–24）

当前四域导航、五个筛选、卡片列表与完整 editor 同时在一长页。建议库列表与专注编辑器分开。四领域分别制作列表与详情，不只换页标题；题库与报告库含两个用途，其他库各一个。

编辑器需覆盖名称、说明、风格、形式、输入／输出规范、Markdown 正文、示例、固定参考资料、版本切换、差异、导入导出及生命周期。正文为主要工作区，元数据为较窄侧栏；高级 JSON 可切换，不能把完整屏幕变成无格式文本框。历史启用／归档版只读，复制新草稿可继续编辑。当前源码仍有「商品绑定、制作来源关联与 MCP 尚待后续批次」过期提示，设计稿应删除。

### MCP 连接（25–27）

当前创建表单先于已有连接，权限与长 UUID 较密集。列表先显示领域、名字、状态、范围数量及到期；创建作为独立画面／抽屉，商品与 skill 搜索选择应易比较。凭据只一次显示且不能放入设计样例。调用记录是操作、结果、错误／对象、请求标识，不展示 token、票据、业务正文或本地路径。连接已支持内容／skill／上下文读取、引用校验、上传与草稿保存；禁止暗示可直接发布或处理资金。

### 订单与售后（28–31）

当前人工录入、CSV 原文、预演表、订单列表及详情同页叠加。拆为列表、录入、CSV 预演、详情四个工作画面。列表避免把人工记录当支付到账；输入价格可使用元并清楚映射后台分单位；CSV 预演显示逐行错误后才执行。订单详情应涵盖待交付、首次交付、已交付可补发、退款撤权确认等状态，但不用多个不可能同时成立的操作拼出伪画面。完整兑换码不出现在设计示例。

### 访问状态（32）

未登录显示管理员登录要求；非管理员、邮箱未验证、服务未配置与失败重试复用该模板，说明应具体。禁止设计自助管理员注册或提权入口。

## 四风格共用约束

A 纸感编辑紫、B 精密工具紫、C 柔雾创作紫、D 深茄夜间工作台共享以上业务信息与页面标识。风格区别应落实到排版、行高、边框、留白、内容密度、背景材料、图片区块与信息结构，不仅换主色。

避免 AI 套路：不用发光渐变球、星光图标、无业务意义的玻璃卡片、巨量圆角 KPI、空洞英文大标题或通用营销插画。紫色主用于导航选中、焦点、主操作和有意义的数据强调；灰阶文字有足够对比。

## 数据文件约定

`pages.json` 为 32 页的数组。字段：`id,title,section,route,purpose,primary,secondary,kind,fields,columns,rows,notes,tabs,state?`。`fields` 为 `{label,value}[]`，`columns` 为 `string[]`，`rows` 为二维字符串数组。所有数字、名称、文件、批次、订单均为设计示例，不代表生产数据。

界面稿中的新布局与可读表单是重设计提案，**不能将仅在稿中出现的列表字段视为现有 API 已提供**；例如订单列表商品名称需要正式实现时确认返回契约。

## 源码定位

- 路由与鉴权：`apps/web/src/admin/pages.tsx`
- 全局 shell 与滚动：`apps/web/src/store/flow-shell.tsx`、`apps/web/src/business/shared.tsx`、`apps/web/src/admin/admin.css`
- 商品版本与订单：`products.tsx`、`orders.tsx`
- 内容路由与十页签：`content.tsx`
- 设定、组合、题库、封面／视频／文案：`content-profile.tsx`、`content-skills.tsx`、`content-assessment.tsx`、`content-assets.tsx`、`content-parts.tsx`、`content-media.tsx`
- 预览、历史、采用、清理：`content-preview.tsx`、`content-history.tsx`、`content-adoption.tsx`、`content-cleanup.tsx`
- skill 四域：`skills.tsx`、`skills-model.ts`
- MCP：`machine.tsx`
- 全局素材：`assets.tsx`
