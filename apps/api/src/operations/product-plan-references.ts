import type { ProductionPlanDocument } from '@orai/contracts/admin';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import type { Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';

export async function validateProductPlanReferences(tx: Prisma.TransactionClient, access: CatalogAdminAccess,
  productId: string, plan: ProductionPlanDocument) {
  if (plan.schemaVersion !== 2) return;
  const fixed = plan.productPlan, where = { productId, scope: access.scope };
  if (fixed.basedOnPlanRevisionId && !await tx.productionPlanRevision.findFirst({
    where: { ...where, id: fixed.basedOnPlanRevisionId }, select: { id: true },
  })) throw new ApiException('NOT_FOUND', '规划来源修订不属于该商品或当前范围', 404);
  for (const source of fixed.sources) {
    const target = { ...where, id: source.id };
    let row: { digest: string; creativeProfileRevisionId: string | null } | null = null;
    if (source.kind === 'content_revision') row = await tx.contentRevision.findFirst({ where: target,
      select: { digest: true, creativeProfileRevisionId: true } });
    else if (source.kind === 'experience_release') row = await tx.experienceRelease.findFirst({ where: target,
      select: { digest: true, creativeProfileRevisionId: true } });
    else {
      const method = await tx.projectMethodSnapshot.findFirst({ where: target,
        include: { module: { include: { identity: true, plan: { select: { creativeProfileRevisionId: true } } } } } });
      const module = plan.modules.find(item => item.moduleKey === source.moduleKey)!;
      if (method && method.module.identity.domain !== module.domain)
        throw new ApiException('CONFLICT', '方法来源与目标模块的专业领域不一致', 409);
      row = method ? { digest: method.digest, creativeProfileRevisionId: method.module.plan.creativeProfileRevisionId } : null;
    }
    if (!row) throw new ApiException('NOT_FOUND', '固定来源不属于该商品或当前范围', 404);
    if (row.digest !== source.digest) throw new ApiException('REVISION_CONFLICT', '固定来源摘要已不一致，请重新读取精确版本', 409);
    if (row.creativeProfileRevisionId && row.creativeProfileRevisionId !== plan.creativeProfileRevisionId)
      throw new ApiException('CONFLICT', '固定来源与商品规划的共同创作设定不一致', 409);
  }
}
