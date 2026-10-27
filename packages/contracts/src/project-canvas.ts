import { z } from 'zod';
import { IdSchema, KeySchema, TimestampSchema } from './shared.js';

const id=IdSchema.toLowerCase(),digest=z.string().regex(/^[0-9a-f]{64}$/);
const nodeKey=z.union([z.literal('plan'),z.string().startsWith('module:').refine(value=>KeySchema.safeParse(value.slice(7)).success,'布局模块标识不正确')]);
export const ProjectCanvasLayoutDocumentSchema=z.object({schemaVersion:z.literal(1),positions:z.array(z.object({
  nodeKey,x:z.number().finite().min(-100000).max(100000),y:z.number().finite().min(-100000).max(100000),
}).strict()).max(41)}).strict().refine(value=>new Set(value.positions.map(p=>p.nodeKey)).size===value.positions.length,'布局节点不能重复');
export const ProjectCanvasLayoutSaveSchema=z.object({layout:ProjectCanvasLayoutDocumentSchema,expectedRevision:z.number().int().nonnegative(),
  expectedPlanDigest:digest,requestId:id}).strict();
export const ProjectCanvasLayoutRevisionSchema=z.object({id,productId:id,planRevisionId:id,revision:z.number().int().positive(),
  layout:ProjectCanvasLayoutDocumentSchema,digest,createdAt:TimestampSchema}).strict();
export const ProjectCanvasLayoutQuerySchema=z.object({layoutRevisionId:id.optional()}).strict();
export const ProjectCanvasStateSchema=z.object({planRevisionId:id,latestPlanRevisionId:id,editable:z.boolean(),
  layout:ProjectCanvasLayoutRevisionSchema.nullable()}).strict();
export type ProjectCanvasLayoutDocument=z.infer<typeof ProjectCanvasLayoutDocumentSchema>;
