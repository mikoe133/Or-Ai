import {z} from 'zod';
import {IdSchema,TimestampSchema,PageSchema,KeySchema,DataScopeSchema} from './shared.js';
import {ProductionDomainSchema} from './content-domain.js';
import {SkillPurposeSchema} from './skills.js';
import {ProjectHandoffInputSchema} from './project-method-operations.js';

const id=IdSchema.toLowerCase(),digest=z.string().regex(/^[0-9a-f]{64}$/),text=(max:number)=>z.string().trim().min(1).max(max);
const nullableNumber=(min:number,max:number)=>z.number().int().min(min).max(max).nullable();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time=z.string().regex(/^\d{2}:\d{2}$/);
const sourceUrl=z.url({protocol:/^https$/}).max(2048).refine(value=>{const u=new URL(value);return !u.username&&!u.password&&!u.search&&!u.hash;},'来源不能带登录信息、查询串或片段');
export const ExternalConfigurationDependencySchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('waiting'),planModuleId:id}).strict(),
 z.object({kind:z.literal('fixed'),planModuleId:id,recordId:id.nullable(),digest:digest.nullable(),inputs:z.array(ProjectHandoffInputSchema).max(100)}).strict(),
]);
export const ExternalConfigurationModuleSchema=z.object({planModuleId:id,digest,
 methods:z.array(z.object({snapshotId:id,digest,purpose:SkillPurposeSchema}).strict()).max(2),
 dependencies:z.array(ExternalConfigurationDependencySchema).max(39),connectionId:id.nullable()}).strict();
export const ExternalConfigurationLimitsSchema=z.object({maxAttemptsPerModule:nullableNumber(1,10),maxTotalAttempts:nullableNumber(1,400),
 maxConcurrency:nullableNumber(1,8),maxDurationSeconds:nullableNumber(60,86400),maxReportedCostFen:nullableNumber(0,100_000_000),
 maxReportedTokens:nullableNumber(1,100_000_000),unknownCost:z.enum(['stop_and_review']).nullable(),
 stageLimits:z.array(z.object({stage:z.enum(['S3','S4','S5']),maxAttempts:nullableNumber(1,400),maxConcurrency:nullableNumber(1,8),
  maxDurationSeconds:nullableNumber(60,86400),maxReportedCostFen:nullableNumber(0,100_000_000)}).strict()).max(3)}).strict();
export const ExternalRunConfigurationDocumentSchema=z.object({schemaVersion:z.literal(1),name:text(80),workspaceId:id,
 connectionId:id.nullable(),target:z.object({kind:z.enum(['fixed_project','new_topics']),productId:id.nullable(),planRevisionId:id.nullable(),planDigest:digest.nullable()}).strict(),
 client:z.object({kind:z.enum(['codex_desktop','codex_cli']).nullable(),workingDirectory:text(1000).nullable()}).strict(),
 timing:z.object({kind:z.enum(['once','daily','weekly']).nullable(),date:date.nullable(),time:time.nullable(),timeZone:text(80).nullable(),
  until:date.nullable(),weekdays:z.array(z.number().int().min(0).max(6)).max(7),quantity:nullableNumber(1,20),
  missed:z.enum(['skip','manual_review']).nullable(),overlap:z.enum(['skip','manual_review']).nullable()}).strict(),
 sourcing:z.object({basis:z.enum(['manual','evidence']),freshnessWindowHours:nullableNumber(1,720),maxSources:nullableNumber(1,50),maxDurationMinutes:nullableNumber(1,60),
  missing:z.enum(['no_output','manual_review']).nullable(),sources:z.array(z.object({key:KeySchema,region:z.enum(['domestic','international']).nullable(),
   language:text(40).nullable(),name:text(160).nullable(),url:sourceUrl.nullable()}).strict()).max(20)}).strict(),
 orchestration:z.enum(['single','multiple']),modules:z.array(ExternalConfigurationModuleSchema).max(40),
 tools:z.array(z.object({key:KeySchema,name:text(120),provider:text(120).nullable(),domains:z.array(ProductionDomainSchema).min(1).max(5),
  approval:z.enum(['unconfirmed','allowed','not_allowed']),cost:z.enum(['unknown','known']),maxCostFen:nullableNumber(0,100_000_000),
  maxDurationSeconds:nullableNumber(1,86400),maxCalls:nullableNumber(1,10)}).strict()).max(20),limits:ExternalConfigurationLimitsSchema,
 recovery:z.object({unknownJob:z.literal('inspect_original').nullable(),failedModule:z.literal('manual_retry').nullable(),
  pause:z.literal('preserve_and_review').nullable(),resume:z.literal('recheck_all').nullable()}).strict(),
}).strict().superRefine((v,c)=>{
 const problem=(path:(string|number)[],message:string)=>c.addIssue({code:'custom',path,message});
 const unique=(values:unknown[])=>new Set(values).size===values.length;
 for(const [path,values] of [['modules',v.modules.map(m=>m.planModuleId)],['tools',v.tools.map(t=>t.key)],['sources',v.sourcing.sources.map(s=>s.key)],['stages',v.limits.stageLimits.map(s=>s.stage)],['weekdays',v.timing.weekdays]] as const)
  if(!unique([...values]))problem([],path+'不能重复');
 if(v.target.kind==='new_topics'&&(v.target.productId||v.target.planRevisionId||v.target.planDigest||v.modules.length))problem(['target'],'新题目准备不能夹带既有计划或模块引用');
 if(v.modules.length&&!v.target.planRevisionId)problem(['modules'],'模块必须属于明确的固定计划');
 if(v.target.planRevisionId&&(!v.target.productId||!v.target.planDigest))problem(['target'],'固定计划需要商品归属及摘要');
 for(const [index,m] of v.modules.entries()){
  if(!unique(m.methods.map(m=>m.purpose))||!unique(m.methods.map(m=>m.snapshotId)))problem(['modules',index,'methods'],'每个用途最多一份固定方法');
  if(!unique(m.dependencies.map(d=>d.planModuleId)))problem(['modules',index,'dependencies'],'依赖不能重复');
  for(const dependency of m.dependencies)if(dependency.kind==='fixed'&&((dependency.recordId===null)!==(dependency.digest===null)||dependency.recordId===null&&dependency.inputs.length))problem(['modules',index,'dependencies'],'未选定回执时不能携带摘要或片段');
 }
 if(v.client.workingDirectory&&!v.client.workingDirectory.startsWith('/')&&!/^[A-Za-z]:[\\/]/.test(v.client.workingDirectory))problem(['client','workingDirectory'],'工作目录必须是绝对路径；不验证是否存在');
 if(/orai_mcp_[A-Za-z0-9_-]{20,}|\bsk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9_.-]{12,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(JSON.stringify(v)))problem([],'配置不能包含凭据、私钥或控制字符');
 if(JSON.stringify(v).length>250000)problem([],'配置超出大小限制');
});
export type ExternalRunConfigurationDocument=z.infer<typeof ExternalRunConfigurationDocumentSchema>;
export function emptyExternalRunConfiguration(workspaceId:string,name='未命名运行配置'):ExternalRunConfigurationDocument{return {
 schemaVersion:1,name,workspaceId,connectionId:null,target:{kind:'fixed_project',productId:null,planRevisionId:null,planDigest:null},client:{kind:null,workingDirectory:null},
 timing:{kind:null,date:null,time:null,timeZone:null,until:null,weekdays:[],quantity:null,missed:null,overlap:null},
 sourcing:{basis:'manual',freshnessWindowHours:null,maxSources:null,maxDurationMinutes:null,missing:null,sources:[]},orchestration:'single',modules:[],tools:[],
 limits:{maxAttemptsPerModule:null,maxTotalAttempts:null,maxConcurrency:null,maxDurationSeconds:null,maxReportedCostFen:null,maxReportedTokens:null,unknownCost:null,stageLimits:[]},
 recovery:{unknownJob:null,failedModule:null,pause:null,resume:null}};}
export function externalConfigurationTimeCandidates(day:string,clock:string,zone:string):string[]{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^\d{2}:\d{2}$/.test(clock))return [];
 const [y,m,d]=day.split('-').map(Number),[h,min]=clock.split(':').map(Number),naive=Date.UTC(y!,m!-1,d!,h!,min!);
 if(!Number.isFinite(naive)||new Date(naive).toISOString().slice(0,10)!==day||h!>23||min!>59)return [];
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),result:string[]=[];
 for(let offset=-840;offset<=840;offset+=15){const value=new Date(naive+offset*60000),parts=Object.fromEntries(fmt.formatToParts(value).map(p=>[p.type,p.value]));
  if(`${parts.year}-${parts.month}-${parts.day}`===day&&`${parts.hour}:${parts.minute}`===clock)result.push(value.toISOString());}return result;
}
export const ExternalConfigurationIssueSchema=z.object({code:text(80),step:z.number().int().min(0).max(5),message:text(500)}).strict();
export const ExternalConfigurationRevisionSchema=z.object({id,configurationId:id,revision:z.number().int().positive(),digest,document:ExternalRunConfigurationDocumentSchema,
 createdAt:TimestampSchema,enabled:z.literal(false),externalReadiness:z.literal('not_verified')}).strict();
export const ExternalConfigurationSchema=z.object({id,scope:DataScopeSchema,workspaceId:id,currentRevision:z.number().int().positive(),
 revision:ExternalConfigurationRevisionSchema,createdAt:TimestampSchema,enabled:z.literal(false)}).strict();
export const ExternalConfigurationPageSchema=PageSchema(ExternalConfigurationSchema);
export const ExternalConfigurationRevisionPageSchema=PageSchema(ExternalConfigurationRevisionSchema);
export const ExternalConfigurationCreateSchema=z.object({document:ExternalRunConfigurationDocumentSchema,clientKey:id,requestId:id}).strict();
export const ExternalConfigurationSaveSchema=z.object({document:ExternalRunConfigurationDocumentSchema,expectedRevision:z.number().int().positive(),requestId:id}).strict();
export const ExternalConfigurationReadQuerySchema=z.object({revisionId:id.optional()}).strict();
export const ExternalConfigurationValidateSchema=z.object({revisionId:id,expectedDigest:digest}).strict();
export const ExternalConfigurationValidationSchema=z.object({checkedAt:TimestampSchema,configurationId:id,revisionId:id,revision:z.number().int().positive(),
 readyForReview:z.boolean(),digest,issues:z.array(ExternalConfigurationIssueSchema).max(200),
 externalReadiness:z.literal('not_verified'),enabled:z.literal(false),executionStarted:z.literal(false),
 firstDeclaredTime:TimestampSchema.nullable(),scopeSummary:z.object({workspaceName:z.string(),productName:z.string().nullable(),planRevisionId:id.nullable(),moduleCount:z.number().int().nonnegative(),methodCount:z.number().int().nonnegative(),waitingDependencies:z.number().int().nonnegative()}).strict()}).strict();
export const ExternalConfigurationExportSchema=ExternalConfigurationValidateSchema.extend({expectedValidationDigest:digest,consent:z.literal(true),includeWorkingDirectory:z.boolean(),format:z.enum(['json','markdown'])}).strict();
export const ExternalConfigurationManifestSchema=z.object({schemaVersion:z.literal(1),kind:z.literal('external_run_configuration'),reviewMode:z.enum(['incomplete_review','review_only']),
 configurationId:id,revisionId:id,revision:z.number().int().positive(),configurationDigest:digest,validationDigest:digest,document:ExternalRunConfigurationDocumentSchema,
 issues:z.array(ExternalConfigurationIssueSchema).max(200),externalUnverified:z.array(z.string()).min(1).max(12),handoffInstructions:z.array(z.string()).max(12),
 enabled:z.literal(false),executionStarted:z.literal(false),credentialIncluded:z.literal(false),externalReadiness:z.literal('not_verified')}).strict();
export const ExternalConfigurationExportedSchema=z.object({digest,manifest:ExternalConfigurationManifestSchema,markdown:z.string().max(1000000).nullable()}).strict();
export const ExternalConfigurationOptionsQuerySchema=z.object({workspaceId:id,page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(20).default(20)}).strict();
export const ExternalConfigurationOptionsSchema=z.object({workspace:z.object({id,name:z.string(),expiresAt:TimestampSchema,status:z.enum(['active','expired','revoked'])}).strict(),
 projects:PageSchema(z.object({productId:id,name:z.string(),planRevisionId:id.nullable(),planDigest:digest.nullable()}).strict())}).strict();
