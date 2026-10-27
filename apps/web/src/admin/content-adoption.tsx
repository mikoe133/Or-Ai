import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentPackageSelectionSchema } from "@orai/contracts/admin";
import { experienceTemplate } from '@orai/contracts/experience';
import { Failure, Loading, Pager, useAction } from "../business/shared.js";
import { adminApi, parseEditor } from "./api.js";
import {
  contentApi,
  allPages,
  type Profile,
  type Revision,
} from "./content-api.js";
import { workflowApi, type Package } from "./workflow-api.js";
import { domains, stringField } from "./content-model.js";
import { SkillSetSource } from './content-skills.js';
import { ProductionOrigin } from "./content-parts.js";
export function savePackageFile(value: Package) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2) + "\n"], {
        type: "application/json",
      }),
    ),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `meetmyworld-content-package-${value.number}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function AdoptionPanel({
  productId,
  versionId,
  profile,
  assessment,
  active,
  onInspect,
  onChanged,
  blockedByDraft,
  onVersionReviewed,
}: {
  productId: string;
  versionId: string;
  profile?: Profile;
  assessment?: Revision;
  active: boolean;
  blockedByDraft: boolean;
  onVersionReviewed: () => void;
  onInspect: (id: string) => void;
  onChanged: () => void;
}) {
  const action = useAction(),
    client = useQueryClient(),
    [label, setLabel] = useState(""),
    [note, setNote] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [choices, setChoices] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Awaited<
      ReturnType<typeof workflowApi.preview>
    > | null>(null),
    [checkedSelection, setCheckedSelection] = useState(""),
    [saved, setSaved] = useState<Package | null>(null),
    [page, setPage] = useState(1),
    [notice, setNotice] = useState("");
  const [skillSetId, setSkillSetId] = useState('');
  const history = useQuery({
      queryKey: [
        "private",
        "admin",
        "content-adoption-options",
        productId,
        versionId,
      ],
      queryFn: ({ signal }) =>
        allPages((page) =>
          contentApi.revisions(
            new URLSearchParams({
              productId,
              productVersionId: versionId,
              pageSize: "50",
              page: String(page),
            }).toString(),
            signal,
          ),
        ),
      enabled: active && !!versionId,
      refetchOnWindowFocus: false,
    }),
    packages = useQuery({
      queryKey: ["private", "admin", "content-packages", productId, page],
      queryFn: ({ signal }) => workflowApi.packages(productId, page, signal),
      enabled: active,
      refetchOnWindowFocus: false,
    });
  const options = (history.data ?? []).filter(
      (row) =>
        row.assetId &&
        row.creativeProfileRevisionId === profile?.id &&
        row.snapshot.status === "ready",
    ),
    groups = new Map<string, Revision[]>();
  for (const row of options) {
    const previous = groups.get(row.assetId!) ?? [];
    previous.push(row);
    groups.set(row.assetId!, previous);
  }
  const selection = {
    productId,
    creativeProfileRevisionId: profile?.id ?? "",
    assessmentRevisionId: assessment?.id ?? "",
    assetRevisionIds: Object.values(choices).filter(Boolean).sort(),
    reportMode: "compatible_standard",
    label,
    ...(skillSetId ? { skillSetId } : {}),
  };
  const serialized = JSON.stringify(selection),
    validPreview = !!preview && checkedSelection === serialized;
  function changed() {
    onChanged();
    void client.invalidateQueries({
      queryKey: ["private", "admin", "content-packages", productId],
    });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "content-adoption-options", productId],
    });
  }
  return (
    <section className="content-editor content-adoption-editor" aria-label="成套采用工作台">
      <h3>固定采用组合</h3>
      <p>
        选择已审核题库和就绪宣传稿，核对整套语气、意象、情绪目标与传播承诺后，保存一份不可变的采用包。采用不会自动发布商品。
      </p>
      <ol className="content-process-steps" aria-label="采用流程">
        <li><span>01</span> 选择固定内容</li>
        <li><span>02</span> 校验一致性</li>
        <li><span>03</span> 保存采用包</li>
      </ol>
      {profile && <div className="content-form-section"><SkillSetSource profileId={profile.id} value={skillSetId} onChange={setSkillSetId} label="采用 skill 组合" /></div>}
      {blockedByDraft && (
        <p className="content-note">
          工作台有未保存修改，请先保存或放弃，再核对采用组合。
        </p>
      )}
      <fieldset className="content-adoption-selection" disabled={blockedByDraft || action.busy}>
        {!profile || !assessment ? (
          <p>请先选择创作设定和题库版本。</p>
        ) : (
          <>
            <p>
              创作设定 r{profile.revision} · 题库 v
              {String(assessment.snapshot.versionNumber)} / r
              {assessment.sourceRevision}。采用时一同固定已审核的 Three.js 体验与报告呈现。
            </p>
            {assessment.snapshot.status === "draft" && (
              <button
                disabled={action.busy}
                onClick={() =>
                  void action.run(
                    () =>
                      adminApi.versionAction(
                        productId,
                        versionId,
                        "review",
                        action.intent("review-version:" + versionId, {
                          expectedRevision: assessment.sourceRevision,
                        }),
                      ),
                    () => {
                      onVersionReviewed();
                      changed();
                      setPreview(null);
                      setNotice("题库已审核，请重新读取采用预览。");
                    },
                  )
                }
              >
                审核所选题库
              </button>
            )}
            <label>
              采用包名称
              <input
                aria-label="采用包名称"
                maxLength={160}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <h4>选择宣传修订</h4>
            {history.isPending ? (
              <Loading />
            ) : history.isError ? (
              <Failure error={history.error} />
            ) : groups.size === 0 ? (
              <p>
                还没有同一设定下的就绪宣传稿，请先在各内容页签审核并标记就绪。
              </p>
            ) : (
              <div className="content-package-options">
                {[...groups].map(([assetId, rows]) => {
                  const selected = choices[assetId] || "";
                  return (
                    <div className="content-fields" key={assetId}>
                      <label className="content-inline">
                        <input
                          type="checkbox"
                          aria-label={
                            "采用 " + stringField(rows[0]!.snapshot.variant)
                          }
                          checked={!!selected}
                          onChange={(event) =>
                            setChoices((current) => ({
                              ...current,
                              [assetId]: event.target.checked
                                ? rows[0]!.id
                                : "",
                            }))
                          }
                        />
                        {domains[rows[0]!.domain]} ·{" "}
                        {stringField(rows[0]!.snapshot.variant)}
                      </label>
                      <label>
                        固定修订
                        <select
                          aria-label={
                            "采用修订 " + stringField(rows[0]!.snapshot.variant)
                          }
                          disabled={!selected}
                          value={selected || rows[0]!.id}
                          onChange={(event) =>
                            setChoices((current) => ({
                              ...current,
                              [assetId]: event.target.value,
                            }))
                          }
                        >
                          {rows.map((row) => (
                            <option key={row.id} value={row.id}>
                              r{row.sourceRevision} ·{" "}
                              {new Date(row.createdAt).toLocaleString("zh-CN")}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              disabled={action.busy || !label.trim()}
              onClick={() =>
                void action.run(
                  () =>
                    workflowApi.preview(
                      parseEditor(ContentPackageSelectionSchema, serialized),
                    ),
                  (value) => {
                    setPreview(value);
                    setCheckedSelection(serialized);
                    setConfirmed(false);
                    setNotice("采用组合校验完成，请核对清单与待复查项。");
                  },
                )
              }
            >
              校验采用组合
            </button>
            {validPreview && (
              <div className="content-block" aria-label="采用校验结果">
                <h4>
                  {preview!.canAdopt ? "采用校验通过" : "采用条件尚未满足"}
                </h4>
                <ul>
                  {preview!.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                {preview!.impacts
                  .filter((value) => value.needsReview || value.blocked)
                  .map((impact) => (
                    <p key={impact.revisionId}>
                      <span>
                        {impact.blocked ? "存在失效输入" : "有更新待复查"}
                      </span>{" "}
                      <button onClick={() => onInspect(impact.revisionId)}>
                        查看影响并复查
                      </button>
                    </p>
                  ))}
                <p>预览后的内容再次变化，保存会拒绝旧预览并要求重新校验。</p>
                <label>
                  采用说明
                  <textarea
                    aria-label="采用说明"
                    maxLength={2000}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <label className="content-inline">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  我已核对语气、意象、情绪目标与传播承诺一致
                </label>
                <button
                  disabled={
                    action.busy ||
                    !preview!.canAdopt ||
                    !confirmed ||
                    !note.trim()
                  }
                  onClick={() =>
                    void action.run(
                      () =>
                        workflowApi.adopt(
                          action.intent("adopt:" + productId, {
                            selection: parseEditor(
                              ContentPackageSelectionSchema,
                              serialized,
                            ),
                            expectedFingerprint: preview!.fingerprint,
                            expectedPackageNumber: preview!.latestPackageNumber,
                            note,
                            consistencyConfirmed: true,
                          }),
                        ),
                      (value) => {
                        setSaved(value);
                        setPreview(null);
                        setConfirmed(false);
                        setNotice(
                          "固定采用包已保存，旧包与消费者报告保持原样。",
                        );
                        changed();
                      },
                    )
                  }
                >
                  保存固定采用包
                </button>
              </div>
            )}
          </>
        )}
      </fieldset>
      <h3>已采用的固定包</h3>
      {packages.isPending ? (
        <Loading />
      ) : packages.isError ? (
        <Failure error={packages.error} />
      ) : (
        <>
          <div className="content-product-list">
            {packages.data.items.map((value) => (
              <article className="content-product-row" key={value.id}>
                <div>
                  <strong>
                    第 {value.number} 包 · {value.label}
                  </strong>
                  <small>
                    {new Date(value.createdAt).toLocaleString("zh-CN")} ·{" "}
                    {value.manifest.assets.length} 份宣传修订
                  </small>
                </div>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => workflowApi.package(value.id),
                      setSaved,
                    )
                  }
                >
                  查看固定包
                </button>
              </article>
            ))}
          </div>
          {packages.data.total === 0 && <p>尚未保存采用包。</p>}
          <Pager {...packages.data} onChange={setPage} />
        </>
      )}
      {saved && (
        <div className="content-block" aria-label="已保存采用包">
          <h4>
            第 {saved.number} 包 · {saved.label}
          </h4>
          <p>
            设定 r{saved.manifest.creativeProfile.revision} · 题库修订{" "}
            {saved.manifest.assessment.sourceRevision}
          </p>
          {saved.manifest.schemaVersion === 3 && <div className="content-note" aria-label="固定 Three.js 交付">
            <p>商品规划 r{saved.manifest.productPlan.revision} · 已审核体验 r{saved.manifest.experience.revision}</p>
            <p>体验：{experienceTemplate({renderer:saved.manifest.runtime.renderer,report:{renderer:saved.manifest.runtime.reportRenderer}})?.label ?? saved.manifest.runtime.renderer.key}
              {' · '}报告：{experienceTemplate({renderer:saved.manifest.runtime.renderer,report:{renderer:saved.manifest.runtime.reportRenderer}})?.reportLabel ?? saved.manifest.runtime.reportRenderer.key}</p>
            <p>注册组合已校验；此采用包未记录设备验收。</p>
          </div>}
          <p>{saved.manifest.schemaVersion !== 1 && saved.manifest.skillSet
            ? `固定 skill 组合 r${saved.manifest.skillSet.revision} · 五个专业用途`
            : saved.manifest.schemaVersion === 3 ? '人工制作：未使用 Skill 组合' : '历史包：未关联 skill 组合'}</p>
          <p>{saved.note}</p>
          <ProductionOrigin source={saved.manifest.assessmentProduction} />
          <ul>
            {saved.manifest.assets.map((value) => (
              <li key={value.revision.id}>
                {domains[value.revision.domain]} ·{" "}
                {stringField(value.revision.snapshot.variant)} · 固定输入{" "}
                {value.inputs.length} 项 · 文件 {value.files.length} 份
                <ProductionOrigin source={value.production} />
              </li>
            ))}
          </ul>
          <button onClick={() => savePackageFile(saved)}>
            导出采用清单 JSON
          </button>
          <p className="content-note">
            {saved.manifest.schemaVersion === 3 ? '包含固定商品规划、已审核体验、方法来源、创作设定与宣传内容。' : '包含创作设定、题库/模板、宣传内容、原文/改写快照和受保护文件引用。'}实际媒体可在各稿件中授权下载；导出不含消费者作答、报告、账户凭据或本地路径。
          </p>
          <details>
            <summary>查看固定清单</summary>
            <pre>{JSON.stringify(saved.manifest, null, 2)}</pre>
          </details>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && (
        <Failure
          error={action.error}
          retry={() => {
            changed();
            setPreview(null);
          }}
        />
      )}
    </section>
  );
}
