import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loading, Pager, useAction } from "../business/shared.js";
import { AdminFailure as Failure } from "./feedback.js";
import { AdminEmptyState, AdminListProgress } from "./feedback-view.js";
import { isAccessFailure, RefreshNotice } from "./refresh-notice.js";
import { AssetPreview } from "./asset-preview.js";
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
  const appliedKind = params.get("kind") ?? "", appliedPlatform = params.get("platform") ?? "", appliedStatus = params.get("status") ?? "";
  const [kindDraft, setKindDraft] = useState(appliedKind), [platformDraft, setPlatformDraft] = useState(appliedPlatform), [statusDraft, setStatusDraft] = useState(appliedStatus);
  useEffect(() => { setKindDraft(appliedKind); setPlatformDraft(appliedPlatform); setStatusDraft(appliedStatus); }, [appliedKind, appliedPlatform, appliedStatus]);
  useEffect(() => { headingRef.current?.scrollIntoView({ block: "start" }); }, [editorOpen, selected?.id]);
  const list = useQuery({
    queryKey: ["private", "admin", "assets", params.toString()],
    queryFn: ({ signal }) => adminApi.assets(params.toString(), signal),
    placeholderData: keepPreviousData,
  });
  const accessError = [list.error, action.error].find(isAccessFailure);
  const listData = accessError ? undefined : list.data;
  const filtered = Boolean(appliedKind || appliedPlatform || appliedStatus);
  function clearFilters() { setKindDraft(""); setPlatformDraft(""); setStatusDraft(""); setParams({}); }
  async function recoverAccess() {
    const result = await list.refetch();
    if (result.isSuccess) action.resetError();
  }
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
    action.resetError();
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
    action.resetError();
    setEditorOpen(true);
    setSelected(null);
    setFile(null);
    setUpload(null);
    setVariant("");
    setText("");
    setNotice("");
  }
  function returnToList() { action.resetError(); setNotice(""); setEditorOpen(false); }
  return (
    <div className="admin-management admin-assets">
      <header ref={headingRef} className="admin-management-heading">
        <div><h2>{editorOpen ? (selected ? selected.variant : "新建素材") : "素材与文件"}</h2>
          <p>{editorOpen ? "保存草稿、审核，再标记就绪。采用后的商品封面才会公开。" : "按版本、平台与状态管理封面、视频、脚本和文案。"}</p>
        </div>
        <div className="biz-row">{editorOpen ? <button type="button" disabled={action.busy || Boolean(accessError)} onClick={returnToList}>返回素材列表</button> :
          <button type="button" className="admin-primary" disabled={action.busy || Boolean(accessError)} onClick={newAsset}>新建素材 <span aria-hidden="true">↗</span></button>}
        </div>
      </header>
      {accessError ? <Failure area="assets" error={accessError} retry={() => void recoverAccess()} /> : <>
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
            value={kindDraft}
            onChange={event => setKindDraft(event.target.value)}
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
            value={platformDraft}
            onChange={event => setPlatformDraft(event.target.value)}
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
            value={statusDraft}
            onChange={event => setStatusDraft(event.target.value)}
          >
            <option value="">全部</option>
            {["draft", "reviewed", "ready", "archived"].map((value) => (
              <option key={value} value={value}>{assetKinds[value] ?? assetPlatforms[value] ?? assetStatuses[value] ?? value}</option>
            ))}
          </select>
        </label>
        <button>筛选素材</button>
        {filtered && <button type="button" onClick={clearFilters}>清除筛选</button>}
      </form>
      {!listData ? (
        list.isError ? <Failure area="assets" error={list.error} retry={() => void list.refetch()} /> :
          <div className="admin-list-loading"><Loading label="正在读取素材目录…" /></div>
      ) : (
        <section className="admin-list-results" aria-label="素材目录" aria-busy={list.isFetching}>
          {list.isError && <RefreshNotice busy={list.isFetching} retry={() => void list.refetch()} />}
          {list.isFetching && <AdminListProgress pending={list.isPlaceholderData} />}
          <div className="admin-section-heading"><h3>{filtered ? "筛选结果" : "全部素材"}</h3>
            <div className="admin-catalog-actions"><span>{listData.total} 份素材</span><button type="button" aria-label="更新素材目录" disabled={list.isFetching} onClick={() => void list.refetch()}>更新目录</button></div>
          </div>
          {listData.items.length > 0 ? <>
          <div className="admin-media-grid">
            {listData.items.map((value) => (
              <article className="admin-media-tile" key={value.id}>
                <div className="admin-media-thumbnail">
                  <AssetPreview asset={value} />
                </div>
                <div className="admin-media-caption">
                  <h3>{value.variant}</h3>
                  <p>{assetKinds[value.kind]} · {assetPlatforms[value.platform] ?? value.platform} · r{value.revision}</p>
                  <p className="admin-media-version"><span>商品版本</span><code>{value.productVersionId}</code></p>
                  <div className="biz-row"><span className="admin-status" data-status={value.status}>{assetStatuses[value.status] ?? value.status}</span>
                    <button className="admin-table-action" disabled={action.busy || list.isPlaceholderData} onClick={() => choose(value)}>编辑素材 <span aria-hidden="true">↗</span></button></div>
                </div>
              </article>
            ))}
          </div>
          <fieldset className="admin-list-pagination" disabled={list.isPlaceholderData}>
          <Pager
            {...listData}
            onChange={(page) =>
              setParams({ ...Object.fromEntries(params), page: String(page) })
            }
          />
          </fieldset>
          </> : <AdminEmptyState title={filtered ? "没有匹配的素材" : "还没有素材"}
            actions={filtered ? <button type="button" onClick={clearFilters}>清除筛选</button> : <button type="button" onClick={newAsset}>新建素材</button>}>
            {filtered ? "调整类别、平台或状态，也可以清除筛选查看全部素材。" : "先关联商品版本，再保存封面、视频、脚本或文案。"}
          </AdminEmptyState>}
        </section>
      )}
      </>}
      {editorOpen && <>
      <section className="admin-form-panel admin-media-editor">
        <div className="admin-section-heading"><h3>{selected ? "素材资料" : "填写素材资料"}</h3>{selected && <span className="admin-status" data-status={selected.status}>{assetStatuses[selected.status]} · r{selected.revision}</span>}</div>
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
                  area="assets"
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
              <p className="admin-media-fixed-version">固定商品版本 <code>{selected.productVersionId}</code> · {assetKinds[selected.kind]}</p>
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
                    <div className="admin-media-editor-preview"><AssetPreview asset={{ kind, variant, text, downloadPath: upload?.downloadPath ?? selected?.downloadPath ?? null }} /></div>
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
        {selected && <button type="button" disabled={action.busy} onClick={newAsset}>新建另一份素材</button>}
        {selected && (
          <>
            <p>素材状态：{assetStatuses[selected.status]}</p>
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
      </>}
      {Boolean(action.error) && (
        !accessError && <Failure area="assets" error={action.error} retry={changed} draft={editorOpen} onReturn={returnToList} />
      )}
    </div>
  );
}
