# T13 四类 skill 库与商品绑定交接

2026-10-28：04旧方法升级完成本地工具、隔离验收与选定开发对象追加。`pnpm skills:upgrade -- inventory|preview|apply`提供精确来源/修订/摘要的预演和逐项幂等建稿，文件参数必须用绝对路径。四份旧ACTIVE来源已追加v2 DRAFT，原六个版本/四组合/三采用包和三份参考文件字节不变；未审核/启用新稿或重绑。两种体验用途没有旧方法，不虚构已实现能力；05/11按实际规划补专业方法与显式使用。详见[维护说明及验证](../../output/implementation/skill-library-upgrade-20261028/README.md)，以下旧日期记录保持历史。

2026-10-27补充：03项目/采用/发布门禁已完成，固定方法政策、规划、模块与附件，并保存项目定制来源；历史政策不足的方法不能用于新正式发布。04旧库/项目方法升级仍待实施，不因新门禁通过就认定全部旧方法已升级。见[03验证](../../output/implementation/threejs-publication-gates-20261027/verification.md)。

2026-10-27：02服务端政策已完成，当前新写入使用严格manifest v2及productPolicy v1；五库七用途须同时包含共同/专业正文和必填product-plan声明。全局方法不绑定商品ID，实际组合/项目/体验方法才固定v2规划与模块。新建、保存、复制、审核、启用及MCP共用校验，历史v1读取/导出保留；旧版复制须显式提交升级清单。后台可复制补齐、诊断缺项并保留未保存输入。564项、13项自主CUA等证据见[02验证](../../output/implementation/skill-policy-validation-20261027/verification.md)。旧库/示例批量升级留给04，正式发布完整性留给03。

2026-10-26起始批次完成了正文默认值和入口，起始文件见[七用途模板](../../examples/threejs-products/README.md)，规则见[商品实现规范](PRODUCT-IMPLEMENTATION-POLICY.md)。该批本身没有服务端门禁或批量升级；后续02已补服务端政策，04仍持有旧版本升级，T13-A/B历史证据保持。

2026-10-20，本地验收完成。T13.1–.8 全部实现，五用途固定组合、来源与采用包详见 [SKILL-BINDINGS.md](SKILL-BINDINGS.md)。入口为 `/admin/skills/assessment`、`cover`、`video`、`copy`，使用现有真实管理员和私密请求客户端。

2026-10-21：T15-B 可选 `/admin/skills/experience` 的 `scene_design` / `report_presentation` 已验收并获界面批准，方法在体验修订中固定；T16-A 复用固定方法和真实 SDK 制作小屋/手记，新画面单独待审。原四库/五用途组合保持兼容，详见 [体验交接](EXPERIENCE-RUNTIME.md)。这些是平台方法库，不安装或执行个人 Codex Skills。

## 可以怎样使用

1. 进入本领域库，新建稳定标识、名称、说明、风格标签、专业用途和支持形式。assessment 可选择“题目与规则设计”和“报告写作”，其他领域各有自己的用途；同名风格不会把不同库合并。
2. 填写输入/输出规范、Markdown 正文与示例。共同创作设定 `creative-profile` 是必填输入，商品制作需固定设定、五用途组合及必要输入版本；在工作台的「skill 组合」与「制作来源」中选择。
3. 导入 `.md/.txt` 只替换正文，元数据在表单里维护；JSON 可读取历史v1或当前v2 manifest，也可读取平台导出包中的manifest。新写入需补齐v2政策；导入可读不表示可直接用于新制作。当前不承诺通用客户端 skill 包/YAML front matter/ZIP 的自动解析安装，导出 `SKILL.md` 也只包含正文。
4. 先保存 skill，再上传参考资料，指定 `references/guide.md` 等包内相对路径；校验成功后还需保存草稿，才固定版本引用。可上传 UTF-8 Markdown/文本/JSON、PDF、PNG/JPEG/WebP，每份最多 5 MiB，每版本最多 20 个路径、25 MiB 的唯一文件。PDF 校验头尾与字节摘要，不解析全文；图片继续沿用实际图片探测。脚本可以作为 Markdown/文本内容保存，附件不会自动执行、安装或解压。
5. 正文的内部链接须对应已登记参考路径；拒绝绝对路径、上级目录、编码绕过、未登记文件和跨 skill 文件。外部 HTTP(S) 链接只作为文本保存，后台不拉取 URL。页面以文本编辑，不把上传内容作为 HTML 执行。
6. 草稿保存使用预期修订和 requestId，冲突时保留本地文字；保存或放弃后可“读取最新 skill 稿”。未保存内容和待上传附件会阻止切换，刷新有未保存提示，正文不写浏览器持久存储。
7. `DRAFT → REVIEWED → ACTIVE → ARCHIVED`。审核后内容/附件固定，修改需复制新版本；启用另一版时归档原启用版，每个 skill 最多一个 ACTIVE。归档版可读取、比较、下载和复制，不能复活或覆盖。列表分别显示最新稿状态和是否存在已启用版本；“包含版本状态”筛选指拥有该状态的版本，不冒充最新稿的状态。
8. 比较两份固定版本，导出 JSON 清单或 Markdown 正文，参考附件另行授权下载。JSON 含文件 ID/摘要和受保护下载路径，不含操作者 ID、消费者资料、凭据或服务端文件路径。跨环境导入需重新上传参考文件并登记本机 ID；当前没有 ZIP 或跨环境文件映射导入。

已保存文件独立于商品视频/封面用途。新版本复用固定参考文件，不复制同一文件字节；归档和解除关联保留历史及文件元数据。本批没有 skill 附件物理删除入口，原 T12 商品文件清理不会误删 skill 参考资料。

## 本机演示

[温柔观察 · 题目与报告](http://127.0.0.1:5173/admin/skills/assessment?skill=01a1581d-8daf-70d0-b60d-03da40bb0df9&version=01a15846-95a8-772d-b566-5d86b1daea8c) 已有 v1/v2 归档版和 v3 启用版，共用一份实际 Markdown 参考资料。封面、视频、引流文案库也各有一个启用的合成演示方法，方便检查四库维护。

这些方法描述温柔表达、花园意象、具体观察与行动邀请。T13-B 已另建一个未发布的配套演示商品，包含两套组合及两个采用包，第二组题目 v3、报告 v2；来源为人工沿用合成内容后的方法申报，未执行 skill。原 T12“关系花园”内容包、题库、消费者报告及制作来源均保持原样。截图见 [样本说明](../../output/style-skills/README.md)。

## 实现与接口

- `packages/contracts/src/skills.ts`：严格元数据/平台清单、用途/路径/内部引用、版本与文件契约；只从 admin 入口导出。
- `apps/api/src/operations/skills.service.ts`：领域/范围、查询、草稿、并发、生命周期、固定附件、差异/导出。
- `skill-files.service.ts`：专用参考文件状态和属主/范围；复用原 AssetStorage 的独占流式写入、大小/摘要、路径/符号链接保护及 FilesService 的实际文件流。原商品媒体限制没有改成通用文档上传。
- `reference-content.ts`：参考类型、扩展名、UTF-8/JSON/PDF 验证。文件只从受控存储读取，完成/保存/审核/启用时重新检查字节完整性。
- `skills.controller.ts` 与前端 `skills.tsx`、`skills-api.ts`、`skills-model.ts`：现有管理员导航中的四库页面、固定版本和下载。HTTP 详见 [API-CONTRACTS.md](API-CONTRACTS.md#t13-a-skill-库本地已实现)。

T13-A 的第十二份迁移 `20261020020000_style_skill_libraries` 新增 `StyleSkill`、`StyleSkillVersion`、`SkillReferenceFile`、`StyleSkillAttachment` 和状态枚举，该阶段达到 41 模型/12 迁移。复合外键固定 skill/scope；数据库保护领域/稳定标识、单一启用版、审核后正文/附件和文件元数据。触发器固定 `orai` search_path。没有改写已应用的十一份旧迁移，没有 reset/重播 seed。

回退应用时保留新表、引用与文件，停用新入口；数据库问题用向前迁移修复，不删除历史。

## 验证与后续

- `pnpm test:skills`：11 项专项检查全部通过；`pnpm test`：后端 206＋前端 45，共 251 项通过。
- `pnpm test:e2e`：38 项通过，新增四库/正文导入、真实参考附件与刷新下载、复制/比较/启用和归档旧版不变，覆盖桌面与手机。修复保存中选择差异版本被编辑器重载清空的时序，保存期间禁用比较。
- 冻结安装、工具链、类型检查、构建、Prisma 校验、实际 migrate/provision 与 schema diff 均通过，`No difference detected`。
- 原有 15 类业务/内容表迁移前后行数/摘要一致；另外只新增上述 skill 演示及参考文件，没有新商品、订单、权益或消费者报告。实际管理员已读取本机 v2 和旧版选项。
- 集成/浏览器测试使用隔离真实业务库和注入的外部身份事实；11 项完整真实 Auth 流程沿用 T06-O 证据，本轮未重复，不算云认证/远程 MCP 验收。私有日志在 `.local/t13-a/`。

T13-B 已通过五用途绑定、制作来源/采用包与错绑/归档追溯验收（260 项测试、41 项浏览器流程，43 模型/13 迁移），见 [交接](SKILL-BINDINGS.md)。下一批次为 T14-L 机器权限/上传底座。T14 再实现四领域 MCP；本批不运行模型、渲染、自动任务或社交发布，也没有开通云资源。
