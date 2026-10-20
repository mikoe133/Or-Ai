import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ContentInputSchema,
  ProductConfigurationSchema,
  type AssetAuthoring,
  type ContentInput,
  type ContentLocator,
} from "@orai/contracts/admin";
import { Failure, Loading, useAction } from "../business/shared.js";
import { parseEditor } from "./api.js";
import { contentApi, allPages } from "./content-api.js";
import {
  authoringOf,
  stringField,
  domains,
  insertReferenceText,
} from "./content-model.js";
import { workflowApi } from "./workflow-api.js";
const key = (locator: ContentLocator) =>
  locator.kind === "question"
    ? locator.questionId
    : locator.kind === "block"
      ? locator.blockId
      : locator.kind === "scene"
        ? locator.sceneId
        : "whole";

export function ReferencePicker({
  versionId,
  productId,
  profileId,
  assetId,
  content,
  inputs,
  onChange,
  onContent,
}: {
  versionId: string;
  productId: string;
  profileId: string;
  assetId?: string | null;
  content: AssetAuthoring["content"];
  inputs: string;
  onChange: (text: string) => void;
  onContent: (content: AssetAuthoring["content"]) => void;
}) {
  const [open, setOpen] = useState(false),
    [sourceId, setSourceId] = useState(""),
    [fragmentId, setFragmentId] = useState(""),
    [targetId, setTargetId] = useState(""),
    [role, setRole] = useState<ContentInput["role"]>("question"),
    [mode, setMode] = useState<ContentInput["mode"]>("exact"),
    [usedText, setUsedText] = useState(""),
    [resolved, setResolved] = useState(false),
    action = useAction();
  const sources = useQuery({
    queryKey: [
      "private",
      "admin",
      "content-reference-options",
      versionId,
      profileId,
    ],
    queryFn: ({ signal }) =>
      allPages((page) =>
        contentApi.revisions(
          new URLSearchParams({
            productId,
            productVersionId: versionId,
            current: "true",
            pageSize: "50",
            page: String(page),
          }).toString(),
          signal,
        ),
      ),
    enabled: open,
    refetchOnWindowFocus: false,
  });
  const source = sources.data?.find((value) => value.id === sourceId),
    authoring = source ? authoringOf(source) : null;
  let fragments: { locator: ContentLocator; label: string }[] = [];
  if (source?.domain === "assessment") {
    const config = ProductConfigurationSchema.safeParse(
      source.snapshot.configuration,
    );
    if (config.success)
      fragments = config.data.questions.map((question) => ({
        locator: { kind: "question", questionId: question.id },
        label: question.text,
      }));
  } else if (authoring?.content.kind === "copy")
    fragments = authoring.content.blocks.map((block) => ({
      locator: { kind: "block", blockId: block.blockId },
      label: block.role + " · " + block.text,
    }));
  else if (authoring?.content.kind === "cover")
    fragments = [
      { locator: { kind: "whole" }, label: authoring.content.title },
    ];
  else if (
    authoring?.content.kind === "video" ||
    authoring?.content.kind === "script"
  )
    fragments = authoring.content.scenes.map((scene) => ({
      locator: { kind: "scene", sceneId: scene.sceneId },
      label: scene.text,
    }));
  const targets: { locator: ContentLocator; label: string }[] =
    content.kind === "cover"
      ? [{ locator: { kind: "whole" }, label: "封面说明" }]
      : content.kind === "copy"
        ? content.blocks.map((block) => ({
            locator: { kind: "block", blockId: block.blockId },
            label: block.role + " · " + block.blockId,
          }))
        : content.scenes.map((scene) => ({
            locator: { kind: "scene", sceneId: scene.sceneId },
            label: scene.sceneId,
          }));
  const fragment =
      fragments.find((value) => key(value.locator) === fragmentId) ??
      fragments[0],
    target =
      targets.find((value) => key(value.locator) === targetId) ?? targets[0];
  const parsed = ContentInputSchema.array().safeParse(
    (() => {
      try {
        return JSON.parse(inputs);
      } catch {
        return null;
      }
    })(),
  );
  return (
    <section className="content-block" aria-label="固定引用编辑器">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "收起引用选择" : "添加题目或文案引用"}
      </button>
      {open && (
        <>
          <p>
            从固定修订选择具体题目、文案块、分镜或封面。保存引用时，会把使用文字插入指定位置，原稿保持不变。
          </p>
          {sources.isPending ? (
            <Loading />
          ) : sources.isError ? (
            <Failure
              error={sources.error}
              retry={() => void sources.refetch()}
            />
          ) : (
            <>
              <div className="content-fields">
                <label>
                  引用来源稿
                  <select
                    aria-label="引用来源稿"
                    value={sourceId}
                    onChange={(event) => {
                      setSourceId(event.target.value);
                      setFragmentId("");
                      setResolved(false);
                      setUsedText("");
                    }}
                  >
                    <option value="">选择来源修订</option>
                    {sources.data
                      .filter(
                        (row) =>
                          row.assetId !== assetId &&
                          row.snapshot.status !== "archived" &&
                          (!row.creativeProfileRevisionId ||
                            row.creativeProfileRevisionId === profileId),
                      )
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {domains[row.domain]} ·{" "}
                          {stringField(row.snapshot.variant) || "题库"} · r
                          {row.sourceRevision}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  来源位置
                  <select
                    aria-label="来源位置"
                    value={fragment ? key(fragment.locator) : ""}
                    onChange={(event) => {
                      setFragmentId(event.target.value);
                      setResolved(false);
                      setUsedText("");
                    }}
                  >
                    {fragments.map((value) => (
                      <option
                        key={key(value.locator)}
                        value={key(value.locator)}
                      >
                        {value.label.slice(0, 100)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  目标位置
                  <select
                    aria-label="目标位置"
                    value={target ? key(target.locator) : ""}
                    onChange={(event) => setTargetId(event.target.value)}
                  >
                    {targets.map((value) => (
                      <option
                        key={key(value.locator)}
                        value={key(value.locator)}
                      >
                        {value.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                disabled={action.busy || !source || !fragment}
                onClick={() =>
                  void action.run(
                    () =>
                      workflowApi.context({
                        creativeProfileRevisionId: profileId,
                        domain:
                          content.kind === "script" ? "video" : content.kind,
                        inputs: [
                          {
                            revisionId: source!.id,
                            digest: source!.digest,
                            locator: fragment!.locator,
                          },
                        ],
                      }),
                    (value) => {
                      setUsedText(stringField(value.inputs[0]?.content.text));
                      setResolved(true);
                    },
                  )
                }
              >
                读取所选公开节选
              </button>
              {resolved && (
                <>
                  <div className="content-fields">
                    <label>
                      使用角色
                      <select
                        aria-label="使用角色"
                        value={role}
                        onChange={(event) =>
                          setRole(event.target.value as typeof role)
                        }
                      >
                        {Object.entries({
                          question: "题目",
                          hook: "钩子",
                          cta: "行动引导",
                          voiceover: "口播",
                          subtitle: "字幕",
                          visual: "画面",
                          reference: "参考",
                        }).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      引用方式
                      <select
                        aria-label="引用方式"
                        value={mode}
                        onChange={(event) =>
                          setMode(event.target.value as typeof mode)
                        }
                      >
                        <option value="exact">使用原文</option>
                        <option value="adapted">明确改写</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    实际使用文字
                    <textarea
                      aria-label="实际使用文字"
                      maxLength={20000}
                      value={usedText}
                      onChange={(event) => setUsedText(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={action.busy || !usedText || !target}
                    onClick={() =>
                      void action.run(
                        async () => {
                          const previous = parseEditor(
                              ContentInputSchema.array(),
                              inputs,
                            ),
                            input = ContentInputSchema.parse({
                              sourceRevisionId: source!.id,
                              sourceDigest: source!.digest,
                              locator: fragment!.locator,
                              targetLocator: target!.locator,
                              role,
                              mode,
                              usedText,
                            });
                          return { previous, input };
                        },
                        ({ previous, input }) => {
                          onContent(
                            insertReferenceText(
                              content,
                              input.targetLocator,
                              input.usedText,
                            ),
                          );
                          onChange(
                            JSON.stringify([...previous, input], null, 2),
                          );
                          setResolved(false);
                          setUsedText("");
                        },
                      )
                    }
                  >
                    插入文字并固定引用
                  </button>
                </>
              )}
            </>
          )}
          {Boolean(action.error) && <Failure error={action.error} />}
        </>
      )}
      {parsed.success &&
        parsed.data.map((input, index) => (
          <div className="content-reference-row" key={index}>
            <strong>
              {input.role} · {key(input.locator)} → {key(input.targetLocator)} ·{" "}
              {input.mode === "adapted" ? "改写" : "原文"}
            </strong>
            <p>{input.usedText}</p>
            <small>固定修订 {input.sourceRevisionId}</small>
            <button
              type="button"
              onClick={() =>
                onChange(
                  JSON.stringify(
                    parsed.data.filter((_, at) => at !== index),
                    null,
                    2,
                  ),
                )
              }
            >
              移除此引用
            </button>
          </div>
        ))}
    </section>
  );
}
