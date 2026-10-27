# 社交电量小屋 · 本地试点源内容

本地样例共用一份创作设定，提供六道自我观察题、手记报告文案、宣传封面、静音录屏与引流文案。内容未经量表、正式商品或渠道验收；当前等待新一批 UI 审核。

- `public.json`：公开题干/选项与明确标注的独立报告排版样本。浏览器设计预览只导入此文件，不导入评分配置。
- `sample.mjs`：固定创作设定、现有 dimensions_v1 配置、报告内容与宣传文案；供受保护后台/隔离业务验收使用，不进入消费者包。
- `media/quiet-room-cover.png`：与真实房间和报告共用的等距小屋插画。
- `media/quiet-room-demo.webm`：本机录屏，展示两道题、选择/确认、独立报告排版样例和文案 hook/CTA。视频中的报告明确为固定排版样本，与录屏练习的选择无关。
- `media/storyboard.json` / `media-manifest.json`：实际录屏时序、使用文字、文件大小和摘要。

这是可信源代码中的静态 SVG/DOM/CSS 插画与本地录屏，没有执行平台 Skill 或外部生成模型。实际后台验收会分别上传为 COVER / VIDEO / EXPERIENCE 文件，绑定不可变稿件/发布清单，不直接暴露本机路径。

需要重新制作素材时，先启动当前项目本机 Vite，按 `apps/web/e2e/quiet-room-media.mjs --rehearse` 彩排，再不带该参数录制。使用项目固定 Playwright；录屏所需 FFmpeg 为本机测试依赖，可用 `pnpm exec playwright install ffmpeg` 安装。新文件先输出 `.local/t16-a/media/`，审核后再替换这里的源素材，不自动覆盖已发布历史。

技术/设备/资源预算见 [试点契约](../../prd/v1/QUIET-ROOM-PILOT.md)。当前模板是轻量网页的 2.5D 插画呈现，不包含 Three.js、行为轨迹推断或新评分引擎。
