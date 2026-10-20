# Figma 商城完整流程还原

2026-10-15，完成本次明确选择的全部已画页面，并复用已有首页样式。商品详情、兑换、成功、答题、反馈和报告均为 React / HTML / CSS 界面，可按顺序操作。

## 入口与交互

| 页面 | 本地地址 | 主要交互 |
| --- | --- | --- |
| 商城 | http://127.0.0.1:5173/ | 伴侣商品卡进入详情；我的应用、我的报告与继续测试进入流程 |
| 商品详情 | http://127.0.0.1:5173/products/partner | 收藏、购买说明定位、输入兑换码、相关商品 |
| 兑换 | http://127.0.0.1:5173/redeem | 输入、粘贴、校验、帮助；示例码 `DEMO-XXXX-XXXX` |
| 成功 | http://127.0.0.1:5173/redeem/success | 开始测评、返回商品、返回商城 |
| 答题 | http://127.0.0.1:5173/assessment/partner | 16 道公开示例题、单选、确认、修改/取消修改、上一题/下一题、退出及本机恢复 |
| 完整报告 | http://127.0.0.1:5173/reports/partner | 五维解析、优势/留意、行动建议、保存 PNG 分享卡、重新体验 |

对应 Figma 第 5 题的独立展示状态：`/assessment/partner?preview=answer` 与 `/assessment/partner?preview=feedback`。它们不读取或覆盖本机正常预览作答；适合直接对照两张已采用草稿。

确认后才增加进度并展开右侧非模态反馈。反馈收起后可以重新展开；修改尚未确认时保留原答案，取消修改恢复原选择。刷新和退出恢复已确认答案及当前题号；本地存储受阻时有明确提示，不声称已经保存。完成全部 16 题后进入报告。

## 复用与设计依据

- 共用首页的 `home.css` 颜色、字体、按钮、图标、导航及手机底部导航。`StoreGreeting`、`ProductCard` 已从首页提取，首页和新页使用同一组件；横向推荐卡通过已有商品卡变体实现。
- `FlowShell` 复用首页公共视觉，并按草稿支持问候栏、导航选中及长页。`GlassFrame` 保留原商城变体，增加兑换和答题轮廓；直线部分随实际容器伸缩，边角保留原稿。
- Noto Sans SC、Manrope、四张商品插图均使用已有本地资源。雷达图、进度与统计条用数据驱动的 SVG / HTML 呈现。
- 原始设计 SVG 通过外部 fragment 引用装饰和图标，不改写源路径；没有把整页截图作为页面 UI。

| 草稿 | Figma 节点 | 对照的本地原生导出 |
| --- | --- | --- |
| 商品详情 · 横幅主视觉 | [184:452](https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe?node-id=184-452) | `output/figma/product-detail-wide-hero-preview.png` |
| 兑换 · 步骤引导 | [290:83](https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe?node-id=290-83) | `output/figma/guided-redemption-preview.png` |
| 成功 · 步骤引导 | [300:777](https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe?node-id=300-777) | `output/figma/guided-redemption-success-preview.png` |
| 答题 · 选项网格 | [463:162](https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe?node-id=463-162) | `output/figma/option-grid-answer-outer-fade-preview.png` |
| 反馈 · 选项网格 | [490:635](https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe?node-id=490-635) | `output/figma/option-grid-feedback-outer-fade-preview.png` |
| 报告 · 横幅叙事＋问候栏 | [539:515](https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe?node-id=539-515) | `output/figma/full-report-with-greeting-native-preview.png` |

Figma MCP 的设计上下文与截图调用此前返回 Starter 额度耗尽。本轮依据已保存的原始 SVG、图层记录、生成源及原生 PNG 导出实现和人工对照；未取得新的 MCP 设计上下文，不宣称逐像素一致。

## 预览数据范围

当前实现完整 UI 与预览交互，真实兑换、权益、正式题库、计分及报告 API 未接入，不代表 T08 业务前端验收。非示例兑换码不会发送或存储。作答保存到独立本机预览键，报告采用固定设计示例分数，不能解释为个人测评结果。

第五题与两组反馈口径沿用已采用草稿：本题 120 份其他有效回答、结论 80 份其他有效答卷，分母不同且不含当前答卷，均标示示例。商品报告样例分数为 84/76/82/72/80；完整报告为 82/76/80/68/88，总分 78.80。其余示例题仅用于走通 UI，不包含真实计分配置。

分享卡由浏览器绘制并下载 1192 × 336 PNG，仅包含固定结果摘要与示例标记，插图保持原始比例，不导出答题内容。

## 验证与证据

- `pnpm --filter @orai/web build`：TypeScript 与 Vite 构建通过。
- `pnpm --filter @orai/web test`：23 项通过，其中 8 项验证答题状态、修改取消、完成条件与存储，15 项为原有认证逻辑测试。
- `verify.mjs`：无头 Chromium 实际点击完整流程、兑换校验与粘贴降级、键盘单选、确认/修改/取消、收起反馈、暂停恢复、全题完成、报告与 PNG 下载、重新体验、独立设计状态、搜索与侧栏、存储被禁用时的提示。结果见 `verification.json`。
- 320、359、384、430、600、768、844 横屏、1024、1199、1200、1279、1280、1440、1920 的六个页面状态，共 84 组。页面无横向溢出，卡片与答题操作在容器内，图片及 SVG 分组均有非空几何；浏览器错误为空。详见 `responsive-checks.json`。
- 最后修整平板主视觉覆盖范围、数字间距、问候胶囊，以及商品卡间距和分享图片比例；额外定向检查见 `refinement-checks.json`，没有重复全量响应式检查。
- 8 份 SVG 与四份商品 PNG 和原始设计文件字节一致；见 `source-assets.json`。可见素材、原始分组、调用文件与 84 组实际几何记录见 `assets-verification.json`。
- 人工检查桌面六页状态、手机商品/答题/反馈/报告、平板反馈与报告，以及实际下载的分享卡。

截图位于本目录 `desktop-*.png`、`mobile-*.png`、`tablet-*.png`；下载样例为 `share-card.png`。完整流程脚本使用项目 Node 与已安装 Chrome：

```sh
ORAI_PLAYWRIGHT_PATH='/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright' \
/Users/mac/.nvm/versions/node/v24.21.0/bin/node output/implementation/store-flow/verify.mjs
```
