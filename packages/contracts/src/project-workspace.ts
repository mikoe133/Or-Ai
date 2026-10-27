import { z } from 'zod';
import { IdSchema, DataScopeSchema, TimestampSchema, PageSchema } from './shared.js';
import { ProductionPlanRevisionSchema } from './production-plans.js';
import { ProjectMethodSnapshotSchema, ProjectProductionRecordSchema } from './project-production.js';
import { ProjectReviewRevisionSchema, ProjectOriginalFileSchema } from './project-review.js';
import { CreativeProfileRevisionSchema, ContentRevisionSchema } from './content.js';
import { ExperienceAuthoringRevisionSchema } from './experience-authoring.js';
import { ProductionRunSchema } from './production-runs.js';

const id=IdSchema.toLowerCase(),page=z.coerce.number().int().min(1).max(100000).default(1);
export const ProjectWorkspaceQuerySchema=z.object({planRevisionId:id.optional(),reviewId:id.optional(),runId:id.optional(),
  planPage:page,reviewPage:page,runPage:page}).strict().refine(v=>!(v.reviewId&&v.runId),'审核快照和批次请分别查看');
export const ProjectPlanSummarySchema=ProductionPlanRevisionSchema.pick({id:true,revision:true,createdAt:true}).extend({title:z.string()}).strict();
export const ProjectReviewSummarySchema=z.object({id,revision:ProjectReviewRevisionSchema.shape.revision,status:ProjectReviewRevisionSchema.shape.status,
  createdAt:TimestampSchema,planRevisionId:id}).strict();
export const ProjectRunSummarySchema=ProductionRunSchema.pick({id:true,planRevisionId:true,runKey:true,createdAt:true,cancelledAt:true}).strict();
export const ProjectWorkspaceSchema=z.object({productId:id,scope:DataScopeSchema,observedAt:TimestampSchema,
  source:z.enum(['live','run','review_snapshot']),plans:PageSchema(ProjectPlanSummarySchema),reviews:PageSchema(ProjectReviewSummarySchema),runs:PageSchema(ProjectRunSummarySchema),
  plan:ProductionPlanRevisionSchema.nullable(),profile:CreativeProfileRevisionSchema.nullable(),review:ProjectReviewRevisionSchema.nullable(),run:ProductionRunSchema.nullable(),
  methods:z.array(ProjectMethodSnapshotSchema).max(560),records:z.array(ProjectProductionRecordSchema).max(40),content:z.array(ContentRevisionSchema).max(1280),
  experiences:z.array(ExperienceAuthoringRevisionSchema).max(40),originals:z.array(ProjectOriginalFileSchema).max(400),originalsTruncated:z.boolean(),
}).strict();
