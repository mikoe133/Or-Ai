import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { purposeDomain } from "@orai/contracts/admin";
import { Failure, Loading, Pager, useAction } from "../business/shared.js";
import { allPages, type Profile } from "./content-api.js";
import { bindingsApi, type SkillSet } from "./skill-bindings-api.js";

export const purposeNames = {
  assessment_design: "题目设计",
  report_writing: "报告写作",
  cover_design: "封面设计",
  video_production: "视频制作",
  copywriting: "引流文案",
} as const;
type Purpose = keyof typeof purposeNames;
function useSets(profileId: string) {
  return useQuery({
    queryKey: ["private", "admin", "skill-sets", profileId],
    queryFn: ({ signal }) =>
      allPages((page) => bindingsApi.list(profileId, page, signal)),
    enabled: !!profileId,
    refetchOnWindowFocus: false,
  });
}
export function SkillSetSummary({ set }: { set: SkillSet }) {
  return (
    <div
      className="content-block content-skill-summary"
      aria-label={"固定 skill 组合 r" + set.revision}
    >
      <p>
        <strong>组合 r{set.revision}</strong> · {set.note}
      </p>
      <ul>
        {set.bindings.map((binding) => (
          <li key={binding.purpose}>
            {purposeNames[binding.purpose]}：
            <Link
              to={`/admin/skills/${binding.domain}?skill=${binding.version.skillId}&version=${binding.version.id}`}
            >
              {binding.version.manifest.name} · v{binding.version.number}
            </Link>{" "}
            · {binding.version.manifest.styles.join(" / ")}
            <details>
              <summary>固定正文与参考资料</summary>
              <p>{binding.version.manifest.instructions}</p>
              <code>{binding.version.digest}</code>
              {binding.version.files.map((ref) => (
                <p key={ref.path}>
                  {ref.path} · {ref.file.checksum}
                </p>
              ))}
            </details>
          </li>
        ))}
      </ul>
      <small>
        相同风格标签仍需成套审核。这里保存制作依据；外部 AI / MCP
        来源由操作者申报。
      </small>
    </div>
  );
}
export function SkillSetSource({
  profileId,
  value,
  onChange,
  label = "制作 skill 组合",
}: {
  profileId: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const sets = useSets(profileId),
    selected = sets.data?.find((row) => row.id === value);
  return (
    <div>
      <label>
        {label}
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={sets.isPending || sets.isError}
        >
          <option value="">未关联 skill（人工 / 历史来源）</option>
          {sets.data?.map((row) => (
            <option key={row.id} value={row.id}>
              组合 r{row.revision} · {row.note}
            </option>
          ))}
        </select>
      </label>
      {sets.isPending && !!profileId && <Loading />}
      {sets.isError && (
        <Failure error={sets.error} retry={() => void sets.refetch()} />
      )}
      {selected && <SkillSetSummary set={selected} />}
      {sets.data?.length === 0 && (
        <p>可先到「skill 组合」页签绑定五个专业用途。</p>
      )}
    </div>
  );
}
export function SavedSkillSource({ setId }: { setId?: string }) {
  const set = useQuery({
    queryKey: ["private", "admin", "skill-set", setId],
    queryFn: ({ signal }) => bindingsApi.read(setId!, signal),
    enabled: !!setId,
  });
  return !setId ? (
    <p>此历史修订未关联 skill。</p>
  ) : set.isPending ? (
    <Loading />
  ) : set.isError ? (
    <Failure error={set.error} />
  ) : (
    <SkillSetSummary set={set.data} />
  );
}
function PurposePicker({
  purpose,
  form,
  value,
  retained,
  onChange,
}: {
  purpose: Purpose;
  form: string;
  value: string;
  retained?: SkillSet["bindings"][number];
  onChange: (id: string) => void;
}) {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState("");
  const read = useQuery({
    queryKey: [
      "private",
      "admin",
      "skill-candidates",
      purpose,
      form,
      page,
      query,
    ],
    queryFn: ({ signal }) =>
      bindingsApi.candidates(
        purposeDomain[purpose],
        new URLSearchParams({
          purpose,
          form,
          page: String(page),
          pageSize: "20",
          ...(query ? { q: query } : {}),
        }).toString(),
        signal,
      ),
  });
  // Keep an explicit choice visible across candidate pages; never substitute a newer version.
  const [chosen, setChosen] = useState<{ id: string; label: string } | null>(
    null,
  );
  const visible = read.data?.items ?? [],
    original = retained?.version;
  return (
    <div className="content-purpose-row">
      <label>
        {purposeNames[purpose]}
        <select
          aria-label={purposeNames[purpose] + " skill 版本"}
          required
          value={value}
          onChange={(event) => {
            const row = visible.find((row) => row.id === event.target.value);
            if (row)
              setChosen({
                id: row.id,
                label: `${row.manifest.name} · v${row.number}`,
              });
            onChange(event.target.value);
          }}
        >
          <option value="">选择已启用的兼容版本</option>
          {original && !visible.some((row) => row.id === original.id) && (
            <option value={original.id}>
              {original.manifest.name} · v{original.number}（保留既有绑定）
            </option>
          )}
          {chosen &&
            chosen.id !== original?.id &&
            !visible.some((row) => row.id === chosen.id) && (
              <option value={chosen.id}>{chosen.label}（已选择）</option>
            )}
          {visible.map((row) => (
            <option key={row.id} value={row.id}>
              {row.manifest.name} · v{row.number} ·{" "}
              {row.manifest.styles.join(" / ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        检索{purposeNames[purpose]}
        <input
          maxLength={120}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </label>
      {read.isPending ? (
        <Loading />
      ) : read.isError ? (
        <Failure error={read.error} retry={() => void read.refetch()} />
      ) : (
        <>
          {read.data.total === 0 && <p>暂无支持此商品形式的已启用版本。</p>}
          <Pager {...read.data} onChange={setPage} />
        </>
      )}
    </div>
  );
}
export function ContentSkills({
  profile,
  active,
  onDirty,
}: {
  profile?: Profile;
  active: boolean;
  onDirty: (value: boolean) => void;
}) {
  const [opened, setOpened] = useState(active);
  useEffect(() => {
    if (active) setOpened(true);
  }, [active]);
  if (!profile) return <p>请先保存共同创作设定。</p>;
  return opened ? (
    <SkillSetEditor key={profile.id} profile={profile} onDirty={onDirty} />
  ) : null;
}
function SkillSetEditor({
  profile,
  onDirty,
}: {
  profile: Profile;
  onDirty: (value: boolean) => void;
}) {
  const sets = useSets(profile.id);
  if (sets.isPending) return <Loading />;
  if (sets.isError)
    return <Failure error={sets.error} retry={() => void sets.refetch()} />;
  return (
    <BindingForm
      key={sets.data[0]?.id ?? "new"}
      profile={profile}
      sets={sets.data}
      onDirty={onDirty}
    />
  );
}
function BindingForm({
  profile,
  sets,
  onDirty,
}: {
  profile: Profile;
  sets: SkillSet[];
  onDirty: (value: boolean) => void;
}) {
  const latest = sets[0],
    initial = Object.fromEntries(
      latest?.bindings.map((row) => [row.purpose, row.version.id]) ?? [],
    ),
    [choices, setChoices] = useState<Record<string, string>>(initial),
    [note, setNote] = useState(""),
    [historyId, setHistoryId] = useState(latest?.id ?? ""),
    [notice, setNotice] = useState(""),
    action = useAction(),
    client = useQueryClient();
  const dirty = JSON.stringify(initial) !== JSON.stringify(choices) || !!note;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  return (
    <section className="content-editor content-bindings-editor" aria-label="商品 skill 组合">
      <h3>绑定五个专业用途</h3>
      <p>
        创作设定 r{profile.revision} · 形式 {profile.profile.experienceForm}
        。每次保存追加组合修订，历史产物继续引用原组合。
      </p>
      <div className="biz-row">
        <button
          type="button"
          disabled={action.busy}
          onClick={() =>
            void client.invalidateQueries({
              queryKey: ["private", "admin", "skill-candidates"],
            })
          }
        >
          刷新可绑定版本
        </button>
        <button
          type="button"
          disabled={action.busy || dirty}
          onClick={() =>
            void client.invalidateQueries({
              queryKey: ["private", "admin", "skill-sets", profile.id],
            })
          }
        >
          读取最新组合
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(
            () =>
              bindingsApi.save(
                profile.id,
                action.intent("skill-set:" + profile.id, {
                  expectedRevision: latest?.revision ?? 0,
                  note,
                  bindings: (Object.keys(purposeNames) as Purpose[]).map(
                    (purpose) => ({
                      purpose,
                      skillVersionId: choices[purpose] ?? "",
                    }),
                  ),
                }),
              ),
            (value) => {
              onDirty(false);
              setNotice("已保存固定组合 r" + value.revision);
              setNote("");
              client.setQueryData(
                ["private", "admin", "skill-sets", profile.id],
                [value, ...sets],
              );
            },
          );
        }}
      >
        <fieldset disabled={action.busy}>
          <div className="content-purpose-list">
            {(Object.keys(purposeNames) as Purpose[]).map((purpose) => (
              <PurposePicker
                key={purpose}
                purpose={purpose}
                form={profile.profile.experienceForm}
                value={choices[purpose] ?? ""}
                retained={latest?.bindings.find(
                  (row) => row.purpose === purpose,
                )}
                onChange={(value) =>
                  setChoices((current) => ({ ...current, [purpose]: value }))
                }
              />
            ))}
          </div>
          <label>
            组合说明
            <textarea
              aria-label="skill 组合说明"
              required
              maxLength={2000}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className="biz-row content-action-bar">
            <span>{dirty ? "组合有未保存修改" : latest ? `当前组合 r${latest.revision}` : "尚未保存组合"}</span>
            <button type="submit">保存新 skill 组合</button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setChoices(initial);
                setNote("");
              }}
            >
              放弃组合修改
            </button>
          </div>
        </fieldset>
      </form>
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
      {!!sets.length && (
        <section className="content-form-section">
          <h4>固定组合历史</h4>
          <label>
            查看组合
            <select
              aria-label="查看 skill 组合历史"
              value={historyId}
              onChange={(event) => setHistoryId(event.target.value)}
            >
              {sets.map((row) => (
                <option key={row.id} value={row.id}>
                  组合 r{row.revision} · {row.note}
                </option>
              ))}
            </select>
          </label>
          <SkillSetSummary
            set={sets.find((row) => row.id === historyId) ?? latest!}
          />
        </section>
      )}
    </section>
  );
}
