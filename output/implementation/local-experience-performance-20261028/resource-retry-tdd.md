# 带资源重试：RED

实际隔离TEST/CUA中，B有一份已验证JPEG参考图，第一题经常如此已确认保存。切换简化界面→重试后，1200ms仍为fallback，expectedReady=true、actualReady=false，答案仍为often。原始数据见resource-retry-red.json。

GREEN（2026-10-28）：图片批次绑定attempt/release/retry generation，简化态及旧身份不再暴露已撤销URL；新的异步加载仅进入对应批次。web 107项与生产构建通过；同一隔离TEST、同一JPEG和often已存答案，CUA实际切换简化→重试后为ready、imageLoaded=true、selected=[often]，见resource-retry-green.json及截图。编译/测试/构建日志在本机忽略目录.local/t16-c4-performance-20261028。此修复不改变历史答卷或报告。

源头是图片blob URL在effect cleanup中revoke，但images旧状态仍在重试时传给新场景；新img立即onError又触发回退。新单元用例声明：图片批次必须属于当前attempt/release/重试代次，简化态不展示旧资源。先保留编译RED和浏览器运行RED，未修改宿主。
