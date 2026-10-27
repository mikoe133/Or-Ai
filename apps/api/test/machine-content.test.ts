import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import {
  AdminProductInputSchema,
  ContentRevisionSchema,
  MachineContentGetSchema,
  MachineContextSchema,
  MachineSkillVersionSchema,
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
  video: Buffer,
  context: Awaited<ReturnType<typeof fresh>>;
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
  call(operation: string, body: unknown = {}) {
    return this.request("/tools/" + operation, "POST", body);
  }
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
  directory = await mkdtemp(join(tmpdir(), "orai-t14-content-"));
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
  context = await fresh();
});

after(async () => {
  await app?.close();
  await fixture?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

const purposes = {
  assessment: ["assessment_design", "report_writing"],
  cover: ["cover_design"],
  video: ["video_production"],
  copy: ["copywriting"],
} as const;
type Domain = keyof typeof purposes;
const domains = Object.keys(purposes) as Domain[];
const profileData = () => ({
  schemaVersion: 1,
  title: "温柔花园里的相处节奏",
  audience: "想理解自己和双方关系的成年人",
  situation: "在轻松的自我观察中理解相处需要",
  emotionalGoal: "感到自己的需要被理解",
  understandingGoal: "理解具体场景里的沟通需要",
  takeaway: "带走一个可以尝试的表达方式",
  perspective: "single_person_relationship",
  experienceForm: "web",
  pace: "逐题观察",
  world: "一座温柔的花园",
  language: "尊重与好奇",
  visual: "柔和紫绿",
  sound: "安静",
  reportPlan: {
    schemaVersion: 1, title: "花园观察札记", narrative: "用具体建议解释作答",
    presentation: "journal",
    sections: [{ sectionId: "summary", title: "我的观察", purpose: "理解需要与下一步表达" }],
  },
  channels: ["manual"],
  deliverables: domains,
});

function manifest(domain: Domain) {
  return {
    schemaVersion: 1, domain, name: "固定方法 " + domain,
    description: "提供温柔而具体的观察与表达建议",
    purposes: [...purposes[domain]], styles: ["温柔"], supportedForms: ["web"],
    inputs: [{ key: "creative-profile", description: "共同创作设定", required: true }],
    outputs: [{ key: "deliverable", description: "本领域交付物" }],
    instructions: "使用共同设定中的意象和语气，以尊重的方式描述具体需要。",
    examples: [], references: [],
  };
}

const skillPath = (row: any) =>
  "/admin/skills/" + row.manifest.domain + "/" + row.skillId + "/versions/" + row.id;
async function createSkill(domain: Domain, active = false) {
  const created = await admin.request("/admin/skills/" + domain, "POST", {
    slug: "machine-content-" + randomUUID(), manifest: manifest(domain), requestId: randomUUID(),
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  let row = created.body;
  if (active) {
    for (const action of ["review", "activate"]) {
      const result = await admin.request(skillPath(row) + "/" + action, "POST", {
        expectedRevision: row.revision, requestId: randomUUID(),
      });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      row = result.body;
    }
  }
  return row;
}

async function fresh() {
  const original = (await admin.request("/admin/products/" + productId)).body;
  const metadata = AdminProductInputSchema.strip().parse(original);
  const product = await admin.request("/admin/products", "POST", {
    ...metadata, slug: "machine-content-" + randomUUID(), name: "MCP 共同创作商品", requestId: randomUUID(),
  });
  assert.equal(product.status, 200, JSON.stringify(product.body));
  const preview = await admin.request("/admin/products/" + productId + "/versions/" + versionId + "/preview");
  assert.equal(preview.status, 200);
  const configuration = preview.body.configuration;
  const version = await admin.request("/admin/products/" + product.body.id + "/versions", "POST", {
    configuration, requestId: randomUUID(),
  });
  assert.equal(version.status, 200, JSON.stringify(version.body));
  const profile = await admin.request("/admin/products/" + product.body.id + "/creative-profiles", "POST", {
    profile: profileData(), expectedRevision: 0, requestId: randomUUID(),
  });
  assert.equal(profile.status, 200, JSON.stringify(profile.body));
  const methods = {} as Record<Domain, any>;
  for (const domain of domains) methods[domain] = await createSkill(domain, true);
  const skillSet = await admin.request("/admin/creative-profiles/" + profile.body.id + "/skill-sets", "POST", {
    expectedRevision: 0, requestId: randomUUID(), note: "四领域五用途固定组合",
    bindings: domains.flatMap(domain => purposes[domain].map(purpose => ({
      purpose, skillVersionId: methods[domain].id,
    }))),
  });
  assert.equal(skillSet.status, 200, JSON.stringify(skillSet.body));
  const rows = await admin.request("/admin/content-revisions?productId=" + product.body.id + "&domain=assessment&current=true");
  assert.equal(rows.status, 200);
  const assessment = rows.body.items.find((row: any) => row.productVersionId === version.body.id);
  assert.ok(assessment);
  const source = await admin.request("/admin/production-records", "POST", {
    outputRevisionId: assessment.id, creativeProfileRevisionId: profile.body.id,
    production: { source: "manual", skillSetId: skillSet.body.id }, requestId: randomUUID(),
  });
  assert.equal(source.status, 200, JSON.stringify(source.body));
  return {
    product: product.body, version: version.body, profile: profile.body,
    configuration, assessment, methods, skillSet: skillSet.body,
  };
}

async function issue(domain: Domain, overrides: Record<string, unknown> = {}, target = context) {
  const response = await admin.request("/admin/machine-credentials", "POST", {
    requestId: randomUUID(), name: "内容制作 " + domain, domain,
    permissions: ["content:read", "content:write", "skills:read", "skills:write", "context:read"],
    productIds: [target.product.id], skillIds: [target.methods[domain].skillId],
    expiresAt: expires(), ...overrides,
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const result = MachineCredentialIssuedSchema.parse(response.body);
  assert.ok(result.token);
  return new Machine(result.credential, result.token);
}

function assetInput(domain: Exclude<Domain, "assessment">, overrides: Record<string, unknown> = {}, target = context): any {
  const content = domain === "copy"
    ? { kind: "copy", blocks: [{ blockId: "hook", role: "hook", text: "发现自己的相处节奏" }] }
    : domain === "cover"
      ? { kind: "cover", title: "发现自己的相处节奏", description: "温柔花园里的一次自我观察" }
      : { kind: "video", scenes: [{ sceneId: "opening", startMs: 0, endMs: 3000, text: "发现自己的相处节奏" }] };
  return {
    productVersionId: target.version.id, platform: "manual", variant: randomUUID(),
    expectedRevision: 0, requestId: randomUUID(), fileId: null,
    authoring: {
      schemaVersion: 1, creativeProfileRevisionId: target.profile.id, content,
      media: { localArchive: null, previewFileId: null }, inputs: [],
      production: { skillSetId: target.skillSet.id },
    },
    ...overrides,
  };
}

async function media(machine: Machine, kind: "cover" | "video", target = context) {
  const bytes = kind === "cover" ? jpeg : video;
  const prepared = await machine.request("/uploads", "POST", {
    requestId: randomUUID(), target: { type: "media", productVersionId: target.version.id, kind },
    fileName: kind === "cover" ? "cover.jpg" : "preview.mp4",
    mimeType: kind === "cover" ? "image/jpeg" : "video/mp4", byteSize: bytes.length, checksum: sha(bytes),
  });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
  const upload = MachineUploadPreparedSchema.parse(prepared.body);
  const sent = await machine.request("/uploads/" + upload.uploadId + "/content", "PUT", bytes, {
    "x-orai-upload-ticket": upload.ticket,
  });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  const completed = await machine.request("/uploads/" + upload.uploadId + "/complete", "POST", {
    requestId: randomUUID(),
  }, { "x-orai-upload-ticket": upload.ticket });
  assert.equal(completed.status, 200, JSON.stringify(completed.body));
  return MachineUploadSchema.parse(completed.body);
}

function contextInput(target = context, inputs: unknown[] = []) {
  return { creativeProfileRevisionId: target.profile.id, skillSetId: target.skillSet.id, inputs };
}
function assessmentInput(target = context, overrides: Record<string, unknown> = {}) {
  return {
    productId: target.product.id, expectedRevision: 0, requestId: randomUUID(),
    configuration: structuredClone(target.configuration),
    creativeProfileRevisionId: target.profile.id, skillSetId: target.skillSet.id, ...overrides,
  };
}
function questionInputs(target = context) {
  return target.configuration.questions.slice(0, 2).map((question: any) => ({
    revisionId: target.assessment.id, digest: target.assessment.digest,
    locator: { kind: "question", questionId: question.id },
  }));
}
async function saved(machine: Machine, input: unknown) {
  const response = await machine.call("draft_save", input);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return ContentRevisionSchema.parse(response.body);
}
async function skillReference(machine: Machine, skillId: string, text = "# 私有创作方法\n尊重具体需要，避免关系结论。\n") {
  const bytes = Buffer.from(text);
  const prepared = await machine.request("/uploads", "POST", {
    requestId: randomUUID(), target: { type: "skill_reference", skillId },
    fileName: "guide.md", mimeType: "text/markdown", byteSize: bytes.length, checksum: sha(bytes),
  });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
  const file = MachineUploadPreparedSchema.parse(prepared.body);
  assert.equal((await machine.request("/uploads/" + file.uploadId + "/content", "PUT", bytes, {
    "x-orai-upload-ticket": file.ticket,
  })).status, 200);
  const completed = await machine.request("/uploads/" + file.uploadId + "/complete", "POST", {
    requestId: randomUUID(),
  }, { "x-orai-upload-ticket": file.ticket });
  assert.equal(completed.status, 200, JSON.stringify(completed.body));
  return { ...MachineUploadSchema.parse(completed.body), text };
}

test("four domain lists and reads expose only their own authorized content and omit privileged projections", async () => {
  const machines = {} as Record<Domain, Machine>, rows = {} as Record<Domain, any>;
  for (const domain of domains) {
    machines[domain] = await issue(domain);
    rows[domain] = domain === "assessment" ? context.assessment
      : await saved(machines[domain], assetInput(domain));
  }
  for (const domain of domains) {
    const machine = machines[domain];
    const listed = await machine.call("list", { productId: context.product.id, pageSize: 1 });
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.equal(listed.body.items.length, 1);
    assert.ok(listed.body.items.every((row: any) => row.domain === domain && row.productId === context.product.id));
    const read = await machine.call("get", { revisionId: rows[domain].id });
    assert.equal(read.status, 200, JSON.stringify(read.body));
    MachineContentGetSchema.parse(read.body);
    assert.equal(read.body.domain, domain);
    for (const value of ["actorUserId", "storageKey", "ownerUserId", "consumerAnswers", directory, machine.token]) {
      assert.equal(JSON.stringify(read.body).includes(value), false);
    }
    const otherDomain = domain === "assessment" ? "copy" : "assessment";
    const denied = await machine.call("get", { revisionId: rows[otherDomain].id });
    assert.ok([403, 404].includes(denied.status));
    assert.equal(listed.headers.get("cache-control"), "private, no-store");
  }
});

test("context bundles and reference validation return only selected fragments and the current domain's fixed methods", async () => {
  for (const domain of domains) {
    const machine = await issue(domain);
    const inputs = domain === "assessment"
      ? [{ revisionId: context.assessment.id, digest: context.assessment.digest, locator: { kind: "whole" } }]
      : questionInputs();
    const result = await machine.call("context_bundle_get", contextInput(context, inputs));
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const bundle = MachineContextSchema.parse(result.body);
    assert.equal(bundle.domain, domain);
    assert.equal(bundle.creativeProfileRevisionId, context.profile.id);
    assert.equal(bundle.skillSetId, context.skillSet.id);
    assert.equal(bundle.skillVersions.length, domain === "assessment" ? 2 : 1);
    assert.ok(bundle.skillVersions.every(row => row.domain === domain));
    assert.equal(bundle.inputs.length, inputs.length);
    assert.equal('capabilities' in result.body, false);
    const discovery = await machine.call('context_bundle_get', { ...contextInput(context, inputs), includeCapabilities: true });
    assert.equal(discovery.status, 200, JSON.stringify(discovery.body));
    const capability = MachineContextSchema.parse(discovery.body).capabilities!;
    assert.equal(capability.basis, 'creative_profile');
    assert.equal(capability.profileRevisionId, context.profile.id);
    assert.equal(capability.selected, null, 'a shared profile must not choose or imply a concrete runtime version');
    const v2 = await machine.call('context_bundle_get', { ...contextInput(context, inputs), includeCapabilities: true, capabilityVersion: 2 });
    assert.equal(v2.status, 200, JSON.stringify(v2.body));
    assert.equal(v2.body.capabilities.schemaVersion, 2);
    assert.equal(v2.body.capabilities.selected, null);
    assert.ok(v2.body.capabilities.registered.some((item: { renderer: string }) => item.renderer === 'reflection-garden@1'));
    assert.ok(capability.registered.some(item => item.renderer === 'quiet-room@1' && item.report === 'field-notes@1'));
    for (const key of ['points', 'weight', 'bands', 'answers', 'snapshot', 'storageKey', 'configuration'])
      assert.equal(JSON.stringify(capability).includes('"' + key + '"'), false);
    if (domain !== "assessment") {
      const serialized = JSON.stringify(bundle.inputs);
      for (const key of ['"configuration"', '"reportTemplate"', '"score"', '"thresholds"', '"consumerAnswers"']) {
        assert.equal(serialized.includes(key), false);
      }
      assert.deepEqual(bundle.inputs.map((item: any) => item.content.text),
        context.configuration.questions.slice(0, 2).map((question: any) => question.text));
    }
    const before = await fixture.runtime.client.contentRevision.count();
    const check = await machine.call("references_validate", contextInput(context, inputs));
    assert.equal(check.status, 200, JSON.stringify(check.body));
    assert.equal(check.body.valid, true);
    assert.equal(check.body.impact, null);
    assert.equal(await fixture.runtime.client.contentRevision.count(), before);
    const empty = await machine.call("context_bundle_get", contextInput());
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.inputs, []);
  }
});

test("promotional contexts refuse full assessment bodies, stale digests and unauthorized product or method identities", async () => {
  const machine = await issue("video");
  const other = await fresh();
  for (const input of [
    contextInput(context, [{ revisionId: context.assessment.id, digest: context.assessment.digest, locator: { kind: "whole" } }]),
    contextInput(context, [{ ...questionInputs()[0], digest: "0".repeat(64) }]),
    contextInput(other, questionInputs(other)),
    { ...contextInput(), skillSetId: other.skillSet.id },
    contextInput(context, [{ ...questionInputs()[0], revisionId: other.assessment.id, digest: other.assessment.digest }]),
  ]) {
    const result = await machine.call("context_bundle_get", input);
    assert.ok([400, 403, 404, 409].includes(result.status), JSON.stringify(result.body));
  }
  const noSkill = await issue("video", { skillIds: [], permissions: ["context:read"] });
  assert.equal((await noSkill.call("context_bundle_get", contextInput())).status, 403);
  assert.ok([403, 404].includes((await machine.call("list", { productId: other.product.id })).status));
});

test("content, context and method permissions are checked separately and revoked credentials cannot invoke business tools", async () => {
  const reader = await issue("copy", { permissions: ["content:read"], skillIds: [] });
  assert.equal((await reader.call("list", { productId: context.product.id })).status, 200);
  for (const [operation, input] of [
    ["draft_save", assetInput("copy")],
    ["skill_list", {}],
    ["context_bundle_get", contextInput()],
  ] as const) assert.equal((await reader.call(operation, input)).status, 403);
  const machine = await issue("copy");
  assert.equal((await admin.request("/machine/copy/tools/list", "POST", { productId: context.product.id })).status, 401);
  for (const extra of [{ domain: "assessment" }, { actorUserId: DemoIdentityScenarios.admin.id }, { scope: "live" }]) {
    assert.equal((await machine.call("list", { productId: context.product.id, ...extra })).status, 400);
  }
  const revoked = await admin.request("/admin/machine-credentials/" + machine.credential.id + "/revoke", "POST", {
    requestId: randomUUID(),
  });
  assert.equal(revoked.status, 200);
  for (const [operation, input] of [["list", { productId: context.product.id }], ["draft_save", assetInput("copy")]] as const) {
    assert.equal((await machine.call(operation, input)).status, 401);
  }
});

test("assessment validation is read-only and draft saves atomically persist configuration, content and machine provenance", async () => {
  const machine = await issue("assessment");
  const beforeVersions = await fixture.runtime.client.productVersion.count();
  const invalid = await machine.call("assessment_validate", { productId: context.product.id, configuration: {} });
  assert.equal(invalid.status, 200);
  assert.equal(invalid.body.valid, false);
  assert.ok(invalid.body.issues.length);
  assert.equal((await machine.call("assessment_validate", {
    productId: context.product.id, configuration: context.configuration,
  })).body.valid, true);
  assert.equal(await fixture.runtime.client.productVersion.count(), beforeVersions);
  const input = assessmentInput();
  const response = await machine.call("draft_save", input);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const revision = ContentRevisionSchema.parse(response.body);
  assert.equal(revision.domain, "assessment");
  assert.equal(revision.creativeProfileRevisionId, context.profile.id);
  const version = await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: revision.productVersionId } });
  assert.equal(version.status, "DRAFT");
  assert.deepEqual(version.configuration, context.configuration);
  const read = await machine.call("get", { revisionId: revision.id });
  assert.equal(read.status, 200);
  assert.equal(read.body.production.source, "mcp");
  assert.equal(read.body.production.skillSetId, context.skillSet.id);
  assert.equal(read.body.production.skillVersions.length, 2);
  assert.equal(read.body.production.machineCredentialId, machine.credential.id);
  assert.equal(read.body.production.machineRequestId, input.requestId);
  assert.equal(version.creativeProfileRevisionId, context.profile.id);
  const replay = await machine.call("draft_save", input);
  assert.equal(replay.status, 200);
  assert.deepEqual(replay.body, response.body);
  assert.equal(await fixture.runtime.client.productVersion.count(), beforeVersions + 1);
  assert.equal(await fixture.runtime.client.productionRecord.count({ where: { outputRevisionId: revision.id } }), 1);
  const changed = structuredClone(input);
  changed.configuration.questions[0].text += "（修改）";
  assert.equal((await machine.call("draft_save", changed)).status, 409);
  const counts = await Promise.all([
    fixture.runtime.client.productVersion.count(), fixture.runtime.client.contentRevision.count(), fixture.runtime.client.productionRecord.count(),
  ]);
  assert.ok([403, 404, 409].includes((await machine.call("draft_save", assessmentInput(context, {
    skillSetId: randomUUID(),
  }))).status));
  assert.deepEqual(await Promise.all([
    fixture.runtime.client.productVersion.count(), fixture.runtime.client.contentRevision.count(), fixture.runtime.client.productionRecord.count(),
  ]), counts);
  const again = assessmentInput(context, { productVersionId: revision.productVersionId, expectedRevision: revision.sourceRevision });
  const sameContent = await saved(machine, again);
  assert.notEqual(sameContent.id, revision.id);
  const sameRead = await machine.call("get", { revisionId: sameContent.id });
  assert.equal(sameRead.body.production.machineRequestId, again.requestId);
  assert.equal((await machine.call("draft_save", { ...again, requestId: randomUUID() })).status, 409);
  const reviewed = await admin.request(
    "/admin/products/" + context.product.id + "/versions/" + sameContent.productVersionId + "/review",
    "POST", { expectedRevision: sameContent.sourceRevision, requestId: randomUUID() },
  );
  assert.equal(reviewed.status, 200);
  const reviewedRevision = await fixture.runtime.client.contentRevision.findFirstOrThrow({
    where: { productVersionId: sameContent.productVersionId, assetId: null }, orderBy: { sourceRevision: "desc" },
  });
  const reviewRead = await machine.call("get", { revisionId: reviewedRevision.id });
  assert.equal(reviewRead.body.production.machineCredentialId, machine.credential.id);
  assert.equal(reviewRead.body.production.machineRequestId, again.requestId);
  assert.equal((await machine.call("draft_save", assessmentInput(context, {
    productVersionId: sameContent.productVersionId, expectedRevision: reviewedRevision.sourceRevision,
  }))).status, 409);
  const published = await admin.request(
    "/admin/products/" + context.product.id + "/versions/" + sameContent.productVersionId + "/publish",
    "POST", { expectedRevision: reviewed.body.revision, requestId: randomUUID() },
  );
  assert.equal(published.status, 200, JSON.stringify(published.body));
  const publishedRevision = await fixture.runtime.client.contentRevision.findFirstOrThrow({
    where: { productVersionId: sameContent.productVersionId, assetId: null }, orderBy: { sourceRevision: "desc" },
  });
  const publishedRead = await machine.call("get", { revisionId: publishedRevision.id });
  assert.equal(publishedRead.body.production.machineCredentialId, machine.credential.id);
  assert.equal(publishedRead.body.production.machineRequestId, again.requestId);
});

test("draft updates enforce expected revisions and retain machine provenance when administrators review them", async () => {
  const machine = await issue("copy");
  const first = await saved(machine, assetInput("copy"));
  const input = assetInput("copy", { assetId: first.assetId, expectedRevision: first.sourceRevision });
  const results = await Promise.all([1, 2].map(() => machine.call("draft_save", input)));
  assert.ok(results.every(value => value.status === 200));
  assert.deepEqual(results[0]!.body, results[1]!.body);
  const second = results[0]!.body;
  assert.equal(second.sourceRevision, first.sourceRevision + 1);
  assert.equal((await machine.call("draft_save", { ...input, requestId: randomUUID() })).status, 409);
  const read = await machine.call("get", { revisionId: second.id });
  assert.equal(read.body.production.machineCredentialId, machine.credential.id);
  assert.equal(read.body.production.source, "mcp");
  const revoked = await admin.request("/admin/machine-credentials/" + machine.credential.id + "/revoke", "POST", {
    requestId: randomUUID(),
  });
  assert.equal(revoked.status, 200);
  const reader = await issue("copy");
  const reviewed = await admin.request("/admin/assets/" + second.assetId + "/review", "POST", {
    expectedRevision: second.sourceRevision, requestId: randomUUID(),
  });
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
  const revisions = await fixture.runtime.client.contentRevision.findMany({
    where: { assetId: second.assetId }, orderBy: { sourceRevision: "desc" },
  });
  const reviewedRead = await reader.call("get", { revisionId: revisions[0]!.id });
  assert.equal(reviewedRead.body.production.machineCredentialId, machine.credential.id);
  assert.equal(reviewedRead.body.production.source, "mcp");
  assert.deepEqual(reviewedRead.body.production.skillVersions, read.body.production.skillVersions);
  const ready = await admin.request("/admin/assets/" + second.assetId + "/ready", "POST", {
    expectedRevision: reviewed.body.revision, requestId: randomUUID(),
  });
  assert.equal(ready.status, 200, JSON.stringify(ready.body));
  const readyRevision = await fixture.runtime.client.contentRevision.findFirstOrThrow({
    where: { assetId: second.assetId }, orderBy: { sourceRevision: "desc" },
  });
  const readyRead = await reader.call("get", { revisionId: readyRevision.id });
  assert.equal(readyRead.body.production.machineCredentialId, machine.credential.id);
  assert.equal(readyRead.body.production.machineRequestId, input.requestId);
});

test("media draft saves accept only the issuing connection's verified upload or a file already used by that same asset", async () => {
  const first = await issue("cover"), other = await issue("cover");
  const file = await media(first, "cover");
  const unauthorized = await other.call("draft_save", assetInput("cover", { fileId: file.fileId }));
  assert.equal(unauthorized.status, 403, JSON.stringify(unauthorized.body));
  const asset = await saved(first, assetInput("cover", { fileId: file.fileId }));
  const continuation = await other.call("draft_save", assetInput("cover", {
    assetId: asset.assetId, expectedRevision: asset.sourceRevision, fileId: file.fileId,
  }));
  assert.equal(continuation.status, 200, JSON.stringify(continuation.body));
  const videoMachine = await issue("video");
  const mismatch = await videoMachine.call("draft_save", assetInput("video", { fileId: file.fileId }));
  assert.ok([403, 409].includes(mismatch.status));
  const wrongDomain = await videoMachine.call("draft_save", assetInput("copy"));
  assert.ok([400, 403].includes(wrongDomain.status));
  const forged = assetInput("cover");
  (forged.authoring.production as any).source = "manual";
  assert.equal((await first.call("draft_save", forged)).status, 400);
});

test("authorized method libraries support immutable reads, draft clone/save and expected revision conflicts", async () => {
  for (const domain of domains) {
    const machine = await issue(domain);
    const listed = await machine.call("skill_list");
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.deepEqual(listed.body.items.map((row: any) => row.id), [context.methods[domain].skillId]);
    assert.equal("manifest" in listed.body.items[0].latest, false);
    const original = await machine.call("skill_version_get", {
      skillId: context.methods[domain].skillId, versionId: context.methods[domain].id,
    });
    assert.equal(original.status, 200);
    const version = MachineSkillVersionSchema.parse(original.body);
    const root = (await admin.request("/admin/skills/" + domain + "/" + version.skillId)).body;
    const cloneInput = {
      skillId: version.skillId, sourceVersionId: version.id,
      expectedSkillRevision: root.revision, requestId: randomUUID(),
    };
    const cloned = await machine.call("skill_draft_clone", cloneInput);
    assert.equal(cloned.status, 200, JSON.stringify(cloned.body));
    assert.equal(cloned.body.status, "draft");
    assert.deepEqual((await machine.call("skill_draft_clone", cloneInput)).body, cloned.body);
    const saveInput = {
      skillId: version.skillId, versionId: cloned.body.id, expectedRevision: cloned.body.revision,
      manifest: { ...cloned.body.manifest, name: "机器编辑 " + domain }, requestId: randomUUID(),
    };
    const saved = await machine.call("skill_draft_save", saveInput);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual((await machine.call("skill_draft_save", saveInput)).body, saved.body);
    assert.equal((await machine.call("skill_draft_save", { ...saveInput, requestId: randomUUID() })).status, 409);
    assert.equal((await machine.call("skill_draft_save", {
      ...saveInput, versionId: version.id, expectedRevision: version.revision, requestId: randomUUID(),
    })).status, 409);
    const historical = await machine.call("skill_version_get", { skillId: version.skillId, versionId: version.id });
    assert.equal(historical.body.digest, version.digest);
    assert.equal(historical.body.manifest.name, version.manifest.name);
    const later = await machine.call("skill_draft_save", {
      ...saveInput, expectedRevision: saved.body.revision, requestId: randomUUID(),
      manifest: { ...saved.body.manifest, name: "后续编辑 " + domain },
    });
    assert.equal(later.status, 200, JSON.stringify(later.body));
    assert.deepEqual((await machine.call("skill_draft_save", saveInput)).body, saved.body);
    assert.deepEqual((await machine.call("skill_draft_clone", cloneInput)).body, cloned.body);
  }
});

test("skill draft attachments require this connection's upload until attached, and fixed references stay domain scoped", async () => {
  const first = await issue("cover"), second = await issue("cover");
  const library = (await admin.request("/admin/skills/cover/" + context.methods.cover.skillId)).body;
  const draft = library.latest;
  const file = await skillReference(first, draft.skillId);
  const input = {
    skillId: draft.skillId, versionId: draft.id, expectedRevision: draft.revision,
    manifest: { ...draft.manifest, references: [{ path: "references/guide.md", fileId: file.fileId }],
      instructions: "阅读 [固定参考](references/guide.md)，保持共同设定。" },
    requestId: randomUUID(),
  };
  assert.equal((await second.call("skill_draft_save", input)).status, 403);
  const stored = await first.call("skill_draft_save", input);
  assert.equal(stored.status, 200, JSON.stringify(stored.body));
  assert.equal(stored.body.files[0].file.id, file.fileId);
  assert.equal(JSON.stringify(stored.body).includes("downloadPath"), false);
  assert.equal(JSON.stringify(stored.body).includes("uploadPath"), false);
  const continued = await second.call("skill_draft_save", {
    ...input, expectedRevision: stored.body.revision, requestId: randomUUID(),
  });
  assert.equal(continued.status, 200, JSON.stringify(continued.body));
  let active = continued.body;
  for (const action of ["review", "activate"]) {
    const changed = await admin.request(skillPath(active) + "/" + action, "POST", {
      expectedRevision: active.revision, requestId: randomUUID(),
    });
    assert.equal(changed.status, 200);
    active = changed.body;
  }
  const set = await admin.request("/admin/creative-profiles/" + context.profile.id + "/skill-sets", "POST", {
    expectedRevision: context.skillSet.revision, requestId: randomUUID(), note: "封面固定参考",
    bindings: context.skillSet.bindings.map((row: any) => ({
      purpose: row.purpose, skillVersionId: row.domain === "cover" ? active.id : row.version.id,
    })),
  });
  assert.equal(set.status, 200, JSON.stringify(set.body));
  const reference = await first.call("skill_reference_get", {
    skillSetId: set.body.id, purpose: "cover_design", fileId: file.fileId,
  });
  assert.equal(reference.status, 200, JSON.stringify(reference.body));
  assert.equal(reference.body.text, file.text);
  assert.equal(reference.body.checksum, sha(file.text));
  const bundle = await first.call("context_bundle_get", {
    ...contextInput(), skillSetId: set.body.id,
  });
  assert.equal(bundle.status, 200, JSON.stringify(bundle.body));
  assert.equal(bundle.body.skillVersions[0].version.files[0].file.id, file.fileId);
  assert.equal(JSON.stringify(bundle.body).includes("downloadPath"), false);
  const videoMachine = await issue("video");
  for (const [machine, query] of [
    [videoMachine, { skillSetId: set.body.id, purpose: "cover_design", fileId: file.fileId }],
    [first, { skillSetId: context.skillSet.id, purpose: "cover_design", fileId: file.fileId }],
    [first, { skillSetId: set.body.id, purpose: "cover_design", fileId: randomUUID() }],
  ] as const) assert.ok([403, 404].includes((await machine.call("skill_reference_get", query)).status));
  const other = await createSkill("cover");
  assert.equal((await first.call("skill_version_get", { skillId: other.skillId, versionId: other.id })).status, 403);
  assert.equal((await first.call("skill_version_get", {
    skillId: context.methods.cover.skillId, versionId: context.methods.video.id,
  })).status, 403);
});

function videoFrom(assessment: any, copy: any, target = context) {
  const questions = target.configuration.questions.slice(0, 2);
  const hook = "发现自己的相处节奏", cta = "把一个温柔的表达带回生活";
  const sources = [
    ...questions.map((q: any, i: number) => ({
      revision: assessment, locator: { kind: "question", questionId: q.id },
      sceneId: "question-" + (i + 1), role: "question", text: q.text,
    })),
    { revision: copy, locator: { kind: "block", blockId: "hook" }, sceneId: "hook", role: "hook", text: hook },
    { revision: copy, locator: { kind: "block", blockId: "cta" }, sceneId: "cta", role: "cta", text: cta },
  ];
  const input = assetInput("video", {}, target);
  input.authoring.content = {
    kind: "video", scenes: sources.map((source, i) => ({
      sceneId: source.sceneId, startMs: i * 3000, endMs: (i + 1) * 3000, text: source.text,
    })),
  };
  (input.authoring as any).inputs = sources.map(source => ({
    sourceRevisionId: source.revision.id, sourceDigest: source.revision.digest,
    locator: source.locator, targetLocator: { kind: "scene", sceneId: source.sceneId },
    role: source.role, mode: "exact", usedText: source.text,
  }));
  return input;
}

function fullCopy(target = context) {
  const input = assetInput("copy", {}, target);
  input.authoring.content = { kind: "copy", blocks: [
    { blockId: "hook", role: "hook", text: "发现自己的相处节奏" },
    { blockId: "cta", role: "cta", text: "把一个温柔的表达带回生活" },
  ] };
  return input;
}

test("a video pins two questions plus hook and CTA; source changes require explicit reference updates", async () => {
  const copyMachine = await issue("copy"), videoMachine = await issue("video");
  const copy = await saved(copyMachine, fullCopy());
  const input = videoFrom(context.assessment, copy);
  const row = await saved(videoMachine, input);
  const edges = await fixture.runtime.client.contentReference.findMany({ where: { targetRevisionId: row.id } });
  assert.equal(edges.length, 4);
  assert.equal(edges.filter(edge => edge.sourceRevisionId === context.assessment.id).length, 2);
  assert.equal(edges.filter(edge => edge.sourceRevisionId === copy.id).length, 2);
  const read = await videoMachine.call("get", { revisionId: row.id });
  assert.equal(read.body.production.inputManifest.length, 4);
  for (const key of ['"score"', '"configuration"', '"reportTemplate"']) {
    assert.equal(JSON.stringify(read.body.production.inputManifest).includes(key), false);
  }
  const update = fullCopy();
  update.assetId = copy.assetId;
  update.expectedRevision = copy.sourceRevision;
  const changed = await saved(copyMachine, update);
  const validation = await videoMachine.call("references_validate", {
    ...contextInput(context, questionInputs()), targetRevisionId: row.id,
  });
  assert.equal(validation.status, 200, JSON.stringify(validation.body));
  assert.equal(validation.body.impact.needsReview, true);
  assert.ok(validation.body.impact.alerts.some((alert: any) => alert.code === "source_updated"));
  const replacement = videoFrom(context.assessment, changed);
  replacement.assetId = row.assetId;
  replacement.expectedRevision = row.sourceRevision;
  const updated = await saved(videoMachine, replacement);
  const newEdges = await fixture.runtime.client.contentReference.findMany({ where: { targetRevisionId: updated.id } });
  assert.equal(newEdges.filter(edge => edge.sourceRevisionId === changed.id).length, 2);
  assert.equal(await fixture.runtime.client.contentReference.count({ where: { targetRevisionId: row.id, sourceRevisionId: copy.id } }), 2);
  const missing = videoFrom(context.assessment, changed);
  (missing.authoring.inputs as any[])[0].locator.questionId = "missing-question";
  const before = await fixture.runtime.client.campaignAsset.count();
  assert.equal((await videoMachine.call("draft_save", missing)).status, 409);
  assert.equal(await fixture.runtime.client.campaignAsset.count(), before);
});

test("machine drafts reject cyclic content references and cannot turn a manual provenance label into authenticated machine provenance", async () => {
  const machine = await issue("copy");
  const a = await saved(machine, assetInput("copy"));
  const bInput = assetInput("copy");
  const reference = (source: any) => ({
    sourceRevisionId: source.id, sourceDigest: source.digest,
    locator: { kind: "block", blockId: "hook" }, targetLocator: { kind: "block", blockId: "hook" },
    role: "hook", mode: "exact", usedText: "发现自己的相处节奏",
  });
  (bInput.authoring as any).inputs = [reference(a)];
  const b = await saved(machine, bInput);
  const cycle = assetInput("copy", { assetId: a.assetId, expectedRevision: a.sourceRevision });
  (cycle.authoring as any).inputs = [reference(b)];
  const before = await fixture.runtime.client.contentRevision.count();
  assert.equal((await machine.call("draft_save", cycle)).status, 409);
  assert.equal(await fixture.runtime.client.contentRevision.count(), before);
  const manual = assetInput("copy");
  const result = await admin.request("/admin/content-assets", "POST", {
    ...manual, authoring: { ...manual.authoring, production: { ...manual.authoring.production, source: "mcp" } },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const read = await machine.call("get", { revisionId: result.body.id });
  assert.equal(read.body.production.source, "mcp");
  assert.equal("machineCredentialId" in read.body.production, false);
  assert.equal("machineRequestId" in read.body.production, false);
});

test("four actual SDK stdio clients save one consistent assessment, copy, cover and video draft through the backend", async () => {
  const sourceDirectory = await mkdtemp(join(tmpdir(), "orai-t14-content-client-"));
  const receipts: Partial<Record<Domain, any>> = {};
  try {
    await Promise.all([
      writeFile(join(sourceDirectory, "cover.jpg"), jpeg),
      writeFile(join(sourceDirectory, "preview.mp4"), video),
    ]);
    for (const domain of ["assessment", "copy", "cover", "video"] as const) {
      const machine = await issue(domain);
      const target = receipts.assessment
        ? { ...context, version: { ...context.version, id: receipts.assessment.productVersionId },
            assessment: { ...context.assessment, id: receipts.assessment.revisionId, digest: receipts.assessment.digest } }
        : context;
      const draftInput = domain === "assessment" ? assessmentInput()
        : domain === "copy" ? fullCopy(target)
        : domain === "video" ? videoFrom(target.assessment, {
            id: receipts.copy.revisionId, digest: receipts.copy.digest,
          }, target)
        : assetInput("cover", {}, target);
      const inputs = domain === "assessment" ? [] : questionInputs(target);
      if (domain === "video") {
        inputs.push(...["hook", "cta"].map(blockId => ({
          revisionId: receipts.copy.revisionId, digest: receipts.copy.digest,
          locator: { kind: "block", blockId },
        })));
      }
      const scenario = {
        productId: context.product.id, creativeProfileRevisionId: context.profile.id,
        skillSetId: context.skillSet.id, skillId: context.methods[domain].skillId,
        skillVersionId: context.methods[domain].id, inputs, draftInput,
        ...((domain === "cover" || domain === "video") ? {
          upload: {
            filePath: domain === "cover" ? "cover.jpg" : "preview.mp4",
            target: { type: "media", productVersionId: target.version.id, kind: domain },
            mimeType: domain === "cover" ? "image/jpeg" : "video/mp4",
          },
        } : {}),
      };
      let stdout: string;
      try {
        ({ stdout } = await execute(process.execPath, [
          resolve(process.cwd(), "../../packages/mcp/test/real-content-client.mjs"),
        ], {
          cwd: resolve(process.cwd(), "../.."),
          env: {
            PATH: process.env.PATH,
            ORAI_MCP_API_URL: base, ORAI_MCP_TOKEN: machine.token, ORAI_MCP_DOMAIN: domain,
            ORAI_MCP_ALLOWED_ROOT: sourceDirectory,
            ORAI_MCP_CONTENT_SCENARIO_JSON: JSON.stringify(scenario),
          },
          timeout: 60_000, maxBuffer: 32_000,
        }));
      } catch {
        assert.fail("The real MCP content client failed for domain " + domain);
      }
      const receipt = JSON.parse(stdout);
      assert.equal(receipt.ok, true);
      assert.equal(receipt.domain, domain);
      assert.equal(receipt.draftIdempotent, true);
      assert.equal(receipt.source, "mcp");
      assert.equal(receipt.machineCredentialId, machine.credential.id);
      assert.equal(receipt.machineRequestId, draftInput.requestId);
      assert.equal(receipt.creativeProfileRevisionId, context.profile.id);
      assert.equal(receipt.skillSetId, context.skillSet.id);
      assert.equal(receipt.inputs, inputs.length);
      receipts[domain] = receipt;
      const stored = await fixture.runtime.client.contentRevision.findUniqueOrThrow({
        where: { id: receipt.revisionId }, include: { production: true },
      });
      assert.equal(stored.productId, context.product.id);
      assert.equal(stored.domain, domain);
      assert.equal(stored.production!.machineCredentialId, machine.credential.id);
      assert.equal(stored.production!.machineRequestId, draftInput.requestId);
      const version = await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: stored.productVersionId } });
      assert.equal(version.status, "DRAFT");
      if (receipt.assetId) {
        const asset = await fixture.runtime.client.campaignAsset.findUniqueOrThrow({ where: { id: receipt.assetId } });
        assert.equal(asset.status, "DRAFT");
      }
      if (receipt.fileId) {
        const file = await fixture.runtime.client.assetFile.findUniqueOrThrow({ where: { id: receipt.fileId } });
        assert.equal(file.status, "AVAILABLE");
        assert.deepEqual(await readFile(join(directory, file.storageKey)), domain === "cover" ? jpeg : video);
      }
      assert.equal(stdout.includes(machine.token), false);
      assert.equal(stdout.includes(sourceDirectory), false);
    }
    assert.equal(new Set(domains.map(domain => receipts[domain].productVersionId)).size, 1);
    const references = await fixture.runtime.client.contentReference.findMany({
      where: { targetRevisionId: receipts.video.revisionId },
    });
    assert.equal(references.length, 4);
    assert.equal(references.filter(row => row.sourceRevisionId === receipts.assessment.revisionId).length, 2);
    assert.equal(references.filter(row => row.sourceRevisionId === receipts.copy.revisionId).length, 2);
  } finally {
    await rm(sourceDirectory, { recursive: true, force: true });
  }
});

test("structured machine reads use a separate read budget and do not throttle browser reads or writes", async () => {
  const machine = await issue("assessment");
  const security = app.get<{ security: { readIpLimit: number; writeIpLimit: number } }>(APP_CONFIG).security;
  const originalLimits = { readIpLimit: security.readIpLimit, writeIpLimit: security.writeIpLimit };
  const kinds = ["machine-read-ip", "machine-write-ip", "anonymous-read-ip", "anonymous-runtime-write-ip", "anonymous-write-ip"];
  const keys = Object.fromEntries(kinds.map(kind => [kind, sha("DEMO:" + kind + ":127.0.0.1")]));
  const previous = await fixture.owner.client.requestRateBucket.findMany({
    where: { keyHash: { in: Object.values(keys) } },
  });
  const hits = async (kind: string) => (await fixture.owner.client.requestRateBucket.findUnique({
    where: { keyHash: keys[kind]! },
  }))?.hits ?? 0;
  try {
    // The disposable fixture gets independent empty windows and one allowed
    // write. Repeated POST reads must use the larger read budget, not writes.
    security.readIpLimit = 20;
    security.writeIpLimit = 1;
    await fixture.owner.client.requestRateBucket.deleteMany({
      where: { keyHash: { in: Object.values(keys) } },
    });
    assert.equal((await machine.request("/connection")).status, 200);
    for (const [operation, input] of [
      ["list", { productId: context.product.id }],
      ["get", { revisionId: context.assessment.id }],
      ["skill_list", {}],
      ["skill_version_get", { skillId: context.methods.assessment.skillId, versionId: context.methods.assessment.id }],
      ["context_bundle_get", contextInput()],
      ["references_validate", contextInput()],
      ["assessment_validate", { productId: context.product.id, configuration: context.configuration }],
    ] as const) {
      const response = await machine.call(operation, input);
      assert.equal(response.status, 200, operation + " must use the machine read allowance");
    }
    assert.equal(await hits("machine-read-ip"), 8);
    assert.equal(await hits("machine-write-ip"), 0);
    const firstWrite = await machine.call("draft_save", assessmentInput());
    assert.equal(firstWrite.status, 200, JSON.stringify(firstWrite.body));
    const secondWrite = await machine.call("draft_save", assessmentInput());
    assert.equal(secondWrite.status, 429);
    assert.ok(Number(secondWrite.headers.get("retry-after")) > 0);
    assert.equal(await hits("machine-write-ip"), 2);
    for (const kind of ["anonymous-read-ip", "anonymous-runtime-write-ip", "anonymous-write-ip"]) {
      assert.equal(await hits(kind), 0, "machine requests must leave browser budgets unchanged");
    }
    assert.equal((await admin.request("/admin/machine-credentials")).status, 200);
    const manual = assetInput("copy");
    const browserWrite = await admin.request("/admin/content-assets", "POST", {
      ...manual, authoring: { ...manual.authoring, production: { ...manual.authoring.production, source: "manual" } },
    });
    assert.equal(browserWrite.status, 200, JSON.stringify(browserWrite.body));
    assert.equal(await hits("anonymous-read-ip"), 1);
    assert.equal(await hits("anonymous-runtime-write-ip"), 1);
    assert.equal(await hits("machine-read-ip"), 8);
    assert.equal(await hits("machine-write-ip"), 2);
  } finally {
    Object.assign(security, originalLimits);
    for (const keyHash of Object.values(keys)) {
      const original = previous.find(row => row.keyHash === keyHash);
      if (original) {
        await fixture.owner.client.requestRateBucket.upsert({
          where: { keyHash }, create: original,
          update: { hits: original.hits, windowEndsAt: original.windowEndsAt },
        });
      } else {
        await fixture.owner.client.requestRateBucket.deleteMany({ where: { keyHash } });
      }
    }
  }
});

