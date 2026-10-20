import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Failure, Loading, Pager } from "../business/shared.js";
import { adminApi } from "./api.js";
import { allPages, contentApi } from "./content-api.js";
import {
  capability,
  domains,
  platforms,
  statuses,
  stringField,
} from "./content-model.js";
import { ProfileEditor } from "./content-profile.js";
import { AssessmentDesk } from "./content-assessment.js";
import { AssetDesk } from "./content-assets.js";
import { PublicSampleEditor, SuitePreview } from "./content-preview.js";
import { ContentHistory, CreativeProfileDiff } from "./content-history.js";
import { AdoptionPanel } from "./content-adoption.js";
import { CleanupPanel } from "./content-cleanup.js";
import "./content.css";
export function ContentWorkbench() {
  return (
    <Routes>
      <Route index element={<ContentProducts />} />
      <Route path=":productId" element={<ProductWorkbench />} />
    </Routes>
  );
}
function ContentProducts() {
  const [params, setParams] = useSearchParams(),
    list = useQuery({
      queryKey: ["private", "admin", "content-products", params.toString()],
      queryFn: ({ signal }) => adminApi.products(params.toString(), signal),
    });
  return (
    <>
      <div className="content-section-heading">
        <div>
          <span className="content-eyebrow">CONTENT STUDIO</span>
          <h2>内容工作台</h2>
          <p>从共同设定出发，制作同一商品的题库、报告与传播内容。</p>
        </div>
        <Link to="/admin/products">管理商品资料</Link>
      </div>
      <form
        className="biz-row"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setParams({ query: String(form.get("query") ?? ""), page: "1" });
        }}
      >
        <label>
          搜索内容商品
          <input
            name="query"
            aria-label="搜索内容商品"
            maxLength={100}
            defaultValue={params.get("query") ?? ""}
          />
        </label>
        <button>查找商品</button>
      </form>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <Failure error={list.error} retry={() => void list.refetch()} />
      ) : (
        <>
          <div className="content-product-list">
            {list.data.items.map((product) => (
              <Link
                className="content-product-row"
                key={product.id}
                to={"/admin/content/" + product.id}
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.summary}</small>
                </span>
                <span className="content-badge">
                  {statuses[product.status]}
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          {list.data.total === 0 && (
            <p>没有匹配商品。可先到商品管理创建商品。</p>
          )}
          <Pager
            {...list.data}
            onChange={(page) =>
              setParams({ ...Object.fromEntries(params), page: String(page) })
            }
          />
        </>
      )}
    </>
  );
}
function ProductWorkbench() {
  const { productId = "" } = useParams(),
    client = useQueryClient(),
    [params, setParams] = useSearchParams();
  const remember = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const product = useQuery({
    queryKey: ["private", "admin", "content-product", productId],
    queryFn: ({ signal }) => adminApi.product(productId, signal),
    refetchOnWindowFocus: false,
  });
  const profiles = useQuery({
    queryKey: ["private", "admin", "content-profiles", productId],
    queryFn: ({ signal }) =>
      allPages((page) => contentApi.profiles(productId, page, signal)),
    refetchOnWindowFocus: false,
  });
  const versions = useQuery({
    queryKey: ["private", "admin", "content-versions", productId],
    queryFn: ({ signal }) =>
      allPages((page) => adminApi.versions(productId, page, signal)),
    refetchOnWindowFocus: false,
  });
  const [profileId, setProfileId] = useState<string | null>(
      params.get("profile"),
    ),
    [versionChoice, setVersionChoice] = useState<string | null>(
      params.get("version"),
    ),
    [tab, setTab] = useState(params.get("tab") ?? "profile"),
    [inspectionId, setInspectionId] = useState(""),
    [dirty, setDirty] = useState<Record<string, boolean>>({}),
    [navigationNotice, setNavigationNotice] = useState(""),
    [platform, setPlatform] = useState(""),
    [status, setStatus] = useState(""),
    [style, setStyle] = useState(""),
    [profileFilter, setProfileFilter] = useState("selected");
  const versionId =
    versionChoice === "new"
      ? ""
      : (versionChoice ??
        product.data?.currentVersionId ??
        versions.data?.[0]?.id ??
        "");
  const profile = profiles.data?.find(
    (value) => value.id === (profileId ?? profiles.data[0]?.id),
  );
  const rows = useQuery({
    queryKey: ["private", "admin", "content-heads", productId, versionId],
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
    enabled: !!versionId,
    refetchOnWindowFocus: false,
  });
  const hasDirty = Object.values(dirty).some(Boolean);
  const profileDirty = useCallback(
      (value: boolean) =>
        setDirty((current) => ({ ...current, profile: value })),
      [],
    ),
    assessmentDirty = useCallback(
      (value: boolean) =>
        setDirty((current) => ({ ...current, assessment: value })),
      [],
    ),
    coverDirty = useCallback(
      (value: boolean) => setDirty((current) => ({ ...current, cover: value })),
      [],
    ),
    videoDirty = useCallback(
      (value: boolean) => setDirty((current) => ({ ...current, video: value })),
      [],
    ),
    copyDirty = useCallback(
      (value: boolean) => setDirty((current) => ({ ...current, copy: value })),
      [],
    ),
    sampleDirty = useCallback(
      (value: boolean) =>
        setDirty((current) => ({ ...current, sample: value })),
      [],
    );
  useEffect(() => {
    if (!hasDirty) {
      setNavigationNotice("");
      return;
    }
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (
        link instanceof HTMLAnchorElement &&
        link.pathname !== location.pathname
      ) {
        event.preventDefault();
        event.stopPropagation();
        setNavigationNotice("请先保存或放弃工作台中的修改，再离开此商品。");
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [hasDirty]);
  function inspect(id: string) {
    setInspectionId(id);
    setTab("history");
    remember("tab", "history");
  }
  function refresh() {
    for (const key of [
      "content-history",
      "content-reference-options",
      "content-impact",
      "content-links",
      "content-adoption-options",
      "content-packages",
    ])
      void client.invalidateQueries({ queryKey: ["private", "admin", key] });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "content-heads", productId],
    });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "content-versions", productId],
    });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "content-source"],
    });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "overview"],
    });
  }
  function versionSaved(id: string) {
    setVersionChoice(id);
    remember("version", id);
    void client.invalidateQueries({
      queryKey: ["private", "admin", "content-config", productId, id],
    });
    refresh();
  }
  if (product.isPending || profiles.isPending || versions.isPending)
    return <Loading />;
  if (product.isError || profiles.isError || versions.isError)
    return (
      <Failure
        error={product.error ?? profiles.error ?? versions.error}
        retry={() => {
          void product.refetch();
          void profiles.refetch();
          void versions.refetch();
        }}
      />
    );
  const all = rows.data ?? [],
    visible = all.filter(
      (row) =>
        (!platform || row.snapshot.platform === platform) &&
        (!status || row.snapshot.status === status) &&
        (profileFilter === "all" ||
          row.domain === "assessment" ||
          row.creativeProfileRevisionId === profile?.id) &&
        (!style ||
          profiles.data
            .find((value) => value.id === row.creativeProfileRevisionId)
            ?.profile.visual.includes(style)),
    );
  const selectedRows = all.filter(
    (row) =>
      row.domain === "assessment" ||
      (row.creativeProfileRevisionId === profile?.id &&
        row.snapshot.status !== "archived"),
  );
  const callbacks = { cover: coverDirty, video: videoDirty, copy: copyDirty };
  return (
    <div className="content-workbench">
      <Link to="/admin/content">← 全部内容商品</Link>
      <div className="content-section-heading">
        <div>
          <span className="content-eyebrow">CONTENT STUDIO</span>
          <h2>{product.data.name}</h2>
          <p>{capability(profile?.profile)}</p>
        </div>
        <span className="content-badge">
          {product.data.scope === "demo" ? "演示范围" : "正式范围"}
        </span>
      </div>
      <div className="content-controls">
        <label>
          题库版本
          <select
            aria-label="工作台题库版本"
            disabled={hasDirty}
            value={versionId || "new"}
            onChange={(event) => {
              setVersionChoice(event.target.value);
              remember("version", event.target.value);
            }}
          >
            {versions.data.map((value) => (
              <option key={value.id} value={value.id}>
                v{value.number} · {statuses[value.status]}
              </option>
            ))}
            <option value="new">建立新版本</option>
          </select>
        </label>
        <label>
          共同创作设定
          <select
            aria-label="共同创作设定"
            disabled={hasDirty}
            value={profile?.id ?? ""}
            onChange={(event) => {
              setProfileId(event.target.value);
              remember("profile", event.target.value);
            }}
          >
            {profiles.data.length === 0 && (
              <option value="">请先保存设定</option>
            )}
            {profiles.data.map((value) => (
              <option key={value.id} value={value.id}>
                r{value.revision} · {value.profile.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hasDirty && (
        <p className="content-note">
          有未保存修改。页签间可切换；保存或放弃后可切换版本、设定与稿件。
        </p>
      )}
      {navigationNotice && <p role="alert">{navigationNotice}</p>}
      <div className="content-readiness" aria-label="四类内容齐备情况">
        {(Object.keys(domains) as (keyof typeof domains)[]).map((domain) => {
          const items = selectedRows.filter((value) => value.domain === domain),
            complete =
              domain === "assessment"
                ? items.length > 0
                : domain === "copy"
                  ? items.some((value) => !!value.snapshot.authoring)
                  : items.some((value) => value.storage.deliveryUploaded);
          return (
            <div key={domain}>
              <strong>{domains[domain]}</strong>
              <span className={complete ? "is-complete" : ""}>
                {items.length === 0
                  ? "待制作"
                  : complete
                    ? "可预览"
                    : "草稿 / 待正式文件"}
              </span>
              <small>{items.length} 份当前稿</small>
            </div>
          );
        })}
      </div>
      <nav className="content-tabs" aria-label="内容工作台页签">
        {Object.entries({
          profile: "创作设定",
          ...domains,
          preview: "整套预览",
          history: "引用与历史",
          adoption: "成套采用",
          cleanup: "文件清理",
        }).map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => {
              setTab(key);
              remember("tab", key);
            }}
          >
            {label}
            {dirty[key] ? " ·" : ""}
          </button>
        ))}
      </nav>
      {rows.isError && (
        <Failure error={rows.error} retry={() => void rows.refetch()} />
      )}
      {rows.isPending && !!versionId && <Loading />}
      <div hidden={tab !== "profile"}>
        <ProfileEditor
          key={profile?.id ?? "new"}
          product={product.data}
          selected={profile}
          latestRevision={profiles.data[0]?.revision ?? 0}
          onDirty={profileDirty}
          onSaved={(value) => {
            client.setQueryData(
              ["private", "admin", "content-profiles", productId],
              [value, ...profiles.data],
            );
            setProfileId(value.id);
            remember("profile", value.id);
            refresh();
          }}
        />
        <CreativeProfileDiff
          fromId={profile?.id}
          toId={profiles.data.find((row) => row.id !== profile?.id)?.id}
          active={tab === "profile"}
        />
      </div>
      <div hidden={tab !== "assessment"}>
        <AssessmentDesk
          key={versionId}
          product={product.data}
          versionId={versionId}
          profile={profile}
          assessment={all.find((value) => value.domain === "assessment")}
          onVersionSaved={versionSaved}
          onDirty={assessmentDirty}
        />
        <PublicSampleEditor
          key={product.data.revision}
          product={product.data}
          onDirty={sampleDirty}
          onSaved={() => {
            void product.refetch();
            void client.invalidateQueries({ queryKey: ["public"] });
          }}
        />
      </div>
      <div
        hidden={!["cover", "video", "copy"].includes(tab)}
        className="content-filters"
      >
        <label>
          平台筛选
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          >
            <option value="">全部平台</option>
            {Object.entries(platforms).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          状态筛选
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">全部状态</option>
            {Object.entries(statuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          设定范围
          <select
            value={profileFilter}
            onChange={(event) => setProfileFilter(event.target.value)}
          >
            <option value="selected">所选设定</option>
            <option value="all">全部设定</option>
          </select>
        </label>
        <label>
          视觉风格关键词
          <input
            maxLength={100}
            value={style}
            onChange={(event) => setStyle(event.target.value)}
          />
        </label>
      </div>
      {(["cover", "video", "copy"] as const).map((domain) => (
        <div key={domain} hidden={tab !== domain}>
          {!profile ? (
            <p>请先保存共同创作设定。</p>
          ) : !versionId ? (
            <p>请先在题库与报告页签建立题库版本。</p>
          ) : (
            <AssetDesk
              key={versionId + profile.id}
              domain={domain}
              productId={productId}
              active={tab === domain}
              onInspect={inspect}
              productVersionId={versionId}
              profile={profile}
              rows={visible}
              onSaved={refresh}
              onDirty={callbacks[domain]}
            />
          )}
        </div>
      ))}
      <div hidden={tab !== "history"}>
        <ContentHistory
          productId={productId}
          active={tab === "history"}
          initialId={inspectionId}
          onInspected={setInspectionId}
        />
      </div>
      <div hidden={tab !== "adoption"}>
        <AdoptionPanel
          key={versionId + profile?.id}
          productId={productId}
          versionId={versionId}
          profile={profile}
          assessment={all.find((row) => row.domain === "assessment")}
          active={tab === "adoption"}
          blockedByDraft={hasDirty}
          onVersionReviewed={() => versionSaved(versionId)}
          onInspect={inspect}
          onChanged={refresh}
        />
      </div>
      <div hidden={tab !== "cleanup"}>
        <CleanupPanel productId={productId} active={tab === "cleanup"} />
      </div>
      <div hidden={tab !== "preview"}>
        <SuitePreview
          key={
            profile?.id +
            ":" +
            all.map((value) => value.id).join(",") +
            ":" +
            product.data.revision
          }
          product={product.data}
          profile={profile}
          rows={all}
        />
      </div>
    </div>
  );
}
