import { CodexConnectionPlanSchema,codexDomainGrants,type CodexConnectionPlan } from '@orai/contracts/admin';
import type {CodexConnection,CodexPreview,CodexIssued,CodexWorkspace} from './codex-connections-api.js';

export const codexDomainNames={assessment:'题目与报告',cover:'封面图片',video:'宣传视频',copy:'引流文案',experience:'网页与交互'} as const;
export type CodexDomain=keyof typeof codexDomainNames;
export type NamedChoice={id:string;name:string};
export type CodexForm={
  name:string;workspace:CodexWorkspace|null;categories:NamedChoice[];
  maxProjects:number;maxMethodsPerProject:number;maxRunsPerProject:number;expiresLocal:string;
  actions:CodexConnectionPlan['actions'];
  domains:Record<CodexDomain,{enabled:boolean;readSkills:boolean;uploadDrafts:boolean;skills:NamedChoice[]}>;
};
export function shanghaiInput(value:Date|string){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const part=(key:string)=>parts.find(p=>p.type===key)!.value;return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;}
export function expiryIso(local:string){const value=new Date(local+(local.length===16?':00':'')+'+08:00');return Number.isFinite(value.getTime())?value.toISOString():'';}
export function codexDefaults(category?:NamedChoice,now=Date.now()):CodexForm{const domain=(enabled=true)=>({enabled,readSkills:true,uploadDrafts:true,skills:[] as NamedChoice[]});return {name:'我的 Codex',workspace:null,categories:category?[category]:[],
  maxProjects:12,maxMethodsPerProject:8,maxRunsPerProject:20,expiresLocal:shanghaiInput(new Date(now+7*86400_000)),
  actions:{createProjects:false,useSkills:false,uploadDrafts:false},domains:{assessment:domain(),cover:domain(),video:domain(),copy:domain(),experience:domain(false)}};}
export function codexDraftPlan(form:CodexForm):CodexConnectionPlan{return {name:form.name.trim(),
  workspace:form.workspace?{kind:'existing',id:form.workspace.id}:{kind:'new',categoryIds:form.categories.map(c=>c.id),maxProjects:form.maxProjects,maxMethodsPerProject:form.maxMethodsPerProject,maxRunsPerProject:form.maxRunsPerProject},
  actions:{...form.actions},expiresAt:expiryIso(form.expiresLocal),
  domains:(Object.keys(codexDomainNames) as CodexDomain[]).filter(d=>form.domains[d].enabled).map(domain=>({domain,readSkills:form.domains[domain].readSkills,
    uploadDrafts:form.domains[domain].uploadDrafts,skillIds:form.actions.useSkills&&form.domains[domain].readSkills?form.domains[domain].skills.map(s=>s.id):[]}))};}
export function codexFormIssues(form:CodexForm,now=Date.now()):string[]{const issues:string[]=[],plan=codexDraftPlan(form),expires=new Date(plan.expiresAt).getTime();
  if(!form.name.trim())issues.push('请填写连接名称。');
  if(!Object.values(form.actions).some(Boolean))issues.push('请至少选择一项允许的操作。');
  if(!plan.domains.length)issues.push('请至少保留一种内容。');
  if(form.actions.createProjects&&!form.domains.assessment.enabled)issues.push('创建商品项目需要保留题目与报告领域。');
  if(form.actions.uploadDrafts&&(!form.actions.useSkills||plan.domains.some(d=>d.uploadDrafts&&!d.readSkills)))issues.push('上传草稿需要明确允许对应内容使用 Skill，请由你勾选。');
  if(form.workspace&&form.workspace.status!=='active')issues.push('工作区已失效，请重新选择。');
  if(form.workspace&&expires>new Date(form.workspace.expiresAt).getTime())issues.push('连接不能晚于工作区到期时间。');
  if(!Number.isFinite(expires)||expires<=now+60_000||expires>now+90*86400_000)issues.push('到期时间应在 1 分钟至 90 天内（上海时间）。');
  if(!form.workspace){if(!form.categories.length)issues.push('请至少选择一个商品分类。');
    if([form.maxProjects,form.maxMethodsPerProject,form.maxRunsPerProject].some(n=>!Number.isInteger(n)||n<1||n>100))issues.push('商品、方法和批次数量应在 1–100 之间。');}
  if(!issues.length){const parsed=CodexConnectionPlanSchema.safeParse(plan);if(!parsed.success)issues.push(parsed.error.issues[0]?.message??'请重新核对权限范围。');}
  return issues;
}
export function draftCodexSummary(form:CodexForm):CodexPreview['summary']{const plan=codexDraftPlan(form),workspace=form.workspace;
  return {categories:form.categories,sharedSkills:plan.domains.flatMap(d=>d.skillIds.map(id=>({id,domain:d.domain,name:form.domains[d.domain].skills.find(s=>s.id===id)!.name}))),
    existingProjectCount:workspace?.projectCount??0,maxProjects:workspace?.maxProjects??form.maxProjects,
    maxMethodsPerProject:workspace?.maxMethodsPerProject??form.maxMethodsPerProject,maxRunsPerProject:workspace?.maxRunsPerProject??form.maxRunsPerProject,
    workspaceExpiresAt:workspace?.expiresAt??plan.expiresAt,grants:codexDomainGrants(plan),
    canReview:false,canPublish:false,canReadConsumerData:false,canEditSharedSkills:false};}

export function connectionHandoff(connection:CodexConnection,secrets:CodexIssued['secrets']|null){
  if(connection.status!=='active')throw new Error('当前连接不可用于接入，请重新核对状态。');
  if(secrets&&(secrets.length!==connection.credentials.length||connection.credentials.some(c=>!secrets.some(s=>s.credentialId===c.id&&s.domain===c.domain))))throw new Error('一次性连接说明不完整，请先撤销并重新设置。');
  return JSON.stringify({kind:'meetmyworld_local_codex_connection',connectionId:connection.id,workspaceId:connection.workspace.id,
    name:connection.name,expiresAt:connection.expiresAt,transport:'local_stdio',
    note:'各领域分别接入。请在本地安全配置中注入凭据，按本机实际位置填写 Node、MCP 入口和允许的输出目录；不启用日程。',
    command:'<本机 Node 的绝对路径>',args:['<项目绝对路径>/packages/mcp/dist/cli.js'],
    domains:connection.credentials.map(c=>({domain:c.domain,permissions:c.permissions,skillIds:c.skillIds,
      env:{ORAI_MCP_DOMAIN:c.domain,ORAI_MCP_API_URL:'<本机 loopback HTTP API 地址>',ORAI_MCP_ALLOWED_ROOT:'<本领域允许读取的输出目录绝对路径>',
        ORAI_MCP_TOKEN:secrets?secrets.find(s=>s.credentialId===c.id)!.token:'<一次性凭据：仅复制时填入>'}})),
    canReview:false,canPublish:false,canReadConsumerData:false},null,2);
}
