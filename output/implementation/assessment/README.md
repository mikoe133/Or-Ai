# 04 · 选项网格：答题与反馈前端

2026-10-15，按最终 Figma 选项网格设计实现 React 界面。

- 作答流程：<http://127.0.0.1:5173/assessment/partner>
- 设计答题状态，第 05 题、选中 B、已完成 4/16：<http://127.0.0.1:5173/assessment/partner?preview=answer>
- 设计反馈状态，第 05 题、已确认 B、已完成 5/16：<http://127.0.0.1:5173/assessment/partner?preview=feedback>

两条设计展示链接独立于本机作答进度。默认入口使用已有 `preview-state.ts` 中的 16 道公开示例题，并保存已确认的选择与当前题号。支持原生单选键盘操作、确认、修改、取消修改、上一题、下一题、收起和展开群体反馈、退出与继续。全部题目确认后进入现有报告样例。兑换成功页的“开始测评”也已接入此入口。

当前仍是前端设计预览，统计明确标注“示例数据”，回答不发送至真实作答、计分或统计接口。报告入口展示现有固定样例，不根据这些公开示例题生成个人分数。存储失败有明确提示，退出对话框不会声称进度已持久保存。

## 复用与设计

复用 `FlowShell` 的顶部导航、搜索、侧栏、工具栏、兑换入口、帮助、页脚和手机导航，复用 `StoreGreeting`、`GlassFrame`、商城图标、字体、按钮和标签样式。仅增加答题专用外壳变体、题卡和分布图样式。`assessment-state.ts` 将未确认的草稿与已保存答案分开；页面正文使用 HTML、CSS 与 React 控件。

商品封面复用商城的同一张原图。环境光、双轮廓和退出图标引用保存的原始 Figma SVG 分组，未用整页截图作为 UI。素材与源文件的哈希一致，SVG 根尺寸保留，见 `assets-verification.json` 和 `rendered-assets.json`。

Figma 设计上下文和截图接口仍返回 Starter 额度限制。本次对照此前保存的最终原生导出图、SVG 源和尺寸记录实现，未取得新的 MCP 设计上下文。

- 答题画板：<https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe/Or-Ai?node-id=463-162>
- 反馈画板：<https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe/Or-Ai?node-id=490-635>
- 最终视觉参考：`output/figma/option-grid-answer-outer-fade-preview.png`、`output/figma/option-grid-feedback-outer-fade-preview.png`。

1440 × 1024 实测：顶部导航 72px、问候栏 108px；工作区 `(72,180)`、1296 × 799.4px；正文 `(338,201)`、1011 × 750px；反馈展开为 650px + 24px + 337px。两种状态题卡均为 500px 高，2×2 选项网格分别在 y564 与 y585。右侧外线、柔光和玻璃带只保留工作区下方约 45% 的渐隐段，面板底色最右侧 14px 透明过渡，避免形成全高实体边缘。

## 验证

- Node 24.21.0 / pnpm 10.33.2，`pnpm --filter @orai/web build` 通过 TypeScript 和生产构建。
- `pnpm --filter @orai/web test`：23 项通过，含 8 项新增答题状态与存储测试、15 项原有认证测试。
- 通过 CUA 在真实浏览器验证键盘选择、确认只增加一次进度、收起反馈、取消修改恢复原答案、修改不重复计数、翻题草稿重置、退出继续和侧栏折叠。
- 连续确认第 05–16 题，正确累积至 16/16 并进入报告入口；真实默认入口验证刷新恢复当前题、未确认修改不覆盖旧答案、商城“继续上次测试”恢复进度。测试前默认进度为 0，验证后通过公开示例重置入口恢复为 0。
- 320、430、768、1024、1280、1920 宽度及 844 × 390 横屏，两种状态共 14 组检查，无横向溢出，题卡和反馈均在内容边界内，图片加载正常。另核对 1440 设计基准和 390 手机实图。宽屏工作区高度修正后，1920 × 1080 页面完整落在视口内。
- 商城基准工作区仍为 `(72,180)`、1296 × 800px。兑换成功页“开始测评”进入默认作答入口。最后一轮浏览器验证无新增错误。

实际截图：`desktop-answer.png`、`desktop-feedback.png`、`mobile-feedback.png`、`320-*.png`、`768-*.png`、`1280-*.png`。对应记录为 `desktop-geometry.json`、`responsive-checks.json`、`interaction-checks.json`、`persistence-checks.json`、`completion-check.json`、`entry-wide-checks.json`、`browser-errors.json`。
