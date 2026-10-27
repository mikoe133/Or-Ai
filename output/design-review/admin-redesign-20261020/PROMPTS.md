# 后台全页面设计提示词

这份文件包含 **32 个页面 × 4 种风格 = 128 条完整提示词**。每一条可以独立复制到图像生成或设计工具中，不依赖其他段落。示例名称和数值可替换；功能结构、状态、导航与权限边界应保持。

- A · 纸感编辑紫：温暖纸白、深紫墨色、编辑排版。
- B · 精密工具紫：冷中性深灰、淡紫选中、紧凑工具布局。
- C · 柔雾创作紫：浅薰衣草与白工作面、舒适创作节奏。
- D · 深茄夜间工作台：暖深紫、高对比、稳定操作区。

`prompts/{pageId}-{a,b,c,d}.txt` 为独立纯文本文件；`prompts.json` 为 `{pageId:{a,b,c,d}}` 索引。风格来自 `concept-prompts.json` 的视觉段落，已删除原概念图专属的题库 skill 页面内容，并按本页实际业务重写布局。

全部为设计示例；凭据与兑换码只允许掩码。画面标记“设计提案 · 示例内容”。

## 页面索引

| 页码 | 页面 | A | B | C | D |
|---:|---|---|---|---|---|
| 01 | 概览与审计 | [A](prompts/overview-a.txt) | [B](prompts/overview-b.txt) | [C](prompts/overview-c.txt) | [D](prompts/overview-d.txt) |
| 02 | 商品与版本 | [A](prompts/products-list-a.txt) | [B](prompts/products-list-b.txt) | [C](prompts/products-list-c.txt) | [D](prompts/products-list-d.txt) |
| 03 | 商品资料与版本 | [A](prompts/product-detail-a.txt) | [B](prompts/product-detail-b.txt) | [C](prompts/product-detail-c.txt) | [D](prompts/product-detail-d.txt) |
| 04 | 内容工作台 | [A](prompts/content-list-a.txt) | [B](prompts/content-list-b.txt) | [C](prompts/content-list-c.txt) | [D](prompts/content-list-d.txt) |
| 05 | 创作设定 | [A](prompts/content-profile-a.txt) | [B](prompts/content-profile-b.txt) | [C](prompts/content-profile-c.txt) | [D](prompts/content-profile-d.txt) |
| 06 | skill 组合 | [A](prompts/content-bindings-a.txt) | [B](prompts/content-bindings-b.txt) | [C](prompts/content-bindings-c.txt) | [D](prompts/content-bindings-d.txt) |
| 07 | 题库与报告 | [A](prompts/content-assessment-a.txt) | [B](prompts/content-assessment-b.txt) | [C](prompts/content-assessment-c.txt) | [D](prompts/content-assessment-d.txt) |
| 08 | 封面 | [A](prompts/content-cover-a.txt) | [B](prompts/content-cover-b.txt) | [C](prompts/content-cover-c.txt) | [D](prompts/content-cover-d.txt) |
| 09 | 视频与分镜 | [A](prompts/content-video-a.txt) | [B](prompts/content-video-b.txt) | [C](prompts/content-video-c.txt) | [D](prompts/content-video-d.txt) |
| 10 | 引流文案 | [A](prompts/content-copy-a.txt) | [B](prompts/content-copy-b.txt) | [C](prompts/content-copy-c.txt) | [D](prompts/content-copy-d.txt) |
| 11 | 整套预览 | [A](prompts/content-preview-a.txt) | [B](prompts/content-preview-b.txt) | [C](prompts/content-preview-c.txt) | [D](prompts/content-preview-d.txt) |
| 12 | 引用与历史 | [A](prompts/content-references-a.txt) | [B](prompts/content-references-b.txt) | [C](prompts/content-references-c.txt) | [D](prompts/content-references-d.txt) |
| 13 | 成套采用 | [A](prompts/content-adoption-a.txt) | [B](prompts/content-adoption-b.txt) | [C](prompts/content-adoption-c.txt) | [D](prompts/content-adoption-d.txt) |
| 14 | 文件清理 | [A](prompts/content-cleanup-a.txt) | [B](prompts/content-cleanup-b.txt) | [C](prompts/content-cleanup-c.txt) | [D](prompts/content-cleanup-d.txt) |
| 15 | 素材与文件 | [A](prompts/media-list-a.txt) | [B](prompts/media-list-b.txt) | [C](prompts/media-list-c.txt) | [D](prompts/media-list-d.txt) |
| 16 | 素材详情 | [A](prompts/media-detail-a.txt) | [B](prompts/media-detail-b.txt) | [C](prompts/media-detail-c.txt) | [D](prompts/media-detail-d.txt) |
| 17 | 题库与报告 skill 库 | [A](prompts/skills-assessment-a.txt) | [B](prompts/skills-assessment-b.txt) | [C](prompts/skills-assessment-c.txt) | [D](prompts/skills-assessment-d.txt) |
| 18 | 温柔探索 · 题目与报告 | [A](prompts/skill-assessment-editor-a.txt) | [B](prompts/skill-assessment-editor-b.txt) | [C](prompts/skill-assessment-editor-c.txt) | [D](prompts/skill-assessment-editor-d.txt) |
| 19 | 封面 skill 库 | [A](prompts/skills-cover-a.txt) | [B](prompts/skills-cover-b.txt) | [C](prompts/skills-cover-c.txt) | [D](prompts/skills-cover-d.txt) |
| 20 | 留白书页 · 封面设计 | [A](prompts/skill-cover-editor-a.txt) | [B](prompts/skill-cover-editor-b.txt) | [C](prompts/skill-cover-editor-c.txt) | [D](prompts/skill-cover-editor-d.txt) |
| 21 | 视频 skill 库 | [A](prompts/skills-video-a.txt) | [B](prompts/skills-video-b.txt) | [C](prompts/skills-video-c.txt) | [D](prompts/skills-video-d.txt) |
| 22 | 慢叙事 · 关系短片 | [A](prompts/skill-video-editor-a.txt) | [B](prompts/skill-video-editor-b.txt) | [C](prompts/skill-video-editor-c.txt) | [D](prompts/skill-video-editor-d.txt) |
| 23 | 引流文案 skill 库 | [A](prompts/skills-copy-a.txt) | [B](prompts/skills-copy-b.txt) | [C](prompts/skills-copy-c.txt) | [D](prompts/skills-copy-d.txt) |
| 24 | 真诚邀请 · 社交文案 | [A](prompts/skill-copy-editor-a.txt) | [B](prompts/skill-copy-editor-b.txt) | [C](prompts/skill-copy-editor-c.txt) | [D](prompts/skill-copy-editor-d.txt) |
| 25 | MCP 连接 | [A](prompts/machine-list-a.txt) | [B](prompts/machine-list-b.txt) | [C](prompts/machine-list-c.txt) | [D](prompts/machine-list-d.txt) |
| 26 | 创建 MCP 连接 | [A](prompts/machine-new-a.txt) | [B](prompts/machine-new-b.txt) | [C](prompts/machine-new-c.txt) | [D](prompts/machine-new-d.txt) |
| 27 | 连接调用记录 | [A](prompts/machine-calls-a.txt) | [B](prompts/machine-calls-b.txt) | [C](prompts/machine-calls-c.txt) | [D](prompts/machine-calls-d.txt) |
| 28 | 订单与售后 | [A](prompts/orders-list-a.txt) | [B](prompts/orders-list-b.txt) | [C](prompts/orders-list-c.txt) | [D](prompts/orders-list-d.txt) |
| 29 | 人工录入订单 | [A](prompts/order-new-a.txt) | [B](prompts/order-new-b.txt) | [C](prompts/order-new-c.txt) | [D](prompts/order-new-d.txt) |
| 30 | CSV 订单导入 | [A](prompts/orders-csv-a.txt) | [B](prompts/orders-csv-b.txt) | [C](prompts/orders-csv-c.txt) | [D](prompts/orders-csv-d.txt) |
| 31 | 订单详情与售后 | [A](prompts/order-detail-a.txt) | [B](prompts/order-detail-b.txt) | [C](prompts/order-detail-c.txt) | [D](prompts/order-detail-d.txt) |
| 32 | 管理员访问 | [A](prompts/access-a.txt) | [B](prompts/access-b.txt) | [C](prompts/access-c.txt) | [D](prompts/access-d.txt) |

## 01 · 概览与审计

Page ID：`overview`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“概览与审计”，Page ID：overview。所有记录均为合成设计示例。

页面任务：看清当前业务记录，快速找到需要继续处理的内容。
对应现有入口：/admin（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“进入内容工作台”；次操作：“查看全部审计”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“概览与审计”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 概览与审计 / 概览与审计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以一行四个克制的事实数字开始，下方用主要宽表呈现最近审计，窄侧栏放业务事件摘要与进入内容工作台的文字入口。没有巨幅欢迎区，没有图表装饰。
需要保留的字段与合成示例：
- 人工登记订单：48 笔
- 登记金额：¥ 4,752.00
- 商品：8 款
- 素材：36 份

样例数据结构：表头“时间 / 操作 / 对象”。
- 10:42 / 保存内容草稿 / 关系中的安全感 · 封面 r4
- 10:35 / 保存固定采用包 / 关系中的安全感 · 第 2 包
- 10:18 / 审核题库 / 看见自己的节奏 · v2
- 09:56 / 登记订单 / 设计示例 · DEMO-0048
- 09:24 / 签发连接 / 每日文案制作
- 09:10 / 保存 skill 草稿 / 温柔叙事 · v4
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
人工登记订单与金额只能称为登记，不能称为已核实收入；事件统计是记录，不是实时流量。显示设计示例标记。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部数字为设计示例；人工登记金额不等于已核实收入。
- 事件：浏览 126 / 兑换 42 / 开始 39 / 完成 34 / 退款 2；没有实时访问量或自动支付结算。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“概览与审计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“概览与审计”，Page ID：overview。所有记录均为合成设计示例。

页面任务：看清当前业务记录，快速找到需要继续处理的内容。
对应现有入口：/admin（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“进入内容工作台”；次操作：“查看全部审计”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“概览与审计”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 概览与审计 / 概览与审计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以一行四个克制的事实数字开始，下方用主要宽表呈现最近审计，窄侧栏放业务事件摘要与进入内容工作台的文字入口。没有巨幅欢迎区，没有图表装饰。
需要保留的字段与合成示例：
- 人工登记订单：48 笔
- 登记金额：¥ 4,752.00
- 商品：8 款
- 素材：36 份

样例数据结构：表头“时间 / 操作 / 对象”。
- 10:42 / 保存内容草稿 / 关系中的安全感 · 封面 r4
- 10:35 / 保存固定采用包 / 关系中的安全感 · 第 2 包
- 10:18 / 审核题库 / 看见自己的节奏 · v2
- 09:56 / 登记订单 / 设计示例 · DEMO-0048
- 09:24 / 签发连接 / 每日文案制作
- 09:10 / 保存 skill 草稿 / 温柔叙事 · v4
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
人工登记订单与金额只能称为登记，不能称为已核实收入；事件统计是记录，不是实时流量。显示设计示例标记。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部数字为设计示例；人工登记金额不等于已核实收入。
- 事件：浏览 126 / 兑换 42 / 开始 39 / 完成 34 / 退款 2；没有实时访问量或自动支付结算。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“概览与审计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“概览与审计”，Page ID：overview。所有记录均为合成设计示例。

页面任务：看清当前业务记录，快速找到需要继续处理的内容。
对应现有入口：/admin（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“进入内容工作台”；次操作：“查看全部审计”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“概览与审计”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 概览与审计 / 概览与审计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以一行四个克制的事实数字开始，下方用主要宽表呈现最近审计，窄侧栏放业务事件摘要与进入内容工作台的文字入口。没有巨幅欢迎区，没有图表装饰。
需要保留的字段与合成示例：
- 人工登记订单：48 笔
- 登记金额：¥ 4,752.00
- 商品：8 款
- 素材：36 份

样例数据结构：表头“时间 / 操作 / 对象”。
- 10:42 / 保存内容草稿 / 关系中的安全感 · 封面 r4
- 10:35 / 保存固定采用包 / 关系中的安全感 · 第 2 包
- 10:18 / 审核题库 / 看见自己的节奏 · v2
- 09:56 / 登记订单 / 设计示例 · DEMO-0048
- 09:24 / 签发连接 / 每日文案制作
- 09:10 / 保存 skill 草稿 / 温柔叙事 · v4
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
人工登记订单与金额只能称为登记，不能称为已核实收入；事件统计是记录，不是实时流量。显示设计示例标记。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部数字为设计示例；人工登记金额不等于已核实收入。
- 事件：浏览 126 / 兑换 42 / 开始 39 / 完成 34 / 退款 2；没有实时访问量或自动支付结算。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“概览与审计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“概览与审计”，Page ID：overview。所有记录均为合成设计示例。

页面任务：看清当前业务记录，快速找到需要继续处理的内容。
对应现有入口：/admin（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“进入内容工作台”；次操作：“查看全部审计”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“概览与审计”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 概览与审计 / 概览与审计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以一行四个克制的事实数字开始，下方用主要宽表呈现最近审计，窄侧栏放业务事件摘要与进入内容工作台的文字入口。没有巨幅欢迎区，没有图表装饰。
需要保留的字段与合成示例：
- 人工登记订单：48 笔
- 登记金额：¥ 4,752.00
- 商品：8 款
- 素材：36 份

样例数据结构：表头“时间 / 操作 / 对象”。
- 10:42 / 保存内容草稿 / 关系中的安全感 · 封面 r4
- 10:35 / 保存固定采用包 / 关系中的安全感 · 第 2 包
- 10:18 / 审核题库 / 看见自己的节奏 · v2
- 09:56 / 登记订单 / 设计示例 · DEMO-0048
- 09:24 / 签发连接 / 每日文案制作
- 09:10 / 保存 skill 草稿 / 温柔叙事 · v4
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
人工登记订单与金额只能称为登记，不能称为已核实收入；事件统计是记录，不是实时流量。显示设计示例标记。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部数字为设计示例；人工登记金额不等于已核实收入。
- 事件：浏览 126 / 兑换 42 / 开始 39 / 完成 34 / 退款 2；没有实时访问量或自动支付结算。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“概览与审计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 02 · 商品与版本

Page ID：`products-list`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品与版本”，Page ID：products-list。所有记录均为合成设计示例。

页面任务：按发布状态管理商品，进入资料与配置版本。
对应现有入口：/admin/products（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建商品”；次操作：“分类与标签”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以商品目录表为主，名称列宽且可阅读，状态与版本列整齐对齐；顶部一条搜索和状态筛选栏，右上新建商品。分类标签在次级工具区。
需要保留的字段与合成示例：
- 搜索商品：输入名称或标识
- 商品状态：全部状态
- 数据范围：设计示例
- 结果：6 款商品

样例数据结构：表头“商品 / 形式 / 状态 / 当前版本 / 修订”。
- 关系中的安全感 / 网页测评 / 已发布 / v3 / r7
- 看见自己的节奏 / 网页测评 / 已审核 / v2 / r4
- 亲密关系的距离 / 网页测评 / 草稿 / v1 / r2
- 情绪的天气 / 卡片 · 方案 / 草稿 / v1 / r1
- 我的内在地图 / 2.5D · 方案 / 草稿 / — / r1
- 关于我们的日常 / 网页测评 / 已归档 / v2 / r6
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
区分草稿、已审核、已发布、已归档。网页是当前体验；卡片、2.5D等仅表示创作方案，不代表已可运行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 新体验形式目前只保存创作方案。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品与版本”，Page ID：products-list。所有记录均为合成设计示例。

页面任务：按发布状态管理商品，进入资料与配置版本。
对应现有入口：/admin/products（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建商品”；次操作：“分类与标签”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以商品目录表为主，名称列宽且可阅读，状态与版本列整齐对齐；顶部一条搜索和状态筛选栏，右上新建商品。分类标签在次级工具区。
需要保留的字段与合成示例：
- 搜索商品：输入名称或标识
- 商品状态：全部状态
- 数据范围：设计示例
- 结果：6 款商品

样例数据结构：表头“商品 / 形式 / 状态 / 当前版本 / 修订”。
- 关系中的安全感 / 网页测评 / 已发布 / v3 / r7
- 看见自己的节奏 / 网页测评 / 已审核 / v2 / r4
- 亲密关系的距离 / 网页测评 / 草稿 / v1 / r2
- 情绪的天气 / 卡片 · 方案 / 草稿 / v1 / r1
- 我的内在地图 / 2.5D · 方案 / 草稿 / — / r1
- 关于我们的日常 / 网页测评 / 已归档 / v2 / r6
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
区分草稿、已审核、已发布、已归档。网页是当前体验；卡片、2.5D等仅表示创作方案，不代表已可运行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 新体验形式目前只保存创作方案。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品与版本”，Page ID：products-list。所有记录均为合成设计示例。

页面任务：按发布状态管理商品，进入资料与配置版本。
对应现有入口：/admin/products（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建商品”；次操作：“分类与标签”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以商品目录表为主，名称列宽且可阅读，状态与版本列整齐对齐；顶部一条搜索和状态筛选栏，右上新建商品。分类标签在次级工具区。
需要保留的字段与合成示例：
- 搜索商品：输入名称或标识
- 商品状态：全部状态
- 数据范围：设计示例
- 结果：6 款商品

样例数据结构：表头“商品 / 形式 / 状态 / 当前版本 / 修订”。
- 关系中的安全感 / 网页测评 / 已发布 / v3 / r7
- 看见自己的节奏 / 网页测评 / 已审核 / v2 / r4
- 亲密关系的距离 / 网页测评 / 草稿 / v1 / r2
- 情绪的天气 / 卡片 · 方案 / 草稿 / v1 / r1
- 我的内在地图 / 2.5D · 方案 / 草稿 / — / r1
- 关于我们的日常 / 网页测评 / 已归档 / v2 / r6
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
区分草稿、已审核、已发布、已归档。网页是当前体验；卡片、2.5D等仅表示创作方案，不代表已可运行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 新体验形式目前只保存创作方案。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品与版本”，Page ID：products-list。所有记录均为合成设计示例。

页面任务：按发布状态管理商品，进入资料与配置版本。
对应现有入口：/admin/products（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建商品”；次操作：“分类与标签”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以商品目录表为主，名称列宽且可阅读，状态与版本列整齐对齐；顶部一条搜索和状态筛选栏，右上新建商品。分类标签在次级工具区。
需要保留的字段与合成示例：
- 搜索商品：输入名称或标识
- 商品状态：全部状态
- 数据范围：设计示例
- 结果：6 款商品

样例数据结构：表头“商品 / 形式 / 状态 / 当前版本 / 修订”。
- 关系中的安全感 / 网页测评 / 已发布 / v3 / r7
- 看见自己的节奏 / 网页测评 / 已审核 / v2 / r4
- 亲密关系的距离 / 网页测评 / 草稿 / v1 / r2
- 情绪的天气 / 卡片 · 方案 / 草稿 / v1 / r1
- 我的内在地图 / 2.5D · 方案 / 草稿 / — / r1
- 关于我们的日常 / 网页测评 / 已归档 / v2 / r6
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
区分草稿、已审核、已发布、已归档。网页是当前体验；卡片、2.5D等仅表示创作方案，不代表已可运行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 新体验形式目前只保存创作方案。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 03 · 商品资料与版本

Page ID：`product-detail`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品资料与版本”，Page ID：product-detail。所有记录均为合成设计示例。

页面任务：编辑商品资料、管理配置版本及人工审核发布。
对应现有入口：/admin/products（选中商品）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存商品资料”；次操作：“打开内容工作台”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品资料与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：商品资料 / 配置版本 / 公开预览。

本页专属内容与信息结构：
采用资料与版本分区的详情工作台。页首显示商品名、状态、修订；左侧为简短分区导航，主体展示可读资料表单；右侧较窄区域放当前版本及发布流程。配置版本表置于详情内部页签，完整 JSON 作为高级入口。
需要保留的字段与合成示例：
- 商品名称：关系中的安全感
- 稳定标识：relationship-safety
- 一句话介绍：看见自己在关系中需要怎样的回应。
- 分类：亲密关系
- 价格：¥ 99.00
- 推荐排序：20
- 当前版本：v3 · 已发布
- 公开报告样例：已设置 · 2 个片段

样例数据结构：表头“版本 / 状态 / 修订 / 操作”。
- v3 / 已发布 / r5 / 预览
- v2 / 已审核 / r4 / 预览
- v1 / 已归档 / r3 / 预览
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前商品有已发布v3与历史v2/v1。商品资料可编辑，已发布题库配置只读；新配置通过导入为新版本。审核/发布只对相应可操作状态开放；不要让已发布版本显示“保存配置草稿”。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 资料表单与高级 JSON 同源；导入配置、审核版本、发布版本、下架都需保留独立动作。
- 未保存的配置不能审核或发布。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品资料与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品资料与版本”，Page ID：product-detail。所有记录均为合成设计示例。

页面任务：编辑商品资料、管理配置版本及人工审核发布。
对应现有入口：/admin/products（选中商品）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存商品资料”；次操作：“打开内容工作台”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品资料与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：商品资料 / 配置版本 / 公开预览。

本页专属内容与信息结构：
采用资料与版本分区的详情工作台。页首显示商品名、状态、修订；左侧为简短分区导航，主体展示可读资料表单；右侧较窄区域放当前版本及发布流程。配置版本表置于详情内部页签，完整 JSON 作为高级入口。
需要保留的字段与合成示例：
- 商品名称：关系中的安全感
- 稳定标识：relationship-safety
- 一句话介绍：看见自己在关系中需要怎样的回应。
- 分类：亲密关系
- 价格：¥ 99.00
- 推荐排序：20
- 当前版本：v3 · 已发布
- 公开报告样例：已设置 · 2 个片段

样例数据结构：表头“版本 / 状态 / 修订 / 操作”。
- v3 / 已发布 / r5 / 预览
- v2 / 已审核 / r4 / 预览
- v1 / 已归档 / r3 / 预览
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前商品有已发布v3与历史v2/v1。商品资料可编辑，已发布题库配置只读；新配置通过导入为新版本。审核/发布只对相应可操作状态开放；不要让已发布版本显示“保存配置草稿”。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 资料表单与高级 JSON 同源；导入配置、审核版本、发布版本、下架都需保留独立动作。
- 未保存的配置不能审核或发布。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品资料与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品资料与版本”，Page ID：product-detail。所有记录均为合成设计示例。

页面任务：编辑商品资料、管理配置版本及人工审核发布。
对应现有入口：/admin/products（选中商品）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存商品资料”；次操作：“打开内容工作台”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品资料与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：商品资料 / 配置版本 / 公开预览。

本页专属内容与信息结构：
采用资料与版本分区的详情工作台。页首显示商品名、状态、修订；左侧为简短分区导航，主体展示可读资料表单；右侧较窄区域放当前版本及发布流程。配置版本表置于详情内部页签，完整 JSON 作为高级入口。
需要保留的字段与合成示例：
- 商品名称：关系中的安全感
- 稳定标识：relationship-safety
- 一句话介绍：看见自己在关系中需要怎样的回应。
- 分类：亲密关系
- 价格：¥ 99.00
- 推荐排序：20
- 当前版本：v3 · 已发布
- 公开报告样例：已设置 · 2 个片段

样例数据结构：表头“版本 / 状态 / 修订 / 操作”。
- v3 / 已发布 / r5 / 预览
- v2 / 已审核 / r4 / 预览
- v1 / 已归档 / r3 / 预览
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前商品有已发布v3与历史v2/v1。商品资料可编辑，已发布题库配置只读；新配置通过导入为新版本。审核/发布只对相应可操作状态开放；不要让已发布版本显示“保存配置草稿”。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 资料表单与高级 JSON 同源；导入配置、审核版本、发布版本、下架都需保留独立动作。
- 未保存的配置不能审核或发布。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品资料与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“商品资料与版本”，Page ID：product-detail。所有记录均为合成设计示例。

页面任务：编辑商品资料、管理配置版本及人工审核发布。
对应现有入口：/admin/products（选中商品）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存商品资料”；次操作：“打开内容工作台”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“商品与版本”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 商品与版本 / 商品资料与版本”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：商品资料 / 配置版本 / 公开预览。

本页专属内容与信息结构：
采用资料与版本分区的详情工作台。页首显示商品名、状态、修订；左侧为简短分区导航，主体展示可读资料表单；右侧较窄区域放当前版本及发布流程。配置版本表置于详情内部页签，完整 JSON 作为高级入口。
需要保留的字段与合成示例：
- 商品名称：关系中的安全感
- 稳定标识：relationship-safety
- 一句话介绍：看见自己在关系中需要怎样的回应。
- 分类：亲密关系
- 价格：¥ 99.00
- 推荐排序：20
- 当前版本：v3 · 已发布
- 公开报告样例：已设置 · 2 个片段

样例数据结构：表头“版本 / 状态 / 修订 / 操作”。
- v3 / 已发布 / r5 / 预览
- v2 / 已审核 / r4 / 预览
- v1 / 已归档 / r3 / 预览
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前商品有已发布v3与历史v2/v1。商品资料可编辑，已发布题库配置只读；新配置通过导入为新版本。审核/发布只对相应可操作状态开放；不要让已发布版本显示“保存配置草稿”。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 资料表单与高级 JSON 同源；导入配置、审核版本、发布版本、下架都需保留独立动作。
- 未保存的配置不能审核或发布。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“商品资料与版本”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 04 · 内容工作台

Page ID：`content-list`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“内容工作台”，Page ID：content-list。所有记录均为合成设计示例。

页面任务：以商品为入口组织题库、报告和传播内容。
对应现有入口：/admin/content（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“管理商品资料”；次操作：“查找商品”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 内容工作台”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以有节奏的商品工作列表为主，左侧商品名和一句简介，右侧状态与进入工作台箭头。搜索是单行短工具条，不加无依据的跨商品生产统计。
需要保留的字段与合成示例：
- 搜索内容商品：名称 / 简介
- 数据范围：设计示例
- 商品总数：6 款
- 工作方式：选择商品，进入四类内容制作

样例数据结构：表头“商品 / 内容方向 / 状态 / 打开”。
- 关系中的安全感 / 看见关系中的回应方式 / 已发布 / 进入工作台
- 看见自己的节奏 / 理解自己的能量与节奏 / 已审核 / 进入工作台
- 亲密关系的距离 / 理解靠近与独处的需要 / 草稿 / 进入工作台
- 情绪的天气 / 练习辨认日常情绪 / 草稿 / 进入工作台
- 我的内在地图 / 探索个人叙事与生活线索 / 草稿 / 进入工作台
- 关于我们的日常 / 观察相处中的小习惯 / 已归档 / 查看历史
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
列表显示商品资料和商品状态，不声称已存在跨商品齐备度统计。一个入口对应一个商品的固定内容工作台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 当前 API 列表只含商品资料与状态；不要把跨商品齐备度画成已上线统计。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“内容工作台”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“内容工作台”，Page ID：content-list。所有记录均为合成设计示例。

页面任务：以商品为入口组织题库、报告和传播内容。
对应现有入口：/admin/content（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“管理商品资料”；次操作：“查找商品”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 内容工作台”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以有节奏的商品工作列表为主，左侧商品名和一句简介，右侧状态与进入工作台箭头。搜索是单行短工具条，不加无依据的跨商品生产统计。
需要保留的字段与合成示例：
- 搜索内容商品：名称 / 简介
- 数据范围：设计示例
- 商品总数：6 款
- 工作方式：选择商品，进入四类内容制作

样例数据结构：表头“商品 / 内容方向 / 状态 / 打开”。
- 关系中的安全感 / 看见关系中的回应方式 / 已发布 / 进入工作台
- 看见自己的节奏 / 理解自己的能量与节奏 / 已审核 / 进入工作台
- 亲密关系的距离 / 理解靠近与独处的需要 / 草稿 / 进入工作台
- 情绪的天气 / 练习辨认日常情绪 / 草稿 / 进入工作台
- 我的内在地图 / 探索个人叙事与生活线索 / 草稿 / 进入工作台
- 关于我们的日常 / 观察相处中的小习惯 / 已归档 / 查看历史
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
列表显示商品资料和商品状态，不声称已存在跨商品齐备度统计。一个入口对应一个商品的固定内容工作台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 当前 API 列表只含商品资料与状态；不要把跨商品齐备度画成已上线统计。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“内容工作台”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“内容工作台”，Page ID：content-list。所有记录均为合成设计示例。

页面任务：以商品为入口组织题库、报告和传播内容。
对应现有入口：/admin/content（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“管理商品资料”；次操作：“查找商品”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 内容工作台”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以有节奏的商品工作列表为主，左侧商品名和一句简介，右侧状态与进入工作台箭头。搜索是单行短工具条，不加无依据的跨商品生产统计。
需要保留的字段与合成示例：
- 搜索内容商品：名称 / 简介
- 数据范围：设计示例
- 商品总数：6 款
- 工作方式：选择商品，进入四类内容制作

样例数据结构：表头“商品 / 内容方向 / 状态 / 打开”。
- 关系中的安全感 / 看见关系中的回应方式 / 已发布 / 进入工作台
- 看见自己的节奏 / 理解自己的能量与节奏 / 已审核 / 进入工作台
- 亲密关系的距离 / 理解靠近与独处的需要 / 草稿 / 进入工作台
- 情绪的天气 / 练习辨认日常情绪 / 草稿 / 进入工作台
- 我的内在地图 / 探索个人叙事与生活线索 / 草稿 / 进入工作台
- 关于我们的日常 / 观察相处中的小习惯 / 已归档 / 查看历史
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
列表显示商品资料和商品状态，不声称已存在跨商品齐备度统计。一个入口对应一个商品的固定内容工作台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 当前 API 列表只含商品资料与状态；不要把跨商品齐备度画成已上线统计。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“内容工作台”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“内容工作台”，Page ID：content-list。所有记录均为合成设计示例。

页面任务：以商品为入口组织题库、报告和传播内容。
对应现有入口：/admin/content（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“管理商品资料”；次操作：“查找商品”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 内容工作台”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
以有节奏的商品工作列表为主，左侧商品名和一句简介，右侧状态与进入工作台箭头。搜索是单行短工具条，不加无依据的跨商品生产统计。
需要保留的字段与合成示例：
- 搜索内容商品：名称 / 简介
- 数据范围：设计示例
- 商品总数：6 款
- 工作方式：选择商品，进入四类内容制作

样例数据结构：表头“商品 / 内容方向 / 状态 / 打开”。
- 关系中的安全感 / 看见关系中的回应方式 / 已发布 / 进入工作台
- 看见自己的节奏 / 理解自己的能量与节奏 / 已审核 / 进入工作台
- 亲密关系的距离 / 理解靠近与独处的需要 / 草稿 / 进入工作台
- 情绪的天气 / 练习辨认日常情绪 / 草稿 / 进入工作台
- 我的内在地图 / 探索个人叙事与生活线索 / 草稿 / 进入工作台
- 关于我们的日常 / 观察相处中的小习惯 / 已归档 / 查看历史
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
列表显示商品资料和商品状态，不声称已存在跨商品齐备度统计。一个入口对应一个商品的固定内容工作台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 当前 API 列表只含商品资料与状态；不要把跨商品齐备度画成已上线统计。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“内容工作台”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 05 · 创作设定

Page ID：`content-profile`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创作设定”，Page ID：content-profile。所有记录均为合成设计示例。

页面任务：为四类交付物固定一致的情绪目标、语言和视觉。
对应现有入口：/admin/content/:productId?tab=profile（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存为新修订”；次操作：“放弃修改”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 创作设定”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“创作设定”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是一张分章节的创作说明编辑表：用户与目标、语言与世界、形式与交付、报告叙事。主编辑区占约72%，右侧摘要占28%。段落字段用有节奏的分组，不为每个字段制造卡片；页首留版本上下文。
需要保留的字段与合成示例：
- 题目名称：关系中的安全感
- 情绪目标：被理解，也能更清楚地表达自己的需要。
- 理解目标：辨认靠近、退后与寻求回应的习惯。
- 世界观与意象：日常房间、窗边光线、一封慢慢写完的信。
- 语言风格：具体、温和、有留白，避免判断与标签。
- 视觉风格：纸白与灰紫；细线、自然排版、小幅摄影。
- 参与视角：单人 · 观察关系
- 体验形式：web · 当前可用

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为可编辑设定修订，保存追加新修订，历史稿仍使用旧设定。报告叙事方案仍是草稿；当前消费者报告仍由兼容模板生成。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 报告叙事方案：一封写给自己的信；当前用户报告仍使用题库中的兼容模板。
- 保存追加修订；旧稿继续引用原设定。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创作设定”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创作设定”，Page ID：content-profile。所有记录均为合成设计示例。

页面任务：为四类交付物固定一致的情绪目标、语言和视觉。
对应现有入口：/admin/content/:productId?tab=profile（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存为新修订”；次操作：“放弃修改”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 创作设定”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“创作设定”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是一张分章节的创作说明编辑表：用户与目标、语言与世界、形式与交付、报告叙事。主编辑区占约72%，右侧摘要占28%。段落字段用有节奏的分组，不为每个字段制造卡片；页首留版本上下文。
需要保留的字段与合成示例：
- 题目名称：关系中的安全感
- 情绪目标：被理解，也能更清楚地表达自己的需要。
- 理解目标：辨认靠近、退后与寻求回应的习惯。
- 世界观与意象：日常房间、窗边光线、一封慢慢写完的信。
- 语言风格：具体、温和、有留白，避免判断与标签。
- 视觉风格：纸白与灰紫；细线、自然排版、小幅摄影。
- 参与视角：单人 · 观察关系
- 体验形式：web · 当前可用

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为可编辑设定修订，保存追加新修订，历史稿仍使用旧设定。报告叙事方案仍是草稿；当前消费者报告仍由兼容模板生成。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 报告叙事方案：一封写给自己的信；当前用户报告仍使用题库中的兼容模板。
- 保存追加修订；旧稿继续引用原设定。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创作设定”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创作设定”，Page ID：content-profile。所有记录均为合成设计示例。

页面任务：为四类交付物固定一致的情绪目标、语言和视觉。
对应现有入口：/admin/content/:productId?tab=profile（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存为新修订”；次操作：“放弃修改”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 创作设定”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“创作设定”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是一张分章节的创作说明编辑表：用户与目标、语言与世界、形式与交付、报告叙事。主编辑区占约72%，右侧摘要占28%。段落字段用有节奏的分组，不为每个字段制造卡片；页首留版本上下文。
需要保留的字段与合成示例：
- 题目名称：关系中的安全感
- 情绪目标：被理解，也能更清楚地表达自己的需要。
- 理解目标：辨认靠近、退后与寻求回应的习惯。
- 世界观与意象：日常房间、窗边光线、一封慢慢写完的信。
- 语言风格：具体、温和、有留白，避免判断与标签。
- 视觉风格：纸白与灰紫；细线、自然排版、小幅摄影。
- 参与视角：单人 · 观察关系
- 体验形式：web · 当前可用

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为可编辑设定修订，保存追加新修订，历史稿仍使用旧设定。报告叙事方案仍是草稿；当前消费者报告仍由兼容模板生成。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 报告叙事方案：一封写给自己的信；当前用户报告仍使用题库中的兼容模板。
- 保存追加修订；旧稿继续引用原设定。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创作设定”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创作设定”，Page ID：content-profile。所有记录均为合成设计示例。

页面任务：为四类交付物固定一致的情绪目标、语言和视觉。
对应现有入口：/admin/content/:productId?tab=profile（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存为新修订”；次操作：“放弃修改”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 创作设定”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“创作设定”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是一张分章节的创作说明编辑表：用户与目标、语言与世界、形式与交付、报告叙事。主编辑区占约72%，右侧摘要占28%。段落字段用有节奏的分组，不为每个字段制造卡片；页首留版本上下文。
需要保留的字段与合成示例：
- 题目名称：关系中的安全感
- 情绪目标：被理解，也能更清楚地表达自己的需要。
- 理解目标：辨认靠近、退后与寻求回应的习惯。
- 世界观与意象：日常房间、窗边光线、一封慢慢写完的信。
- 语言风格：具体、温和、有留白，避免判断与标签。
- 视觉风格：纸白与灰紫；细线、自然排版、小幅摄影。
- 参与视角：单人 · 观察关系
- 体验形式：web · 当前可用

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为可编辑设定修订，保存追加新修订，历史稿仍使用旧设定。报告叙事方案仍是草稿；当前消费者报告仍由兼容模板生成。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 报告叙事方案：一封写给自己的信；当前用户报告仍使用题库中的兼容模板。
- 保存追加修订；旧稿继续引用原设定。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创作设定”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 06 · skill 组合

Page ID：`content-bindings`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“skill 组合”，Page ID：content-bindings。所有记录均为合成设计示例。

页面任务：为当前设定固定五个专业用途的 skill 版本。
对应现有入口：/admin/content/:productId?tab=skills（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存新组合”；次操作：“读取最新组合”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / skill 组合”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“skill 组合”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
五个专业用途以五行职责清单呈现，每行含用途、skill名称、固定版本和状态。右侧是当前设定、组合修订与变更说明；历史组合收在下方。强调五项绑定而非四张大卡片。
需要保留的字段与合成示例：
- 创作设定：r2 · 温柔理解
- 体验形式：web
- 组合修订：r3
- 组合说明：统一题目、报告与传播表达的语气。

样例数据结构：表头“专业用途 / skill / 版本 / 状态”。
- 题目与规则设计 / 关系观察设计 / v3 / 已启用
- 报告写作 / 温柔叙事报告 / v2 / 已启用
- 封面制作 / 纸感留白封面 / v4 / 已启用
- 视频与分镜 / 日常片段叙事 / v2 / 已启用
- 传播文案 / 温柔提问文案 / v3 / 已启用
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前设定固定五个专业用途版本，保存追加新组合修订。归档的历史skill仍可在已固定组合中查阅，但新选择应符合版本状态和形式要求。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 历史组合保留固定正文与参考资料；已有产物不会自动跟随新版本。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“skill 组合”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“skill 组合”，Page ID：content-bindings。所有记录均为合成设计示例。

页面任务：为当前设定固定五个专业用途的 skill 版本。
对应现有入口：/admin/content/:productId?tab=skills（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存新组合”；次操作：“读取最新组合”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / skill 组合”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“skill 组合”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
五个专业用途以五行职责清单呈现，每行含用途、skill名称、固定版本和状态。右侧是当前设定、组合修订与变更说明；历史组合收在下方。强调五项绑定而非四张大卡片。
需要保留的字段与合成示例：
- 创作设定：r2 · 温柔理解
- 体验形式：web
- 组合修订：r3
- 组合说明：统一题目、报告与传播表达的语气。

样例数据结构：表头“专业用途 / skill / 版本 / 状态”。
- 题目与规则设计 / 关系观察设计 / v3 / 已启用
- 报告写作 / 温柔叙事报告 / v2 / 已启用
- 封面制作 / 纸感留白封面 / v4 / 已启用
- 视频与分镜 / 日常片段叙事 / v2 / 已启用
- 传播文案 / 温柔提问文案 / v3 / 已启用
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前设定固定五个专业用途版本，保存追加新组合修订。归档的历史skill仍可在已固定组合中查阅，但新选择应符合版本状态和形式要求。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 历史组合保留固定正文与参考资料；已有产物不会自动跟随新版本。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“skill 组合”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“skill 组合”，Page ID：content-bindings。所有记录均为合成设计示例。

页面任务：为当前设定固定五个专业用途的 skill 版本。
对应现有入口：/admin/content/:productId?tab=skills（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存新组合”；次操作：“读取最新组合”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / skill 组合”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“skill 组合”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
五个专业用途以五行职责清单呈现，每行含用途、skill名称、固定版本和状态。右侧是当前设定、组合修订与变更说明；历史组合收在下方。强调五项绑定而非四张大卡片。
需要保留的字段与合成示例：
- 创作设定：r2 · 温柔理解
- 体验形式：web
- 组合修订：r3
- 组合说明：统一题目、报告与传播表达的语气。

样例数据结构：表头“专业用途 / skill / 版本 / 状态”。
- 题目与规则设计 / 关系观察设计 / v3 / 已启用
- 报告写作 / 温柔叙事报告 / v2 / 已启用
- 封面制作 / 纸感留白封面 / v4 / 已启用
- 视频与分镜 / 日常片段叙事 / v2 / 已启用
- 传播文案 / 温柔提问文案 / v3 / 已启用
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前设定固定五个专业用途版本，保存追加新组合修订。归档的历史skill仍可在已固定组合中查阅，但新选择应符合版本状态和形式要求。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 历史组合保留固定正文与参考资料；已有产物不会自动跟随新版本。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“skill 组合”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“skill 组合”，Page ID：content-bindings。所有记录均为合成设计示例。

页面任务：为当前设定固定五个专业用途的 skill 版本。
对应现有入口：/admin/content/:productId?tab=skills（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存新组合”；次操作：“读取最新组合”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / skill 组合”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“skill 组合”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
五个专业用途以五行职责清单呈现，每行含用途、skill名称、固定版本和状态。右侧是当前设定、组合修订与变更说明；历史组合收在下方。强调五项绑定而非四张大卡片。
需要保留的字段与合成示例：
- 创作设定：r2 · 温柔理解
- 体验形式：web
- 组合修订：r3
- 组合说明：统一题目、报告与传播表达的语气。

样例数据结构：表头“专业用途 / skill / 版本 / 状态”。
- 题目与规则设计 / 关系观察设计 / v3 / 已启用
- 报告写作 / 温柔叙事报告 / v2 / 已启用
- 封面制作 / 纸感留白封面 / v4 / 已启用
- 视频与分镜 / 日常片段叙事 / v2 / 已启用
- 传播文案 / 温柔提问文案 / v3 / 已启用
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前设定固定五个专业用途版本，保存追加新组合修订。归档的历史skill仍可在已固定组合中查阅，但新选择应符合版本状态和形式要求。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 历史组合保留固定正文与参考资料；已有产物不会自动跟随新版本。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“skill 组合”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 07 · 题库与报告

Page ID：`content-assessment`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告”，Page ID：content-assessment。所有记录均为合成设计示例。

页面任务：编辑问题、选项、规则与兼容报告，并查看制作依据。
对应现有入口：/admin/content/:productId?tab=assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存题库草稿”；次操作：“试读题目”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 题库与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“题库与报告”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。 本页内部功能分区：题目 / 报告解释 / 公开样例 / 高级配置。

本页专属内容与信息结构：
采用题目目录、当前题目编辑、属性来源栏三段布局。题目目录显示12题及当前题；中央显示题干和3个可编辑选项；右侧显示维度、必答、修订、制作依据。题目/报告解释/公开样例/高级配置作为专业编辑器内的简短页签。
需要保留的字段与合成示例：
- 题库版本：v3 · 修订 r5
- 题目数量：12 题
- 当前题目：当你想被理解时，通常会先做什么？
- 题目维度：表达与回应
- 选项 A：直接说出我现在需要什么
- 选项 B：先观察对方是否察觉
- 选项 C：等情绪过去，再寻找机会
- 本修订来源：已核实 MCP 接入 · 固定组合 r3

样例数据结构：表头“报告区间 / 解释 / 建议”。
- 主动表达 / 你倾向于主动把需要带进关系。 / 挑一个具体时刻，说清你期待的回应。
- 试探确认 / 你会通过一些小线索确认是否安全。 / 尝试把暗示转为一句可回应的话。
- 暂时退后 / 你可能需要空间整理当下的感受。 / 约定一个重新开始交流的时间。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前示例是可保存的草稿编辑状态；若上下文样例写已审核，应显示“修改后需重新审核”，而非改成已发布可编辑。题目与兼容报告一体保存，公开样例与私人报告分开。制作来源仅说明授权MCP保存，不证明模型实际执行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 题目与评分、报告解释、信息不足模板、公开样例都在此页管理；公开样例不使用私人报告。
- 查看已发布版时为只读，可导入新版本。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告”，Page ID：content-assessment。所有记录均为合成设计示例。

页面任务：编辑问题、选项、规则与兼容报告，并查看制作依据。
对应现有入口：/admin/content/:productId?tab=assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存题库草稿”；次操作：“试读题目”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 题库与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“题库与报告”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。 本页内部功能分区：题目 / 报告解释 / 公开样例 / 高级配置。

本页专属内容与信息结构：
采用题目目录、当前题目编辑、属性来源栏三段布局。题目目录显示12题及当前题；中央显示题干和3个可编辑选项；右侧显示维度、必答、修订、制作依据。题目/报告解释/公开样例/高级配置作为专业编辑器内的简短页签。
需要保留的字段与合成示例：
- 题库版本：v3 · 修订 r5
- 题目数量：12 题
- 当前题目：当你想被理解时，通常会先做什么？
- 题目维度：表达与回应
- 选项 A：直接说出我现在需要什么
- 选项 B：先观察对方是否察觉
- 选项 C：等情绪过去，再寻找机会
- 本修订来源：已核实 MCP 接入 · 固定组合 r3

样例数据结构：表头“报告区间 / 解释 / 建议”。
- 主动表达 / 你倾向于主动把需要带进关系。 / 挑一个具体时刻，说清你期待的回应。
- 试探确认 / 你会通过一些小线索确认是否安全。 / 尝试把暗示转为一句可回应的话。
- 暂时退后 / 你可能需要空间整理当下的感受。 / 约定一个重新开始交流的时间。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前示例是可保存的草稿编辑状态；若上下文样例写已审核，应显示“修改后需重新审核”，而非改成已发布可编辑。题目与兼容报告一体保存，公开样例与私人报告分开。制作来源仅说明授权MCP保存，不证明模型实际执行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 题目与评分、报告解释、信息不足模板、公开样例都在此页管理；公开样例不使用私人报告。
- 查看已发布版时为只读，可导入新版本。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告”，Page ID：content-assessment。所有记录均为合成设计示例。

页面任务：编辑问题、选项、规则与兼容报告，并查看制作依据。
对应现有入口：/admin/content/:productId?tab=assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存题库草稿”；次操作：“试读题目”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 题库与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“题库与报告”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。 本页内部功能分区：题目 / 报告解释 / 公开样例 / 高级配置。

本页专属内容与信息结构：
采用题目目录、当前题目编辑、属性来源栏三段布局。题目目录显示12题及当前题；中央显示题干和3个可编辑选项；右侧显示维度、必答、修订、制作依据。题目/报告解释/公开样例/高级配置作为专业编辑器内的简短页签。
需要保留的字段与合成示例：
- 题库版本：v3 · 修订 r5
- 题目数量：12 题
- 当前题目：当你想被理解时，通常会先做什么？
- 题目维度：表达与回应
- 选项 A：直接说出我现在需要什么
- 选项 B：先观察对方是否察觉
- 选项 C：等情绪过去，再寻找机会
- 本修订来源：已核实 MCP 接入 · 固定组合 r3

样例数据结构：表头“报告区间 / 解释 / 建议”。
- 主动表达 / 你倾向于主动把需要带进关系。 / 挑一个具体时刻，说清你期待的回应。
- 试探确认 / 你会通过一些小线索确认是否安全。 / 尝试把暗示转为一句可回应的话。
- 暂时退后 / 你可能需要空间整理当下的感受。 / 约定一个重新开始交流的时间。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前示例是可保存的草稿编辑状态；若上下文样例写已审核，应显示“修改后需重新审核”，而非改成已发布可编辑。题目与兼容报告一体保存，公开样例与私人报告分开。制作来源仅说明授权MCP保存，不证明模型实际执行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 题目与评分、报告解释、信息不足模板、公开样例都在此页管理；公开样例不使用私人报告。
- 查看已发布版时为只读，可导入新版本。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告”，Page ID：content-assessment。所有记录均为合成设计示例。

页面任务：编辑问题、选项、规则与兼容报告，并查看制作依据。
对应现有入口：/admin/content/:productId?tab=assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存题库草稿”；次操作：“试读题目”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 题库与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“题库与报告”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。 本页内部功能分区：题目 / 报告解释 / 公开样例 / 高级配置。

本页专属内容与信息结构：
采用题目目录、当前题目编辑、属性来源栏三段布局。题目目录显示12题及当前题；中央显示题干和3个可编辑选项；右侧显示维度、必答、修订、制作依据。题目/报告解释/公开样例/高级配置作为专业编辑器内的简短页签。
需要保留的字段与合成示例：
- 题库版本：v3 · 修订 r5
- 题目数量：12 题
- 当前题目：当你想被理解时，通常会先做什么？
- 题目维度：表达与回应
- 选项 A：直接说出我现在需要什么
- 选项 B：先观察对方是否察觉
- 选项 C：等情绪过去，再寻找机会
- 本修订来源：已核实 MCP 接入 · 固定组合 r3

样例数据结构：表头“报告区间 / 解释 / 建议”。
- 主动表达 / 你倾向于主动把需要带进关系。 / 挑一个具体时刻，说清你期待的回应。
- 试探确认 / 你会通过一些小线索确认是否安全。 / 尝试把暗示转为一句可回应的话。
- 暂时退后 / 你可能需要空间整理当下的感受。 / 约定一个重新开始交流的时间。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前示例是可保存的草稿编辑状态；若上下文样例写已审核，应显示“修改后需重新审核”，而非改成已发布可编辑。题目与兼容报告一体保存，公开样例与私人报告分开。制作来源仅说明授权MCP保存，不证明模型实际执行。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 题目与评分、报告解释、信息不足模板、公开样例都在此页管理；公开样例不使用私人报告。
- 查看已发布版时为只读，可导入新版本。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 08 · 封面

Page ID：`content-cover`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面”，Page ID：content-cover。所有记录均为合成设计示例。

页面任务：围绕固定商品设定设计、上传和审核平台封面。
对应现有入口：/admin/content/:productId?tab=cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存封面草稿”；次操作：“查看引用与历史”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 封面”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“封面”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
以大幅竖版封面预览为视觉中心，封面本身使用纸白灰紫和真实中文标题；一侧为平台、标题、说明与稿件状态；底部三行区分本地原件、预览文件、正式文件。另有克制的当前稿件列表与来源展开入口。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 稿件名称：窗边来信 · 竖版
- 传播平台：小红书
- 封面标题：在关系里，你怎样确认自己被在意？
- 画面与传播说明：窗边纸张与柔和紫色字块，保持安静的阅读感。

样例数据结构：表头“文件用途 / 文件 / 状态”。
- 本地原件 / relationship-cover-source.fig / 已登记
- 预览文件 / relationship-cover-preview.webp / 已校验
- 正式文件 / relationship-cover-final.png / 已校验
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是封面草稿，可保存；预览与正式文件均已校验，原件只登记在本地。文件可用不等于素材已就绪；审核与就绪动作按流程显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 封面比例 3:4 仅为该设计样例；平台字段与文件分工不省略。
- 已核实 MCP 保存来源可展开查看凭据 ID 和请求 ID；不展示 token。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面”，Page ID：content-cover。所有记录均为合成设计示例。

页面任务：围绕固定商品设定设计、上传和审核平台封面。
对应现有入口：/admin/content/:productId?tab=cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存封面草稿”；次操作：“查看引用与历史”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 封面”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“封面”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
以大幅竖版封面预览为视觉中心，封面本身使用纸白灰紫和真实中文标题；一侧为平台、标题、说明与稿件状态；底部三行区分本地原件、预览文件、正式文件。另有克制的当前稿件列表与来源展开入口。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 稿件名称：窗边来信 · 竖版
- 传播平台：小红书
- 封面标题：在关系里，你怎样确认自己被在意？
- 画面与传播说明：窗边纸张与柔和紫色字块，保持安静的阅读感。

样例数据结构：表头“文件用途 / 文件 / 状态”。
- 本地原件 / relationship-cover-source.fig / 已登记
- 预览文件 / relationship-cover-preview.webp / 已校验
- 正式文件 / relationship-cover-final.png / 已校验
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是封面草稿，可保存；预览与正式文件均已校验，原件只登记在本地。文件可用不等于素材已就绪；审核与就绪动作按流程显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 封面比例 3:4 仅为该设计样例；平台字段与文件分工不省略。
- 已核实 MCP 保存来源可展开查看凭据 ID 和请求 ID；不展示 token。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面”，Page ID：content-cover。所有记录均为合成设计示例。

页面任务：围绕固定商品设定设计、上传和审核平台封面。
对应现有入口：/admin/content/:productId?tab=cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存封面草稿”；次操作：“查看引用与历史”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 封面”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“封面”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
以大幅竖版封面预览为视觉中心，封面本身使用纸白灰紫和真实中文标题；一侧为平台、标题、说明与稿件状态；底部三行区分本地原件、预览文件、正式文件。另有克制的当前稿件列表与来源展开入口。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 稿件名称：窗边来信 · 竖版
- 传播平台：小红书
- 封面标题：在关系里，你怎样确认自己被在意？
- 画面与传播说明：窗边纸张与柔和紫色字块，保持安静的阅读感。

样例数据结构：表头“文件用途 / 文件 / 状态”。
- 本地原件 / relationship-cover-source.fig / 已登记
- 预览文件 / relationship-cover-preview.webp / 已校验
- 正式文件 / relationship-cover-final.png / 已校验
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是封面草稿，可保存；预览与正式文件均已校验，原件只登记在本地。文件可用不等于素材已就绪；审核与就绪动作按流程显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 封面比例 3:4 仅为该设计样例；平台字段与文件分工不省略。
- 已核实 MCP 保存来源可展开查看凭据 ID 和请求 ID；不展示 token。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面”，Page ID：content-cover。所有记录均为合成设计示例。

页面任务：围绕固定商品设定设计、上传和审核平台封面。
对应现有入口：/admin/content/:productId?tab=cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存封面草稿”；次操作：“查看引用与历史”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 封面”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“封面”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
以大幅竖版封面预览为视觉中心，封面本身使用纸白灰紫和真实中文标题；一侧为平台、标题、说明与稿件状态；底部三行区分本地原件、预览文件、正式文件。另有克制的当前稿件列表与来源展开入口。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 稿件名称：窗边来信 · 竖版
- 传播平台：小红书
- 封面标题：在关系里，你怎样确认自己被在意？
- 画面与传播说明：窗边纸张与柔和紫色字块，保持安静的阅读感。

样例数据结构：表头“文件用途 / 文件 / 状态”。
- 本地原件 / relationship-cover-source.fig / 已登记
- 预览文件 / relationship-cover-preview.webp / 已校验
- 正式文件 / relationship-cover-final.png / 已校验
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是封面草稿，可保存；预览与正式文件均已校验，原件只登记在本地。文件可用不等于素材已就绪；审核与就绪动作按流程显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 封面比例 3:4 仅为该设计样例；平台字段与文件分工不省略。
- 已核实 MCP 保存来源可展开查看凭据 ID 和请求 ID；不展示 token。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 09 · 视频与分镜

Page ID：`content-video`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频与分镜”，Page ID：content-video。所有记录均为合成设计示例。

页面任务：编排分镜，固定引用题目与文案，区分视频成品与纯脚本。
对应现有入口：/admin/content/:productId?tab=video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存视频草稿”；次操作：“预览视频”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 视频与分镜”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“视频”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
左侧是四个时间分镜条目，中间是干净的9:16视频静帧预览，右侧是当前分镜文字和固定来源。可显示简洁原生播放器进度；不画剪辑轨道、渲染器或一键生成。下方小区块放文件与制作来源。
需要保留的字段与合成示例：
- 稿件名称：一段关于回应的对话
- 传播平台：抖音
- 内容类型：视频
- 制作批次：2026-10-20 / 设计示例
- 固定题库：v3 · r5
- 固定文案：温柔提问 · r3
- 正式文件：relationship-story.mp4 · 已校验
- 本地原件：工程原件已登记

样例数据结构：表头“分镜 / 时间 / 画面 / 字幕 / 固定来源”。
- 01 / 00:00–00:05 / 你会直接说出自己的需要吗？ / 文案 · hook
- 02 / 00:05–00:13 / 当你想被理解时，通常先做什么？ / 题目 q01
- 03 / 00:13–00:23 / 沉默的时候，你希望对方怎样回应？ / 题目 q07
- 04 / 00:23–00:30 / 留一点时间，听听自己的答案。 / 文案 · CTA
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前视频草稿含四个分镜，固定引用两道题、hook及CTA。引用显示具体修订、实际使用文字与原文/改写；不隐式读取整份私人报告。正式成品仅来自上传。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 输入来源保留修订、原文/改写和实际使用快照；用分镜侧栏解释关联。
- 不是视频生成器，不画尚不存在的生成、时间线剪辑执行按钮。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频与分镜”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频与分镜”，Page ID：content-video。所有记录均为合成设计示例。

页面任务：编排分镜，固定引用题目与文案，区分视频成品与纯脚本。
对应现有入口：/admin/content/:productId?tab=video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存视频草稿”；次操作：“预览视频”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 视频与分镜”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“视频”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
左侧是四个时间分镜条目，中间是干净的9:16视频静帧预览，右侧是当前分镜文字和固定来源。可显示简洁原生播放器进度；不画剪辑轨道、渲染器或一键生成。下方小区块放文件与制作来源。
需要保留的字段与合成示例：
- 稿件名称：一段关于回应的对话
- 传播平台：抖音
- 内容类型：视频
- 制作批次：2026-10-20 / 设计示例
- 固定题库：v3 · r5
- 固定文案：温柔提问 · r3
- 正式文件：relationship-story.mp4 · 已校验
- 本地原件：工程原件已登记

样例数据结构：表头“分镜 / 时间 / 画面 / 字幕 / 固定来源”。
- 01 / 00:00–00:05 / 你会直接说出自己的需要吗？ / 文案 · hook
- 02 / 00:05–00:13 / 当你想被理解时，通常先做什么？ / 题目 q01
- 03 / 00:13–00:23 / 沉默的时候，你希望对方怎样回应？ / 题目 q07
- 04 / 00:23–00:30 / 留一点时间，听听自己的答案。 / 文案 · CTA
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前视频草稿含四个分镜，固定引用两道题、hook及CTA。引用显示具体修订、实际使用文字与原文/改写；不隐式读取整份私人报告。正式成品仅来自上传。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 输入来源保留修订、原文/改写和实际使用快照；用分镜侧栏解释关联。
- 不是视频生成器，不画尚不存在的生成、时间线剪辑执行按钮。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频与分镜”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频与分镜”，Page ID：content-video。所有记录均为合成设计示例。

页面任务：编排分镜，固定引用题目与文案，区分视频成品与纯脚本。
对应现有入口：/admin/content/:productId?tab=video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存视频草稿”；次操作：“预览视频”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 视频与分镜”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“视频”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
左侧是四个时间分镜条目，中间是干净的9:16视频静帧预览，右侧是当前分镜文字和固定来源。可显示简洁原生播放器进度；不画剪辑轨道、渲染器或一键生成。下方小区块放文件与制作来源。
需要保留的字段与合成示例：
- 稿件名称：一段关于回应的对话
- 传播平台：抖音
- 内容类型：视频
- 制作批次：2026-10-20 / 设计示例
- 固定题库：v3 · r5
- 固定文案：温柔提问 · r3
- 正式文件：relationship-story.mp4 · 已校验
- 本地原件：工程原件已登记

样例数据结构：表头“分镜 / 时间 / 画面 / 字幕 / 固定来源”。
- 01 / 00:00–00:05 / 你会直接说出自己的需要吗？ / 文案 · hook
- 02 / 00:05–00:13 / 当你想被理解时，通常先做什么？ / 题目 q01
- 03 / 00:13–00:23 / 沉默的时候，你希望对方怎样回应？ / 题目 q07
- 04 / 00:23–00:30 / 留一点时间，听听自己的答案。 / 文案 · CTA
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前视频草稿含四个分镜，固定引用两道题、hook及CTA。引用显示具体修订、实际使用文字与原文/改写；不隐式读取整份私人报告。正式成品仅来自上传。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 输入来源保留修订、原文/改写和实际使用快照；用分镜侧栏解释关联。
- 不是视频生成器，不画尚不存在的生成、时间线剪辑执行按钮。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频与分镜”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频与分镜”，Page ID：content-video。所有记录均为合成设计示例。

页面任务：编排分镜，固定引用题目与文案，区分视频成品与纯脚本。
对应现有入口：/admin/content/:productId?tab=video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存视频草稿”；次操作：“预览视频”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 视频与分镜”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“视频”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
左侧是四个时间分镜条目，中间是干净的9:16视频静帧预览，右侧是当前分镜文字和固定来源。可显示简洁原生播放器进度；不画剪辑轨道、渲染器或一键生成。下方小区块放文件与制作来源。
需要保留的字段与合成示例：
- 稿件名称：一段关于回应的对话
- 传播平台：抖音
- 内容类型：视频
- 制作批次：2026-10-20 / 设计示例
- 固定题库：v3 · r5
- 固定文案：温柔提问 · r3
- 正式文件：relationship-story.mp4 · 已校验
- 本地原件：工程原件已登记

样例数据结构：表头“分镜 / 时间 / 画面 / 字幕 / 固定来源”。
- 01 / 00:00–00:05 / 你会直接说出自己的需要吗？ / 文案 · hook
- 02 / 00:05–00:13 / 当你想被理解时，通常先做什么？ / 题目 q01
- 03 / 00:13–00:23 / 沉默的时候，你希望对方怎样回应？ / 题目 q07
- 04 / 00:23–00:30 / 留一点时间，听听自己的答案。 / 文案 · CTA
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前视频草稿含四个分镜，固定引用两道题、hook及CTA。引用显示具体修订、实际使用文字与原文/改写；不隐式读取整份私人报告。正式成品仅来自上传。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 输入来源保留修订、原文/改写和实际使用快照；用分镜侧栏解释关联。
- 不是视频生成器，不画尚不存在的生成、时间线剪辑执行按钮。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频与分镜”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 10 · 引流文案

Page ID：`content-copy`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案”，Page ID：content-copy。所有记录均为合成设计示例。

页面任务：用结构化文案块管理标题、hook、正文和行动引导。
对应现有入口：/admin/content/:productId?tab=copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存文案草稿”；次操作：“添加文案块”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引流文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引流文案”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的文案块编辑器，左侧用途目录，中央按标题/hook/正文/话题/CTA排列文字，右侧显示平台、修订和固定引用。文本阅读是主角，段落间用细线而不是每段浮动卡片。
需要保留的字段与合成示例：
- 稿件名称：温柔提问 · 小红书
- 传播平台：小红书
- 创作设定：r2 · 温柔理解
- 制作来源：已核实 MCP 接入
- skill 组合：r3 · 传播文案 v3
- 制作批次：2026-10-20 / 设计示例

样例数据结构：表头“用途 / 稳定 ID / 文字”。
- 标题 / title / 在关系里，你怎样确认自己被在意？
- 钩子 / hook / 有时候，我们等的不是答案，而是被认真听见。
- 正文 / body / 从几个日常场景开始，看见你表达需要的方式。
- 话题 / topic / #关系观察 #更懂自己
- 行动引导 / cta / 留一点时间，听听自己的答案。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是可编辑文案草稿，五个稳定ID文案块可分别被其他内容引用。保存保留制作来源和固定输入，不自动发布到平台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 文案块可供视频按块引用；对外文案避免确定性诊断和夸大承诺。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案”，Page ID：content-copy。所有记录均为合成设计示例。

页面任务：用结构化文案块管理标题、hook、正文和行动引导。
对应现有入口：/admin/content/:productId?tab=copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存文案草稿”；次操作：“添加文案块”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引流文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引流文案”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的文案块编辑器，左侧用途目录，中央按标题/hook/正文/话题/CTA排列文字，右侧显示平台、修订和固定引用。文本阅读是主角，段落间用细线而不是每段浮动卡片。
需要保留的字段与合成示例：
- 稿件名称：温柔提问 · 小红书
- 传播平台：小红书
- 创作设定：r2 · 温柔理解
- 制作来源：已核实 MCP 接入
- skill 组合：r3 · 传播文案 v3
- 制作批次：2026-10-20 / 设计示例

样例数据结构：表头“用途 / 稳定 ID / 文字”。
- 标题 / title / 在关系里，你怎样确认自己被在意？
- 钩子 / hook / 有时候，我们等的不是答案，而是被认真听见。
- 正文 / body / 从几个日常场景开始，看见你表达需要的方式。
- 话题 / topic / #关系观察 #更懂自己
- 行动引导 / cta / 留一点时间，听听自己的答案。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是可编辑文案草稿，五个稳定ID文案块可分别被其他内容引用。保存保留制作来源和固定输入，不自动发布到平台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 文案块可供视频按块引用；对外文案避免确定性诊断和夸大承诺。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案”，Page ID：content-copy。所有记录均为合成设计示例。

页面任务：用结构化文案块管理标题、hook、正文和行动引导。
对应现有入口：/admin/content/:productId?tab=copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存文案草稿”；次操作：“添加文案块”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引流文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引流文案”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的文案块编辑器，左侧用途目录，中央按标题/hook/正文/话题/CTA排列文字，右侧显示平台、修订和固定引用。文本阅读是主角，段落间用细线而不是每段浮动卡片。
需要保留的字段与合成示例：
- 稿件名称：温柔提问 · 小红书
- 传播平台：小红书
- 创作设定：r2 · 温柔理解
- 制作来源：已核实 MCP 接入
- skill 组合：r3 · 传播文案 v3
- 制作批次：2026-10-20 / 设计示例

样例数据结构：表头“用途 / 稳定 ID / 文字”。
- 标题 / title / 在关系里，你怎样确认自己被在意？
- 钩子 / hook / 有时候，我们等的不是答案，而是被认真听见。
- 正文 / body / 从几个日常场景开始，看见你表达需要的方式。
- 话题 / topic / #关系观察 #更懂自己
- 行动引导 / cta / 留一点时间，听听自己的答案。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是可编辑文案草稿，五个稳定ID文案块可分别被其他内容引用。保存保留制作来源和固定输入，不自动发布到平台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 文案块可供视频按块引用；对外文案避免确定性诊断和夸大承诺。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案”，Page ID：content-copy。所有记录均为合成设计示例。

页面任务：用结构化文案块管理标题、hook、正文和行动引导。
对应现有入口：/admin/content/:productId?tab=copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存文案草稿”；次操作：“添加文案块”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引流文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引流文案”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的文案块编辑器，左侧用途目录，中央按标题/hook/正文/话题/CTA排列文字，右侧显示平台、修订和固定引用。文本阅读是主角，段落间用细线而不是每段浮动卡片。
需要保留的字段与合成示例：
- 稿件名称：温柔提问 · 小红书
- 传播平台：小红书
- 创作设定：r2 · 温柔理解
- 制作来源：已核实 MCP 接入
- skill 组合：r3 · 传播文案 v3
- 制作批次：2026-10-20 / 设计示例

样例数据结构：表头“用途 / 稳定 ID / 文字”。
- 标题 / title / 在关系里，你怎样确认自己被在意？
- 钩子 / hook / 有时候，我们等的不是答案，而是被认真听见。
- 正文 / body / 从几个日常场景开始，看见你表达需要的方式。
- 话题 / topic / #关系观察 #更懂自己
- 行动引导 / cta / 留一点时间，听听自己的答案。
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前是可编辑文案草稿，五个稳定ID文案块可分别被其他内容引用。保存保留制作来源和固定输入，不自动发布到平台。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 文案块可供视频按块引用；对外文案避免确定性诊断和夸大承诺。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 11 · 整套预览

Page ID：`content-preview`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“整套预览”，Page ID：content-preview。所有记录均为合成设计示例。

页面任务：在同一页面检查题库、报告、封面、视频和文案的整体一致性。
对应现有入口：/admin/content/:productId?tab=preview（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“去成套采用”；次操作：“查看固定制作依据”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 整套预览”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“整套预览”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用成套审阅画布：上半部以问题与兼容报告片段建立体验，下半部或右侧展示封面、视频静帧和引流文案。各交付物有清楚标题、修订、文件状态。固定制作依据可折叠，不重做一遍编辑表单。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 题库：12 题 · 可试读
- 封面：窗边来信 · 正式文件
- 视频：一段关于回应的对话 · 30 秒
- 文案：温柔提问 · 5 个文案块

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
这是内容审阅预览，不消耗测评次数、不生成私人消费者报告。报告叙事方案与当前兼容报告要分别标注；成套预览不等于采用或发布。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 完整预览有题目与作答过程、兼容报告、叙事方案草稿、传播素材、公开样例与分享文字。
- 此处展示内容预览，不作真实测评或生成消费者私人报告。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“整套预览”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“整套预览”，Page ID：content-preview。所有记录均为合成设计示例。

页面任务：在同一页面检查题库、报告、封面、视频和文案的整体一致性。
对应现有入口：/admin/content/:productId?tab=preview（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“去成套采用”；次操作：“查看固定制作依据”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 整套预览”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“整套预览”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用成套审阅画布：上半部以问题与兼容报告片段建立体验，下半部或右侧展示封面、视频静帧和引流文案。各交付物有清楚标题、修订、文件状态。固定制作依据可折叠，不重做一遍编辑表单。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 题库：12 题 · 可试读
- 封面：窗边来信 · 正式文件
- 视频：一段关于回应的对话 · 30 秒
- 文案：温柔提问 · 5 个文案块

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
这是内容审阅预览，不消耗测评次数、不生成私人消费者报告。报告叙事方案与当前兼容报告要分别标注；成套预览不等于采用或发布。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 完整预览有题目与作答过程、兼容报告、叙事方案草稿、传播素材、公开样例与分享文字。
- 此处展示内容预览，不作真实测评或生成消费者私人报告。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“整套预览”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“整套预览”，Page ID：content-preview。所有记录均为合成设计示例。

页面任务：在同一页面检查题库、报告、封面、视频和文案的整体一致性。
对应现有入口：/admin/content/:productId?tab=preview（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“去成套采用”；次操作：“查看固定制作依据”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 整套预览”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“整套预览”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用成套审阅画布：上半部以问题与兼容报告片段建立体验，下半部或右侧展示封面、视频静帧和引流文案。各交付物有清楚标题、修订、文件状态。固定制作依据可折叠，不重做一遍编辑表单。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 题库：12 题 · 可试读
- 封面：窗边来信 · 正式文件
- 视频：一段关于回应的对话 · 30 秒
- 文案：温柔提问 · 5 个文案块

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
这是内容审阅预览，不消耗测评次数、不生成私人消费者报告。报告叙事方案与当前兼容报告要分别标注；成套预览不等于采用或发布。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 完整预览有题目与作答过程、兼容报告、叙事方案草稿、传播素材、公开样例与分享文字。
- 此处展示内容预览，不作真实测评或生成消费者私人报告。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“整套预览”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“整套预览”，Page ID：content-preview。所有记录均为合成设计示例。

页面任务：在同一页面检查题库、报告、封面、视频和文案的整体一致性。
对应现有入口：/admin/content/:productId?tab=preview（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“去成套采用”；次操作：“查看固定制作依据”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 整套预览”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“整套预览”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用成套审阅画布：上半部以问题与兼容报告片段建立体验，下半部或右侧展示封面、视频静帧和引流文案。各交付物有清楚标题、修订、文件状态。固定制作依据可折叠，不重做一遍编辑表单。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 题库版本：v3 · 已审核
- 创作设定：r2 · 温柔理解
- skill 组合：r3 · 五个专业用途
- 题库：12 题 · 可试读
- 封面：窗边来信 · 正式文件
- 视频：一段关于回应的对话 · 30 秒
- 文案：温柔提问 · 5 个文案块

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
这是内容审阅预览，不消耗测评次数、不生成私人消费者报告。报告叙事方案与当前兼容报告要分别标注；成套预览不等于采用或发布。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 完整预览有题目与作答过程、兼容报告、叙事方案草稿、传播素材、公开样例与分享文字。
- 此处展示内容预览，不作真实测评或生成消费者私人报告。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“整套预览”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 12 · 引用与历史

Page ID：`content-references`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引用与历史”，Page ID：content-references。所有记录均为合成设计示例。

页面任务：追溯上下游引用，比较修订，处理更新后的复查。
对应现有入口：/admin/content/:productId?tab=history（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“确认继续使用固定稿”；次操作：“对比修订”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引用与历史”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引用与历史”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用来源→当前稿→下游的有序信息布局，当前稿的固定修订置顶；左侧固定输入列表，中央差异阅读和待复查说明，右侧下游使用。连线若出现必须服务真实依赖，不要装饰性网络图。
需要保留的字段与合成示例：
- 查看稿件：一段关于回应的对话
- 当前修订：r4 · 固定内容
- 影响状态：上游更新 · 待复查
- 对比修订：r3 → r4
- 复查说明：新题干调整了语气，当前视频表达仍与原意一致。
- 制作来源：已核实 MCP 接入

样例数据结构：表头“来源 / 固定修订 / 使用位置 / 引用方式”。
- 题库 · q01 / v3 / r5 / 分镜 02 / 原文
- 题库 · q07 / v3 / r5 / 分镜 03 / 改写
- 引流文案 · hook / r3 / 分镜 01 / 原文
- 引流文案 · cta / r3 / 分镜 04 / 原文
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前存在上游更新待复查。可比较固定旧修订与新修订，并填写继续使用旧稿的理由。历史内容不会自动更新；若输入归档失效，不显示可直接继续采用的绿色成功态。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 上游更新只提示复查，不修改历史内容。
- 差异以题目、分镜、文案块等稳定 ID 对齐；完整摘要放次级详情。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引用与历史”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引用与历史”，Page ID：content-references。所有记录均为合成设计示例。

页面任务：追溯上下游引用，比较修订，处理更新后的复查。
对应现有入口：/admin/content/:productId?tab=history（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“确认继续使用固定稿”；次操作：“对比修订”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引用与历史”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引用与历史”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用来源→当前稿→下游的有序信息布局，当前稿的固定修订置顶；左侧固定输入列表，中央差异阅读和待复查说明，右侧下游使用。连线若出现必须服务真实依赖，不要装饰性网络图。
需要保留的字段与合成示例：
- 查看稿件：一段关于回应的对话
- 当前修订：r4 · 固定内容
- 影响状态：上游更新 · 待复查
- 对比修订：r3 → r4
- 复查说明：新题干调整了语气，当前视频表达仍与原意一致。
- 制作来源：已核实 MCP 接入

样例数据结构：表头“来源 / 固定修订 / 使用位置 / 引用方式”。
- 题库 · q01 / v3 / r5 / 分镜 02 / 原文
- 题库 · q07 / v3 / r5 / 分镜 03 / 改写
- 引流文案 · hook / r3 / 分镜 01 / 原文
- 引流文案 · cta / r3 / 分镜 04 / 原文
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前存在上游更新待复查。可比较固定旧修订与新修订，并填写继续使用旧稿的理由。历史内容不会自动更新；若输入归档失效，不显示可直接继续采用的绿色成功态。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 上游更新只提示复查，不修改历史内容。
- 差异以题目、分镜、文案块等稳定 ID 对齐；完整摘要放次级详情。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引用与历史”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引用与历史”，Page ID：content-references。所有记录均为合成设计示例。

页面任务：追溯上下游引用，比较修订，处理更新后的复查。
对应现有入口：/admin/content/:productId?tab=history（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“确认继续使用固定稿”；次操作：“对比修订”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引用与历史”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引用与历史”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用来源→当前稿→下游的有序信息布局，当前稿的固定修订置顶；左侧固定输入列表，中央差异阅读和待复查说明，右侧下游使用。连线若出现必须服务真实依赖，不要装饰性网络图。
需要保留的字段与合成示例：
- 查看稿件：一段关于回应的对话
- 当前修订：r4 · 固定内容
- 影响状态：上游更新 · 待复查
- 对比修订：r3 → r4
- 复查说明：新题干调整了语气，当前视频表达仍与原意一致。
- 制作来源：已核实 MCP 接入

样例数据结构：表头“来源 / 固定修订 / 使用位置 / 引用方式”。
- 题库 · q01 / v3 / r5 / 分镜 02 / 原文
- 题库 · q07 / v3 / r5 / 分镜 03 / 改写
- 引流文案 · hook / r3 / 分镜 01 / 原文
- 引流文案 · cta / r3 / 分镜 04 / 原文
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前存在上游更新待复查。可比较固定旧修订与新修订，并填写继续使用旧稿的理由。历史内容不会自动更新；若输入归档失效，不显示可直接继续采用的绿色成功态。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 上游更新只提示复查，不修改历史内容。
- 差异以题目、分镜、文案块等稳定 ID 对齐；完整摘要放次级详情。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引用与历史”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引用与历史”，Page ID：content-references。所有记录均为合成设计示例。

页面任务：追溯上下游引用，比较修订，处理更新后的复查。
对应现有入口：/admin/content/:productId?tab=history（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“确认继续使用固定稿”；次操作：“对比修订”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 引用与历史”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“引用与历史”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用来源→当前稿→下游的有序信息布局，当前稿的固定修订置顶；左侧固定输入列表，中央差异阅读和待复查说明，右侧下游使用。连线若出现必须服务真实依赖，不要装饰性网络图。
需要保留的字段与合成示例：
- 查看稿件：一段关于回应的对话
- 当前修订：r4 · 固定内容
- 影响状态：上游更新 · 待复查
- 对比修订：r3 → r4
- 复查说明：新题干调整了语气，当前视频表达仍与原意一致。
- 制作来源：已核实 MCP 接入

样例数据结构：表头“来源 / 固定修订 / 使用位置 / 引用方式”。
- 题库 · q01 / v3 / r5 / 分镜 02 / 原文
- 题库 · q07 / v3 / r5 / 分镜 03 / 改写
- 引流文案 · hook / r3 / 分镜 01 / 原文
- 引流文案 · cta / r3 / 分镜 04 / 原文
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前存在上游更新待复查。可比较固定旧修订与新修订，并填写继续使用旧稿的理由。历史内容不会自动更新；若输入归档失效，不显示可直接继续采用的绿色成功态。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 上游更新只提示复查，不修改历史内容。
- 差异以题目、分镜、文案块等稳定 ID 对齐；完整摘要放次级详情。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引用与历史”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 13 · 成套采用

Page ID：`content-adoption`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“成套采用”，Page ID：content-adoption。所有记录均为合成设计示例。

页面任务：校验一整套内容的一致性，保存不可变的采用包。
对应现有入口：/admin/content/:productId?tab=adoption（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“校验采用组合”；次操作：“查看已采用包”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 成套采用”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“成套采用”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的组合选择与核对工作台：主体列出四类交付物及各固定修订，右侧为校验结果、一致性确认和采用说明；下方保存过的固定包用列表呈现。一个阶段只显示一个主要动作。
需要保留的字段与合成示例：
- 采用包名称：关系中的安全感 · 小红书首发
- 创作设定：r2 · 温柔理解
- 题库版本：v3 · 已审核
- 固定 skill 组合：r3 · 五个专业用途
- 校验结果：尚未校验
- 采用说明：题目、报告及传播内容的语气与承诺一致。

样例数据结构：表头“交付物 / 采用稿件 / 固定修订 / 状态”。
- 题库与报告 / 关系中的安全感 / v3 / r5 / 已审核
- 封面 / 窗边来信 · 竖版 / r4 / 就绪
- 视频 / 一段关于回应的对话 / r4 / 就绪
- 引流文案 / 温柔提问 · 小红书 / r3 / 就绪
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前组合选择已完成、尚未校验，主要按钮为“校验采用组合”。本画面不提前展示通过结果或可用保存按钮；通过校验后才进入一致性确认与保存固定采用包阶段。采用不会发布商品。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 保存需明确勾选一致性核对；采用不会自动发布商品。
- 采用后可查看固定包和导出清单 JSON；历史包持续保留。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“成套采用”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“成套采用”，Page ID：content-adoption。所有记录均为合成设计示例。

页面任务：校验一整套内容的一致性，保存不可变的采用包。
对应现有入口：/admin/content/:productId?tab=adoption（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“校验采用组合”；次操作：“查看已采用包”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 成套采用”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“成套采用”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的组合选择与核对工作台：主体列出四类交付物及各固定修订，右侧为校验结果、一致性确认和采用说明；下方保存过的固定包用列表呈现。一个阶段只显示一个主要动作。
需要保留的字段与合成示例：
- 采用包名称：关系中的安全感 · 小红书首发
- 创作设定：r2 · 温柔理解
- 题库版本：v3 · 已审核
- 固定 skill 组合：r3 · 五个专业用途
- 校验结果：尚未校验
- 采用说明：题目、报告及传播内容的语气与承诺一致。

样例数据结构：表头“交付物 / 采用稿件 / 固定修订 / 状态”。
- 题库与报告 / 关系中的安全感 / v3 / r5 / 已审核
- 封面 / 窗边来信 · 竖版 / r4 / 就绪
- 视频 / 一段关于回应的对话 / r4 / 就绪
- 引流文案 / 温柔提问 · 小红书 / r3 / 就绪
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前组合选择已完成、尚未校验，主要按钮为“校验采用组合”。本画面不提前展示通过结果或可用保存按钮；通过校验后才进入一致性确认与保存固定采用包阶段。采用不会发布商品。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 保存需明确勾选一致性核对；采用不会自动发布商品。
- 采用后可查看固定包和导出清单 JSON；历史包持续保留。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“成套采用”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“成套采用”，Page ID：content-adoption。所有记录均为合成设计示例。

页面任务：校验一整套内容的一致性，保存不可变的采用包。
对应现有入口：/admin/content/:productId?tab=adoption（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“校验采用组合”；次操作：“查看已采用包”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 成套采用”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“成套采用”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的组合选择与核对工作台：主体列出四类交付物及各固定修订，右侧为校验结果、一致性确认和采用说明；下方保存过的固定包用列表呈现。一个阶段只显示一个主要动作。
需要保留的字段与合成示例：
- 采用包名称：关系中的安全感 · 小红书首发
- 创作设定：r2 · 温柔理解
- 题库版本：v3 · 已审核
- 固定 skill 组合：r3 · 五个专业用途
- 校验结果：尚未校验
- 采用说明：题目、报告及传播内容的语气与承诺一致。

样例数据结构：表头“交付物 / 采用稿件 / 固定修订 / 状态”。
- 题库与报告 / 关系中的安全感 / v3 / r5 / 已审核
- 封面 / 窗边来信 · 竖版 / r4 / 就绪
- 视频 / 一段关于回应的对话 / r4 / 就绪
- 引流文案 / 温柔提问 · 小红书 / r3 / 就绪
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前组合选择已完成、尚未校验，主要按钮为“校验采用组合”。本画面不提前展示通过结果或可用保存按钮；通过校验后才进入一致性确认与保存固定采用包阶段。采用不会发布商品。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 保存需明确勾选一致性核对；采用不会自动发布商品。
- 采用后可查看固定包和导出清单 JSON；历史包持续保留。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“成套采用”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“成套采用”，Page ID：content-adoption。所有记录均为合成设计示例。

页面任务：校验一整套内容的一致性，保存不可变的采用包。
对应现有入口：/admin/content/:productId?tab=adoption（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“校验采用组合”；次操作：“查看已采用包”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 成套采用”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“成套采用”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
采用清晰的组合选择与核对工作台：主体列出四类交付物及各固定修订，右侧为校验结果、一致性确认和采用说明；下方保存过的固定包用列表呈现。一个阶段只显示一个主要动作。
需要保留的字段与合成示例：
- 采用包名称：关系中的安全感 · 小红书首发
- 创作设定：r2 · 温柔理解
- 题库版本：v3 · 已审核
- 固定 skill 组合：r3 · 五个专业用途
- 校验结果：尚未校验
- 采用说明：题目、报告及传播内容的语气与承诺一致。

样例数据结构：表头“交付物 / 采用稿件 / 固定修订 / 状态”。
- 题库与报告 / 关系中的安全感 / v3 / r5 / 已审核
- 封面 / 窗边来信 · 竖版 / r4 / 就绪
- 视频 / 一段关于回应的对话 / r4 / 就绪
- 引流文案 / 温柔提问 · 小红书 / r3 / 就绪
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前组合选择已完成、尚未校验，主要按钮为“校验采用组合”。本画面不提前展示通过结果或可用保存按钮；通过校验后才进入一致性确认与保存固定采用包阶段。采用不会发布商品。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 保存需明确勾选一致性核对；采用不会自动发布商品。
- 采用后可查看固定包和导出清单 JSON；历史包持续保留。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“成套采用”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 14 · 文件清理

Page ID：`content-cleanup`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“文件清理”，Page ID：content-cleanup。所有记录均为合成设计示例。

页面任务：先预演，再清理过期且无任何内容引用的文件字节。
对应现有入口：/admin/content/:productId?tab=cleanup（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“生成清理预演”；次操作：“刷新候选文件”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 文件清理”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“文件清理”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是带选择框的候选文件表；右侧显示已选数量、容量、保护规则及清理预演。预演确认阶段使用局部确认区而不是全屏警告；危险执行动作与紫色日常动作区分。
需要保留的字段与合成示例：
- 候选文件：4 份
- 已选文件：2 份
- 本次可清理：3.7 MiB
- 预演状态：尚未生成预演
- 历史引用保护：当前稿、归档稿与采用包均受保护

样例数据结构：表头“文件 / 大小 / 状态 / 上传期限”。
- cover-draft-unused.png / 2.4 MiB / 已过期 / 10-18 15:30
- preview-unused.webp / 1.3 MiB / 已过期 / 10-18 15:35
- upload-interrupted.mp4 / 6.8 MiB / 失败 / 10-17 11:00
- test-cover.png / 0.8 MiB / 已过期 / 10-16 09:30
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为已选2份候选文件、尚未生成预演状态，主要按钮为生成清理预演；执行删除按钮暂不出现。只允许清理上传期限已过且没有任何当前/历史引用的文件字节；元数据与审计保留。预演后的危险执行动作须等待明确确认。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 清理元数据与审计记录保留；文件被任何当前或历史记录引用时不能清理。
- 危险确认按钮与日常保存按钮区分，显示明确数量和容量。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“文件清理”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“文件清理”，Page ID：content-cleanup。所有记录均为合成设计示例。

页面任务：先预演，再清理过期且无任何内容引用的文件字节。
对应现有入口：/admin/content/:productId?tab=cleanup（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“生成清理预演”；次操作：“刷新候选文件”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 文件清理”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“文件清理”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是带选择框的候选文件表；右侧显示已选数量、容量、保护规则及清理预演。预演确认阶段使用局部确认区而不是全屏警告；危险执行动作与紫色日常动作区分。
需要保留的字段与合成示例：
- 候选文件：4 份
- 已选文件：2 份
- 本次可清理：3.7 MiB
- 预演状态：尚未生成预演
- 历史引用保护：当前稿、归档稿与采用包均受保护

样例数据结构：表头“文件 / 大小 / 状态 / 上传期限”。
- cover-draft-unused.png / 2.4 MiB / 已过期 / 10-18 15:30
- preview-unused.webp / 1.3 MiB / 已过期 / 10-18 15:35
- upload-interrupted.mp4 / 6.8 MiB / 失败 / 10-17 11:00
- test-cover.png / 0.8 MiB / 已过期 / 10-16 09:30
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为已选2份候选文件、尚未生成预演状态，主要按钮为生成清理预演；执行删除按钮暂不出现。只允许清理上传期限已过且没有任何当前/历史引用的文件字节；元数据与审计保留。预演后的危险执行动作须等待明确确认。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 清理元数据与审计记录保留；文件被任何当前或历史记录引用时不能清理。
- 危险确认按钮与日常保存按钮区分，显示明确数量和容量。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“文件清理”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“文件清理”，Page ID：content-cleanup。所有记录均为合成设计示例。

页面任务：先预演，再清理过期且无任何内容引用的文件字节。
对应现有入口：/admin/content/:productId?tab=cleanup（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“生成清理预演”；次操作：“刷新候选文件”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 文件清理”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“文件清理”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是带选择框的候选文件表；右侧显示已选数量、容量、保护规则及清理预演。预演确认阶段使用局部确认区而不是全屏警告；危险执行动作与紫色日常动作区分。
需要保留的字段与合成示例：
- 候选文件：4 份
- 已选文件：2 份
- 本次可清理：3.7 MiB
- 预演状态：尚未生成预演
- 历史引用保护：当前稿、归档稿与采用包均受保护

样例数据结构：表头“文件 / 大小 / 状态 / 上传期限”。
- cover-draft-unused.png / 2.4 MiB / 已过期 / 10-18 15:30
- preview-unused.webp / 1.3 MiB / 已过期 / 10-18 15:35
- upload-interrupted.mp4 / 6.8 MiB / 失败 / 10-17 11:00
- test-cover.png / 0.8 MiB / 已过期 / 10-16 09:30
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为已选2份候选文件、尚未生成预演状态，主要按钮为生成清理预演；执行删除按钮暂不出现。只允许清理上传期限已过且没有任何当前/历史引用的文件字节；元数据与审计保留。预演后的危险执行动作须等待明确确认。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 清理元数据与审计记录保留；文件被任何当前或历史记录引用时不能清理。
- 危险确认按钮与日常保存按钮区分，显示明确数量和容量。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“文件清理”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“文件清理”，Page ID：content-cleanup。所有记录均为合成设计示例。

页面任务：先预演，再清理过期且无任何内容引用的文件字节。
对应现有入口：/admin/content/:productId?tab=cleanup（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“生成清理预演”；次操作：“刷新候选文件”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“内容工作台”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 内容工作台 / 文件清理”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
商品内二级导航按顺序保留：创作设定、skill 组合、题库与报告、封面、视频、引流文案、整套预览、引用与历史、成套采用、文件清理。当前选中“文件清理”；十个入口不换成两行大按钮墙。题库版本与创作设定用紧凑上下文栏显示，不占半屏。

本页专属内容与信息结构：
主体是带选择框的候选文件表；右侧显示已选数量、容量、保护规则及清理预演。预演确认阶段使用局部确认区而不是全屏警告；危险执行动作与紫色日常动作区分。
需要保留的字段与合成示例：
- 候选文件：4 份
- 已选文件：2 份
- 本次可清理：3.7 MiB
- 预演状态：尚未生成预演
- 历史引用保护：当前稿、归档稿与采用包均受保护

样例数据结构：表头“文件 / 大小 / 状态 / 上传期限”。
- cover-draft-unused.png / 2.4 MiB / 已过期 / 10-18 15:30
- preview-unused.webp / 1.3 MiB / 已过期 / 10-18 15:35
- upload-interrupted.mp4 / 6.8 MiB / 失败 / 10-17 11:00
- test-cover.png / 0.8 MiB / 已过期 / 10-16 09:30
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为已选2份候选文件、尚未生成预演状态，主要按钮为生成清理预演；执行删除按钮暂不出现。只允许清理上传期限已过且没有任何当前/历史引用的文件字节；元数据与审计保留。预演后的危险执行动作须等待明确确认。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 清理元数据与审计记录保留；文件被任何当前或历史记录引用时不能清理。
- 危险确认按钮与日常保存按钮区分，显示明确数量和容量。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“文件清理”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 15 · 素材与文件

Page ID：`media-list`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材与文件”，Page ID：media-list。所有记录均为合成设计示例。

页面任务：从全局素材清单找到版本、渠道和状态对应的素材。
对应现有入口：/admin/assets（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建素材”；次操作：“筛选素材”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材与文件”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
使用专业素材清单，可在名称列附小缩略图；顶部保持版本、类型、平台和状态筛选。媒体缩略图不能吞掉文字元数据，视频、封面、脚本和文案都有相应符号或预览。
需要保留的字段与合成示例：
- 筛选商品版本：全部版本
- 素材类别：全部类别
- 平台：全部平台
- 素材状态：全部状态

样例数据结构：表头“素材 / 类别 / 平台 / 状态 / 文件”。
- 窗边来信 · 竖版 / 封面 / 小红书 / 就绪 / PNG · 2.8 MiB
- 一段关于回应的对话 / 视频 / 抖音 / 已审核 / MP4 · 18.4 MiB
- 温柔提问 / 文案 / 小红书 / 就绪 / 文本
- 三十秒关系观察 / 脚本 / 抖音 / 草稿 / 文本
- 给自己的一封信 / 封面 / 人工 / 草稿 / WebP · 0.9 MiB
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
素材状态与上传状态是两个维度；封面、视频、脚本、文案都能出现在全局列表。当前筛选全类别，行内操作按状态分配。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全局素材页与商品内容工作台保持同一素材状态词。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材与文件”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材与文件”，Page ID：media-list。所有记录均为合成设计示例。

页面任务：从全局素材清单找到版本、渠道和状态对应的素材。
对应现有入口：/admin/assets（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建素材”；次操作：“筛选素材”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材与文件”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
使用专业素材清单，可在名称列附小缩略图；顶部保持版本、类型、平台和状态筛选。媒体缩略图不能吞掉文字元数据，视频、封面、脚本和文案都有相应符号或预览。
需要保留的字段与合成示例：
- 筛选商品版本：全部版本
- 素材类别：全部类别
- 平台：全部平台
- 素材状态：全部状态

样例数据结构：表头“素材 / 类别 / 平台 / 状态 / 文件”。
- 窗边来信 · 竖版 / 封面 / 小红书 / 就绪 / PNG · 2.8 MiB
- 一段关于回应的对话 / 视频 / 抖音 / 已审核 / MP4 · 18.4 MiB
- 温柔提问 / 文案 / 小红书 / 就绪 / 文本
- 三十秒关系观察 / 脚本 / 抖音 / 草稿 / 文本
- 给自己的一封信 / 封面 / 人工 / 草稿 / WebP · 0.9 MiB
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
素材状态与上传状态是两个维度；封面、视频、脚本、文案都能出现在全局列表。当前筛选全类别，行内操作按状态分配。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全局素材页与商品内容工作台保持同一素材状态词。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材与文件”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材与文件”，Page ID：media-list。所有记录均为合成设计示例。

页面任务：从全局素材清单找到版本、渠道和状态对应的素材。
对应现有入口：/admin/assets（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建素材”；次操作：“筛选素材”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材与文件”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
使用专业素材清单，可在名称列附小缩略图；顶部保持版本、类型、平台和状态筛选。媒体缩略图不能吞掉文字元数据，视频、封面、脚本和文案都有相应符号或预览。
需要保留的字段与合成示例：
- 筛选商品版本：全部版本
- 素材类别：全部类别
- 平台：全部平台
- 素材状态：全部状态

样例数据结构：表头“素材 / 类别 / 平台 / 状态 / 文件”。
- 窗边来信 · 竖版 / 封面 / 小红书 / 就绪 / PNG · 2.8 MiB
- 一段关于回应的对话 / 视频 / 抖音 / 已审核 / MP4 · 18.4 MiB
- 温柔提问 / 文案 / 小红书 / 就绪 / 文本
- 三十秒关系观察 / 脚本 / 抖音 / 草稿 / 文本
- 给自己的一封信 / 封面 / 人工 / 草稿 / WebP · 0.9 MiB
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
素材状态与上传状态是两个维度；封面、视频、脚本、文案都能出现在全局列表。当前筛选全类别，行内操作按状态分配。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全局素材页与商品内容工作台保持同一素材状态词。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材与文件”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材与文件”，Page ID：media-list。所有记录均为合成设计示例。

页面任务：从全局素材清单找到版本、渠道和状态对应的素材。
对应现有入口：/admin/assets（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建素材”；次操作：“筛选素材”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材与文件”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
使用专业素材清单，可在名称列附小缩略图；顶部保持版本、类型、平台和状态筛选。媒体缩略图不能吞掉文字元数据，视频、封面、脚本和文案都有相应符号或预览。
需要保留的字段与合成示例：
- 筛选商品版本：全部版本
- 素材类别：全部类别
- 平台：全部平台
- 素材状态：全部状态

样例数据结构：表头“素材 / 类别 / 平台 / 状态 / 文件”。
- 窗边来信 · 竖版 / 封面 / 小红书 / 就绪 / PNG · 2.8 MiB
- 一段关于回应的对话 / 视频 / 抖音 / 已审核 / MP4 · 18.4 MiB
- 温柔提问 / 文案 / 小红书 / 就绪 / 文本
- 三十秒关系观察 / 脚本 / 抖音 / 草稿 / 文本
- 给自己的一封信 / 封面 / 人工 / 草稿 / WebP · 0.9 MiB
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
素材状态与上传状态是两个维度；封面、视频、脚本、文案都能出现在全局列表。当前筛选全类别，行内操作按状态分配。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全局素材页与商品内容工作台保持同一素材状态词。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材与文件”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 16 · 素材详情

Page ID：`media-detail`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材详情”，Page ID：media-detail。所有记录均为合成设计示例。

页面任务：检查文件、修改素材资料并完成审核、就绪和归档。
对应现有入口：/admin/assets（选中素材）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存素材修改”；次操作：“上传并校验”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材详情”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域展示已保存封面或视频预览，窄侧栏是商品版本、类别、平台、变体名与素材状态。文件上传校验放明确独立区域，待保存新文件和已保存预览不同标记；底部是审核、就绪等状态动作。
需要保留的字段与合成示例：
- 商品版本：关系中的安全感 · v3
- 素材类别：封面
- 平台：小红书
- 变体名：窗边来信 · 竖版
- 文件：relationship-cover-final.png
- 文件状态：已校验，可关联素材
- 素材状态：已审核
- 当前修订：r4

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前素材已审核，可标记就绪；修改资料会回到需要重新审核的流程。封面只有就绪且属于当前在售版本时才能采用为商品封面，勿提前显示可点击采用。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 审核 → 就绪 → 归档应按状态开放动作；封面就绪且属当前在售版本时才可采用为商品封面。
- 新文件尚未校验时不能保存，预览需清楚区分待保存文件与已保存文件。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材详情”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材详情”，Page ID：media-detail。所有记录均为合成设计示例。

页面任务：检查文件、修改素材资料并完成审核、就绪和归档。
对应现有入口：/admin/assets（选中素材）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存素材修改”；次操作：“上传并校验”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材详情”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域展示已保存封面或视频预览，窄侧栏是商品版本、类别、平台、变体名与素材状态。文件上传校验放明确独立区域，待保存新文件和已保存预览不同标记；底部是审核、就绪等状态动作。
需要保留的字段与合成示例：
- 商品版本：关系中的安全感 · v3
- 素材类别：封面
- 平台：小红书
- 变体名：窗边来信 · 竖版
- 文件：relationship-cover-final.png
- 文件状态：已校验，可关联素材
- 素材状态：已审核
- 当前修订：r4

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前素材已审核，可标记就绪；修改资料会回到需要重新审核的流程。封面只有就绪且属于当前在售版本时才能采用为商品封面，勿提前显示可点击采用。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 审核 → 就绪 → 归档应按状态开放动作；封面就绪且属当前在售版本时才可采用为商品封面。
- 新文件尚未校验时不能保存，预览需清楚区分待保存文件与已保存文件。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材详情”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材详情”，Page ID：media-detail。所有记录均为合成设计示例。

页面任务：检查文件、修改素材资料并完成审核、就绪和归档。
对应现有入口：/admin/assets（选中素材）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存素材修改”；次操作：“上传并校验”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材详情”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域展示已保存封面或视频预览，窄侧栏是商品版本、类别、平台、变体名与素材状态。文件上传校验放明确独立区域，待保存新文件和已保存预览不同标记；底部是审核、就绪等状态动作。
需要保留的字段与合成示例：
- 商品版本：关系中的安全感 · v3
- 素材类别：封面
- 平台：小红书
- 变体名：窗边来信 · 竖版
- 文件：relationship-cover-final.png
- 文件状态：已校验，可关联素材
- 素材状态：已审核
- 当前修订：r4

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前素材已审核，可标记就绪；修改资料会回到需要重新审核的流程。封面只有就绪且属于当前在售版本时才能采用为商品封面，勿提前显示可点击采用。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 审核 → 就绪 → 归档应按状态开放动作；封面就绪且属当前在售版本时才可采用为商品封面。
- 新文件尚未校验时不能保存，预览需清楚区分待保存文件与已保存文件。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材详情”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“素材详情”，Page ID：media-detail。所有记录均为合成设计示例。

页面任务：检查文件、修改素材资料并完成审核、就绪和归档。
对应现有入口：/admin/assets（选中素材）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存素材修改”；次操作：“上传并校验”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“素材与文件”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 素材与文件 / 素材详情”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域展示已保存封面或视频预览，窄侧栏是商品版本、类别、平台、变体名与素材状态。文件上传校验放明确独立区域，待保存新文件和已保存预览不同标记；底部是审核、就绪等状态动作。
需要保留的字段与合成示例：
- 商品版本：关系中的安全感 · v3
- 素材类别：封面
- 平台：小红书
- 变体名：窗边来信 · 竖版
- 文件：relationship-cover-final.png
- 文件状态：已校验，可关联素材
- 素材状态：已审核
- 当前修订：r4

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前素材已审核，可标记就绪；修改资料会回到需要重新审核的流程。封面只有就绪且属于当前在售版本时才能采用为商品封面，勿提前显示可点击采用。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 审核 → 就绪 → 归档应按状态开放动作；封面就绪且属当前在售版本时才可采用为商品封面。
- 新文件尚未校验时不能保存，预览需清楚区分待保存文件与已保存文件。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“素材详情”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 17 · 题库与报告 skill 库

Page ID：`skills-assessment`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告 skill 库”，Page ID：skills-assessment。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 题库与报告 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“题库与报告”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是题库与报告领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅题库与报告选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：题目与规则设计 / 报告写作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 关系观察设计 / 温柔 / 克制 / web · cards / v3 / 已启用
- 题库与报告 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 题库与报告 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 题库与报告 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为题库与报告库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告 skill 库”，Page ID：skills-assessment。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 题库与报告 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“题库与报告”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是题库与报告领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅题库与报告选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：题目与规则设计 / 报告写作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 关系观察设计 / 温柔 / 克制 / web · cards / v3 / 已启用
- 题库与报告 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 题库与报告 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 题库与报告 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为题库与报告库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告 skill 库”，Page ID：skills-assessment。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 题库与报告 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“题库与报告”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是题库与报告领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅题库与报告选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：题目与规则设计 / 报告写作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 关系观察设计 / 温柔 / 克制 / web · cards / v3 / 已启用
- 题库与报告 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 题库与报告 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 题库与报告 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为题库与报告库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“题库与报告 skill 库”，Page ID：skills-assessment。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/assessment（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 题库与报告 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“题库与报告”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是题库与报告领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅题库与报告选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：题目与规则设计 / 报告写作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 关系观察设计 / 温柔 / 克制 / web · cards / v3 / 已启用
- 题库与报告 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 题库与报告 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 题库与报告 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为题库与报告库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“题库与报告 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 18 · 温柔探索 · 题目与报告

Page ID：`skill-assessment-editor`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“温柔探索 · 题目与报告”，Page ID：skill-assessment-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/assessment?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 温柔探索 · 题目与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是题库与报告领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：温柔探索 · 题目与报告
- 说明：通过具体生活场景，引导理解自己的回应与表达习惯。
- 专业用途：题目与规则设计 / 报告写作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“温柔探索 · 题目与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“温柔探索 · 题目与报告”，Page ID：skill-assessment-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/assessment?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 温柔探索 · 题目与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是题库与报告领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：温柔探索 · 题目与报告
- 说明：通过具体生活场景，引导理解自己的回应与表达习惯。
- 专业用途：题目与规则设计 / 报告写作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“温柔探索 · 题目与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“温柔探索 · 题目与报告”，Page ID：skill-assessment-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/assessment?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 温柔探索 · 题目与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是题库与报告领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：温柔探索 · 题目与报告
- 说明：通过具体生活场景，引导理解自己的回应与表达习惯。
- 专业用途：题目与规则设计 / 报告写作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“温柔探索 · 题目与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“温柔探索 · 题目与报告”，Page ID：skill-assessment-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/assessment?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 温柔探索 · 题目与报告”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是题库与报告领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：温柔探索 · 题目与报告
- 说明：通过具体生活场景，引导理解自己的回应与表达习惯。
- 专业用途：题目与规则设计 / 报告写作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“温柔探索 · 题目与报告”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 19 · 封面 skill 库

Page ID：`skills-cover`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面 skill 库”，Page ID：skills-cover。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 封面 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“封面”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是封面领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅封面选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：封面制作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 纸感留白封面 / 温柔 / 克制 / web · cards / v3 / 已启用
- 封面 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 封面 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 封面 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为封面库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面 skill 库”，Page ID：skills-cover。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 封面 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“封面”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是封面领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅封面选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：封面制作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 纸感留白封面 / 温柔 / 克制 / web · cards / v3 / 已启用
- 封面 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 封面 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 封面 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为封面库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面 skill 库”，Page ID：skills-cover。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 封面 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“封面”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是封面领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅封面选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：封面制作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 纸感留白封面 / 温柔 / 克制 / web · cards / v3 / 已启用
- 封面 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 封面 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 封面 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为封面库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“封面 skill 库”，Page ID：skills-cover。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/cover（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 封面 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“封面”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是封面领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅封面选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：封面制作
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 纸感留白封面 / 温柔 / 克制 / web · cards / v3 / 已启用
- 封面 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 封面 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 封面 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为封面库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“封面 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 20 · 留白书页 · 封面设计

Page ID：`skill-cover-editor`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“留白书页 · 封面设计”，Page ID：skill-cover-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/cover?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 留白书页 · 封面设计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是封面领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：留白书页 · 封面设计
- 说明：以纸白、灰紫与留白建立安静、清晰的传播封面。
- 专业用途：封面制作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“留白书页 · 封面设计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“留白书页 · 封面设计”，Page ID：skill-cover-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/cover?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 留白书页 · 封面设计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是封面领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：留白书页 · 封面设计
- 说明：以纸白、灰紫与留白建立安静、清晰的传播封面。
- 专业用途：封面制作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“留白书页 · 封面设计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“留白书页 · 封面设计”，Page ID：skill-cover-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/cover?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 留白书页 · 封面设计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是封面领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：留白书页 · 封面设计
- 说明：以纸白、灰紫与留白建立安静、清晰的传播封面。
- 专业用途：封面制作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“留白书页 · 封面设计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“留白书页 · 封面设计”，Page ID：skill-cover-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/cover?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 留白书页 · 封面设计”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是封面领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：留白书页 · 封面设计
- 说明：以纸白、灰紫与留白建立安静、清晰的传播封面。
- 专业用途：封面制作
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“留白书页 · 封面设计”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 21 · 视频 skill 库

Page ID：`skills-video`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频 skill 库”，Page ID：skills-video。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 视频 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“视频”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是视频领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅视频选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：视频与分镜
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 日常片段叙事 / 温柔 / 克制 / web · cards / v3 / 已启用
- 视频 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 视频 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 视频 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为视频库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频 skill 库”，Page ID：skills-video。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 视频 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“视频”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是视频领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅视频选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：视频与分镜
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 日常片段叙事 / 温柔 / 克制 / web · cards / v3 / 已启用
- 视频 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 视频 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 视频 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为视频库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频 skill 库”，Page ID：skills-video。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 视频 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“视频”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是视频领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅视频选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：视频与分镜
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 日常片段叙事 / 温柔 / 克制 / web · cards / v3 / 已启用
- 视频 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 视频 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 视频 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为视频库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“视频 skill 库”，Page ID：skills-video。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/video（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 视频 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“视频”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是视频领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅视频选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：视频与分镜
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 日常片段叙事 / 温柔 / 克制 / web · cards / v3 / 已启用
- 视频 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 视频 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 视频 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为视频库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“视频 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 22 · 慢叙事 · 关系短片

Page ID：`skill-video-editor`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“慢叙事 · 关系短片”，Page ID：skill-video-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/video?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 慢叙事 · 关系短片”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是视频领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：慢叙事 · 关系短片
- 说明：以日常画面串联问题、情绪线索与温柔行动引导。
- 专业用途：视频与分镜
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“慢叙事 · 关系短片”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“慢叙事 · 关系短片”，Page ID：skill-video-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/video?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 慢叙事 · 关系短片”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是视频领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：慢叙事 · 关系短片
- 说明：以日常画面串联问题、情绪线索与温柔行动引导。
- 专业用途：视频与分镜
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“慢叙事 · 关系短片”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“慢叙事 · 关系短片”，Page ID：skill-video-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/video?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 慢叙事 · 关系短片”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是视频领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：慢叙事 · 关系短片
- 说明：以日常画面串联问题、情绪线索与温柔行动引导。
- 专业用途：视频与分镜
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“慢叙事 · 关系短片”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“慢叙事 · 关系短片”，Page ID：skill-video-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/video?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 慢叙事 · 关系短片”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是视频领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：慢叙事 · 关系短片
- 说明：以日常画面串联问题、情绪线索与温柔行动引导。
- 专业用途：视频与分镜
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“慢叙事 · 关系短片”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 23 · 引流文案 skill 库

Page ID：`skills-copy`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案 skill 库”，Page ID：skills-copy。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 引流文案 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“引流文案”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是引流文案领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅引流文案选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：传播文案
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 温柔提问文案 / 温柔 / 克制 / web · cards / v3 / 已启用
- 引流文案 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 引流文案 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 引流文案 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为引流文案库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案 skill 库”，Page ID：skills-copy。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 引流文案 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“引流文案”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是引流文案领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅引流文案选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：传播文案
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 温柔提问文案 / 温柔 / 克制 / web · cards / v3 / 已启用
- 引流文案 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 引流文案 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 引流文案 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为引流文案库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案 skill 库”，Page ID：skills-copy。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 引流文案 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“引流文案”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是引流文案领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅引流文案选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：传播文案
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 温柔提问文案 / 温柔 / 克制 / web · cards / v3 / 已启用
- 引流文案 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 引流文案 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 引流文案 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为引流文案库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“引流文案 skill 库”，Page ID：skills-copy。所有记录均为合成设计示例。

页面任务：浏览本领域可复用的方法、风格和固定版本。
对应现有入口：/admin/skills/copy（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“新建 skill”；次操作：“查询 skill”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 引流文案 skill 库”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 四领域切换为“题库与报告 / 封面 / 视频 / 引流文案”，当前选中“引流文案”。 本页内部功能分区：题库与报告 / 封面 / 视频 / 引流文案。

本页专属内容与信息结构：
这是引流文案领域的库列表，不是选中skill详情。顶端有四领域切换，当前仅引流文案选中；紧凑搜索与用途/形式/状态筛选后呈现四个skill列表行。每行显示名称、说明、用途、风格、形式、最新版本和状态；新建skill是唯一主要按钮。不要把完整Markdown正文放进列表。
需要保留的字段与合成示例：
- 搜索 skill：名称 / 说明
- 风格标签：全部风格
- 专业用途：传播文案
- 支持形式：全部形式
- 版本状态：全部状态

样例数据结构：表头“skill / 风格 / 支持形式 / 最新版本 / 状态”。
- 温柔提问文案 / 温柔 / 克制 / web · cards / v3 / 已启用
- 引流文案 · 日记风 / 私密 / 自然 / web / v2 / 已启用
- 引流文案 · 探索感 / 轻盈 / 好奇 / cards / v1 / 草稿
- 引流文案 · 空间叙事 / 沉浸 / 缓慢 / 2.5d · 方案 / v1 / 已审核
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为引流文案库列表，包括启用、审核、草稿状态；只展现本领域内容。“题库与报告”包含题目设计/报告写作两个用途，其余领域各有相应单用途。新建和打开是本页操作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 只管理方法和资料；不添加“AI 生成”功能按钮。
- 去除当前源码中“商品绑定与 MCP 待后续”这一过期提示。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“引流文案 skill 库”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 24 · 真诚邀请 · 社交文案

Page ID：`skill-copy-editor`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“真诚邀请 · 社交文案”，Page ID：skill-copy-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/copy?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 真诚邀请 · 社交文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是引流文案领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：真诚邀请 · 社交文案
- 说明：使用可回应的问题，呈现具体理解，避免夸大承诺。
- 专业用途：传播文案
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“真诚邀请 · 社交文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“真诚邀请 · 社交文案”，Page ID：skill-copy-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/copy?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 真诚邀请 · 社交文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是引流文案领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：真诚邀请 · 社交文案
- 说明：使用可回应的问题，呈现具体理解，避免夸大承诺。
- 专业用途：传播文案
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“真诚邀请 · 社交文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“真诚邀请 · 社交文案”，Page ID：skill-copy-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/copy?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 真诚邀请 · 社交文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是引流文案领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：真诚邀请 · 社交文案
- 说明：使用可回应的问题，呈现具体理解，避免夸大承诺。
- 专业用途：传播文案
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“真诚邀请 · 社交文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“真诚邀请 · 社交文案”，Page ID：skill-copy-editor。所有记录均为合成设计示例。

页面任务：编辑方法正文、输入输出规范和固定参考资料，并管理版本。
对应现有入口：/admin/skills/copy?skill=:skillId&version=:versionId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“保存 skill 草稿”；次操作：“另存为新草稿”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“skill 库”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / skill 库 / 真诚邀请 · 社交文案”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。
 本页内部功能分区：正文与规范 / 参考资料 / 版本历史。

本页专属内容与信息结构：
这是引流文案领域的单个skill草稿编辑器。顶部面包屑返回该库，名称与v4草稿状态清晰。主要工作区是Markdown正文和输入输出规范；窄侧栏放用途、形式、风格及版本；参考资料为清晰文件行。正文与规范/参考资料/版本历史三个分区可切换，当前正文。允许保存草稿；不要显示固定只读版提示。
需要保留的字段与合成示例：
- 名称：真诚邀请 · 社交文案
- 说明：使用可回应的问题，呈现具体理解，避免夸大承诺。
- 专业用途：传播文案
- 风格标签：温柔、克制、具体
- 支持形式：web、cards
- 当前版本：v4 · 草稿
- 输入规范：固定创作设定、当前领域资料、显式引用
- 输出规范：结构化内容与固定来源清单

样例数据结构：表头“参考资料 / 类型 / 大小 / 版本”。
- voice-guide.md / Markdown / 12 KiB / 固定
- reference-board.webp / 图片 / 280 KiB / 固定
- worked-example.json / JSON / 18 KiB / 固定
- review-checklist.md / Markdown / 8 KiB / 固定
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为v4草稿，允许编辑和保存。历史v3已启用只读，切换历史版时主要动作应变为复制为新版本。此画面不同时显示“只读固定版”与可编辑保存。参考资料固定到版本；启用/归档等生命周期动作收进清楚的次级菜单。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- SKILL.md 正文：尊重使用者，以具体的理解、表达与沟通线索提供情绪价值。避免确定性诊断、贴标签或夸大传播承诺。
- 草稿可编辑；审核/启用/归档保留独立动作；历史版本只读并可对比。
- JSON、Markdown 导入和清单导出放在次级工具区；稳定标识、hash、文件 ID 进入详情。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“真诚邀请 · 社交文案”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 25 · MCP 连接

Page ID：`machine-list`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“MCP 连接”，Page ID：machine-list。所有记录均为合成设计示例。

页面任务：检查四个制作任务的连接、权限范围和调用情况。
对应现有入口：/admin/machine（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“创建连接”；次操作：“刷新连接”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域以紧凑连接表展示四个制作领域与一个已撤销样例，列包含名称、领域、授权数量、到期、状态；右侧只留必要说明或选中连接摘要。创建按钮在页首，调用记录是逐行入口。
需要保留的字段与合成示例：
- 内容领域：四个独立领域
- 当前环境：本地接入
- 可执行操作：读取、校验、上传、保存草稿
- 内容审核：进入工作台人工审核采用

样例数据结构：表头“连接 / 领域 / 商品 / skill / 有效期 / 状态”。
- 每日题库制作 / 题库与报告 / 2 / 2 / 11-19 / 有效
- 每日封面制作 / 封面 / 2 / 1 / 11-19 / 有效
- 每日视频制作 / 视频 / 2 / 1 / 11-19 / 有效
- 每日文案制作 / 引流文案 / 2 / 1 / 11-19 / 有效
- 封面联调 · 旧连接 / 封面 / 1 / 1 / 10-18 / 已撤销
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
全部连接为合成样例，显示有效与已撤销两种状态。真实能力是本地授权内容/skill/上下文读取、引用校验、上传和保存草稿；不含远程云接入、自动发布或订单资金权限。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部连接与状态均为设计示例；没有调用真实凭据。
- 每个凭据只授权一个领域；不能发布商品或处理订单。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“MCP 连接”，Page ID：machine-list。所有记录均为合成设计示例。

页面任务：检查四个制作任务的连接、权限范围和调用情况。
对应现有入口：/admin/machine（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“创建连接”；次操作：“刷新连接”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域以紧凑连接表展示四个制作领域与一个已撤销样例，列包含名称、领域、授权数量、到期、状态；右侧只留必要说明或选中连接摘要。创建按钮在页首，调用记录是逐行入口。
需要保留的字段与合成示例：
- 内容领域：四个独立领域
- 当前环境：本地接入
- 可执行操作：读取、校验、上传、保存草稿
- 内容审核：进入工作台人工审核采用

样例数据结构：表头“连接 / 领域 / 商品 / skill / 有效期 / 状态”。
- 每日题库制作 / 题库与报告 / 2 / 2 / 11-19 / 有效
- 每日封面制作 / 封面 / 2 / 1 / 11-19 / 有效
- 每日视频制作 / 视频 / 2 / 1 / 11-19 / 有效
- 每日文案制作 / 引流文案 / 2 / 1 / 11-19 / 有效
- 封面联调 · 旧连接 / 封面 / 1 / 1 / 10-18 / 已撤销
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
全部连接为合成样例，显示有效与已撤销两种状态。真实能力是本地授权内容/skill/上下文读取、引用校验、上传和保存草稿；不含远程云接入、自动发布或订单资金权限。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部连接与状态均为设计示例；没有调用真实凭据。
- 每个凭据只授权一个领域；不能发布商品或处理订单。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“MCP 连接”，Page ID：machine-list。所有记录均为合成设计示例。

页面任务：检查四个制作任务的连接、权限范围和调用情况。
对应现有入口：/admin/machine（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“创建连接”；次操作：“刷新连接”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域以紧凑连接表展示四个制作领域与一个已撤销样例，列包含名称、领域、授权数量、到期、状态；右侧只留必要说明或选中连接摘要。创建按钮在页首，调用记录是逐行入口。
需要保留的字段与合成示例：
- 内容领域：四个独立领域
- 当前环境：本地接入
- 可执行操作：读取、校验、上传、保存草稿
- 内容审核：进入工作台人工审核采用

样例数据结构：表头“连接 / 领域 / 商品 / skill / 有效期 / 状态”。
- 每日题库制作 / 题库与报告 / 2 / 2 / 11-19 / 有效
- 每日封面制作 / 封面 / 2 / 1 / 11-19 / 有效
- 每日视频制作 / 视频 / 2 / 1 / 11-19 / 有效
- 每日文案制作 / 引流文案 / 2 / 1 / 11-19 / 有效
- 封面联调 · 旧连接 / 封面 / 1 / 1 / 10-18 / 已撤销
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
全部连接为合成样例，显示有效与已撤销两种状态。真实能力是本地授权内容/skill/上下文读取、引用校验、上传和保存草稿；不含远程云接入、自动发布或订单资金权限。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部连接与状态均为设计示例；没有调用真实凭据。
- 每个凭据只授权一个领域；不能发布商品或处理订单。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“MCP 连接”，Page ID：machine-list。所有记录均为合成设计示例。

页面任务：检查四个制作任务的连接、权限范围和调用情况。
对应现有入口：/admin/machine（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“创建连接”；次操作：“刷新连接”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主区域以紧凑连接表展示四个制作领域与一个已撤销样例，列包含名称、领域、授权数量、到期、状态；右侧只留必要说明或选中连接摘要。创建按钮在页首，调用记录是逐行入口。
需要保留的字段与合成示例：
- 内容领域：四个独立领域
- 当前环境：本地接入
- 可执行操作：读取、校验、上传、保存草稿
- 内容审核：进入工作台人工审核采用

样例数据结构：表头“连接 / 领域 / 商品 / skill / 有效期 / 状态”。
- 每日题库制作 / 题库与报告 / 2 / 2 / 11-19 / 有效
- 每日封面制作 / 封面 / 2 / 1 / 11-19 / 有效
- 每日视频制作 / 视频 / 2 / 1 / 11-19 / 有效
- 每日文案制作 / 引流文案 / 2 / 1 / 11-19 / 有效
- 封面联调 · 旧连接 / 封面 / 1 / 1 / 10-18 / 已撤销
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
全部连接为合成样例，显示有效与已撤销两种状态。真实能力是本地授权内容/skill/上下文读取、引用校验、上传和保存草稿；不含远程云接入、自动发布或订单资金权限。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 全部连接与状态均为设计示例；没有调用真实凭据。
- 每个凭据只授权一个领域；不能发布商品或处理订单。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 26 · 创建 MCP 连接

Page ID：`machine-new`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创建 MCP 连接”，Page ID：machine-new。所有记录均为合成设计示例。

页面任务：明确连接的领域、权限、商品与 skill 范围后签发凭据。
对应现有入口：/admin/machine（创建状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“签发连接凭据”；次操作：“返回连接列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 创建 MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用有条理的授权表单：顶部名称、领域和有效期，中部操作权限复选，底部商品与skill两个并列的可搜索选择器。右侧固定授权摘要；主操作只有签发。一次性凭据成功状态如要补示，只用掩码。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 内容领域：封面
- 有效期：30 天
- 允许的操作：读取内容、保存草稿、读取 skill、读取上下文
- 授权商品：关系中的安全感、看见自己的节奏
- 授权 skill：纸感留白封面
- 数据范围：正式范围 · 设计示例
- 新对象范围：新商品和新 skill 需重新签发授权

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前尚未签发，已选择一个领域、权限和显式对象范围。新增商品/skill不会自动获得授权。成功态凭据只一次显示，设计中只能用掩码，绝不能出现真实token或无意可用的完整示例密钥。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 凭据只在签发响应显示一次；设计稿一律画为掩码，不使用真实 token。
- 一次性凭据状态包含复制与“已保存，隐藏凭据”。
- 撤销为不可恢复操作，应在连接详情使用局部确认。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创建 MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创建 MCP 连接”，Page ID：machine-new。所有记录均为合成设计示例。

页面任务：明确连接的领域、权限、商品与 skill 范围后签发凭据。
对应现有入口：/admin/machine（创建状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“签发连接凭据”；次操作：“返回连接列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 创建 MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用有条理的授权表单：顶部名称、领域和有效期，中部操作权限复选，底部商品与skill两个并列的可搜索选择器。右侧固定授权摘要；主操作只有签发。一次性凭据成功状态如要补示，只用掩码。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 内容领域：封面
- 有效期：30 天
- 允许的操作：读取内容、保存草稿、读取 skill、读取上下文
- 授权商品：关系中的安全感、看见自己的节奏
- 授权 skill：纸感留白封面
- 数据范围：正式范围 · 设计示例
- 新对象范围：新商品和新 skill 需重新签发授权

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前尚未签发，已选择一个领域、权限和显式对象范围。新增商品/skill不会自动获得授权。成功态凭据只一次显示，设计中只能用掩码，绝不能出现真实token或无意可用的完整示例密钥。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 凭据只在签发响应显示一次；设计稿一律画为掩码，不使用真实 token。
- 一次性凭据状态包含复制与“已保存，隐藏凭据”。
- 撤销为不可恢复操作，应在连接详情使用局部确认。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创建 MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创建 MCP 连接”，Page ID：machine-new。所有记录均为合成设计示例。

页面任务：明确连接的领域、权限、商品与 skill 范围后签发凭据。
对应现有入口：/admin/machine（创建状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“签发连接凭据”；次操作：“返回连接列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 创建 MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用有条理的授权表单：顶部名称、领域和有效期，中部操作权限复选，底部商品与skill两个并列的可搜索选择器。右侧固定授权摘要；主操作只有签发。一次性凭据成功状态如要补示，只用掩码。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 内容领域：封面
- 有效期：30 天
- 允许的操作：读取内容、保存草稿、读取 skill、读取上下文
- 授权商品：关系中的安全感、看见自己的节奏
- 授权 skill：纸感留白封面
- 数据范围：正式范围 · 设计示例
- 新对象范围：新商品和新 skill 需重新签发授权

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前尚未签发，已选择一个领域、权限和显式对象范围。新增商品/skill不会自动获得授权。成功态凭据只一次显示，设计中只能用掩码，绝不能出现真实token或无意可用的完整示例密钥。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 凭据只在签发响应显示一次；设计稿一律画为掩码，不使用真实 token。
- 一次性凭据状态包含复制与“已保存，隐藏凭据”。
- 撤销为不可恢复操作，应在连接详情使用局部确认。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创建 MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“创建 MCP 连接”，Page ID：machine-new。所有记录均为合成设计示例。

页面任务：明确连接的领域、权限、商品与 skill 范围后签发凭据。
对应现有入口：/admin/machine（创建状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“签发连接凭据”；次操作：“返回连接列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 创建 MCP 连接”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用有条理的授权表单：顶部名称、领域和有效期，中部操作权限复选，底部商品与skill两个并列的可搜索选择器。右侧固定授权摘要；主操作只有签发。一次性凭据成功状态如要补示，只用掩码。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 内容领域：封面
- 有效期：30 天
- 允许的操作：读取内容、保存草稿、读取 skill、读取上下文
- 授权商品：关系中的安全感、看见自己的节奏
- 授权 skill：纸感留白封面
- 数据范围：正式范围 · 设计示例
- 新对象范围：新商品和新 skill 需重新签发授权

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前尚未签发，已选择一个领域、权限和显式对象范围。新增商品/skill不会自动获得授权。成功态凭据只一次显示，设计中只能用掩码，绝不能出现真实token或无意可用的完整示例密钥。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 凭据只在签发响应显示一次；设计稿一律画为掩码，不使用真实 token。
- 一次性凭据状态包含复制与“已保存，隐藏凭据”。
- 撤销为不可恢复操作，应在连接详情使用局部确认。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“创建 MCP 连接”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 27 · 连接调用记录

Page ID：`machine-calls`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“连接调用记录”，Page ID：machine-calls。所有记录均为合成设计示例。

页面任务：定位授权制作任务的调用结果与错误，保持业务正文保密。
对应现有入口：/admin/machine（选中连接）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“刷新调用记录”；次操作：“查看授权范围”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 连接调用记录”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
顶部紧凑显示连接、领域、状态、授权范围；其下直接进入调用记录表。结果用清楚文字和极小状态点，不用大状态卡。请求/对象采用可读截断与展开，日志列对齐。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 领域：封面
- 连接状态：有效
- 授权范围：2 个商品 · 1 个 skill
- 筛选内容：最近调用记录
- 日志内容：操作、结果、对象、请求标识

样例数据结构：表头“时间 / 操作 / 结果 / 对象 / 请求”。
- 10:42:16 / cover_draft_save / 成功 / 封面草稿 · request-demo-06
- 10:42:14 / upload_complete / 成功 / 正式文件 · request-demo-05
- 10:42:12 / upload_file / 成功 / 正式文件 · request-demo-04
- 10:42:10 / upload_prepare / 成功 / 正式文件 · request-demo-03
- 10:41:58 / context_bundle_get / 成功 / 共同设定 r2 · request-demo-02
- 10:41:52 / cover_skill_version_get / 成功 / 纸感留白封面 v3 · request-demo-01
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前选中一个有效连接，只展示已记录调用。日志包含时间、操作、成功/拒绝/失败及对象或错误，不包含业务正文、token、票据或本地路径。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 不记录或展示 token、上传票据、文件本地路径或业务正文。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“连接调用记录”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“连接调用记录”，Page ID：machine-calls。所有记录均为合成设计示例。

页面任务：定位授权制作任务的调用结果与错误，保持业务正文保密。
对应现有入口：/admin/machine（选中连接）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“刷新调用记录”；次操作：“查看授权范围”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 连接调用记录”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
顶部紧凑显示连接、领域、状态、授权范围；其下直接进入调用记录表。结果用清楚文字和极小状态点，不用大状态卡。请求/对象采用可读截断与展开，日志列对齐。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 领域：封面
- 连接状态：有效
- 授权范围：2 个商品 · 1 个 skill
- 筛选内容：最近调用记录
- 日志内容：操作、结果、对象、请求标识

样例数据结构：表头“时间 / 操作 / 结果 / 对象 / 请求”。
- 10:42:16 / cover_draft_save / 成功 / 封面草稿 · request-demo-06
- 10:42:14 / upload_complete / 成功 / 正式文件 · request-demo-05
- 10:42:12 / upload_file / 成功 / 正式文件 · request-demo-04
- 10:42:10 / upload_prepare / 成功 / 正式文件 · request-demo-03
- 10:41:58 / context_bundle_get / 成功 / 共同设定 r2 · request-demo-02
- 10:41:52 / cover_skill_version_get / 成功 / 纸感留白封面 v3 · request-demo-01
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前选中一个有效连接，只展示已记录调用。日志包含时间、操作、成功/拒绝/失败及对象或错误，不包含业务正文、token、票据或本地路径。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 不记录或展示 token、上传票据、文件本地路径或业务正文。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“连接调用记录”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“连接调用记录”，Page ID：machine-calls。所有记录均为合成设计示例。

页面任务：定位授权制作任务的调用结果与错误，保持业务正文保密。
对应现有入口：/admin/machine（选中连接）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“刷新调用记录”；次操作：“查看授权范围”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 连接调用记录”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
顶部紧凑显示连接、领域、状态、授权范围；其下直接进入调用记录表。结果用清楚文字和极小状态点，不用大状态卡。请求/对象采用可读截断与展开，日志列对齐。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 领域：封面
- 连接状态：有效
- 授权范围：2 个商品 · 1 个 skill
- 筛选内容：最近调用记录
- 日志内容：操作、结果、对象、请求标识

样例数据结构：表头“时间 / 操作 / 结果 / 对象 / 请求”。
- 10:42:16 / cover_draft_save / 成功 / 封面草稿 · request-demo-06
- 10:42:14 / upload_complete / 成功 / 正式文件 · request-demo-05
- 10:42:12 / upload_file / 成功 / 正式文件 · request-demo-04
- 10:42:10 / upload_prepare / 成功 / 正式文件 · request-demo-03
- 10:41:58 / context_bundle_get / 成功 / 共同设定 r2 · request-demo-02
- 10:41:52 / cover_skill_version_get / 成功 / 纸感留白封面 v3 · request-demo-01
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前选中一个有效连接，只展示已记录调用。日志包含时间、操作、成功/拒绝/失败及对象或错误，不包含业务正文、token、票据或本地路径。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 不记录或展示 token、上传票据、文件本地路径或业务正文。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“连接调用记录”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“连接调用记录”，Page ID：machine-calls。所有记录均为合成设计示例。

页面任务：定位授权制作任务的调用结果与错误，保持业务正文保密。
对应现有入口：/admin/machine（选中连接）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“刷新调用记录”；次操作：“查看授权范围”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“MCP 连接”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / MCP 连接 / 连接调用记录”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
顶部紧凑显示连接、领域、状态、授权范围；其下直接进入调用记录表。结果用清楚文字和极小状态点，不用大状态卡。请求/对象采用可读截断与展开，日志列对齐。
需要保留的字段与合成示例：
- 连接名称：每日封面制作
- 领域：封面
- 连接状态：有效
- 授权范围：2 个商品 · 1 个 skill
- 筛选内容：最近调用记录
- 日志内容：操作、结果、对象、请求标识

样例数据结构：表头“时间 / 操作 / 结果 / 对象 / 请求”。
- 10:42:16 / cover_draft_save / 成功 / 封面草稿 · request-demo-06
- 10:42:14 / upload_complete / 成功 / 正式文件 · request-demo-05
- 10:42:12 / upload_file / 成功 / 正式文件 · request-demo-04
- 10:42:10 / upload_prepare / 成功 / 正式文件 · request-demo-03
- 10:41:58 / context_bundle_get / 成功 / 共同设定 r2 · request-demo-02
- 10:41:52 / cover_skill_version_get / 成功 / 纸感留白封面 v3 · request-demo-01
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前选中一个有效连接，只展示已记录调用。日志包含时间、操作、成功/拒绝/失败及对象或错误，不包含业务正文、token、票据或本地路径。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 不记录或展示 token、上传票据、文件本地路径或业务正文。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“连接调用记录”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 28 · 订单与售后

Page ID：`orders-list`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单与售后”，Page ID：orders-list。所有记录均为合成设计示例。

页面任务：查找人工登记订单，进入交付与售后。
对应现有入口：/admin/orders（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“人工录入”；次操作：“CSV 导入”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单列表优先，筛选行包含引用、平台、状态；人工录入为主操作，CSV导入为次操作。金额和数量右对齐，订单引用与状态易扫描；不要自动支付或收入仪表盘。
需要保留的字段与合成示例：
- 订单引用：输入平台订单引用
- 平台：全部平台
- 订单状态：全部状态
- 数据范围：设计示例

样例数据结构：表头“订单引用 / 商品 / 平台 / 数量 / 金额 / 状态”。
- DEMO-0048 / 关系中的安全感 / 小红书 / 1 / ¥ 99.00 / 待交付
- DEMO-0047 / 看见自己的节奏 / 抖音 / 1 / ¥ 99.00 / 已交付
- DEMO-0046 / 关系中的安全感 / 人工 / 2 / ¥ 198.00 / 已交付
- DEMO-0045 / 亲密关系的距离 / 小红书 / 1 / ¥ 99.00 / 已退款
- DEMO-0044 / 关系中的安全感 / 抖音 / 1 / ¥ 99.00 / 已交付
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前显示待交付、已交付、已退款等订单记录；金额为人工记录，不代表自动支付核实。不得添加营收曲线或平台自动同步成功提示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 商品列是设计关系展示，真实开发需确认列表是否已返回商品名称，勿虚称当前已支持。
- 人工登记不代表平台核单或资金到账。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单与售后”，Page ID：orders-list。所有记录均为合成设计示例。

页面任务：查找人工登记订单，进入交付与售后。
对应现有入口：/admin/orders（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“人工录入”；次操作：“CSV 导入”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单列表优先，筛选行包含引用、平台、状态；人工录入为主操作，CSV导入为次操作。金额和数量右对齐，订单引用与状态易扫描；不要自动支付或收入仪表盘。
需要保留的字段与合成示例：
- 订单引用：输入平台订单引用
- 平台：全部平台
- 订单状态：全部状态
- 数据范围：设计示例

样例数据结构：表头“订单引用 / 商品 / 平台 / 数量 / 金额 / 状态”。
- DEMO-0048 / 关系中的安全感 / 小红书 / 1 / ¥ 99.00 / 待交付
- DEMO-0047 / 看见自己的节奏 / 抖音 / 1 / ¥ 99.00 / 已交付
- DEMO-0046 / 关系中的安全感 / 人工 / 2 / ¥ 198.00 / 已交付
- DEMO-0045 / 亲密关系的距离 / 小红书 / 1 / ¥ 99.00 / 已退款
- DEMO-0044 / 关系中的安全感 / 抖音 / 1 / ¥ 99.00 / 已交付
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前显示待交付、已交付、已退款等订单记录；金额为人工记录，不代表自动支付核实。不得添加营收曲线或平台自动同步成功提示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 商品列是设计关系展示，真实开发需确认列表是否已返回商品名称，勿虚称当前已支持。
- 人工登记不代表平台核单或资金到账。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单与售后”，Page ID：orders-list。所有记录均为合成设计示例。

页面任务：查找人工登记订单，进入交付与售后。
对应现有入口：/admin/orders（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“人工录入”；次操作：“CSV 导入”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单列表优先，筛选行包含引用、平台、状态；人工录入为主操作，CSV导入为次操作。金额和数量右对齐，订单引用与状态易扫描；不要自动支付或收入仪表盘。
需要保留的字段与合成示例：
- 订单引用：输入平台订单引用
- 平台：全部平台
- 订单状态：全部状态
- 数据范围：设计示例

样例数据结构：表头“订单引用 / 商品 / 平台 / 数量 / 金额 / 状态”。
- DEMO-0048 / 关系中的安全感 / 小红书 / 1 / ¥ 99.00 / 待交付
- DEMO-0047 / 看见自己的节奏 / 抖音 / 1 / ¥ 99.00 / 已交付
- DEMO-0046 / 关系中的安全感 / 人工 / 2 / ¥ 198.00 / 已交付
- DEMO-0045 / 亲密关系的距离 / 小红书 / 1 / ¥ 99.00 / 已退款
- DEMO-0044 / 关系中的安全感 / 抖音 / 1 / ¥ 99.00 / 已交付
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前显示待交付、已交付、已退款等订单记录；金额为人工记录，不代表自动支付核实。不得添加营收曲线或平台自动同步成功提示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 商品列是设计关系展示，真实开发需确认列表是否已返回商品名称，勿虚称当前已支持。
- 人工登记不代表平台核单或资金到账。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单与售后”，Page ID：orders-list。所有记录均为合成设计示例。

页面任务：查找人工登记订单，进入交付与售后。
对应现有入口：/admin/orders（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“人工录入”；次操作：“CSV 导入”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单列表优先，筛选行包含引用、平台、状态；人工录入为主操作，CSV导入为次操作。金额和数量右对齐，订单引用与状态易扫描；不要自动支付或收入仪表盘。
需要保留的字段与合成示例：
- 订单引用：输入平台订单引用
- 平台：全部平台
- 订单状态：全部状态
- 数据范围：设计示例

样例数据结构：表头“订单引用 / 商品 / 平台 / 数量 / 金额 / 状态”。
- DEMO-0048 / 关系中的安全感 / 小红书 / 1 / ¥ 99.00 / 待交付
- DEMO-0047 / 看见自己的节奏 / 抖音 / 1 / ¥ 99.00 / 已交付
- DEMO-0046 / 关系中的安全感 / 人工 / 2 / ¥ 198.00 / 已交付
- DEMO-0045 / 亲密关系的距离 / 小红书 / 1 / ¥ 99.00 / 已退款
- DEMO-0044 / 关系中的安全感 / 抖音 / 1 / ¥ 99.00 / 已交付
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前显示待交付、已交付、已退款等订单记录；金额为人工记录，不代表自动支付核实。不得添加营收曲线或平台自动同步成功提示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 商品列是设计关系展示，真实开发需确认列表是否已返回商品名称，勿虚称当前已支持。
- 人工登记不代表平台核单或资金到账。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 29 · 人工录入订单

Page ID：`order-new`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“人工录入订单”，Page ID：order-new。所有记录均为合成设计示例。

页面任务：记录线下或外部平台订单，绑定准确商品版本。
对应现有入口：/admin/orders（录入状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“记录订单”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 人工录入订单”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主体是精简录入表单：商品版本、平台订单引用、数量与金额；右侧为本次录入摘要与人工登记说明。输入用元显示但能明确映射分；保存后进入订单详情，当前不展示发码成功。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 商品版本：v3 · 已发布
- 平台：小红书
- 订单引用：DEMO-0049
- 购买数量：1
- 金额：¥ 99.00
- 金额提交单位：分 · 9900
- 数据范围：设计示例

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为未提交录入表单。主操作记录订单，不直接发码。金额按元输入可读、提交按分；不要出现付款二维码或平台资金收款动作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 录入完成后进入订单详情；发码保持单独的明确操作。
- 不绘制自动核单、支付到账或自动退款能力。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“人工录入订单”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“人工录入订单”，Page ID：order-new。所有记录均为合成设计示例。

页面任务：记录线下或外部平台订单，绑定准确商品版本。
对应现有入口：/admin/orders（录入状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“记录订单”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 人工录入订单”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主体是精简录入表单：商品版本、平台订单引用、数量与金额；右侧为本次录入摘要与人工登记说明。输入用元显示但能明确映射分；保存后进入订单详情，当前不展示发码成功。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 商品版本：v3 · 已发布
- 平台：小红书
- 订单引用：DEMO-0049
- 购买数量：1
- 金额：¥ 99.00
- 金额提交单位：分 · 9900
- 数据范围：设计示例

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为未提交录入表单。主操作记录订单，不直接发码。金额按元输入可读、提交按分；不要出现付款二维码或平台资金收款动作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 录入完成后进入订单详情；发码保持单独的明确操作。
- 不绘制自动核单、支付到账或自动退款能力。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“人工录入订单”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“人工录入订单”，Page ID：order-new。所有记录均为合成设计示例。

页面任务：记录线下或外部平台订单，绑定准确商品版本。
对应现有入口：/admin/orders（录入状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“记录订单”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 人工录入订单”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主体是精简录入表单：商品版本、平台订单引用、数量与金额；右侧为本次录入摘要与人工登记说明。输入用元显示但能明确映射分；保存后进入订单详情，当前不展示发码成功。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 商品版本：v3 · 已发布
- 平台：小红书
- 订单引用：DEMO-0049
- 购买数量：1
- 金额：¥ 99.00
- 金额提交单位：分 · 9900
- 数据范围：设计示例

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为未提交录入表单。主操作记录订单，不直接发码。金额按元输入可读、提交按分；不要出现付款二维码或平台资金收款动作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 录入完成后进入订单详情；发码保持单独的明确操作。
- 不绘制自动核单、支付到账或自动退款能力。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“人工录入订单”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“人工录入订单”，Page ID：order-new。所有记录均为合成设计示例。

页面任务：记录线下或外部平台订单，绑定准确商品版本。
对应现有入口：/admin/orders（录入状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“记录订单”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 人工录入订单”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
主体是精简录入表单：商品版本、平台订单引用、数量与金额；右侧为本次录入摘要与人工登记说明。输入用元显示但能明确映射分；保存后进入订单详情，当前不展示发码成功。
需要保留的字段与合成示例：
- 商品：关系中的安全感
- 商品版本：v3 · 已发布
- 平台：小红书
- 订单引用：DEMO-0049
- 购买数量：1
- 金额：¥ 99.00
- 金额提交单位：分 · 9900
- 数据范围：设计示例

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前为未提交录入表单。主操作记录订单，不直接发码。金额按元输入可读、提交按分；不要出现付款二维码或平台资金收款动作。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 录入完成后进入订单详情；发码保持单独的明确操作。
- 不绘制自动核单、支付到账或自动退款能力。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“人工录入订单”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 30 · CSV 订单导入

Page ID：`orders-csv`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“CSV 订单导入”，Page ID：orders-csv。所有记录均为合成设计示例。

页面任务：先检查每一行，再导入通过验证的订单。
对应现有入口：/admin/orders（CSV 状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“导入通过的行”；次操作：“重新预演”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / CSV 订单导入”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用文件选择→预演核对→导入结果的三阶段条，当前停在预演完成。主体显示六行结果表，失败原因就地可读；右侧显示通过/失败数量，底部主要操作是导入通过的行。
需要保留的字段与合成示例：
- 导入文件：orders-20261020.csv
- 行数：6 行
- 预演通过：4 行
- 预演失败：2 行
- 当前阶段：预演完成 · 尚未导入
- 表头：platform, reference, productVersionId, quantity, amountFen

样例数据结构：表头“行号 / 订单引用 / 结果 / 说明”。
- 2 / DEMO-0050 / 通过 / 可导入
- 3 / DEMO-0051 / 通过 / 可导入
- 4 / DEMO-0052 / 失败 / 商品版本不存在
- 5 / DEMO-0053 / 通过 / 可导入
- 6 / DEMO-0054 / 失败 / 数量须大于 0
- 7 / DEMO-0055 / 通过 / 可导入
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前CSV已预演但未导入，6行中4行通过2行失败。只允许导入通过的行；相同引用且内容相同的已有订单可复用，不因重复引用一概失败，只有内容不一致才拒绝。相同内容重试不重复建单。导入成功是下一阶段，不能在当前同时显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 一次最多 500 行；先预演，之后只导入通过的行。
- 重试相同内容不重复建单，导入后可逐行查看订单。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“CSV 订单导入”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“CSV 订单导入”，Page ID：orders-csv。所有记录均为合成设计示例。

页面任务：先检查每一行，再导入通过验证的订单。
对应现有入口：/admin/orders（CSV 状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“导入通过的行”；次操作：“重新预演”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / CSV 订单导入”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用文件选择→预演核对→导入结果的三阶段条，当前停在预演完成。主体显示六行结果表，失败原因就地可读；右侧显示通过/失败数量，底部主要操作是导入通过的行。
需要保留的字段与合成示例：
- 导入文件：orders-20261020.csv
- 行数：6 行
- 预演通过：4 行
- 预演失败：2 行
- 当前阶段：预演完成 · 尚未导入
- 表头：platform, reference, productVersionId, quantity, amountFen

样例数据结构：表头“行号 / 订单引用 / 结果 / 说明”。
- 2 / DEMO-0050 / 通过 / 可导入
- 3 / DEMO-0051 / 通过 / 可导入
- 4 / DEMO-0052 / 失败 / 商品版本不存在
- 5 / DEMO-0053 / 通过 / 可导入
- 6 / DEMO-0054 / 失败 / 数量须大于 0
- 7 / DEMO-0055 / 通过 / 可导入
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前CSV已预演但未导入，6行中4行通过2行失败。只允许导入通过的行；相同引用且内容相同的已有订单可复用，不因重复引用一概失败，只有内容不一致才拒绝。相同内容重试不重复建单。导入成功是下一阶段，不能在当前同时显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 一次最多 500 行；先预演，之后只导入通过的行。
- 重试相同内容不重复建单，导入后可逐行查看订单。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“CSV 订单导入”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“CSV 订单导入”，Page ID：orders-csv。所有记录均为合成设计示例。

页面任务：先检查每一行，再导入通过验证的订单。
对应现有入口：/admin/orders（CSV 状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“导入通过的行”；次操作：“重新预演”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / CSV 订单导入”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用文件选择→预演核对→导入结果的三阶段条，当前停在预演完成。主体显示六行结果表，失败原因就地可读；右侧显示通过/失败数量，底部主要操作是导入通过的行。
需要保留的字段与合成示例：
- 导入文件：orders-20261020.csv
- 行数：6 行
- 预演通过：4 行
- 预演失败：2 行
- 当前阶段：预演完成 · 尚未导入
- 表头：platform, reference, productVersionId, quantity, amountFen

样例数据结构：表头“行号 / 订单引用 / 结果 / 说明”。
- 2 / DEMO-0050 / 通过 / 可导入
- 3 / DEMO-0051 / 通过 / 可导入
- 4 / DEMO-0052 / 失败 / 商品版本不存在
- 5 / DEMO-0053 / 通过 / 可导入
- 6 / DEMO-0054 / 失败 / 数量须大于 0
- 7 / DEMO-0055 / 通过 / 可导入
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前CSV已预演但未导入，6行中4行通过2行失败。只允许导入通过的行；相同引用且内容相同的已有订单可复用，不因重复引用一概失败，只有内容不一致才拒绝。相同内容重试不重复建单。导入成功是下一阶段，不能在当前同时显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 一次最多 500 行；先预演，之后只导入通过的行。
- 重试相同内容不重复建单，导入后可逐行查看订单。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“CSV 订单导入”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“CSV 订单导入”，Page ID：orders-csv。所有记录均为合成设计示例。

页面任务：先检查每一行，再导入通过验证的订单。
对应现有入口：/admin/orders（CSV 状态）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“导入通过的行”；次操作：“重新预演”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / CSV 订单导入”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
采用文件选择→预演核对→导入结果的三阶段条，当前停在预演完成。主体显示六行结果表，失败原因就地可读；右侧显示通过/失败数量，底部主要操作是导入通过的行。
需要保留的字段与合成示例：
- 导入文件：orders-20261020.csv
- 行数：6 行
- 预演通过：4 行
- 预演失败：2 行
- 当前阶段：预演完成 · 尚未导入
- 表头：platform, reference, productVersionId, quantity, amountFen

样例数据结构：表头“行号 / 订单引用 / 结果 / 说明”。
- 2 / DEMO-0050 / 通过 / 可导入
- 3 / DEMO-0051 / 通过 / 可导入
- 4 / DEMO-0052 / 失败 / 商品版本不存在
- 5 / DEMO-0053 / 通过 / 可导入
- 6 / DEMO-0054 / 失败 / 数量须大于 0
- 7 / DEMO-0055 / 通过 / 可导入
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前CSV已预演但未导入，6行中4行通过2行失败。只允许导入通过的行；相同引用且内容相同的已有订单可复用，不因重复引用一概失败，只有内容不一致才拒绝。相同内容重试不重复建单。导入成功是下一阶段，不能在当前同时显示。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 一次最多 500 行；先预演，之后只导入通过的行。
- 重试相同内容不重复建单，导入后可逐行查看订单。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“CSV 订单导入”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 31 · 订单详情与售后

Page ID：`order-detail`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单详情与售后”，Page ID：order-detail。所有记录均为合成设计示例。

页面任务：查看交付和兑换码状态，处理补发以及退款撤权。
对应现有入口：/admin/orders?order=:orderId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“补发兑换码”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单详情与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单头部简洁显示引用、已交付状态、数量与金额；主体是交付任务与兑换码状态，右侧单独放售后处理。当前已交付且已兑换，主操作为补发指定兑换码；历史首次交付文件不重新展示完整码，退款确认放在独立售后区，避免互斥状态同时呈现。
需要保留的字段与合成示例：
- 订单引用：DEMO-0048
- 订单状态：已交付
- 数量：1 份
- 登记金额：¥ 99.00
- 平台：小红书
- 完整兑换码：仅首次交付响应可见
- 退款处理：先在原平台完成资金退款
- 访问权益：退款操作撤销本站访问

样例数据结构：表头“交付对象 / 状态 / 操作”。
- 兑换码 · DEMO-CODE-01 / 已兑换 / 补发该码
- 交付文件 / 首次交付响应已结束 / 仅显示回执与状态
- 历史报告快照 / 保留 / 查看状态
- 绑定归属与已用次数 / 保留 / 只读
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为已交付且示例兑换码已兑换；主操作补发兑换码必须针对表中一条指定的未撤销码，首次发码按钮不出现。历史响应中的完整码不可重新导出；当前只展示交付回执和脱敏状态。新的补发响应才会一次显示新交付内容。退款需要先勾选确认已在原平台处理资金退款，本站仅撤访问权益，历史报告保留。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 示例不展示真实兑换码或私人消费者资料。
- 发码、补发、首次交付下载、退款确认是同页的互斥或阶段状态；退款动作不处理平台资金。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单详情与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单详情与售后”，Page ID：order-detail。所有记录均为合成设计示例。

页面任务：查看交付和兑换码状态，处理补发以及退款撤权。
对应现有入口：/admin/orders?order=:orderId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“补发兑换码”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单详情与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单头部简洁显示引用、已交付状态、数量与金额；主体是交付任务与兑换码状态，右侧单独放售后处理。当前已交付且已兑换，主操作为补发指定兑换码；历史首次交付文件不重新展示完整码，退款确认放在独立售后区，避免互斥状态同时呈现。
需要保留的字段与合成示例：
- 订单引用：DEMO-0048
- 订单状态：已交付
- 数量：1 份
- 登记金额：¥ 99.00
- 平台：小红书
- 完整兑换码：仅首次交付响应可见
- 退款处理：先在原平台完成资金退款
- 访问权益：退款操作撤销本站访问

样例数据结构：表头“交付对象 / 状态 / 操作”。
- 兑换码 · DEMO-CODE-01 / 已兑换 / 补发该码
- 交付文件 / 首次交付响应已结束 / 仅显示回执与状态
- 历史报告快照 / 保留 / 查看状态
- 绑定归属与已用次数 / 保留 / 只读
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为已交付且示例兑换码已兑换；主操作补发兑换码必须针对表中一条指定的未撤销码，首次发码按钮不出现。历史响应中的完整码不可重新导出；当前只展示交付回执和脱敏状态。新的补发响应才会一次显示新交付内容。退款需要先勾选确认已在原平台处理资金退款，本站仅撤访问权益，历史报告保留。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 示例不展示真实兑换码或私人消费者资料。
- 发码、补发、首次交付下载、退款确认是同页的互斥或阶段状态；退款动作不处理平台资金。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单详情与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单详情与售后”，Page ID：order-detail。所有记录均为合成设计示例。

页面任务：查看交付和兑换码状态，处理补发以及退款撤权。
对应现有入口：/admin/orders?order=:orderId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“补发兑换码”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单详情与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单头部简洁显示引用、已交付状态、数量与金额；主体是交付任务与兑换码状态，右侧单独放售后处理。当前已交付且已兑换，主操作为补发指定兑换码；历史首次交付文件不重新展示完整码，退款确认放在独立售后区，避免互斥状态同时呈现。
需要保留的字段与合成示例：
- 订单引用：DEMO-0048
- 订单状态：已交付
- 数量：1 份
- 登记金额：¥ 99.00
- 平台：小红书
- 完整兑换码：仅首次交付响应可见
- 退款处理：先在原平台完成资金退款
- 访问权益：退款操作撤销本站访问

样例数据结构：表头“交付对象 / 状态 / 操作”。
- 兑换码 · DEMO-CODE-01 / 已兑换 / 补发该码
- 交付文件 / 首次交付响应已结束 / 仅显示回执与状态
- 历史报告快照 / 保留 / 查看状态
- 绑定归属与已用次数 / 保留 / 只读
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为已交付且示例兑换码已兑换；主操作补发兑换码必须针对表中一条指定的未撤销码，首次发码按钮不出现。历史响应中的完整码不可重新导出；当前只展示交付回执和脱敏状态。新的补发响应才会一次显示新交付内容。退款需要先勾选确认已在原平台处理资金退款，本站仅撤访问权益，历史报告保留。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 示例不展示真实兑换码或私人消费者资料。
- 发码、补发、首次交付下载、退款确认是同页的互斥或阶段状态；退款动作不处理平台资金。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单详情与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“订单详情与售后”，Page ID：order-detail。所有记录均为合成设计示例。

页面任务：查看交付和兑换码状态，处理补发以及退款撤权。
对应现有入口：/admin/orders?order=:orderId（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“补发兑换码”；次操作：“返回订单列表”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
单一主导航侧栏，品牌 meetmyworld，小字“运营后台”。导航按顺序为：概览与审计、商品与版本、内容工作台、素材与文件、skill 库、MCP 连接、订单与售后。当前只选中“订单与售后”，不能把“skill 库”错误选在其他业务页。底部单独放“返回前台”“账户”。顶栏为56px左右，面包屑“运营后台 / 订单与售后 / 订单详情与售后”；小头像文字“管理员”，可有低调的“本地环境”。不要重复图标侧栏或消费者导航。侧栏和顶栏固定，只有右侧运营工作区上下滚动，右缘有细滚动条；长侧栏允许独立滚动，但不能把整个浏览器一起滚动。


本页专属内容与信息结构：
订单头部简洁显示引用、已交付状态、数量与金额；主体是交付任务与兑换码状态，右侧单独放售后处理。当前已交付且已兑换，主操作为补发指定兑换码；历史首次交付文件不重新展示完整码，退款确认放在独立售后区，避免互斥状态同时呈现。
需要保留的字段与合成示例：
- 订单引用：DEMO-0048
- 订单状态：已交付
- 数量：1 份
- 登记金额：¥ 99.00
- 平台：小红书
- 完整兑换码：仅首次交付响应可见
- 退款处理：先在原平台完成资金退款
- 访问权益：退款操作撤销本站访问

样例数据结构：表头“交付对象 / 状态 / 操作”。
- 兑换码 · DEMO-CODE-01 / 已兑换 / 补发该码
- 交付文件 / 首次交付响应已结束 / 仅显示回执与状态
- 历史报告快照 / 保留 / 查看状态
- 绑定归属与已用次数 / 保留 / 只读
以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前明确为已交付且示例兑换码已兑换；主操作补发兑换码必须针对表中一条指定的未撤销码，首次发码按钮不出现。历史响应中的完整码不可重新导出；当前只展示交付回执和脱敏状态。新的补发响应才会一次显示新交付内容。退款需要先勾选确认已在原平台处理资金退款，本站仅撤访问权益，历史报告保留。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 示例不展示真实兑换码或私人消费者资料。
- 发码、补发、首次交付下载、退款确认是同页的互斥或阶段状态；退款动作不处理平台资金。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“订单详情与售后”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```


## 32 · 管理员访问

Page ID：`access`

### A · 纸感编辑紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“管理员访问”，Page ID：access。所有记录均为合成设计示例。

页面任务：在进入工作台前说明管理员身份要求并提供明确下一步。
对应现有入口：/admin（未登录或权限不足）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“邮箱登录”；次操作：“返回网站”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
访问页不展示已授权的后台导航。品牌为 meetmyworld，下方小字运营后台；保留“返回前台”和“邮箱登录”。无当前选中的后台业务模块。顶栏固定；登录说明所在主区域可独立滚动。


本页专属内容与信息结构：
这是一张管理员访问页。保留品牌与返回前台入口，用居中的窄登录说明区，显示管理员身份和验证邮箱要求。没有已授权后台菜单、统计或账号资料；主要按钮是邮箱登录。不要巨大插画。
需要保留的字段与合成示例：
- 所需账户：管理员账户
- 邮箱状态：已验证
- 登录方式：邮箱登录
- 当前状态：尚未登录

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前未登录。邮箱登录是唯一主要动作，没有管理员自助注册或提权。其他可替换状态为邮箱未验证、非管理员、服务未配置或加载失败，但本画面只体现一种。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 同模板覆盖：尚未登录、邮箱未验证、没有管理员权限、账户服务未配置、加载失败重试。
- 不添加公开注册管理员或自助提权入口。

四套方案中的本张风格：A · 纸感编辑紫
STYLE A — EDITORIAL PAPER & INK VIOLET. A daylight editorial publishing desk, warm ivory and dark aubergine ink, human and rigorous. Palette: canvas #F4F1F5, sidebar #EAE4EE, reading document #FFFCF8, hairline #D8CEDC, text #292230, muted #736877, brand #8250A5, selected lavender #E9E1F9. Primary button dark plum #65417B with offwhite text. Keep the brand wordmark in Manrope Bold style, Chinese UI text in crisp PingFang SC / Source Han Sans; ONLY the document title may use a restrained Source Han Serif Chinese serif, never use serif on controls. Corners 3–5px, no shadows except a 1px understated document boundary. Dividers and typography do the work.
将本页结构表达为编辑出版工作台：200px固定侧栏，56px顶栏，正文区使用温暖纸白、细分隔线和一张连续工作面；编辑详情可有细线分开的窄边注栏。列表页用完整表格或有规则的条目，不强行加入文档。非内容标题不使用大衬线字。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“管理员访问”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### B · 精密工具紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“管理员访问”，Page ID：access。所有记录均为合成设计示例。

页面任务：在进入工作台前说明管理员身份要求并提供明确下一步。
对应现有入口：/admin（未登录或权限不足）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“邮箱登录”；次操作：“返回网站”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
访问页不展示已授权的后台导航。品牌为 meetmyworld，下方小字运营后台；保留“返回前台”和“邮箱登录”。无当前选中的后台业务模块。顶栏固定；登录说明所在主区域可独立滚动。


本页专属内容与信息结构：
这是一张管理员访问页。保留品牌与返回前台入口，用居中的窄登录说明区，显示管理员身份和验证邮箱要求。没有已授权后台菜单、统计或账号资料；主要按钮是邮箱登录。不要巨大插画。
需要保留的字段与合成示例：
- 所需账户：管理员账户
- 邮箱状态：已验证
- 登录方式：邮箱登录
- 当前状态：尚未登录

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前未登录。邮箱登录是唯一主要动作，没有管理员自助注册或提权。其他可替换状态为邮箱未验证、非管理员、服务未配置或加载失败，但本画面只体现一种。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 同模板覆盖：尚未登录、邮箱未验证、没有管理员权限、账户服务未配置、加载失败重试。
- 不添加公开注册管理员或自助提权入口。

四套方案中的本张风格：B · 精密工具紫
STYLE B — PRECISE DARK TOOL. A high-density, exceptionally practical content IDE, cool neutral charcoal with restrained pale-purple selection. Palette canvas #111218, sidebar #14151D, workspace #191B24, elevated controls #22242E, fine border #343640, text #F0EDF4, muted #A6A2B3, brand #D8AFE9, selection #30283C. Nearly flat dark-neutral surfaces, no atmospheric lighting or purple fog. Chinese sans UI, English/IDs in a subtle JetBrains Mono-like monospace, tabular numerals. Corners 4–6px, 1px separators, 32px controls, dense but legible 40px rows, 14px normal type.
将本页结构表达为精密操作工具：184px固定侧栏，48–56px顶栏，32px控件与约40px表行；能对照的内容用明确的两/三栏单像素分隔。表格页优先满宽表，不强制塞三栏；详情页才用列表/正文/属性布局。使用冷中性深灰为主、淡紫选中，不要紫色雾气。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“管理员访问”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### C · 柔雾创作紫

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“管理员访问”，Page ID：access。所有记录均为合成设计示例。

页面任务：在进入工作台前说明管理员身份要求并提供明确下一步。
对应现有入口：/admin（未登录或权限不足）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“邮箱登录”；次操作：“返回网站”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
访问页不展示已授权的后台导航。品牌为 meetmyworld，下方小字运营后台；保留“返回前台”和“邮箱登录”。无当前选中的后台业务模块。顶栏固定；登录说明所在主区域可独立滚动。


本页专属内容与信息结构：
这是一张管理员访问页。保留品牌与返回前台入口，用居中的窄登录说明区，显示管理员身份和验证邮箱要求。没有已授权后台菜单、统计或账号资料；主要按钮是邮箱登录。不要巨大插画。
需要保留的字段与合成示例：
- 所需账户：管理员账户
- 邮箱状态：已验证
- 登录方式：邮箱登录
- 当前状态：尚未登录

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前未登录。邮箱登录是唯一主要动作，没有管理员自助注册或提权。其他可替换状态为邮箱未验证、非管理员、服务未配置或加载失败，但本画面只体现一种。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 同模板覆盖：尚未登录、邮箱未验证、没有管理员权限、账户服务未配置、加载失败重试。
- 不添加公开注册管理员或自助提权入口。

四套方案中的本张风格：C · 柔雾创作紫
STYLE C — SOFT CREATIVE STUDIO, LIGHT LAVENDER. A gentle creative operations studio whose warmth comes from rhythm, tactility and thoughtful copy, not illustrations. Palette: outer canvas #F1EDF7, sidebar #E5DDEC, main surface #FFFEFF, text #34273E, muted #786A82, border #DDD3E5, brand #8250A5, selected #E8DDF1, subtle field #F6F2F8. Purple-tinted warmth with clean white reading surfaces. Soft but precise 8–10px corners, 38–40px controls, 48–52px rows, modest 1px borders, virtually no shadows. Manrope-style brand and PingFang SC Chinese; page title 27px medium weight, labels 14px, body 15px/1.65. Do not turn softness into giant pills or low-contrast pastel text.
将本页结构表达为柔和但高效的创作工作台：208px固定侧栏，56px顶栏，38–40px控件与48–52px行；用一张白色工作面、8–10px转角和充分段落节奏。创作页可舒适主从分栏，列表页保持清楚行结构；不做漂浮卡片阵列。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“管理员访问”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```

### D · 深茄夜间工作台

```text
请设计一张原创、可落地的桌面运营后台高保真页面图，正视平面截图，1600 × 1080。不是线框稿，也不是营销宣传图。产品品牌 meetmyworld，为自我理解与关系理解体验提供内容运营能力，整体保留紫色色调。本次仅设计一个页面：“管理员访问”，Page ID：access。所有记录均为合成设计示例。

页面任务：在进入工作台前说明管理员身份要求并提供明确下一步。
对应现有入口：/admin（未登录或权限不足）（用于理解功能，不要在UI中堆出路由字符串）。
主操作：“邮箱登录”；次操作：“返回网站”。必须根据下面的当前状态决定可用性；不要重复两个主按钮。需要编辑时显示具体可编辑字段，需要只读时用语义清楚的文本。

导航与滚动：
访问页不展示已授权的后台导航。品牌为 meetmyworld，下方小字运营后台；保留“返回前台”和“邮箱登录”。无当前选中的后台业务模块。顶栏固定；登录说明所在主区域可独立滚动。


本页专属内容与信息结构：
这是一张管理员访问页。保留品牌与返回前台入口，用居中的窄登录说明区，显示管理员身份和验证邮箱要求。没有已授权后台菜单、统计或账号资料；主要按钮是邮箱登录。不要巨大插画。
需要保留的字段与合成示例：
- 所需账户：管理员账户
- 邮箱状态：已验证
- 登录方式：邮箱登录
- 当前状态：尚未登录

以上例值可以统一替换为另一组贯穿整个平台的设计样例，但字段结构、修订关系、专业用途与真实业务状态不能丢；同一画面中必须自洽。不要为了塞下内容把字体缩到不可读，次要信息可在折叠区或滚动续区。

当前业务状态与操作边界：
当前未登录。邮箱登录是唯一主要动作，没有管理员自助注册或提权。其他可替换状态为邮箱未验证、非管理员、服务未配置或加载失败，但本画面只体现一种。
补充业务要求（理解后落实到结构，只把真正帮助操作者的信息短句显示在界面）：
- 同模板覆盖：尚未登录、邮箱未验证、没有管理员权限、账户服务未配置、加载失败重试。
- 不添加公开注册管理员或自助提权入口。

四套方案中的本张风格：D · 深茄夜间工作台
STYLE D — AUBERGINE NIGHT EDITING DESK. Mature warm dark-plum operations UI, directly continuous with meetmyworld brand. Palette: canvas #15111B, sidebar #1B1522, main workspace #211A2A, secondary surface #2B2234, border #3F3249, text #F6EEF9, muted #B4A3BF, brand #D8AFE9, selected #392744. One pale lavender primary button, text dark plum #2B163B. No black-blue neon, no gradient, no bloom, no atmospheric glass. Manrope-style brand with highly readable PingFang SC / Source Han Sans Chinese. Corners 6–8px, 36px controls, 44px rows, subtle precise dividers. Title 26px, warm offwhite body 15px with line-height 1.6.
将本页结构表达为成熟的深茄夜间工作台：200px固定侧栏，56px顶栏，36px控件与约44px行；暖深紫底、细线、高对比文字。编辑/确认页可设58px固定底部命令栏，仅覆盖右侧工作区；把唯一主要动作放在底栏，页首不重复。列表页无需额外底栏。
注意：本风格只控制配色、字体、间距、边框、密度和工作区组织，页面业务内容始终以上面“管理员访问”为准，不能退回通用skill示例。

界面品质与负面约束：使用准确、清晰、可读的简体中文；控制文字约14–15px，元信息约13px，页面标题24–28px。对齐基线、控件高度、表格列和段落节奏，至少70%画面用于真实业务内容。紫色用于选中、焦点与一个主操作，其他颜色克制。低优先级UUID/hash/原始JSON收进详情，不以技术字段占满首屏。
不要营销落地页，不要AI聊天框、魔法棒、星光、发光渐变球、玻璃拟态、霓虹、巨大药丸标签、过量圆角KPI卡片、装饰3D物件、伪图表、空洞英文口号、假在线人数、假增长指标或设备样机。不要浏览器外壳、透视、手持设备、画面外讲解箭头。不要模仿其他公司的品牌。不要把本页没有的skill正文、版本面板或文件参考硬塞进来。不要新增模型生成、自动社交发布、自动支付核实、资金退款或当前未实现的3D体验运行能力。
可用真实内容示例做媒体画面，但不要使用消费者私人回答、私人报告、真实邮箱、密钥或可用兑换码。画面角落保留小字“设计提案 · 示例内容”。不要把这些设计约束原样作为大段说明贴进产品界面。

最终输出单张完成度高、可供逐页比较的中文高保真设计图，界面正文只出现有业务意义的标签、字段、样例和操作。
```
