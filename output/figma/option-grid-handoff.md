# 04 · 选项网格 · 答题与反馈

已在 Figma 页「06 · 答题与反馈 · 选项网格」修正两张 1440×1024 可编辑画板。

- 答题页：463:162，正文 564:1330。
- 反馈展开：490:635，正文 571:1897。原画板链接保留。
- 顶部 72 px 导航下新增 108 px 问候栏，含探索者头像胶囊和连续曲线。
- 我的空间左侧双轮廓位于 x72 / x86，底部为 y980 / y966，采用原生可编辑渐变描边、窄玻璃带和反光层。
- 工作区从 y180 开始，高 799.4；侧栏和正文容器高 797，正文 750。底部兑换入口、选项、按钮和统计说明完整显示。
- 正文为原生文字和矢量图层，主区与反馈双栏使用自动布局；商品封面是独立图片。沿用已有导航和按钮实例。未新建题卡组件库。
- 群体反馈标为示例数据，120 份本题回答、80 份已完成答卷分别统计，均不含当前答卷。

## 文件

- option-grid-answer-revised-preview.png：实际 Figma 答题页导出。
- option-grid-feedback-revised-preview.png：实际 Figma 反馈页导出。
- option-grid-answer-preview.png、option-grid-feedback-preview.png：已同步更新为最终预览。
- option-grid-editable-backup.fig：Figma 菜单导出的完整文件快照，包含页 06；不是仅包含本页的文件。
- build-option-grid-svg.py、build-option-grid-shell.py：可编辑 SVG 素材生成源。
- option-grid-state.json：节点、尺寸、素材、验证与备份记录。

## 外侧线渐隐修正 · 2026-10-15

- 右侧外线 x1368 仅在 y620–980 范围显示（工作区下方约45%），向上渐隐至完全透明。描边、宽柔光与玻璃带统一使用这一范围。
- 顶部右侧圆角连到 x1354 的内侧细线，取消贯穿外侧的顶沿。
- 两页主面板原有实体填充隐藏，原 Or-Ai/Glass panel 效果移除；等色、等透明度底色放在环境光矢量层内，最右侧14px透明过渡，避免底色或阴影造成另一条长线。
- 新轮廓：答题页612:183，反馈页612:211。新环境底色：答题页612:253，反馈页618:268。画板和正文链接不变。
- 最新实际导出：option-grid-answer-outer-fade-preview.png、option-grid-feedback-outer-fade-preview.png；其他预览文件与 .fig 备份也已更新。
