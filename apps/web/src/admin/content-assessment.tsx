import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductConfigurationSchema } from "@orai/contracts/admin";
import { Loading, useAction } from "../business/shared.js";
import { ClientError } from "../api/client.js";
import { AdminFailure as Failure } from "./feedback.js";
import { isAccessFailure, RefreshNotice } from "./refresh-notice.js";
import { adminApi, parseEditor, type AdminProduct } from "./api.js";
import { contentApi, type Profile, type Revision } from "./content-api.js";
import { defaultConfiguration, statuses } from "./content-model.js";
import { SkillSetSource, SavedSkillSource } from './content-skills.js';
import { ProductionOrigin } from "./content-parts.js";
type Preview = Awaited<ReturnType<typeof adminApi.preview>>;
type AssessmentRequest = { kind: 'replace' | 'derive' | 'source'; productId: string; versionId: string | null; body: object };
const uncertainResponse = (error: unknown) => error instanceof ClientError &&
  (error.status === 0 || error.status >= 500 || error.status === 408 || error.code === 'INVALID_RESPONSE');
export function AssessmentDesk({
  product,
  versionId,
  profile,
  assessment,
  onVersionSaved,
  onDirty,
  onPending,
  view = 'content',
  readOnly = false,
}: {
  product: AdminProduct;
  versionId: string;
  profile?: Profile;
  assessment?: Revision;
  onVersionSaved: (versionId: string) => void;
  onDirty: (dirty: boolean) => void;
  onPending?: (pending: boolean) => void;
  view?: 'content' | 'result';
  readOnly?: boolean;
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
  const [session, setSession] = useState<Preview | undefined>(undefined);
  const [dirty, setDirty] = useState(false), [unknown, setUnknown] = useState(false);
  const [accessError, setAccessError] = useState<unknown>(null), [retrying, setRetrying] = useState(false);
  const [recoveryEpoch, setRecoveryEpoch] = useState(0);
  const reads = [...(versionId ? [read] : []), ...(assessment ? [source] : [])];
  const denial = [read.error, source.error].find(isAccessFailure) ?? accessError;
  const preview = session?.version.id === versionId ? session : read.data;
  const checking = retrying || reads.some(query => query.isFetching);
  const unavailable = checking || reads.some(query => query.isError);
  const handleDirty = useCallback((value: boolean, pending = false) => { setDirty(value); setUnknown(pending); }, []);
  const accessFailed = useCallback((error: unknown) => setAccessError(error), []);
  useEffect(() => { if (denial) setAccessError(denial); }, [denial]);
  useEffect(() => {
    if (read.data && (session?.version.id !== versionId || !dirty && !unknown)) setSession(read.data);
  }, [read.data, versionId, dirty, unknown]);
  useEffect(() => { onDirty(unknown || !denial && dirty); return () => onDirty(false); }, [dirty, unknown, denial, onDirty]);
  useEffect(() => { onPending?.(unknown); return () => onPending?.(false); }, [unknown, onPending]);
  async function retryReads() {
    if (retrying) return;
    setRetrying(true);
    try {
      await Promise.all(reads.map(query => query.refetch({ throwOnError: true })));
      setAccessError(null); setRecoveryEpoch(value => value + 1);
      requestAnimationFrame(() => document.getElementById('assessment-refresh')?.focus({ preventScroll: true }));
    } catch { /* A partial retry must not reveal the retained editor. */ }
    finally { setRetrying(false); }
  }
  const remoteChanged = !!preview && !!read.data && preview.version.revision !== read.data.version.revision;
  return (
    <>
    {denial ? <Failure error={denial} retry={retrying ? undefined : () => void retryReads()} /> : <>
      <div className="assessment-read-controls"><button id="assessment-refresh" disabled={checking} onClick={() => void retryReads()}>核对配置与来源</button></div>
      {reads.some(query => query.isError && query.data) && <RefreshNotice busy={checking} retry={() => void retryReads()} />}
      {versionId && !preview && (read.isError ? <Failure error={read.error} retry={() => void retryReads()} /> : <Loading />)}
      {remoteChanged && <p role="status" className="content-note">服务器已有新修订，当前草稿和基础版本已保留。放弃本地修改后读取新基础，或核对冲突后继续。</p>}
    </>}
    {(!versionId || preview) &&
    <AssessmentEditor
      key={
        (preview?.version.id ?? "new") +
        ":" +
        (preview?.version.revision ?? 0)
      }
      product={product}
      preview={preview}
      profile={profile}
      onVersionSaved={id => { setDirty(false); setUnknown(false); onVersionSaved(id); }}
      onDirty={handleDirty}
      assessment={assessment}
      source={source.data?.production}
      sourceError={source.error}
      sourceKnown={!assessment || !!source.data}
      view={view}
      readOnly={readOnly}
      blocked={!!denial}
      unavailable={unavailable}
      recoveryEpoch={recoveryEpoch}
      onAccessFailure={accessFailed}
      onRefresh={() => void retryReads()}
    />
    }
    </>
  );
}
function AssessmentEditor({
  product,
  preview,
  profile,
  assessment,
  source,
  sourceError,
  sourceKnown,
  onVersionSaved,
  onDirty,
  view,
  readOnly,
  blocked,
  unavailable,
  recoveryEpoch,
  onAccessFailure,
  onRefresh,
}: {
  product: AdminProduct;
  preview?: Preview;
  profile?: Profile;
  assessment?: Revision;
  source?: Awaited<ReturnType<typeof contentApi.revision>>["production"];
  sourceError: unknown;
  sourceKnown: boolean;
  onVersionSaved: (versionId: string) => void;
  onDirty: (dirty: boolean, pending?: boolean) => void;
  view: 'content' | 'result';
  readOnly: boolean;
  blocked: boolean;
  unavailable: boolean;
  recoveryEpoch: number;
  onAccessFailure: (error: unknown) => void;
  onRefresh: () => void;
}) {
  const initial = preview?.configuration ?? defaultConfiguration(),
    [draft, setDraft] = useState(initial),
    [raw, setRaw] = useState(JSON.stringify(initial, null, 2)),
    [notice, setNotice] = useState(""),
    action = useAction(),
    [productionSource, setProductionSource] = useState<
      "manual" | "external_ai" | "mcp"
    >("manual"),
    [batch, setBatch] = useState(""), [skillSetId, setSkillSetId] = useState('');
  const [pendingRequest, setPendingRequest] = useState<AssessmentRequest | null>(null);
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const dirty =
    JSON.stringify(initial) !== JSON.stringify(draft) ||
    raw !== JSON.stringify(draft, null, 2);
  const sourceDirty =
    !source && (productionSource !== "manual" || batch !== "" || skillSetId !== '');
  useEffect(() => {
    onDirty(dirty || sourceDirty, !!pendingRequest);
    return () => onDirty(false);
  }, [dirty, sourceDirty, pendingRequest, onDirty]);
  useEffect(() => { if (isAccessFailure(action.error)) onAccessFailure(action.error); }, [action.error, onAccessFailure]);
  useEffect(() => { if (isAccessFailure(action.error) || action.error instanceof ClientError && action.error.status === 409) action.resetError(); setNeedsRecheck(false); }, [recoveryEpoch]);
  function update(value: typeof draft) {
    setDraft(value);
    setRaw(JSON.stringify(value, null, 2));
    setNotice("");
    action.resetError();
  }
  async function dispatch(request: AssessmentRequest) {
    const wasUnknown = !!pendingRequest;
    try {
      const value = request.kind === 'source' ? await contentApi.production(request.body) : request.kind === 'derive' ?
        await adminApi.importVersion(request.productId, request.body) : await adminApi.replaceVersion(request.productId, request.versionId!, request.body);
      setPendingRequest(null); setNeedsRecheck(false);
      return value;
    } catch (error) {
      if (uncertainResponse(error) || wasUnknown && isAccessFailure(error)) setPendingRequest(request);
      else setPendingRequest(null);
      if (error instanceof ClientError && error.status === 409) setNeedsRecheck(true);
      throw error;
    }
  }
  async function save(derive: boolean) {
    const configuration = parseEditor(
      ProductConfigurationSchema,
      JSON.stringify(draft),
    );
    if (raw !== JSON.stringify(draft, null, 2))
      throw new Error("请先校验并应用 JSON 修改。");
    return derive || !preview
      ? dispatch({ kind: 'derive', productId: product.id, versionId: null,
          body: action.intent("derive:" + product.id, { configuration }) })
      : dispatch({ kind: 'replace', productId: product.id, versionId: preview.version.id,
          body: action.intent("replace:" + preview.version.id, {
            configuration,
            expectedRevision: preview.version.revision,
          }) });
  }
  const locked = action.busy || readOnly || unavailable || !!pendingRequest || needsRecheck;
  if (blocked || isAccessFailure(action.error)) return null;
  return (
    <section className="content-editor content-assessment-editor" aria-label="题库报告编辑器">
      <div className="content-section-heading">
        <div>
          <h3>{view === 'content' ? '商品内容 · 单选评估' : '结果内容 · 解释与建议'}</h3>
          <p>
            {view === 'content' ? '此内容协议使用题目、选项与维度规则。场景外观在体验设计中配置。' : '结构化结果来自本版本的评估规则，叙事方案与呈现模板在下方分别核对。'}
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
      {pendingRequest && <div className="assessment-unknown" role="status">
        <p>{pendingRequest.kind === 'source' ? '来源登记结果尚未确认' : '内容保存结果尚未确认'}，原请求及输入已保留。核对前不能修改、派生或提交另一份请求。</p>
        <button disabled={action.busy || unavailable} onClick={() => void action.run(() => dispatch(pendingRequest), value => {
          onVersionSaved(pendingRequest.kind === 'source' ? pendingRequest.versionId! : value.id);
          setNotice('原请求结果已确认，请核对当前固定修订。');
        })}>用原请求核对{pendingRequest.kind === 'source' ? '来源结果' : '保存结果'}</button>
      </div>}
      <fieldset disabled={locked}>
        <section className="content-form-section content-question-section" hidden={view !== 'content'}>
        <header className="content-form-section-heading"><h4>01 / 题目与选项</h4><p>{draft.questions.length} 道题目 · 展开题目编辑选项与分值</p></header>
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
        </section>
        <section className="content-form-section" hidden={view !== 'result'}>
        <header className="content-form-section-heading"><h4>01 / 结果解释与行动建议</h4><p>与商品内容共用同一份版本草稿；切换页签可继续编辑。</p></header>
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
        </section>
        <details className="content-form-section" hidden={view !== 'content'}>
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
        <div className="biz-row content-action-bar">
          <span>{dirty ? "题库有未保存修改" : "题库内容已与当前版本同步"}</span>
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
            保存内容与结果草稿
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
      <section className="content-form-section" hidden={view !== 'content'}>
      <header className="content-form-section-heading"><h4>本修订制作来源</h4></header>
      {!sourceKnown && !sourceError ? <Loading label="正在读取制作来源…" /> : sourceError && !source && !sourceKnown ? (
        <Failure error={sourceError} retry={onRefresh} />
      ) : source ? (
        <div className="content-block">
          <ProductionOrigin source={source} />
          <p>
            {source.source} · 批次 {source.batchKey ?? "未填写"} · {source.skillSetId ? '固定 skill 来源' : '未关联 skill'}
          </p>
          <details>
            <summary>固定记录</summary>
            <pre>{JSON.stringify(source, null, 2)}</pre>
          </details>
          <SavedSkillSource setId={source.skillSetId} />
        </div>
      ) : (
        <fieldset disabled={locked || dirty}>
          {profile && <SkillSetSource profileId={profile.id} value={skillSetId} onChange={setSkillSetId} label="题库与报告 skill 组合" />}
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
                  dispatch({ kind: 'source', productId: product.id, versionId: preview!.version.id,
                    body: action.intent("source:" + assessment!.id, {
                      outputRevisionId: assessment!.id,
                      creativeProfileRevisionId: profile!.id,
                      production: {
                        source: productionSource,
                        batchKey: batch || null,
                        externalLabel: null,
                        skillVersionId: null,
                        ...(skillSetId ? { skillSetId } : {}),
                      },
                    }) }),
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
            每个修订只登记一次；更正来源需制作新修订。题目设计与报告写作分别保留版本；来源申报不代表后台已执行。
          </p>
        </fieldset>
      )}
      </section>
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} draft retry={pendingRequest ? undefined : onRefresh} />}
    </section>
  );
}
