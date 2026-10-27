import { type McpServer, type CallToolResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { IdSchema, PageSchema } from '@orai/contracts';
import { MachineProjectBootstrapSchema, MachineProjectGetSchema, MachineProjectListSchema, MachineProjectPageSchema,
  MachineProjectResultSchema, MachineProjectProfileSaveSchema, CreativeProfileRevisionSchema,
  MachineProjectPlanGetSchema, MachineProjectPlanSaveSchema, MachineProjectPlanValidateSchema,
  ProductionPlanRevisionSchema, ProductionPlanInspectionSchema,
  MachineProjectMethodCreateSchema, MachineProjectMethodCaptureSchema, MachineProjectMethodGetSchema,
  MachineProjectMethodSnapshotSchema, MachineProjectMethodReferenceGetSchema, MachineSkillReferenceSchema,
  MachineProjectContextGetSchema, MachineProjectContextSchema,
  MachineProjectProductionSaveSchema, MachineProjectProductionListSchema, MachineProjectProductionGetSchema,
  MachineProjectProductionRecordSchema, MachineProjectDraftSaveSchema, MachineProjectDraftResultSchema,
  type MachineProjectOperation,
} from '@orai/contracts/admin';
import type { AdapterConfig } from './config.js';
import type { MachineApi } from './api.js';

const common: MachineProjectOperation[] = ['project_list','project_get','project_plan_get','project_plan_validate',
  'project_method_create','project_method_capture','project_method_get','project_method_reference_get','project_context_get',
  'project_production_save','project_production_list','project_production_get','project_draft_save'];
export const projectToolNames = (domain: AdapterConfig['domain']) => [...common,
  ...(domain === 'assessment' ? ['project_bootstrap','project_profile_save','project_plan_save'] as MachineProjectOperation[] : [])];

export function registerProjectTools(server: McpServer, config: AdapterConfig, api: MachineApi,
  run: (action: () => Promise<unknown>) => Promise<CallToolResult>, resultSchema: <T extends z.ZodType>(schema: T) => z.ZodType) {
  const definitions: Record<MachineProjectOperation, [z.ZodType,z.ZodType,boolean,string]> = {
    project_bootstrap: [MachineProjectBootstrapSchema, MachineProjectResultSchema, true,
      'Atomically create a private product, shared profile and immutable plan under an administrator-approved finite workspace grant. Requires projects:create and projects:write. Reuse projectKey and identical content to recover the same project, even with a new requestId. Does not invent assessment questions, publish or activate methods.'],
    project_list: [MachineProjectListSchema, MachineProjectPageSchema, false, 'List up to 100 projects in the shared authorization workspace. Does not expand the credential grant.'],
    project_get: [MachineProjectGetSchema, MachineProjectResultSchema, false, 'Read project IDs and the latest fixed plan reference. productVersionId stays null until a real assessment draft has been saved.'],
    project_profile_save: [MachineProjectProfileSaveSchema, CreativeProfileRevisionSchema, true, 'Append a shared creative-profile revision using expectedRevision. Existing plans keep their original profile.'],
    project_plan_get: [MachineProjectPlanGetSchema, ProductionPlanRevisionSchema, false, 'Read an exact immutable plan. V1 stays unchanged; V2 includes the mandatory Three.js baseline, per-product visual/motion/camera/interaction decisions, declared implementation evidence, budgets and pinned input references. All production tasks must read the same planRevisionId; undecided never means implemented or verified.'],
    project_plan_save: [MachineProjectPlanSaveSchema, ProductionPlanRevisionSchema, true, 'Append a strict V1 or V2 fixed plan revision against expectedRevision. Use V2 productPlan for new Three.js planning; keep undecided fields explicit, pin same-product source IDs/digests and reuse requestId with identical input after uncertain results. Dependencies stay within the plan and acyclic. This does not execute or certify runnable delivery.'],
    project_plan_validate: [MachineProjectPlanValidateSchema, ProductionPlanInspectionSchema, false, 'Validate a proposed fixed plan without saving. Unsupported forms and missing original files remain explicit; runtime is not executed.'],
    project_method_create: [MachineProjectMethodCreateSchema, z.object({ skillId: IdSchema, versionId: IdSchema }).strict(), true,
      'Create one project-owned DRAFT skill library in this domain, within the approved method quota. Stable methodKey supports retries. The server assigns the library identity. Upload references after creation, then save and capture the exact version. Never globally activates or executes it.'],
    project_method_capture: [MachineProjectMethodCaptureSchema, MachineProjectMethodSnapshotSchema, true, 'Capture the exact allowed candidate skill manifest, instructions and references for one fixed module and purpose. Rejects stale digest/revision, wrong domain/form and missing files.'],
    project_method_get: [MachineProjectMethodGetSchema, MachineProjectMethodSnapshotSchema, false, 'Read a captured immutable method in this domain. Later source edits do not change the snapshot.'],
    project_method_reference_get: [MachineProjectMethodReferenceGetSchema, MachineSkillReferenceSchema, false, 'Read a verified UTF-8 text reference retained by a captured method, at most 256 KiB. No arbitrary paths or URLs.'],
    project_context_get: [MachineProjectContextGetSchema, MachineProjectContextSchema, false, 'Read the exact shared plan profile and explicitly selected revision/digest/locator fragments. Non-assessment domains can read individual questions without scoring or private report configuration.'],
    project_draft_save: [MachineProjectDraftSaveSchema, MachineProjectDraftResultSchema, true, 'Save a real private native assessment, media/copy or experience draft using captured project methods; no global ACTIVE set is required on this separate path. Pins method IDs/digests and trusted MCP provenance. A script is not an actual video. Save project_production separately to declare actual outputs and dependencies.'],
    project_production_save: [MachineProjectProductionSaveSchema, MachineProjectProductionRecordSchema, true, 'Record actual saved outputs with fixed project methods, dependencies and an external execution declaration. Requires real verified files for image/video slots; never marks archive-ready or platform-executed.'],
    project_production_list: [MachineProjectProductionListSchema, PageSchema(MachineProjectProductionRecordSchema), false, 'List production records for one fixed module in this domain.'],
    project_production_get: [MachineProjectProductionGetSchema, MachineProjectProductionRecordSchema, false, 'Read one immutable domain production record and safe original-file metadata.'],
  };
  for (const name of projectToolNames(config.domain)) {
    const [inputSchema, outputSchema, write, description] = definitions[name];
    server.registerTool(name, { inputSchema, outputSchema: resultSchema(outputSchema), description,
      annotations: { readOnlyHint: !write, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
      async input => run(() => api.project(name, input, outputSchema)));
  }
}
