# T18 商品/内容目录与工作台子批次验收

2026-10-29。最终源码摘要、命令结果和清理状态见[verification.json](verification.json)。此为后台独立技术子批次，父任务17/T18未完成。

| 检查 | 实际结果 |
| --- | --- |
| 缓存刷新RED→GREEN | 415a353上缓存5行被清空；修改后保留5行与未提交搜索文本，重试恢复 |
| 前端自动测试 | 111项＋2项夹具隔离检查全通过，含后台恢复导航、旧目录标注、关键能力警告仍在折叠区外 |
| 类型/构建 | pnpm --filter @orai/web build通过；已有Three.js模块>500kB提示保持，未调高阈值 |
| 页面/布局 | 六类表面×三视口的18组前后比较；原主要标题、无整页横向溢出，三个历史SHA文本比较不变 |
| 交互/状态 | 36项最终CUA通过：缓存/输入/重试、等待期禁用、返回/清除、三尺寸加载/503失败/空态、模拟403/409、真实TEST成员403和退出401、未保存设定/离开保护、固定版本门禁、对比度与减少动态 |
| 对比度样本 | 六个调整区域文字/状态样本均≥4.5:1，最低7.16:1；不是全站WCAG认证 |
| 清理 | 两个TEST身份已退出，Fetch/网络/media/viewport复原，自己的页签关闭；fixture收到CLEANED、私有状态删除，原五容器healthy |

前后索引：[before/index.json](before/index.json)、[after/index.json](after/index.json)，量化比较见[layout-comparison.json](layout-comparison.json)。桌面模拟尺寸为1440×1000、768×1024、390×844；没有据此关闭公网/手机真机范围。

[36项实际检查](interaction-checks.json)明确区分模拟响应和真实TEST API。HTTP故障只注入自己的非Document Fetch请求，不改真实角色或生产授权。最终操作保护覆盖未保存设定跨栏目保留/离开阻止/放弃恢复，以及已发布配置不可覆盖；后续仍需其他后台页面和完整边缘状态。

代表图：[目录](after/products-list-1440.png)、[工作台](after/content-profile-1440.png)、[手机历史](after/content-history-390.png)、[初次失败](states/failure-390.png)、[冲突草稿](states/conflict-390.png)。最后浏览器验证后未再改UI源码；sourceSha256固定实际实现。未写商城页面或共享消费者反馈组件，没有把截图记成商城审核通过。

原始工具采样失败、请求取消和初始网络拦截设置问题在README及probe-attempts说明，不冒充产品回归失败或成功。任务13/14暂停、05/06依赖、真实云/费用/凭据/定时/发布/交易边界保持。
