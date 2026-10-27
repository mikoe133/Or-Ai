import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  MachineConnectionSchema, MachineUploadPrepareSchema,
  MachineUploadPreparedSchema, MachineUploadSchema,
} from "@orai/contracts/admin";
import { type AdapterConfig } from "./config.js";
import { MachineApi } from "./api.js";
import { safeError } from "./errors.js";
import { registerProductionRunTools } from './production-run-tools.js';
import { registerProjectTools } from './project-tools.js';
import { registerContentTools } from "./content-tools.js";

const ticketSchema = z.string().min(20).max(4096).regex(/^[A-Za-z0-9._~-]+$/);
const uploadIdentity = z.object({ uploadId: z.uuid() }).strict();
const uploadFileInput = uploadIdentity.extend({
  ticket: ticketSchema.describe("Short-lived ticket returned by upload_prepare."),
  filePath: z.string().min(1).max(4096).describe(
    "A local file under ORAI_MCP_ALLOWED_ROOT, as an absolute path or a path relative to that folder. URLs are rejected.",
  ),
}).strict();
const completeInput = uploadIdentity.extend({
  ticket: ticketSchema,
  requestId: z.uuid().describe("Reuse this requestId when retrying the same completion."),
}).strict();
const safeErrorSchema = z.object({
  code: z.string(), message: z.string(), retryable: z.boolean(),
}).strict();
const resultSchema = <T extends z.ZodType>(data: T) => z.object({
  ok: z.boolean(), data: data.optional(), error: safeErrorSchema.optional(),
}).strict();

export function createServer(config: AdapterConfig): McpServer {
  const api = new MachineApi(config);
  const server = new McpServer({ name: `orai-${config.domain}`, version: "0.1.0" });
  const run = async (action: () => Promise<unknown>): Promise<CallToolResult> => {
    let output: Record<string, unknown>;
    try {
      output = { ok: true, data: await action() };
    } catch (error) {
      output = { ok: false, error: safeError(error) };
    }
    // Even an upstream response accidentally containing the long-lived credential
    // must not echo it into protocol content or client logs.
    const text = JSON.stringify(output).split(config.token).join("[redacted]");
    return {
      content: [{ type: "text", text }],
      structuredContent: JSON.parse(text),
      ...(output.ok === false ? { isError: true } : {}),
    };
  };
  const readAnnotations = {
    readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false,
  };
  const writeAnnotations = {
    readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false,
  };
  server.registerTool("connection_get", {
    description: `Read this ${config.domain} connection's authorized scope and transport capabilities. Does not execute any skill.`,
    inputSchema: z.object({}).strict(),
    outputSchema: resultSchema(MachineConnectionSchema),
    annotations: readAnnotations,
  }, async () => run(() => api.connection()));
  server.registerTool("upload_prepare", {
    description: `Prepare a bounded ${config.domain} upload with a known SHA-256 and byte length. Reuse requestId and identical metadata on retry. The short-lived ticket is only valid for this authorized target.`,
    inputSchema: MachineUploadPrepareSchema,
    outputSchema: resultSchema(MachineUploadPreparedSchema),
    annotations: writeAnnotations,
  }, async (input) => run(() => api.prepare(input)));
  server.registerTool("upload_status", {
    description: "Read an upload status after a retry or interrupted response. Only available means a verified reusable fileId exists.",
    inputSchema: uploadIdentity,
    outputSchema: resultSchema(MachineUploadSchema),
    annotations: readAnnotations,
  }, async ({ uploadId }) => run(() => api.status(uploadId)));
  server.registerTool("upload_file", {
    description: "Stream a local allowlisted file after checking its exact byte length and SHA-256. A prior uploaded/available state is returned without retransmitting. Never accepts URLs or Base64 file contents. Finish with upload_complete.",
    inputSchema: uploadFileInput,
    outputSchema: resultSchema(MachineUploadSchema),
    annotations: writeAnnotations,
  }, async ({ uploadId, ticket, filePath }) => run(() => api.uploadFile(uploadId, ticket, filePath)));
  server.registerTool("upload_complete", {
    description: "Ask the API to verify and finalize uploaded bytes. Requires an active credential and its upload ticket. Reuse requestId on retry; no draft is created or published by this tool.",
    inputSchema: completeInput,
    outputSchema: resultSchema(MachineUploadSchema),
    annotations: writeAnnotations,
  }, async ({ uploadId, ticket, requestId }) => run(() => api.complete(uploadId, ticket, requestId)));
  registerContentTools(server, config, api, run, resultSchema);
  registerProjectTools(server, config, api, run, resultSchema);
  registerProductionRunTools(server, config, api, run, resultSchema);
  return server;
}
