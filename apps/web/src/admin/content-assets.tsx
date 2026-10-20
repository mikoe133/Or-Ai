import { useEffect, useState } from "react";
import {
  ContentAssetSaveSchema,
  ContentInputSchema,
  type AssetAuthoring,
} from "@orai/contracts/admin";
import { Failure, useAction } from "../business/shared.js";
import { adminApi, parseEditor, type Upload } from "./api.js";
import {
  contentApi,
  type Profile,
  type Revision,
  type RevisionDetail,
} from "./content-api.js";
import {
  authoringOf,
  domains,
  emptyContent,
  platforms,
  statuses,
  stringField,
} from "./content-model.js";
import { StructuredEditor } from "./content-parts.js";
import { ArchiveEditor, FileSlot } from "./content-media.js";
import { ReferencePicker } from "./content-references.js";
import { ImpactBadge } from "./content-history.js";
type Kind = AssetAuthoring["content"]["kind"];
type Props = {
  productId: string;
  active: boolean;
  onInspect: (id: string) => void;
  productVersionId: string;
  profile: Profile;
  rows: Revision[];
  onSaved: () => void;
  onDirty: (value: boolean) => void;
};
export function AssetDesk({
  domain,
  ...props
}: Props & { domain: "cover" | "video" | "copy" }) {
  const [selected, setSelected] = useState<RevisionDetail | null>(null),
    [kind, setKind] = useState<Kind>(domain),
    [dirty, setDirty] = useState(false),
    action = useAction();
  function dirtyChanged(value: boolean) {
    setDirty(value);
    props.onDirty(value);
  }
  // The callback identity stays stable while the editor owns unsaved fields.
  const [dirtyCallback] = useState(() => dirtyChanged);
  const rows = props.rows.filter((value) => value.domain === domain);
  return (
    <section aria-label={domains[domain] + "工作台"}>
      <div className="content-section-heading">
        <div>
          <h3>{domains[domain]}</h3>
          <p>按平台和变体保存独立稿件，文件与来源跟随修订保留。</p>
        </div>
        <button
          disabled={dirty || action.busy}
          onClick={() => {
            setSelected(null);
            setKind(domain);
          }}
        >
          新建{domains[domain]}
        </button>
      </div>
      {rows.length > 0 && (
        <div className="biz-table-wrap">
          <table>
            <thead>
              <tr>
                <th>稿件</th>
                <th>平台 / 状态</th>
                <th>设定 / 修订</th>
                <th>文件状态</th>
                <th>影响 / 历史</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {stringField(row.snapshot.variant)}
                    <small>
                      {stringField(row.snapshot.kind) === "script"
                        ? " · 纯脚本"
                        : ""}
                    </small>
                  </td>
                  <td>
                    {
                      platforms[
                        stringField(
                          row.snapshot.platform,
                        ) as keyof typeof platforms
                      ]
                    }{" "}
                    · {statuses[stringField(row.snapshot.status)]}
                  </td>
                  <td>
                    {row.creativeProfileRevisionId === props.profile.id
                      ? "当前设定"
                      : row.creativeProfileRevisionId
                        ? "其他设定"
                        : "未关联设定"}{" "}
                    · r{row.sourceRevision}
                  </td>
                  <td>
                    {row.storage.localArchiveRegistered ? "原件已登记 · " : ""}
                    {row.storage.previewUploaded ? "预览已上传 · " : ""}
                    {row.storage.deliveryUploaded
                      ? "正式已上传"
                      : row.domain === "copy"
                        ? "文本"
                        : "正式未上传"}
                  </td>
                  <td>
                    <ImpactBadge revisionId={row.id} active={props.active} />
                    <button
                      type="button"
                      onClick={() => props.onInspect(row.id)}
                    >
                      引用与历史
                    </button>
                  </td>
                  <td>
                    <button
                      disabled={dirty || action.busy}
                      onClick={() =>
                        void action.run(
                          () => contentApi.revision(row.id),
                          (value) => {
                            setSelected(value);
                            setKind(stringField(value.snapshot.kind) as Kind);
                          },
                        )
                      }
                    >
                      编辑{stringField(row.snapshot.variant)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {Boolean(action.error) && <Failure error={action.error} />}
      <AssetEditor
        key={selected?.id ?? kind}
        {...props}
        selected={selected}
        kind={kind}
        onDirty={dirtyCallback}
        onKind={setKind}
        onResult={(value) => {
          setSelected(value);
          props.onSaved();
        }}
      />
    </section>
  );
}
function AssetEditor({
  productId,
  productVersionId,
  profile,
  selected,
  kind,
  onKind,
  onResult,
  onDirty,
}: Omit<Props, "rows" | "onSaved"> & {
  selected: RevisionDetail | null;
  kind: Kind;
  onKind: (value: Kind) => void;
  onResult: (value: RevisionDetail) => void;
}) {
  const original = selected ? authoringOf(selected) : null;
  const startingContent =
    original?.content ??
    (kind === "copy" && selected?.snapshot.text
      ? {
          kind: "copy" as const,
          blocks: [
            {
              blockId: "body",
              role: "body" as const,
              text: stringField(selected.snapshot.text),
            },
          ],
        }
      : kind === "script" && selected?.snapshot.text
        ? {
            kind: "script" as const,
            scenes: [
              {
                sceneId: "scene-1",
                startMs: 0,
                endMs: 5000,
                text: stringField(selected.snapshot.text),
              },
            ],
          }
        : emptyContent(kind));
  const [content, setContent] = useState(startingContent),
    [platform, setPlatform] = useState<keyof typeof platforms>(
      (stringField(selected?.snapshot.platform) as keyof typeof platforms) ||
        "manual",
    ),
    [variant, setVariant] = useState(stringField(selected?.snapshot.variant)),
    [source, setSource] = useState(original?.production.source ?? "manual"),
    [batch, setBatch] = useState(original?.production.batchKey ?? ""),
    [external, setExternal] = useState(
      original?.production.externalLabel ?? "",
    ),
    [inputs, setInputs] = useState(
      JSON.stringify(original?.inputs ?? [], null, 2),
    ),
    [archive, setArchive] = useState(original?.media.localArchive ?? null),
    [preview, setPreview] = useState<Upload | null>(
      selected?.previewFile ?? null,
    ),
    [delivery, setDelivery] = useState<Upload | null>(
      selected?.deliveryFile ?? null,
    ),
    [mediaGeneration, setMediaGeneration] = useState(0),
    [uploadBusy, setUploadBusy] = useState(false),
    [pendingPreview, setPendingPreview] = useState(false),
    [pendingDelivery, setPendingDelivery] = useState(false),
    [notice, setNotice] = useState(""),
    action = useAction();
  const initial = JSON.stringify({
    content: startingContent,
    platform: stringField(selected?.snapshot.platform) || "manual",
    variant: stringField(selected?.snapshot.variant),
    source: original?.production.source ?? "manual",
    batch: original?.production.batchKey ?? "",
    external: original?.production.externalLabel ?? "",
    inputs: JSON.stringify(original?.inputs ?? [], null, 2),
    archive: original?.media.localArchive ?? null,
    preview: selected?.previewFile?.id ?? null,
    delivery: selected?.deliveryFile?.id ?? null,
  });
  const dirty =
    pendingPreview ||
    pendingDelivery ||
    uploadBusy ||
    initial !==
      JSON.stringify({
        content,
        platform,
        variant,
        source,
        batch,
        external,
        inputs,
        archive,
        preview: preview?.id ?? null,
        delivery: delivery?.id ?? null,
      });
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const media = kind === "cover" || kind === "video";
  return (
    <div className="content-editor">
      <h3>{selected ? "编辑稿件" : "新稿件"}</h3>
      <p className="content-note">
        保存到创作设定 r{profile.revision}。
        {selected && selected.creativeProfileRevisionId !== profile.id
          ? "此稿来自其他或未关联设定，请核对内容与固定输入后保存。"
          : ""}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(
            async () => {
              const body = parseEditor(
                ContentAssetSaveSchema,
                JSON.stringify(
                  action.intent("asset:" + (selected?.assetId ?? "new"), {
                    ...(selected?.assetId ? { assetId: selected.assetId } : {}),
                    productVersionId,
                    platform,
                    variant,
                    expectedRevision: selected?.sourceRevision ?? 0,
                    fileId: delivery?.id ?? null,
                    authoring: {
                      schemaVersion: 1,
                      creativeProfileRevisionId: profile.id,
                      content,
                      media: {
                        localArchive: archive,
                        previewFileId: preview?.id ?? null,
                      },
                      inputs: parseEditor(ContentInputSchema.array(), inputs),
                      production: {
                        source,
                        batchKey: batch || null,
                        externalLabel: external || null,
                        skillVersionId: null,
                      },
                    },
                  }),
                ),
              );
              const result = await contentApi.saveAsset(body);
              return contentApi.revision(result.id);
            },
            (value) => {
              onResult(value);
              setNotice("内容已保存，固定输入和制作来源已记录。");
            },
          );
        }}
      >
        <fieldset disabled={action.busy || uploadBusy}>
          <div className="content-fields">
            <label>
              稿件名称 / A/B 变体
              <input
                aria-label="稿件名称"
                required
                maxLength={40}
                value={variant}
                onChange={(event) => setVariant(event.target.value)}
              />
            </label>
            <label>
              传播平台
              <select
                aria-label="传播平台"
                disabled={!!selected}
                value={platform}
                onChange={(event) =>
                  setPlatform(event.target.value as typeof platform)
                }
              >
                {Object.entries(platforms).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {(kind === "video" || kind === "script") && (
              <label>
                视频内容类型
                <select
                  aria-label="视频内容类型"
                  disabled={!!selected || dirty}
                  value={kind}
                  onChange={(event) => onKind(event.target.value as Kind)}
                >
                  <option value="video">视频文件与分镜</option>
                  <option value="script">纯分镜脚本</option>
                </select>
              </label>
            )}
          </div>
          <StructuredEditor content={content} onChange={setContent} />
          <ReferencePicker
            productId={productId}
            versionId={productVersionId}
            profileId={profile.id}
            assetId={selected?.assetId}
            content={content}
            inputs={inputs}
            onChange={setInputs}
            onContent={setContent}
          />
          <h4>制作来源</h4>
          <div className="content-fields">
            <label>
              来源
              <select
                aria-label="制作来源"
                value={source}
                onChange={(event) =>
                  setSource(event.target.value as typeof source)
                }
              >
                <option value="manual">人工制作</option>
                <option value="external_ai">外部 AI 辅助</option>
                <option value="mcp">经 MCP 制作（来源申报）</option>
              </select>
            </label>
            <label>
              制作批次
              <input
                aria-label="制作批次"
                maxLength={64}
                value={batch}
                onChange={(event) => setBatch(event.target.value)}
              />
            </label>
            <label>
              工具或来源备注
              <input
                maxLength={160}
                value={external}
                onChange={(event) => setExternal(event.target.value)}
              />
            </label>
          </div>
          <p className="content-note">
            Skill 版本：未关联。来源为操作者申报；当前后台不会运行模型或 MCP。
          </p>
          <details>
            <summary>固定输入清单 · {original?.inputs.length ?? 0} 项</summary>
            <p>
              使用来源修订 ID、摘要和 questionId / blockId / sceneId
              固定具体输入。原文与改写需明确标记；服务端会校验来源和实际使用文本。
            </p>
            <label>
              固定输入 JSON
              <textarea
                aria-label="固定输入 JSON"
                maxLength={200000}
                rows={8}
                value={inputs}
                onChange={(event) => setInputs(event.target.value)}
              />
            </label>
            {selected?.inputs.map((input) => (
              <div className="content-block" key={input.id}>
                <strong>
                  {input.locatorKey} → {input.targetLocatorKey} ·{" "}
                  {input.mode === "exact" ? "原文" : "改写"}
                </strong>
                <p>{input.usedText}</p>
                <code>{input.sourceRevisionId}</code>
              </div>
            ))}
            {selected?.production && (
              <details>
                <summary>已保存制作记录与输入快照</summary>
                <pre>{JSON.stringify(selected.production, null, 2)}</pre>
              </details>
            )}
          </details>
          <div className="biz-row">
            <button type="submit" disabled={pendingPreview || pendingDelivery}>
              保存内容草稿
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setContent(startingContent);
                setPlatform(
                  (stringField(
                    selected?.snapshot.platform,
                  ) as keyof typeof platforms) || "manual",
                );
                setVariant(stringField(selected?.snapshot.variant));
                setSource(original?.production.source ?? "manual");
                setBatch(original?.production.batchKey ?? "");
                setExternal(original?.production.externalLabel ?? "");
                setInputs(JSON.stringify(original?.inputs ?? [], null, 2));
                setArchive(original?.media.localArchive ?? null);
                setPreview(selected?.previewFile ?? null);
                setDelivery(selected?.deliveryFile ?? null);
                setPendingPreview(false);
                setPendingDelivery(false);
                setMediaGeneration((value) => value + 1);
              }}
            >
              放弃内容修改
            </button>
          </div>
        </fieldset>
      </form>
      {media && (
        <fieldset
          disabled={action.busy || uploadBusy}
          className="content-media-grid"
          key={mediaGeneration}
        >
          <ArchiveEditor
            onBusy={setUploadBusy}
            kind={kind}
            value={archive}
            onChange={setArchive}
          />
          <FileSlot
            versionId={productVersionId}
            kind={kind}
            purpose="预览"
            value={preview}
            onChange={setPreview}
            onBusy={setUploadBusy}
            onPending={setPendingPreview}
          />
          <FileSlot
            versionId={productVersionId}
            kind={kind}
            purpose="正式"
            value={delivery}
            onChange={setDelivery}
            onBusy={setUploadBusy}
            onPending={setPendingDelivery}
          />
        </fieldset>
      )}
      {selected && (
        <div className="biz-row">
          <span>
            已保存状态：{statuses[stringField(selected.snapshot.status)]} · r
            {selected.sourceRevision}
          </span>
          {(["review", "ready", "archive"] as const).map((command) => (
            <button
              key={command}
              disabled={
                action.busy ||
                dirty ||
                (command === "review"
                  ? selected.snapshot.status !== "draft"
                  : command === "ready"
                    ? selected.snapshot.status !== "reviewed"
                    : selected.snapshot.status === "archived") ||
                (command !== "archive" && media && !delivery)
              }
              onClick={() =>
                void action.run(async () => {
                  await adminApi.assetAction(
                    selected.assetId!,
                    command,
                    action.intent(command + ":" + selected.assetId, {
                      expectedRevision: selected.sourceRevision,
                    }),
                  );
                  const head = await contentApi.revisions(
                    new URLSearchParams({
                      productId: selected.productId,
                      assetId: selected.assetId!,
                      current: "true",
                    }).toString(),
                  );
                  return contentApi.revision(head.items[0]!.id);
                }, onResult)
              }
            >
              {command === "review"
                ? "审核内容"
                : command === "ready"
                  ? "标记就绪"
                  : "归档内容"}
            </button>
          ))}
          <button
            disabled={action.busy || dirty}
            onClick={() =>
              void action.run(async () => {
                const head = await contentApi.revisions(
                  new URLSearchParams({
                    productId: selected.productId,
                    assetId: selected.assetId!,
                    current: "true",
                  }).toString(),
                );
                return contentApi.revision(head.items[0]!.id);
              }, onResult)
            }
          >
            读取最新稿
          </button>
        </div>
      )}
      {dirty && (
        <p className="content-note">
          有未保存修改。保存或放弃后可切换设定、版本与稿件。
        </p>
      )}
      {media && !delivery && (
        <p className="content-note">
          只有原件登记或预览文件时可存草稿。审核与就绪需要校验过的正式文件。
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && <Failure error={action.error} />}
    </div>
  );
}
