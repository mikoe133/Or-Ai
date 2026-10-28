# 06 · A 内存保留对照（调查中）

2026-10-28，应用基线0b8de30。新隔离TEST，当前桌面IAB Chromium；启动前memory_pressure余量56%、Docker余量1,858,727,936 B、原五容器healthy。不新建镜像、不改系统资源、不强迫分配内存；原批次保留。

## 已执行

- A/B × 探针开/关 × 每循环AX快照开/关，共8组，每组20次（5预热＋15观察），共160次。关闭探针用CDP阻断测试脚本，实际确认window.__oraiPerformance不存在；生产JS/CSS字节保持。
- 页面内document/window监听器即时读取成功，各组卸载后visibilitychange恒1；附着节点恒243。开启探针的四组最终20 contexts全部lost、pending RAF=0，快照序列化体积约23KB。
- A四组100个弱引用目标（20 canvas＋80选项）仍全部存活，B末段通常只剩最后5个。A在无探针、无逐轮AX时也增长；不能把原疑点归因于这两项工具开销。自然堆下降不是GC类型证明。
- 再直接调用相同生产bundle的mountGarden/mountAtlas，排除React宿主，各20次：A100个弱引用仍存活，B在对象查询后为0。查询canvas总数含该文档此前A对象，不当作本轮新增数。
- 额外20次A直接装卸在dispose后清空canvas宽高，仍保留100目标；该假设未解决问题，没有据此改生产代码。
- MQL对象查询为0、ResizeObserver为2；清理当前隔离页调试控制台未解除保留。上述计数不是完整保留路径。

原始8组和[summary.json](summary.json)、direct-a/b.json、zero-canvas-control/direct-a.json均保存；collector.js是CUA REPL采样逻辑，不是独立浏览器客户端。

## 新确认的工具能力

Runtime.queryObjects和releaseObjectGroup实际支持，canvas原型查询返回20个旧canvas；所有查询组均释放。另以无实例的新原型、两个正常timeout任务进行查询，避免查询结果自身持有DOM；旧A目标仍存活。HeapProfiler.enable/takeHeapSnapshot仍被当前raw CDP拒绝，Browser.getVersion亦不支持；UA是Chrome/156.0.0.0。

查阅时的[V8 inspector](https://raw.githubusercontent.com/v8/v8/main/src/inspector/v8-debugger.cc)把该查询交给HeapProfiler.QueryObjects；[V8实现](https://raw.githubusercontent.com/v8/v8/main/src/profiler/heap-profiler.cc)在对象迭代前执行CollectAllAvailableGarbage。这是新确认的查询/引擎GC路径；精确宿主V8版本不可得，不把main源码当本宿主的精确构建证明，也不把原160次自然样本追记为已强制GC。原HeapProfiler.collectGarbage不可用的记录保持原时间点事实。

A对象保留已在多种对照中复现，尚未取得从GC root到canvas的完整保留链。当前不能判定无泄漏、关闭原GC后堆阈值或随意修改清理代码；具体后续为使用支持完整heap snapshot/retainer inspection的同版本浏览器工具定位根。真实hidden/visible亦保持原待验，不造事件替代。

## 本轮退出事实

总计220次有界装卸（160主对照＋40直接renderer＋20清尺寸假设）。没有把弱引用存活直接等同于已查明产品泄漏，也没有用探针约23KB就推出所有工具包装都无影响。已排除“只由React宿主/自有探针/逐轮AX造成”的简单解释；引擎/原生对象或剩余工具包装的根仍未取得。

随后独立完成[T18根加载修复与页面基线](../t18-frontend-baseline-20261028/verification.md)，不因06限制停下所有工作。清理本轮TEST和资源文件，fixture正常SIGTERM退出，日志确认CLEANED，含测试码状态文件移除；临时阻断/网络/缓存/Performance/视口均恢复、自己的页签关闭。末次内存余量46%、Docker可用1,858,715,648 B、原5容器healthy，没有删除原卷或修改系统资源。
