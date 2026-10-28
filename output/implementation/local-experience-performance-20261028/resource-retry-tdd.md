# 带资源重试：RED

实际隔离TEST/CUA中，B有一份已验证JPEG参考图，第一题经常如此已确认保存。切换简化界面→重试后，1200ms仍为fallback，expectedReady=true、actualReady=false，答案仍为often。原始数据见resource-retry-red.json。

源头是图片blob URL在effect cleanup中revoke，但images旧状态仍在重试时传给新场景；新img立即onError又触发回退。新单元用例声明：图片批次必须属于当前attempt/release/重试代次，简化态不展示旧资源。先保留编译RED和浏览器运行RED，未修改宿主。
