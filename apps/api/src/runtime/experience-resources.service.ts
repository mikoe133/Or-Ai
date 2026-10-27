import { Injectable } from '@nestjs/common';
import { KeySchema } from '@orai/contracts';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AssetStorage } from '../operations/asset-storage';
import { storedFileContent } from '../operations/files.service';
import { ConsumerAccessService, type ConsumerActor } from './consumer-access.service';
import { OwnedRuntimeService } from './owned-runtime.service';
import { experienceRelease } from '../catalog/experience-release';
import { ProductConfigurationSchema } from '@orai/contracts/admin';

@Injectable()
export class ExperienceResourcesService {
  constructor(private readonly database: DatabaseService, private readonly owned: OwnedRuntimeService,
    private readonly access: ConsumerAccessService, private readonly storage: AssetStorage) {}

  async read(actor: ConsumerActor, kind: 'attempt' | 'report', input: unknown, resourceInput: unknown, range?: string) {
    const resourceId = parseInput(KeySchema, resourceInput);
    const file = await this.database.client.$transaction(async tx => {
      let releaseId: string | null;
      if (kind === 'attempt') releaseId = (await this.owned.attempt(tx, actor, input, false)).attempt.experienceReleaseId;
      else {
        const report = await this.access.requireReport(actor, input, tx);
        const attempt = await tx.attempt.findUniqueOrThrow({ where: { id: report.attemptId } });
        releaseId = attempt.experienceReleaseId;
      }
      const row = await tx.experienceRelease.findFirst({ where: { id: releaseId ?? '', scope: actor.scope },
        include: { productVersion: true, resources: { where: { resourceId }, include: { file: true } } } });
      if (!row) throw new ApiException('NOT_FOUND', '体验资源不可访问', 404);
      const release = experienceRelease(row, parseInput(ProductConfigurationSchema, row.productVersion.configuration, 'INVALID_CONFIGURATION'), row.productVersion.creativeProfileRevisionId);
      const spec = release.manifest.resources.find(r => r.resourceId === resourceId), resource = row.resources[0];
      if (!spec || !resource || resource.file.status !== 'AVAILABLE' ||
        resource.file.id !== spec.fileId || resource.file.checksum !== spec.checksum || resource.file.byteSize !== spec.byteSize || resource.file.mimeType !== spec.mimeType)
        throw new ApiException('NOT_FOUND', '体验资源尚未就绪或不属于当前发布', 404);
      return resource.file;
    });
    const verified = await this.storage.inspect(file.storageKey, file.byteSize);
    if (verified.checksum !== file.checksum || verified.byteSize !== file.byteSize || verified.mimeType !== file.mimeType)
      throw new ApiException('ASSET_UNAVAILABLE', '体验资源完整性检查失败，请使用简化界面', 503);
    return storedFileContent(this.storage, file, range);
  }
}
