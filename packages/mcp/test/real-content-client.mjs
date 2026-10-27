// Real SDK -> stdio adapter -> isolated API fixture. Only public identifiers
// and check results are emitted; raw protocol/API errors and credentials stay
// out of stdout/stderr, including child process startup failures.
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

let client;
function check(condition) {
  if (!condition) throw new Error("check failed");
}
try {
  const domain = process.env.ORAI_MCP_DOMAIN;
  const scenario = JSON.parse(process.env.ORAI_MCP_CONTENT_SCENARIO_JSON);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/cli.js", import.meta.url))],
    stderr: "pipe",
    env: Object.fromEntries(["ORAI_MCP_API_URL", "ORAI_MCP_TOKEN", "ORAI_MCP_DOMAIN", "ORAI_MCP_ALLOWED_ROOT"]
      .map(key => [key, process.env[key]])),
  });
  transport.stderr.on("data", () => {});
  client = new Client({ name: "orai-real-content-check", version: "0.1.0" });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    check(!result.isError && result.structuredContent?.ok === true);
    check(!JSON.stringify(result).includes(process.env.ORAI_MCP_TOKEN));
    return result.structuredContent.data;
  };
  const tools = await client.listTools();
  check(tools.tools.some(tool => tool.name === `${domain}_draft_save`));
  check(!tools.tools.some(tool => tool.name === `${domain === "assessment" ? "video" : "assessment"}_draft_save`));
  const connection = await call("connection_get");
  check(connection.stage === "content" && connection.credential.domain === domain);
  const listed = await call(`${domain}_list`, { productId: scenario.productId });
  check(listed.items.every(row => row.domain === domain && row.productId === scenario.productId));
  const methods = await call(`${domain}_skill_list`);
  check(methods.items.some(row => row.id === scenario.skillId));
  const method = await call(`${domain}_skill_version_get`, {
    skillId: scenario.skillId, versionId: scenario.skillVersionId,
  });
  check(method.manifest.domain === domain);
  const contextInput = {
    creativeProfileRevisionId: scenario.creativeProfileRevisionId,
    skillSetId: scenario.skillSetId,
    inputs: scenario.inputs,
  };
  const context = await call("context_bundle_get", contextInput);
  check(context.domain === domain && context.creativeProfileRevisionId === scenario.creativeProfileRevisionId);
  check(context.skillSetId === scenario.skillSetId && context.inputs.length === scenario.inputs.length);
  check(context.skillVersions.length === (domain === "assessment" ? 2 : 1));
  check(context.skillVersions.every(binding => binding.domain === domain));
  const references = await call("references_validate", contextInput);
  check(references.valid === true && references.impact === null);
  const draftInput = structuredClone(scenario.draftInput);
  let fileId = null;
  if (scenario.upload) {
    const path = resolve(process.env.ORAI_MCP_ALLOWED_ROOT, scenario.upload.filePath);
    const bytes = await readFile(path);
    const prepared = await call("upload_prepare", {
      requestId: randomUUID(), target: scenario.upload.target,
      fileName: basename(path), mimeType: scenario.upload.mimeType,
      byteSize: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex"),
    });
    const sent = await call("upload_file", { uploadId: prepared.uploadId, ticket: prepared.ticket, filePath: path });
    check(sent.status === "uploaded");
    const completed = await call("upload_complete", {
      uploadId: prepared.uploadId, ticket: prepared.ticket, requestId: randomUUID(),
    });
    check(completed.status === "available" && completed.fileId);
    fileId = completed.fileId;
    draftInput.fileId = fileId;
  }
  if (domain === "assessment") {
    const validated = await call("assessment_validate", {
      productId: scenario.productId, configuration: draftInput.configuration,
    });
    check(validated.valid === true);
  }
  const draft = await call(`${domain}_draft_save`, draftInput);
  const retry = await call(`${domain}_draft_save`, draftInput);
  check(draft.id === retry.id && draft.digest === retry.digest);
  const stored = await call(`${domain}_get`, { revisionId: draft.id });
  check(stored.domain === domain && stored.production.source === "mcp");
  check(stored.production.skillSetId === scenario.skillSetId);
  check(stored.production.machineCredentialId === connection.credential.id);
  check(stored.production.machineRequestId === draftInput.requestId);
  await client.close();
  client = undefined;
  process.stdout.write(JSON.stringify({
    ok: true, domain, revisionId: draft.id, productId: draft.productId,
    productVersionId: draft.productVersionId, assetId: draft.assetId,
    sourceRevision: draft.sourceRevision, digest: draft.digest, fileId,
    creativeProfileRevisionId: scenario.creativeProfileRevisionId,
    skillSetId: scenario.skillSetId, inputs: context.inputs.length,
    source: stored.production.source,
    machineCredentialId: stored.production.machineCredentialId,
    machineRequestId: stored.production.machineRequestId,
    draftIdempotent: true,
  }) + "\n");
} catch {
  await client?.close().catch(() => {});
  process.stderr.write("MCP_REAL_CONTENT_CHECK_FAILED\n");
  process.exitCode = 1;
}
