// Invoked by the API integration fixture. Never logs credentials, tickets,
// filesystem paths or raw API/SDK errors, even when a check fails.
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { MachineUploadPrepareSchema } from "@orai/contracts/admin";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

let client;
function check(condition) {
  if (!condition) throw new Error("check failed");
}
try {
  const allowedRoot = process.env.ORAI_MCP_ALLOWED_ROOT;
  const uploadFile = process.env.ORAI_MCP_UPLOAD_FILE;
  check(allowedRoot && uploadFile);
  const path = resolve(allowedRoot, uploadFile);
  const fileStat = await stat(path);
  check(fileStat.isFile() && fileStat.size > 0 && fileStat.size <= 200 * 1024 * 1024);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const prepareInput = MachineUploadPrepareSchema.parse({
    requestId: randomUUID(),
    target: JSON.parse(process.env.ORAI_MCP_UPLOAD_TARGET_JSON),
    fileName: basename(path),
    mimeType: process.env.ORAI_MCP_UPLOAD_MIME_TYPE,
    byteSize: fileStat.size,
    checksum: hash.digest("hex"),
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/cli.js", import.meta.url))],
    stderr: "pipe",
    env: Object.fromEntries(["ORAI_MCP_API_URL", "ORAI_MCP_TOKEN", "ORAI_MCP_DOMAIN", "ORAI_MCP_ALLOWED_ROOT"]
      .map(key => [key, process.env[key]])),
  });
  // Consume all child stderr without forwarding it into execFile diagnostics.
  transport.stderr.on("data", () => {});
  client = new Client({ name: "orai-real-backend-check", version: "0.1.0" });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    check(!result.isError && result.structuredContent?.ok === true);
    check(!JSON.stringify(result).includes(process.env.ORAI_MCP_TOKEN));
    return result.structuredContent.data;
  };
  const connection = await call("connection_get");
  check(["transport", "content"].includes(connection.stage) &&
    connection.credential.domain === process.env.ORAI_MCP_DOMAIN);
  const prepared = await call("upload_prepare", prepareInput);
  const preparedAgain = await call("upload_prepare", prepareInput);
  check(prepared.uploadId === preparedAgain.uploadId && prepared.ticket === preparedAgain.ticket);
  check(prepared.fileId === null && prepared.status === "pending");
  const fileInput = { uploadId: prepared.uploadId, ticket: prepared.ticket, filePath: path };
  const uploaded = await call("upload_file", fileInput);
  check(uploaded.status === "uploaded" && uploaded.fileId === null);
  const status = await call("upload_status", { uploadId: prepared.uploadId });
  check(status.status === "uploaded" && status.ticket === undefined);
  const completeInput = { uploadId: prepared.uploadId, ticket: prepared.ticket, requestId: randomUUID() };
  const completed = await call("upload_complete", completeInput);
  const completedAgain = await call("upload_complete", completeInput);
  check(completed.status === "available" && completed.fileId);
  check(completed.fileId === completedAgain.fileId);
  const finalRetry = await call("upload_file", fileInput);
  check(finalRetry.status === "available" && finalRetry.fileId === completed.fileId);
  await client.close();
  client = undefined;
  process.stdout.write(JSON.stringify({
    ok: true, domain: connection.credential.domain,
    uploadId: completed.uploadId, fileId: completed.fileId, status: completed.status,
    prepareIdempotent: true, completeIdempotent: true,
    byteSize: prepareInput.byteSize, checksum: prepareInput.checksum,
  }) + "\n");
} catch {
  await client?.close().catch(() => {});
  process.stderr.write("MCP_REAL_BACKEND_CHECK_FAILED\n");
  process.exitCode = 1;
}
