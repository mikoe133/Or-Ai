# T12-C 引用、复查与成套采用交接

2026-10-20，本地验收完成，T12-A/B/C 全部通过。入口为 `/admin/content/:productId` 的“引用与历史”“成套采用”“文件清理”页签。沿用现有真实管理员、Cookie、Origin/CSRF、限流、范围隔离和私密缓存规则。

## 可以怎样使用

1. 在封面、文案或视频稿中点击“添加题目或文案引用”，选择同一设定下的固定题目、文案块、封面或分镜，指定使用位置和原文/改写。后台保存原文快照、实际使用文字、修订和摘要；缩写视频题干不会改动原题。
2. 在“引用与历史”查看所选修订使用了哪些输入、被哪些稿件使用，并跳转到相关修订。差异按稳定 questionId/blockId/sceneId/sectionId 对齐，顺序变化单独显示；超过 500 项明确提示截断。创作设定也可以比较历史。
3. 上游内容或共同设定更新时，相关稿件显示待复查，旧成品和采用包保持不变。阅读影响清单后可填写理由，确认继续使用合法旧稿。复查固定当时的影响 fingerprint；上游再变化会重新待复查，归档输入不能靠复查绕过。
4. 在“成套采用”选择已审核题库、已就绪的封面/视频/文案修订，校验兼容性、来源、引用、实际文件和未处理更新。人工核对语气、意象、情绪/理解目标与传播承诺，再保存固定采用包。未保存的编辑会阻止采用；采用不会发布商品或发放权益。
5. 查看固定包并导出 JSON。清单包含商品/设定、完整题库与兼容报告模板、主题、宣传内容、完整依赖、制作来源、原文/改写快照、文件摘要及复查说明。媒体使用受保护的文件引用，在各稿件中另行授权下载；当前没有 ZIP 导出。清单不含消费者答卷、个人报告、账户凭据或本地存储路径。
6. “文件清理”仅列出过期且没有当前素材或任何历史修订引用的文件。先预演，核对固定清单并明确确认，才执行物理清理。预演有效期十分钟；执行时重新检查引用，新增引用的文件会保留。失败可重试，刷新可用 URL 中的计划 ID 恢复，同一计划不重复追加清理审计。

当前采用只支持单人 `web`、`dimensions_v1` 和 `compatible_standard` 图文报告。双方、卡片、2.5D/3D、小游戏及新的报告叙事仍是创作方案，运行和发布兼容性留 T15–T17。该批次 skill 来源为空；后续 T13-A/B 已完成 [四库](STYLE-SKILLS.md) 和 [五用途绑定/来源](SKILL-BINDINGS.md)，新绑定包使用 v2；MCP 和每日任务调度仍待实现。

## 本机演示入口

[关系花园 · 内容制作演示](http://127.0.0.1:5173/admin/content/01a157f3-3f92-77db-8967-0d27328e3eb6?version=01a157f3-3fcf-704d-8cca-1706f9d52a2a&profile=01a157f3-3fed-768f-9f0b-f373cf84150d&tab=adoption) 已保存到本机 DEMO 业务库，真实管理员可操作。商品未发布，没有消费者订单或权益；题库已审核，三份宣传稿已就绪，并保存第 1 个采用包。

这套演示以“温柔、具体地表达自己的需要”为目标，采用花园意象。实际 640×360 WebM 视频约 8.6 秒，固定引用两道题、hook、CTA 和封面共五项，第一题明确记录为改写。封面/视频均在 API 使用的受控存储目录中校验。制作来源为人工演示，batchKey 为 `t12-garden-demo`，没有申报执行 skill 或 MCP。

先查看“成套采用”中的“查看固定包”，再到“视频与分镜”打开 `garden-video` 检查输入。演示媒体和实际后台截图见 [交付样本](../../output/content-adoption/README.md)。可以修改演示文案验证复查提示；不要为试用清理而删除已有业务文件。

## 实现与接口

契约在 `packages/contracts/src/content-workflow.ts`，只通过 admin 入口导出。后端在 `apps/api/src/operations/content-workflow.service.ts`、`content-packages.service.ts`、`file-cleanup.service.ts`，HTTP 在 `content.controller.ts`；前端对应 `content-references.tsx`、`content-history.tsx`、`content-adoption.tsx`、`content-cleanup.tsx`，客户端为 `workflow-api.ts`。

接口完整列表见 [API-CONTRACTS.md](API-CONTRACTS.md#t12-内容后台本地已实现)。采用写入事务内重新检查 fingerprint 和包序号；既有 API/维护 CLI 的内容变更共用数据库商品级锁。依赖最多追踪 1000 个节点，超限拒绝采用。审核/就绪状态切换保留历史，但不作为内容语义更新；题库仅在配置未变时将来源复制到新的审核/发布状态修订，改配置后需重新登记来源。

第十一份向前迁移为 `20261020010000_content_adoption_and_cleanup`，增加 `ContentReviewRecord`、`ContentPackage`、`ContentPackageItem`、`FileCleanupPlan`，共 37 模型/11 迁移。历史复查和采用包只追加，复合外键约束商品/scope，文件清理使用 `DELETING → DELETED`，保留不可变元数据，禁止复活。新增历史引用时锁定文件，防止引用与清理竞态；运行账号无历史改写和文件/计划删除权限。

完整回归还暴露了原结果汇总首次初始化的并发唯一键竞态。`runtime/stat-contributions.service.ts` 现在按版本持有事务锁后再初始化和累加，评分、消费次数及报告规则保持原义。

## 验证证据与边界

- `pnpm test`：后端 195、前端 43，共 238 项通过。
- `pnpm test:e2e`：35 项浏览器流程通过，包括真实媒体、五项引用、原文/改写、采用/导出、上游更新/复查、旧包不变、清理预演恢复和文件保护。
- `pnpm typecheck`、`pnpm build`、冻结安装、`pnpm db:validate`、实际迁移/provision 和 schema diff 均通过；schema 为 `No difference detected`。
- 迁移前后六类原业务表行数/摘要一致。之后独立新增上述未发布演示商品、一个版本和三份素材；排除这组新增记录后原六表摘要仍一致，没有 reset 或重播 seed。随机测试库残留为零，API/Vite ready 为 200，新接口未登录为 401。
- 浏览器回归使用隔离业务库和明确注入的身份事实；实际本机管理员另行读取了演示采用包，并播放了导入的实际视频。11 项完整真实 Auth 流程沿用 T06-O 证据，本轮未重复，不代表云 Auth 或远程 MCP 已通过。
- 物理清理只在隔离测试目录验证，没有清理真实本机业务文件。私有日志/结果在 `.local/t12-c/`，截图与媒体在 `output/content-adoption/`。

后续 T13-A/B 的 [四库](STYLE-SKILLS.md) 与 [五用途绑定](SKILL-BINDINGS.md) 已完成；下一批次为 T14-L 四领域 MCP。云端对象存储/HTTPS 留 T09；本轮没有创建定时任务、云资源或对外发布。
