# 托管 CI run40524842978：原断言待取

日期：2026-10-28（Asia/Shanghai）。关联旧提交 `1c95644d28bc4f7066d5e0cbb81c92231aa601fe`，[run/job](https://github.com/mikoe133/Or-Ai/actions/runs/40524842978/job/122261470135)。

网页可见类型、构建、迁移步骤通过，`pnpm test`失败，后续镜像/smoke跳过。最初日志获取受403限流，reset后仍返回 `403 Must have admin rights to Repository`；gh无有效登录，浏览器未登录，未获得失败测试名/断言/堆栈。已请求可访问的原始失败片段，目前待提供；不创建新token、不更改权限或绕过访问。

## 已有诊断证据

| 对照 | 事实与限制 |
| --- | --- |
| 同一旧提交本机 | CI式无Supabase Auth、随机CSRF配置下581项通过；不是托管runner |
| Linux amd64模拟 | 本机Colima仅1.913 GiB，编译/部分进程OOM或SIGKILL；该资源约束不能认定为云端失败根因 |
| 原生Linux arm64 | 同一旧提交的已编译JS，2CPU、每进程heap512MiB、串行测试文件，API460＋web101＋MCP20＝581通过；没有Linux重新编译，也不是amd64完全等价复现 |
| Task04新代码 | 当前594项本地通过，独立于上述旧run；不能拿新代码本地结果冒充托管修复 |

私有日志保留在 `.local/ci-40524842978/`：`original-fetch.err`、`local-ci-environment.log`、`native-test.log`及模拟运行失败记录。诊断使用独立TEST库；临时容器/镜像和核实后的六个自建TEST库均已清理，没有改变原数据库/Auth服务或Docker安全配置。

## 当前结论与下一步

原失败的具体测试与根因尚未确定，此项保持未闭合。后续正常提交推送后核对新的CI结果，仍按其实际版本记录；若新run失败，以可访问的原始日志修复。未因调查新增PR、调用真实云资源或调整账户权限。
