import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AdminAssetCreateSchema,
  AdminAssetPatchSchema,
} from "@orai/contracts/admin";
import { ClientError } from "../api/client.js";
import {
  adminApi,
  findPublishedProduct,
  type Asset,
  type Upload,
} from "./api.js";
import { ProductVersionSelect } from "./shared.js";
import { Failure, Loading, Pager, useAction } from "../business/shared.js";
import "./management.css";
const assetKinds: Record<string, string> = { cover: "封面", video: "视频", script: "脚本", copy: "文案" };
const assetStatuses: Record<string, string> = { draft: "草稿", reviewed: "已审核", ready: "已就绪", archived: "已归档" };
const assetPlatforms: Record<string, string> = { manual: "人工", douyin: "抖音", xiaohongshu: "小红书" };
export function Assets() {
  const headingRef = useRef<HTMLElement>(null);
  const [params, setParams] = useSearchParams(),
    client = useQueryClient(),
    action = useAction(),
    [version, setVersion] = useState(""),
    [editorOpen, setEditorOpen] = useState(false),
    [kind, setKind] = useState<Asset["kind"]>("cover"),
    [platform, setPlatform] = useState<Asset["platform"]>("manual"),
    [variant, setVariant] = useState(""),
    [text, setText] = useState(""),
    [selected, setSelected] = useState<Asset | null>(null),
    [file, setFile] = useState<File | null>(null),
    [upload, setUpload] = useState<Upload | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => { headingRef.current?.scrollIntoView({ block: "start" }); }, [editorOpen, selected?.id]);
  const list = useQuery({
    queryKey: ["private", "admin", "assets", params.toString()],
    queryFn: ({ signal }) => adminApi.assets(params.toString(), signal),
  });
  const media = kind === "cover" || kind === "video",
    pendingFile = media && Boolean(file) && upload?.status !== "available";
  const dirty =
    Boolean(selected) &&
    (variant !== selected!.variant ||
      text !== (selected!.text ?? "") ||
      Boolean(file) ||
      Boolean(upload && upload.id !== selected!.fileId));
  function changed() {
    void client.invalidateQueries({ queryKey: ["private", "admin", "assets"] });
  }
  async function sendFile() {
    await action.run(async () => {
      if (!file || !version)
        throw new ClientError("VALIDATION_ERROR", "请选择商品版本和媒体文件。");
      if (file.size > (kind === "cover" ? 10 : 100) * 1024 * 1024)
        throw new ClientError(
          "VALIDATION_ERROR",
          "文件超过当前页面的上传上限（图片 10 MiB、视频 100 MiB）。",
        );
      let current = upload;
      if (!current) {
        const checksum = Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
          ),
        )
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
        current = await adminApi.prepare(
          action.intent("prepare", {
            productVersionId: version,
            kind,
            fileName: file.name,
            mimeType: file.type,
            byteSize: file.size,
            checksum,
          }),
        );
        setUpload(current);
      } else current = await adminApi.status(current.id);
      if (current.status === "pending") {
        current = await adminApi.upload(current.id, file);
        setUpload(current);
      }
      if (current.status === "uploaded")
        current = await adminApi.complete(
          current.id,
          action.intent("complete:" + current.id, {}),
        );
      setUpload(current);
      return current;
    });
  }
  function choose(value: Asset) {
    setEditorOpen(true);
    setSelected(value);
    setVersion(value.productVersionId);
    setKind(value.kind);
    setPlatform(value.platform);
    setVariant(value.variant);
    setText(value.text ?? "");
    setFile(null);
    setUpload(null);
    setNotice("");
  }
  function newAsset() {
    setEditorOpen(true);
    setSelected(null);
    setFile(null);
    setUpload(null);
    setVariant("");
    setText("");
    setNotice("");
  }
  return (
    <div className="admin-management admin-assets">
      <header ref={headingRef} className="admin-management-heading">
        <div><span className="admin-eyebrow">LIBRARY / MEDIA</span><h2>{editorOpen ? (selected ? selected.variant : "新建素材") : "素材与文件"}</h2>
          <p>{editorOpen ? "保存草稿、审核，再标记就绪。采用后的商品封面才会公开。" : "按版本、平台与状态管理封面、视频、脚本和文案。"}</p>
        </div>
        <div className="biz-row">{editorOpen ? <button type="button" disabled={action.busy} onClick={() => setEditorOpen(false)}>返回素材列表</button> :
          <button type="button" className="admin-primary" disabled={action.busy} onClick={newAsset}>新建素材 <span aria-hidden="true">↗</span></button>}
        </div>
      </header>
      {!editorOpen && <>
      <form
        className="biz-row admin-filterbar"
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          setParams(
            Object.fromEntries(
              [...fields]
                .map(([key, value]) => [key, String(value)])
                .filter(([, value]) => value),
            ),
          );
        }}
      >
        <label>
          筛选类别
          <select
            aria-label="筛选类别"
            name="kind"
            defaultValue={params.get("kind") ?? ""}
          >
            <option value="">全部</option>
            {["cover", "video", "script", "copy"].map((value) => (
              <option key={value} value={value}>{assetKinds[value] ?? assetPlatforms[value] ?? assetStatuses[value] ?? value}</option>
            ))}
          </select>
        </label>
        <label>
          筛选平台
          <select
            aria-label="筛选平台"
            name="platform"
            defaultValue={params.get("platform") ?? ""}
          >
            <option value="">全部</option>
            {["manual", "douyin", "xiaohongshu"].map((value) => (
              <option key={value} value={value}>{assetKinds[value] ?? assetPlatforms[value] ?? assetStatuses[value] ?? value}</option>
            ))}
          </select>
        </label>
        <label>
          筛选状态
          <select
            aria-label="筛选状态"
            name="status"
            defaultValue={params.get("status") ?? ""}
          >
            <option value="">全部</option>
            {["draft", "reviewed", "ready", "archived"].map((value) => (
              <option key={value} value={value}>{assetKinds[value] ?? assetPlatforms[value] ?? assetStatuses[value] ?? value}</option>
            ))}
          </select>
        </label>
        <button>筛选素材</button>
      </form>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <Failure error={list.error} retry={() => void list.refetch()} />
      ) : (
        <>
          <div className="admin-section-heading"><h3>全部素材</h3><span>{list.data.total} 份素材</span></div>
          <div className="admin-media-grid">
            {list.data.items.map((value) => (
              <article className="admin-media-tile" key={value.id}>
                <div className="admin-media-thumbnail">
                  {value.kind === "cover" && value.downloadPath ? <img src={value.downloadPath} alt={value.variant + "封面"} loading="lazy" /> : value.kind === "video" && value.downloadPath ?
                    <video src={value.downloadPath} preload="none" controls aria-label={value.variant + "视频预览"} /> :
                    <div className="admin-media-text-preview"><span>{assetKinds[value.kind]}</span><p>{value.text || "暂无预览文件"}</p></div>}
                </div>
                <div className="admin-media-caption">
                  <h3>{value.variant}</h3>
                  <p>{assetKinds[value.kind]} · {assetPlatforms[value.platform] ?? value.platform} · r{value.revision}</p>
                  <div className="biz-row"><span className="admin-status" data-status={value.status}>{assetStatuses[value.status] ?? value.status}</span>
                    <button className="admin-table-action" disabled={action.busy} onClick={() => choose(value)}>编辑素材 <span aria-hidden="true">↗</span></button></div>
                </div>
              </article>
            ))}
          </div>
          {!list.data.total && <p>没有匹配素材。</p>}
          <Pager
            {...list.data}
            onChange={(page) =>
              setParams({ ...Object.fromEntries(params), page: String(page) })
            }
          />
        </>
      )}
      </>}
      {editorOpen && <>
      <section className="admin-form-panel admin-media-editor">
        <h3>{selected ? "编辑素材" : "新建素材"}</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pendingFile) return;
            void action.run(
              () =>
                selected
                  ? adminApi.patchAsset(
                      selected.id,
                      AdminAssetPatchSchema.parse(
                        action.intent("patch:" + selected.id, {
                          variant,
                          text:
                            kind === "copy" || kind === "script" ? text : null,
                          ...(upload?.status === "available"
                            ? { fileId: upload.id }
                            : {}),
                          expectedRevision: selected.revision,
                        }),
                      ),
                    )
                  : adminApi.createAsset(
                      AdminAssetCreateSchema.parse(
                        action.intent("create-asset", {
                          productVersionId: version,
                          platform,
                          kind,
                          variant,
                          text:
                            kind === "copy" || kind === "script" ? text : null,
                          fileId:
                            upload?.status === "available" ? upload.id : null,
                        }),
                      ),
                    ),
              (value) => {
                choose(value);
                changed();
              },
            );
          }}
        >
          <fieldset disabled={action.busy}>
            {!selected ? (
              <>
                <ProductVersionSelect
                  value={version}
                  onChange={(value) => {
                    setVersion(value);
                    setUpload(null);
                  }}
                />
                <label>
                  素材类别
                  <select
                    aria-label="素材类别"
                    value={kind}
                    onChange={(event) => {
                      setKind(event.target.value as Asset["kind"]);
                      setUpload(null);
                      setFile(null);
                    }}
                  >
                    {["cover", "video", "script", "copy"].map((value) => (
                      <option key={value} value={value}>
                        {
                          {
                            cover: "封面",
                            video: "视频",
                            script: "脚本",
                            copy: "文案",
                          }[value]
                        }
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <p>
                版本 {selected.productVersionId} · {selected.kind}
              </p>
            )}
            <label>
              平台
              <select
                aria-label="平台"
                value={platform}
                disabled={Boolean(selected)}
                onChange={(event) =>
                  setPlatform(event.target.value as Asset["platform"])
                }
              >
                {["manual", "douyin", "xiaohongshu"].map((value) => (
                  <option key={value} value={value}>{assetKinds[value] ?? assetPlatforms[value] ?? assetStatuses[value] ?? value}</option>
                ))}
              </select>
            </label>
            <label>
              变体名
              <input
                aria-label="变体名"
                value={variant}
                maxLength={40}
                required
                onChange={(event) => setVariant(event.target.value)}
              />
            </label>
            {kind === "script" || kind === "copy" ? (
              <label>
                文字内容
                <textarea
                  aria-label="文字内容"
                  maxLength={20000}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
            ) : (
              <>
                <label>
                  媒体文件
                  <input
                    aria-label="媒体文件"
                    key={
                      kind +
                      version +
                      (selected?.id ?? "") +
                      ":" +
                      (selected?.revision ?? "")
                    }
                    type="file"
                    accept={
                      kind === "cover"
                        ? "image/png,image/jpeg,image/webp"
                        : "video/mp4,video/webm"
                    }
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setUpload(null);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={action.busy || !file || !version}
                  onClick={() => void sendFile()}
                >
                  上传并校验
                </button>
                {upload && (
                  <>
                    <p role="status">
                      {upload.status === "available"
                        ? "文件已校验，可关联素材。"
                        : "上传状态：" + upload.status}
                    </p>
                    <div className="biz-row">
                      <button
                        type="button"
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(
                            () => adminApi.status(upload.id),
                            setUpload,
                          )
                        }
                      >
                        查询上传状态
                      </button>
                      {["failed", "expired"].includes(upload.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setUpload(null);
                            setFile(null);
                          }}
                        >
                          重新选择文件
                        </button>
                      )}
                    </div>
                  </>
                )}
                {(upload?.downloadPath || selected?.downloadPath) && (
                  <>
                    <p>
                      {upload?.downloadPath
                        ? "新文件预览（尚未保存到素材）"
                        : "当前已保存媒体预览"}
                    </p>
                    {kind === "video" ? (
                      <video
                        key={upload?.downloadPath ?? selected?.downloadPath}
                        controls
                        preload="metadata"
                        src={
                          upload?.downloadPath ?? selected?.downloadPath ?? ""
                        }
                      />
                    ) : (
                      <img
                        className="biz-cover"
                        alt="待审核封面预览"
                        src={
                          upload?.downloadPath ?? selected?.downloadPath ?? ""
                        }
                      />
                    )}
                  </>
                )}
                {pendingFile && <p>新文件尚未校验，请先上传并校验后保存。</p>}
              </>
            )}
            <button
              className="admin-primary"
              type="submit"
              disabled={
                action.busy ||
                !version ||
                pendingFile ||
                (media && !selected && upload?.status !== "available")
              }
            >
              {selected ? "保存素材修改" : "保存素材草稿"}
            </button>
          </fieldset>
        </form>
        <button type="button" disabled={action.busy} onClick={newAsset}>新建另一份素材</button>
        {selected && (
          <>
            <p>素材状态：{selected.status}</p>
            <p>
              修订 {selected.revision} · 文件 {selected.fileId ?? "无"}
            </p>
            <button
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () => adminApi.asset(selected.id),
                  (value) => {
                    choose(value);
                    changed();
                  },
                )
              }
            >
              刷新素材与修订
            </button>
            <small>刷新会替换尚未保存的表单与文件选择。</small>
            {dirty && <p>素材有未保存修改，请先保存后审核或采用。</p>}
            <div className="biz-row">
              {(["review", "ready", "archive"] as const).map((value) => (
                <button
                  className={value === "archive" ? "admin-danger" : undefined}
                  key={value}
                  disabled={
                    action.busy ||
                    dirty ||
                    (value === "review"
                      ? selected.status !== "draft"
                      : value === "ready"
                        ? selected.status !== "reviewed"
                        : selected.status === "archived")
                  }
                  onClick={() =>
                    void action.run(
                      () =>
                        adminApi.assetAction(
                          selected.id,
                          value,
                          action.intent(value + ":" + selected.id, {
                            expectedRevision: selected.revision,
                          }),
                        ),
                      (value) => {
                        setSelected(value);
                        changed();
                      },
                    )
                  }
                >
                  {
                    {
                      review: "审核素材",
                      ready: "标记就绪",
                      archive: "归档素材",
                    }[value]
                  }
                </button>
              ))}
              {selected.kind === "cover" && (
                <button
                  className="admin-primary"
                  disabled={action.busy || dirty || selected.status !== "ready"}
                  onClick={() =>
                    void action.run(
                      async () => {
                        const product = await findPublishedProduct(
                          selected.productVersionId,
                        );
                        if (!product)
                          throw new ClientError(
                            "CONFLICT",
                            "此素材不属于当前在售版本，请从商品管理页确认发布状态。",
                          );
                        const fresh = await adminApi.product(product.id);
                        return adminApi.cover(
                          product.id,
                          action.intent("cover:" + product.id, {
                            assetId: selected.id,
                            expectedRevision: fresh.revision,
                          }),
                        );
                      },
                      () => {
                        setNotice("已采用为当前商品封面。");
                        void client.invalidateQueries({ queryKey: ["public"] });
                      },
                    )
                  }
                >
                  采用为商品封面
                </button>
              )}
            </div>
          </>
        )}
        {notice && <p role="status">{notice}</p>}
      </section>
      </>}
      {Boolean(action.error) && (
        <Failure error={action.error} retry={changed} />
      )}
    </div>
  );
}
