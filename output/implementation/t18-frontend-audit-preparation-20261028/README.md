# T18 · 前端源码盘点准备

2026-10-28，源码基线 `802c5e6`。沿用项目[anti-ai-web-design](../../../.agents/skills/anti-ai-web-design/SKILL.md)及任务17中的R/P标准。**本文件是可独立完成的审计准备，不是视觉审计或页面改造通过。** 没有改商城/认证/后台页面，没有新设计稿、全站前后截图、登录或云操作。

## 路由及页面用途

[routes.json](routes.json)记录4份实际路由源码中的42条声明、源文件和行号；含嵌套路由、通配和预览，不称42个独立已验页面。项目工作区/运行/配置部分是已有页面内的组件或查询状态，不创建不存在的独立地址。

| 页面组 | 真实路由/状态 | 最重要的用户任务 | 关键状态及后续夹具 |
| --- | --- | --- | --- |
| 商城与详情 | `/`、`/products/:slug` | 理解商品差异、预览实际交付、取得兑换入口 | 有/无已发布商品、目录读取失败、商品不可售/失效；实际预览素材与固定版本 |
| 兑换/权益/报告入口 | `/redeem`、`/apps`、`/reports` | 兑换、继续体验、找到既有报告 | 无效/已用/撤权/过期、处理中与丢响应、匿名/账户范围、空列表 |
| Three.js体验/报告 | `/attempts/:id`、`/reports/:id` | 观察/选择/确认、读取服务端解释 | A/B各自世界观、未确认/已存、冲突/断网/回退、历史只读、不适用/null；06有合成技术证据 |
| 认证/账户 | `/auth/login`、`register`、`forgot`、`callback`、`reset`及`/account` | 访问或恢复邮箱账户、明确权益绑定 | 未配置、未登录、未验证、已验证普通/管理员、发送冷却/回调失败；本轮不新建持续凭据 |
| 帮助及建设中 | `/help`、`/developers`、`/together`、`/collaborations` | 获取说明，了解真实可用范围 | 建设中内容仍明确不可用，不将展示文案当完成功能 |
| 后台入口/骨架 | `/admin/*` | 在权限内稳定导航与管理 | 未配置/未登录/未验证/非管理员拒绝、首次读取失败、后台刷新失败保留内容、移动导航焦点 |
| 概览与审计 | `/admin` | 理解实际规模/事件/审计明细 | demo/live范围、累计/分布/空值、筛选/分页/失败；实际API数据和图表语义分别核实 |
| 商品/素材/订单 | `/admin/products`、`assets`、`orders` | 版本固定、文件关联、发码及售后 | 草稿/审核/已发布/历史、上传失败/撤权、重复请求/冲突/退款，不用视觉改造改变流程 |
| 内容工作台 | `/admin/content`、`/admin/content/:productId` | 从商品规划到成套交付 | 13页签：project/profile/skills/assessment/experience/result/cover/video/copy/preview/history/adoption/cleanup；保留未保存提示、能力只读与版本选择 |
| Skill五库 | `/admin/skills/:domain` | 固定使用方法、复核新版本 | assessment/experience/cover/video/copy；new/skill/version查询参数、空库、草稿/审核/启用/归档、历史只读/附件/正文规则 |
| Codex连接/配置 | `/admin/machine`、`/admin/machine/configurations` | 明确范围、回读/撤销连接、交接未启用配置 | 首次/已有、确认权限、丢响应同请求核对、一次性秘密、撤销/到期；运行和配置按源码实际入口，不新增权限 |
| 项目/方法/运行 | 内容工作台project页签内 | 规划模块、固定方法、回读产物及恢复说明 | 无/有项目、未保存冲突、依赖回执、旧代次只读、停止/恢复核对；复用各模块隔离夹具 |
| 独立设计预览 | `/preview/*` | 对照既有示例 | 均保留“设计预览/示例”识别，不能替代真实业务截图 |

## 共用组件及改造约束

| 层 | 实际实现 | 保留和后续核对 |
| --- | --- | --- |
| 公共/消费者骨架 | `store/flow-shell.tsx`、`business/workspace-layout.tsx`、`business/shared.tsx` | 最左管理员入口、手机导航、帮助弹窗/焦点、栏内滚动；FlowShell的glow/wireframe/glass层逐页判定，不机械复制到后台 |
| 认证骨架 | `auth/layout.tsx`、`auth/pages.tsx` | 登录后商城跳转、邮箱状态/输入/错误/冷却，保持绑定显式确认 |
| 后台骨架/tokens | `admin/shell.tsx`、`admin/admin.css`及各模块CSS | 现有B「精密工具紫」、196px侧栏/52px顶栏为当前实现而非新设计约定；选中态、内部滚动、焦点/窄屏、scope和身份 |
| 读取/刷新/动作 | `api/query-client.ts`、`admin/refresh-notice.tsx`、`business/shared.tsx` | 已有后台列表短内存缓存、首次失败与后台刷新失败区分、权限失败必须阻断；保留幂等意图和busy/重试状态 |
| 内容/方法/运行 | `admin/content.tsx`、project/skills/production/external-run组件 | 保留固定版本、已保存/未保存、编辑能力、权限和恢复语义；避免用新布局重置输入 |
| 图表 | `admin/overview.tsx`、`overview-charts.tsx`、`overview-model.ts` | 数据来自现有API；审计数值/范围/单位/时间/图例/空态/文本替代，再定图形，不添加伪趋势 |
| 商品宿主 | `experience/host.tsx`、A/B各自renderer/report | 正常商品保持Three.js；DOM辅助与故障回退可用，各商品形式分别规划，维持06预算 |

源码中已存在根Suspense、以pathname+search为key的workspace-view及各模块独立加载/刷新边界；后续以真实慢请求/切页对照核查闪屏与输入保留，不仅凭这些实现断言视觉缺陷。

## 下一批执行顺序

1. 固定与本清单对应的隔离样例/身份和历史只读状态，建立1440/768/390px同数据截图。沿用本地真实Auth夹具时遵守现有权限，不开放绕过入口；数据/素材来源明确标识合成。
2. 基于截图逐页面列3–5个实际问题，再按表达型/任务型路线确定内容主次、tokens和代表方案。当前没有依据不足的“已去AI味”结论。
3. 先共用骨架/状态，再按商城→认证/账户→后台→体验宿主实施。完整实现仍依赖05/06；当前仅完成清单准备。
4. 每批记录前后截图、输入/焦点/滚动/拒绝/历史及适用业务回归，最后把固定发布组合交10真机/公网验证。

T18.4保持未勾选：源码路由/共用组件/状态清单已准备，实际页面基线与逐页视觉问题尚未完成。T18.5–.8亦未执行。
