# T10.6 本地网络与空缓存补测

2026-10-23。本批新增5个独立情境、5张截图，通过。原T10-L的33情境/45图、511项及O4记录保持封存，不重复声称重跑。产品代码和默认契约未改，新图为自主验收，不记为用户批准。

使用生产构建的临时Vite preview、新TEST进程中的Nest实例和隔离数据库；Chrome CDP对浏览器设置延迟250ms、下载131072字节/秒、上传65536字节/秒。每个初访使用新context/空Storage，清空并禁用HTTP缓存，禁用service worker，记录请求/响应、传输字节和缓存来源，实际缓存命中0。完整数据见[verification.json](verification.json)。

通过：桌面空缓存首次进入真实商品、390px独立空缓存初访、离线首次导航真实失败并在重连后手动重试、离线保存未写入、重连保存一次及慢速刷新恢复已保存答案。新Nest实例就绪85ms、生产构建727ms、preview启动8ms；受控限速下桌面首次商品约5111ms、手机约3864ms，仅是本次本机记录，不是性能SLO或云端结果。

首轮断言误以为离线已发出两次PUT；记录表明未取得CSRF时离线阻断了前置读取，没有发送PUT。最终断言明确检查离线PUT0/服务端答案不变、重连PUT1/答案新增1及刷新回读一致。已传输PUT的同requestId重试沿用原T10-L已封存证据，不用本次未发出的请求伪造重试证据。初始失败日志独立留存。

[桌面初访](desktop-cold-throttled-product.png)、[手机初访](mobile-cold-throttled-product.png)、[首次离线恢复](mobile-offline-first-visit-recovered.png)、[离线未保存](mobile-offline-save-unsaved.png)、[刷新已保存](mobile-slow-reload-saved-checkpoint.png)。离线与保存两张手机图已自主目视。

APIRequestContext旁路限速的读取仅核对真实TEST服务器状态；浏览器流量才应用CDP限速。没有真实Auth/模型/内容生成或外部请求。这里只验证新浏览器JS上下文、空HTTP缓存、全新本地服务实例与本地生产preview；没有清空OS文件缓存或冷却数据库，不冒称云容器/VM冷启动、真实手机、内置浏览器、国内三网或公网验收。T10.6/T10-V整体仍未关闭。

最终计量区分HTTP请求与Chrome离线错误页的data:内置资源：真实HTTP缓存信号0，浏览器内部图片的缓存信号另记，不把内置图片或base64正文算作网络传输/缓存。修正后5情境再次通过，先前计量与核对记录保留。
