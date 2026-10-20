import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { IdSchema } from "@orai/contracts";
import {
  AdminPageQuerySchema,
  ContentPackageSelectionSchema,
  ContentPackageAdoptSchema,
  ContentPackagePreviewSchema,
  ContentPackageManifestSchema,
  ContentPackageSchema,
  ProductConfigurationSchema,
} from "@orai/contracts/admin";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "../generated/prisma/client";
import type { CatalogAdminAccess } from "../catalog/admin-access.service";
import { AdminMutationService } from "./admin-mutation.service";
import { AssetStorage } from "./asset-storage";
import {
  ContentWorkflowService,
  contentLock,
  semanticSnapshot,
  type WorkflowRevision,
} from "./content-workflow.service";
import {
  contentDigest,
  profileDto,
  revisionDto,
  snapshotAuthoring,
} from "./content-projections";
import { ApiException } from "../common/http-errors";
import { parseInput } from "../common/parse-input";
type Selection = z.infer<typeof ContentPackageSelectionSchema>;
@Injectable()
export class ContentPackagesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly mutations: AdminMutationService,
    private readonly workflow: ContentWorkflowService,
    private readonly storage: AssetStorage,
  ) {}
  private packageDto(row: Prisma.ContentPackageGetPayload<object>) {
    return ContentPackageSchema.parse({
      id: row.id,
      productId: row.productId,
      scope: row.scope.toLowerCase(),
      number: row.number,
      label: row.label,
      digest: row.digest,
      manifest: row.manifest,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    });
  }
  private async check(
    tx: Prisma.TransactionClient,
    access: CatalogAdminAccess,
    selection: Selection,
  ) {
    const productId = selection.productId.toLowerCase();
    const product = await tx.product.findFirst({
        where: { id: productId, scope: access.scope },
      }),
      profile = await tx.creativeProfileRevision.findFirst({
        where: {
          id: selection.creativeProfileRevisionId.toLowerCase(),
          productId,
          scope: access.scope,
        },
      });
    if (!product || !profile)
      throw new ApiException(
        "NOT_FOUND",
        "商品或创作设定不存在于当前范围",
        404,
      );
    const setting = profileDto(profile),
      issues: string[] = [],
      assessment = await this.workflow.revision(
        tx,
        access,
        selection.assessmentRevisionId,
        productId,
      ),
      assets: WorkflowRevision[] = [];
    if (
      setting.profile.experienceForm !== "web" ||
      setting.profile.perspective === "planned_two_person"
    )
      issues.push(
        "当前只可采用单人网页形式；双方、卡片、2.5D/3D 和小游戏仍为创作方案",
      );
    if (
      assessment.domain !== "assessment" ||
      !ProductConfigurationSchema.safeParse(
        (assessment.snapshot as Record<string, unknown>).configuration,
      ).success
    )
      issues.push("必须选择有效的兼容题库与报告修订");
    if (
      !["reviewed", "published"].includes(
        String((assessment.snapshot as Record<string, unknown>).status),
      )
    )
      issues.push("题库修订需先审核");
    if (
      !assessment.production ||
      assessment.production.creativeProfileRevisionId !== profile.id
    )
      issues.push("题库修订尚未登记到同一创作设定的制作来源");
    for (const revisionId of selection.assetRevisionIds) {
      const row = await this.workflow.revision(
        tx,
        access,
        revisionId,
        productId,
      );
      assets.push(row);
      if (
        row.domain === "assessment" ||
        row.productVersionId !== assessment.productVersionId
      )
        issues.push("宣传素材必须属于所选题库版本");
      if (
        row.creativeProfileRevisionId !== profile.id ||
        !snapshotAuthoring(row.snapshot)
      )
        issues.push("宣传素材必须绑定同一创作设定且具备结构化内容");
      if ((row.snapshot as Record<string, unknown>).status !== "ready")
        issues.push("宣传素材修订需先标记就绪");
      if (
        (row.domain === "cover" || row.domain === "video") &&
        (!row.fileId ||
          (row.snapshot as Record<string, unknown>).kind === "script")
      )
        issues.push("封面与视频须具备正式媒体文件，脚本或预览不能代替成片");
    }
    for (const domain of ["cover", "video", "copy"])
      if (!assets.some((row) => row.domain === domain))
        issues.push("采用组合缺少 " + domain + " 内容");
    const fixed = new Map<string, WorkflowRevision>();
    for (const root of [assessment, ...assets])
      for (const [id, row] of await this.workflow.graph(tx, access, root))
        fixed.set(id, row);
    for (const row of fixed.values()) {
      if (
        row.domain === "assessment" &&
        (row.productVersionId !== assessment.productVersionId ||
          contentDigest(semanticSnapshot(row.snapshot)) !==
            contentDigest(semanticSnapshot(assessment.snapshot)))
      )
        issues.push("固定引用的题库与所选题库配置不一致");
      if (
        row.assetId &&
        !assets.some(
          (value) =>
            value.assetId === row.assetId &&
            contentDigest(semanticSnapshot(value.snapshot)) ===
              contentDigest(semanticSnapshot(row.snapshot)),
        )
      )
        issues.push(
          "固定引用的宣传稿与所选稿件不一致，请选择匹配的合法旧稿或重新制作",
        );
    }
    const impacts = [];
    for (const row of [assessment, ...assets]) {
      const impact = await this.workflow.impactIn(tx, access, row);
      impacts.push(impact);
      if (impact.blocked) issues.push("采用组合包含归档或失效内容");
      if (impact.needsReview)
        issues.push("上游有更新，需先复查并确认继续采用固定旧稿，或重新制作");
    }
    const fileData = new Map<
      string,
      {
        id: string;
        fileName: string;
        mimeType: string;
        byteSize: number;
        checksum: string;
        width: number | null;
        height: number | null;
        durationMs: number | null;
        downloadPath: string;
      }
    >();
    for (const row of fixed.values())
      for (const file of [row.file, row.previewFile])
        if (file && !fileData.has(file.id)) {
          try {
            if (file.status !== "AVAILABLE") throw new Error("unavailable");
            const verified = await this.storage.inspect(
              file.storageKey,
              file.byteSize,
            );
            if (
              verified.checksum !== file.checksum ||
              verified.byteSize !== file.byteSize ||
              verified.mimeType !== file.mimeType
            )
              throw new Error("invalid");
            fileData.set(file.id, {
              id: file.id,
              fileName: file.originalName,
              mimeType: file.mimeType,
              byteSize: file.byteSize,
              checksum: file.checksum,
              width: verified.width,
              height: verified.height,
              durationMs: verified.durationMs,
              downloadPath: "/api/admin/files/" + file.id + "/content",
            });
          } catch {
            issues.push("文件缺失或完整性校验失败：" + file.originalName);
          }
        }
    const latestPackageNumber =
      (
        await tx.contentPackage.aggregate({
          where: { productId },
          _max: { number: true },
        })
      )._max.number ?? 0;
    const fingerprint = contentDigest({
      selection,
      productRevision: product.revision,
      profileDigest: profile.digest,
      impacts,
      fileData: [...fileData.values()],
      latestPackageNumber,
    });
    const preview = ContentPackagePreviewSchema.parse({
      fingerprint,
      canAdopt: issues.length === 0,
      issues: [...new Set(issues)],
      impacts,
      revisions: [assessment, ...assets].map(revisionDto),
      latestPackageNumber,
    });
    return { preview, product, setting, assessment, assets, fixed, fileData };
  }
  async preview(access: CatalogAdminAccess, input: unknown) {
    await this.mutations.administrators.require(access);
    const selection = parseInput(ContentPackageSelectionSchema, input);
    return this.database.client.$transaction(
      async (tx) => {
        await contentLock(tx, access, selection.productId.toLowerCase());
        return (await this.check(tx, access, selection)).preview;
      },
      { timeout: 60000 },
    );
  }
  async adopt(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(ContentPackageAdoptSchema, input),
      selection = body.selection;
    const result = await this.mutations.run(
      access,
      "content.adopt:" + selection.productId,
      body.requestId,
      body,
      async (tx) => {
        await contentLock(tx, access, selection.productId.toLowerCase());
        const checked = await this.check(tx, access, selection);
        if (
          checked.preview.fingerprint !== body.expectedFingerprint ||
          checked.preview.latestPackageNumber !== body.expectedPackageNumber
        )
          throw new ApiException(
            "REVISION_CONFLICT",
            "采用预览后内容或采用序号已变化，请重新校验",
            409,
          );
        if (!checked.preview.canAdopt)
          throw new ApiException("CONFLICT", checked.preview.issues[0]!, 409);
        const production = (row: WorkflowRevision) => {
          const value = row.production;
          return value
            ? {
                id: value.id,
                productId: value.productId,
                outputRevisionId: value.outputRevisionId,
                creativeProfileRevisionId: value.creativeProfileRevisionId,
                source: value.source,
                batchKey: value.batchKey,
                externalLabel: value.externalLabel,
                skillVersionId: value.skillVersionId,
                inputManifest: value.inputManifest,
                createdAt: value.createdAt.toISOString(),
              }
            : null;
        };
        const manifest = ContentPackageManifestSchema.parse({
          schemaVersion: 1,
          product: {
            id: checked.product.id,
            name: checked.product.name,
            slug: checked.product.slug,
            themeKey: checked.product.themeKey,
            publicSample: checked.product.publicSample,
          },
          creativeProfile: checked.setting,
          assessment: revisionDto(checked.assessment),
          runtime: {
            experience: "web",
            engine: "dimensions_v1",
            report: "compatible_standard",
            themeKey: checked.product.themeKey,
          },
          dependencies: [...checked.fixed.values()]
            .filter(
              (row) =>
                row.id !== checked.assessment.id &&
                !checked.assets.some((asset) => asset.id === row.id),
            )
            .map(revisionDto),
          assets: checked.assets.map((row) => ({
            revision: revisionDto(row),
            production: production(row),
            inputs: row.inputs.map((input) => ({
              sourceRevisionId: input.sourceRevisionId,
              sourceDigest: input.sourceDigest,
              locator: input.locator,
              targetLocator: input.targetLocator,
              role: input.role,
              mode: input.mode,
              usedText: input.usedText,
              sourceSnapshot: input.sourceSnapshot,
            })),
            files: [
              ...(row.fileId
                ? [
                    {
                      ...checked.fileData.get(row.fileId)!,
                      purpose: "delivery",
                    },
                  ]
                : []),
              ...(row.previewFileId
                ? [
                    {
                      ...checked.fileData.get(row.previewFileId)!,
                      purpose: "preview",
                    },
                  ]
                : []),
            ],
          })),
          assessmentProduction: production(checked.assessment),
          reviews: checked.preview.impacts
            .filter((value) => value.reviewed)
            .map((value) => ({
              revisionId: value.revisionId,
              fingerprint: value.fingerprint,
              note: value.reviewNote!,
            })),
        });
        const row = await tx.contentPackage.create({
          data: {
            productId: checked.product.id,
            scope: access.scope,
            creativeProfileRevisionId: checked.setting.id,
            number: checked.preview.latestPackageNumber + 1,
            label: selection.label,
            note: body.note,
            manifest: manifest as Prisma.InputJsonValue,
            digest: contentDigest(manifest),
            actorUserId: access.actorUserId,
            items: {
              create: [...checked.fixed.keys()].map((revisionId) => ({
                revisionId,
              })),
            },
          },
        });
        return {
          response: { id: row.id },
          entityKind: "content_package",
          entityId: row.id,
        };
      },
    );
    return this.read(access, result.id);
  }
  async read(access: CatalogAdminAccess, key: unknown) {
    await this.mutations.administrators.require(access);
    const row = await this.database.client.contentPackage.findFirst({
      where: {
        id: parseInput(IdSchema, key).toLowerCase(),
        scope: access.scope,
      },
    });
    if (!row)
      throw new ApiException("NOT_FOUND", "采用包不存在于当前范围", 404);
    return this.packageDto(row);
  }
  async list(access: CatalogAdminAccess, productKey: unknown, query: unknown) {
    await this.mutations.administrators.require(access);
    const productId = parseInput(IdSchema, productKey).toLowerCase(),
      args = parseInput(AdminPageQuerySchema, query),
      where = { productId, scope: access.scope };
    const rows = await this.database.client.contentPackage.findMany({
        where,
        orderBy: { number: "desc" },
        skip: (args.page - 1) * args.pageSize,
        take: args.pageSize,
      }),
      total = await this.database.client.contentPackage.count({ where });
    return {
      items: rows.map((row) => this.packageDto(row)),
      total,
      page: args.page,
      pageSize: args.pageSize,
    };
  }
}
