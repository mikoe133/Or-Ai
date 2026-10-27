import { type McpServer, type CallToolResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import {
  ExperienceMachineListInputSchema, ExperienceMachineListSchema, ExperienceAuthoringRevisionSchema,
  ExperienceDraftInputSchema, MachineExperienceSaveSchema, ExperienceCheckSchema,
  ExperienceContextInputSchema, ExperienceContextSchema, ExperienceReferenceInputSchema,
  MachineSkillListInputSchema, MachineSkillListSchema, MachineSkillVersionGetSchema, MachineSkillVersionSchema,
  MachineSkillDraftSaveSchema, MachineSkillDraftCloneSchema, MachineSkillReferenceSchema,
  type MachineContentOperation,
  productImplementationPolicy,
} from '@orai/contracts/admin';
import type { MachineApi } from './api.js';

export const experienceToolNames = ['experience_list','experience_get','experience_draft_save','experience_validate',
  'experience_skill_list','experience_skill_version_get','experience_skill_draft_save','experience_skill_draft_clone',
  'context_bundle_get','references_validate','skill_reference_get'];
export function registerExperienceTools(server:McpServer,api:MachineApi,run:(action:()=>Promise<unknown>)=>Promise<CallToolResult>,resultSchema:<T extends z.ZodType>(schema:T)=>z.ZodType) {
  function add(operation:MachineContentOperation,name:string,description:string,input:z.ZodType,output:z.ZodType,write=false) {
    server.registerTool(name,{description:['context_bundle_get','skill_version_get','skill_draft_save','skill_draft_clone'].includes(operation)
      ? `${description} ${productImplementationPolicy.mcpInstructions}` : description,inputSchema:input,outputSchema:resultSchema(output),
      annotations:{readOnlyHint:!write,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
      async value=>run(()=>api.content(operation,value,output)));
  }
  const identity=z.object({revisionId:IdSchema}).strict();
  add('list','experience_list','List experience revision summaries for one authorized content version. No private evaluation rules or consumer records.',ExperienceMachineListInputSchema,ExperienceMachineListSchema);
  add('get','experience_get','Read one fixed experience revision and only its authorized scene/report methods. Browser download URLs are removed.',identity,ExperienceAuthoringRevisionSchema);
  add('draft_save','experience_draft_save','Save an experience DRAFT with a fixed profile, content version, two method versions, resource hashes and expected revisions. Reuse requestId on retry. Source and machine identity are supplied by the server; no review or publication.',MachineExperienceSaveSchema,ExperienceAuthoringRevisionSchema,true);
  add('experience_validate','experience_validate','Check the registered input/renderer/report pairing, exact question mapping, profile and resources. Unsupported combinations cannot be reviewed or published.',ExperienceDraftInputSchema,ExperienceCheckSchema);
  add('context_bundle_get','context_bundle_get','Read the fixed creative profile, public question/option projection, report proposal and explicitly permitted experience methods. Set includeTemplates=true for registered pairs and budgets; includeCapabilities=true with capabilityVersion=2 discovers the registered 3D garden and graphics limits. Omitted capabilityVersion preserves v1. The supported renderer/report baseline remains the DOM fallback; use the explicit templates/capabilities for the selected renderer. No scores, weights, private templates, personal answers or publication authority.',ExperienceContextInputSchema,ExperienceContextSchema);
  add('references_validate','references_validate','Recheck a fixed experience revision against current content, profile, methods and actual files without approving or publishing it.',identity,ExperienceCheckSchema);
  add('skill_reference_get','skill_reference_get','Read a UTF-8 text reference up to 256 KiB bound to this revision and exact experience purpose; no arbitrary file paths or URLs.',ExperienceReferenceInputSchema,MachineSkillReferenceSchema);
  add('skill_list','experience_skill_list','List explicitly authorized experience skill libraries.',MachineSkillListInputSchema,MachineSkillListSchema);
  add('skill_version_get','experience_skill_version_get','Read one authorized experience method version and reference metadata. Does not execute it.',MachineSkillVersionGetSchema,MachineSkillVersionSchema);
  add('skill_draft_save','experience_skill_draft_save','Save an authorized method DRAFT against expectedRevision. Does not activate methods.',MachineSkillDraftSaveSchema,MachineSkillVersionSchema,true);
  add('skill_draft_clone','experience_skill_draft_clone','Copy an authorized experience method to a new DRAFT. Existing versions stay fixed.',MachineSkillDraftCloneSchema,MachineSkillVersionSchema,true);
}
