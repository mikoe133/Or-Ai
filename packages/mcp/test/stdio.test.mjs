import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { readConfig } from "../dist/config.js";
import { businessToolNames } from "../dist/content-tools.js";
import { productCapabilities } from '@orai/contracts/admin';

const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const token = "orai_mcp_test_fixture_credential_" + "a".repeat(48);
const ticket = "test_upload_ticket_" + "b".repeat(48);
const bytes = Buffer.from("controlled local reference fixture\n");
const checksum = createHash("sha256").update(bytes).digest("hex");
const capabilities = ["connection_get", "upload_prepare", "upload_status", "upload_file", "upload_complete"];

async function harness(t, domain = "assessment", mode = "legacy", extraEnv = {}) {
  const folder = await realpath(await mkdtemp(join(tmpdir(), "orai-mcp-test-")));
  const root = join(folder, "allowed");
  await mkdir(root);
  await writeFile(join(root, "reference.txt"), bytes);
  await writeFile(join(folder, "outside.txt"), bytes);
  await symlink(join(folder, "outside.txt"), join(root, "escape.txt"));
  await symlink(folder, join(root, "escape-dir"));
  const credential = {
    id: randomUUID(), name: "Local test connection", domain, scope: "demo",
    permissions: ["skills:read", "skills:write"], productIds: [], skillIds: [randomUUID()],
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    revokedAt: null, status: "active",
  };
  const uploads = new Map();
  const requests = [];
  const state = { error: null, errorCode: null, redirect: null, echoToken: false, toolReplies: {}, delayUploadMs: 0 };
  const api = createServer(async (req, res) => {
    try {
      requests.push({ method: req.method, path: req.url, auth: req.headers.authorization,
        ticket: req.headers["x-orai-upload-ticket"] });
      res.setHeader("content-type", "application/json");
      if (state.redirect) {
        res.writeHead(302, { location: state.redirect });
        res.end();
        return;
      }
      if (state.error) {
        res.statusCode = state.error;
        res.end(JSON.stringify(state.errorCode
          ? { error: { code: state.errorCode, message: token, requestId: "fixture-request" } }
          : { error: { message: token, stack: "/private/secret/stack" } }));
        return;
      }
      assert.equal(req.headers.authorization, `Bearer ${token}`);
      assert.equal(req.headers.cookie, undefined);
      const base = `/api/machine/${domain}/`;
      assert.ok(req.url.startsWith(base));
      const route = req.url.slice(base.length);
      if (req.method === "POST" && route.startsWith("tools/")) {
        const operation = route.slice("tools/".length);
        requests.at(-1).input = await readJson(req);
        const reply = state.toolReplies[operation];
        if (!reply) { res.statusCode = 404; res.end("{}"); return; }
        res.end(JSON.stringify(reply));
        return;
      }
      if (req.method === "GET" && route === "connection") {
        res.end(JSON.stringify({
          credential: { ...credential, name: state.echoToken ? token : credential.name },
          stage: "transport", capabilities,
        }));
        return;
      }
      if (req.method === "POST" && route === "uploads") {
        const data = await readJson(req);
        let value = [...uploads.values()].find(u => u.requestId === data.requestId);
        if (!value) {
          value = {
            ...data, uploadId: randomUUID(), fileId: null, domain, status: "pending",
            expiresAt: new Date(Date.now() + 900_000).toISOString(), verifiedAt: null,
          };
          uploads.set(value.uploadId, value);
        }
        res.end(JSON.stringify({ ...view(value), ticket }));
        return;
      }
      const match = /^uploads\/([0-9a-f-]+)(\/content|\/complete)?$/.exec(route);
      const upload = uploads.get(match?.[1]);
      if (!upload) { res.statusCode = 404; res.end("{}"); return; }
      if (req.method === "PUT" && match[2] === "/content") {
        assert.equal(req.headers["x-orai-upload-ticket"], ticket);
        assert.equal(req.headers["content-type"], "application/octet-stream");
        const parts = [];
        for await (const part of req) parts.push(part);
        const received = Buffer.concat(parts);
        assert.equal(received.length, upload.byteSize);
        assert.equal(createHash("sha256").update(received).digest("hex"), upload.checksum);
        if (state.delayUploadMs) await new Promise(resolve => setTimeout(resolve, state.delayUploadMs));
        upload.status = "uploaded";
      } else if (req.method === "POST" && match[2] === "/complete") {
        assert.equal(req.headers["x-orai-upload-ticket"], ticket);
        assert.match((await readJson(req)).requestId, /^[0-9a-f-]{36}$/);
        assert.ok(["uploaded", "available"].includes(upload.status));
        upload.status = "available";
        upload.fileId ??= randomUUID();
        upload.verifiedAt ??= new Date().toISOString();
      } else {
        assert.equal(req.method, "GET");
        assert.equal(match[2], undefined);
      }
      res.end(JSON.stringify(view(upload)));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ message: String(error) }));
    }
  });
  await new Promise(resolve => api.listen(0, "127.0.0.1", resolve));
  const apiUrl = `http://127.0.0.1:${api.address().port}`;
  const env = {
    ORAI_MCP_DOMAIN: domain, ORAI_MCP_TOKEN: token,
    ORAI_MCP_ALLOWED_ROOT: root, ORAI_MCP_API_URL: apiUrl,
    ...extraEnv,
  };
  const transport = new StdioClientTransport({
    command: process.execPath, args: [cliPath], env, stderr: "pipe",
  });
  const client = new Client({ name: "orai-stdio-test", version: "0.1.0" }, {
    versionNegotiation: { mode },
  });
  const protocolErrors = [];
  client.onerror = error => protocolErrors.push(error);
  const stderr = [];
  const responses = [];
  transport.stderr.on("data", chunk => stderr.push(chunk.toString()));
  t.after(async () => {
    await client.close();
    api.closeAllConnections();
    await new Promise(resolve => api.close(resolve));
    await rm(folder, { recursive: true, force: true });
    assert.equal(stderr.join("").includes(token), false);
    assert.equal(JSON.stringify(responses).includes(token), false);
    assert.equal(protocolErrors.length, 0, "stdout must contain valid MCP protocol only");
  });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    responses.push(result);
    return result;
  };
  const prepare = async (overrides = {}) => {
    const result = await call("upload_prepare", {
      requestId: randomUUID(), target: { type: "skill_reference", skillId: credential.skillIds[0] },
      fileName: "reference.txt", mimeType: "text/plain", byteSize: bytes.length, checksum, ...overrides,
    });
    assert.equal(result.isError, undefined, JSON.stringify(result));
    return result.structuredContent.data;
  };
  return { root, folder, client, call, prepare, state, requests, env, uploads };
}

test('MCP upload timeout is explicitly configurable while keeping loopback origins and strict bounds',async t=>{
  const h=await harness(t);
  assert.equal((await readConfig(h.env)).uploadTimeoutMs,120000);
  assert.equal((await readConfig({...h.env,ORAI_MCP_UPLOAD_TIMEOUT_MS:'360000'})).uploadTimeoutMs,360000);
  for(const value of ['','0','999','600001','Infinity','PRIVATE_SENTINEL'])
    await assert.rejects(readConfig({...h.env,ORAI_MCP_UPLOAD_TIMEOUT_MS:value}),error=>!String(error).includes('PRIVATE_SENTINEL'));
  await assert.rejects(readConfig({...h.env,ORAI_MCP_UPLOAD_TIMEOUT_MS:'360000',ORAI_MCP_API_URL:'https://store.unit.test'}));
});

test('stdio file upload aborts on its configured deadline and can resume with the same upload identity',async t=>{
  const h=await harness(t,'assessment','legacy',{ORAI_MCP_UPLOAD_TIMEOUT_MS:'1000'}),prepared=await h.prepare();
  h.state.delayUploadMs=1600;
  const failed=await h.call('upload_file',{uploadId:prepared.uploadId,ticket:prepared.ticket,filePath:join(h.root,'reference.txt')});
  assert.equal(failed.isError,true);assert.match(JSON.stringify(failed),/API_UNAVAILABLE/);
  h.state.delayUploadMs=0;
  const resumed=await h.call('upload_file',{uploadId:prepared.uploadId,ticket:prepared.ticket,filePath:join(h.root,'reference.txt')});
  assert.equal(resumed.isError,undefined);assert.equal(resumed.structuredContent.data.uploadId,prepared.uploadId);
  assert.equal(h.uploads.size,1);
});

async function readJson(req) {
  const parts = [];
  for await (const part of req) parts.push(part);
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}

function view(upload) {
  const { requestId: _requestId, ...result } = upload;
  return result;
}

for (const domain of ["assessment", "cover", "video", "copy"]) {
  test(`stdio ${domain}: lists exact transport tools and uses its fixed API domain`, async t => {
    const h = await harness(t, domain);
    const { tools } = await h.client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), [...capabilities, ...businessToolNames(domain)].sort());
    for (const name of ['context_bundle_get', `${domain}_skill_version_get`, `${domain}_skill_draft_save`, `${domain}_skill_draft_clone`]) {
      assert.match(tools.find(tool => tool.name === name).description, /every normal product experience must use Three\.js/);
      assert.match(tools.find(tool => tool.name === name).description, /determined by the fixed product plan/);
    }
    for (const tool of tools) {
      assert.equal(tool.inputSchema.type, "object");
      assert.equal(tool.inputSchema.additionalProperties, false);
      assert.equal(tool.outputSchema.type, "object");
      assert.equal(tool.annotations.openWorldHint, false);
      assert.equal(tool.inputSchema.properties.domain, undefined);
      assert.equal(tool.inputSchema.properties.token, undefined);
    }
    const uploadTool = tools.find(tool => tool.name === "upload_prepare");
    assert.equal(uploadTool.inputSchema.properties.byteSize.maximum, 200 * 1024 * 1024);
    assert.ok(uploadTool.inputSchema.required.includes("checksum"));
    const connection = await h.call("connection_get");
    assert.equal(connection.structuredContent.data.credential.domain, domain);
    assert.equal(connection.structuredContent.data.stage, "transport");
    assert.equal(h.requests[0].path, `/api/machine/${domain}/connection`);
    const invalid = await h.call("upload_status", { uploadId: "../../admin" });
    assert.equal(invalid.isError, true);
    assert.equal(h.requests.length, 1);
    for (const unavailable of ["publish", "activate", "archive", "delete", "refund", "issue_codes",
      `${domain === "video" ? "assessment" : "video"}_get`]) {
      await assert.rejects(h.call(unavailable), error => error.code === -32602);
    }
    assert.equal(h.requests.length, 1);
  });
}

test('experience MCP exposes the same Three.js policy for scene and report skill authoring', async t => {
  const h = await harness(t, 'experience');
  const { tools } = await h.client.listTools();
  for (const name of ['context_bundle_get', 'experience_skill_version_get', 'experience_skill_draft_save', 'experience_skill_draft_clone']) {
    const tool = tools.find(tool => tool.name === name);
    assert.match(tool.description, /every normal product experience must use Three\.js/);
    assert.match(tool.description, /determined by the fixed product plan/);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
});

test("stdio latest 2026-07-28 protocol connects through the same entrypoint", async t => {
  const h = await harness(t, "assessment", { pin: "2026-07-28" });
  assert.equal(h.client.getProtocolEra(), "modern");
  const result = await h.call("connection_get");
  assert.equal(result.structuredContent.ok, true);
});

test("stdio uploads real bounded bytes, returns verified fileId and retries without retransmission", async t => {
  const h = await harness(t);
  const requestId = randomUUID();
  const prepared = await h.prepare({ requestId });
  const repeated = await h.prepare({ requestId });
  assert.equal(prepared.uploadId, repeated.uploadId);
  assert.equal(prepared.fileId, null);
  assert.equal(prepared.ticket, repeated.ticket);
  const args = { uploadId: prepared.uploadId, ticket: prepared.ticket, filePath: "reference.txt" };
  const uploaded = await h.call("upload_file", args);
  assert.equal(uploaded.structuredContent.data.status, "uploaded");
  assert.equal(uploaded.structuredContent.data.fileId, null);
  const uploadedAgain = await h.call("upload_file", args);
  assert.equal(uploadedAgain.structuredContent.data.status, "uploaded");
  const completion = { uploadId: prepared.uploadId, ticket: prepared.ticket, requestId: randomUUID() };
  const complete = await h.call("upload_complete", completion);
  const completedAgain = await h.call("upload_complete", completion);
  assert.equal(complete.structuredContent.data.status, "available");
  assert.equal(complete.structuredContent.data.fileId, completedAgain.structuredContent.data.fileId);
  assert.ok(complete.structuredContent.data.fileId);
  const status = await h.call("upload_status", { uploadId: prepared.uploadId });
  assert.equal(status.structuredContent.data.ticket, undefined);
  const finalRetry = await h.call("upload_file", args);
  assert.equal(finalRetry.structuredContent.data.status, "available");
  assert.equal(h.requests.filter(req => req.method === "PUT").length, 1);
});

test("stdio rejects traversal, symlink escape, directory symlink and URL paths before streaming", async t => {
  const h = await harness(t);
  const prepared = await h.prepare();
  for (const filePath of ["../outside.txt", join(h.folder, "outside.txt"), "escape.txt",
    "escape-dir/outside.txt", "https://example.com/data", "file:///etc/passwd"]) {
    const result = await h.call("upload_file", { uploadId: prepared.uploadId, ticket, filePath });
    assert.equal(result.isError, true, filePath);
    assert.equal(result.structuredContent.error.code, "FILE_OUTSIDE_ROOT");
    assert.equal(JSON.stringify(result).includes(h.folder), false);
  }
  assert.equal(h.requests.filter(req => req.method === "PUT").length, 0);
});

test("stdio rejects changed size, wrong hash and oversized metadata without uploading bytes", async t => {
  const h = await harness(t);
  const prepared = await h.prepare();
  await writeFile(join(h.root, "short.txt"), "short");
  await writeFile(join(h.root, "wrong.txt"), Buffer.alloc(bytes.length, 65));
  for (const [filePath, code] of [["short.txt", "FILE_SIZE_MISMATCH"], ["wrong.txt", "FILE_HASH_MISMATCH"]]) {
    const result = await h.call("upload_file", { uploadId: prepared.uploadId, ticket, filePath });
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent.error.code, code);
  }
  const tooLarge = await h.call("upload_prepare", {
    requestId: randomUUID(), target: prepared.target, fileName: "large.mp4", mimeType: "video/mp4",
    byteSize: 200 * 1024 * 1024 + 1, checksum,
  });
  assert.equal(tooLarge.isError, true);
  assert.equal(h.requests.filter(req => req.method === "PUT").length, 0);
});

test("stdio gives safe errors after revocation and redacts credentials from success/error responses", async t => {
  const h = await harness(t);
  const prepared = await h.prepare();
  h.state.error = 403;
  const result = await h.call("upload_complete", {
    uploadId: prepared.uploadId, ticket, requestId: randomUUID(),
  });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, "FORBIDDEN");
  assert.equal(result.structuredContent.error.retryable, false);
  assert.equal(JSON.stringify(result).includes("/private/secret/stack"), false);
  h.state.error = null;
  h.state.echoToken = true;
  const echoed = await h.call("connection_get");
  assert.equal(echoed.structuredContent.data.credential.name, "[redacted]");
});

test("stdio refuses redirects and never forwards its credential to the redirect target", async t => {
  const h = await harness(t);
  let redirectedRequests = 0;
  const destination = createServer((_req, res) => { redirectedRequests++; res.end("{}"); });
  await new Promise(resolve => destination.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    destination.closeAllConnections();
    await new Promise(resolve => destination.close(resolve));
  });
  h.state.redirect = `http://127.0.0.1:${destination.address().port}/leak`;
  const result = await h.call("connection_get");
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, "API_UNAVAILABLE");
  assert.equal(redirectedRequests, 0);
});

test("configuration only permits loopback HTTP origins and fails without secret-bearing output", async t => {
  const h = await harness(t);
  for (const apiUrl of ["https://127.0.0.1:4100", "http://example.com", "http://0.0.0.0:4100",
    "http://127.0.0.1:4100/api", "http://user:password@127.0.0.1", "http://127.0.0.1?token=x"]) {
    await assert.rejects(readConfig({ ...h.env, ORAI_MCP_API_URL: apiUrl }),
      error => error.code === "CONFIGURATION_ERROR" && !error.message.includes(apiUrl));
  }
  const normalized = await readConfig({ ...h.env, ORAI_MCP_API_URL: "http://localhost:4100" });
  assert.equal(normalized.apiOrigin, "http://127.0.0.1:4100");
  const child = spawn(process.execPath, [cliPath], {
    env: { ...h.env, ORAI_MCP_API_URL: `http://${token}@example.com` }, stdio: ["pipe", "pipe", "pipe"],
  });
  const stdout = [], stderr = [];
  child.stdout.on("data", chunk => stdout.push(chunk.toString()));
  child.stderr.on("data", chunk => stderr.push(chunk.toString()));
  const exitCode = await new Promise(resolve => child.on("close", resolve));
  assert.equal(exitCode, 1);
  assert.equal(stdout.join(""), "");
  assert.equal(stderr.join("").includes(token), false);
  assert.match(stderr.join(""), /CONFIGURATION_ERROR/);
});

function contentFixture(domain) {
  const productId = randomUUID(), profileId = randomUUID(), setId = randomUUID();
  const skillId = randomUUID(), versionId = randomUUID(), revisionId = randomUUID();
  const purposes = domain === "assessment" ? ["assessment_design", "report_writing"] :
    [{ cover: "cover_design", video: "video_production", copy: "copywriting" }[domain]];
  const stamp = new Date().toISOString();
  const manifest = {
    schemaVersion: 1, domain, name: "Controlled method", description: "Fixture only",
    purposes, styles: ["warm"], supportedForms: ["web"],
    inputs: [{ key: "creative-profile", required: true, description: "Fixed common profile" }],
    outputs: [{ key: "draft", description: "A draft" }], instructions: "Use only the fixed profile.",
    examples: [], references: [],
  };
  const skillVersion = {
    id: versionId, skillId, scope: "demo", number: 1, revision: 0, status: "active",
    manifest, digest: checksum, createdAt: stamp, updatedAt: stamp, files: [],
  };
  const { scope: _scope, manifest: _manifest, files: _files, ...summaryVersion } = skillVersion;
  const skill = {
    id: skillId, scope: "demo", domain, slug: `test-${domain}`, name: "Controlled method",
    description: "Fixture only", styles: ["warm"], purposes, supportedForms: ["web"],
    revision: 1, latest: summaryVersion, activeVersionId: versionId,
  };
  const revision = {
    id: revisionId, productId, productVersionId: randomUUID(), assetId: domain === "assessment" ? null : randomUUID(),
    scope: "demo", domain, sourceRevision: 0, creativeProfileRevisionId: profileId,
    snapshot: { kind: domain }, digest: checksum, createdAt: stamp,
    storage: { localArchiveRegistered: false, previewUploaded: false, deliveryUploaded: false },
  };
  const context = {
    productId, creativeProfileRevisionId: profileId, domain, skillSetId: setId, inputs: [],
    creativeProfile: {
      id: profileId, productId, scope: "demo", revision: 1, digest: checksum, createdAt: stamp,
      runtimeSupport: "authoring_only",
      profile: {
        schemaVersion: 1, title: "Self reflection", audience: "Adults", situation: "An evening",
        emotionalGoal: "Feel understood", understandingGoal: "Understand myself", takeaway: "One small step",
        perspective: "self", experienceForm: "web", pace: "Gentle", world: "A warm room",
        language: "Concrete", visual: "Soft", sound: "Quiet",
        reportPlan: {
          schemaVersion: 1, title: "Reflection", narrative: "A gentle explanation", presentation: "letter",
          sections: [{ sectionId: "intro", title: "Begin", purpose: "Offer perspective" }],
        },
        channels: ["manual"], deliverables: ["assessment", "cover", "video", "copy"],
      },
    },
    skillVersions: purposes.map(purpose => ({
      purpose, domain,
      version: { id: versionId, skillId, number: 1, digest: checksum, manifest, files: [] },
    })),
  };
  return { productId, profileId, setId, skillId, versionId, revision, context, skill, skillVersion };
}

for (const domain of ["assessment", "cover", "video", "copy"]) {
  test(`stdio ${domain}: business tools map to fixed HTTP operations and return safe shared context`, async t => {
    const h = await harness(t, domain), f = contentFixture(domain);
    const { snapshot: _snapshot, ...listedRevision } = f.revision;
    Object.assign(h.state.toolReplies, {
      list: { items: [listedRevision], page: 1, pageSize: 20, total: 1 },
      get: { ...f.revision, production: null },
      skill_list: { items: [f.skill] },
      skill_version_get: f.skillVersion,
      context_bundle_get: f.context,
      references_validate: { valid: true, context: f.context, impact: null },
      skill_reference_get: { fileId: randomUUID(), path: "references/example.md",
        mimeType: "text/markdown", checksum, text: "# Reference\nUse a warm voice." },
    });
    for (const [name, input] of [
      [`${domain}_list`, { productId: f.productId }],
      [`${domain}_get`, { revisionId: f.revision.id }],
      [`${domain}_skill_list`, {}],
      [`${domain}_skill_version_get`, { skillId: f.skillId, versionId: f.versionId }],
      ["context_bundle_get", { creativeProfileRevisionId: f.profileId, skillSetId: f.setId, inputs: [] }],
      ["references_validate", { creativeProfileRevisionId: f.profileId, skillSetId: f.setId, inputs: [], targetRevisionId: f.revision.id }],
      ["skill_reference_get", { skillSetId: f.setId, purpose: f.context.skillVersions[0].purpose,
        fileId: h.state.toolReplies.skill_reference_get.fileId }],
    ]) {
      const result = await h.call(name, input);
      assert.equal(result.isError, undefined, JSON.stringify(result));
      assert.equal(result.structuredContent.ok, true);
    }
    assert.deepEqual(h.requests.map(req => req.path), Object.keys(h.state.toolReplies)
      .map(operation => `/api/machine/${domain}/tools/${operation}`));
    assert.equal(h.requests[0].input.current, true);
    assert.equal(h.requests[0].input.page, 1);
    assert.equal(h.requests[0].input.pageSize, 20);
    assert.equal(h.requests.every(req => req.input.domain === undefined), true);
    const count = h.requests.length;
    const forged = await h.call(`${domain}_get`, { revisionId: f.revision.id, userId: randomUUID() });
    assert.equal(forged.isError, true);
    assert.equal(h.requests.length, count);
    h.state.toolReplies.context_bundle_get = { ...f.context, capabilities: productCapabilities({
      profile: f.context.creativeProfile.profile, profileRevisionId: f.profileId, hasContentVersion: false,
    }) };
    const discovery = await h.call('context_bundle_get', { creativeProfileRevisionId: f.profileId, skillSetId: f.setId, inputs: [], includeCapabilities: true });
    assert.equal(discovery.structuredContent.ok, true);
    assert.equal(discovery.structuredContent.data.capabilities.basis, 'creative_profile');
    assert.equal(discovery.structuredContent.data.capabilities.selected, null);
    assert.equal(h.requests.at(-1).input.includeCapabilities, true);
    h.state.toolReplies.context_bundle_get.capabilities = productCapabilities({
      profile: f.context.creativeProfile.profile, profileRevisionId: f.profileId, hasContentVersion: false, capabilityVersion: 2,
    });
    const discoveryV2 = await h.call('context_bundle_get', { creativeProfileRevisionId: f.profileId, skillSetId: f.setId, inputs: [], includeCapabilities: true, capabilityVersion: 2 });
    assert.equal(discoveryV2.structuredContent.data.capabilities.schemaVersion, 2);
    assert.ok(discoveryV2.structuredContent.data.capabilities.registered.some(item => item.renderer === 'reflection-garden@1'));
    assert.equal(h.requests.at(-1).input.capabilityVersion, 2);
  });
}

test("stdio preserves known revision-conflict codes while discarding upstream error messages", async t => {
  const h = await harness(t, "copy");
  h.state.error = 409;
  h.state.errorCode = "REVISION_CONFLICT";
  const result = await h.call("copy_get", { revisionId: randomUUID() });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, "REVISION_CONFLICT");
  assert.equal(result.structuredContent.error.retryable, false);
});

test("stdio draft schema requires fixed skill set, rejects source forgery and keeps request IDs on retries", async t => {
  const h = await harness(t, "copy"), f = contentFixture("copy");
  const input = {
    productVersionId: f.revision.productVersionId, platform: "manual", variant: "warm",
    expectedRevision: 0, requestId: randomUUID(), fileId: null,
    authoring: {
      schemaVersion: 1, creativeProfileRevisionId: f.profileId,
      content: { kind: "copy", blocks: [{ blockId: "hook", role: "hook", text: "What helps you feel understood?" }] },
      media: { localArchive: null, previewFileId: null }, inputs: [],
      production: { skillSetId: f.setId, batchKey: "test-batch", externalLabel: "SDK fixture" },
    },
  };
  h.state.toolReplies.draft_save = f.revision;
  const first = await h.call("copy_draft_save", input);
  const again = await h.call("copy_draft_save", input);
  assert.equal(first.isError, undefined, JSON.stringify(first));
  assert.equal(again.isError, undefined);
  assert.equal(h.requests[0].input.requestId, h.requests[1].input.requestId);
  assert.equal(h.requests[0].input.authoring.production.source, undefined);
  for (const production of [
    { source: "manual", skillSetId: f.setId }, { skillVersionId: f.versionId },
    { skillSetId: f.setId, skillVersionId: f.versionId }, {},
  ]) {
    const bad = await h.call("copy_draft_save", {
      ...input, authoring: { ...input.authoring, production },
    });
    assert.equal(bad.isError, true);
  }
  assert.equal(h.requests.length, 2);
});

test("stdio skill draft tools preserve immutable source identities and strip admin file URLs", async t => {
  const h = await harness(t, "cover"), f = contentFixture("cover");
  const draft = { ...f.skillVersion, status: "draft", revision: 1 };
  h.state.toolReplies.skill_draft_clone = draft;
  h.state.toolReplies.skill_draft_save = draft;
  const cloned = await h.call("cover_skill_draft_clone", {
    skillId: f.skillId, sourceVersionId: f.versionId, expectedSkillRevision: 1, requestId: randomUUID(),
  });
  assert.equal(cloned.isError, undefined);
  const saved = await h.call("cover_skill_draft_save", {
    skillId: f.skillId, versionId: f.versionId, expectedRevision: 0, requestId: randomUUID(),
    manifest: f.skillVersion.manifest,
  });
  assert.equal(saved.isError, undefined);
  h.state.toolReplies.skill_version_get = {
    ...draft, files: [{
      path: "references/example.md",
      file: { id: randomUUID(), skillId: f.skillId, fileName: "example.md", mimeType: "text/markdown",
        byteSize: bytes.length, checksum, status: "available", expiresAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(), uploadPath: "/api/admin/private", downloadPath: "/api/admin/private" },
    }],
  };
  const rejected = await h.call("cover_skill_version_get", { skillId: f.skillId, versionId: f.versionId });
  assert.equal(rejected.isError, true);
  assert.equal(rejected.structuredContent.error.code, "INVALID_API_RESPONSE");
  assert.equal(JSON.stringify(rejected).includes("/api/admin/private"), false);
});

test("stdio bounds large context responses and gives a safe batching hint", async t => {
  const h = await harness(t, "video"), f = contentFixture("video");
  h.state.toolReplies.context_bundle_get = {
    ...f.context, oversizedFixture: "x".repeat(8 * 1024 * 1024),
  };
  const rejected = await h.call("context_bundle_get", {
    creativeProfileRevisionId: f.profileId, skillSetId: f.setId, inputs: [],
  });
  assert.equal(rejected.isError, true);
  assert.equal(rejected.structuredContent.error.code, "RESPONSE_TOO_LARGE");
  assert.match(rejected.structuredContent.error.message, /fewer context inputs/);
  assert.ok(JSON.stringify(rejected).length < 1000);
});
