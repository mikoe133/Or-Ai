import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { request as httpRequest } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import {
  MachineCallSchema,
  MachineConnectionSchema,
  MachineCredentialIssuedSchema,
  MachineCredentialSchema,
  MachineUploadPreparedSchema,
  MachineUploadSchema,
} from "@orai/contracts/admin";
import { AppModule } from "../src/app.module";
import { APP_CONFIG } from "../src/config/configuration";
import { configureApp } from "../src/common/configure-app";
import {
  SupabaseAuthGateway,
  type SupabaseIdentity,
} from "../src/accounts/supabase-auth.gateway";
import { ApiException } from "../src/common/http-errors";
import { demoId, DemoIdentityScenarios } from "../scripts/demo-fixtures";
import { createLocalFixture } from "./local-fixture";

let fixture: Awaited<ReturnType<typeof createLocalFixture>>,
  app: INestApplication,
  base: string,
  directory: string,
  admin: Browser,
  jpeg: Buffer,
  video: Buffer;
const productId = demoId("demo-partner"),
  versionId = demoId("demo-partner-v2"),
  proofs = new Map<string, SupabaseIdentity>(),
  refreshes = new Map<string, { accessToken: string; refreshToken: string }>();
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const expires = (milliseconds = 3_600_000) =>
  new Date(Date.now() + milliseconds).toISOString();
const execute = promisify(execFile);
type Result = {
  status: number;
  body: any;
  headers: Headers;
};

async function request(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Result> {
  const response = await fetch(base + "/api" + path, {
    method,
    headers: {
      ...(body === undefined
        ? {}
        : {
            "content-type":
              body instanceof Uint8Array
                ? "application/octet-stream"
                : "application/json",
          }),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : body instanceof Uint8Array
          ? (body as BodyInit)
          : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
}

class Browser {
  cookies = new Map<string, string>();
  csrf = "";
  async request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await request(path, method, body, {
      cookie: [...this.cookies]
        .map(([key, value]) => key + "=" + value)
        .join(";"),
      origin: fixture.configuration.security.origins[0]!,
      ...(method === "GET" ? {} : { "x-csrf-token": this.csrf }),
      ...headers,
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0]!,
        at = pair.indexOf("=");
      this.cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
    return response;
  }
  async login(operator = true) {
    this.csrf = (await this.request("/account/context")).body.csrfToken;
    const accessToken = randomBytes(50).toString("base64url"),
      refreshToken = randomBytes(40).toString("base64url");
    proofs.set(accessToken, {
      supabaseUserId: operator
        ? DemoIdentityScenarios.admin.supabaseUserId
        : randomUUID(),
      supabaseSessionId: randomUUID(),
      emailVerified: true,
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    refreshes.set(refreshToken, { accessToken, refreshToken });
    const response = await this.request("/account/session", "POST", {
      accessToken,
      refreshToken,
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return this;
  }
}

type Credential = ReturnType<typeof MachineCredentialSchema.parse>;
class Machine {
  constructor(
    readonly credential: Credential,
    readonly token: string,
  ) {}
  request(
    suffix: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
    domain = this.credential.domain,
  ) {
    return request("/machine/" + domain + suffix, method, body, {
      authorization: "Bearer " + this.token,
      ...headers,
    });
  }
}

before(async () => {
  fixture = await createLocalFixture("t14");
  directory = await mkdtemp(join(tmpdir(), "orai-t14-"));
  [jpeg, video] = await Promise.all([
    readFile(join(process.cwd(), "test/fixtures/cover.jpg")),
    readFile(join(process.cwd(), "test/fixtures/preview.mp4")),
  ]);
  const configuration = {
    ...fixture.configuration,
    assets: {
      ...fixture.configuration.assets,
      driver: "local" as const,
      directory,
    },
    security: {
      ...fixture.configuration.security,
      readIpLimit: 3000,
      writeIpLimit: 3000,
    },
    auth: {
      url: "https://isolated.example.test",
      publishableKey: "sb_publishable_" + "p".repeat(40),
      sessionEncryptionKey: randomBytes(32).toString("base64url"),
      sessionDays: 30,
      requestTimeoutMs: 1000,
    },
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(configuration)
    .overrideProvider(SupabaseAuthGateway)
    .useValue({
      verify: async (token: string) => {
        const identity = proofs.get(token);
        if (!identity) throw new ApiException("AUTH_REQUIRED", "Invalid", 401);
        return identity;
      },
      refresh: async (token: string) => {
        const value = refreshes.get(token);
        if (!value) throw new ApiException("AUTH_REQUIRED", "Invalid", 401);
        return { ...value, identity: proofs.get(value.accessToken)! };
      },
      logout: async () => undefined,
    })
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
  admin = await new Browser().login();
});

after(async () => {
  await app?.close();
  await fixture?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

function credentialInput(overrides: Record<string, unknown> = {}) {
  return {
    requestId: randomUUID(),
    name: "本机上传 " + randomUUID().slice(0, 8),
    domain: "cover",
    permissions: ["content:read", "content:write"],
    productIds: [productId],
    skillIds: [],
    expiresAt: expires(),
    ...overrides,
  };
}

async function issue(overrides: Record<string, unknown> = {}) {
  const response = await admin.request(
    "/admin/machine-credentials",
    "POST",
    credentialInput(overrides),
  );
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const issued = MachineCredentialIssuedSchema.parse(response.body);
  assert.ok(issued.token);
  return new Machine(issued.credential, issued.token);
}

async function skill(domain = "cover") {
  const response = await admin.request("/admin/skills/" + domain, "POST", {
    requestId: randomUUID(),
    slug: "t14-" + randomUUID().slice(0, 8),
    manifest: {
      schemaVersion: 1,
      domain,
      name: "温柔表达参考",
      description: "保存用于本地创作的参考，不执行任何内容。",
      purposes: [
        domain === "cover"
          ? "cover_design"
          : domain === "video"
            ? "video_production"
            : domain === "assessment"
              ? "report_writing"
              : "copywriting",
      ],
      styles: ["温柔"],
      supportedForms: ["web"],
      inputs: [{ key: "creative-profile", description: "共同创作设定", required: true }],
      outputs: [{ key: "deliverable", description: "领域交付物" }],
      instructions: "观察具体需要，给出温柔的表达建议。",
      examples: [],
      references: [],
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}

function uploadInput(overrides: Record<string, unknown> = {}) {
  return {
    requestId: randomUUID(),
    target: { type: "media", productVersionId: versionId, kind: "cover" },
    fileName: "cover.jpg",
    mimeType: "image/jpeg",
    byteSize: jpeg.length,
    checksum: sha(jpeg),
    ...overrides,
  };
}

async function prepare(machine: Machine, overrides: Record<string, unknown> = {}) {
  const response = await machine.request("/uploads", "POST", uploadInput(overrides));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return MachineUploadPreparedSchema.parse(response.body);
}

type Upload = Awaited<ReturnType<typeof prepare>>;
const uploadPath = (upload: Upload) => "/uploads/" + upload.uploadId;
const ticketHeader = (upload: Upload) => ({
  "x-orai-upload-ticket": upload.ticket,
});
async function transfer(machine: Machine, upload: Upload, bytes = jpeg) {
  return machine.request(
    uploadPath(upload) + "/content",
    "PUT",
    bytes,
    ticketHeader(upload),
  );
}
async function complete(machine: Machine, upload: Upload, requestId = randomUUID()) {
  return machine.request(
    uploadPath(upload) + "/complete",
    "POST",
    { requestId },
    ticketHeader(upload),
  );
}
async function finish(machine: Machine, upload: Upload, bytes = jpeg) {
  const sent = await transfer(machine, upload, bytes);
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.status, "uploaded");
  const result = await complete(machine, upload);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.status, "available");
  return MachineUploadSchema.parse(result.body);
}

test("only verified browser administrators can issue or revoke credentials, with CSRF and Origin protection", async () => {
  const input = credentialInput();
  for (const path of ["/admin/machine-credentials", "/admin/machine-credentials/" + randomUUID() + "/calls"]) {
    assert.equal((await new Browser().request(path)).status, 401);
    assert.equal((await (await new Browser().login(false)).request(path)).status, 403);
  }
  const visitor = new Browser();
  visitor.csrf = (await visitor.request("/account/context")).body.csrfToken;
  assert.equal((await visitor.request("/admin/machine-credentials", "POST", input)).status, 401);
  const ordinary = await new Browser().login(false);
  assert.equal(
    (await ordinary.request("/admin/machine-credentials", "POST", input)).status,
    403,
  );
  for (const headers of [
    { "x-csrf-token": "wrong" },
    { origin: "https://untrusted.example.test" },
  ] as Record<string, string>[]) {
    assert.equal(
      (await admin.request("/admin/machine-credentials", "POST", input, headers)).status,
      403,
    );
  }
  const machine = await issue();
  assert.equal(
    (await admin.request("/admin/machine-credentials/" + machine.credential.id + "/revoke", "POST",
      { requestId: randomUUID() }, { "x-csrf-token": "wrong" })).status,
    403,
  );
  assert.equal((await machine.request("/connection")).status, 200);
});

test("credential creation rejects privilege injection, unbounded scopes and invalid expiration", async () => {
  for (const extra of [
    { role: "ADMIN" },
    { ownerUserId: DemoIdentityScenarios.admin.id },
    { userId: DemoIdentityScenarios.admin.id },
    { scope: "live" },
    { permissions: ["admin:*"] },
    { productIds: [] },
    { productIds: [productId, productId] },
    { expiresAt: expires(-1000) },
    { expiresAt: expires(91 * 86_400_000) },
  ]) {
    const response = await admin.request("/admin/machine-credentials", "POST", credentialInput(extra));
    assert.equal(response.status, 400, JSON.stringify(extra));
  }
  const otherDomain = await skill("video");
  const wrongSkill = await admin.request("/admin/machine-credentials", "POST", credentialInput({
    permissions: ["skills:write"], productIds: [], skillIds: [otherDomain.skillId],
  }));
  assert.equal(wrongSkill.status, 403);
  const missingProduct = await admin.request("/admin/machine-credentials", "POST", credentialInput({
    productIds: [randomUUID()],
  }));
  assert.equal(missingProduct.status, 403);
});

test("concurrent issuance exposes one secret once and persists only its digest, including idempotency and audit records", async () => {
  const input = credentialInput();
  const responses = await Promise.all([1, 2].map(() =>
    admin.request("/admin/machine-credentials", "POST", input)));
  assert.ok(responses.every(response => response.status === 200));
  const issued = responses.map(response => MachineCredentialIssuedSchema.parse(response.body));
  assert.equal(issued.filter(value => value.token !== null).length, 1);
  assert.equal(issued[0]!.credential.id, issued[1]!.credential.id);
  const first = issued.find(value => value.token)!;
  assert.ok(first.token!.length >= 40);
  const stored = await fixture.owner.client.machineCredential.findUniqueOrThrow({
    where: { id: first.credential.id },
  });
  assert.equal(stored.tokenDigest, sha(first.token!));
  assert.equal(JSON.stringify(stored).includes(first.token!), false);
  const replay = await admin.request("/admin/machine-credentials", "POST", input);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.token, null);
  const persisted = await Promise.all([
    fixture.owner.client.idempotentRequest.findMany({ where: { requestId: input.requestId } }),
    fixture.owner.client.adminAuditLog.findMany({ where: { entityId: first.credential.id } }),
  ]);
  assert.ok(persisted[0].length > 0);
  assert.equal(persisted[1].length, 1);
  assert.equal(JSON.stringify(persisted).includes(first.token!), false);
  const conflict = await admin.request("/admin/machine-credentials", "POST", { ...input, name: "冲突名称" });
  assert.equal(conflict.status, 409);
  const list = await admin.request("/admin/machine-credentials?pageSize=50");
  assert.equal(list.status, 200);
  assert.ok(list.body.items.some((row: any) => row.id === first.credential.id));
  list.body.items.forEach((row: unknown) => MachineCredentialSchema.parse(row));
  for (const value of [first.token!, stored.tokenDigest, "tokenDigest", "ownerUserId"]) {
    assert.equal(JSON.stringify(list.body).includes(value), false);
  }
  for (const response of [...responses, replay, list]) {
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("machine identity is separate from browser sessions and transport capabilities are domain scoped", async () => {
  const machine = await issue();
  const connection = await machine.request("/connection");
  assert.equal(connection.status, 200);
  const result = MachineConnectionSchema.parse(connection.body);
  assert.equal(result.stage, "content");
  assert.equal(result.credential.id, machine.credential.id);
  assert.ok(result.capabilities.includes("upload_prepare"));
  assert.equal(connection.headers.get("cache-control"), "private, no-store");
  assert.equal(connection.headers.getSetCookie().length, 0);
  assert.equal((await machine.request("/connection", "GET", undefined, {}, "video")).status, 403);
  assert.equal((await request("/machine/cover/connection")).status, 401);
  assert.equal((await admin.request("/machine/cover/connection")).status, 401);
  assert.equal(
    (await admin.request("/machine/cover/connection", "GET", undefined, {
      authorization: "Bearer " + machine.token,
    })).status,
    403,
  );
  for (const authorization of ["Bearer invalid", "Basic invalid", "Bearer " + machine.token + " extra"]) {
    assert.equal((await request("/machine/cover/connection", "GET", undefined, { authorization })).status, 401);
  }
  assert.equal(
    (await request("/admin/machine-credentials", "GET", undefined, { authorization: "Bearer " + machine.token })).status,
    401,
  );
  assert.equal(
    (await request("/admin/uploads", "POST", {
      ...uploadInput(), productVersionId: versionId, kind: "cover",
    }, { authorization: "Bearer " + machine.token })).status,
    403,
  );
});

test("media preparation is retryable with one ticket and completion requires verified bytes", async () => {
  const machine = await issue();
  const input = uploadInput();
  const beforeCount = await fixture.runtime.client.assetFile.count();
  const responses = await Promise.all([1, 2].map(() => machine.request("/uploads", "POST", input)));
  assert.ok(responses.every(response => response.status === 200));
  const upload = MachineUploadPreparedSchema.parse(responses[0]!.body);
  assert.deepEqual(responses[0]!.body, responses[1]!.body);
  assert.equal(await fixture.runtime.client.assetFile.count(), beforeCount + 1);
  assert.equal(upload.status, "pending");
  assert.equal(upload.verifiedAt, null);
  assert.ok(Date.parse(upload.expiresAt) <= Date.now() + 15 * 60_000 + 1000);
  assert.ok(Date.parse(upload.expiresAt) <= Date.parse(machine.credential.expiresAt));
  const status = await machine.request(uploadPath(upload));
  assert.equal(status.status, 200);
  MachineUploadSchema.parse(status.body);
  assert.equal("ticket" in status.body, false);
  assert.equal((await complete(machine, upload)).status, 409);
  for (const headers of [{}, { "x-orai-upload-ticket": "incorrect" }] as Record<string, string>[]) {
    assert.equal(
      (await machine.request(uploadPath(upload) + "/content", "PUT", jpeg, headers)).status,
      403,
    );
  }
  assert.equal((await machine.request(uploadPath(upload))).body.status, "pending");
  const stored = await fixture.owner.client.machineUpload.findUniqueOrThrow({ where: { id: upload.uploadId } });
  assert.notEqual(stored.ticketDigest, upload.ticket);
  assert.match(stored.ticketDigest, /^[0-9a-f]{64}$/);
  const sent = await transfer(machine, upload);
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  const requestId = randomUUID();
  const completions = await Promise.all([1, 2].map(() => complete(machine, upload, requestId)));
  assert.ok(completions.every(response => response.status === 200));
  assert.equal(completions[0]!.body.status, "available");
  assert.deepEqual(completions[0]!.body, completions[1]!.body);
  assert.ok(completions[0]!.body.verifiedAt);
  assert.equal(await fixture.runtime.client.assetFile.count(), beforeCount + 1);
  assert.equal((await complete(machine, upload)).body.fileId, completions[0]!.body.fileId);
  assert.equal((await transfer(machine, upload)).status, 409);
});

test("real JPEG and MP4 uploads keep inspected metadata and do not publish content or create media assets", async () => {
  const beforeAssets = await fixture.runtime.client.campaignAsset.count();
  const beforeVersion = await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: versionId } });
  for (const kind of ["cover", "video"] as const) {
    const machine = await issue({ domain: kind });
    const bytes = kind === "cover" ? jpeg : video;
    const upload = await prepare(machine, {
      target: { type: "media", productVersionId: versionId, kind },
      fileName: kind === "cover" ? "cover.jpg" : "preview.mp4",
      mimeType: kind === "cover" ? "image/jpeg" : "video/mp4",
      byteSize: bytes.length,
      checksum: sha(bytes),
    });
    const completed = await finish(machine, upload, bytes);
    assert.ok(completed.fileId);
    const file = await fixture.runtime.client.assetFile.findUniqueOrThrow({ where: { id: completed.fileId } });
    assert.equal(file.status, "AVAILABLE");
    assert.equal(file.checksum, sha(bytes));
    assert.equal(file.byteSize, bytes.length);
    assert.ok(file.width! > 0);
    assert.ok(file.height! > 0);
    if (kind === "video") assert.ok(file.durationMs! > 0);
    assert.deepEqual(await readFile(join(directory, file.storageKey)), bytes);
    for (const value of ["storageKey", "ownerUserId", directory, machine.token, upload.ticket]) {
      assert.equal(JSON.stringify(completed).includes(value), false);
    }
  }
  assert.equal(await fixture.runtime.client.campaignAsset.count(), beforeAssets);
  assert.deepEqual(
    await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: versionId } }),
    beforeVersion,
  );
});

test("wrong checksums, MIME declarations and unsafe file names never become available", async () => {
  const machine = await issue();
  for (const fileName of ["../cover.jpg", "folder/cover.jpg", "bad\\cover.jpg", "bad\u0000.jpg"]) {
    assert.equal((await machine.request("/uploads", "POST", uploadInput({ fileName }))).status, 400);
  }
  const checksumUpload = await prepare(machine, { checksum: "0".repeat(64) });
  assert.equal((await transfer(machine, checksumUpload)).status, 400);
  assert.equal((await machine.request(uploadPath(checksumUpload))).body.status, "failed");
  assert.notEqual((await complete(machine, checksumUpload)).status, 200);
  const fakeImage = Buffer.from("This is plain text, not a JPEG image.");
  const typeUpload = await prepare(machine, { byteSize: fakeImage.length, checksum: sha(fakeImage) });
  const transferred = await transfer(machine, typeUpload, fakeImage);
  assert.ok([200, 400].includes(transferred.status));
  if (transferred.status === 200) assert.equal((await complete(machine, typeUpload)).status, 400);
  assert.equal((await machine.request(uploadPath(typeUpload))).body.status, "failed");
});

test("content write permissions, assigned products and declared media domain are enforced before preparation", async () => {
  const reader = await issue({ permissions: ["content:read"] });
  assert.equal((await reader.request("/connection")).status, 200);
  assert.equal((await reader.request("/uploads", "POST", uploadInput())).status, 403);
  const machine = await issue();
  const foreignVersion = await fixture.runtime.client.productVersion.findFirstOrThrow({
    where: { productId: { not: productId }, scope: "DEMO" },
  });
  const beforeCount = await fixture.runtime.client.machineUpload.count();
  for (const target of [
    { type: "media", productVersionId: foreignVersion.id, kind: "cover" },
    { type: "media", productVersionId: versionId, kind: "video" },
  ]) {
    const response = await machine.request("/uploads", "POST", uploadInput({ target }));
    assert.ok([403, 404].includes(response.status), JSON.stringify(response.body));
  }
  assert.equal(await fixture.runtime.client.machineUpload.count(), beforeCount);
  assert.equal(
    (await machine.request("/uploads", "POST", { ...uploadInput(), actorUserId: DemoIdentityScenarios.admin.id })).status,
    400,
  );
});

test("skill references require the matching skill domain, explicit skill scope and write permission", async () => {
  const allowed = await skill("copy"), forbidden = await skill("copy");
  const bytes = Buffer.from("# 温柔表达\n请描述具体需要，不给自己或他人贴标签。\n");
  const input = {
    target: { type: "skill_reference", skillId: allowed.skillId },
    fileName: "guide.md", mimeType: "text/markdown",
    byteSize: bytes.length, checksum: sha(bytes),
  };
  const machine = await issue({
    domain: "copy", permissions: ["skills:read", "skills:write"], productIds: [], skillIds: [allowed.skillId],
  });
  const reader = await issue({
    domain: "copy", permissions: ["skills:read"], productIds: [], skillIds: [allowed.skillId],
  });
  assert.equal((await reader.request("/uploads", "POST", uploadInput(input))).status, 403);
  const denied = await machine.request("/uploads", "POST", uploadInput({
    ...input, target: { type: "skill_reference", skillId: forbidden.skillId },
  }));
  assert.ok([403, 404].includes(denied.status));
  const upload = await prepare(machine, input);
  const complete = await finish(machine, upload, bytes);
  assert.ok(complete.fileId);
  const stored = await fixture.runtime.client.skillReferenceFile.findUniqueOrThrow({ where: { id: complete.fileId } });
  assert.equal(stored.skillId, allowed.skillId);
  assert.equal(stored.status, "AVAILABLE");
  assert.equal(stored.checksum, sha(bytes));
  assert.deepEqual(await readFile(join(directory, stored.storageKey)), bytes);
  const version = await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({ where: { id: allowed.id } });
  assert.equal(version.status, "DRAFT");
  assert.equal(await fixture.runtime.client.styleSkillAttachment.count({ where: { versionId: allowed.id } }), 0);
});

test("different credentials of the same administrator cannot read, transfer or finish each other's uploads", async () => {
  const first = await issue(), second = await issue();
  const upload = await prepare(first);
  const headers = ticketHeader(upload);
  assert.equal((await second.request(uploadPath(upload))).status, 404);
  assert.equal((await second.request(uploadPath(upload) + "/content", "PUT", jpeg, headers)).status, 404);
  assert.equal((await second.request(uploadPath(upload) + "/complete", "POST", { requestId: randomUUID() }, headers)).status, 404);
  assert.equal((await first.request(uploadPath(upload))).body.status, "pending");
  await finish(first, upload);
});

test("idempotency request IDs are isolated by machine credential and reject changed payloads", async () => {
  const first = await issue(), second = await issue(), input = uploadInput();
  const a = await first.request("/uploads", "POST", input),
    b = await second.request("/uploads", "POST", input);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const uploadA = MachineUploadPreparedSchema.parse(a.body),
    uploadB = MachineUploadPreparedSchema.parse(b.body);
  assert.notEqual(uploadA.uploadId, uploadB.uploadId);
  assert.notEqual(uploadA.ticket, uploadB.ticket);
  assert.equal((await first.request("/uploads", "POST", { ...input, fileName: "different.jpg" })).status, 409);
  const records = await fixture.owner.client.idempotentRequest.findMany({ where: { requestId: input.requestId } });
  assert.equal(new Set(records.map(record => record.actorKey)).size, 2);
  const requestId = randomUUID();
  assert.equal((await transfer(first, uploadA)).status, 200);
  assert.equal((await transfer(second, uploadB)).status, 200);
  assert.equal((await complete(first, uploadA, requestId)).status, 200);
  assert.equal((await complete(second, uploadB, requestId)).status, 200);
});

test("stored credential grants, upload bindings and machine call history cannot be rewritten or deleted", async () => {
  const machine = await issue(), upload = await prepare(machine);
  await assert.rejects(fixture.runtime.client.machineCredential.update({
    where: { id: machine.credential.id }, data: { permissions: ["content:write", "skills:write"] },
  }));
  await assert.rejects(fixture.owner.client.machineCredential.update({
    where: { id: machine.credential.id }, data: { domain: "video" },
  }));
  await assert.rejects(fixture.owner.client.machineCredential.delete({
    where: { id: machine.credential.id },
  }));
  await assert.rejects(fixture.owner.client.machineUpload.update({
    where: { id: upload.uploadId }, data: { ticketDigest: "a".repeat(64) },
  }));
  await assert.rejects(fixture.runtime.client.machineUpload.delete({
    where: { id: upload.uploadId },
  }));
  const call = await fixture.owner.client.machineCall.findFirstOrThrow({
    where: { credentialId: machine.credential.id },
  });
  await assert.rejects(fixture.owner.client.machineCall.delete({ where: { id: call.id } }));
  await finish(machine, upload);
});

test("revocation immediately blocks connection, status and completion even after bytes were transferred", async () => {
  const machine = await issue(), upload = await prepare(machine);
  assert.equal((await transfer(machine, upload)).status, 200);
  const body = { requestId: randomUUID() };
  const path = "/admin/machine-credentials/" + machine.credential.id + "/revoke";
  const revoked = await admin.request(path, "POST", body);
  assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
  assert.equal(revoked.body.status, "revoked");
  assert.ok(revoked.body.revokedAt);
  assert.deepEqual((await admin.request(path, "POST", body)).body, revoked.body);
  for (const response of [
    await machine.request("/connection"),
    await machine.request(uploadPath(upload)),
    await complete(machine, upload),
  ]) assert.equal(response.status, 401);
  const stored = await fixture.runtime.client.machineUpload.findUniqueOrThrow({ where: { id: upload.uploadId } });
  assert.equal((await fixture.runtime.client.assetFile.findUniqueOrThrow({ where: { id: stored.assetFileId! } })).status, "UPLOADED");
});

test("credential expiry and owner disablement are rechecked after transfer, independently of the upload ticket", async () => {
  const expired = await issue(), expiredUpload = await prepare(expired);
  assert.equal((await transfer(expired, expiredUpload)).status, 200);
  // Simulate elapsed time only within the disposable fixture. Runtime grants
  // remain immutable; the schema owner temporarily suspends that one trigger.
  await fixture.owner.client.$transaction(async tx => {
    await tx.$executeRaw`ALTER TABLE orai.machine_credentials DISABLE TRIGGER machine_credential_guard`;
    await tx.machineCredential.update({
      where: { id: expired.credential.id },
      data: { createdAt: new Date(Date.now() - 3_600_000), expiresAt: new Date(Date.now() - 1) },
    });
    await tx.$executeRaw`ALTER TABLE orai.machine_credentials ENABLE TRIGGER machine_credential_guard`;
  });
  assert.equal((await expired.request("/connection")).status, 401);
  assert.equal((await expired.request(uploadPath(expiredUpload))).status, 401);
  assert.equal((await complete(expired, expiredUpload)).status, 401);
  const disabled = await issue(), disabledUpload = await prepare(disabled);
  assert.equal((await transfer(disabled, disabledUpload)).status, 200);
  await fixture.owner.client.user.update({
    where: { id: DemoIdentityScenarios.admin.id }, data: { disabledAt: new Date() },
  });
  try {
    assert.equal((await disabled.request("/connection")).status, 401);
    assert.equal((await disabled.request(uploadPath(disabledUpload))).status, 401);
    assert.equal((await complete(disabled, disabledUpload)).status, 401);
  } finally {
    await fixture.owner.client.user.update({
      where: { id: DemoIdentityScenarios.admin.id }, data: { disabledAt: null },
    });
  }
});

test("upload tickets expire no later than credentials and cannot be used after their upload expiry", async () => {
  const machine = await issue({ expiresAt: expires(5 * 60_000) });
  const upload = await prepare(machine);
  assert.ok(Date.parse(upload.expiresAt) <= Date.parse(machine.credential.expiresAt));
  await fixture.owner.client.$transaction(async tx => {
    await tx.$executeRaw`ALTER TABLE orai.machine_uploads DISABLE TRIGGER machine_upload_immutable`;
    await tx.machineUpload.update({
      where: { id: upload.uploadId },
      data: { createdAt: new Date(Date.now() - 900_000), expiresAt: new Date(Date.now() - 1) },
    });
    await tx.$executeRaw`ALTER TABLE orai.machine_uploads ENABLE TRIGGER machine_upload_immutable`;
  });
  const response = await transfer(machine, upload);
  assert.ok([403, 410].includes(response.status), JSON.stringify(response.body));
  assert.notEqual((await complete(machine, upload)).status, 200);
});

test("known LIVE IDs cannot extend a development credential's product or skill scope", async () => {
  const seed = await fixture.runtime.client.product.findUniqueOrThrow({ where: { id: productId } });
  const { id: _id, ...metadata } = seed;
  const live = await fixture.owner.client.product.create({
    data: { ...metadata, slug: "t14-live-" + randomUUID().slice(0, 8), scope: "LIVE",
      status: "DRAFT", currentVersionId: null, publishedAt: null,
      publicSample: { ...seed.publicSample as object, isDemo: false } },
  });
  const liveSkill = await fixture.owner.client.styleSkill.create({
    data: { scope: "LIVE", domain: "cover", slug: "t14-live-skill", name: "正式参考",
      description: "隔离范围", purposes: ["cover_design"], styles: ["温柔"], supportedForms: ["web"] },
  });
  for (const overrides of [
    { productIds: [live.id] },
    { permissions: ["skills:write"], productIds: [], skillIds: [liveSkill.id] },
  ]) {
    assert.equal(
      (await admin.request("/admin/machine-credentials", "POST", credentialInput(overrides))).status,
      403,
    );
  }
  assert.equal((await admin.request("/admin/machine-credentials?scope=live")).status, 400);
});

test("machine call history records scoped success and failures without payloads, secrets or storage details", async () => {
  const machine = await issue();
  assert.equal((await machine.request("/connection")).status, 200);
  assert.equal((await machine.request("/connection", "GET", undefined, {}, "video")).status, 403);
  const upload = await prepare(machine);
  assert.equal((await complete(machine, upload)).status, 409);
  await finish(machine, upload);
  const history = await admin.request("/admin/machine-credentials/" + machine.credential.id + "/calls?pageSize=50");
  assert.equal(history.status, 200);
  assert.ok(history.body.total >= 4);
  const calls = history.body.items.map((row: unknown) => MachineCallSchema.parse(row));
  assert.ok(calls.every((row: ReturnType<typeof MachineCallSchema.parse>) => row.credentialId === machine.credential.id));
  assert.ok(calls.some((row: ReturnType<typeof MachineCallSchema.parse>) => row.outcome === "success"));
  assert.ok(calls.some((row: ReturnType<typeof MachineCallSchema.parse>) => row.outcome !== "success"));
  const encoded = JSON.stringify(history.body);
  for (const value of [machine.token, upload.ticket, "tokenDigest", "ticketDigest", "storageKey", directory, "checksum", "byteSize"]) {
    assert.equal(encoded.includes(value), false);
  }
  assert.equal(history.headers.get("cache-control"), "private, no-store");
});

test("the actual MCP SDK stdio client uploads and completes all four domains against the real backend", async () => {
  const sourceDirectory = await mkdtemp(join(tmpdir(), "orai-t14-mcp-client-"));
  const reference = Buffer.from("# 共同创作参考\n理解自己的需要，用具体行动表达关心。\n");
  try {
    await Promise.all([
      writeFile(join(sourceDirectory, "guide.md"), reference),
      writeFile(join(sourceDirectory, "cover.jpg"), jpeg),
      writeFile(join(sourceDirectory, "preview.mp4"), video),
    ]);
    for (const domain of ["assessment", "cover", "video", "copy"] as const) {
      const isMedia = domain === "cover" || domain === "video";
      const method = isMedia ? undefined : await skill(domain);
      const machine = await issue({
        domain,
        permissions: isMedia ? ["content:write"] : ["skills:write"],
        productIds: isMedia ? [productId] : [],
        skillIds: isMedia ? [] : [method.skillId],
      });
      const target = isMedia
        ? { type: "media", productVersionId: versionId, kind: domain }
        : { type: "skill_reference", skillId: method.skillId };
      const bytes = domain === "cover" ? jpeg : domain === "video" ? video : reference;
      let stdout: string;
      try {
        ({ stdout } = await execute(process.execPath, [
          resolve(process.cwd(), "../../packages/mcp/test/real-backend-client.mjs"),
        ], {
          cwd: resolve(process.cwd(), "../.."),
          env: {
            PATH: process.env.PATH,
            ORAI_MCP_API_URL: base,
            ORAI_MCP_TOKEN: machine.token,
            ORAI_MCP_DOMAIN: domain,
            ORAI_MCP_ALLOWED_ROOT: sourceDirectory,
            ORAI_MCP_UPLOAD_TARGET_JSON: JSON.stringify(target),
            ORAI_MCP_UPLOAD_FILE: domain === "cover" ? "cover.jpg" : domain === "video" ? "preview.mp4" : "guide.md",
            ORAI_MCP_UPLOAD_MIME_TYPE: domain === "cover" ? "image/jpeg" : domain === "video" ? "video/mp4" : "text/markdown",
          },
          timeout: 60_000,
          maxBuffer: 32_000,
        }));
      } catch {
        // execFile errors carry child process metadata. Keep credentials and
        // private filesystem details out of the test runner's diagnostics.
        assert.fail("The real MCP stdio client failed for domain " + domain);
      }
      const summary = JSON.parse(stdout);
      assert.equal(summary.ok, true);
      assert.equal(summary.domain, domain);
      assert.equal(summary.status, "available");
      assert.equal(summary.prepareIdempotent, true);
      assert.equal(summary.completeIdempotent, true);
      assert.equal(summary.byteSize, bytes.length);
      assert.equal(summary.checksum, sha(bytes));
      assert.ok(summary.fileId);
      const upload = await fixture.runtime.client.machineUpload.findUniqueOrThrow({
        where: { id: summary.uploadId },
      });
      assert.equal(upload.credentialId, machine.credential.id);
      assert.deepEqual(upload.target, target);
      assert.equal(isMedia ? upload.assetFileId : upload.skillFileId, summary.fileId);
      const file = isMedia
        ? await fixture.runtime.client.assetFile.findUniqueOrThrow({ where: { id: summary.fileId } })
        : await fixture.runtime.client.skillReferenceFile.findUniqueOrThrow({ where: { id: summary.fileId } });
      assert.equal(file.status, "AVAILABLE");
      assert.equal(file.checksum, sha(bytes));
      assert.deepEqual(await readFile(join(directory, file.storageKey)), bytes);
      assert.equal(stdout.includes(machine.token), false);
      assert.equal(stdout.includes(sourceDirectory), false);
    }
  } finally {
    await rm(sourceDirectory, { recursive: true, force: true });
  }
});

test("revocation during a streamed upload prevents completion and removes the received bytes", async () => {
  const machine = await issue(), upload = await prepare(machine);
  const split = Math.floor(jpeg.length / 2);
  let stream: ReturnType<typeof httpRequest>;
  const response = new Promise<{ status: number; body: any }>((resolveResponse, rejectResponse) => {
    stream = httpRequest(base + "/api/machine/cover" + uploadPath(upload) + "/content", {
      method: "PUT",
      headers: {
        authorization: "Bearer " + machine.token,
        "x-orai-upload-ticket": upload.ticket,
        "content-type": "application/octet-stream",
        "content-length": String(jpeg.length),
      },
    }, incoming => {
      const chunks: Buffer[] = [];
      incoming.on("data", chunk => chunks.push(Buffer.from(chunk)));
      incoming.on("error", () => rejectResponse(new Error("Streaming response failed")));
      incoming.on("end", () => {
        try {
          resolveResponse({ status: incoming.statusCode!, body: JSON.parse(Buffer.concat(chunks).toString()) });
        } catch {
          rejectResponse(new Error("Streaming response was not JSON"));
        }
      });
    });
    stream.on("error", () => rejectResponse(new Error("Streaming request failed")));
    stream.setTimeout(10_000, () => stream.destroy(new Error("Upload test deadline")));
    stream.write(jpeg.subarray(0, split));
  });
  // A failed socket must not produce an unhandled rejection while the test
  // waits for the backend's persisted VERIFYING state.
  void response.catch(() => undefined);
  try {
    const deadline = Date.now() + 5000;
    let receiving = false;
    while (Date.now() < deadline) {
      const file = await fixture.runtime.client.assetFile.findUniqueOrThrow({ where: { id: upload.uploadId } });
      if (file.status === "VERIFYING") { receiving = true; break; }
      await delay(10);
    }
    assert.equal(receiving, true, "The server must begin reading before revocation");
    const revoke = await admin.request(
      "/admin/machine-credentials/" + machine.credential.id + "/revoke",
      "POST",
      { requestId: randomUUID() },
    );
    assert.equal(revoke.status, 200);
    stream!.end(jpeg.subarray(split));
    const result = await response;
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, "AUTH_REQUIRED");
    const file = await fixture.runtime.client.assetFile.findUniqueOrThrow({ where: { id: upload.uploadId } });
    assert.equal(file.status, "FAILED");
    await assert.rejects(readFile(join(directory, file.storageKey)));
    assert.equal((await complete(machine, upload)).status, 401);
  } finally {
    stream!.destroy();
  }
});

test("one machine request ID cannot allocate both a media file and a skill reference, including concurrent requests", async () => {
  const method = await skill("cover");
  const machine = await issue({ permissions: ["content:write", "skills:write"], skillIds: [method.skillId] });
  const reference = Buffer.from("# 封面参考\n使用温柔的色彩和清晰的题目。\n");
  for (const order of ["media_first", "reference_first", "concurrent"] as const) {
    const requestId = randomUUID();
    const mediaInput = uploadInput({ requestId });
    const referenceInput = uploadInput({
      requestId,
      target: { type: "skill_reference", skillId: method.skillId },
      fileName: "guide.md", mimeType: "text/markdown",
      byteSize: reference.length, checksum: sha(reference),
    });
    const beforeFiles = await fixture.runtime.client.assetFile.count() +
      await fixture.runtime.client.skillReferenceFile.count();
    const beforeUploads = await fixture.runtime.client.machineUpload.count();
    const requests = order === "reference_first" ? [referenceInput, mediaInput] : [mediaInput, referenceInput];
    const responses = order === "concurrent"
      ? await Promise.all(requests.map(body => machine.request("/uploads", "POST", body)))
      : [await machine.request("/uploads", "POST", requests[0]), await machine.request("/uploads", "POST", requests[1])];
    assert.deepEqual(responses.map(value => value.status).sort(), [200, 409]);
    assert.equal(
      await fixture.runtime.client.assetFile.count() + await fixture.runtime.client.skillReferenceFile.count(),
      beforeFiles + 1,
      order + " must not leave an orphan underlying file",
    );
    assert.equal(await fixture.runtime.client.machineUpload.count(), beforeUploads + 1);
    const upload = MachineUploadPreparedSchema.parse(responses.find(value => value.status === 200)!.body);
    const original = upload.target.type === "media" ? mediaInput : referenceInput;
    const replay = await machine.request("/uploads", "POST", original);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.uploadId, upload.uploadId);
    assert.equal(replay.body.ticket, upload.ticket);
    await finish(machine, upload, upload.target.type === "media" ? jpeg : reference);
  }
});
