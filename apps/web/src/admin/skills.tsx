import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProductionDomainSchema,
  StyleSkillManifestSchema,
  SkillReferencePathSchema,
  skillPurposes,
  productImplementationPolicy,
  hasThreejsSkillPolicy,
  withThreejsSkillPolicy,
  type StyleSkillManifest,
} from "@orai/contracts/admin";
import { Failure, Loading, Pager, useAction } from "../business/shared.js";
import { api } from "../api/consumer.js";
import { ClientError } from "../api/client.js";
import { allPages } from "./content-api.js";
import { fileDigest } from "./content-media.js";
import {
  skillsApi,
  type Skill,
  type SkillVersion,
  type SkillFile,
} from "./skills-api.js";
import {
  defaultSkill,
  importSkill,
  referenceMime,
  skillDomains,
  skillStatuses,
  purposeLabels,
} from "./skills-model.js";
import "./content.css";
import "./skills.css";
function download(name: string, value: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type })),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function SkillsApp() {
  return (
    <Routes>
      <Route index element={<Navigate to="assessment" replace />} />
      <Route path=":domain" element={<LibraryRoute />} />
    </Routes>
  );
}
function LibraryRoute() {
  const { domain = "assessment" } = useParams();
  const parsed = ProductionDomainSchema.safeParse(domain);
  return parsed.success ? (
    <SkillLibrary key={domain} domain={parsed.data} />
  ) : (
    <p>
      此 skill 领域不存在。
      <Link to="/admin/skills/assessment">返回题库与报告库</Link>
    </p>
  );
}
function SkillLibrary({ domain }: { domain: keyof typeof skillDomains }) {
  const [params, setParams] = useSearchParams(),
    [dirty, setDirty] = useState(false),
    [notice, setNotice] = useState("");
  const client = useQueryClient();
  const skillId = params.get("skill") ?? "",
    versionId = params.get("version") ?? "",
    creating = params.get("new") === "1",
    hasEditor = !!skillId || creating;
  const query = new URLSearchParams(
    [...params].filter(([key]) => !["skill", "version", "new"].includes(key)),
  ).toString();
  const list = useQuery({
    queryKey: ["private", "admin", "skills", domain, query],
    queryFn: ({ signal }) => skillsApi.list(domain, query, signal),
    refetchOnWindowFocus: false,
  });
  const skill = useQuery({
    queryKey: ["private", "admin", "skills-detail", domain, skillId],
    queryFn: ({ signal }) => skillsApi.skill(domain, skillId, signal),
    enabled: !!skillId,
    refetchOnWindowFocus: false,
  });
  const versions = useQuery({
    queryKey: ["private", "admin", "skill-versions", domain, skillId],
    queryFn: ({ signal }) =>
      allPages((page) => skillsApi.versions(domain, skillId, page, signal)),
    enabled: !!skillId,
    refetchOnWindowFocus: false,
  });
  const selectedId = versionId || skill.data?.latest.id || "";
  const selected = useQuery({
    queryKey: [
      "private",
      "admin",
      "skill-version",
      domain,
      skillId,
      selectedId,
    ],
    queryFn: ({ signal }) =>
      skillsApi.version(domain, skillId, selectedId, signal),
    enabled: !!skillId && !!selectedId,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]");
      if (anchor && !anchor.hasAttribute("download")) {
        event.preventDefault();
        event.stopPropagation();
        setNotice("有未保存的 skill 修改，请先保存或放弃。");
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  function choose(s: string, v: string, create = false) {
    if (dirty) {
      setNotice("有未保存的修改，请先保存或放弃。");
      return;
    }
    const next = new URLSearchParams(params);
    next.delete("new");
    if (create) next.set("new", "1");
    if (s) {
      next.set("skill", s);
      if (v) next.set("version", v);
      else next.delete("version");
    } else {
      next.delete("skill");
      next.delete("version");
    }
    setNotice("");
    setParams(next);
  }
  async function saved(row: SkillVersion) {
    setDirty(false);
    setNotice("skill 已保存，历史版本保留。");
    const next = new URLSearchParams(params);
    next.delete("new");
    next.set("skill", row.skillId);
    next.set("version", row.id);
    setParams(next);
    client.setQueryData(
      ["private", "admin", "skill-version", domain, row.skillId, row.id],
      row,
    );
    await Promise.all([
      client.invalidateQueries({ queryKey: ["private", "admin", "skills"] }),
      client.invalidateQueries({
        queryKey: ["private", "admin", "skills-detail"],
      }),
      client.invalidateQueries({
        queryKey: ["private", "admin", "skill-versions"],
      }),
    ]);
  }
  return (
    <section
      className={`skill-library${hasEditor ? " skill-library-detail" : ""}`}
      aria-label={skillDomains[domain] + " skill 库"}
    >
      <div className="content-section-heading">
        <div>
          <span className="content-eyebrow">创作方法 / SKILL LIBRARY</span>
          <h2>{skillDomains[domain]} skill 库</h2>
          <p>维护本领域的方法、风格与参考资料，固定版本供外部制作工具读取。</p>
        </div>
        {hasEditor ? (
          <button className="skill-back" onClick={() => choose("", "")}>
            ← 返回 skill 列表
          </button>
        ) : (
          <button
            className="skill-primary"
            onClick={() => choose("", "", true)}
          >
            新建 skill
          </button>
        )}
      </div>
      <nav className="biz-nav skill-domain-nav" aria-label="skill 制作领域">
        {Object.entries(skillDomains).map(([key, label]) => (
          <Link
            key={key}
            to={"/admin/skills/" + key}
            aria-current={key === domain ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {notice && (
        <p className="skill-notice" role="status">
          {notice}
        </p>
      )}
      {!hasEditor && (
        <>
          <form
            className="content-fields skill-filters"
            key={query}
            onSubmit={(event) => {
              event.preventDefault();
              if (dirty) {
                setNotice("请先保存或放弃修改。");
                return;
              }
              const fields = new FormData(event.currentTarget),
                next = new URLSearchParams();
              for (const key of ["q", "style", "purpose", "form", "status"]) {
                const value = String(fields.get(key) ?? "");
                if (value) next.set(key, value);
              }
              setParams(next);
            }}
          >
            <label>
              搜索 skill
              <input
                name="q"
                defaultValue={params.get("q") ?? ""}
                placeholder="名称或说明"
              />
            </label>
            <label>
              风格标签
              <input
                name="style"
                defaultValue={params.get("style") ?? ""}
                placeholder="例如：温柔"
              />
            </label>
            <label>
              专业用途
              <select name="purpose" defaultValue={params.get("purpose") ?? ""}>
                <option value="">全部用途</option>
                {skillPurposes[domain].map((p) => (
                  <option key={p} value={p}>
                    {purposeLabels[p]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              支持形式
              <select name="form" defaultValue={params.get("form") ?? ""}>
                <option value="">全部形式</option>
                {["web", "cards", "2.5d", "3d", "game"].map((form) => (
                  <option key={form}>{form}</option>
                ))}
              </select>
            </label>
            <label>
              包含版本状态
              <select name="status" defaultValue={params.get("status") ?? ""}>
                <option value="">全部状态</option>
                {Object.entries(skillStatuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button>查询 skill</button>
          </form>
          {list.isPending ? (
            <Loading />
          ) : list.isError ? (
            <Failure error={list.error} retry={() => void list.refetch()} />
          ) : (
            <>
              <div className="skill-list-summary">
                <span>本领域的创作方法</span>
                <span>当前页 {list.data.items.length} 项</span>
              </div>
              <div className="skill-table-wrap">
                <table className="skill-list">
                  <thead>
                    <tr>
                      <th>名称与说明</th>
                      <th>风格 / 用途</th>
                      <th>支持形式</th>
                      <th>最新版本</th>
                      <th>
                        <span className="skill-visually-hidden">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((row) => (
                      <tr key={row.id}>
                        <td className="skill-name-cell">
                          <button
                            className="skill-row-name"
                            onClick={() => choose(row.id, row.latest.id)}
                            aria-label={"打开 " + row.name}
                          >
                            {row.name}
                          </button>
                          <p>{row.description}</p>
                        </td>
                        <td>
                          <span>{row.styles.join(" · ")}</span>
                          <small>
                            {row.purposes
                              .map((purpose) => purposeLabels[purpose])
                              .join(" · ")}
                          </small>
                        </td>
                        <td className="skill-mono">
                          {row.supportedForms.join(" · ")}
                        </td>
                        <td>
                          <span className="skill-version-number">
                            v{row.latest.number}
                          </span>
                          <span
                            className={
                              "skill-status skill-status-" + row.latest.status
                            }
                          >
                            {skillStatuses[row.latest.status]}
                          </span>
                          {row.activeVersionId &&
                            row.latest.status !== "active" && (
                              <small>另有已启用版本</small>
                            )}
                        </td>
                        <td>
                          <button
                            className="skill-open"
                            onClick={() => choose(row.id, row.latest.id)}
                            aria-label={"查看 " + row.name}
                          >
                            打开 <span aria-hidden="true">↗</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!list.data.items.length && (
                  <div className="skill-empty">
                    <strong>没有匹配的 skill</strong>
                    <p>调整筛选条件，或新建本领域的第一份创作方法。</p>
                  </div>
                )}
              </div>
              <Pager
                {...list.data}
                onChange={(page) => {
                  if (dirty) return;
                  const next = new URLSearchParams(params);
                  next.set("page", String(page));
                  setParams(next);
                }}
              />
            </>
          )}
        </>
      )}
      {hasEditor &&
        (skillId && (skill.isError || selected.isError || versions.isError) ? (
          <Failure error={skill.error ?? selected.error ?? versions.error} />
        ) : skillId && (!skill.data || !selected.data || !versions.data) ? (
          <Loading />
        ) : (
          <SkillEditor
            key={
              (selected.data?.id ?? "new") +
              ":" +
              (selected.data?.revision ?? 0)
            }
            domain={domain}
            skill={skillId ? (skill.data ?? null) : null}
            version={skillId ? (selected.data ?? null) : null}
            versions={versions.data ?? []}
            choose={(v) => choose(skillId, v)}
            onDirty={setDirty}
            onSaved={saved}
          />
        ))}
    </section>
  );
}
function SkillEditor({
  domain,
  skill,
  version,
  versions,
  choose,
  onDirty,
  onSaved,
}: {
  domain: keyof typeof skillDomains;
  skill: Skill | null;
  version: SkillVersion | null;
  versions: SkillVersion[];
  choose: (versionId: string) => void;
  onDirty: (value: boolean) => void;
  onSaved: (value: SkillVersion) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<StyleSkillManifest>(
      version?.manifest ?? defaultSkill(domain),
    ),
    [slug, setSlug] = useState(skill?.slug ?? ""),
    [inputs, setInputs] = useState(JSON.stringify(draft.inputs, null, 2)),
    [outputs, setOutputs] = useState(JSON.stringify(draft.outputs, null, 2)),
    [examples, setExamples] = useState(JSON.stringify(draft.examples, null, 2)),
    [compare, setCompare] = useState(""),
    [resetKey, setResetKey] = useState(0),
    [pending, setPending] = useState(false);
  const action = useAction();
  const original = JSON.stringify(version?.manifest ?? defaultSkill(domain));
  const dirty =
    JSON.stringify(draft) !== original ||
    inputs !==
      JSON.stringify(
        (version?.manifest ?? defaultSkill(domain)).inputs,
        null,
        2,
      ) ||
    outputs !==
      JSON.stringify(
        (version?.manifest ?? defaultSkill(domain)).outputs,
        null,
        2,
      ) ||
    examples !==
      JSON.stringify(
        (version?.manifest ?? defaultSkill(domain)).examples,
        null,
        2,
      ) ||
    (!skill && !!slug) ||
    pending;
  const editable = !version || version.status === "draft";
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const diff = useQuery({
    queryKey: [
      "private",
      "admin",
      "skill-diff",
      domain,
      skill?.id,
      version?.id,
      compare,
    ],
    queryFn: ({ signal }) =>
      skillsApi.diff(domain, skill!.id, version!.id, compare, signal),
    enabled: !!skill && !!version && !!compare,
    refetchOnWindowFocus: false,
  });
  function install(value: StyleSkillManifest) {
    if (value.domain !== domain)
      throw new ClientError("VALIDATION_ERROR", "导入内容属于其他领域。");
    setDraft(value);
    setInputs(JSON.stringify(value.inputs, null, 2));
    setOutputs(JSON.stringify(value.outputs, null, 2));
    setExamples(JSON.stringify(value.examples, null, 2));
  }
  return (
    <section className="skill-editor" aria-label="skill 编辑器">
      <div className="skill-editor-heading">
        <div>
          <span className="content-eyebrow">
            {skill ? "版本工作台" : "建立创作方法"}
          </span>
          <strong>{draft.name}</strong>
          <h3>
            {version
              ? `v${version.number} · ${skillStatuses[version.status]}`
              : "新建 skill 草稿"}
          </h3>
        </div>
        <span className={"skill-editor-state" + (dirty ? " is-dirty" : "")}>
          <i aria-hidden="true" />
          {action.busy
            ? "正在处理…"
            : pending
              ? "有待上传参考"
              : dirty
                ? "有未保存修改"
                : editable
                  ? "可编辑草稿"
                  : "固定版本 · 只读"}
        </span>
      </div>
      {!editable && (
        <p className="skill-readonly-note">
          此版本已固定。需要调整方法时，复制为新版本后编辑，现有绑定继续使用原版本。
        </p>
      )}
      <div className="content-note" role="note" aria-label="Three.js 商品制作要求">
        <p>{productImplementationPolicy.summary} 所有领域的 Skill 都需明确此要求，报告与传播素材按同一商品设定配套。</p>
        <p>{hasThreejsSkillPolicy(draft) ? '当前正文已包含统一条款及必填商品规划输入。具体方法与产物仍需审核。' : editable ? '此草稿尚缺统一条款。补入后核对并保存；动画与交互仍由具体商品规划确定。' : '此历史版本保持原文。需要用于新的 Three.js 商品时，先复制为新版本，再补入条款并审核。'}</p>
        {editable && <button type="button" disabled={action.busy || pending || hasThreejsSkillPolicy(draft)} onClick={() => void action.run(async () => StyleSkillManifestSchema.parse(withThreejsSkillPolicy(StyleSkillManifestSchema.parse({
          ...draft, inputs: JSON.parse(inputs), outputs: JSON.parse(outputs), examples: JSON.parse(examples),
        }))), install)}>补入 Three.js 商品要求</button>}
      </div>
      {Boolean(action.error) && <Failure error={action.error} />}
      <div className="skill-editor-workspace">
        <fieldset
          className="skill-document"
          disabled={!editable || action.busy || pending}
        >
          <details className="skill-metadata-section" open={editable}>
            <summary className="skill-document-heading">
              <span>01</span>
              <h4>方法资料</h4>
              <small>
                {editable
                  ? "名称、用途与适用形式"
                  : "展开查看名称、用途与适用形式"}
              </small>
            </summary>
            <div className="content-fields skill-metadata">
              <label>
                稳定标识
                <input
                  aria-label="skill 稳定标识"
                  value={slug}
                  disabled={!!skill}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="gentle-report"
                  maxLength={80}
                />
              </label>
              <label>
                名称
                <input
                  aria-label="skill 名称"
                  value={draft.name}
                  maxLength={120}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                说明
                <textarea
                  aria-label="skill 说明"
                  value={draft.description}
                  maxLength={1200}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label>
                风格标签（逗号分隔）
                <input
                  aria-label="skill 风格"
                  value={draft.styles.join(",")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      styles: e.target.value
                        .split(/[,，]/)
                        .map((v) => v.trim()),
                    })
                  }
                />
              </label>
            </div>
            <fieldset className="skill-choices">
              <legend>专业用途</legend>
              {skillPurposes[domain].map((p) => (
                <label key={p}>
                  <input
                    type="checkbox"
                    checked={draft.purposes.includes(p)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        purposes: e.target.checked
                          ? [...draft.purposes, p]
                          : draft.purposes.filter((v) => v !== p),
                      })
                    }
                  />
                  {purposeLabels[p]}
                </label>
              ))}
            </fieldset>
            <fieldset className="skill-choices">
              <legend>支持商品形式</legend>
              {(["web", "cards", "2.5d", "3d", "game"] as const).map((form) => (
                <label key={form}>
                  <input
                    type="checkbox"
                    checked={draft.supportedForms.includes(form)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        supportedForms: e.target.checked
                          ? [...draft.supportedForms, form]
                          : draft.supportedForms.filter((v) => v !== form),
                      })
                    }
                  />
                  {form}
                </label>
              ))}
            </fieldset>
          </details>
          <div className="skill-document-heading">
            <span>02</span>
            <h4>SKILL.md</h4>
            <small>{editable ? "编辑创作方法正文" : "固定版本 · 只读"}</small>
          </div>
          <label>
            SKILL.md 正文
            <textarea
              className="skill-instructions"
              aria-label="SKILL.md 正文"
              value={draft.instructions}
              onChange={(e) =>
                setDraft({ ...draft, instructions: e.target.value })
              }
              maxLength={100000}
            />
          </label>
          <div className="skill-document-heading">
            <span>03</span>
            <h4>输入与输出约定</h4>
            <small>JSON 规范与示例</small>
          </div>
          <div className="content-fields">
            <label>
              输入规范 JSON
              <textarea
                aria-label="skill 输入规范"
                value={inputs}
                onChange={(e) => setInputs(e.target.value)}
              />
            </label>
            <label>
              输出规范 JSON
              <textarea
                aria-label="skill 输出规范"
                value={outputs}
                onChange={(e) => setOutputs(e.target.value)}
              />
            </label>
          </div>
          <label>
            示例 JSON
            <textarea
              aria-label="skill 示例"
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
            />
          </label>
          {editable && (
            <>
              <div className="skill-document-heading">
                <span>04</span>
                <h4>从文件导入</h4>
              </div>
              <div className="content-fields skill-imports">
                <label>
                  导入 Markdown 正文
                  <input
                    key={"md" + resetKey}
                    aria-label="导入 skill Markdown"
                    type="file"
                    accept=".md,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void action.run(async () => {
                          if (file.size > 400000)
                            throw new ClientError(
                              "VALIDATION_ERROR",
                              "正文文件过大。",
                            );
                          setDraft({
                            ...draft,
                            instructions: await file.text(),
                          });
                        });
                    }}
                  />
                </label>
                <label>
                  导入平台清单 JSON
                  <input
                    key={"json" + resetKey}
                    aria-label="导入 skill JSON"
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void action.run(async () => {
                          if (file.size > 1024 * 1024)
                            throw new ClientError(
                              "VALIDATION_ERROR",
                              "清单文件过大。",
                            );
                          install(importSkill(await file.text()));
                        });
                    }}
                  />
                </label>
              </div>
              <p className="content-note">
                Markdown 导入只替换正文，元数据在表单中填写。JSON 使用平台 v1
                清单；跨环境导入需重新上传参考文件并登记本机文件 ID。
              </p>
            </>
          )}
        </fieldset>
        <aside className="skill-inspector" aria-label="版本与参考资料">
          <section className="skill-version-panel">
            <div className="skill-inspector-heading">
              <h4>版本信息</h4>
              <span>
                {versions.length ? `${versions.length} 个版本` : "尚未保存"}
              </span>
            </div>
            {version && (
              <label>
                历史版本
                <select
                  aria-label="skill 历史版本"
                  value={version.id}
                  disabled={dirty || action.busy}
                  onChange={(event) => choose(event.target.value)}
                >
                  {versions.map((row) => (
                    <option key={row.id} value={row.id}>
                      v{row.number} · {skillStatuses[row.status]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <dl className="skill-version-facts">
              <div>
                <dt>领域</dt>
                <dd>{skillDomains[domain]}</dd>
              </div>
              <div>
                <dt>当前状态</dt>
                <dd>{version ? skillStatuses[version.status] : "新建草稿"}</dd>
              </div>
              <div>
                <dt>形式</dt>
                <dd>{draft.supportedForms.join(" · ") || "未选择"}</dd>
              </div>
            </dl>
            {version && skill && (
              <button
                disabled={dirty || action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await Promise.all([
                      queryClient.invalidateQueries({
                        queryKey: [
                          "private",
                          "admin",
                          "skill-version",
                          domain,
                          skill.id,
                          version.id,
                        ],
                      }),
                      queryClient.invalidateQueries({
                        queryKey: [
                          "private",
                          "admin",
                          "skills-detail",
                          domain,
                          skill.id,
                        ],
                      }),
                      queryClient.invalidateQueries({
                        queryKey: [
                          "private",
                          "admin",
                          "skill-versions",
                          domain,
                          skill.id,
                        ],
                      }),
                    ]);
                  })
                }
              >
                读取最新 skill 稿
              </button>
            )}
          </section>
          <section
            className="skill-reference-panel"
            aria-label="skill 参考资料"
          >
            <div className="skill-inspector-heading">
              <h4>固定参考资料</h4>
              <span>{draft.references.length} 份</span>
            </div>
            {!draft.references.length && (
              <p className="skill-inspector-empty">此版本尚未关联参考文件。</p>
            )}
            {draft.references.map((ref) => (
              <div className="biz-row" key={ref.path}>
                <code>{ref.path}</code>
                <small className="skill-file-id" title={ref.fileId}>
                  文件 {ref.fileId.slice(0, 8)}
                </small>
                {version?.files.find((row) => row.file.id === ref.fileId) && (
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        const file = version.files.find(
                          (row) => row.file.id === ref.fileId,
                        )!.file;
                        download(
                          file.fileName,
                          await api.blob(file.downloadPath!),
                          "application/octet-stream",
                        );
                      })
                    }
                  >
                    下载参考
                  </button>
                )}
                {editable && (
                  <button
                    disabled={action.busy || pending}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        references: draft.references.filter(
                          (row) => row.path !== ref.path,
                        ),
                      })
                    }
                  >
                    移除参考关联
                  </button>
                )}
              </div>
            ))}
            {editable && skill ? (
              <SkillReferenceUpload
                key={"upload" + resetKey}
                domain={domain}
                skillId={skill.id}
                disabled={action.busy}
                onPending={setPending}
                onUploaded={(path, file) =>
                  setDraft({
                    ...draft,
                    references: [
                      ...draft.references.filter((ref) => ref.path !== path),
                      { path, fileId: file.id },
                    ],
                  })
                }
              />
            ) : !skill ? (
              <p>先保存 skill，再上传参考文件。</p>
            ) : null}
            <p className="content-note">
              参考文件每份最多 5 MiB，每版最多 20 份、25
              MiB。原始文件与历史版本保留；此页仅修改引用关联。
            </p>
          </section>
          {version && (
            <details className="skill-digest">
              <summary>固定版本摘要</summary>
              <code>{version.digest}</code>
              <p>用于核对这一版本的内容与附件。</p>
            </details>
          )}
          {version && skill && versions.length > 1 && (
            <section className="skill-compare-panel">
              <label>
                与历史版本比较
                <select
                  aria-label="skill 差异版本"
                  disabled={dirty || action.busy}
                  value={compare}
                  onChange={(e) => setCompare(e.target.value)}
                >
                  <option value="">请选择</option>
                  {versions
                    .filter((row) => row.id !== version.id)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        v{row.number} · {skillStatuses[row.status]}
                      </option>
                    ))}
                </select>
              </label>
              {diff.isError ? (
                <Failure error={diff.error} />
              ) : diff.data ? (
                <>
                  <p>
                    {diff.data.changes.length} 处差异
                    {diff.data.truncated ? "（超过上限，已截断）" : ""}
                  </p>
                  <pre className="content-json">
                    {JSON.stringify(diff.data.changes, null, 2)}
                  </pre>
                </>
              ) : null}
            </section>
          )}
          {version && skill && (
            <section className="skill-export-panel">
              <h4>导出当前版本</h4>
              <div>
                {" "}
                <button
                  disabled={dirty || action.busy}
                  onClick={() =>
                    void action.run(async () =>
                      download(
                        slug + "-v" + version.number + ".skill.json",
                        JSON.stringify(
                          await skillsApi.export(domain, skill.id, version.id),
                          null,
                          2,
                        ),
                        "application/json",
                      ),
                    )
                  }
                >
                  导出 skill JSON
                </button>
                <button
                  disabled={dirty || action.busy}
                  onClick={() =>
                    download(
                      "SKILL.md",
                      version.manifest.instructions,
                      "text/markdown;charset=utf-8",
                    )
                  }
                >
                  导出 SKILL.md
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
      <div className="biz-row skill-editor-actions" aria-label="skill 版本操作">
        {editable && (
          <>
            <button
              className={editable ? "skill-primary" : undefined}
              disabled={!editable || action.busy || pending}
              onClick={() =>
                void action.run(async () => {
                  let inputValue: unknown,
                    outputValue: unknown,
                    exampleValue: unknown;
                  try {
                    inputValue = JSON.parse(inputs);
                    outputValue = JSON.parse(outputs);
                    exampleValue = JSON.parse(examples);
                  } catch {
                    throw new ClientError(
                      "VALIDATION_ERROR",
                      "输入、输出或示例 JSON 格式不正确。",
                    );
                  }
                  const manifest = StyleSkillManifestSchema.parse({
                    ...draft,
                    inputs: inputValue,
                    outputs: outputValue,
                    examples: exampleValue,
                  });
                  return version && skill
                    ? skillsApi.save(
                        domain,
                        skill.id,
                        version.id,
                        action.intent("save", {
                          manifest,
                          expectedRevision: version.revision,
                        }),
                      )
                    : skillsApi.create(
                        domain,
                        action.intent("create", { slug, manifest }),
                      );
                }, onSaved)
              }
            >
              保存 skill 草稿
            </button>
            <button
              disabled={!dirty || action.busy}
              onClick={() => {
                install(version?.manifest ?? defaultSkill(domain));
                setSlug(skill?.slug ?? "");
                setResetKey((v) => v + 1);
                setPending(false);
              }}
            >
              放弃 skill 修改
            </button>
          </>
        )}
        {skill && version && (
          <>
            <button
              className={!editable ? "skill-primary" : undefined}
              disabled={dirty || action.busy}
              onClick={() =>
                void action.run(
                  () =>
                    skillsApi.clone(
                      domain,
                      skill.id,
                      action.intent("clone", {
                        sourceVersionId: version.id,
                        expectedSkillRevision: skill.revision,
                      }),
                    ),
                  onSaved,
                )
              }
            >
              复制为新版本
            </button>
            {(["review", "activate", "archive"] as const).map((kind, index) => (
              <button
                key={kind}
                disabled={
                  dirty ||
                  action.busy ||
                  (kind === "review"
                    ? version.status !== "draft"
                    : kind === "activate"
                      ? version.status !== "reviewed"
                      : version.status === "archived")
                }
                onClick={() =>
                  void action.run(
                    () =>
                      skillsApi.action(
                        domain,
                        skill.id,
                        version.id,
                        kind,
                        action.intent(kind, {
                          expectedRevision: version.revision,
                        }),
                      ),
                    onSaved,
                  )
                }
              >
                {["审核 skill", "启用 skill", "归档 skill"][index]}
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function SkillReferenceUpload({
  domain,
  skillId,
  disabled,
  onPending,
  onUploaded,
}: {
  domain: string;
  skillId: string;
  disabled: boolean;
  onPending: (v: boolean) => void;
  onUploaded: (path: string, file: SkillFile) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [path, setPath] = useState("references/guide.md"),
    [ticket, setTicket] = useState<SkillFile | null>(null),
    [attempt, setAttempt] = useState(0),
    [notice, setNotice] = useState("");
  const action = useAction();
  return (
    <section className="content-file-slot">
      <label>
        包内参考路径
        <input
          aria-label="skill 参考路径"
          disabled={action.busy || disabled}
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
      </label>
      <label>
        参考附件
        <input
          aria-label="skill 参考附件"
          type="file"
          accept=".md,.txt,.json,.pdf,.png,.jpg,.jpeg,.webp"
          disabled={action.busy || disabled}
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            setFile(selected);
            setTicket(null);
            setAttempt((v) => v + 1);
            if (selected) setPath("references/" + selected.name);
            onPending(!!selected);
            setNotice("");
          }}
        />
      </label>
      <button
        disabled={!file || disabled || action.busy}
        onClick={() =>
          void action.run(async () => {
            if (!file || file.size > 5 * 1024 * 1024)
              throw new ClientError(
                "VALIDATION_ERROR",
                "参考文件不能超过 5 MiB。",
              );
            SkillReferencePathSchema.parse(path);
            const mimeType = referenceMime(file.name);
            if (!mimeType)
              throw new ClientError(
                "VALIDATION_ERROR",
                "不支持此参考文件类型。",
              );
            let current = ticket
                ? await skillsApi.file(domain, skillId, ticket.id)
                : null,
              number = attempt;
            if (
              current &&
              ["failed", "expired", "deleted"].includes(current.status)
            ) {
              current = null;
              number++;
              setAttempt(number);
            }
            if (!current)
              current = await skillsApi.prepare(
                domain,
                skillId,
                action.intent("prepare" + number, {
                  fileName: file.name,
                  mimeType,
                  byteSize: file.size,
                  checksum: await fileDigest(file),
                }),
              );
            setTicket(current);
            if (current.status === "pending")
              current = await skillsApi.upload(
                domain,
                skillId,
                current.id,
                file,
              );
            setTicket(current);
            if (current.status === "uploaded")
              current = await skillsApi.complete(
                domain,
                skillId,
                current.id,
                action.intent("complete" + current.id, {}),
              );
            if (current.status !== "available")
              throw new ClientError(
                "CONFLICT",
                "上传尚未完成，请稍后查询重试。",
              );
            setTicket(current);
            onUploaded(path, current);
            setFile(null);
            onPending(false);
            setNotice("参考已校验；请保存 skill 草稿以固定关联。");
          })
        }
      >
        上传并校验参考
      </button>
      <button
        disabled={action.busy}
        onClick={() => {
          setFile(null);
          setTicket(null);
          onPending(false);
        }}
      >
        取消待上传参考
      </button>
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
    </section>
  );
}
