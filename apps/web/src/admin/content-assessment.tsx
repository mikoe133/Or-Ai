import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductConfigurationSchema } from "@orai/contracts/admin";
import { Failure, Loading, useAction } from "../business/shared.js";
import { adminApi, parseEditor, type AdminProduct } from "./api.js";
import { contentApi, type Profile, type Revision } from "./content-api.js";
import { defaultConfiguration, statuses } from "./content-model.js";
type Preview = Awaited<ReturnType<typeof adminApi.preview>>;
export function AssessmentDesk({
  product,
  versionId,
  profile,
  assessment,
  onVersionSaved,
  onDirty,
}: {
  product: AdminProduct;
  versionId: string;
  profile?: Profile;
  assessment?: Revision;
  onVersionSaved: (versionId: string) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const read = useQuery({
    queryKey: ["private", "admin", "content-config", product.id, versionId],
    queryFn: () => adminApi.preview(product.id, versionId),
    enabled: !!versionId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const source = useQuery({
    queryKey: ["private", "admin", "content-source", assessment?.id],
    queryFn: ({ signal }) => contentApi.revision(assessment!.id, signal),
    enabled: !!assessment,
    refetchOnWindowFocus: false,
  });
  if (versionId && read.isPending) return <Loading />;
  if (read.isError)
    return <Failure error={read.error} retry={() => void read.refetch()} />;
  return (
    <AssessmentEditor
      key={
        (read.data?.version.id ?? "new") +
        ":" +
        (read.data?.version.revision ?? 0)
      }
      product={product}
      preview={read.data}
      profile={profile}
      onVersionSaved={onVersionSaved}
      onDirty={onDirty}
      assessment={assessment}
      source={source.data?.production}
      sourceError={source.error}
    />
  );
}
function AssessmentEditor({
  product,
  preview,
  profile,
  assessment,
  source,
  sourceError,
  onVersionSaved,
  onDirty,
}: {
  product: AdminProduct;
  preview?: Preview;
  profile?: Profile;
  assessment?: Revision;
  source?: Awaited<ReturnType<typeof contentApi.revision>>["production"];
  sourceError: unknown;
  onVersionSaved: (versionId: string) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const initial = preview?.configuration ?? defaultConfiguration(),
    [draft, setDraft] = useState(initial),
    [raw, setRaw] = useState(JSON.stringify(initial, null, 2)),
    [notice, setNotice] = useState(""),
    action = useAction(),
    [productionSource, setProductionSource] = useState<
      "manual" | "external_ai" | "mcp"
    >("manual"),
    [batch, setBatch] = useState("");
  const dirty =
    JSON.stringify(initial) !== JSON.stringify(draft) ||
    raw !== JSON.stringify(draft, null, 2);
  const sourceDirty =
    !source && (productionSource !== "manual" || batch !== "");
  useEffect(() => {
    onDirty(dirty || sourceDirty);
    return () => onDirty(false);
  }, [dirty, sourceDirty, onDirty]);
  function update(value: typeof draft) {
    setDraft(value);
    setRaw(JSON.stringify(value, null, 2));
    setNotice("");
  }
  async function save(derive: boolean) {
    const configuration = parseEditor(
      ProductConfigurationSchema,
      JSON.stringify(draft),
    );
    if (raw !== JSON.stringify(draft, null, 2))
      throw new Error("请先校验并应用 JSON 修改。");
    return derive || !preview
      ? adminApi.importVersion(
          product.id,
          action.intent("derive:" + product.id, { configuration }),
        )
      : adminApi.replaceVersion(
          product.id,
          preview.version.id,
          action.intent("replace:" + preview.version.id, {
            configuration,
            expectedRevision: preview.version.revision,
          }),
        );
  }
  return (
    <section className="content-editor" aria-label="题库报告编辑器">
      <div className="content-section-heading">
        <div>
          <h3>题库与兼容报告</h3>
          <p>
            编辑题目、选项分值、解释与建议。规则和完整配置可通过 JSON 导入。
          </p>
        </div>
        <span className="content-badge">
          {preview
            ? `v${preview.version.number} · ${statuses[preview.version.status]}`
            : "新版本"}
        </span>
      </div>
      <p className="content-note">
        当前引擎 dimensions_v1，单人作答。已发布版本通过“派生新版本”继续编辑。
      </p>
      <fieldset disabled={action.busy}>
        {draft.questions.map((question, index) => (
          <details className="content-block" key={index} open={index === 0}>
            <summary>
              第 {index + 1} 题 · {question.text}
            </summary>
            <div className="content-fields">
              <label>
                题目 ID
                <input
                  aria-label={`题目 ${index + 1} ID`}
                  value={question.id}
                  onChange={(event) =>
                    update({
                      ...draft,
                      questions: draft.questions.map((value, at) =>
                        at === index
                          ? { ...value, id: event.target.value }
                          : value,
                      ),
                    })
                  }
                />
              </label>
              <label>
                维度
                <select
                  value={question.dimensionId}
                  onChange={(event) =>
                    update({
                      ...draft,
                      questions: draft.questions.map((value, at) =>
                        at === index
                          ? { ...value, dimensionId: event.target.value }
                          : value,
                      ),
                    })
                  }
                >
                  {draft.dimensions.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                题目权重
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={question.weight}
                  onChange={(event) =>
                    update({
                      ...draft,
                      questions: draft.questions.map((value, at) =>
                        at === index
                          ? { ...value, weight: Number(event.target.value) }
                          : value,
                      ),
                    })
                  }
                />
              </label>
            </div>
            <label>
              题干
              <textarea
                aria-label={`题目 ${index + 1} 题干`}
                maxLength={300}
                value={question.text}
                onChange={(event) =>
                  update({
                    ...draft,
                    questions: draft.questions.map((value, at) =>
                      at === index
                        ? { ...value, text: event.target.value }
                        : value,
                    ),
                  })
                }
              />
            </label>
            {question.options.map((option, optionIndex) => (
              <div className="content-fields" key={optionIndex}>
                <label>
                  选项 ID
                  <input
                    aria-label={`题目 ${index + 1} 选项 ${optionIndex + 1} ID`}
                    value={option.id}
                    onChange={(event) =>
                      update({
                        ...draft,
                        questions: draft.questions.map((value, at) =>
                          at === index
                            ? {
                                ...value,
                                options: value.options.map((item, oi) =>
                                  oi === optionIndex
                                    ? { ...item, id: event.target.value }
                                    : item,
                                ),
                              }
                            : value,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  选项文字
                  <input
                    aria-label={`题目 ${index + 1} 选项 ${optionIndex + 1} 文字`}
                    maxLength={160}
                    value={option.label}
                    onChange={(event) =>
                      update({
                        ...draft,
                        questions: draft.questions.map((value, at) =>
                          at === index
                            ? {
                                ...value,
                                options: value.options.map((item, oi) =>
                                  oi === optionIndex
                                    ? { ...item, label: event.target.value }
                                    : item,
                                ),
                              }
                            : value,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  分值
                  <input
                    type="number"
                    min={0}
                    max={10}
                    disabled={option.notApplicable}
                    value={option.points ?? ""}
                    onChange={(event) =>
                      update({
                        ...draft,
                        questions: draft.questions.map((value, at) =>
                          at === index
                            ? {
                                ...value,
                                options: value.options.map((item, oi) =>
                                  oi === optionIndex
                                    ? {
                                        ...item,
                                        points: Number(event.target.value),
                                      }
                                    : item,
                                ),
                              }
                            : value,
                        ),
                      })
                    }
                  />
                </label>
                <label className="content-inline">
                  <input
                    type="checkbox"
                    checked={option.notApplicable}
                    onChange={(event) =>
                      update({
                        ...draft,
                        questions: draft.questions.map((value, at) =>
                          at === index
                            ? {
                                ...value,
                                options: value.options.map((item, oi) =>
                                  oi === optionIndex
                                    ? {
                                        ...item,
                                        notApplicable: event.target.checked,
                                        points: event.target.checked ? null : 0,
                                      }
                                    : item,
                                ),
                              }
                            : value,
                        ),
                      })
                    }
                  />
                  不适用
                </label>
              </div>
            ))}
            <button
              disabled={draft.questions.length === 1}
              onClick={() =>
                update({
                  ...draft,
                  questions: draft.questions.filter((_, at) => at !== index),
                })
              }
            >
              移除此题
            </button>
          </details>
        ))}
        <button
          disabled={draft.questions.length >= 100}
          onClick={() =>
            update({
              ...draft,
              questions: [
                ...draft.questions,
                {
                  ...draft.questions[0]!,
                  id: "q-" + crypto.randomUUID().slice(0, 8),
                  text: "",
                },
              ],
            })
          }
        >
          添加题目
        </button>
        <h3>报告解释与建议</h3>
        <label>
          报告提示
          <textarea
            aria-label="报告提示"
            maxLength={300}
            value={draft.report.disclaimer}
            onChange={(event) =>
              update({
                ...draft,
                report: { ...draft.report, disclaimer: event.target.value },
              })
            }
          />
        </label>
        {draft.report.templates.map((template, index) => (
          <div className="content-block" key={index}>
            <h4>
              {draft.resultTypes.find(
                (value) => value.id === template.resultTypeId,
              )?.label ?? template.resultTypeId}
            </h4>
            <label>
              结果解释
              <textarea
                aria-label={`报告 ${index + 1} 解释`}
                maxLength={2000}
                value={template.explanation}
                onChange={(event) =>
                  update({
                    ...draft,
                    report: {
                      ...draft.report,
                      templates: draft.report.templates.map((value, at) =>
                        at === index
                          ? { ...value, explanation: event.target.value }
                          : value,
                      ),
                    },
                  })
                }
              />
            </label>
            <label>
              行动建议
              <textarea
                aria-label={`报告 ${index + 1} 建议`}
                maxLength={1000}
                value={template.suggestion}
                onChange={(event) =>
                  update({
                    ...draft,
                    report: {
                      ...draft.report,
                      templates: draft.report.templates.map((value, at) =>
                        at === index
                          ? { ...value, suggestion: event.target.value }
                          : value,
                      ),
                    },
                  })
                }
              />
            </label>
          </div>
        ))}
        <details>
          <summary>规则、信息不足模板与完整 JSON</summary>
          <p>
            包含维度、阈值、结果类型、保留期和统计门槛，严格校验后才能保存。
          </p>
          <label>
            导入题库 JSON
            <input
              aria-label="导入题库 JSON"
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void action.run(async () => {
                  if (file.size > 512 * 1024)
                    throw new Error("配置不得超过 512 KiB");
                  return file.text();
                }, setRaw);
              }}
            />
          </label>
          <label>
            完整题库 JSON
            <textarea
              aria-label="完整题库 JSON"
              rows={12}
              maxLength={524288}
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
            />
          </label>
          <button
            onClick={() =>
              void action.run(
                async () => parseEditor(ProductConfigurationSchema, raw),
                (value) => {
                  update(value);
                  setNotice("题库结构与规则校验通过。");
                },
              )
            }
          >
            校验并应用 JSON
          </button>
        </details>
        <div className="biz-row">
          <button
            disabled={
              !preview ||
              !["draft", "reviewed"].includes(preview.version.status) ||
              !dirty
            }
            onClick={() =>
              void action.run(
                () => save(false),
                (value) => {
                  onVersionSaved(value.id);
                  setNotice("题库与报告草稿已保存。");
                },
              )
            }
          >
            保存题库草稿
          </button>
          <button
            onClick={() =>
              void action.run(
                () => save(true),
                (value) => {
                  onVersionSaved(value.id);
                  setNotice("已派生新的题库草稿版本。");
                },
              )
            }
          >
            派生新版本
          </button>
          <button disabled={!dirty} onClick={() => update(initial)}>
            放弃题库修改
          </button>
        </div>
      </fieldset>
      {dirty && (
        <p className="content-note">
          题库有未保存修改。公开预览展示服务器上已保存的版本。
        </p>
      )}
      <h3>本修订制作来源</h3>
      {sourceError ? (
        <Failure error={sourceError} />
      ) : source ? (
        <div className="content-block">
          <p>
            {source.source} · 批次 {source.batchKey ?? "未填写"} · Skill 未关联
          </p>
          <details>
            <summary>固定记录</summary>
            <pre>{JSON.stringify(source, null, 2)}</pre>
          </details>
        </div>
      ) : (
        <fieldset disabled={action.busy || dirty}>
          <div className="content-fields">
            <label>
              题库制作来源
              <select
                value={productionSource}
                onChange={(event) =>
                  setProductionSource(
                    event.target.value as typeof productionSource,
                  )
                }
              >
                <option value="manual">人工</option>
                <option value="external_ai">外部 AI</option>
                <option value="mcp">MCP 来源申报</option>
              </select>
            </label>
            <label>
              题库制作批次
              <input
                maxLength={64}
                value={batch}
                onChange={(event) => setBatch(event.target.value)}
              />
            </label>
          </div>
          <button
            disabled={action.busy || dirty || !assessment || !profile}
            onClick={() =>
              void action.run(
                () =>
                  contentApi.production(
                    action.intent("source:" + assessment!.id, {
                      outputRevisionId: assessment!.id,
                      creativeProfileRevisionId: profile!.id,
                      production: {
                        source: productionSource,
                        batchKey: batch || null,
                        externalLabel: null,
                        skillVersionId: null,
                      },
                    }),
                  ),
                () => {
                  onVersionSaved(preview!.version.id);
                  setNotice("本修订的制作来源已登记。");
                },
              )
            }
          >
            登记本修订制作来源
          </button>
          <p className="content-note">
            每个修订只登记一次；更正来源需编辑为新修订。Skill 当前为空。
          </p>
        </fieldset>
      )}
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
    </section>
  );
}
