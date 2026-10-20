import { Injectable } from "@nestjs/common";
import { IdSchema } from "@orai/contracts";
import {
  AdminPageQuerySchema,
  FileCleanupPreviewInputSchema,
  FileCleanupExecuteSchema,
  FileCleanupPlanSchema,
  FileCleanupCandidateSchema,
} from "@orai/contracts/admin";
import { DatabaseService } from "../database/database.service";
import {
  Prisma,
  type AssetFile,
  type FileCleanupPlan,
} from "../generated/prisma/client";
import type { CatalogAdminAccess } from "../catalog/admin-access.service";
import { AdminMutationService } from "./admin-mutation.service";
import { AssetStorage } from "./asset-storage";
import { contentLock } from "./content-workflow.service";
import { contentDigest } from "./content-projections";
import { ApiException } from "../common/http-errors";
import { parseInput } from "../common/parse-input";
const candidate = (row: AssetFile) =>
  FileCleanupCandidateSchema.parse({
    id: row.id,
    fileName: row.originalName,
    byteSize: row.byteSize,
    checksum: row.checksum,
    status: row.status.toLowerCase(),
    expiresAt: row.expiresAt.toISOString(),
  });
const dto = (row: FileCleanupPlan) =>
  FileCleanupPlanSchema.parse({
    id: row.id,
    productId: row.productId,
    scope: row.scope.toLowerCase(),
    digest: row.digest,
    status: row.status,
    files: row.files,
    results: row.results,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
const eligible = (
  access: CatalogAdminAccess,
  productId: string,
): Prisma.AssetFileWhereInput => ({
  scope: access.scope,
  productVersion: { productId },
  expiresAt: { lte: new Date() },
  status: {
    in: ["PENDING", "VERIFYING", "UPLOADED", "AVAILABLE", "FAILED", "EXPIRED"],
  },
  assets: { none: {} },
  contentDeliveries: { none: {} },
  contentPreviews: { none: {} },
});
@Injectable()
export class FileCleanupService {
  constructor(
    private readonly database: DatabaseService,
    private readonly mutations: AdminMutationService,
    private readonly storage: AssetStorage,
  ) {}
  private async product(
    access: CatalogAdminAccess,
    id: string,
    tx: Prisma.TransactionClient = this.database.client,
  ) {
    if (!(await tx.product.findFirst({ where: { id, scope: access.scope } })))
      throw new ApiException("NOT_FOUND", "商品不存在于当前管理范围", 404);
  }
  async candidates(access: CatalogAdminAccess, key: unknown, query: unknown) {
    await this.mutations.administrators.require(access);
    const productId = parseInput(IdSchema, key).toLowerCase(),
      args = parseInput(AdminPageQuerySchema, query);
    await this.product(access, productId);
    const where = eligible(access, productId),
      rows = await this.database.client.assetFile.findMany({
        where,
        orderBy: { id: "asc" },
        take: args.pageSize,
        skip: (args.page - 1) * args.pageSize,
      }),
      total = await this.database.client.assetFile.count({ where });
    return {
      items: rows.map(candidate),
      total,
      page: args.page,
      pageSize: args.pageSize,
    };
  }
  async preview(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(FileCleanupPreviewInputSchema, input),
      productId = body.productId.toLowerCase();
    const result = await this.mutations.run(
      access,
      "content.cleanup-preview",
      body.requestId,
      body,
      async (tx) => {
        await this.product(access, productId, tx);
        await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${productId}::uuid FOR KEY SHARE`);
        await contentLock(tx, access, productId);
        const rows = await tx.assetFile.findMany({
          where: {
            ...eligible(access, productId),
            id: { in: body.fileIds.map((value) => value.toLowerCase()) },
          },
          orderBy: { id: "asc" },
        });
        if (rows.length !== body.fileIds.length)
          throw new ApiException(
            "CONFLICT",
            "文件已被引用、未过期或不属于当前商品，请重新预演",
            409,
          );
        const files = rows.map(candidate),
          digest = contentDigest({ productId, files });
        const plan = await tx.fileCleanupPlan.create({
          data: {
            productId,
            scope: access.scope,
            actorUserId: access.actorUserId,
            digest,
            files: files as Prisma.InputJsonValue,
            results: [],
            expiresAt: new Date(Date.now() + 600000),
          },
        });
        return {
          response: { id: plan.id },
          entityKind: "file_cleanup_plan",
          entityId: plan.id,
        };
      },
    );
    return this.read(access, result.id);
  }
  private async plan(
    tx: Prisma.TransactionClient,
    access: CatalogAdminAccess,
    id: string,
  ) {
    const row = await tx.fileCleanupPlan.findFirst({
      where: { id, scope: access.scope, actorUserId: access.actorUserId },
    });
    if (!row)
      throw new ApiException(
        "NOT_FOUND",
        "清理预演不存在于当前操作者范围",
        404,
      );
    return row;
  }
  async read(access: CatalogAdminAccess, key: unknown) {
    await this.mutations.administrators.require(access);
    return dto(
      await this.plan(
        this.database.client,
        access,
        parseInput(IdSchema, key).toLowerCase(),
      ),
    );
  }
  private async result(
    access: CatalogAdminAccess,
    planId: string,
    fileId: string,
    status: "deleted" | "retry",
    message: string,
  ) {
    await this.database.client.$transaction(async (tx) => {
      await this.mutations.administrators.require(access, tx);
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM orai.file_cleanup_plans WHERE id=${planId}::uuid FOR UPDATE`,
      );
      const plan = await this.plan(tx, access, planId);
      if (plan.status === "complete") return;
      const previous = dto(plan).results,
        results = [
          ...previous.filter((value) => value.fileId !== fileId),
          { fileId, status, message },
        ];
      if (status === "deleted") {
        const changed = await tx.assetFile.updateMany({
          where: { id: fileId, scope: access.scope, status: "DELETING" },
          data: { status: "DELETED" },
        });
        if (changed.count)
          await tx.adminAuditLog.create({
            data: {
              actorUserId: access.actorUserId,
              scope: access.scope,
              action: "content.cleanup-file",
              entityKind: "asset_file",
              entityId: fileId,
            },
          });
      }
      await tx.fileCleanupPlan.update({
        where: { id: planId },
        data: { results: results as Prisma.InputJsonValue },
      });
    });
  }
  async execute(access: CatalogAdminAccess, key: unknown, input: unknown) {
    const planId = parseInput(IdSchema, key).toLowerCase(),
      body = parseInput(FileCleanupExecuteSchema, input);
    await this.mutations.run(
      access,
      "content.cleanup-start:" + planId,
      body.requestId,
      body,
      async (tx) => {
        const initial = await this.plan(tx, access, planId);
        await contentLock(tx, access, initial.productId);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM orai.file_cleanup_plans WHERE id=${planId}::uuid FOR UPDATE`,
        );
        const plan = await this.plan(tx, access, planId);
        if (plan.digest !== body.expectedDigest)
          throw new ApiException(
            "REVISION_CONFLICT",
            "清理预演摘要不一致",
            409,
          );
        if (plan.status === "prepared") {
          if (plan.expiresAt <= new Date())
            throw new ApiException(
              "CONFLICT",
              "清理预演已过期，请重新生成",
              409,
            );
          const results = [];
          for (const file of dto(plan).files) {
            await tx.$queryRaw(
              Prisma.sql`SELECT id FROM orai.asset_files WHERE id=${file.id}::uuid FOR UPDATE`,
            );
            const current = await tx.assetFile.findFirst({
              where: { ...eligible(access, plan.productId), id: file.id },
            });
            if (
              !current ||
              JSON.stringify(candidate(current)) !== JSON.stringify(file)
            ) {
              results.push({
                fileId: file.id,
                status: "protected",
                message: "状态变化或已被引用，已保留",
              });
              continue;
            }
            await tx.assetFile.update({
              where: { id: file.id },
              data: { status: "DELETING" },
            });
          }
          await tx.fileCleanupPlan.update({
            where: { id: planId },
            data: {
              status: "running",
              results: results as Prisma.InputJsonValue,
            },
          });
        }
        return {
          response: { id: planId },
          entityKind: "file_cleanup_plan",
          entityId: planId,
        };
      },
    );
    const plan = await this.read(access, planId);
    if (plan.status === "complete") return plan;
    for (const item of plan.files) {
      if (
        plan.results.some(
          (value) => value.fileId === item.id && value.status === "protected",
        )
      )
        continue;
      await this.mutations.administrators.require(access);
      const file = await this.database.client.assetFile.findFirst({
        where: {
          id: item.id,
          scope: access.scope,
          productVersion: { productId: plan.productId },
          status: { in: ["DELETING", "DELETED"] },
        },
      });
      if (!file) continue;
      try {
        if (file.status === "DELETING")
          await this.storage.remove(file.storageKey);
      } catch {
        await this.result(
          access,
          planId,
          file.id,
          "retry",
          "存储删除未完成，可重试同一清理计划",
        );
        continue;
      }
      await this.result(
        access,
        planId,
        file.id,
        "deleted",
        "文件字节已清理，历史元数据保留",
      );
    }
    await this.database.client.$transaction(async (tx) => {
      await this.mutations.administrators.require(access, tx);
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM orai.file_cleanup_plans WHERE id=${planId}::uuid FOR UPDATE`,
      );
      const current = await this.plan(tx, access, planId),
        value = dto(current);
      if (
        current.status === "running" &&
        value.results.length === value.files.length &&
        value.results.every((item) => item.status !== "retry")
      )
        await tx.fileCleanupPlan.update({
          where: { id: planId },
          data: { status: "complete" },
        });
    });
    return this.read(access, planId);
  }
}
