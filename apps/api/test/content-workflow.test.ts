import "reflect-metadata";
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import {
  CreativeProfileSchema,
  ContentAssetSaveSchema,
  LocalArchiveSchema,
} from "@orai/contracts/admin";
import { AssetStorage } from "../src/operations/asset-storage";
import {
  AdminProductInputSchema,
  ContentPackageSchema,
} from "@orai/contracts/admin";
import { stableDiff } from "../src/operations/content-workflow.service";
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
  admin: Browser;
let directory: string;
const proofs = new Map<string, SupabaseIdentity>();
const refreshes = new Map<
  string,
  { accessToken: string; refreshToken: string }
>();
const productId = demoId("demo-partner"),
  versionId = demoId("demo-partner-v2");
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const profileData = () => ({
  schemaVersion: 1,
  title: "伴侣协作创作设定",
  audience: "想了解相处需要的成年人",
  situation: "一次轻松的自我观察",
  emotionalGoal: "感到被理解",
  understandingGoal: "理解自己的沟通需要",
  takeaway: "带走一个可以尝试的表达方式",
  perspective: "single_person_relationship",
  experienceForm: "web",
  pace: "逐题作答",
  world: "一座温柔的花园",
  language: "尊重与好奇",
  visual: "柔和紫绿",
  sound: "安静",
  reportPlan: {
    schemaVersion: 1,
    title: "花园观察札记",
    narrative: "基于作答给出解释与建议",
    presentation: "journal",
    sections: [
      {
        sectionId: "summary",
        title: "我的观察",
        purpose: "说明倾向和下一步表达",
      },
    ],
  },
  channels: ["manual"],
  deliverables: ["assessment", "copy", "cover", "video"],
});

class Browser {
  cookies = new Map<string, string>();
  csrf = "";
  async request(
    path: string,
    method = "GET",
    body?: unknown,
    extra: Record<string, string> = {},
  ) {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        cookie: [...this.cookies]
          .map(([key, value]) => key + "=" + value)
          .join(";"),
        origin: fixture.configuration.security.origins[0]!,
        ...(method === "GET"
          ? {}
          : { "content-type": "application/json", "x-csrf-token": this.csrf }),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const item = cookie.split(";")[0]!,
        at = item.indexOf("=");
      this.cookies.set(item.slice(0, at), item.slice(at + 1));
    }
    return {
      status: response.status,
      body: await response.json(),
      headers: response.headers,
    };
  }
  async login(adminUser = true) {
    this.csrf = (await this.request("/account/context")).body.csrfToken;
    const accessToken = randomBytes(50).toString("base64url"),
      refreshToken = randomBytes(40).toString("base64url");
    proofs.set(accessToken, {
      supabaseUserId: adminUser
        ? DemoIdentityScenarios.admin.supabaseUserId
        : randomUUID(),
      supabaseSessionId: randomUUID(),
      emailVerified: true,
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    refreshes.set(refreshToken, { accessToken, refreshToken });
    assert.equal(
      (
        await this.request("/account/session", "POST", {
          accessToken,
          refreshToken,
        })
      ).status,
      200,
    );
    return this;
  }
}
before(async () => {
  fixture = await createLocalFixture("t12");
  directory = await mkdtemp(join(tmpdir(), "orai-t12-"));
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
        const proof = proofs.get(token);
        if (!proof) throw new ApiException("AUTH_REQUIRED", "Invalid", 401);
        return proof;
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

async function profile(target = productId) {
  const current = await admin.request(
    "/admin/products/" + target + "/creative-profiles",
  );
  assert.equal(current.status, 200);
  const response = await admin.request(
    "/admin/products/" + target + "/creative-profiles",
    "POST",
    {
      profile: profileData(),
      expectedRevision: current.body.items[0]?.revision ?? 0,
      requestId: randomUUID(),
    },
  );
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}
async function assessment() {
  const response = await admin.request(
    "/admin/content-revisions?productId=" + productId + "&domain=assessment",
  );
  assert.equal(response.status, 200);
  return response.body.items.find(
    (row: { productVersionId: string }) => row.productVersionId === versionId,
  );
}
function authoring(
  profileId: string,
  content: unknown = {
    kind: "copy",
    blocks: [{ blockId: "hook", role: "hook", text: "发现自己的相处节奏" }],
  },
) {
  return {
    schemaVersion: 1,
    creativeProfileRevisionId: profileId,
    content,
    media: { localArchive: null, previewFileId: null },
    inputs: [],
    production: {
      source: "external_ai",
      batchKey: "daily-example",
      externalLabel: "isolated authoring test",
      skillVersionId: null,
    },
  };
}
async function copy(profileId: string) {
  const response = await admin.request("/admin/content-assets", "POST", {
    productVersionId: versionId,
    platform: "manual",
    variant: randomUUID(),
    expectedRevision: 0,
    requestId: randomUUID(),
    fileId: null,
    authoring: authoring(profileId),
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}

async function fresh() {
  const original = (await admin.request("/admin/products/" + productId)).body;
  const metadata = AdminProductInputSchema.strip().parse(original);
  const product = (
    await admin.request("/admin/products", "POST", {
      ...metadata,
      slug: "workflow-" + randomUUID(),
      name: "关系花园内容包",
      requestId: randomUUID(),
    })
  ).body;
  const configuration = (
    await admin.request(
      "/admin/products/" + productId + "/versions/" + versionId + "/preview",
    )
  ).body.configuration;
  const version = (
    await admin.request("/admin/products/" + product.id + "/versions", "POST", {
      configuration,
      requestId: randomUUID(),
    })
  ).body;
  const brief = await profile(product.id);
  assert.equal(
    (
      await admin.request(
        "/admin/products/" + product.id + "/versions/" + version.id + "/review",
        "POST",
        { expectedRevision: 0, requestId: randomUUID() },
      )
    ).status,
    200,
  );
  const assessment = (
    await admin.request(
      "/admin/content-revisions?productId=" +
        product.id +
        "&productVersionId=" +
        version.id +
        "&current=true",
    )
  ).body.items[0];
  const record = await admin.request("/admin/production-records", "POST", {
    outputRevisionId: assessment.id,
    creativeProfileRevisionId: brief.id,
    production: {
      source: "manual",
      batchKey: "garden-sample",
      externalLabel: null,
      skillVersionId: null,
    },
    requestId: randomUUID(),
  });
  assert.equal(record.status, 200);
  return { product, version, brief, assessment, configuration };
}
async function save(
  context: Awaited<ReturnType<typeof fresh>>,
  content: unknown,
  inputs: unknown[] = [],
  fileId: string | null = null,
  previous?: { assetId: string; sourceRevision: number },
  variant = randomUUID(),
) {
  const result = await admin.request("/admin/content-assets", "POST", {
    productVersionId: context.version.id,
    platform: "manual",
    variant,
    fileId,
    expectedRevision: previous?.sourceRevision ?? 0,
    ...(previous ? { assetId: previous.assetId } : {}),
    authoring: { ...authoring(context.brief.id, content), inputs },
    requestId: randomUUID(),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body;
}
async function ready(row: {
  assetId: string;
  productId: string;
  sourceRevision: number;
}) {
  const reviewed = await admin.request(
    "/admin/assets/" + row.assetId + "/review",
    "POST",
    { expectedRevision: row.sourceRevision, requestId: randomUUID() },
  );
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
  assert.equal(
    (
      await admin.request("/admin/assets/" + row.assetId + "/ready", "POST", {
        expectedRevision: reviewed.body.revision,
        requestId: randomUUID(),
      })
    ).status,
    200,
  );
  return (
    await admin.request(
      "/admin/content-revisions?productId=" +
        row.productId +
        "&assetId=" +
        row.assetId +
        "&current=true",
    )
  ).body.items[0];
}
async function uploaded(
  context: Awaited<ReturnType<typeof fresh>>,
  kind = "cover",
) {
  const fileName = kind === "cover" ? "cover.jpg" : "preview.mp4",
    mimeType = kind === "cover" ? "image/jpeg" : "video/mp4",
    bytes = await readFile("test/fixtures/" + fileName);
  const prepared = await admin.request("/admin/uploads", "POST", {
    productVersionId: context.version.id,
    kind,
    fileName,
    mimeType,
    byteSize: bytes.length,
    checksum: createHash("sha256").update(bytes).digest("hex"),
    requestId: randomUUID(),
  });
  assert.equal(prepared.status, 200);
  const response = await fetch(base + prepared.body.uploadPath, {
    method: "PUT",
    headers: {
      cookie: [...admin.cookies]
        .map(([key, value]) => key + "=" + value)
        .join(";"),
      origin: fixture.configuration.security.origins[0]!,
      "x-csrf-token": admin.csrf,
      "content-type": "application/octet-stream",
    },
    body: bytes,
  });
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  const result = await admin.request(
    "/admin/uploads/" + prepared.body.id + "/complete",
    "POST",
    { requestId: randomUUID() },
  );
  assert.equal(result.status, 200);
  return result.body;
}
async function bundle() {
  const context = await fresh(),
    hook = "你的需要值得被认真听见",
    cta = "来花园里认识自己";
  const copyDraft = await save(context, {
    kind: "copy",
    blocks: [
      { blockId: "hook", role: "hook", text: hook },
      { blockId: "cta", role: "cta", text: cta },
    ],
  });
  const copyReady = await ready(copyDraft),
    coverFile = await uploaded(context),
    videoFile = await uploaded(context, "video");
  const coverDraft = await save(
    context,
    { kind: "cover", title: "关系花园", description: "水彩花园 · " + hook },
    [
      {
        sourceRevisionId: copyDraft.id,
        sourceDigest: copyDraft.digest,
        locator: { kind: "block", blockId: "hook" },
        targetLocator: { kind: "whole" },
        role: "hook",
        mode: "exact",
        usedText: hook,
      },
    ],
    coverFile.id,
  );
  const coverReady = await ready(coverDraft),
    questions = context.configuration.questions.slice(0, 2),
    scenes = [
      { sceneId: "opening", startMs: 0, endMs: 1000, text: hook },
      ...questions.map((q: { id: string; text: string }, index: number) => ({
        sceneId: "question-" + (index + 1),
        startMs: (index + 1) * 1000,
        endMs: (index + 2) * 1000,
        text: q.text,
      })),
      { sceneId: "closing", startMs: 3000, endMs: 4000, text: cta },
    ];
  const inputs = [
    {
      sourceRevisionId: copyDraft.id,
      sourceDigest: copyDraft.digest,
      locator: { kind: "block", blockId: "hook" },
      targetLocator: { kind: "scene", sceneId: "opening" },
      role: "hook",
      mode: "exact",
      usedText: hook,
    },
    ...questions.map((q: { id: string; text: string }, index: number) => ({
      sourceRevisionId: context.assessment.id,
      sourceDigest: context.assessment.digest,
      locator: { kind: "question", questionId: q.id },
      targetLocator: { kind: "scene", sceneId: "question-" + (index + 1) },
      role: "question",
      mode: "exact",
      usedText: q.text,
    })),
    {
      sourceRevisionId: copyDraft.id,
      sourceDigest: copyDraft.digest,
      locator: { kind: "block", blockId: "cta" },
      targetLocator: { kind: "scene", sceneId: "closing" },
      role: "cta",
      mode: "exact",
      usedText: cta,
    },
  ];
  const videoDraft = await save(
      context,
      { kind: "video", scenes },
      inputs,
      videoFile.id,
    ),
    videoReady = await ready(videoDraft);
  const selection = {
    productId: context.product.id,
    creativeProfileRevisionId: context.brief.id,
    assessmentRevisionId: context.assessment.id,
    assetRevisionIds: [copyReady.id, coverReady.id, videoReady.id],
    reportMode: "compatible_standard",
    label: "关系花园 · 固定采用",
  };
  return {
    ...context,
    hook,
    cta,
    copyDraft,
    copyReady,
    coverDraft,
    coverReady,
    videoDraft,
    videoReady,
    coverFile,
    videoFile,
    selection,
  };
}
async function adopt(
  selection: unknown,
  preview?: any,
  requestId = randomUUID(),
) {
  const checked =
    preview ??
    (await admin.request("/admin/content-packages/preview", "POST", selection))
      .body;
  return admin.request("/admin/content-packages", "POST", {
    selection,
    expectedFingerprint: checked.fingerprint,
    expectedPackageNumber: checked.latestPackageNumber,
    note: "已核对语气、意象、理解目标与传播承诺",
    consistencyConfirmed: true,
    requestId,
  });
}
async function changeCopy(
  context: Awaited<ReturnType<typeof bundle>>,
  text: string,
  previous = context.copyReady,
) {
  return save(
    context,
    {
      kind: "copy",
      blocks: [
        { blockId: "hook", role: "hook", text },
        { blockId: "cta", role: "cta", text: context.cta },
      ],
    },
    [],
    null,
    previous,
    context.copyReady.snapshot.variant,
  );
}

test("diffs align stable IDs while separately retaining order changes and bounded output", () => {
  const a = {
      questions: [
        { id: "first", text: "一" },
        { id: "second", text: "二" },
      ],
    },
    b = {
      questions: [
        { id: "second", text: "改写" },
        { id: "first", text: "一" },
      ],
    };
  const diff = stableDiff(a, b);
  assert.ok(
    diff.changes.some((value) => value.path === "/questions/second/text"),
  );
  assert.ok(diff.changes.some((value) => value.path.includes("$order")));
  assert.equal(
    diff.changes.some((value) => value.path === "/questions/first/text"),
    false,
  );
  const many = stableDiff(
    Object.fromEntries(Array.from({ length: 600 }, (_, i) => ["key" + i, 0])),
    Object.fromEntries(Array.from({ length: 600 }, (_, i) => ["key" + i, 1])),
  );
  assert.equal(many.changes.length, 500);
  assert.equal(many.truncated, true);
});

test("a four-domain package fixes question/hook/CTA references and exports only authoring facts without rewriting consumers", async () => {
  const context = await bundle(),
    before = await fixture.runtime.client.report.count(),
    preview = await admin.request(
      "/admin/content-packages/preview",
      "POST",
      context.selection,
    );
  assert.equal(preview.status, 200);
  assert.equal(
    preview.body.canAdopt,
    true,
    JSON.stringify(preview.body.issues),
  );
  const saved = await adopt(context.selection, preview.body);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(ContentPackageSchema.safeParse(saved.body).success, true);
  assert.equal(
    saved.body.manifest.assets.find(
      (value: any) => value.revision.domain === "video",
    ).inputs.length,
    4,
  );
  assert.ok(
    saved.body.manifest.dependencies.some(
      (value: any) => value.id === context.copyDraft.id,
    ),
  );
  const output = JSON.stringify(saved.body);
  for (const forbidden of [
    "actorUserId",
    "accessToken",
    "refreshToken",
    "storageKey",
    "ownerUserId",
    "attemptId",
    "account_sessions",
  ])
    assert.equal(output.includes('"' + forbidden + '"'), false);
  const fixed = await admin.request("/admin/content-packages/" + saved.body.id);
  assert.deepEqual(fixed.body, saved.body);
  assert.equal(await fixture.runtime.client.report.count(), before);
  const existing = await fixture.runtime.client.contentPackageItem.count({
    where: { packageId: saved.body.id },
  });
  assert.ok(existing >= 5);
  await assert.rejects(
    fixture.owner.pool.query(
      "UPDATE orai.content_packages SET label=$1 WHERE id=$2",
      ["rewrite", saved.body.id],
    ),
    (error: { code?: string }) => error.code === "23514",
  );
});

test("source changes create direct and transitive recheck signals while preserving old snapshots and adopted packages", async () => {
  const context = await bundle(),
    saved = await adopt(context.selection),
    old = await admin.request(
      "/admin/content-revisions/" + context.videoReady.id,
    );
  assert.equal(
    (
      await admin.request(
        "/admin/content-revisions/" + context.videoReady.id + "/impact",
      )
    ).body.needsReview,
    false,
  );
  await changeCopy(context, "新钩子");
  for (const row of [context.videoReady, context.coverReady]) {
    const impact = (
      await admin.request("/admin/content-revisions/" + row.id + "/impact")
    ).body;
    assert.equal(impact.needsReview, true);
    assert.ok(
      impact.alerts.some(
        (value: any) =>
          value.code === "source_updated" &&
          value.revisionId === context.copyDraft.id,
      ),
    );
  }
  assert.deepEqual(
    (await admin.request("/admin/content-revisions/" + context.videoReady.id))
      .body,
    old.body,
  );
  assert.deepEqual(
    (await admin.request("/admin/content-packages/" + saved.body.id)).body,
    saved.body,
  );
  const usedBy = await admin.request(
    "/admin/content-references?sourceRevisionId=" + context.copyDraft.id,
  );
  assert.ok(
    usedBy.body.items.some(
      (value: any) => value.targetRevisionId === context.videoReady.id,
    ),
  );
  const changedProfile = await admin.request(
    "/admin/products/" + context.product.id + "/creative-profiles",
    "POST",
    {
      profile: { ...profileData(), emotionalGoal: "更多安全感" },
      expectedRevision: 1,
      requestId: randomUUID(),
    },
  );
  assert.equal(changedProfile.status, 200);
  assert.ok(
    (
      await admin.request(
        "/admin/content-revisions/" + context.videoReady.id + "/impact",
      )
    ).body.alerts.some((value: any) => value.code === "profile_updated"),
  );
});

test("rechecks bind the observed fingerprint, accept explicit legitimate old combinations, and expire after another change", async () => {
  const context = await bundle();
  const newer = await changeCopy(context, "新钩子 A");
  const impacts = [];
  for (const row of [context.copyReady, context.coverReady, context.videoReady])
    impacts.push({
      row,
      impact: (
        await admin.request("/admin/content-revisions/" + row.id + "/impact")
      ).body,
    });
  for (const { row, impact } of impacts) {
    assert.equal(impact.needsReview, true);
    const payload = {
      expectedFingerprint: impact.fingerprint,
      note: "已复查，保留旧版本用于这一轮内容",
      requestId: randomUUID(),
    };
    const reviewed = await admin.request(
      "/admin/content-revisions/" + row.id + "/recheck",
      "POST",
      payload,
    );
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.needsReview, false);
    assert.equal(
      (
        await admin.request(
          "/admin/content-revisions/" + row.id + "/recheck",
          "POST",
          payload,
        )
      ).status,
      200,
    );
  }
  const approved = await adopt(context.selection);
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.manifest.reviews.length, 3);
  const previous = impacts.at(-1)!;
  await changeCopy(context, "新钩子 B", newer);
  assert.equal(
    (
      await admin.request(
        "/admin/content-revisions/" + previous.row.id + "/recheck",
        "POST",
        {
          expectedFingerprint: previous.impact.fingerprint,
          note: "旧页面",
          requestId: randomUUID(),
        },
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await admin.request(
        "/admin/content-revisions/" + previous.row.id + "/impact",
      )
    ).body.needsReview,
    true,
  );
  const fixed = await admin.request(
    "/admin/content-packages/" + approved.body.id,
  );
  assert.equal(fixed.body.digest, approved.body.digest);
});

test("adoption rejects missing domains, preview-only files, inconsistent fixed sources, unsupported forms and unreviewed drafts", async () => {
  const context = await bundle();
  const missing = await admin.request(
    "/admin/content-packages/preview",
    "POST",
    {
      ...context.selection,
      assetRevisionIds: [
        context.copyReady.id,
        context.coverReady.id,
        context.coverDraft.id,
      ],
    },
  );
  assert.equal(missing.body.canAdopt, false);
  const previewOnly = await admin.request("/admin/content-assets", "POST", {
    productVersionId: context.version.id,
    platform: "manual",
    variant: "preview-only",
    fileId: null,
    expectedRevision: 0,
    requestId: randomUUID(),
    authoring: {
      ...authoring(context.brief.id, {
        kind: "cover",
        title: "仅预览",
        description: "不能充当正式文件",
      }),
      media: { localArchive: null, previewFileId: context.coverFile.id },
    },
  });
  assert.equal(previewOnly.status, 200);
  const unavailable = await admin.request(
    "/admin/content-packages/preview",
    "POST",
    {
      ...context.selection,
      assetRevisionIds: [
        context.copyReady.id,
        previewOnly.body.id,
        context.videoReady.id,
      ],
    },
  );
  assert.equal(unavailable.body.canAdopt, false);
  assert.ok(
    unavailable.body.issues.some((value: string) => value.includes("正式媒体")),
  );
  const newer = await changeCopy(context, "不同内容");
  const newerReady = await ready(newer);
  const inconsistent = await admin.request(
    "/admin/content-packages/preview",
    "POST",
    {
      ...context.selection,
      assetRevisionIds: [
        newerReady.id,
        context.coverReady.id,
        context.videoReady.id,
      ],
    },
  );
  assert.equal(inconsistent.body.canAdopt, false);
  assert.ok(
    inconsistent.body.issues.some((value: string) => value.includes("不一致")),
  );
  const planned = await admin.request(
    "/admin/products/" + context.product.id + "/creative-profiles",
    "POST",
    {
      profile: { ...profileData(), experienceForm: "3d" },
      expectedRevision: 1,
      requestId: randomUUID(),
    },
  );
  assert.equal(planned.status, 200);
  const unsupported = await admin.request(
    "/admin/content-packages/preview",
    "POST",
    { ...context.selection, creativeProfileRevisionId: planned.body.id },
  );
  assert.equal(unsupported.body.canAdopt, false);
  assert.ok(
    unsupported.body.issues.some((value: string) => value.includes("单人网页")),
  );
});

test("adoption revalidates preview state, serializes competing package numbers, and deduplicates identical requests", async () => {
  const context = await bundle(),
    preview = (
      await admin.request(
        "/admin/content-packages/preview",
        "POST",
        context.selection,
      )
    ).body,
    requestId = randomUUID();
  const results = await Promise.all([
    adopt(context.selection, preview, requestId),
    adopt(context.selection, preview, requestId),
  ]);
  assert.deepEqual(
    results.map((value) => value.status),
    [200, 200],
  );
  assert.equal(results[0]!.body.id, results[1]!.body.id);
  const stale = await adopt(context.selection, preview);
  assert.equal(stale.status, 409);
  const next = (
    await admin.request(
      "/admin/content-packages/preview",
      "POST",
      context.selection,
    )
  ).body;
  const competing = await Promise.all([
    adopt(context.selection, next),
    adopt(context.selection, next),
  ]);
  assert.deepEqual(competing.map((value) => value.status).sort(), [200, 409]);
  const check = (
    await admin.request(
      "/admin/content-packages/preview",
      "POST",
      context.selection,
    )
  ).body;
  await changeCopy(context, "并发上游变化");
  assert.equal((await adopt(context.selection, check)).status, 409);
});

test("missing bytes and archived sources block new adoption while existing manifests stay readable", async () => {
  const context = await bundle(),
    saved = await adopt(context.selection);
  assert.equal(saved.status, 200);
  await rm(join(directory, context.videoFile.id + ".blob"));
  const checked = await admin.request(
    "/admin/content-packages/preview",
    "POST",
    context.selection,
  );
  assert.equal(checked.body.canAdopt, false);
  assert.ok(
    checked.body.issues.some((value: string) => value.includes("完整性")),
  );
  assert.equal(
    (
      await admin.request(
        "/admin/assets/" + context.copyReady.assetId + "/archive",
        "POST",
        {
          expectedRevision: context.copyReady.sourceRevision,
          requestId: randomUUID(),
        },
      )
    ).status,
    200,
  );
  const impact = (
    await admin.request(
      "/admin/content-revisions/" + context.videoReady.id + "/impact",
    )
  ).body;
  assert.equal(impact.blocked, true);
  assert.equal(
    (
      await admin.request(
        "/admin/content-revisions/" + context.videoReady.id + "/recheck",
        "POST",
        {
          expectedFingerprint: impact.fingerprint,
          note: "不能绕过归档",
          requestId: randomUUID(),
        },
      )
    ).status,
    409,
  );
  assert.equal(
    (await admin.request("/admin/content-packages/" + saved.body.id)).status,
    200,
  );
});

async function expiredFile(
  context: Awaited<ReturnType<typeof fresh>>,
  name = "temporary.jpg",
) {
  const bytes = await readFile("test/fixtures/cover.jpg"),
    id = randomUUID(),
    checksum = createHash("sha256").update(bytes).digest("hex");
  await app.get(AssetStorage).receive(
    id + ".blob",
    (async function* () {
      yield bytes;
    })(),
    { byteSize: bytes.length, mimeType: "image/jpeg", checksum },
  );
  await fixture.owner.client.assetFile.create({
    data: {
      id,
      productVersionId: context.version.id,
      scope: "DEMO",
      ownerUserId: DemoIdentityScenarios.admin.id,
      kind: "COVER",
      originalName: name,
      mimeType: "image/jpeg",
      byteSize: bytes.length,
      checksum,
      storageKey: id + ".blob",
      status: "AVAILABLE",
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() - 60000),
      width: 16,
      height: 16,
    },
  });
  return id;
}
async function cleanupPreview(
  context: Awaited<ReturnType<typeof fresh>>,
  ids: string[],
) {
  const result = await admin.request("/admin/file-cleanups/preview", "POST", {
    productId: context.product.id,
    fileIds: ids,
    requestId: randomUUID(),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body;
}
async function execute(plan: any, requestId = randomUUID()) {
  return admin.request("/admin/file-cleanups/" + plan.id + "/execute", "POST", {
    expectedDigest: plan.digest,
    confirmed: true,
    requestId,
  });
}

test("cleanup protects files referenced only by archived/history snapshots and skips new references made after preview", async () => {
  const context = await fresh(),
    protectedId = await expiredFile(context, "historical.jpg"),
    freeId = await expiredFile(context);
  const saved = await save(
    context,
    { kind: "cover", title: "历史封面", description: "保留历史原件" },
    [],
    protectedId,
  );
  await save(
    context,
    { kind: "cover", title: "新草稿", description: "不再直接关联正式文件" },
    [],
    null,
    saved,
    saved.snapshot.variant,
  );
  const candidates = await admin.request(
    "/admin/products/" + context.product.id + "/cleanup-candidates",
  );
  assert.equal(candidates.status, 200);
  assert.deepEqual(
    candidates.body.items.map((value: any) => value.id),
    [freeId],
  );
  assert.equal(
    (
      await admin.request("/admin/file-cleanups/preview", "POST", {
        productId: context.product.id,
        fileIds: [protectedId],
        requestId: randomUUID(),
      })
    ).status,
    409,
  );
  const plan = await cleanupPreview(context, [freeId]);
  await save(
    context,
    { kind: "cover", title: "预演后关联", description: "此文件现在被草稿引用" },
    [],
    freeId,
  );
  const cleaned = await execute(plan);
  assert.equal(cleaned.status, 200);
  assert.equal(cleaned.body.status, "complete");
  assert.equal(cleaned.body.results[0].status, "protected");
  assert.equal(
    (
      await fixture.runtime.client.assetFile.findUniqueOrThrow({
        where: { id: freeId },
      })
    ).status,
    "AVAILABLE",
  );
  await assert.rejects(
    fixture.owner.pool.query(
      "UPDATE orai.asset_files SET status='DELETING' WHERE id=$1",
      [protectedId],
    ),
    (error: { code?: string }) => error.code === "23514",
  );
});

test("cleanup retains immutable metadata, recovers failed deletions and repeated executions never delete referenced or resurrect files", async () => {
  const context = await fresh(),
    fileId = await expiredFile(context),
    plan = await cleanupPreview(context, [fileId]),
    storage = app.get(AssetStorage),
    remove = storage.remove.bind(storage);
  let fail = true;
  storage.remove = async (key: string) => {
    if (fail) {
      fail = false;
      throw new Error("simulated storage failure");
    }
    return remove(key);
  };
  const requestId = randomUUID();
  try {
    const first = await execute(plan, requestId);
    assert.equal(first.status, 200);
    assert.equal(first.body.status, "running");
    assert.equal(first.body.results[0].status, "retry");
    assert.equal(
      (
        await fixture.runtime.client.assetFile.findUniqueOrThrow({
          where: { id: fileId },
        })
      ).status,
      "DELETING",
    );
    const associated = await admin.request("/admin/content-assets", "POST", {
      productVersionId: context.version.id,
      platform: "manual",
      variant: randomUUID(),
      fileId,
      expectedRevision: 0,
      requestId: randomUUID(),
      authoring: authoring(context.brief.id, {
        kind: "cover",
        title: "晚到关联",
        description: "不允许引用待删除文件",
      }),
    });
    assert.equal(associated.status, 409);
    const second = await execute(plan, requestId);
    assert.equal(second.body.status, "complete");
    assert.equal(second.body.results[0].status, "deleted");
    assert.equal((await execute(plan, requestId)).body.status, "complete");
    const record = await fixture.runtime.client.assetFile.findUniqueOrThrow({
      where: { id: fileId },
    });
    assert.equal(record.status, "DELETED");
    assert.equal(record.originalName, "temporary.jpg");
    await assert.rejects(readFile(join(directory, fileId + ".blob")));
    assert.equal(
      await fixture.runtime.client.adminAuditLog.count({
        where: { action: "content.cleanup-file", entityId: fileId },
      }),
      1,
    );
    await assert.rejects(
      fixture.owner.pool.query(
        "UPDATE orai.asset_files SET status='AVAILABLE' WHERE id=$1",
        [fileId],
      ),
      (error: { code?: string }) => error.code === "23514",
    );
    await assert.rejects(
      fixture.runtime.pool.query("DELETE FROM orai.asset_files WHERE id=$1", [
        fileId,
      ]),
      (error: { code?: string }) => error.code === "42501",
    );
  } finally {
    storage.remove = remove;
  }
});

test("workflow endpoints enforce scopes, ordinary-user rejection, stale plan fingerprints and CSRF/Origin boundaries", async () => {
  const context = await bundle(),
    other = await fresh(),
    ordinary = await new Browser().login(false);
  for (const path of [
    "/admin/content-revisions/" + context.videoReady.id + "/impact",
    "/admin/products/" + context.product.id + "/content-packages",
    "/admin/products/" + context.product.id + "/cleanup-candidates",
  ])
    assert.equal((await ordinary.request(path)).status, 403);
  assert.equal(
    (
      await ordinary.request(
        "/admin/content-packages/preview",
        "POST",
        context.selection,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await admin.request("/admin/content-packages/preview", "POST", {
        ...context.selection,
        productId: other.product.id,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await admin.request("/admin/content-packages/preview", "POST", {
        ...context.selection,
        scope: "live",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin.request(
        "/admin/content-revisions/" +
          context.videoReady.id +
          "/diff?to=" +
          other.assessment.id,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await admin.request(
        "/admin/content-packages/preview",
        "POST",
        context.selection,
        { origin: "https://untrusted.example.test" },
      )
    ).status,
    403,
  );
  const fileId = await expiredFile(context),
    plan = await cleanupPreview(context, [fileId]);
  assert.equal(
    (
      await admin.request(
        "/admin/file-cleanups/" + plan.id + "/execute",
        "POST",
        {
          expectedDigest: "0".repeat(64),
          confirmed: true,
          requestId: randomUUID(),
        },
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await ordinary.request(
        "/admin/file-cleanups/" + plan.id + "/execute",
        "POST",
        {
          expectedDigest: plan.digest,
          confirmed: true,
          requestId: randomUUID(),
        },
      )
    ).status,
    403,
  );
});

test("impact follows a multi-step cover-to-copy dependency and semantic status changes alone do not demand a remake", async () => {
  const context = await bundle(),
    text =
      context.coverDraft.snapshot.authoring.content.title +
      "\n" +
      context.coverDraft.snapshot.authoring.content.description;
  const script = await save(
    context,
    {
      kind: "script",
      scenes: [{ sceneId: "visual", startMs: 0, endMs: 1000, text }],
    },
    [
      {
        sourceRevisionId: context.coverDraft.id,
        sourceDigest: context.coverDraft.digest,
        locator: { kind: "whole" },
        targetLocator: { kind: "scene", sceneId: "visual" },
        role: "visual",
        mode: "exact",
        usedText: text,
      },
    ],
  );
  assert.equal(
    (await admin.request("/admin/content-revisions/" + script.id + "/impact"))
      .body.needsReview,
    false,
  );
  await changeCopy(context, "穿过两层依赖的新文案");
  const impact = (
    await admin.request("/admin/content-revisions/" + script.id + "/impact")
  ).body;
  assert.equal(impact.needsReview, true);
  assert.ok(
    impact.alerts.some(
      (value: any) => value.revisionId === context.copyDraft.id,
    ),
  );
});

test("creative-profile diffs stay scoped and status-only assessment revisions carry provenance without changing its configuration", async () => {
  const context = await fresh(),
    before = context.assessment.snapshot.configuration;
  const changed = await admin.request(
    "/admin/products/" + context.product.id + "/creative-profiles",
    "POST",
    {
      profile: { ...profileData(), language: "更具体、温柔的日常表达" },
      expectedRevision: 1,
      requestId: randomUUID(),
    },
  );
  assert.equal(changed.status, 200);
  const diff = await admin.request(
    "/admin/creative-profiles/" +
      context.brief.id +
      "/diff?to=" +
      changed.body.id,
  );
  assert.equal(diff.status, 200);
  assert.ok(diff.body.changes.some((value: any) => value.path === "/language"));
  assert.equal(
    (
      await admin.request(
        "/admin/creative-profiles/" +
          context.brief.id +
          "/diff?to=" +
          changed.body.id +
          "&scope=live",
      )
    ).status,
    400,
  );
  const published = await admin.request(
    "/admin/products/" +
      context.product.id +
      "/versions/" +
      context.version.id +
      "/publish",
    "POST",
    {
      expectedRevision: context.assessment.sourceRevision,
      requestId: randomUUID(),
    },
  );
  assert.equal(published.status, 200);
  const head = (
    await admin.request(
      "/admin/content-revisions?productId=" +
        context.product.id +
        "&domain=assessment&current=true",
    )
  ).body.items[0];
  const detail = (await admin.request("/admin/content-revisions/" + head.id))
    .body;
  assert.equal(detail.production.creativeProfileRevisionId, context.brief.id);
  assert.deepEqual(detail.snapshot.configuration, before);
});

test("expired cleanup plans and later plan tampering cannot authorize deletion", async () => {
  const context = await fresh(),
    fileId = await expiredFile(context),
    prepared = await cleanupPreview(context, [fileId]);
  const plan = await fixture.owner.client.fileCleanupPlan.create({
    data: {
      productId: context.product.id,
      scope: "DEMO",
      actorUserId: DemoIdentityScenarios.admin.id,
      digest: prepared.digest,
      files: prepared.files,
      results: [],
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  assert.equal((await execute({ ...prepared, id: plan.id })).status, 409);
  assert.equal(
    (await admin.request("/admin/file-cleanups/" + prepared.id)).body.digest,
    prepared.digest,
  );
  await assert.rejects(
    fixture.owner.pool.query(
      "UPDATE orai.file_cleanup_plans SET files=$1::jsonb WHERE id=$2",
      [JSON.stringify([]), prepared.id],
    ),
    (error: { code?: string }) => error.code === "23514",
  );
  assert.equal(
    (
      await fixture.runtime.client.assetFile.findUniqueOrThrow({
        where: { id: fileId },
      })
    ).status,
    "AVAILABLE",
  );
});
