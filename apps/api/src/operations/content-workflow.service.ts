import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { IdSchema } from "@orai/contracts";
import {
  ContentImpactSchema,
  ContentReviewInputSchema,
  ContentDiffSchema,
} from "@orai/contracts/admin";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "../generated/prisma/client";
import type { CatalogAdminAccess } from "../catalog/admin-access.service";
import { AdminMutationService } from "./admin-mutation.service";
import { ApiException } from "../common/http-errors";
import { parseInput } from "../common/parse-input";
import { contentDigest } from "./content-projections";

export const contentRelations = {
  file: true,
  previewFile: true,
  production: true,
  inputs: true,
  version: true,
} as const;
export type WorkflowRevision = Prisma.ContentRevisionGetPayload<{
  include: typeof contentRelations;
}>;
export const contentLock = (
  tx: Prisma.TransactionClient,
  access: CatalogAdminAccess,
  productId: string,
) =>
  tx.$queryRaw(
    Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"content-work:" + access.scope + ":" + productId},0))`,
  );
export const semanticSnapshot = (snapshot: Prisma.JsonValue) => {
  const {
    status: _status,
    versionNumber: _version,
    ...content
  } = snapshot as Record<string, unknown>;
  return content;
};
export function stableDiff(before: unknown, after: unknown) {
  const changes: { path: string; before: unknown; after: unknown }[] = [];
  let truncated = false;
  function walk(a: unknown, b: unknown, path: string) {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (changes.length >= 500) {
      truncated = true;
      return;
    }
    const object = (value: unknown): Record<string, unknown> | null => {
      if (!value || typeof value !== "object") return null;
      if (Array.isArray(value)) {
        const key = [
          "id",
          "questionId",
          "blockId",
          "sceneId",
          "sectionId",
          "resultTypeId",
        ].find(
          (field) =>
            value.length > 0 &&
            value.every(
              (item) =>
                item &&
                typeof item === "object" &&
                typeof item[field] === "string",
            ) &&
            new Set(value.map((item) => item[field])).size === value.length,
        );
        return key
          ? {
              ...Object.fromEntries(value.map((item) => [item[key], item])),
              $order: value.map((item) => item[key]),
            }
          : Object.fromEntries(
              value.map((item, index) => [String(index), item]),
            );
      }
      return value as Record<string, unknown>;
    };
    const left = object(a),
      right = object(b);
    if (left && right) {
      for (const key of [
        ...new Set([...Object.keys(left), ...Object.keys(right)]),
      ].sort())
        walk(
          left[key],
          right[key],
          path + "/" + key.replaceAll("~", "~0").replaceAll("/", "~1"),
        );
    } else
      changes.push({ path: path || "/", before: a ?? null, after: b ?? null });
  }
  walk(before, after, "");
  return { changes, truncated };
}
@Injectable()
export class ContentWorkflowService {
  constructor(
    private readonly database: DatabaseService,
    private readonly mutations: AdminMutationService,
  ) {}
  async revision(
    tx: Prisma.TransactionClient,
    access: CatalogAdminAccess,
    key: string,
    productId?: string,
  ) {
    const row = await tx.contentRevision.findFirst({
      where: {
        id: parseInput(IdSchema, key).toLowerCase(),
        scope: access.scope,
        ...(productId ? { productId } : {}),
      },
      include: contentRelations,
    });
    if (!row)
      throw new ApiException("NOT_FOUND", "内容修订不存在于当前管理范围", 404);
    return row;
  }
  async graph(
    tx: Prisma.TransactionClient,
    access: CatalogAdminAccess,
    root: WorkflowRevision,
  ) {
    const nodes = new Map<string, WorkflowRevision>([[root.id, root]]);
    let pending = [root];
    while (pending.length) {
      const ids = [
        ...new Set(
          pending.flatMap((row) =>
            row.inputs.map((input) => input.sourceRevisionId),
          ),
        ),
      ].filter((id) => !nodes.has(id));
      if (!ids.length) break;
      if (nodes.size + ids.length > 1000)
        throw new ApiException(
          "CONFLICT",
          "引用链超过本次复查范围，请拆分内容包",
          409,
        );
      pending = await tx.contentRevision.findMany({
        where: {
          id: { in: ids },
          scope: access.scope,
          productId: root.productId,
        },
        include: contentRelations,
      });
      if (pending.length !== ids.length)
        throw new ApiException("CONFLICT", "存在不可读取的固定输入", 409);
      for (const row of pending) nodes.set(row.id, row);
    }
    return nodes;
  }
  async impactIn(
    tx: Prisma.TransactionClient,
    access: CatalogAdminAccess,
    root: WorkflowRevision,
  ) {
    const nodes = await this.graph(tx, access, root),
      alerts: z.infer<typeof ContentImpactSchema>["alerts"] = [];
    const latestProfile = await tx.creativeProfileRevision.findFirst({
      where: { productId: root.productId, scope: access.scope },
      orderBy: { number: "desc" },
    });
    const heads = new Map<string, WorkflowRevision>();
    for (const row of nodes.values()) {
      const profileId =
        row.creativeProfileRevisionId ??
        row.production?.creativeProfileRevisionId;
      if (profileId && latestProfile && profileId !== latestProfile.id)
        alerts.push({
          code: "profile_updated",
          revisionId: row.id,
          latestId: latestProfile.id,
          message: "共同创作设定已有新修订，请核对固定旧设定是否仍适用",
          blocking: false,
        });
      const key = row.assetId ?? "assessment";
      let head = heads.get(key);
      if (!head) {
        head =
          (await tx.contentRevision.findFirst({
            where: {
              productId: row.productId,
              scope: access.scope,
              ...(row.assetId
                ? { assetId: row.assetId }
                : { assetId: null, version: { status: { not: "ARCHIVED" } } }),
            },
            include: contentRelations,
            orderBy: row.assetId
              ? [{ sourceRevision: "desc" }]
              : [{ version: { number: "desc" } }, { sourceRevision: "desc" }],
          })) ?? row;
        heads.set(key, head);
      }
      const current = row.assetId
        ? head
        : await tx.contentRevision.findFirstOrThrow({
            where: {
              productVersionId: row.productVersionId,
              assetId: null,
              scope: access.scope,
            },
            include: contentRelations,
            orderBy: { sourceRevision: "desc" },
          });
      if ((current.snapshot as Record<string, unknown>).status === "archived")
        alerts.push({
          code: row.id === root.id ? "self_archived" : "source_archived",
          revisionId: row.id,
          latestId: current.id,
          message: "稿件或其固定输入已归档，不能新增采用",
          blocking: true,
        });
      else if (
        contentDigest(semanticSnapshot(row.snapshot)) !==
        contentDigest(semanticSnapshot(head.snapshot))
      )
        alerts.push({
          code: row.id === root.id ? "self_updated" : "source_updated",
          revisionId: row.id,
          latestId: head.id,
          message:
            row.id === root.id
              ? "此稿件已有内容不同的新修订"
              : "固定输入已有新稿，旧快照保持不变，请复查使用内容",
          blocking: false,
        });
    }
    alerts.sort((a, b) =>
      (a.code + a.revisionId + a.latestId).localeCompare(
        b.code + b.revisionId + b.latestId,
      ),
    );
    const fingerprint = contentDigest({ revisionId: root.id, alerts });
    const review = await tx.contentReviewRecord.findUnique({
      where: { revisionId_fingerprint: { revisionId: root.id, fingerprint } },
    });
    return ContentImpactSchema.parse({
      revisionId: root.id,
      fingerprint,
      alerts,
      reviewed: !!review,
      needsReview: alerts.length > 0 && !review,
      blocked: alerts.some((alert) => alert.blocking),
      reviewNote: review?.note ?? null,
    });
  }
  async impact(access: CatalogAdminAccess, key: string) {
    await this.mutations.administrators.require(access);
    return this.database.client.$transaction(
      async (tx) =>
        this.impactIn(tx, access, await this.revision(tx, access, key)),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async review(access: CatalogAdminAccess, key: string, input: unknown) {
    const body = parseInput(ContentReviewInputSchema, input),
      revisionId = parseInput(IdSchema, key).toLowerCase();
    await this.mutations.run(
      access,
      "content.review:" + revisionId,
      body.requestId,
      body,
      async (tx) => {
        const row = await this.revision(tx, access, revisionId);
        await contentLock(tx, access, row.productId);
        const impact = await this.impactIn(tx, access, row);
        if (impact.fingerprint !== body.expectedFingerprint)
          throw new ApiException(
            "REVISION_CONFLICT",
            "复查期间上游已变化，请重新读取影响清单",
            409,
          );
        if (impact.blocked)
          throw new ApiException(
            "CONFLICT",
            "存在归档或失效输入，不能确认继续采用",
            409,
          );
        const previous = await tx.contentReviewRecord.findUnique({
          where: {
            revisionId_fingerprint: {
              revisionId,
              fingerprint: impact.fingerprint,
            },
          },
        });
        const record =
          previous ??
          (await tx.contentReviewRecord.create({
            data: {
              productId: row.productId,
              scope: access.scope,
              revisionId,
              fingerprint: impact.fingerprint,
              note: body.note,
              impact: impact as Prisma.InputJsonValue,
              actorUserId: access.actorUserId,
            },
          }));
        return {
          response: { id: record.id },
          entityKind: "content_review",
          entityId: record.id,
        };
      },
    );
    return this.impact(access, revisionId);
  }
  async diff(access: CatalogAdminAccess, key: string, target: unknown) {
    await this.mutations.administrators.require(access);
    const toId = parseInput(IdSchema, target).toLowerCase();
    return this.database.client.$transaction(async (tx) => {
      const a = await this.revision(tx, access, key),
        b = await this.revision(tx, access, toId, a.productId);
      if (a.domain !== b.domain || a.assetId !== b.assetId)
        throw new ApiException(
          "VALIDATION_ERROR",
          "仅可比较同一稿件或同一商品的题库版本",
          400,
        );
      return ContentDiffSchema.parse({
        fromId: a.id,
        toId: b.id,
        ...stableDiff(a.snapshot, b.snapshot),
      });
    });
  }
  async profileDiff(access: CatalogAdminAccess, key: string, to: unknown) {
    await this.mutations.administrators.require(access);
    const fromId = parseInput(IdSchema, key).toLowerCase(),
      toId = parseInput(IdSchema, to).toLowerCase();
    const from = await this.database.client.creativeProfileRevision.findFirst({
        where: { id: fromId, scope: access.scope },
      }),
      target = from
        ? await this.database.client.creativeProfileRevision.findFirst({
            where: { id: toId, productId: from.productId, scope: access.scope },
          })
        : null;
    if (!from || !target)
      throw new ApiException(
        "NOT_FOUND",
        "设定修订不存在于当前商品与范围",
        404,
      );
    return ContentDiffSchema.parse({
      fromId,
      toId,
      ...stableDiff(from.profile, target.profile),
    });
  }
}
