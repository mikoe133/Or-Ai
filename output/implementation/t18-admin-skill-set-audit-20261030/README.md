# T18 · 商品 Skill 组合续审（尚未修复）

2026-10-30。只读审计 `content-skills.tsx` 后，用沿用的无凭据TEST响应替身实际复现：`GET /api/admin/skills/assessment/candidates` 返回403两次，商品组合说明仍可编辑，输入仍显示。[RED与实际请求](red-candidate-denial.json)、[手机截图](candidate-denial-390.jpg)、[DOM](candidate-denial-390.txt)。

这是商品内部的五用途组合编辑器，与已完成代表状态验收的独立Skill库不同。未关联真实方法、没有提交组合，没有改动该源码；合成输入已通过“放弃组合修改”清空，控制恢复。其余候选接口在此替身返回404，不能以此样例验证正常候选/保存或完整组合业务。

下一子批次需先补精确合成候选/组合历史响应，再修权限隐藏/全部重读门禁、普通刷新草稿保留、未知保存原请求和历史选择，按1440/768/390及适用交互回归。现有 `SkillSetEditor` 在 `sets.isError` 时卸载 `BindingForm`、并以最新组合ID作为key，存在丢稿路径；这是源码发现，尚未取得该路径的浏览器RED，不冒称已复现或修复。

本记录保持 `content-skills` 为局部未完成，不归档成已完成任务；整套预览、采用、媒体引用、历史明细等缺口仍由最新矩阵持有。
