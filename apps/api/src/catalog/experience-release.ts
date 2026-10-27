import { ExperienceReleaseSchema, supportsExperience } from '@orai/contracts/experience';
import type { ProductConfiguration } from '@orai/contracts/admin';
import type { ExperienceRelease } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';

export function experienceRelease(row: ExperienceRelease | null, configuration: ProductConfiguration, creativeProfileRevisionId: string | null) {
  const parsed = row && ExperienceReleaseSchema.safeParse({ id: row.id, digest: row.digest, manifest: row.manifest });
  if (!row || !parsed || !parsed.success) throw new ApiException('INVALID_CONFIGURATION', '体验发布清单不可用', 400);
  const { manifest } = parsed.data;
  if (!supportsExperience(manifest) || manifest.content.versionId !== row.productVersionId ||
    row.creativeProfileRevisionId !== creativeProfileRevisionId ||
    manifest.creativeProfileRevisionId !== row.creativeProfileRevisionId || manifest.scenes.length !== configuration.questions.length ||
    manifest.scenes.some((scene, index) => {
      const question = configuration.questions[index]!;
      return scene.questionId !== question.id || scene.choices.length !== question.options.length ||
        scene.choices.some((choice, option) => choice.optionId !== question.options[option]!.id);
    })) throw new ApiException('INVALID_CONFIGURATION', '体验模板、报告呈现或选项映射尚未兼容当前内容', 400);
  return parsed.data;
}
