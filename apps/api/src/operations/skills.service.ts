import { Injectable } from "@nestjs/common";
import { IdSchema } from "@orai/contracts";
import {
  AdminPageQuerySchema,
  ProductionDomainSchema,
  StyleSkillManifestSchema,
  StyleSkillVersionSchema,
  StyleSkillSchema,
  StyleSkillExportSchema,
  SkillCreateSchema,
  SkillSaveSchema,
  SkillCloneSchema,
  SkillActionSchema,
  SkillQuerySchema,
  type StyleSkillManifest,
} from "@orai/contracts/admin";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "../generated/prisma/client";
import type { CatalogAdminAccess } from "../catalog/admin-access.service";
import { ApiException } from "../common/http-errors";
import { parseInput } from "../common/parse-input";
import { AdminMutationService } from "./admin-mutation.service";
import { SkillFilesService, skillFileDto } from "./skill-files.service";
import { AssetStorage } from "./asset-storage";
import { checkReferenceName } from "./reference-content";
import { contentDigest } from "./content-projections";
import { stableDiff } from "./content-workflow.service";
const include = {
  skill: true,
  attachments: { include: { file: true } },
} as const;
type Version = Prisma.StyleSkillVersionGetPayload<{ include: typeof include }>;
const projection = (manifest: StyleSkillManifest) => ({
  name: manifest.name,
  description: manifest.description,
  styles: manifest.styles,
  purposes: manifest.purposes,
  supportedForms: manifest.supportedForms,
});
const manifestInput = (input: unknown) => {
  const value = parseInput(StyleSkillManifestSchema, input);
  return {
    ...value,
    references: value.references.map((ref) => ({
      ...ref,
      fileId: ref.fileId.toLowerCase(),
    })),
  };
};
export function skillVersionDto(row: Version) {
  return StyleSkillVersionSchema.parse({
    id: row.id,
    skillId: row.skillId,
    scope: row.scope.toLowerCase(),
    number: row.number,
    revision: row.revision,
    status: row.status.toLowerCase(),
    manifest: row.manifest,
    digest: row.digest,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    files: row.attachments
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((ref) => ({
        path: ref.path,
        file: skillFileDto(ref.file, row.skill.domain),
      })),
  });
}
@Injectable()
export class SkillsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly mutations: AdminMutationService,
    private readonly files: SkillFilesService,
    private readonly storage: AssetStorage,
  ) {}
  private async lock(tx: Prisma.TransactionClient, skillId: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"skill-library:" + skillId},0))`,
    );
  }
  private async version(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    versionId: unknown,
    tx: Prisma.TransactionClient = this.database.client,
  ) {
    const skill = await this.files.skill(access, domain, skillId, tx),
      row = await tx.styleSkillVersion.findFirst({
        where: {
          id: parseInput(IdSchema, versionId).toLowerCase(),
          skillId: skill.id,
          scope: access.scope,
        },
        include,
      });
    if (!row)
      throw new ApiException(
        "NOT_FOUND",
        "skill 版本不存在于当前领域或范围",
        404,
      );
    return row;
  }
  private async validateFiles(
    tx: Prisma.TransactionClient,
    skillId: string,
    access: CatalogAdminAccess,
    manifest: StyleSkillManifest,
  ) {
    const ids = [...new Set(manifest.references.map((ref) => ref.fileId))];
    let total = 0;
    for (const id of ids) {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM orai.skill_reference_files WHERE id=${id}::uuid FOR KEY SHARE`,
      );
      const row = await tx.skillReferenceFile.findFirst({
        where: { id, skillId, scope: access.scope, status: "AVAILABLE" },
      });
      if (!row)
        throw new ApiException(
          "VALIDATION_ERROR",
          "参考文件未就绪或不属于此 skill",
          400,
        );
      total += row.byteSize;
      if (total > 25 * 1024 * 1024)
        throw new ApiException(
          "VALIDATION_ERROR",
          "参考文件总量不能超过 25 MiB",
          400,
        );
      if (
        manifest.references.some(
          (ref) =>
            ref.fileId === id && !checkReferenceName(ref.path, row.mimeType),
        )
      )
        throw new ApiException(
          "VALIDATION_ERROR",
          "包内参考扩展名与实际类型不符",
          400,
        );
      const actual = await this.storage.inspectReference(
        row.storageKey,
        row.byteSize,
        row.mimeType,
      );
      if (
        actual.byteSize !== row.byteSize ||
        actual.mimeType !== row.mimeType ||
        actual.checksum !== row.checksum
      )
        throw new ApiException(
          "VALIDATION_ERROR",
          "参考文件已损坏或不完整",
          400,
        );
    }
  }
  private async attachments(
    tx: Prisma.TransactionClient,
    row: { id: string; skillId: string; scope: CatalogAdminAccess["scope"] },
    manifest: StyleSkillManifest,
  ) {
    await tx.styleSkillAttachment.deleteMany({ where: { versionId: row.id } });
    if (manifest.references.length)
      await tx.styleSkillAttachment.createMany({
        data: manifest.references.map((ref) => ({
          versionId: row.id,
          skillId: row.skillId,
          scope: row.scope,
          fileId: ref.fileId,
          path: ref.path,
        })),
      });
  }
  async list(access: CatalogAdminAccess, domainInput: unknown, input: unknown) {
    await this.mutations.administrators.require(access);
    const domain = parseInput(ProductionDomainSchema, domainInput),
      query = parseInput(SkillQuerySchema, input);
    const where: Prisma.StyleSkillWhereInput = {
      scope: access.scope,
      domain,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { slug: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.style ? { styles: { has: query.style } } : {}),
      ...(query.purpose ? { purposes: { has: query.purpose } } : {}),
      ...(query.form ? { supportedForms: { has: query.form } } : {}),
      ...(query.status
        ? {
            versions: {
              some: {
                status: query.status.toUpperCase() as
                  | "DRAFT"
                  | "REVIEWED"
                  | "ACTIVE"
                  | "ARCHIVED",
              },
            },
          }
        : {}),
    };
    const rows = await this.database.client.styleSkill.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { versions: { orderBy: { number: "desc" }, take: 1, include } },
    });
    const total = await this.database.client.styleSkill.count({ where });
    const active = await this.database.client.styleSkillVersion.findMany({
      where: {
        skillId: { in: rows.map((row) => row.id) },
        scope: access.scope,
        status: "ACTIVE",
      },
      select: { id: true, skillId: true },
    });
    return {
      items: rows.map((row) =>
        StyleSkillSchema.parse({
          id: row.id,
          scope: row.scope.toLowerCase(),
          domain: row.domain,
          slug: row.slug,
          name: row.name,
          description: row.description,
          styles: row.styles,
          purposes: row.purposes,
          supportedForms: row.supportedForms,
          revision: row.revision,
          latest: skillVersionDto(row.versions[0]!),
          activeVersionId:
            active.find((version) => version.skillId === row.id)?.id ?? null,
        }),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async read(access: CatalogAdminAccess, domain: unknown, skillId: unknown) {
    const row = await this.files.skill(access, domain, skillId),
      latest = await this.database.client.styleSkillVersion.findFirstOrThrow({
        where: { skillId: row.id },
        orderBy: { number: "desc" },
        include,
      }),
      active = await this.database.client.styleSkillVersion.findFirst({
        where: { skillId: row.id, status: "ACTIVE" },
        select: { id: true },
      });
    const { createdAt, ...data } = row;
    return StyleSkillSchema.parse({
      ...data,
      scope: row.scope.toLowerCase(),
      latest: skillVersionDto(latest),
      activeVersionId: active?.id ?? null,
    });
  }
  async versions(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    input: unknown,
  ) {
    const skill = await this.files.skill(access, domain, skillId);
    const { page, pageSize } = parseInput(AdminPageQuerySchema, input);
    const where = { skillId: skill.id, scope: access.scope };
    return {
      items: (
        await this.database.client.styleSkillVersion.findMany({
          where,
          orderBy: { number: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include,
        })
      ).map(skillVersionDto),
      total: await this.database.client.styleSkillVersion.count({ where }),
      page,
      pageSize,
    };
  }
  async readVersion(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    versionId: unknown,
  ) {
    return skillVersionDto(
      await this.version(access, domain, skillId, versionId),
    );
  }
  async create(
    access: CatalogAdminAccess,
    domainInput: unknown,
    input: unknown,
  ) {
    const domain = parseInput(ProductionDomainSchema, domainInput),
      body = parseInput(SkillCreateSchema, input),
      manifest = manifestInput(body.manifest);
    if (manifest.domain !== domain || manifest.references.length)
      throw new ApiException(
        "VALIDATION_ERROR",
        "新 skill 需匹配领域，参考文件请建立后上传",
        400,
      );
    const result = await this.mutations.run(
      access,
      "skills.create",
      body.requestId,
      { domain, ...body },
      async (tx) => {
        return this.createIn(tx, access, domain, body);
      },
    );
    return this.readVersion(access, domain, result.skillId, result.versionId);
  }
  async createIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, domain: string, input: unknown, productId?: string) {
    const body = parseInput(SkillCreateSchema, input), manifest = manifestInput(body.manifest);
    if (manifest.domain !== domain || manifest.references.length) throw new ApiException('VALIDATION_ERROR', '新方法领域需一致，附件请建立后上传', 400);
    if (access.machineCredentialId) {
      if (!productId) throw new ApiException('FORBIDDEN', '新方法必须属于受限项目', 403);
      await this.mutations.administrators.requireProjectRow(access, ['methods:create'], { productId }, tx);
    }
        const skill = await tx.styleSkill.create({
          data: {
            scope: access.scope,
            domain,
            slug: body.slug,
            ...projection(manifest),
          },
        });
        const version = await tx.styleSkillVersion.create({
          data: {
            skillId: skill.id,
            scope: access.scope,
            number: 1,
            manifest: manifest as Prisma.InputJsonValue,
            digest: contentDigest(manifest),
            actorUserId: access.actorUserId,
          },
        });
        return {
          response: { skillId: skill.id, versionId: version.id },
          entityKind: "style_skill",
          entityId: skill.id,
        };
  }
  async save(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    versionId: unknown,
    input: unknown,
  ) {
    const body = parseInput(SkillSaveSchema, input),
      manifest = manifestInput(body.manifest);
    const result = await this.mutations.run(
      access,
      "skills.save:" + String(versionId),
      body.requestId,
      { domain, skillId, ...body },
      async (tx) => {
        const skill = await this.files.skill(access, domain, skillId, tx);
        await this.lock(tx, skill.id);
        const row = await this.version(access, domain, skillId, versionId, tx);
        if (row.status !== "DRAFT" || row.revision !== body.expectedRevision)
          throw new ApiException(
            "REVISION_CONFLICT",
            "仅可编辑当前草稿修订；审核/启用版本请复制新版本",
            409,
          );
        if (manifest.domain !== skill.domain)
          throw new ApiException("VALIDATION_ERROR", "skill 领域不可改变", 400);
        await this.validateFiles(tx, skill.id, access, manifest);
        await tx.styleSkillVersion.update({
          where: { id: row.id },
          data: {
            manifest: manifest as Prisma.InputJsonValue,
            digest: contentDigest(manifest),
            revision: { increment: 1 },
          },
        });
        await this.attachments(tx, row, manifest);
        const newest = await tx.styleSkillVersion.findFirstOrThrow({
          where: { skillId: skill.id },
          orderBy: { number: "desc" },
        });
        await tx.styleSkill.update({
          where: { id: skill.id },
          data: {
            ...(newest.id === row.id ? projection(manifest) : {}),
            revision: { increment: 1 },
          },
        });
        return {
          response: { id: row.id, ...(access.machineCredentialId ? {
            version: skillVersionDto(await this.version(access, domain, skillId, row.id, tx)),
          } : {}) },
          entityKind: "style_skill_version",
          entityId: row.id,
        };
      },
    );
    return result.version ?? this.readVersion(access, domain, skillId, result.id);
  }
  async clone(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    input: unknown,
  ) {
    const body = parseInput(SkillCloneSchema, input);
    const result = await this.mutations.run(
      access,
      "skills.clone:" + String(skillId),
      body.requestId,
      body,
      async (tx) => {
        const skill = await this.files.skill(access, domain, skillId, tx);
        await this.lock(tx, skill.id);
        const fresh = await this.files.skill(access, domain, skillId, tx);
        if (fresh.revision !== body.expectedSkillRevision)
          throw new ApiException(
            "REVISION_CONFLICT",
            "skill 已有新变化，请刷新后复制",
            409,
          );
        const source = await this.version(
            access,
            domain,
            skillId,
            body.sourceVersionId,
            tx,
          ),
          manifest = manifestInput(source.manifest);
        await this.validateFiles(tx, skill.id, access, manifest);
        const latest = await tx.styleSkillVersion.findFirstOrThrow({
          where: { skillId: skill.id },
          orderBy: { number: "desc" },
        });
        const row = await tx.styleSkillVersion.create({
          data: {
            skillId: skill.id,
            scope: access.scope,
            number: latest.number + 1,
            manifest: manifest as Prisma.InputJsonValue,
            digest: contentDigest(manifest),
            actorUserId: access.actorUserId,
          },
        });
        await this.attachments(tx, row, manifest);
        await tx.styleSkill.update({
          where: { id: skill.id },
          data: { ...projection(manifest), revision: { increment: 1 } },
        });
        return {
          response: { id: row.id, ...(access.machineCredentialId ? {
            version: skillVersionDto(await this.version(access, domain, skillId, row.id, tx)),
          } : {}) },
          entityKind: "style_skill_version",
          entityId: row.id,
        };
      },
    );
    return result.version ?? this.readVersion(access, domain, skillId, result.id);
  }
  async transition(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    versionId: unknown,
    action: "review" | "activate" | "archive",
    input: unknown,
  ) {
    const body = parseInput(SkillActionSchema, input);
    const result = await this.mutations.run(
      access,
      "skills." + action + ":" + String(versionId),
      body.requestId,
      body,
      async (tx) => {
        const skill = await this.files.skill(access, domain, skillId, tx);
        await this.lock(tx, skill.id);
        const row = await this.version(access, domain, skillId, versionId, tx);
        if (row.revision !== body.expectedRevision)
          throw new ApiException(
            "REVISION_CONFLICT",
            "skill 修订已变化，请刷新",
            409,
          );
        if (
          (action === "review" && row.status !== "DRAFT") ||
          (action === "activate" && row.status !== "REVIEWED") ||
          (action === "archive" && row.status === "ARCHIVED")
        )
          throw new ApiException("CONFLICT", "当前版本不能执行此状态流转", 409);
        if (action !== "archive")
          await this.validateFiles(
            tx,
            skill.id,
            access,
            manifestInput(row.manifest),
          );
        if (action === "activate")
          await tx.styleSkillVersion.updateMany({
            where: { skillId: skill.id, status: "ACTIVE" },
            data: { status: "ARCHIVED", revision: { increment: 1 } },
          });
        await tx.styleSkillVersion.update({
          where: { id: row.id },
          data: {
            status:
              action === "review"
                ? "REVIEWED"
                : action === "activate"
                  ? "ACTIVE"
                  : "ARCHIVED",
            revision: { increment: 1 },
          },
        });
        await tx.styleSkill.update({
          where: { id: skill.id },
          data: { revision: { increment: 1 } },
        });
        return {
          response: { id: row.id },
          entityKind: "style_skill_version",
          entityId: row.id,
        };
      },
    );
    return this.readVersion(access, domain, skillId, result.id);
  }
  async diff(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    fromId: unknown,
    toId: unknown,
  ) {
    const from = await this.version(access, domain, skillId, fromId),
      to = await this.version(access, domain, skillId, toId);
    return {
      fromId: from.id,
      toId: to.id,
      ...stableDiff(from.manifest, to.manifest),
    };
  }
  async export(
    access: CatalogAdminAccess,
    domain: unknown,
    skillId: unknown,
    versionId: unknown,
  ) {
    const row = await this.version(access, domain, skillId, versionId);
    return StyleSkillExportSchema.parse({
      schemaVersion: 1,
      slug: row.skill.slug,
      version: skillVersionDto(row),
    });
  }
}
