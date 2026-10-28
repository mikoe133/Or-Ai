# 隔离验收页的 Cookie 主机边界

2026-10-28。复核发现原夹具和开发站均使用127.0.0.1，仅端口不同，而orai_session/orai_csrf是同名host-only Cookie；端口不构成Cookie隔离。这是测试隔离遗漏。业务TEST库和文件隔离并不自动保证浏览器会话隔离，不能声称原127浏览器会话从未受影响；原批次记录保留原事实，不追写。

RED检查点0679146：保持原127行为时，新断言要求独立保留loopback主机，实际127.0.0.1导致1失败/1通过。

GREEN：uiFixtureOrigin使用Node内置randomUUID，为每次运行产生orai-cua-<uuid>.localhost，仍只绑定127.0.0.1的loopback服务；不改DNS、系统资源、应用生产配置或浏览器安全设置。两个专项测试通过，并接入标准web test命令，由既有CI的pnpm test执行。

实际在既有IAB打开新夹具主机，DNS解析/加载、CSRF和匿名兑换成功。只读取本次主机的Cookie元数据，未保存值；proof.json显示orai_session/orai_csrf的domain均等于本次独立主机。退出自己的测试兑换会话后orai_session消失，页签关闭；fixture收到SIGTERM并确认CLEANED，TEST库/文件/状态已清理。

该修复防止后续夹具继续覆盖开发站或其他运行的同名Cookie；不恢复此前可能被替换的127浏览器状态，也不删除用户Cookie或原数据卷。原开发业务数据未因本项更改。

初次推送包含单独workflow步骤，因现有GitHub OAuth凭据缺workflow scope而被服务端拒绝；随后撤回workflow文件差异，将同样检查纳入已有web test入口，未请求扩大OAuth权限。RED/GREEN及被拒提交均保留历史，不改写检查点。
