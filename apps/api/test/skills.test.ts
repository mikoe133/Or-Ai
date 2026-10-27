import "reflect-metadata";
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { APP_CONFIG } from "../src/config/configuration";
import { configureApp } from "../src/common/configure-app";
import {
  SupabaseAuthGateway,
  type SupabaseIdentity,
} from "../src/accounts/supabase-auth.gateway";
import { ApiException } from "../src/common/http-errors";
import { DemoIdentityScenarios } from "../scripts/demo-fixtures";
import { createLocalFixture } from "./local-fixture";
import { StyleSkillVersionSchema } from "@orai/contracts/admin";
let fixture: Awaited<ReturnType<typeof createLocalFixture>>,
  app: INestApplication,
  base: string,
  directory: string,
  admin: Browser;
const proofs = new Map<string, SupabaseIdentity>(),
  refreshes = new Map<string, { accessToken: string; refreshToken: string }>();
const sha = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
class Browser {
  cookies = new Map<string, string>();
  csrf = "";
  async fetch(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
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
          : {
              "content-type":
                body instanceof Uint8Array
                  ? "application/octet-stream"
                  : "application/json",
              "x-csrf-token": this.csrf,
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
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0]!,
        at = pair.indexOf("=");
      this.cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
    return response;
  }
  async request(
    path: string,
    method = "GET",
    body?: unknown,
    headers?: Record<string, string>,
  ) {
    const response = await this.fetch(path, method, body, headers);
    return {
      status: response.status,
      body: await response.json(),
      headers: response.headers,
    };
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
      expiresAt: new Date(Date.now() + 3600000),
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
  fixture = await createLocalFixture("t13");
  directory = await mkdtemp(join(tmpdir(), "orai-t13-"));
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
function manifest(domain = "assessment") {
  return {
    schemaVersion: 1,
    domain,
    name: "温柔观察 " + randomUUID().slice(0, 6),
    description: "理解自己的需要，形成具体表达线索。",
    purposes: [
      domain === "assessment"
        ? "report_writing"
        : domain === "cover"
          ? "cover_design"
          : domain === "video"
            ? "video_production"
            : "copywriting",
    ],
    styles: ["温柔"],
    supportedForms: ["web"],
    inputs: [
      {
        key: "creative-profile",
        description: "固定共同创作设定",
        required: true,
      },
    ],
    outputs: [{ key: "deliverable", description: "与本领域匹配的内容" }],
    instructions: "避免诊断与标签，以具体表达提供情绪价值。",
    examples: [
      {
        title: "示例",
        input: "希望被听见",
        output: "给出温柔而具体的表达线索",
      },
    ],
    references: [] as { path: string; fileId: string }[],
  };
}
const path = (row: any) =>
  "/admin/skills/" +
  row.manifest.domain +
  "/" +
  row.skillId +
  "/versions/" +
  row.id;
async function create(domain = "assessment") {
  const body = {
    slug: "skill-" + randomUUID().slice(0, 8),
    manifest: manifest(domain),
    requestId: randomUUID(),
  };
  const response = await admin.request("/admin/skills/" + domain, "POST", body);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}
async function save(row: any, data: any) {
  const response = await admin.request(path(row), "PUT", {
    manifest: data,
    expectedRevision: row.revision,
    requestId: randomUUID(),
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}
async function transition(row: any, action: string) {
  const response = await admin.request(path(row) + "/" + action, "POST", {
    expectedRevision: row.revision,
    requestId: randomUUID(),
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}
async function reference(
  row: any,
  bytes = Buffer.from("# 表达示例\n请具体说出一个需要。\n"),
  fileName = "guide.md",
  mimeType = "text/markdown",
) {
  const prefix = "/admin/skills/" + row.manifest.domain + "/" + row.skillId;
  const prepared = await admin.request(prefix + "/files", "POST", {
    fileName,
    mimeType,
    byteSize: bytes.length,
    checksum: sha(bytes),
    requestId: randomUUID(),
  });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
  const upload = await admin.request(
    prefix + "/files/" + prepared.body.id + "/content",
    "PUT",
    bytes,
  );
  assert.equal(upload.status, 200, JSON.stringify(upload.body));
  const completed = await admin.request(
    prefix + "/files/" + prepared.body.id + "/complete",
    "POST",
    { requestId: randomUUID() },
  );
  assert.equal(completed.status, 200, JSON.stringify(completed.body));
  return { prefix, bytes, file: completed.body };
}
test("skill libraries require real admin sessions, CSRF and scope; unknown domains and consumer paths stay closed", async () => {
  assert.equal(
    (await new Browser().request("/admin/skills/assessment")).status,
    401,
  );
  const ordinary = await new Browser().login(false);
  assert.equal(
    (await ordinary.request("/admin/skills/assessment")).status,
    403,
  );
  assert.equal((await admin.request("/admin/skills/other")).status, 400);
  assert.equal(
    (
      await admin.request(
        "/admin/skills/copy",
        "POST",
        {},
        { "x-csrf-token": "wrong" },
      )
    ).status,
    403,
  );
  assert.equal((await admin.request("/skills/assessment")).status, 404);
});
test("four independent libraries validate purposes, filter and paginate their own current metadata", async () => {
  for (const domain of ["assessment", "cover", "video", "copy"]) {
    const row = await create(domain);
    assert.equal(StyleSkillVersionSchema.safeParse(row).success, true);
    assert.equal(
      (
        await admin.request(
          "/admin/skills/" +
            domain +
            "?q=" +
            encodeURIComponent(row.manifest.name) +
            "&style=" +
            encodeURIComponent("温柔") +
            "&form=web&pageSize=1",
        )
      ).body.total,
      1,
    );
    assert.equal(
      (await admin.request("/admin/skills/" + domain + "/" + row.skillId)).body
        .latest.id,
      row.id,
    );
    assert.equal(
      (
        await admin.request(
          "/admin/skills/" +
            (domain === "copy" ? "cover" : "copy") +
            "/" +
            row.skillId,
        )
      ).status,
      404,
    );
  }
  const wrong = { ...manifest("cover"), purposes: ["report_writing"] };
  assert.equal(
    (
      await admin.request("/admin/skills/cover", "POST", {
        slug: "wrong-purpose",
        manifest: wrong,
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
});
test("draft saves are idempotent and reject conflicting payloads, stale revisions and concurrent edits", async () => {
  const row = await create(),
    body = {
      manifest: { ...row.manifest, name: "保存后的名称" },
      expectedRevision: row.revision,
      requestId: randomUUID(),
    };
  const a = await admin.request(path(row), "PUT", body),
    b = await admin.request(path(row), "PUT", body);
  assert.equal(a.status, 200);
  assert.deepEqual(a.body, b.body);
  assert.equal(
    (
      await admin.request(path(row), "PUT", {
        ...body,
        manifest: { ...body.manifest, name: "冲突" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await admin.request(path(row), "PUT", {
        ...body,
        requestId: randomUUID(),
      })
    ).status,
    409,
  );
  const outcomes = await Promise.all(
    ["甲", "乙"].map((name) =>
      admin.request(path(a.body), "PUT", {
        manifest: { ...a.body.manifest, name },
        expectedRevision: a.body.revision,
        requestId: randomUUID(),
      }),
    ),
  );
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
});
test("reference uploads verify actual UTF-8 bytes and checksums; fixed files download as attachments with ranges", async () => {
  let row = await create();
  const ref = await reference(row);
  row = await save(row, {
    ...row.manifest,
    instructions: "请阅读 [表达示例](references/guide.md)。",
    references: [{ path: "references/guide.md", fileId: ref.file.id }],
  });
  assert.equal(row.files[0].file.checksum, sha(ref.bytes));
  const response = await admin.fetch(ref.file.downloadPath.replace("/api", ""));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition")!, /^attachment;/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), ref.bytes);
  const range = await admin.fetch(
    ref.file.downloadPath.replace("/api", ""),
    "GET",
    undefined,
    { range: "bytes=0-3" },
  );
  assert.equal(range.status, 206);
  assert.deepEqual(
    Buffer.from(await range.arrayBuffer()),
    ref.bytes.subarray(0, 4),
  );
  assert.equal(
    (await new Browser().fetch(ref.file.downloadPath.replace("/api", "")))
      .status,
    401,
  );
  const complete = await admin.request(
    ref.prefix + "/files/" + ref.file.id + "/complete",
    "POST",
    { requestId: randomUUID() },
  );
  assert.equal(complete.status, 200);
});
test("missing, unsafe and foreign skill references are refused, with no filesystem or consumer data in exports", async () => {
  const row = await create(),
    other = await create("cover"),
    ref = await reference(other);
  for (const data of [
    { ...row.manifest, instructions: "[坏引用](../outside.md)" },
    {
      ...row.manifest,
      references: [{ path: "references/guide.md", fileId: ref.file.id }],
    },
  ])
    assert.equal(
      (
        await admin.request(path(row), "PUT", {
          manifest: data,
          expectedRevision: row.revision,
          requestId: randomUUID(),
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await admin.request(
        "/admin/skills/assessment/" + row.skillId + "/files/" + ref.file.id,
      )
    ).status,
    404,
  );
  const exported = await admin.request(path(row) + "/export");
  assert.equal(exported.status, 200);
  for (const forbidden of [
    "storageKey",
    "ownerUserId",
    "actorUserId",
    "accessToken",
    "refreshToken",
    "consumerAnswers",
    directory,
  ])
    assert.equal(JSON.stringify(exported.body).includes(forbidden), false);
});
test("reviewed and active skill content and attachments are immutable; cloning preserves historical exports", async () => {
  let row = await create();
  const ref = await reference(row);
  row = await save(row, {
    ...row.manifest,
    references: [{ path: "references/guide.md", fileId: ref.file.id }],
  });
  row = await transition(row, "review");
  assert.equal(
    (
      await admin.request(path(row), "PUT", {
        manifest: { ...row.manifest, name: "覆盖" },
        expectedRevision: row.revision,
        requestId: randomUUID(),
      })
    ).status,
    409,
  );
  row = await transition(row, "activate");
  const oldExport = (await admin.request(path(row) + "/export")).body;
  await assert.rejects(
    fixture.runtime.client.styleSkillVersion.update({
      where: { id: row.id },
      data: { manifest: {}, revision: { increment: 1 } },
    }),
  );
  await assert.rejects(
    fixture.runtime.client.styleSkillAttachment.deleteMany({
      where: { versionId: row.id },
    }),
  );
  await assert.rejects(
    fixture.runtime.client.skillReferenceFile.update({
      where: { id: ref.file.id },
      data: { checksum: "a".repeat(64) },
    }),
  );
  const root = (await admin.request("/admin/skills/assessment/" + row.skillId))
    .body;
  const cloneBody = {
      sourceVersionId: row.id,
      expectedSkillRevision: root.revision,
      requestId: randomUUID(),
    },
    cloned = await admin.request(
      "/admin/skills/assessment/" + row.skillId + "/versions",
      "POST",
      cloneBody,
    );
  assert.equal(cloned.status, 200, JSON.stringify(cloned.body));
  assert.equal(cloned.body.number, 2);
  assert.equal(cloned.body.status, "draft");
  assert.deepEqual(
    (
      await admin.request(
        "/admin/skills/assessment/" + row.skillId + "/versions",
        "POST",
        cloneBody,
      )
    ).body,
    cloned.body,
  );
  let newer = await save(cloned.body, {
    ...cloned.body.manifest,
    name: "新版温柔观察",
  });
  newer = await transition(await transition(newer, "review"), "activate");
  const historical = (await admin.request(path(row))).body;
  assert.equal(historical.status, "archived");
  const laterExport = (await admin.request(path(row) + "/export")).body;
  assert.equal(laterExport.version.digest, oldExport.version.digest);
  assert.deepEqual(laterExport.version.manifest, oldExport.version.manifest);
  assert.equal(laterExport.version.files[0].file.id, ref.file.id);
  const diff = await admin.request(path(newer) + "/diff?to=" + row.id);
  assert.equal(diff.status, 200);
  assert.ok(diff.body.changes.some((item: any) => item.path.includes("name")));
  assert.equal(
    (
      await admin.request(path(row) + "/activate", "POST", {
        expectedRevision: historical.revision,
        requestId: randomUUID(),
      })
    ).status,
    409,
  );
});
test("corrupt physical reference bytes prevent review and leave the draft unchanged", async () => {
  let row = await create();
  const ref = await reference(row);
  row = await save(row, {
    ...row.manifest,
    references: [{ path: "references/guide.md", fileId: ref.file.id }],
  });
  const file = await fixture.owner.client.skillReferenceFile.findUniqueOrThrow({
    where: { id: ref.file.id },
  });
  await writeFile(join(directory, file.storageKey), "damaged");
  assert.equal(
    (
      await admin.request(path(row) + "/review", "POST", {
        expectedRevision: row.revision,
        requestId: randomUUID(),
      })
    ).status,
    400,
  );
  assert.equal((await admin.request(path(row))).body.status, "draft");
});
test("malformed text, fake PDFs, oversized references and extension mismatches fail truthfully", async () => {
  const row = await create(),
    prefix = "/admin/skills/assessment/" + row.skillId;
  for (const value of [
    { fileName: "bad.exe", mimeType: "text/plain", byteSize: 10 },
    {
      fileName: "huge.md",
      mimeType: "text/markdown",
      byteSize: 5 * 1024 * 1024 + 1,
    },
  ])
    assert.equal(
      (
        await admin.request(prefix + "/files", "POST", {
          ...value,
          checksum: "a".repeat(64),
          requestId: randomUUID(),
        })
      ).status,
      400,
    );
  for (const [name, mime, bytes] of [
    ["bad.md", "text/markdown", Buffer.from([0xff, 0xfe, 0x00])],
    ["bad.pdf", "application/pdf", Buffer.from("not a pdf")],
  ] as const) {
    const prepared = await admin.request(prefix + "/files", "POST", {
      fileName: name,
      mimeType: mime,
      byteSize: bytes.length,
      checksum: sha(bytes),
      requestId: randomUUID(),
    });
    assert.equal(prepared.status, 200);
    assert.equal(
      (
        await admin.request(
          prefix + "/files/" + prepared.body.id + "/content",
          "PUT",
          bytes,
        )
      ).status,
      400,
    );
    assert.equal(
      (await admin.request(prefix + "/files/" + prepared.body.id)).body.status,
      "failed",
    );
  }
});
test("valid JSON, PDF and image reference files retain their specific purpose without becoming campaign media", async () => {
  const row = await create();
  for (const [name, mime, bytes] of [
    ["example.json", "application/json", Buffer.from('{"example":"温柔表达"}')],
    [
      "guide.pdf",
      "application/pdf",
      Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"),
    ],
    ["cover.jpg", "image/jpeg", await readFile("test/fixtures/cover.jpg")],
  ] as const) {
    const ref = await reference(row, bytes, name, mime);
    assert.equal(ref.file.mimeType, mime);
    assert.equal(
      await fixture.runtime.client.assetFile.count({
        where: { id: ref.file.id },
      }),
      0,
    );
  }
});
