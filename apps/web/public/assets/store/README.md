# 商城主页素材

对应 Figma 文件 `TluUhd92v2Z2HztvQeGqxe`，桌面采用 `40:371`（2026-10-14 间距调整后），手机参考 `74:466`。

- 四张主推插图、手机头像、原始轮廓与光效 SVG：从 `output/figma` 原样复制。
- `mini-*.svg`：复用 `output/figma/helpers.js` 中四份原始 `ART` 定义，对应最新上架的小封面。
- `icons/*.svg`：复用原始主页和手机稿的图标定义。
- `ambient-orbits.svg`：复用 `output/figma/composition.js` 的背景渐变定义；2026-10-15 按用户参考图重做网格时，移除了旧的页脚椭圆线条。
- `glass-tint-transparent-right.svg`：保留原材质渐变与右侧裁切，移除了旧的球形椭圆和直横线。新的上下弧面网格由 `perspective-wireframe.tsx` 独立绘制；`output/figma` 下的历史导出未修改。
- `mobile-atmosphere.svg`：复用手机稿源代码的背景与网格，未包含文字、控件或卡片。
- `mobile-account-mark.svg`、`mobile-notification.svg`、`icons/search-star.svg`：复用 `build-mobile-svg.py` 中手机稿原始图形定义，保留手机稿的 Or-Ai 标识、通知和搜索装饰。
- Manrope：复用现有品牌包，许可见 `fonts/OFL.txt`。
- Noto Sans SC：从 Google Fonts 下载 Regular / Medium / Bold 的中文文字子集，许可见 `fonts/NotoSansSC-OFL.txt`。新增文案若包含未收录字形，浏览器会回退到系统中文字体。

SVG 保留根尺寸，通过外层容器调整布局；没有把完整 UI 截图作为网页素材。首页所有字体和图片均从本地提供。`output/implementation/homepage` 保存双端预览和素材检查结果。

2026-10-15 的背景动效通过 `ambient-glows.tsx` 原样内联 `green-floor-glow.svg` 和 `multicolor-corner-glow.svg`，只移动原有光斑组，保持 SVG 根尺寸和画布边界固定；原始文件未修改。左侧白光继续使用原始外部 SVG，只做垂直平移。

按 Figma 手机稿完善后的截图、布局尺寸与响应式检查保存在 `output/implementation/homepage/mobile-figma`。

2026-10-15 的网格重做依据用户附图：细曲线、透视压缩、边缘渐隐。后续按用户区域标注，将两组调整为同一区域内上下等大的镜像，共用时钟并朝中间水平对称轴内转。材质渐变和已有三处光效保留，当前动效与验证记录在 `output/implementation/homepage/mirrored-mesh`，上一版记录保留在 `perspective-mesh`。
