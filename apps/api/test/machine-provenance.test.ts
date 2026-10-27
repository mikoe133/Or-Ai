import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import {
  ContentPackageManifestSchema,
  ProductionRecordSchema,
  ProductionSourceSchema,
} from "@orai/contracts/admin";
import { productionDto } from "../src/operations/content-projections";
import type { ProductionRecord } from "../src/generated/prisma/client";

const productId = randomUUID(), profileId = randomUUID(), revisionId = randomUUID();
const createdAt = "2026-10-20T00:00:00.000Z";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function legacyProduction() {
  return {
    id: randomUUID(), productId, scope: "demo", outputRevisionId: revisionId,
    creativeProfileRevisionId: profileId, actorUserId: randomUUID(),
    source: "mcp", batchKey: "legacy-manual-declaration", externalLabel: "操作者申报的外部制作",
    skillVersionId: null, inputManifest: [], createdAt,
  };
}

test("legacy adopted manifests decode with their original shape and digest without inferred machine provenance", () => {
  const { scope: _scope, actorUserId: _actor, ...exported } = legacyProduction();
  const revision = {
    id: revisionId, productId, productVersionId: randomUUID(), assetId: null,
    scope: "demo", domain: "assessment", sourceRevision: 2, creativeProfileRevisionId: null,
    snapshot: { schemaVersion: 1, kind: "assessment", configuration: { archivedExample: true } },
    digest: "a".repeat(64), createdAt,
    storage: { localArchiveRegistered: false, previewUploaded: false, deliveryUploaded: false },
  };
  const legacy = {
    schemaVersion: 1,
    product: { id: productId, name: "历史商品", slug: "legacy", themeKey: "garden", publicSample: {} },
    creativeProfile: {
      id: profileId, productId, scope: "demo", revision: 1,
      profile: {
        schemaVersion: 1, title: "历史创作设定", audience: "成年人", situation: "一次自我观察",
        emotionalGoal: "被理解", understandingGoal: "理解沟通需要", takeaway: "尝试一个表达方式",
        perspective: "self", experienceForm: "web", pace: "逐题", world: "花园",
        language: "温柔具体", visual: "柔和", sound: "安静",
        reportPlan: {
          schemaVersion: 1, title: "观察记录", narrative: "具体解释",
          presentation: "standard", sections: [{ sectionId: "summary", title: "观察", purpose: "理解" }],
        },
        channels: ["manual"], deliverables: ["assessment", "copy"],
      },
      digest: "b".repeat(64), createdAt, runtimeSupport: "authoring_only",
    },
    assessment: revision,
    runtime: { experience: "web", engine: "dimensions_v1", report: "compatible_standard", themeKey: "garden" },
    assets: [], dependencies: [], assessmentProduction: exported, reviews: [],
  };
  const previous = JSON.stringify(legacy), previousDigest = hash(legacy);
  const decoded = ContentPackageManifestSchema.parse(JSON.parse(previous));
  assert.deepEqual(decoded, legacy);
  assert.equal(hash(decoded), previousDigest);
  assert.equal("machineCredentialId" in decoded.assessmentProduction!, false);
  assert.equal("machineRequestId" in decoded.assessmentProduction!, false);
  assert.equal("skillSetId" in decoded.assessmentProduction!, false);
  assert.equal("skillVersions" in decoded.assessmentProduction!, false);
});

test("manual MCP declarations cannot supply authenticated fields and nullable database additions stay absent from old DTOs", () => {
  const legacy = legacyProduction();
  assert.deepEqual(ProductionRecordSchema.parse(legacy), legacy);
  assert.equal(ProductionSourceSchema.safeParse({
    source: "mcp", machineCredentialId: randomUUID(), machineRequestId: randomUUID(),
  }).success, false);
  const row: ProductionRecord = {
    ...legacy, scope: "DEMO", createdAt: new Date(createdAt), skillSetId: null,
    skillVersions: [], machineCredentialId: null, machineRequestId: null,
  };
  assert.deepEqual(productionDto(row), legacy);
  const credentialId = randomUUID(), requestId = randomUUID();
  const authenticated = ProductionRecordSchema.parse(productionDto({
    ...row, machineCredentialId: credentialId, machineRequestId: requestId,
  }));
  assert.equal(authenticated.machineCredentialId, credentialId);
  assert.equal(authenticated.machineRequestId, requestId);
});
