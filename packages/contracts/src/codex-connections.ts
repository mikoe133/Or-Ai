import { z } from 'zod';
import { IdSchema, TimestampSchema, DataScopeSchema, PageSchema } from './shared.js';
import { ProductionDomainSchema } from './content-domain.js';
import { MachinePermissionSchema, MachineCredentialSchema } from './machine.js';
import { MachineWorkspaceSchema } from './machine-projects.js';

const id=IdSchema.toLowerCase(),digest=z.string().regex(/^[0-9a-f]{64}$/);
const uniqueIds=z.array(id).max(100).refine(v=>new Set(v).size===v.length,'选择不能重复');
export const CodexConnectionPlanSchema=z.object({
  name:z.string().trim().min(1).max(70),
  workspace:z.discriminatedUnion('kind',[
    z.object({kind:z.literal('new'),categoryIds:uniqueIds.refine(v=>v.length>0&&v.length<=30,'请选择 1–30 个分类'),
      maxProjects:z.number().int().min(1).max(100),maxMethodsPerProject:z.number().int().min(1).max(100),
      maxRunsPerProject:z.number().int().min(1).max(100)}).strict(),
    z.object({kind:z.literal('existing'),id}).strict(),
  ]),
  actions:z.object({createProjects:z.boolean(),useSkills:z.boolean(),uploadDrafts:z.boolean()}).strict(),
  domains:z.array(z.object({domain:ProductionDomainSchema,readSkills:z.boolean(),uploadDrafts:z.boolean(),skillIds:uniqueIds}).strict()).min(1).max(5),
  expiresAt:TimestampSchema,
}).strict().superRefine((v,c)=>{
  if(!Object.values(v.actions).some(Boolean))c.addIssue({code:'custom',path:['actions'],message:'请明确选择至少一项允许的操作'});
  if(new Set(v.domains.map(d=>d.domain)).size!==v.domains.length)c.addIssue({code:'custom',path:['domains'],message:'内容领域不能重复'});
  if(v.actions.createProjects&&!v.domains.some(d=>d.domain==='assessment'))c.addIssue({code:'custom',path:['domains'],message:'创建商品项目需要题目与报告领域'});
  if(v.actions.useSkills&&!v.domains.some(d=>d.readSkills))c.addIssue({code:'custom',path:['domains'],message:'请允许至少一个领域读取方法'});
  if(v.actions.uploadDrafts&&(!v.actions.useSkills||!v.domains.some(d=>d.uploadDrafts)||v.domains.some(d=>d.uploadDrafts&&!d.readSkills)))
    c.addIssue({code:'custom',path:['actions'],message:'上传草稿需要明确允许对应领域使用 Skill'});
  if(v.domains.some(d=>d.skillIds.length&&(!v.actions.useSkills||!d.readSkills)))c.addIssue({code:'custom',path:['domains'],message:'未允许读取的共享 Skill 不能夹带授权'});
});
export type CodexConnectionPlan=z.infer<typeof CodexConnectionPlanSchema>;
export const CodexDomainGrantSchema=z.object({domain:ProductionDomainSchema,permissions:z.array(MachinePermissionSchema).min(1).max(9),skillIds:uniqueIds}).strict();
export function codexDomainGrants(plan:CodexConnectionPlan):z.infer<typeof CodexDomainGrantSchema>[]{
  return plan.domains.flatMap(d=>{const permissions=new Set<z.infer<typeof MachinePermissionSchema>>();
    if(plan.actions.createProjects&&d.domain==='assessment')for(const p of ['projects:read','projects:write','projects:create','context:read'] as const)permissions.add(p);
    if(plan.actions.useSkills&&d.readSkills)for(const p of ['projects:read','skills:read','context:read','methods:create'] as const)permissions.add(p);
    if(plan.actions.uploadDrafts&&d.uploadDrafts)for(const p of ['projects:read','content:read','content:write','context:read'] as const)permissions.add(p);
    return permissions.size?[{domain:d.domain,permissions:[...permissions].sort(),skillIds:[...d.skillIds].sort()}]:[];
  }).sort((a,b)=>a.domain.localeCompare(b.domain));
}
export const CodexConnectionSummarySchema=z.object({
  categories:z.array(z.object({id,name:z.string()}).strict()).max(30),
  sharedSkills:z.array(z.object({id,name:z.string(),domain:ProductionDomainSchema}).strict()).max(500),
  existingProjectCount:z.number().int().nonnegative(),maxProjects:z.number().int().positive(),
  maxMethodsPerProject:z.number().int().positive(),maxRunsPerProject:z.number().int().positive(),
  workspaceExpiresAt:TimestampSchema,grants:z.array(CodexDomainGrantSchema).min(1).max(5),
  canReview:z.literal(false),canPublish:z.literal(false),canReadConsumerData:z.literal(false),canEditSharedSkills:z.literal(false),
}).strict();
export const CodexConnectionPreviewSchema=z.object({plan:CodexConnectionPlanSchema,digest,scope:DataScopeSchema,
  summary:CodexConnectionSummarySchema}).strict();
export const CodexConnectionCreateSchema=z.object({plan:CodexConnectionPlanSchema,expectedDigest:digest,
  confirmed:z.literal(true),clientKey:id,requestId:id}).strict();
export const CodexConnectionSchema=z.object({id,scope:DataScopeSchema,name:z.string(),plan:CodexConnectionPlanSchema,
  digest,summary:CodexConnectionSummarySchema,workspace:MachineWorkspaceSchema,
  credentials:z.array(MachineCredentialSchema).min(1).max(5),
  status:z.enum(['active','partial','disabled','expired','revoked']),
  unavailableReason:z.enum(['owner_disabled','workspace_revoked','workspace_expired','credential_unavailable']).nullable(),
  expiresAt:TimestampSchema,createdAt:TimestampSchema,revokedAt:TimestampSchema.nullable(),
}).strict();
export const CodexConnectionPageSchema=PageSchema(CodexConnectionSchema);
export const CodexConnectionIssuedSchema=z.object({connection:CodexConnectionSchema,
  secrets:z.array(z.object({credentialId:id,domain:ProductionDomainSchema,token:z.string().regex(/^orai_mcp_[A-Za-z0-9_-]{43}$/)}).strict()).max(5),
  secretState:z.enum(['issued_once','not_recoverable']),
}).strict();
