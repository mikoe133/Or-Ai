# 后台视觉方向与生成规范

2026-10-20 · meetmyworld · 设计探索，不修改业务代码。

## 设计判断

后台的质感应来自可读、准确、轻松定位的工作界面。把一个页面上所有东西都装进圆角卡片，会把筛选、操作、正文和状态抹平；顶部不断堆叠介绍、英文小标题、提示横幅，也会把真实工作挤出首屏。本次让列表、编辑、预览、历史记录各有明确的位置，并让紫色只承担品牌、选中、聚焦和主操作。

四个方向使用同一业务信息，可以横向比较。它们在排版、面板组织、密度、工具栏位置上有差别；不是在同一张模板上换四套颜色。

品牌依据是 `output/brand/meetmyworld/brand.json`：主画布 `#101118`、表面 `#191B24`、浅紫 `#D8AFE9`、浅底品牌紫 `#8250A5`、淡紫 `#E9E1F9`、标志字体 Manrope Bold。既有紫色改版记录中曾强调保留深色。**B 与 D 是深色品牌延续；A 与 C 是本轮四方案中的浅色探索，不意味着默认更换站点主题。**

## 四方向总览

| 方向 | 一眼可见的区别 | 页面组织 | 最适合 | 主要取舍 |
| --- | --- | --- | --- | --- |
| A 纸感编辑紫 | 暖白纸面、细线、少量衬线标题 | 上部紧凑索引；下方连续文档＋旁注栏 | 报告、规则、创作设定、长文审核 | 阅读最舒服；高频批量操作需要紧凑模式 |
| B 精密工具紫 | 冷炭灰、高密度、直角感 | 列表／正文／检查器三栏；紧凑工具条 | skill、MCP、版本对比、审计 | 操作效率高；新手需要清晰默认展开项 |
| C 柔雾创作紫 | 浅紫外壳、干净白工作面、舒展行距 | 左侧资源列表＋右侧统一内容面板 | 内容制作、封面与视频、参考资料 | 易理解、亲和；同屏信息略少 |
| D 深茄夜间工作台 | 暖茄紫、淡紫主操作、稳定深色层级 | 双栏任务工作面；底部固定命令栏 | 综合运营、内容采用、每日制作 | 最延续品牌；要控制紫色面积与对比度 |

建议先比较 **D 与 B**：D 作为全后台默认，B 的列表与检查器密度用于 skill / MCP 等复杂页。A/C 如果被选择，应作为完整方向实施，不把浅色纸张卡片随机混进深色页面。

## 共用界面原则

### 导航与滚动

- 全后台只有一条业务主侧栏：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。账户和返回前台位于底部。选中项必须反映当前后台路由，skill 具体领域为二级状态。
- 保留品牌标志和 wordmark。不要再叠加前台导航与后台横排导航两层同等权重的菜单。
- 桌面外框固定为视口高度；顶栏和侧栏固定。**运营工作内容区独立上下滚动，页面外层不滚动。** 主内容容器采用可收缩高度，避免长表格把整个 App 撑开。
- 面板不超过两层滚动。长列表与长正文确有需求时可以分栏独立滚动，但默认优先一个主内容滚动区；局部滚动条清晰可见，禁止所有小卡片都各自滚动。
- 页面标题和一级工具条可在内容区顶部吸附。固定底部操作条须给内容预留高度，不能覆盖最后一行。表格表头吸附在本区域内。
- 侧栏 184–208 px，顶栏 56 px；窄屏折叠导航，三栏收为列表与详情两个步骤。重要操作不用仅靠图标辨认。

### 信息架构与文字

- 页面标题只描述当前任务：如“题库与报告 skill 库”，不再重复“运营后台／后台运营／SKILL LIBRARY”等多层装饰标题。
- 每页一句短说明足够。状态须贴着对应对象；不要把所有警告集中成首屏四个横幅。
- 当前版本、是否可编辑、主操作放在一起。启用/归档版本只能阅读，清晰提供“复制为新版本”；不能画成正在编辑并可覆盖保存的表单。
- UUID、digest、request ID 使用截断值＋复制，完整值放展开详情。长 JSON 放“原始数据”折叠项或规范编辑器；日常运营看到字段名和内容。
- 首屏从工具和内容开始，不加大插画、欢迎语、假指标、虚构增长曲线、营销 Hero。
- 状态必须同时有文字；颜色不是唯一识别方式。已启用、草稿、已审核、已归档分别表达业务状态，不统一刷成紫色。
- 同一对象在所有页的名称、版本、状态保持一致。图中示例记录必须标注“设计提案 · 示例内容”，不暗示真实订单、收入、调用数量。

### 组件与交互

- 一屏一个高权重主操作。其余动作使用描边、文本或更多菜单；归档、撤销、清理不得与保存使用同等视觉权重。
- 搜索与过滤为同一紧凑工具条；不把每个过滤项装成卡片。主动过滤项可展示可移除标签，默认条件不堆满标签。
- 表格优先细横线和对齐，避免完整网格。数字靠右且等宽；状态列宽稳定；长标题截断但可查看完整内容。
- 表单 label 始终可见；不要用 placeholder 替代名称。关联字段分成小节，低频高级设置折叠，校验信息贴字段底部。
- 控件聚焦使用 2 px 实线紫色轮廓，有 2 px 间隔；hover 不改变布局。正常正文目标对比至少 4.5:1，交互边界至少 3:1，实际落地时按最终 token 组合检测。
- 保存反馈在动作区域或简短状态条；不弹出夸张成功庆祝。未保存离开需要确认，生成图片中不演示不存在的自动保存。
- 空态给一句解释和真实下一步；错误态包含具体问题和重试；加载用骨架只占据实际内容形状。禁止将所有空态都做成大笑脸插图。

## A · 纸感编辑紫

### Palette

| 用途 | HEX |
| --- | --- |
| 画布 | `#F4F1F5` |
| 侧栏 | `#EAE4EE` |
| 正文纸面 | `#FFFCF8` |
| 细分隔线 | `#D8CEDC` |
| 主文字 | `#292230` |
| 次文字 | `#736877` |
| 品牌紫 | `#8250A5` |
| 选中底色 | `#E9E1F9` |
| 主按钮 | `#65417B` |
| 成功文字 | `#34634A` |
| 警示文字 | `#8A5B20` |
| 错误文字 | `#A33E4C` |

字体：品牌 Manrope Bold；中文正文和控件 PingFang SC / Source Han Sans；仅文档内容的大标题可用 Source Han Serif，且控制在 28 px，避免把工具变成文学海报。正文 15/25、字段 14/20、元信息 13/19。

密度与间距：页面留白 28–36；内容内部 24–36；字段间 16；控件高 36–38；表格行 44。圆角 3–5，分隔线 1 px，不做叠影。微暖纸感来自色彩，实际 UI 无纸纹覆盖正文。

列表为细横线索引，表格标题轻字重；选中行使用淡紫底。表单标签在上、输入底色贴近纸面；长正文优先连续文档。状态用细点＋文字或短下划线标记，不常态显示胶囊。主按钮为深紫矩形；辅助动作像编辑工具链接。

侧栏浅灰紫，当前项左侧 2 px 深紫线；详情采用文档主体＋窄旁注栏。正文区一个主滚动，版本栏可吸附。适合长内容审核、报告写作与共同设定；高信息量日志可换成紧凑行但不改变调性。

## B · 精密工具紫

### Palette

| 用途 | HEX |
| --- | --- |
| 画布 | `#111218` |
| 侧栏 | `#14151D` |
| 工作面 | `#191B24` |
| 控件提升面 | `#22242E` |
| 分隔线 | `#343640` |
| 主文字 | `#F0EDF4` |
| 次文字 | `#A6A2B3` |
| 品牌／主按钮 | `#D8AFE9` |
| 选中底色 | `#30283C` |
| 按钮深色字 | `#281734` |
| 成功文字 | `#9BC7AD` |
| 警示文字 | `#D5B879` |
| 错误文字 | `#E7A2B0` |

字体：中文全部 PingFang SC / Source Han Sans；品牌 Manrope Bold；只有 ID、摘要、路径、代码使用 JetBrains Mono 或系统等宽。页面标题 24/32，内容 14/22，元信息 12–13/18；数字等宽。

密度与间距：页面边距 20–24；栏内 16–20；控件高 32；表格行 38–40；圆角 4–6；8 px 基础节奏。去掉层层外框，只保留分栏线与必要字段边框。

三栏包含资源列表、当前对象、检查器。检查器承载状态与版本，主区用于真正的编辑/阅读。表格列可承载小型内联动作，不把每行变成厚卡片；表单可使用左右 label/value 对齐。状态为 4 px 点＋文本；危险动作独立更多菜单。

184 px 侧栏，56 px 顶栏，紧凑工具条和 28 px 状态条。列表与编辑器可各自滚动，检查器为短静态内容；整体外壳不滚动。适合 MCP 调用记录、权限清单、skill 维护、版本差异。取舍是密度偏专业，不适合用 12 px 字体塞更多信息。

## C · 柔雾创作紫

### Palette

| 用途 | HEX |
| --- | --- |
| 画布 | `#F1EDF7` |
| 侧栏 | `#E5DDEC` |
| 工作面 | `#FFFEFF` |
| 字段／轻填充 | `#F6F2F8` |
| 分隔线 | `#DDD3E5` |
| 主文字 | `#34273E` |
| 次文字 | `#786A82` |
| 品牌／主按钮 | `#8250A5` |
| 选中底色 | `#E8DDF1` |
| 成功文字 | `#3C6957` |
| 警示文字 | `#8E5E29` |
| 错误文字 | `#A14458` |

字体：品牌 Manrope；中文 PingFang SC，适度中等字重，避免标题全部超粗。标题 27/36，正文 15/25，控件 14/20，备注 13/20。

密度与间距：页面边距 32，段落间 24，字段间 16，控件高 38–40，列表行 48–52；圆角 8–10，但整个详情只有一个连续工作面。柔和来自行距与比例，不用半透明玻璃或厚重阴影。

左资源列表右统一详情。媒体页可在列表放小缩略图；表单页用有名称的小节及少量 2 列字段；skill 方法正文直接阅读，编辑时再出现输入框。状态短文本，必要的已选风格可用不超过 3 个轻标签。主按钮深紫，辅助按钮白底细线。

208 px 侧栏，选中项浅紫底＋细紫线。详情固定顶部标题与动作，内部内容区域滚动；列表可独立滚动。适合制作工作台、参考资料、封面/视频管理。取舍是大批量订单或日志需要可切换紧凑视图。

## D · 深茄夜间工作台

### Palette

| 用途 | HEX |
| --- | --- |
| 画布 | `#15111B` |
| 侧栏 | `#1B1522` |
| 工作面 | `#211A2A` |
| 二级工作面 | `#2B2234` |
| 分隔线 | `#3F3249` |
| 主文字 | `#F6EEF9` |
| 次文字 | `#B4A3BF` |
| 品牌／主按钮 | `#D8AFE9` |
| 选中底色 | `#392744` |
| 按钮深色字 | `#2B163B` |
| 成功文字 | `#A4CAB6` |
| 警示文字 | `#DBBC87` |
| 错误文字 | `#E9A2B4` |

字体：品牌 Manrope Bold；中文 PingFang SC / Source Han Sans。标题 26/34，正文 15/24，操作 14/20，元信息 13/20。深色正文使用暖白，不能用极低透明度的紫灰文字。

密度与间距：页面边距 28–32；区域间 24；控件高 36；行高 44；圆角 6–8。深茄面通过轻微明度差分区；不额外套发光边框。

默认双栏任务工作面：左资源索引，右当前内容。输入框与工作面明度差小但边界明确。历史、原始数据与调用详情可展开。状态用文字＋细点，重要危险状态用淡红。页顶放导航、筛选和对象名称，底部固定 58 px 命令栏承载当前状态和主操作。

200 px 侧栏，当前项紫色底和 2 px 左线。整块运营内容滚动，底部命令栏仅占运营区，不越过侧栏。适合长期主后台主题、采用包和清理预览等需要确认状态后操作的页面。取舍是不能把每一个面板都调成亮紫；紫色选中与红色错误仍要清楚区分。

## 通用反 AI 设计约束

以下内容逐条进入图像提示词及后续实现验收：

1. 不用“大标题＋四个 KPI 卡片＋折线图＋三个渐变卡片”的通用 SaaS 版式。只呈现本页真实任务。
2. 不用紫色发光、星光、魔法棒、漂浮 3D 球、玻璃拟态、光晕、雾状渐变或随机背景点阵。
3. 不把紫色当成所有表面的填充色；紫色必须有选中、强调、聚焦或品牌意义。
4. 不用重复英文眉题装饰中文标题；不重复品牌口号；不写空泛的“智能赋能、开启灵感”。
5. 不把所有字段、每条说明、每个统计都套圆角卡片；一条分隔线可解决时就用线。
6. 不把控制按钮做成超大药丸，不默认大阴影，不用十几种不同状态色。
7. 不用假收入、假用户数、假通过率、假趋势图；示例内容须标识。
8. 不用代码密密麻麻占满全部业务首屏；保留“原始数据”入口，但让默认视图对运营人员可读。
9. 不因追求极简隐藏必要版本、权限、只读、文件可用性、采用快照等业务信息。
10. 不做设备壳展示或斜透视。交付清晰正视界面图，布局可直接落地。

## 关键页生成与使用

四张关键概念图统一选用“题库与报告 skill 库”，并展示同一个示例 skill：温柔关系观察、v3 已启用、只能复制为新版本。功能信息保持一致，差别仅来自视觉和布局。图像生成不作为交互实现，中文和细节以精确排版的全页设计稿为准。

机器可读提示词位于 `concept-prompts.json`，结构为 `{ id, title, prompt }[]`。每条都是独立完整提示词，可以直接用于 imagegen；下文保留全文方便复制。

### A · 纸感编辑紫 · 完整关键页提示词

```text
Create ONE original, production-quality high-fidelity desktop admin UI design, as a straight-on flat screenshot. Canvas 1600 x 1080. Product: meetmyworld, an operations platform for thoughtful self-understanding and relationship experiences. This is a working content administration tool for operators who manage assessment/report skills, cover skills, video skills and copywriting skills. This page is specifically “题库与报告 skill 库”, with a selected existing skill and its immutable active version. Clear fluent Simplified Chinese typography, exact visible labels below; avoid lorem ipsum and decorative English headings. At least 70% of the image must be useful tool content. Do not draw a marketing landing page. All displayed records are design examples, add tiny footer “设计提案 · 示例内容”.
Shared navigation: one main navigation sidebar, brand wordmark meetmyworld, small subtitle “运营后台”, items exactly “概览与审计”, “商品与版本”, “内容工作台”, “素材与文件”, “skill 库”, “MCP 连接”, “订单与售后”; “skill 库” is the ONE selected main navigation item. Separate bottom links “返回前台”, “账户”. A subtle textual “本地环境” indicator is permitted. No duplicate icon-only outer sidebar, no storefront navigation. A fixed 56px header has breadcrumb “运营后台 / skill 库 / 题库与报告” and small operator avatar with “管理员”. Sidebar and header stay fixed; only the operations main content viewport scrolls; show its slim scrollbar at the far right. Main action areas remain visible.
The page title is “题库与报告 skill 库”, followed by “维护题目规则、报告写作方法与固定参考资料”. A horizontal domain switch reads “题库与报告”, “封面”, “视频”, “引流文案”, with only the first selected. Useful filter controls: “搜索 skill”, “用途：全部”, “形式：全部”, “状态：全部”, and an understated reset control. New-library action label “新建 skill”. Show these sample records: selected “温柔关系观察”, description “从具体回答出发，提供表达与沟通线索”, purposes “题目与规则设计 · 报告写作”, tag “温柔”, forms “网页 · 卡片”, active v3; second “叙事式自我探索”, purposes “报告写作”, tag “叙事”, v2 已审核; third “轻量情境问答”, purpose “题目与规则设计”, tag “轻快”, v1 草稿. Do not invent user counts, income, performance metrics, engagement graphs, or AI-generated scores.
Selected skill inspector/document: heading “温柔关系观察”, compact “v3 · 已启用” status, clear subdued text “固定版本，只读。修改请复制为新版本。” The primary action is “复制为新版本”, and secondary controls “导出” and a compact ellipsis menu. Do not show a prominent save button or editable inputs on this active version. The detail body presents clean semantic read-only fields rather than 10 separate cards: “稳定标识” value “gentle-relationship”; “专业用途” value “题目与规则设计、报告写作”; “支持形式” value “网页、卡片”; “风格标签” value “温柔、具体、有边界”. Functional detail tabs or section links “基本信息”, “SKILL.md 正文”, “输入与输出”, “参考资料”, “版本比较”. Visible body shows “SKILL.md 正文” with a formatted document: heading “创作原则”, numbered lines “从具体回答出发，不替使用者下结论。”, “用可理解的语言整理感受与期待。”, “提供可以开始一次对话的表达线索。” A separate modest subsection “表达边界” has “不使用确定性诊断，不贴标签，不夸大传播承诺。” Below, a two-row reference list with monochrome file icons and filename “references/tone-guide.md” / type “Markdown” / action “下载”, filename “references/report-example.pdf” / type “PDF” / action “下载”. Version control area includes selector “v3 · 已启用”, previous “v2 · 已归档” and “v1 · 已归档”, with “与 v2 比较” action. Human-scale readable text and realistic disabled/read-only states.
Quality requirements: superbly aligned baselines, consistent input and button heights, table rows and whitespace, functional hierarchy. All control text should remain legible at desktop scale. Use 14–15px equivalent body/control typography, 24–28px page title, 13px metadata; do not fill the image with giant headlines. Purple is an authored brand accent for selection, focus and one primary action, not an indiscriminate wash. No glassmorphism, no gradient cards, no glowing purple halos, no decorative 3D objects, no sparkles or magic wand icons, no pastel blobs, no stock plants/rooms, no fake dashboard chart, no excessive pill tags, no giant rounded panels, no floating device mockup, no browser chrome, no external explanatory annotations. Avoid copying any existing company's branding. The result should look like an exceptionally crafted real content tool, calm, mature and usable.

STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
Composition: left fixed 200px tinted sidebar, top header 56px; main workspace begins x=232. Page header and 4-domain tab strip occupy top 140px. Beneath, a compact horizontally arranged searchable index table of three skills, full width and approximately 174px tall, with 42px rows, thin bottom rules, columns “名称 / 用途 / 最新版本 / 状态”, first row lightly lavender selected. Then the selected skill opens as ONE continuous editorial reading sheet, approximately x=232 y=390 width=1010, with 36px internal padding. Large literary but modest 28px serif title “温柔关系观察”; primary action and export align at its top right. Metadata sits in two neat prose columns separated by whitespace, no boxed fields. The SKILL.md body flows as a real, carefully typeset document with generous 1.65 line-height and thin section dividers. On its right a narrow 270px marginal rail, separated by ONE vertical hairline, titled “版本与资料”; it contains the v3/v2/v1 version list and small references filenames, not floating cards. Section anchors in a small row above document content. This layout should feel like a serious independent publishing editor: warm paper, disciplined typography, slightly asymmetric main-document/marginalia proportions. Do not add paper grain that damages text readability; the paper quality comes from color and spacing.
```

### B · 精密工具紫 · 完整关键页提示词

```text
Create ONE original, production-quality high-fidelity desktop admin UI design, as a straight-on flat screenshot. Canvas 1600 x 1080. Product: meetmyworld, an operations platform for thoughtful self-understanding and relationship experiences. This is a working content administration tool for operators who manage assessment/report skills, cover skills, video skills and copywriting skills. This page is specifically “题库与报告 skill 库”, with a selected existing skill and its immutable active version. Clear fluent Simplified Chinese typography, exact visible labels below; avoid lorem ipsum and decorative English headings. At least 70% of the image must be useful tool content. Do not draw a marketing landing page. All displayed records are design examples, add tiny footer “设计提案 · 示例内容”.
Shared navigation: one main navigation sidebar, brand wordmark meetmyworld, small subtitle “运营后台”, items exactly “概览与审计”, “商品与版本”, “内容工作台”, “素材与文件”, “skill 库”, “MCP 连接”, “订单与售后”; “skill 库” is the ONE selected main navigation item. Separate bottom links “返回前台”, “账户”. A subtle textual “本地环境” indicator is permitted. No duplicate icon-only outer sidebar, no storefront navigation. A fixed 56px header has breadcrumb “运营后台 / skill 库 / 题库与报告” and small operator avatar with “管理员”. Sidebar and header stay fixed; only the operations main content viewport scrolls; show its slim scrollbar at the far right. Main action areas remain visible.
The page title is “题库与报告 skill 库”, followed by “维护题目规则、报告写作方法与固定参考资料”. A horizontal domain switch reads “题库与报告”, “封面”, “视频”, “引流文案”, with only the first selected. Useful filter controls: “搜索 skill”, “用途：全部”, “形式：全部”, “状态：全部”, and an understated reset control. New-library action label “新建 skill”. Show these sample records: selected “温柔关系观察”, description “从具体回答出发，提供表达与沟通线索”, purposes “题目与规则设计 · 报告写作”, tag “温柔”, forms “网页 · 卡片”, active v3; second “叙事式自我探索”, purposes “报告写作”, tag “叙事”, v2 已审核; third “轻量情境问答”, purpose “题目与规则设计”, tag “轻快”, v1 草稿. Do not invent user counts, income, performance metrics, engagement graphs, or AI-generated scores.
Selected skill inspector/document: heading “温柔关系观察”, compact “v3 · 已启用” status, clear subdued text “固定版本，只读。修改请复制为新版本。” The primary action is “复制为新版本”, and secondary controls “导出” and a compact ellipsis menu. Do not show a prominent save button or editable inputs on this active version. The detail body presents clean semantic read-only fields rather than 10 separate cards: “稳定标识” value “gentle-relationship”; “专业用途” value “题目与规则设计、报告写作”; “支持形式” value “网页、卡片”; “风格标签” value “温柔、具体、有边界”. Functional detail tabs or section links “基本信息”, “SKILL.md 正文”, “输入与输出”, “参考资料”, “版本比较”. Visible body shows “SKILL.md 正文” with a formatted document: heading “创作原则”, numbered lines “从具体回答出发，不替使用者下结论。”, “用可理解的语言整理感受与期待。”, “提供可以开始一次对话的表达线索。” A separate modest subsection “表达边界” has “不使用确定性诊断，不贴标签，不夸大传播承诺。” Below, a two-row reference list with monochrome file icons and filename “references/tone-guide.md” / type “Markdown” / action “下载”, filename “references/report-example.pdf” / type “PDF” / action “下载”. Version control area includes selector “v3 · 已启用”, previous “v2 · 已归档” and “v1 · 已归档”, with “与 v2 比较” action. Human-scale readable text and realistic disabled/read-only states.
Quality requirements: superbly aligned baselines, consistent input and button heights, table rows and whitespace, functional hierarchy. All control text should remain legible at desktop scale. Use 14–15px equivalent body/control typography, 24–28px page title, 13px metadata; do not fill the image with giant headlines. Purple is an authored brand accent for selection, focus and one primary action, not an indiscriminate wash. No glassmorphism, no gradient cards, no glowing purple halos, no decorative 3D objects, no sparkles or magic wand icons, no pastel blobs, no stock plants/rooms, no fake dashboard chart, no excessive pill tags, no giant rounded panels, no floating device mockup, no browser chrome, no external explanatory annotations. Avoid copying any existing company's branding. The result should look like an exceptionally crafted real content tool, calm, mature and usable.

STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
Composition: fixed compact 184px main sidebar; 48–56px header; page header maximum 88px with 24px heading. Then immediately the 4-domain tab strip and a compact filter toolbar. The rest is a three-pane tool, separated by single 1px borders: a 290px skills list from x=208, a 630px main document/editor area, and a 250px inspector on the far right. The left skills list uses three compact selectable rows with name on first line, purpose and v3 status on second, not thumbnails and not cards. Header “SKILLS” must instead be Chinese “技能清单”, with search field embedded. Main document pane has top title “温柔关系观察” and one small primary “复制为新版本”; file-like detail tabs underneath with “SKILL.md 正文” selected, other tabs “基本信息 / 输入与输出 / 参考资料”. Below is a read-only markdown document, optional tasteful line numbers only in a 28px gutter; display Chinese prose as proper rendered text, not colorful code syntax. One quiet read-only notice line under the tabs. Inspector is titled “版本信息”, with v3 active and v2/v1 archived as compact rows, then key/value metadata “稳定标识 / 用途 / 支持形式”, and a compact “与 v2 比较” control. Bottom 28px status strip has “只读版本” on left and “固定摘要 8f4c…b12e” on right. References appear as small two-row list below main body or in a bottom dock, not as oversized cards. One slim content scrollbar at far right. Strongly emphasize precision, density, clear selection and fast scanning; all areas visibly useful. Distinct from a warm-purple night mood: this variant is primarily cool dark-neutral graphite.
```

### C · 柔雾创作紫 · 完整关键页提示词

```text
Create ONE original, production-quality high-fidelity desktop admin UI design, as a straight-on flat screenshot. Canvas 1600 x 1080. Product: meetmyworld, an operations platform for thoughtful self-understanding and relationship experiences. This is a working content administration tool for operators who manage assessment/report skills, cover skills, video skills and copywriting skills. This page is specifically “题库与报告 skill 库”, with a selected existing skill and its immutable active version. Clear fluent Simplified Chinese typography, exact visible labels below; avoid lorem ipsum and decorative English headings. At least 70% of the image must be useful tool content. Do not draw a marketing landing page. All displayed records are design examples, add tiny footer “设计提案 · 示例内容”.
Shared navigation: one main navigation sidebar, brand wordmark meetmyworld, small subtitle “运营后台”, items exactly “概览与审计”, “商品与版本”, “内容工作台”, “素材与文件”, “skill 库”, “MCP 连接”, “订单与售后”; “skill 库” is the ONE selected main navigation item. Separate bottom links “返回前台”, “账户”. A subtle textual “本地环境” indicator is permitted. No duplicate icon-only outer sidebar, no storefront navigation. A fixed 56px header has breadcrumb “运营后台 / skill 库 / 题库与报告” and small operator avatar with “管理员”. Sidebar and header stay fixed; only the operations main content viewport scrolls; show its slim scrollbar at the far right. Main action areas remain visible.
The page title is “题库与报告 skill 库”, followed by “维护题目规则、报告写作方法与固定参考资料”. A horizontal domain switch reads “题库与报告”, “封面”, “视频”, “引流文案”, with only the first selected. Useful filter controls: “搜索 skill”, “用途：全部”, “形式：全部”, “状态：全部”, and an understated reset control. New-library action label “新建 skill”. Show these sample records: selected “温柔关系观察”, description “从具体回答出发，提供表达与沟通线索”, purposes “题目与规则设计 · 报告写作”, tag “温柔”, forms “网页 · 卡片”, active v3; second “叙事式自我探索”, purposes “报告写作”, tag “叙事”, v2 已审核; third “轻量情境问答”, purpose “题目与规则设计”, tag “轻快”, v1 草稿. Do not invent user counts, income, performance metrics, engagement graphs, or AI-generated scores.
Selected skill inspector/document: heading “温柔关系观察”, compact “v3 · 已启用” status, clear subdued text “固定版本，只读。修改请复制为新版本。” The primary action is “复制为新版本”, and secondary controls “导出” and a compact ellipsis menu. Do not show a prominent save button or editable inputs on this active version. The detail body presents clean semantic read-only fields rather than 10 separate cards: “稳定标识” value “gentle-relationship”; “专业用途” value “题目与规则设计、报告写作”; “支持形式” value “网页、卡片”; “风格标签” value “温柔、具体、有边界”. Functional detail tabs or section links “基本信息”, “SKILL.md 正文”, “输入与输出”, “参考资料”, “版本比较”. Visible body shows “SKILL.md 正文” with a formatted document: heading “创作原则”, numbered lines “从具体回答出发，不替使用者下结论。”, “用可理解的语言整理感受与期待。”, “提供可以开始一次对话的表达线索。” A separate modest subsection “表达边界” has “不使用确定性诊断，不贴标签，不夸大传播承诺。” Below, a two-row reference list with monochrome file icons and filename “references/tone-guide.md” / type “Markdown” / action “下载”, filename “references/report-example.pdf” / type “PDF” / action “下载”. Version control area includes selector “v3 · 已启用”, previous “v2 · 已归档” and “v1 · 已归档”, with “与 v2 比较” action. Human-scale readable text and realistic disabled/read-only states.
Quality requirements: superbly aligned baselines, consistent input and button heights, table rows and whitespace, functional hierarchy. All control text should remain legible at desktop scale. Use 14–15px equivalent body/control typography, 24–28px page title, 13px metadata; do not fill the image with giant headlines. Purple is an authored brand accent for selection, focus and one primary action, not an indiscriminate wash. No glassmorphism, no gradient cards, no glowing purple halos, no decorative 3D objects, no sparkles or magic wand icons, no pastel blobs, no stock plants/rooms, no fake dashboard chart, no excessive pill tags, no giant rounded panels, no floating device mockup, no browser chrome, no external explanatory annotations. Avoid copying any existing company's branding. The result should look like an exceptionally crafted real content tool, calm, mature and usable.

STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
Composition: 208px fixed sidebar with subtly rounded selected “skill 库” row and single thin purple vertical indicator; fixed header 56px. Main content x=244. Header is one compact single line of title and action “新建 skill”, short supporting sentence under title. Domain tabs are clear text tabs with a purple underline, not a big pill switch. Beneath, a two-column master-detail composition: a 330px left skill library index and a 940px right detail workspace. The left begins search and two compact dropdowns; three skill entries are vertical list rows with generous 18px vertical spacing, no individual floating cards. Selected “温柔关系观察” has one pale lavender band and thin left stripe; each other row is white with hairline bottom separator. The right is one coherent white workspace surface, 10px radius. At its top, “温柔关系观察” and “v3 · 已启用”, action “复制为新版本” at right; read-only explanatory sentence underneath. A horizontal segmented text navigation inside the surface: “基本信息 / 方法正文 / 输入与输出 / 参考资料 / 历史版本”, with “方法正文” selected. Main body split 2:1: spacious readable method text on left, quiet narrow summary column on right with labels “用途”, “支持形式”, “风格” and real values. No cards around each field. Beneath methods, references form two tidy file rows with small document icons and download text. A compact footer area inside the same surface shows current version and “与 v2 比较”, separated by one horizontal rule. Any helper text is short and human; do not add chat bubbles or assistant avatars. Give this direction a balanced, comfortable creation-workbench rhythm and one coherent detail sheet.
```

### D · 深茄夜间工作台 · 完整关键页提示词

```text
Create ONE original, production-quality high-fidelity desktop admin UI design, as a straight-on flat screenshot. Canvas 1600 x 1080. Product: meetmyworld, an operations platform for thoughtful self-understanding and relationship experiences. This is a working content administration tool for operators who manage assessment/report skills, cover skills, video skills and copywriting skills. This page is specifically “题库与报告 skill 库”, with a selected existing skill and its immutable active version. Clear fluent Simplified Chinese typography, exact visible labels below; avoid lorem ipsum and decorative English headings. At least 70% of the image must be useful tool content. Do not draw a marketing landing page. All displayed records are design examples, add tiny footer “设计提案 · 示例内容”.
Shared navigation: one main navigation sidebar, brand wordmark meetmyworld, small subtitle “运营后台”, items exactly “概览与审计”, “商品与版本”, “内容工作台”, “素材与文件”, “skill 库”, “MCP 连接”, “订单与售后”; “skill 库” is the ONE selected main navigation item. Separate bottom links “返回前台”, “账户”. A subtle textual “本地环境” indicator is permitted. No duplicate icon-only outer sidebar, no storefront navigation. A fixed 56px header has breadcrumb “运营后台 / skill 库 / 题库与报告” and small operator avatar with “管理员”. Sidebar and header stay fixed; only the operations main content viewport scrolls; show its slim scrollbar at the far right. Main action areas remain visible.
The page title is “题库与报告 skill 库”, followed by “维护题目规则、报告写作方法与固定参考资料”. A horizontal domain switch reads “题库与报告”, “封面”, “视频”, “引流文案”, with only the first selected. Useful filter controls: “搜索 skill”, “用途：全部”, “形式：全部”, “状态：全部”, and an understated reset control. New-library action label “新建 skill”. Show these sample records: selected “温柔关系观察”, description “从具体回答出发，提供表达与沟通线索”, purposes “题目与规则设计 · 报告写作”, tag “温柔”, forms “网页 · 卡片”, active v3; second “叙事式自我探索”, purposes “报告写作”, tag “叙事”, v2 已审核; third “轻量情境问答”, purpose “题目与规则设计”, tag “轻快”, v1 草稿. Do not invent user counts, income, performance metrics, engagement graphs, or AI-generated scores.
Selected skill inspector/document: heading “温柔关系观察”, compact “v3 · 已启用” status, clear subdued text “固定版本，只读。修改请复制为新版本。” The primary action is “复制为新版本”, and secondary controls “导出” and a compact ellipsis menu. Do not show a prominent save button or editable inputs on this active version. The detail body presents clean semantic read-only fields rather than 10 separate cards: “稳定标识” value “gentle-relationship”; “专业用途” value “题目与规则设计、报告写作”; “支持形式” value “网页、卡片”; “风格标签” value “温柔、具体、有边界”. Functional detail tabs or section links “基本信息”, “SKILL.md 正文”, “输入与输出”, “参考资料”, “版本比较”. Visible body shows “SKILL.md 正文” with a formatted document: heading “创作原则”, numbered lines “从具体回答出发，不替使用者下结论。”, “用可理解的语言整理感受与期待。”, “提供可以开始一次对话的表达线索。” A separate modest subsection “表达边界” has “不使用确定性诊断，不贴标签，不夸大传播承诺。” Below, a two-row reference list with monochrome file icons and filename “references/tone-guide.md” / type “Markdown” / action “下载”, filename “references/report-example.pdf” / type “PDF” / action “下载”. Version control area includes selector “v3 · 已启用”, previous “v2 · 已归档” and “v1 · 已归档”, with “与 v2 比较” action. Human-scale readable text and realistic disabled/read-only states.
Quality requirements: superbly aligned baselines, consistent input and button heights, table rows and whitespace, functional hierarchy. All control text should remain legible at desktop scale. Use 14–15px equivalent body/control typography, 24–28px page title, 13px metadata; do not fill the image with giant headlines. Purple is an authored brand accent for selection, focus and one primary action, not an indiscriminate wash. No glassmorphism, no gradient cards, no glowing purple halos, no decorative 3D objects, no sparkles or magic wand icons, no pastel blobs, no stock plants/rooms, no fake dashboard chart, no excessive pill tags, no giant rounded panels, no floating device mockup, no browser chrome, no external explanatory annotations. Avoid copying any existing company's branding. The result should look like an exceptionally crafted real content tool, calm, mature and usable.

STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
Composition: fixed 200px main sidebar with plum selected “skill 库” and thin lavender left line; top fixed 56px header. Main x=232. At top left page title and a narrow right-aligned “新建 skill” outline action. Domain navigation is four horizontal text tabs, underline on first. Below, a single full-width filter row with search taking 360px; no metrics row. Next is a horizontal split of TWO purposeful areas: at left a compact 34% width skills register with table header “技能 / 版本 / 状态”, visible selected row and two other rows, fine separators, warm lavender selected band; at right a 66% width selected-skill document. No third inspector panel. The selected document has title, v3 status and read-only notice at top, an inline row of tabs “正文 / 规范 / 资料 / 版本”, “正文” selected. Under the tabs, metadata appears as a compact 2x2 key/value grid integrated with the surface, no pill salad. Main prose “创作原则” and “表达边界” is beautifully typeset on the dark plum background. Lower inside the document is a two-row reference file list and a discreet collapsed “历史版本” row showing “v3 已启用 · v2 已归档 · v1 已归档”. A fixed 58px BOTTOM COMMAND BAR spans only the operations workspace, not the global sidebar; on left “当前为固定只读版本” and “与 v2 比较” text button, on right “导出” outline then pale-lavender “复制为新版本”. Do not repeat the same primary action in the header. Maintain warm dark-purple identity, quiet high contrast and one decisive action. It should look like an experienced operator’s nighttime content desk, not a futuristic game UI.
```
