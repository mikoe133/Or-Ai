# MeetMyWorld Logo

设计日期：2026-10-13。

沿用项目 Figma 页面里的深色底、淡紫色强调、圆润曲线与 Manrope 字体。开放圆环表达个人世界；内部 W 曲线取自 World，也是一条探索路径；开口旁的小圆点代表进入这个世界的自己。字标使用小写 meetmyworld，突出 my。

## Figma

[03 · MeetMyWorld 品牌](https://www.figma.com/design/TluUhd92v2Z2HztvQeGqxe?node-id=127-441)

- 品牌视觉与应用：画板 132:442，1600 × 1160。
- Logo 源素材：画板 133:640，1600 × 620。
- 图形已导入为可编辑矢量；源素材区包含 Manrope Bold 原生文字图层。

## 文件用途

| 文件 | 用途 |
| --- | --- |
| logo-horizontal.svg / .png | 深色背景的主标，透明背景 |
| logo-horizontal-dark.svg / .png | 浅色背景的深紫主标，透明背景 |
| logo-horizontal-white.svg / logo-horizontal-black.svg | 单色标识 |
| logo-editable-text.svg | 修改字标文字的源文件，依赖 Manrope Bold |
| mark.svg / .png | 独立图形，透明背景 |
| mark-dark.svg / mark-white.svg / mark-black.svg | 独立图形颜色版本 |
| favicon.svg / favicon-16～64.png / favicon.ico | 浏览器标签页图标 |
| app-icon.svg / .png | 512 × 512 应用图标 |
| brand-board.svg / .png | 品牌展示板与界面应用示例 |
| logo-assets.svg / .png | 各版本源素材合集 |

正式使用优先选择 logo-horizontal 系列 SVG：字母已转为路径，不依赖设备字体。需要修改名称时使用 logo-editable-text.svg 或 Figma 源素材里的 Editable-meetmyworld 文字图层。Manrope 字体和 SIL Open Font License 位于 fonts 文件夹。

## 颜色与尺寸

- 主色：#D8AFE9；浅色底主色：#8250A5。
- 深色底：#101118；表面色：#191B24；字标浅色：#F7F3FB。
- 辅助色：#E9E1F9、#DDF2EC。
- 导航栏建议图形尺寸 28～32 px，独立图形建议至少 24 px。
- favicon 提供 16、32、48、64 px 固定尺寸。
- 图形四周建议至少留出图形宽度的 1/4；保持整体比例缩放。

## 网站图标示例

将 favicon 文件放到网站静态目录后，在 HTML head 中添加：

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" href="/favicon.ico">
```

build-logo.py 可重新生成矢量源文件，需要 Python fonttools。PNG 是对应 SVG 的渲染结果。
