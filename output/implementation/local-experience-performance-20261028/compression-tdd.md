# 静态传输压缩：RED

2026-10-28。实际A冷缓存/5Mbps/100ms/CPU4倍样本，first usable frame约3770ms，超过原3000ms目标；transfer约1.79MB，未放宽预算。

`ORAI_VPS_WEB_IMAGE=orai-web:vps-local node --test scripts/test/vps-routing-protocol.test.mjs` 实际在隔离网络、非root/read-only Nginx1.28.3验证，HTTP服务正常，公共JS协商gzip断言失败：实际Content-Encoding缺失，预期gzip。这是有效运行RED，尚未修改生产路由。

测试改为用已缓存镜像及本轮专用临时卷准备配置/证书，不构建镜像。早先只读rootfs复制、临时卷证书路径等夹具错误日志另留`.local/t16-c4-performance-20261028/compression-*-failure*.log`，不计为业务RED；失败容器/网络/本轮卷均finally清理，没有删除原镜像或数据卷。

## GREEN

生产Nginx配置为公共静态响应启用协商gzip（level6/min1024/Vary），私密`/api/`继续明确gzip off。重跑同一真实Nginx目标及路由单元测试，4/4通过：实际gzip头、gunzip后字节一致、不支持gzip的客户端仍读原文、大私密JSON不压缩、视频Range字节及no-store保持。测量入口也采用相同压缩等级/类型，不把压缩后的样本冒称压缩前行为；首帧改善仍须实际复测。
