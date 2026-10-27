import {z} from 'zod';
import {IdSchema,TimestampSchema,PageSchema} from './shared.js';
import {SkillPurposeSchema,SkillStatusSchema} from './skills.js';
import {FixedSkillVersionSchema} from './skill-bindings.js';
import {ContentLocatorSchema,CreativeProfileRevisionSchema} from './content.js';
import {ProjectMethodSnapshotSchema,ProjectProductionOutputSchema} from './project-production.js';
import {ProductionPlanModuleSchema} from './production-plans.js';

const id=IdSchema.toLowerCase(),digest=z.string().regex(/^[0-9a-f]{64}$/);
const page=z.coerce.number().int().min(1).max(100000).default(1);
export const ProjectMethodCandidateQuerySchema=z.object({purpose:SkillPurposeSchema,q:z.string().trim().min(1).max(120).optional(),
 status:SkillStatusSchema.optional(),page,pageSize:z.coerce.number().int().min(1).max(20).default(10)}).strict();
export const ProjectMethodCandidateSchema=z.object({skillId:id,versionId:id,revision:z.number().int().nonnegative(),
 status:SkillStatusSchema,origin:z.enum(['shared','project']),compatible:z.boolean(),unavailableReason:z.string().nullable(),
 version:FixedSkillVersionSchema}).strict();
export const ProjectMethodCandidatePageSchema=PageSchema(ProjectMethodCandidateSchema);
export const ProjectHandoffRecordChoiceSchema=z.object({id,digest,planModuleId:id,title:z.string(),revision:z.number().int().positive(),
 createdAt:TimestampSchema}).strict();
export const ProjectHandoffInputSchema=z.object({revisionId:id,digest,locator:ContentLocatorSchema}).strict();
export const ProjectHandoffInputChoiceSchema=ProjectHandoffInputSchema.extend({recordId:id,recordDigest:digest,label:z.string().max(500),
 content:z.record(z.string(),z.unknown())}).strict();
export const ProjectHandoffOptionsQuerySchema=z.object({dependencyId:id,recordId:id.optional(),recordPage:page,page,
 pageSize:z.coerce.number().int().min(1).max(50).default(20)}).strict();
export const ProjectHandoffOptionsSchema=z.object({records:PageSchema(ProjectHandoffRecordChoiceSchema),
 selectedRecord:ProjectHandoffRecordChoiceSchema.nullable(),fragments:PageSchema(ProjectHandoffInputChoiceSchema),
 fileOnly:z.boolean()}).strict();
export const ProjectHandoffSelectionSchema=z.object({expectedModuleDigest:digest,connectionId:id.nullable(),
 methods:z.array(z.object({snapshotId:id,digest}).strict()).max(2),
 records:z.array(z.object({recordId:id,digest}).strict()).max(39),inputs:z.array(ProjectHandoffInputSchema).max(100)}).strict();
const file=FixedSkillVersionSchema.shape.files.element.shape.file.omit({downloadPath:true});
const method=ProjectMethodSnapshotSchema.omit({machineCredentialId:true,machineRequestId:true}).extend({
 version:FixedSkillVersionSchema.extend({files:z.array(z.object({path:z.string(),file}).strict()).max(20)})});
export const ProjectHandoffManifestSchema=z.object({schemaVersion:z.literal(1),kind:z.literal('project_method_handoff'),
 productId:id,productName:z.string().min(1).max(160),planRevisionId:id,planDigest:digest,creativeProfile:CreativeProfileRevisionSchema,
 module:z.object({id,moduleId:id,moduleKey:z.string(),digest,title:z.string(),domain:z.string(),
  target:ProductionPlanModuleSchema.shape.target,outputs:z.array(z.object({outputKey:z.string(),label:z.string(),kind:z.string(),required:z.boolean(),
   files:z.array(z.object({fileKey:z.string(),label:z.string(),purpose:z.enum(['original','preview']),required:z.boolean(),mimeTypes:z.array(z.string())}).strict())}).strict())}).strict(),
 connection:z.object({id,workspaceId:id,domain:z.string(),expiresAt:TimestampSchema}).strict(),
 methods:z.array(method).min(1).max(2),
 records:z.array(z.object({recordId:id,digest,planModuleId:id}).strict()).max(39),
 inputs:z.array(ProjectHandoffInputChoiceSchema).max(100),
 originals:z.array(ProjectProductionOutputSchema.omit({file:true}).extend({file:ProjectProductionOutputSchema.shape.file.unwrap().omit({downloadPath:true}).nullable()})).max(1248),
 instructions:z.array(z.string()).min(1).max(12),executionStarted:z.literal(false),credentialIncluded:z.literal(false),
 canReview:z.literal(false),canPublish:z.literal(false)}).strict();
export const ProjectRecoveryFixedManifestSchema=ProjectHandoffManifestSchema.extend({methods:z.array(ProjectHandoffManifestSchema.shape.methods.element).min(1).max(12)}).strict();
export const ProjectHandoffPreviewSchema=z.object({checkedAt:TimestampSchema,ready:z.boolean(),digest:digest.nullable(),
 issues:z.array(z.object({code:z.string().max(80),message:z.string().max(500)}).strict()).max(100),manifest:ProjectHandoffManifestSchema.nullable()}).strict();
export const ProjectRecoveryFixedPreviewSchema=ProjectHandoffPreviewSchema.extend({manifest:ProjectRecoveryFixedManifestSchema.nullable()}).strict();
export const ProjectHandoffExportSchema=z.object({selection:ProjectHandoffSelectionSchema,expectedDigest:digest}).strict();
export const ProjectHandoffExportedSchema=z.object({digest,manifest:ProjectHandoffManifestSchema}).strict();
