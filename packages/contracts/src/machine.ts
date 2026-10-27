import { z } from 'zod';
import { IdSchema, KeySchema, TimestampSchema, DataScopeSchema } from './shared.js';
import { ProductionDomainSchema } from './content-domain.js';

export const MachinePermissionSchema = z.enum(['content:read', 'content:write', 'skills:read', 'skills:write', 'context:read',
  'projects:read', 'projects:write', 'projects:create', 'methods:create']);
const ids = z.array(IdSchema.toLowerCase()).max(100).refine(v => new Set(v).size === v.length, '范围不能重复');
export const MachineCredentialCreateSchema = z.object({
  requestId: IdSchema,
  name: z.string().trim().min(1).max(100),
  domain: ProductionDomainSchema,
  permissions: z.array(MachinePermissionSchema).min(1).max(9).refine(v => new Set(v).size === v.length),
  workspaceId: IdSchema.toLowerCase().optional(),
  productIds: ids,
  skillIds: ids,
  expiresAt: TimestampSchema,
}).strict().superRefine((v, ctx) => {
  if (v.permissions.some(p => p.startsWith('content:') || p === 'context:read') && !v.productIds.length && !v.workspaceId)
    ctx.addIssue({ code: 'custom', path: ['productIds'], message: '内容权限需要明确商品范围' });
  if (v.permissions.some(p => p.startsWith('skills:')) && !v.skillIds.length && !v.workspaceId)
    ctx.addIssue({ code: 'custom', path: ['skillIds'], message: 'skill 权限需要明确 skill 范围' });
  if (v.permissions.some(p => p.startsWith('projects:') || p === 'methods:create') && !v.workspaceId)
    ctx.addIssue({ code: 'custom', path: ['workspaceId'], message: '项目权限需要管理员授权的工作区' });
  if (v.domain !== 'assessment' && v.permissions.some(p => p === 'projects:create' || p === 'projects:write'))
    ctx.addIssue({ code: 'custom', path: ['permissions'], message: '项目初始化与共同规划由 assessment 领域负责' });
});
export const MachineCredentialSchema = z.object({
  id: IdSchema, name: z.string(), domain: ProductionDomainSchema, scope: DataScopeSchema,
  permissions: z.array(MachinePermissionSchema), productIds: z.array(IdSchema), skillIds: z.array(IdSchema),
  workspaceId: IdSchema.nullable().optional(),
  createdAt: TimestampSchema, expiresAt: TimestampSchema, revokedAt: TimestampSchema.nullable(),
  status: z.enum(['active', 'expired', 'revoked', 'disabled']),
  unavailableReason: z.enum(['owner_disabled','workspace_revoked','workspace_expired']).optional(),
}).strict();
export const MachineCredentialIssuedSchema = z.object({
  credential: MachineCredentialSchema,
  token: z.string().nullable(),
}).strict();
export const MachineCallSchema = z.object({
  id: IdSchema, credentialId: IdSchema, domain: ProductionDomainSchema, operation: z.string(),
  outcome: z.enum(['success', 'denied', 'failed']), errorCode: z.string().nullable(),
  entityId: IdSchema.nullable(), requestId: IdSchema.nullable(), createdAt: TimestampSchema,
}).strict();
export const MachineUploadTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('media'), productVersionId: IdSchema.toLowerCase(), kind: z.enum(['cover', 'video']) }).strict(),
  z.object({ type: z.literal('skill_reference'), skillId: IdSchema.toLowerCase() }).strict(),
  z.object({ type: z.literal('project_original'), planModuleId: IdSchema.toLowerCase(), outputKey: KeySchema, fileKey: KeySchema }).strict(),
  z.object({ type: z.literal('experience_resource'), productVersionId: IdSchema.toLowerCase(), purpose: z.enum(['illustration','texture']) }).strict(),
]);
export const MachineUploadPrepareSchema = z.object({
  requestId: IdSchema, target: MachineUploadTargetSchema,
  fileName: z.string().trim().min(1).max(160).refine(v => !/[\\/\x00-\x1f\x7f]/.test(v)),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'text/markdown', 'text/plain', 'application/json', 'application/pdf','application/zip','text/html','model/gltf-binary']),
  byteSize: z.number().int().min(1).max(200 * 1024 * 1024),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
export const MachineUploadSchema = z.object({
  uploadId: IdSchema, fileId: IdSchema.nullable(), domain: ProductionDomainSchema, target: MachineUploadTargetSchema,
  status: z.enum(['pending', 'verifying', 'uploaded', 'available', 'failed', 'expired', 'deleting', 'deleted']),
  fileName: z.string(), mimeType: z.string(), byteSize: z.number().int().positive(), checksum: z.string(),
  expiresAt: TimestampSchema, verifiedAt: TimestampSchema.nullable(),
}).strict();
export const MachineUploadPreparedSchema = MachineUploadSchema.extend({ ticket: z.string() });
export const MachineConnectionSchema = z.object({
  credential: MachineCredentialSchema, stage: z.enum(['transport', 'content']),
  capabilities: z.array(z.string().regex(/^[a-z_]{1,80}$/)).max(48),
}).strict();
