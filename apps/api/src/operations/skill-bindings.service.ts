import { Injectable } from "@nestjs/common";
import { IdSchema } from "@orai/contracts";
import { z } from "zod";
import {
  AdminPageQuerySchema,
  BoundSkillSchema,
  CreativeSkillSetSchema,
  CreativeSkillSetSaveSchema,
  ContentDomainSchema, ProductionDomainSchema,
  SkillPurposeSchema,
  SkillCandidateQuerySchema,
  SkillSetDomainSchema,
  FixedSkillVersionSchema,
  StyleSkillManifestSchema,
  purposeDomain,
} from "@orai/contracts/admin";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "../generated/prisma/client";
import type { CatalogAdminAccess } from "../catalog/admin-access.service";
import { parseInput } from "../common/parse-input";
import { ApiException } from "../common/http-errors";
import { AdminMutationService } from "./admin-mutation.service";
import { contentDigest } from "./content-projections";
export { productionDto } from "./content-projections";
import { contentLock } from "./content-workflow.service";
import { SkillFilesService, skillFileDto } from "./skill-files.service";
import { AssetStorage } from "./asset-storage";
import { bindSkillProductPlan, requireSkillProductPolicy } from './skill-product-policy';

const include = {
  skill: true,
  attachments: { include: { file: true } },
} as const;
type Version = Prisma.StyleSkillVersionGetPayload<{ include: typeof include }>;
type SetRow = Prisma.CreativeSkillSetGetPayload<{
  include: { bindings: true };
}>;
export type SkillSet = z.infer<typeof CreativeSkillSetSchema>;
const id = (input: unknown) => parseInput(IdSchema, input).toLowerCase();
export function fixedVersion(row: Version) {
  return FixedSkillVersionSchema.parse({
    id: row.id,
    skillId: row.skillId,
    number: row.number,
    digest: row.digest,
    manifest: row.manifest,
    files: row.attachments
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((ref) => {
        const { id, fileName, mimeType, byteSize, checksum, downloadPath } =
          skillFileDto(ref.file, row.skill.domain);
        return {
          path: ref.path,
          file: { id, fileName, mimeType, byteSize, checksum, downloadPath },
        };
      }),
  });
}
export function skillSetDto(row: SetRow) {
  return CreativeSkillSetSchema.parse({
    id: row.id,
    productId: row.productId,
    scope: row.scope.toLowerCase(),
    creativeProfileRevisionId: row.creativeProfileRevisionId,
    revision: row.number,
    digest: row.digest,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    bindings: row.bindings
      .sort((a, b) => a.purpose.localeCompare(b.purpose))
      .map((item) => item.snapshot),
  });
}
@Injectable()
export class SkillBindingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly mutations: AdminMutationService,
    private readonly files: SkillFilesService,
    private readonly storage: AssetStorage,
  ) {}

  async readIn(
    tx: Prisma.TransactionClient,
    access: CatalogAdminAccess,
    key: unknown,
    profileId?: string,
  ) {
    await this.mutations.administrators.require(access, tx);
    const row = await tx.creativeSkillSet.findFirst({
      where: {
        id: id(key),
        scope: access.scope,
        ...(profileId ? { creativeProfileRevisionId: profileId } : {}),
      },
      include: { bindings: true },
    });
    if (!row)
      throw new ApiException(
        "NOT_FOUND",
        "skill 组合不存在于当前创作设定或管理范围",
        404,
      );
    return skillSetDto(row);
  }
  async read(access: CatalogAdminAccess, key: unknown) {
    return this.readIn(this.database.client, access, key);
  }
  async list(access: CatalogAdminAccess, profileKey: unknown, input: unknown) {
    await this.mutations.administrators.require(access);
    const profileId = id(profileKey),
      query = parseInput(AdminPageQuerySchema, input);
    if (
      !(await this.database.client.creativeProfileRevision.findFirst({
        where: { id: profileId, scope: access.scope },
      }))
    )
      throw new ApiException("NOT_FOUND", "创作设定不存在于当前管理范围", 404);
    const where = { creativeProfileRevisionId: profileId, scope: access.scope };
    const [rows, total] = await this.database.client.$transaction([
      this.database.client.creativeSkillSet.findMany({
        where,
        include: { bindings: true },
        orderBy: { number: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.database.client.creativeSkillSet.count({ where }),
    ]);
    return {
      items: rows.map(skillSetDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async candidates(
    access: CatalogAdminAccess,
    domainInput: unknown,
    input: unknown,
  ) {
    await this.mutations.administrators.require(access);
    const domain = parseInput(ProductionDomainSchema, domainInput),
      query = parseInput(SkillCandidateQuerySchema, input);
    if (purposeDomain[query.purpose] !== domain)
      throw new ApiException("VALIDATION_ERROR", "专业用途与请求领域不符", 400);
    // Filter the actual fixed ACTIVE manifest; library metadata may describe a newer draft.
    const where: Prisma.StyleSkillVersionWhereInput = {
      scope: access.scope,
      status: "ACTIVE",
      skill: { domain },
      AND: [
        { manifest: { path: ['schemaVersion'], equals: 2 } },
        { manifest: { path: ["purposes"], array_contains: [query.purpose] } },
        {
          manifest: { path: ["supportedForms"], array_contains: [query.form] },
        },
        ...(query.q
          ? [{ manifest: { path: ["name"], string_contains: query.q } }]
          : []),
      ],
    };
    const [rows, total] = await this.database.client.$transaction([
      this.database.client.styleSkillVersion.findMany({
        where,
        include,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.database.client.styleSkillVersion.count({ where }),
    ]);
    return {
      items: rows.map(fixedVersion),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async verifyFiles(
    set: SkillSet,
    tx: Prisma.TransactionClient = this.database.client,
    domain?: string,
  ) {
    const checked = new Set<string>();
    for (const binding of set.bindings.filter(
      (item) => !domain || item.domain === domain,
    )) {
      for (const ref of binding.version.files) {
        if (checked.has(ref.file.id)) continue;
        checked.add(ref.file.id);
        const row = await tx.skillReferenceFile.findFirst({
          where: {
            id: ref.file.id,
            skillId: binding.version.skillId,
            scope: set.scope.toUpperCase() as CatalogAdminAccess["scope"],
            status: "AVAILABLE",
          },
        });
        if (!row)
          throw new ApiException("CONFLICT", "固定 skill 参考文件不可用", 409);
        const actual = await this.storage.inspectReference(
          row.storageKey,
          row.byteSize,
          row.mimeType,
        );
        if (
          actual.byteSize !== ref.file.byteSize ||
          actual.checksum !== ref.file.checksum ||
          actual.mimeType !== ref.file.mimeType
        )
          throw new ApiException(
            "CONFLICT",
            "固定 skill 参考文件完整性校验失败",
            409,
          );
      }
    }
  }
  async save(access: CatalogAdminAccess, profileKey: unknown, input: unknown) {
    const profileId = id(profileKey),
      body = parseInput(CreativeSkillSetSaveSchema, input);
    const result = await this.mutations.run(
      access,
      "skills.bind:" + profileId,
      body.requestId,
      body,
      async (tx) => {
        const profile = await tx.creativeProfileRevision.findFirst({
          where: { id: profileId, scope: access.scope },
        });
        if (!profile)
          throw new ApiException(
            "NOT_FOUND",
            "创作设定不存在于当前管理范围",
            404,
          );
        await contentLock(tx, access, profile.productId);
        const previous = await tx.creativeSkillSet.findFirst({
          where: { creativeProfileRevisionId: profile.id },
          orderBy: { number: "desc" },
          include: { bindings: true },
        });
        if ((previous?.number ?? 0) !== body.expectedRevision)
          throw new ApiException(
            "REVISION_CONFLICT",
            "skill 组合已有新修订，请刷新后重试",
            409,
          );
        const bindings: z.infer<typeof BoundSkillSchema>[] = [];
        // A shared row lock serializes binding with activation/archiving without lock-order inversions.
        for (const versionId of [
          ...new Set(body.bindings.map((item) => id(item.skillVersionId))),
        ].sort())
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM orai.style_skill_versions WHERE id=${versionId}::uuid FOR SHARE`,
          );
        for (const choice of [...body.bindings].sort((a, b) =>
          a.purpose.localeCompare(b.purpose),
        )) {
          const row = await tx.styleSkillVersion.findFirst({
            where: { id: id(choice.skillVersionId), scope: access.scope },
            include,
          });
          if (!row)
            throw new ApiException(
              "NOT_FOUND",
              "skill 版本不存在于当前范围",
              404,
            );
          const manifest = StyleSkillManifestSchema.parse(row.manifest),
            domain = purposeDomain[choice.purpose];
          requireSkillProductPolicy(manifest);
          if (
            row.skill.domain !== domain ||
            manifest.domain !== domain ||
            !manifest.purposes.includes(choice.purpose)
          )
            throw new ApiException(
              "CONFLICT",
              "skill 领域或专业用途不兼容",
              409,
            );
          if (
            !manifest.supportedForms.includes(
              (
                profile.profile as {
                  experienceForm: z.infer<
                    typeof SkillCandidateQuerySchema
                  >["form"];
                }
              ).experienceForm,
            )
          )
            throw new ApiException(
              "CONFLICT",
              "skill 不支持此商品的体验形式",
              409,
            );
          const retained =
            row.status === "ARCHIVED" &&
            previous?.bindings.some(
              (item) =>
                item.purpose === choice.purpose &&
                item.skillVersionId === row.id,
            );
          if (row.status !== "ACTIVE" && !retained)
            throw new ApiException(
              "CONFLICT",
              "新绑定需使用已启用版本；归档版仅可保留既有用途绑定",
              409,
            );
          bindings.push(
            BoundSkillSchema.parse({
              purpose: choice.purpose,
              domain,
              version: fixedVersion(row),
              productPlanInput: await bindSkillProductPlan(tx, access, { productId: profile.productId, profileId: profile.id,
                reference: body.productPlan, moduleId: choice.planModuleId, purpose: choice.purpose, domain,
                form: (profile.profile as { experienceForm: string }).experienceForm }),
            }),
          );
        }
        const data = {
          productId: profile.productId,
          scope: access.scope,
          creativeProfileRevisionId: profile.id,
          number: (previous?.number ?? 0) + 1,
          digest: contentDigest({ profileDigest: profile.digest, bindings }),
          note: body.note,
        };
        const created = await tx.creativeSkillSet.create({ data });
        await tx.creativeSkillBinding.createMany({
          data: bindings.map((binding) => ({
            skillSetId: created.id,
            productId: profile.productId,
            scope: access.scope,
            purpose: binding.purpose,
            domain: binding.domain,
            skillId: binding.version.skillId,
            skillVersionId: binding.version.id,
            snapshot: binding as Prisma.InputJsonValue,
          })),
        });
        const row = await tx.creativeSkillSet.findUniqueOrThrow({
          where: { id: created.id },
          include: { bindings: true },
        });
        await this.verifyFiles(skillSetDto(row), tx);
        return {
          response: { id: row.id },
          entityKind: "creative_skill_set",
          entityId: row.id,
        };
      },
    );
    return this.read(access, result.id);
  }
  async domain(
    access: CatalogAdminAccess,
    key: unknown,
    domainInput: unknown,
    purposeInput?: unknown,
  ) {
    const domain = parseInput(ContentDomainSchema, domainInput),
      purpose =
        purposeInput === undefined
          ? undefined
          : parseInput(SkillPurposeSchema, purposeInput);
    if (purpose && purposeDomain[purpose] !== domain)
      throw new ApiException("VALIDATION_ERROR", "专业用途与请求领域不符", 400);
    const set = await this.read(access, key);
    await this.verifyFiles(set, this.database.client, domain);
    return SkillSetDomainSchema.parse({
      skillSetId: set.id,
      creativeProfileRevisionId: set.creativeProfileRevisionId,
      domain,
      skillVersions: set.bindings.filter(
        (item) =>
          item.domain === domain && (!purpose || item.purpose === purpose),
      ),
    });
  }
  async reference(
    access: CatalogAdminAccess,
    key: unknown,
    domain: unknown,
    purpose: unknown,
    fileKey: unknown,
    range?: string,
  ) {
    const result = await this.domain(access, key, domain, purpose),
      fileId = id(fileKey);
    const binding = result.skillVersions.find((item) =>
      item.version.files.some((ref) => ref.file.id === fileId),
    );
    if (!binding)
      throw new ApiException(
        "NOT_FOUND",
        "文件不是此领域及用途的固定参考输入",
        404,
      );
    return this.files.content(
      access,
      binding.domain,
      binding.version.skillId,
      fileId,
      range,
    );
  }
  async productionIn(
    tx: Prisma.TransactionClient,
    access: CatalogAdminAccess,
    profileId: string,
    domain: string,
    source: { skillSetId?: string | null; skillVersionId: string | null },
  ) {
    if (!source.skillSetId) {
      if (source.skillVersionId)
        throw new ApiException(
          "CONFLICT",
          "skill 来源必须引用完整固定组合",
          409,
        );
      return {
        skillVersionId: null,
        skillSetId: null,
        skillVersions: [] as Prisma.InputJsonValue,
      };
    }
    const set = await this.readIn(tx, access, source.skillSetId, profileId);
    await this.validateForUse(tx, access, set);
    await this.verifyFiles(set, tx, domain);
    const versions = set.bindings.filter((item) => item.domain === domain),
      primary = versions.find(
        (item) =>
          domain !== "assessment" || item.purpose === "assessment_design",
      )!;
    if (
      source.skillVersionId &&
      id(source.skillVersionId) !== primary.version.id
    )
      throw new ApiException(
        "CONFLICT",
        "声明的 skill 版本与固定组合的专业用途不一致",
        409,
      );
    return {
      skillSetId: set.id,
      skillVersionId: primary.version.id,
      skillVersions: versions as Prisma.InputJsonValue,
    };
  }
  async validateForUse(tx: Prisma.TransactionClient, access: CatalogAdminAccess, set: SkillSet) {
    const references = new Set<string>();
    for (const binding of set.bindings) {
      requireSkillProductPolicy(binding.version.manifest);
      const fixed = binding.productPlanInput;
      if (!fixed) throw new ApiException('VALIDATION_ERROR', '历史组合缺少实际商品规划输入，请追加新的合规组合后制作', 400);
      if (!binding.version.manifest.supportedForms.includes(fixed.form)) throw new ApiException('CONFLICT', '固定方法不支持声明的商品形式', 409);
      const checked = await bindSkillProductPlan(tx, access, { productId: set.productId, profileId: set.creativeProfileRevisionId,
        purpose: binding.purpose, domain: binding.domain, form: fixed.form,
        reference: { revisionId: fixed.planRevisionId, digest: fixed.planDigest }, moduleId: fixed.planModuleId });
      if (checked.moduleDigest !== fixed.moduleDigest) throw new ApiException('CONFLICT', '方法绑定与固定规划模块的摘要不一致', 409);
      references.add(fixed.planRevisionId + ':' + fixed.planDigest);
    }
    if (references.size !== 1) throw new ApiException('CONFLICT', '五用途方法必须引用同一固定商品规划', 409);
  }
}
