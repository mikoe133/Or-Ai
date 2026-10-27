import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { purposeDomain, type StyleSkillManifest } from '@orai/contracts/admin';
import { Failure } from '../business/shared.js';
import { projectApi } from './project-api.js';
import { purposeLabels } from './skills-model.js';
import './skill-plan-input.css';

export type SkillPlanChoice = { reference?: { revisionId: string; digest: string }; modules: Record<string,string> };
type Purpose = StyleSkillManifest['purposes'][number];
export function SkillPlanInput({ productId, profileId, form, purposes, value, onChange, disabled = false }:{
  productId: string; profileId: string; form: string; purposes: Purpose[]; value: SkillPlanChoice;
  onChange: (value: SkillPlanChoice) => void; disabled?: boolean;
}) {
  const query = useQuery({ queryKey: ['private','admin','skill-product-plan',productId],
    queryFn: ({signal}) => projectApi.plans(productId,signal), refetchOnWindowFocus: false });
  const current = query.data?.items[0], valid = current?.plan.schemaVersion === 2 && current.creativeProfileRevisionId === profileId;
  const selected = !!current && !!value.reference && current.id === value.reference.revisionId && current.digest === value.reference.digest;
  return <fieldset className="content-block skill-plan-input" disabled={disabled} aria-label="方法的固定商品规划输入">
    <legend>固定商品规划 · 必填输入</legend>
    <p>选择本次制作的规划与模块。保存后固定摘要；规划更新后需重新选择并保存新修订。</p>
    {query.isPending && <p role="status">正在读取商品规划…</p>}
    {query.isError && <Failure error={query.error} retry={() => void query.refetch()} />}
    {!query.isPending && !query.isError && !valid && <p role="status">当前商品尚无与此设定匹配的 v2 规划。请先到项目工作区保存商品规划。</p>}
    <label>商品规划<select aria-label="方法固定商品规划" required value={value.reference?.revisionId ?? ''}
      disabled={query.isPending || query.isError} onChange={event => {
        if (!current || event.target.value !== current.id) { onChange({modules:{}}); return; }
        onChange({reference:{revisionId:current.id,digest:current.digest},modules:Object.fromEntries(purposes.map(purpose => {
          const options = current.modules.filter(module => module.definition.domain === purposeDomain[purpose] &&
            module.definition.methodPurposes.includes(purpose) && module.definition.target.form === form);
          return [purpose,options.length === 1 ? options[0]!.id : ''];
        }))});
      }}>
      <option value="">选择固定商品规划</option>
      {value.reference && !selected && <option value={value.reference.revisionId}>原固定规划（需核对当前修订）</option>}
      {valid && <option value={current.id}>r{current.revision} · {current.plan.title}</option>}
    </select></label>
    {selected && valid && purposes.map(purpose => <label key={purpose}>{purposeLabels[purpose]}对应模块
      <select aria-label={purposeLabels[purpose]+'规划模块'} required value={value.modules[purpose] ?? ''} onChange={event =>
        onChange({...value,modules:{...value.modules,[purpose]:event.target.value}})}>
        <option value="">选择用途与形式匹配的模块</option>
        {current.modules.filter(module => module.definition.domain === purposeDomain[purpose] && module.definition.methodPurposes.includes(purpose) &&
          module.definition.target.form === form).map(module => <option key={module.id} value={module.id}>{module.definition.title} · {module.definition.target.form}</option>)}
      </select></label>)}
    {selected && current && <small className="skill-plan-digest">规划摘要：{current.digest}</small>}
    <div className="biz-row"><button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>刷新可选规划</button>
      <Link to={`/admin/content/${productId}?tab=project`}>查看项目工作区</Link></div>
  </fieldset>;
}
