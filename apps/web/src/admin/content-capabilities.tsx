import type { ProductCapabilities } from '@orai/contracts/admin';
import type { Profile } from './content-api.js';

const stateNames = { compatible: '组合兼容', needs_profile: '待固定设定', blocked: '方案待适配' } as const;
export function ContentCapabilities({ value, selectedProfile, fixedProfile, hasVersion }: {
  value: ProductCapabilities; selectedProfile?: Profile; fixedProfile?: Profile; hasVersion: boolean;
}) {
  const mismatch = value.profileBinding === 'fixed' && selectedProfile && value.profileRevisionId && selectedProfile.id !== value.profileRevisionId;
  return <section className="content-capabilities" aria-label="商品能力与制作范围">
    <header><div><span className="content-eyebrow">CAPABILITIES / V{value.schemaVersion}</span><h3>商品能力与制作范围</h3></div>
      <span className="content-badge">{value.status === 'compatible' && value.basis === 'creative_profile' ? '设定可适配' : stateNames[value.status]}</span></header>
    <p className="content-capability-caption">{hasVersion ? '以下依据此版本在服务器保存的配置。未保存的模板调整，以编辑区为准。' : '以下依据当前创作设定。建立版本前可先确认制作范围。'}</p>
    <dl className="content-capability-flow">
      <div><dt><span>01</span> 商品内容</dt><dd>{hasVersion ? '单选题目与评估规则' : value.modules.content === 'planned' ? '专属内容编辑器待开发' : '可建立单选内容版本'}</dd></div>
      <div><dt><span>02</span> 体验设计</dt><dd>{value.selected?.label ?? (hasVersion ? '未注册的模板组合' : '待选择已注册模板')}</dd></div>
      <div><dt><span>03</span> 结果交付</dt><dd>{value.selected?.reportLabel ?? '当前协议：标准图文结果'}</dd></div>
    </dl>
    {hasVersion && value.profileBinding === 'candidate' && <p className="content-capability-caption">当前设定为候选修订，保存体验草稿时才会固定到此内容版本。</p>}
    {mismatch && <p className="content-note">此内容版本固定使用{fixedProfile ? `设定 r${fixedProfile.revision}「${fixedProfile.profile.title}」` : '其原有创作设定'}。
      当前选择的设定用于新传播稿件；不会替换此版本的体验与结果。</p>}
    {value.issues.length > 0 && <ul className="content-capability-issues">{value.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
    <details><summary>查看支持范围与后续形式</summary>
      <p className="content-note">兼容说明用于选择制作模块。审核、资源校验和发布仍需分别完成；创作形式与上传文件不会自动启用新的玩法。</p>
      <div className="content-capability-table-wrap"><table><caption>当前已注册组合</caption>
        <thead><tr><th scope="col">体验 / 结果</th><th scope="col">玩法</th><th scope="col">资源预算</th></tr></thead>
        <tbody>{value.registered.map(template => <tr key={template.renderer}>
          <td>{template.label}<small>{template.reportLabel}</small></td>
          <td>明确确认的单选<small>每题最多 {template.limits.maxOptions} 个选项</small></td>
          <td>最多 {template.limits.maxResources} 张图片<small>单张 ≤ {template.limits.maxResourceBytes / 1024} KiB · 合计 ≤ {template.limits.maxTotalResourceBytes / 1024 / 1024} MiB</small></td>
        </tr>)}</tbody></table></div>
      <dl className="content-capability-plans">{value.planned.map(item => <div key={item.key}><dt>{item.label}<span>待开发</span></dt><dd>{item.reason}</dd></div>)}</dl>
      <p className="content-note">安静小屋支持 2.5D 插画；静心花园支持内置几何体的 3D 单选。两者沿用现有评估协议。真正的剧情、关卡与自由探索仍需各自的内容和状态协议。</p>
      <p className="content-capability-protocol">内容协议 single_choice_v1 · 评估 dimensions_v1 · 结果 report_content_v1</p>
    </details>
  </section>;
}
