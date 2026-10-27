import { type McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  ContentRevisionSchema, MachineAssessmentCheckSchema, MachineAssessmentDraftSaveSchema,
  MachineAssessmentValidateSchema, MachineAssetDraftSaveSchema,
  MachineContentGetInputSchema, MachineContentGetSchema,
  MachineContentListInputSchema, MachineContentListSchema,
  MachineContextInputSchema, MachineContextSchema,
  MachineReferencesResultSchema, MachineReferencesValidateSchema,
  MachineSkillDraftCloneSchema, MachineSkillDraftSaveSchema, MachineSkillListInputSchema,
  MachineSkillListSchema, MachineSkillReferenceGetSchema, MachineSkillReferenceSchema,
  MachineSkillVersionGetSchema, MachineSkillVersionSchema,
  type MachineContentOperation,
  productImplementationPolicy,
} from "@orai/contracts/admin";
import { type AdapterConfig } from "./config.js";
import { type MachineApi } from "./api.js";
import { productionRunToolNames } from './production-run-tools.js';
import { projectToolNames } from './project-tools.js';
import { registerExperienceTools, experienceToolNames } from './experience-tools.js';

export const businessToolNames = (domain: AdapterConfig["domain"]) => [...productionRunToolNames(domain), ...projectToolNames(domain), ...(domain === 'experience' ? experienceToolNames : [
  ...["list", "get", "draft_save", "skill_list", "skill_version_get", "skill_draft_save", "skill_draft_clone"]
    .map(operation => `${domain}_${operation}`),
  ...(domain === "assessment" ? ["assessment_validate"] : []),
  "context_bundle_get", "references_validate", "skill_reference_get",
])];

export function registerContentTools(
  server: McpServer,
  config: AdapterConfig,
  api: MachineApi,
  run: (action: () => Promise<unknown>) => Promise<CallToolResult>,
  resultSchema: <T extends z.ZodType>(data: T) => z.ZodType,
) {
  if (config.domain === 'experience') { registerExperienceTools(server,api,run,resultSchema); return; }
  function add(
    operation: MachineContentOperation, name: string, description: string,
    inputSchema: z.ZodType, outputSchema: z.ZodType, write = false,
  ) {
    server.registerTool(name, {
      description: ['context_bundle_get', 'skill_version_get', 'skill_draft_save', 'skill_draft_clone'].includes(operation)
        ? `${description} ${productImplementationPolicy.mcpInstructions}` : description,
      inputSchema,
      outputSchema: resultSchema(outputSchema),
      annotations: {
        readOnlyHint: !write, destructiveHint: false, idempotentHint: true, openWorldHint: false,
      },
    }, async input => run(() => api.content(operation, input, outputSchema)));
  }
  const scoped = (operation: string) => `${config.domain}_${operation}`;
  add("list", scoped("list"),
    `List ${config.domain} revisions inside one authorized product. Page through results; a list never grants another domain's private configuration.`,
    MachineContentListInputSchema, MachineContentListSchema);
  add("get", scoped("get"),
    `Read one authorized ${config.domain} revision and its domain-specific production provenance. No consumer answers or personal reports are returned.`,
    MachineContentGetInputSchema, MachineContentGetSchema);
  add("draft_save", scoped("draft_save"),
    `Save an authorized ${config.domain} draft against the expected revision. A fixed creativeProfileRevisionId and skillSetId are required. Identity and source=mcp are set by the server. Reuse requestId and identical input after lost responses.`,
    config.domain === "assessment" ? MachineAssessmentDraftSaveSchema : MachineAssetDraftSaveSchema,
    ContentRevisionSchema, true);
  add("skill_list", scoped("skill_list"),
    `List the ${config.domain} skill libraries explicitly allowed by this credential. Returns summaries; use skill_version_get to read a version.`,
    MachineSkillListInputSchema, MachineSkillListSchema);
  add("skill_version_get", scoped("skill_version_get"),
    `Read one allowed ${config.domain} skill version, its manifest and safe reference metadata. Reading a skill does not execute its instructions.`,
    MachineSkillVersionGetSchema, MachineSkillVersionSchema);
  add("skill_draft_save", scoped("skill_draft_save"),
    `Save an allowed ${config.domain} skill DRAFT using expectedRevision and requestId. Reviewed, active and archived versions stay immutable; clone first. This tool does not activate or execute skills.`,
    MachineSkillDraftSaveSchema, MachineSkillVersionSchema, true);
  add("skill_draft_clone", scoped("skill_draft_clone"),
    `Copy an allowed ${config.domain} skill version into a new DRAFT with expectedSkillRevision and requestId. Does not activate it.`,
    MachineSkillDraftCloneSchema, MachineSkillVersionSchema, true);
  if (config.domain === "assessment")
    add("assessment_validate", "assessment_validate",
      "Validate a proposed assessment configuration for an authorized product. Returns valid=false and bounded issues for invalid configuration; does not save it.",
      MachineAssessmentValidateSchema, MachineAssessmentCheckSchema);
  add("context_bundle_get", "context_bundle_get",
    `Read the common creative profile, only ${config.domain} fixed skill versions and explicitly selected revision/digest/locator fragments. Set includeCapabilities=true and capabilityVersion=2 for current profile-level constraints including the registered 3D garden; omitted version preserves v1. This does not select a content version or register a runtime. Publicity tools must select individual questions instead of full scoring or reports.`,
    MachineContextInputSchema, MachineContextSchema);
  add("references_validate", "references_validate",
    "Verify the exact shared profile, skill set and selected fragments before saving. Optional targetRevisionId checks updates and blocked references; it does not mark a review as approved.",
    MachineReferencesValidateSchema, MachineReferencesResultSchema);
  add("skill_reference_get", "skill_reference_get",
    `Read one reference bound to an authorized ${config.domain} purpose in a fixed skill set. Only UTF-8 text/plain, text/markdown and application/json up to 256 KiB are supported. No arbitrary file ID, URL or filesystem path access.`,
    MachineSkillReferenceGetSchema, MachineSkillReferenceSchema);
}
