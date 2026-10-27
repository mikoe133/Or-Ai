import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { IdSchema } from "@orai/contracts";
import {
  ProductionDomainSchema,
  SkillFilePrepareSchema,
  SkillFileSchema,
  AdminDeliveryActionSchema,
} from "@orai/contracts/admin";
import { APP_CONFIG, type AppConfiguration } from "../config/configuration";
import { DatabaseService } from "../database/database.service";
import { Prisma, type SkillReferenceFile } from "../generated/prisma/client";
import { type CatalogAdminAccess } from "../catalog/admin-access.service";
import { parseInput } from "../common/parse-input";
import { ApiException } from "../common/http-errors";
import { AdminMutationService } from "./admin-mutation.service";
import { AssetStorage } from "./asset-storage";
import { FilesService } from "./files.service";
import { checkReferenceName } from "./reference-content";
export function skillFileDto(row: SkillReferenceFile, domain: string) {
  const path =
    "/api/admin/skills/" + domain + "/" + row.skillId + "/files/" + row.id;
  return SkillFileSchema.parse({
    id: row.id,
    skillId: row.skillId,
    fileName: row.originalName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    checksum: row.checksum,
    status: row.status.toLowerCase(),
    expiresAt: row.expiresAt.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    uploadPath: path + "/content",
    downloadPath: row.status === "AVAILABLE" ? path + "/content" : null,
  });
}
@Injectable()
export class SkillFilesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly mutations: AdminMutationService,
    private readonly storage: AssetStorage,
    private readonly files: FilesService,
    @Inject(APP_CONFIG) private readonly config: AppConfiguration,
  ) {}
  async skill(
    access: CatalogAdminAccess,
    domainInput: unknown,
    skillInput: unknown,
    tx: Prisma.TransactionClient = this.database.client,
  ) {
    await this.mutations.administrators.require(access, tx);
    const domain = parseInput(ProductionDomainSchema, domainInput),
      id = parseInput(IdSchema, skillInput).toLowerCase();
    const row = await tx.styleSkill.findFirst({
      where: { id, domain, scope: access.scope },
    });
    if (!row)
      throw new ApiException("NOT_FOUND", "skill 不存在于当前领域或范围", 404);
    return row;
  }
  private async owned(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    fileId: unknown,
    tx: Prisma.TransactionClient = this.database.client,
  ) {
    const skill = await this.skill(access, domain, skillId, tx);
    const file = await tx.skillReferenceFile.findFirst({
      where: {
        id: parseInput(IdSchema, fileId).toLowerCase(),
        skillId: skill.id,
        scope: access.scope,
        ownerUserId: access.actorUserId,
      },
    });
    if (!file)
      throw new ApiException("NOT_FOUND", "参考上传不存在于当前范围", 404);
    return { file, skill };
  }
  private usable(row: SkillReferenceFile) {
    if (["FAILED", "EXPIRED", "DELETING", "DELETED"].includes(row.status))
      throw new ApiException("CONFLICT", "上传未完成，请重新申请", 409);
    if (row.status !== "AVAILABLE" && row.expiresAt <= new Date())
      throw new ApiException("ENTITLEMENT_EXPIRED", "上传会话已过期", 410);
  }
  async prepare(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    input: unknown,
  ) {
    const body = parseInput(SkillFilePrepareSchema, input);
    if (
      this.config.assets?.driver !== "local" ||
      this.config.environment === "production"
    )
      throw new ApiException(
        "SERVICE_UNAVAILABLE",
        "持久化文件存储尚未配置",
        503,
      );
    if (!checkReferenceName(body.fileName, body.mimeType))
      throw new ApiException("VALIDATION_ERROR", "扩展名与参考类型不符", 400);
    const result = await this.mutations.run(
      access,
      access.machineCredentialId ? "machine.files.prepare" : "skills.files.prepare",
      body.requestId,
      { domain, skillId, ...body },
      async (tx) => {
        const skill = await this.skill(access, domain, skillId, tx);
        await tx.$queryRaw(
          Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"skill-uploads:" + access.scope + ":" + access.actorUserId},0))`,
        );
        if (
          (await tx.skillReferenceFile.count({
            where: {
              ownerUserId: access.actorUserId,
              scope: access.scope,
              status: { in: ["PENDING", "VERIFYING", "UPLOADED"] },
              expiresAt: { gt: new Date() },
            },
          })) >= 20
        )
          throw new ApiException("CONFLICT", "待完成参考上传过多", 409);
        const id = randomUUID();
        await tx.skillReferenceFile.create({
          data: {
            id,
            skillId: skill.id,
            scope: access.scope,
            ownerUserId: access.actorUserId,
            originalName: body.fileName,
            mimeType: body.mimeType,
            byteSize: body.byteSize,
            checksum: body.checksum,
            storageKey: id + ".blob",
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
        return {
          response: { id },
          entityKind: "skill_reference_file",
          entityId: id,
        };
      },
    );
    return this.status(access, domain, skillId, result.id);
  }
  async status(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    fileId: unknown,
  ): Promise<ReturnType<typeof skillFileDto>> {
    const { file, skill } = await this.owned(access, domain, skillId, fileId);
    if (
      ["PENDING", "VERIFYING", "UPLOADED"].includes(file.status) &&
      file.expiresAt <= new Date()
    ) {
      await this.database.client.skillReferenceFile.updateMany({
        where: { id: file.id, status: file.status },
        data: { status: "EXPIRED" },
      });
      return this.status(access, domain, skillId, fileId);
    }
    return skillFileDto(file, skill.domain);
  }
  async upload(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    fileId: unknown,
    request: Request,
  ) {
    const row = await this.database.client.$transaction(async (tx) => {
      const { file } = await this.owned(access, domain, skillId, fileId, tx);
      const claimed = await tx.skillReferenceFile.updateMany({
        where: {
          id: file.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        data: { status: "VERIFYING" },
      });
      if (claimed.count !== 1)
        throw new ApiException("CONFLICT", "上传已开始或过期，请查询状态", 409);
      return file;
    });
    const timer = setTimeout(
      () => request.destroy(new Error("Upload deadline exceeded")),
      120000,
    );
    try {
      await this.storage.receive(row.storageKey, request, {
        byteSize: row.byteSize,
        mimeType: row.mimeType,
        checksum: row.checksum,
      });
      await this.database.client.$transaction(async (tx) => {
        await this.mutations.administrators.require(access, tx);
        const done = await tx.skillReferenceFile.updateMany({
          where: {
            id: row.id,
            status: "VERIFYING",
            expiresAt: { gt: new Date() },
          },
          data: { status: "UPLOADED" },
        });
        if (done.count !== 1)
          throw new ApiException("CONFLICT", "参考上传状态已变化", 409);
      });
      return this.status(access, domain, skillId, fileId);
    } catch (error) {
      await this.storage.remove(row.storageKey).catch(() => undefined);
      await this.database.client.skillReferenceFile.updateMany({
        where: { id: row.id, status: { in: ["VERIFYING", "UPLOADED"] } },
        data: { status: "FAILED" },
      });
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  async complete(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    fileId: unknown,
    input: unknown,
  ) {
    const body = parseInput(AdminDeliveryActionSchema, input),
      { file } = await this.owned(access, domain, skillId, fileId);
    this.usable(file);
    if (file.status === "AVAILABLE")
      return this.status(access, domain, skillId, fileId);
    if (file.status !== "UPLOADED")
      throw new ApiException("CONFLICT", "文件尚未完成上传", 409);
    try {
      const inspected = await this.storage.inspectReference(
        file.storageKey,
        file.byteSize,
        file.mimeType,
      );
      if (
        inspected.byteSize !== file.byteSize ||
        inspected.checksum !== file.checksum ||
        inspected.mimeType !== file.mimeType
      )
        throw new ApiException("VALIDATION_ERROR", "参考文件校验失败", 400);
    } catch (error) {
      if (error instanceof ApiException && error.getStatus() === 400) {
        const failed = await this.database.client.skillReferenceFile.updateMany(
          {
            where: { id: file.id, status: "UPLOADED" },
            data: { status: "FAILED" },
          },
        );
        if (failed.count)
          await this.storage.remove(file.storageKey).catch(() => undefined);
      }
      throw error;
    }
    await this.mutations.run(
      access,
      "skills.files.complete:" + file.id,
      body.requestId,
      {},
      async (tx) => {
        await this.mutations.administrators.require(access, tx);
        const done = await tx.skillReferenceFile.updateMany({
          where: {
            id: file.id,
            status: "UPLOADED",
            expiresAt: { gt: new Date() },
          },
          data: { status: "AVAILABLE", verifiedAt: new Date() },
        });
        if (!done.count) {
          const current = await tx.skillReferenceFile.findUniqueOrThrow({
            where: { id: file.id },
          });
          if (current.status !== "AVAILABLE")
            throw new ApiException("CONFLICT", "上传状态不允许完成", 409);
        }
        return {
          response: { id: file.id },
          entityKind: "skill_reference_file",
          entityId: file.id,
        };
      },
    );
    return this.status(access, domain, skillId, fileId);
  }
  async content(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    fileId: unknown,
    range?: string,
  ) {
    const skill = await this.skill(access, domain, skillId);
    const row = await this.database.client.skillReferenceFile.findFirst({
      where: {
        id: parseInput(IdSchema, fileId).toLowerCase(),
        skillId: skill.id,
        scope: access.scope,
        status: "AVAILABLE",
      },
    });
    if (!row)
      throw new ApiException("NOT_FOUND", "参考文件尚未就绪或不可访问", 404);
    return this.files.storedContent(row, range);
  }
}
