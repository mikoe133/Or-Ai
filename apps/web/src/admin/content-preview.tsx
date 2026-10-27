import { useState } from "react";
import { ProductConfigurationSchema } from "@orai/contracts/admin";
import { PublicReportSampleSchema } from "@orai/contracts";
import { Failure, useAction } from "../business/shared.js";
import { adminApi, parseEditor, type AdminProduct } from "./api.js";
import {
  contentApi,
  type Profile,
  type Revision,
  type RevisionDetail,
} from "./content-api.js";
import {
  authoringOf,
  capability,
  domains,
  platforms,
  stringField,
} from "./content-model.js";
import { MediaPreview } from "./content-media.js";
import { ProductionOrigin } from "./content-parts.js";
import { purposeLabels } from "./skills-model.js";
export function SuitePreview({
  product,
  profile,
  rows,
}: {
  product: AdminProduct;
  profile?: Profile;
  rows: Revision[];
}) {
  const action = useAction(),
    [assets, setAssets] = useState<RevisionDetail[]>([]),
    [loaded, setLoaded] = useState(false);
  const config = ProductConfigurationSchema.safeParse(
    rows.find((row) => row.domain === "assessment")?.snapshot.configuration,
  );
  const applicable = rows.filter(
    (row) =>
      row.domain !== "assessment" &&
      row.creativeProfileRevisionId === profile?.id &&
      row.snapshot.status !== "archived",
  );
  return (
    <section className="content-editor content-suite-preview" aria-label="整套内容预览">
      <h3>整套试读</h3>
      <p>
        预览当前题库版本和所选创作设定下的各平台稿件。核对后可到「成套采用」页签固定采用组合并导出。
      </p>
      <div className="content-preview-intro">
        <span className="content-eyebrow">{product.name}</span>
        <h3>{profile?.profile.title ?? "尚未建立共同创作设定"}</h3>
        <p>{profile?.profile.emotionalGoal}</p>
        <p>{profile?.profile.understandingGoal}</p>
        <small>{capability(profile?.profile)}</small>
      </div>
      <div className="content-preview-summary" aria-label="当前预览范围">
        <span><strong>{config.success ? config.data.questions.length : 0}</strong> 道题目</span>
        <span><strong>{config.success ? config.data.report.templates.length : 0}</strong> 份兼容报告模板</span>
        <span><strong>{applicable.length}</strong> 份宣传稿件</span>
      </div>
      <h4>题目与作答过程</h4>
      {config.success ? (
        <>
          <p>单人逐题作答 → 按维度计算 → 生成兼容报告</p>
          <div className="content-preview-questions">
          {config.data.questions.map((question, index) => (
            <article className="content-block" key={question.id}>
              <h4>
                {index + 1}. {question.text}
              </h4>
              <ul>
                {question.options.map((option) => (
                  <li key={option.id}>{option.label}</li>
                ))}
              </ul>
            </article>
          ))}
          </div>
          <h4>兼容报告试读</h4>
          <p>{config.data.report.disclaimer}</p>
          <div className="content-preview-reports">
          {config.data.report.templates.map((template) => (
            <article className="content-block" key={template.resultTypeId}>
              <h4>
                {
                  config.data.resultTypes.find(
                    (value) => value.id === template.resultTypeId,
                  )?.label
                }
              </h4>
              <p>{template.explanation}</p>
              <p>{template.suggestion}</p>
            </article>
          ))}
          </div>
        </>
      ) : (
        <p>尚未保存可运行题库。</p>
      )}
      {profile && (
        <details>
          <summary>报告叙事方案 · 创作草稿</summary>
          <h4>{profile.profile.reportPlan.title}</h4>
          <p>{profile.profile.reportPlan.narrative}</p>
          {profile.profile.reportPlan.sections.map((section) => (
            <p key={section.sectionId}>
              <strong>{section.title}</strong> · {section.purpose}
            </p>
          ))}
          <p className="content-note">此方案尚未接入报告运行端。</p>
        </details>
      )}
      <h4>封面、视频与文案</h4>
      <button
        disabled={action.busy}
        onClick={() =>
          void action.run(
            async () => {
              const details: RevisionDetail[] = [];
              for (const row of applicable)
                details.push(await contentApi.revision(row.id));
              return details;
            },
            (value) => {
              setAssets(value);
              setLoaded(true);
            },
          )
        }
      >
        加载已保存宣传预览
      </button>
      {!loaded && (
        <p className="content-note">
          点击后读取文件与固定输入；仅展示已保存内容。
        </p>
      )}
      {loaded && assets.length === 0 && <p>当前设定没有已保存的宣传稿件。</p>}
      {assets.map((asset) => {
        const authoring = authoringOf(asset),
          content = authoring?.content,
          production = asset.production,
          skillVersions = production?.skillVersions?.filter(
            (binding) => binding.domain === asset.domain,
          ) ?? [];
        return (
          <article className="content-block" key={asset.id}>
            <h4>
              {domains[asset.domain]} · {stringField(asset.snapshot.variant)} ·{" "}
              {
                platforms[
                  stringField(asset.snapshot.platform) as keyof typeof platforms
                ]
              }
            </h4>
            {content?.kind === "copy" ? (
              content.blocks.map((block) => (
                <p className="content-prose" key={block.blockId}>
                  <small>{block.role}</small>
                  <br />
                  {block.text}
                </p>
              ))
            ) : content?.kind === "video" || content?.kind === "script" ? (
              content.scenes.map((scene) => (
                <p className="content-prose" key={scene.sceneId}>
                  <small>
                    {scene.startMs / 1000}–{scene.endMs / 1000} 秒
                  </small>
                  <br />
                  {scene.text}
                </p>
              ))
            ) : content?.kind === "cover" ? (
              <>
                <h4>{content.title}</h4>
                <p>{content.description}</p>
              </>
            ) : (
              <p>{stringField(asset.snapshot.text)}</p>
            )}
            <div className="content-media-grid">
              <MediaPreview file={asset.previewFile} label="预览" />
              <MediaPreview file={asset.deliveryFile} label="正式" />
            </div>
            <small>
              本地原件：
              {asset.storage.localArchiveRegistered
                ? "已登记，文件留在本地"
                : "未登记"}{" "}
              · 固定输入 {asset.inputs.length} 项
            </small>
            <div className="content-note content-production-summary" aria-label="固定制作依据">
              {production?.skillSetId ? (
                <>
                  <p>固定 skill 组合：<code>{production.skillSetId}</code></p>
                  {skillVersions.length > 0 && (
                    <ul>
                      {skillVersions.map((binding) => (
                        <li key={binding.purpose}>
                          {purposeLabels[binding.purpose]}：{binding.version.manifest.name}
                          {" · "}v{binding.version.number}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : production?.skillVersionId ? (
                <p>固定 skill 版本：<code>{production.skillVersionId}</code></p>
              ) : (
                <p>Skill 未关联</p>
              )}
              <ProductionOrigin source={production} />
            </div>
          </article>
        );
      })}
      <h4>公开样例与分享卡文字预览</h4>
      <article className="content-share-card">
        <small>
          {product.name} ·{" "}
          {product.publicSample.isDemo ? "演示样例" : "公开样例"}
        </small>
        <h3>{product.publicSample.label}</h3>
        <p>{product.publicSample.summary}</p>
        {product.publicSample.dimensions.map((value, index) => (
          <p key={index}>
            {value.label}：{value.score ?? "暂无分值"}
          </p>
        ))}
        <p>{product.publicSample.suggestion}</p>
      </article>
      <p className="content-note">
        这是公开样例试读。个人作答后的分享卡继续使用既有摘要卡功能。
      </p>
      {Boolean(action.error) && <Failure error={action.error} />}
    </section>
  );
}
export function PublicSampleEditor({
  product,
  onSaved,
  onDirty,
}: {
  product: AdminProduct;
  onSaved: () => void;
  onDirty: (value: boolean) => void;
}) {
  const [sample, setSample] = useState(product.publicSample),
    [notice, setNotice] = useState(""),
    action = useAction();
  const dirty = JSON.stringify(sample) !== JSON.stringify(product.publicSample);
  // Report draft changes to the workbench before navigation is allowed.
  function update(value: typeof sample) {
    setSample(value);
    onDirty(JSON.stringify(value) !== JSON.stringify(product.publicSample));
  }
  return (
    <section className="content-editor content-form-section content-public-sample">
      <h3>公开报告样例</h3>
      <p>与私人报告模板分开保存；此样例用于商品页和分享卡试读。</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(
            () =>
              adminApi.patchProduct(
                product.id,
                action.intent("sample:" + product.id, {
                  publicSample: parseEditor(
                    PublicReportSampleSchema,
                    JSON.stringify(sample),
                  ),
                  expectedRevision: product.revision,
                }),
              ),
            () => {
              onDirty(false);
              onSaved();
              setNotice("公开样例已保存。");
            },
          );
        }}
      >
        <fieldset disabled={action.busy}>
          <label>
            样例标题
            <input
              required
              maxLength={80}
              value={sample.label}
              onChange={(event) =>
                update({ ...sample, label: event.target.value })
              }
            />
          </label>
          <label>
            样例说明
            <textarea
              required
              maxLength={300}
              value={sample.summary}
              onChange={(event) =>
                update({ ...sample, summary: event.target.value })
              }
            />
          </label>
          {sample.dimensions.map((value, index) => (
            <div className="content-fields" key={index}>
              <label>
                样例维度
                <input
                  required
                  maxLength={80}
                  value={value.label}
                  onChange={(event) =>
                    update({
                      ...sample,
                      dimensions: sample.dimensions.map((item, at) =>
                        at === index
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <label>
                样例分值（留空代表不足）
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value.score ?? ""}
                  onChange={(event) =>
                    update({
                      ...sample,
                      dimensions: sample.dimensions.map((item, at) =>
                        at === index
                          ? {
                              ...item,
                              score:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            }
                          : item,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <label>
            样例建议
            <textarea
              required
              maxLength={300}
              value={sample.suggestion}
              onChange={(event) =>
                update({ ...sample, suggestion: event.target.value })
              }
            />
          </label>
          <div className="biz-row content-action-bar">
            <button disabled={!dirty}>保存公开样例</button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => update(product.publicSample)}
            >
              放弃样例修改
            </button>
          </div>
        </fieldset>
      </form>
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
    </section>
  );
}
