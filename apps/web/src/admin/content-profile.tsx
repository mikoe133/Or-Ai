import { useEffect, useState } from "react";
import { CreativeProfileSchema, productImplementationPolicy } from "@orai/contracts/admin";
import { parseEditor, type AdminProduct } from "./api.js";
import { contentApi, type Profile } from "./content-api.js";
import {
  capability,
  defaultProfile,
  domains,
  platforms,
} from "./content-model.js";
import { useAction } from "../business/shared.js";
import { AdminFailure as Failure } from "./feedback.js";
export function ProfileEditor({
  product,
  selected,
  latestRevision,
  onSaved,
  onDirty,
}: {
  product: AdminProduct;
  selected?: Profile;
  latestRevision: number;
  onSaved: (value: Profile) => void;
  onDirty: (value: boolean) => void;
}) {
  const initial = selected?.profile ?? defaultProfile(product),
    [draft, setDraft] = useState(initial),
    action = useAction(),
    [notice, setNotice] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const update = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setNotice("");
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const fields = [
    ["title", "设定名称"],
    ["audience", "面向谁"],
    ["situation", "使用情境"],
    ["emotionalGoal", "希望带来的情绪感受"],
    ["understandingGoal", "希望加深的理解"],
    ["takeaway", "用户带走什么"],
    ["pace", "体验节奏"],
    ["world", "世界观与意象"],
    ["language", "语言风格"],
    ["visual", "视觉风格"],
    ["sound", "声音要求"],
  ] as const;
  return (
    <section className="content-editor content-profile-editor" aria-label="创作设定编辑器">
      <div className="content-section-heading">
        <div>
          <h3>共同创作设定</h3>
          <p>四类内容都固定引用此设定的某一版。保存会追加修订。</p>
        </div>
        <span className="content-badge">
          {selected ? `修订 ${selected.revision}` : "尚未保存"}
        </span>
      </div>
      <p className="content-note">{productImplementationPolicy.summary} 请在体验节奏与视觉风格中写清决定和待定项；具体运行模板仍须通过兼容检查。</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(
            async () =>
              contentApi.saveProfile(
                product.id,
                action.intent("profile:" + product.id, {
                  profile: parseEditor(
                    CreativeProfileSchema,
                    JSON.stringify(draft),
                  ),
                  expectedRevision: latestRevision,
                }),
              ),
            (value) => {
              setNotice("创作设定已保存为新修订。");
              onSaved(value);
            },
          );
        }}
      >
        <fieldset disabled={action.busy}>
          {[
            { title: "01 / 创作目标", description: "先确定为谁而做，以及这次体验想带来的感受。", fields: fields.slice(0, 6) },
            { title: "02 / 表达与风格", description: "让题目、报告与传播素材使用一致的表达。", fields: fields.slice(6) },
          ].map((group) => (
          <section className="content-form-section" key={group.title}>
            <header className="content-form-section-heading"><h4>{group.title}</h4><p>{group.description}</p></header>
            <div className="content-fields content-profile-fields">
            {group.fields.map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  required
                  aria-label={label}
                  rows={key === "title" ? 1 : 2}
                  maxLength={
                    ["world", "language", "visual"].includes(key)
                      ? 2000
                      : key === "title"
                        ? 160
                        : 1000
                  }
                  value={draft[key]}
                  onChange={(event) => update(key, event.target.value)}
                />
              </label>
            ))}
            </div>
          </section>
          ))}
          <section className="content-form-section">
          <header className="content-form-section-heading"><h4>03 / 形式与交付</h4><p>固定参与方式、传播渠道与交付范围。</p></header>
          <div className="content-fields">
            <label>
              参与视角
              <select
                aria-label="参与视角"
                value={draft.perspective}
                onChange={(event) =>
                  update(
                    "perspective",
                    event.target.value as typeof draft.perspective,
                  )
                }
              >
                <option value="self">单人 · 了解自己</option>
                <option value="single_person_relationship">
                  单人 · 观察关系
                </option>
                <option value="planned_two_person">双方参与 · 规划中</option>
              </select>
            </label>
            <label>
              创作形式意向
              <select
                aria-label="体验形式"
                value={draft.experienceForm}
                onChange={(event) =>
                  update(
                    "experienceForm",
                    event.target.value as typeof draft.experienceForm,
                  )
                }
              >
                {Object.entries({web:'网页 · 历史兼容',cards:'卡片风格 · 待适配 Three.js', '2.5d':'2.5D 风格 · 待适配 Three.js', '3d':'Three.js · 当前商品基线',game:'小游戏 · 待定义玩法与 Three.js 模板'}).map(([value,label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="content-note">
            {capability(draft)}
            。当前 Three.js 已注册静心花园单选；其他商品可规划不同场景、动画与玩法，需分别实现和注册。
            旧网页/小屋形式保留历史兼容，不能据此认定已完成 Three.js 改造。
          </p>
          <div className="content-checks">
            <span>传播渠道</span>
            {(Object.keys(platforms) as (keyof typeof platforms)[]).map(
              (key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={draft.channels.includes(key)}
                    onChange={(event) =>
                      update(
                        "channels",
                        event.target.checked
                          ? [...draft.channels, key]
                          : draft.channels.filter((value) => value !== key),
                      )
                    }
                  />
                  {platforms[key]}
                </label>
              ),
            )}
          </div>
          <div className="content-checks">
            <span>需要交付</span>
            {(Object.keys(domains) as (keyof typeof domains)[]).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={draft.deliverables.includes(key)}
                  onChange={(event) =>
                    update(
                      "deliverables",
                      event.target.checked
                        ? [...draft.deliverables, key]
                        : draft.deliverables.filter((value) => value !== key),
                    )
                  }
                />
                {domains[key]}
              </label>
            ))}
          </div>
          </section>
          <section className="content-form-section">
          <header className="content-form-section-heading"><h4>04 / 结果叙事方案</h4></header>
          <p className="content-note">
            此方案约束结果的表达。当前单选协议仍需要标准图文报告；书信、地图、日志等先保存方案。
            已注册的小屋手记属于呈现模板，在结果交付中选择并核对。
          </p>
          <div className="content-fields">
            <label>
              方案标题
              <input
                required
                maxLength={160}
                value={draft.reportPlan.title}
                onChange={(event) =>
                  update("reportPlan", {
                    ...draft.reportPlan,
                    title: event.target.value,
                  })
                }
              />
            </label>
            <label>
              呈现方式
              <select
                value={draft.reportPlan.presentation}
                onChange={(event) =>
                  update("reportPlan", {
                    ...draft.reportPlan,
                    presentation: event.target
                      .value as typeof draft.reportPlan.presentation,
                  })
                }
              >
                {["standard", "letter", "map", "journal", "custom"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label>
            叙事要求
            <textarea
              required
              maxLength={2000}
              value={draft.reportPlan.narrative}
              onChange={(event) =>
                update("reportPlan", {
                  ...draft.reportPlan,
                  narrative: event.target.value,
                })
              }
            />
          </label>
          {draft.reportPlan.sections.map((section, index) => (
            <div className="content-block" key={index}>
              <div className="content-fields">
                <label>
                  章节 ID
                  <input
                    required
                    value={section.sectionId}
                    onChange={(event) =>
                      update("reportPlan", {
                        ...draft.reportPlan,
                        sections: draft.reportPlan.sections.map((value, at) =>
                          at === index
                            ? { ...value, sectionId: event.target.value }
                            : value,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  章节标题
                  <input
                    required
                    maxLength={120}
                    value={section.title}
                    onChange={(event) =>
                      update("reportPlan", {
                        ...draft.reportPlan,
                        sections: draft.reportPlan.sections.map((value, at) =>
                          at === index
                            ? { ...value, title: event.target.value }
                            : value,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <label>
                章节目的
                <textarea
                  required
                  maxLength={1000}
                  value={section.purpose}
                  onChange={(event) =>
                    update("reportPlan", {
                      ...draft.reportPlan,
                      sections: draft.reportPlan.sections.map((value, at) =>
                        at === index
                          ? { ...value, purpose: event.target.value }
                          : value,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                disabled={draft.reportPlan.sections.length === 1}
                onClick={() =>
                  update("reportPlan", {
                    ...draft.reportPlan,
                    sections: draft.reportPlan.sections.filter(
                      (_, at) => at !== index,
                    ),
                  })
                }
              >
                移除章节
              </button>
            </div>
          ))}
            <button
              className="content-add-action"
              type="button"
              disabled={draft.reportPlan.sections.length >= 24}
              onClick={() =>
                update("reportPlan", {
                  ...draft.reportPlan,
                  sections: [
                    ...draft.reportPlan.sections,
                    {
                      sectionId: "section-" + crypto.randomUUID().slice(0, 8),
                      title: "",
                      purpose: "",
                    },
                  ],
                })
              }
            >
              添加章节
            </button>
          </section>
          <div className="biz-row content-action-bar">
            <span>{dirty ? "有未保存修改" : selected ? `当前设定 r${selected.revision}` : "新创作设定"}</span>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => setDraft(initial)}
            >
              放弃设定修改
            </button>
            <button type="submit">保存设定新修订</button>
          </div>
        </fieldset>
      </form>
      {dirty && <p className="content-note">设定有未保存修改。</p>}
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} draft />}
    </section>
  );
}
