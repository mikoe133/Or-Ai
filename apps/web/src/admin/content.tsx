import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Loading, Pager } from "../business/shared.js";
import { AdminFailure as Failure } from "./feedback.js";
import { AdminEmptyState, AdminListProgress } from "./feedback-view.js";
import { RefreshNotice } from "./refresh-notice.js";
import { productStatusLabels } from "./catalog-model.js";
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
import { ContentSkills } from './content-skills.js';
import { ExperienceDesk } from './content-experience.js';
import { productCapabilities } from '@orai/contracts/admin';
import { experienceApi } from './experience-api.js';
import { ContentCapabilities } from './content-capabilities.js';
import { isAccessFailure } from '../api/access-verification.js';
import "./content.css";
const ProjectWorkspace = lazy(() => import('./project-workspace.js').then(module => ({ default: module.ProjectWorkspace })));
const workbenchTabs = {
  project: '项目工作区', profile: '创作设定', skills: 'skill 组合', assessment: '商品内容',
  experience: '体验设计', result: '结果交付', cover: domains.cover, video: domains.video, copy: domains.copy,
  preview: '整套预览', history: '引用与历史', adoption: '成套采用', cleanup: '文件清理',
};
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
      placeholderData: keepPreviousData,
    });
  const appliedQuery = params.get("query") ?? "";
  const [queryDraft, setQueryDraft] = useState(appliedQuery);
  useEffect(() => setQueryDraft(appliedQuery), [appliedQuery]);
  const data = isAccessFailure(list.error) ? undefined : list.data;
  function clearFilters() { setQueryDraft(""); setParams({}); }
  return (
    <section className="content-index" aria-label="内容商品目录">
      <div className="content-section-heading">
        <div>
          <h2>内容工作台</h2>
          <p>从共同设定出发，组织商品内容、交互体验、结果交付与传播内容。</p>
        </div>
        <Link to="/admin/products">管理商品资料</Link>
      </div>
      <form
        className="biz-row content-index-search"
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
            placeholder="按商品名称或关键词查找"
            value={queryDraft}
            onChange={event => setQueryDraft(event.target.value)}
          />
        </label>
        <button>查找商品</button>
        {appliedQuery && <button type="button" onClick={clearFilters}>清除筛选</button>}
      </form>
      {!data ? (
        list.isError ? <Failure error={list.error} retry={() => void list.refetch()} /> :
          <div className="admin-list-loading"><Loading label="正在读取内容目录…" /></div>
      ) : (
        <section className="admin-list-results" aria-label="内容目录" aria-busy={list.isFetching}>
          {list.isError && <RefreshNotice busy={list.isFetching} retry={() => void list.refetch()} />}
          {list.isFetching && <AdminListProgress pending={list.isPlaceholderData} />}
          <div className="content-directory-heading"><h3>{appliedQuery ? "筛选结果" : "全部内容商品"}</h3>
            <div className="admin-catalog-actions"><span>{data.total} 个商品</span><button type="button" aria-label="更新内容目录" disabled={list.isFetching} onClick={() => void list.refetch()}>更新目录</button></div>
          </div>
          {data.items.length > 0 ? <>
          <div className="content-list-caption" aria-hidden="true">
            <span>商品 / 创作入口</span><span>当前状态</span><span />
          </div>
          <div className="content-product-list" inert={list.isPlaceholderData || undefined}>
            {data.items.map((product) => (
              <Link
                className="content-product-row"
                key={product.id}
                to={"/admin/content/" + product.id}
                aria-disabled={list.isPlaceholderData || undefined}
                tabIndex={list.isPlaceholderData ? -1 : undefined}
                onClick={event => { if (list.isPlaceholderData) event.preventDefault(); }}
              >
                <span className="content-product-name">
                  <strong>{product.name}</strong>
                  <small>{product.summary}</small>
                </span>
                <span className="content-badge" data-status={product.status}>
                  {productStatusLabels[product.status] ?? product.status}
                </span>
                <span className="content-product-enter">进入工作台 <span aria-hidden="true">↗</span></span>
              </Link>
            ))}
          </div>
          <fieldset className="admin-list-pagination" disabled={list.isPlaceholderData}>
          <Pager
            {...data}
            onChange={(page) =>
              setParams({ ...Object.fromEntries(params), page: String(page) })
            }
          />
          </fieldset>
          </> : <AdminEmptyState title={appliedQuery ? "没有匹配的内容商品" : "还没有内容商品"}
            actions={appliedQuery ? <button type="button" onClick={clearFilters}>清除筛选</button> : <Link className="biz-button" to="/admin/products">建立商品资料</Link>}>
            {appliedQuery ? "试试其他关键词，或清除筛选查看全部内容目录。" : "建立商品后，可以在这里组织创作设定、体验、报告与传播内容。"}
          </AdminEmptyState>}
        </section>
      )}
    </section>
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
    [tab, setTab] = useState(() => {
      const value = params.get("tab");
      return value && Object.hasOwn(workbenchTabs, value) ? value : (params.has('version') || params.has('profile') ? 'profile' : 'project');
    }),
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
  const experience = useQuery({
    queryKey: ['private', 'admin', 'experience', productId, versionId, profile?.id],
    enabled: !!versionId && tab !== 'project',
    queryFn: ({ signal }) => experienceApi.workspace(productId, versionId, profile?.id, signal),
    refetchOnWindowFocus: false,
  });
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
    enabled: !!versionId && tab !== 'project',
    refetchOnWindowFocus: false,
  });
  const hasDirty = Object.values(dirty).some(Boolean);
  function changeTab(key: string) {
    if (dirty.cleanup && key !== 'cleanup') {
      setNavigationNotice('清理请求尚未确认，请先核对原请求再切换页签。');
      return;
    }
    if (dirty.project && key !== 'project') {
      setNavigationNotice('请先保存或放弃项目规划，再切换页签。');
      return;
    }
    setTab(key);
    remember("tab", key);
  }
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = tabsRef.current;
    if (!node) return;
    const reveal = () => {
      const selected = node.querySelector<HTMLElement>('[aria-current="page"]');
      if (!selected) return;
      const host = node.getBoundingClientRect(), item = selected.getBoundingClientRect();
      if (item.left < host.left) node.scrollLeft += item.left - host.left - 8;
      else if (item.right > host.right) node.scrollLeft += item.right - host.right + 8;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(node);
    return () => observer.disconnect();
  }, [tab, product.data?.id, profiles.data?.length, versions.data?.length]);
  const skillsDirty = useCallback((value: boolean) => setDirty(current => ({ ...current, skills: value })), []);
  const projectDirty = useCallback((value:boolean)=>setDirty(current=>({...current,project:value})),[]);
  const cleanupDirty = useCallback((value:boolean)=>setDirty(current=>({...current,cleanup:value})),[]);
  const experienceDirty = useCallback((value: boolean) => setDirty(current => ({ ...current, experience: value })), []);
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
        setNavigationNotice(dirty.cleanup ? "清理结果尚未确认，请先核对原请求再离开此商品。" : "请先保存或放弃工作台中的修改，再离开此商品。");
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [hasDirty, dirty.cleanup]);
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
      "experience",
      "experience-history",
      "project-workspace",
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
  if ((product.isPending && !product.data) || (profiles.isPending && !profiles.data) || (versions.isPending && !versions.data))
    return <Loading />;
  const contextErrors = [product.error, profiles.error, versions.error].filter(Boolean);
  const contextError = contextErrors.find(isAccessFailure) ?? contextErrors[0];
  const accessError = [...contextErrors, ...(tab === 'project' ? [] : [rows.error, experience.error])].find(isAccessFailure);
  if (!product.data || !profiles.data || !versions.data || accessError)
    return (
      <Failure
        error={accessError ?? contextError}
        retry={() => {
          void product.refetch();
          void profiles.refetch();
          void versions.refetch();
          if (versionId && tab !== 'project') { void rows.refetch(); void experience.refetch(); }
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
  const currentVersion = versions.data.find((value) => value.id === versionId);
  const capabilities = experience.data?.capabilities ?? productCapabilities({
    profile: profile?.profile, profileRevisionId: profile?.id, hasContentVersion: !!versionId, capabilityVersion: 2,
  });
  const fixedProfile = capabilities.profileRevisionId ? profiles.data.find(value => value.id === capabilities.profileRevisionId) : profile;
  const capabilityPending = !!versionId && !experience.data;
  const contentEditable = !capabilityPending && capabilities.modules.content === 'editable';
  return (
    <div className="content-workbench">
      <Link className="content-back" to="/admin/content">← 全部内容商品</Link>
      {contextError && <Failure error={contextError} retry={() => {
        void product.refetch(); void profiles.refetch(); void versions.refetch();
      }} />}
      <div className="content-context-bar" hidden={tab === 'project'}>
      <div className="content-section-heading">
        <div>
          <h2>{product.data.name}</h2>
          <p>{capability(profile?.profile)}</p>
        </div>
        <span className="content-badge">
          {product.data.scope === "demo" ? "演示范围" : "正式范围"}
        </span>
      </div>
      <div className="content-controls" hidden={tab === 'project'}>
        <label>
          内容版本 · 单选 v1
          <select
            aria-label="工作台内容版本"
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
            <option value="new">建立单选内容版本</option>
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
      </div>
      {hasDirty && (
        <p className="content-note">
          {dirty.cleanup?'清理结果尚未确认。请先核对原请求，再切换页签、版本或离开。':dirty.project?'项目规划有未保存修改。保存或放弃后可切换页签和版本。':'有未保存修改。页签间可切换；保存或放弃后可切换版本、设定与稿件。'}
        </p>
      )}
      {navigationNotice && <p role="alert">{navigationNotice}</p>}
      <label className="content-mobile-navigation">
        当前工作区
        <select aria-label="切换内容工作区" value={tab} onChange={event => changeTab(event.target.value)}>
          {Object.entries(workbenchTabs).map(([key, label]) => <option key={key} value={key}>{label}{dirty[key] ? key === 'cleanup' ? " · 结果待核对" : " · 有未保存修改" : ""}</option>)}
        </select>
      </label>
      <nav ref={tabsRef} className="content-tabs" aria-label="内容工作台页签">
        {Object.entries(workbenchTabs).map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => changeTab(key)}
          >
            {label}
            {(dirty[key] || (key === 'result' && (dirty.assessment || dirty.experience || dirty.sample))) ? " ·" : ""}
          </button>
        ))}
      </nav>
      {rows.isError && tab !== 'project' && (
        <Failure error={rows.error} retry={() => void rows.refetch()} />
      )}
      {rows.isPending && !!versionId && tab !== 'project' && <Loading />}
      {tab === 'project' && <Suspense fallback={<Loading />}><ProjectWorkspace productId={productId} productName={product.data.name} initialProfile={profile??null} onDirty={projectDirty}
        onEdit={value=>{if(dirty.project){setNavigationNotice('请先保存或放弃项目规划，再打开内容编辑。');return;}setTab(value);remember('tab',value);}} /></Suspense>}
      <div className="content-workspace" hidden={tab === 'project'}>
      <div className="content-workspace-main">
      {experience.isError && <Failure error={experience.error} retry={() => void experience.refetch()} />}
      {!capabilityPending && <ContentCapabilities value={capabilities} selectedProfile={profile} fixedProfile={fixedProfile} hasVersion={!!versionId} />}
      {capabilityPending && !experience.isError && <p role="status" className="content-note">正在读取此版本的制作能力…</p>}
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
      <div hidden={tab !== "assessment" && tab !== 'result'}>
        {!contentEditable && !capabilityPending && <p className="content-note">{versionId
          ? '此设定超出当前运行能力。已有单选内容与结果保留为只读；可先继续完善创作设定和制作计划。'
          : '此形式的内容与结果编辑器尚未实现。请先在创作设定和项目工作区完善方案。'}</p>}
        {(!!versionId || contentEditable) && <AssessmentDesk
          key={versionId}
          product={product.data}
          versionId={versionId}
          profile={fixedProfile}
          view={tab === 'result' ? 'result' : 'content'}
          readOnly={!contentEditable}
          assessment={all.find((value) => value.domain === "assessment")}
          onVersionSaved={versionSaved}
          onDirty={assessmentDirty}
        />}
      </div>
      <div hidden={tab !== 'result' || (!versionId && !contentEditable)}>
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
      <div hidden={tab !== 'skills'}><ContentSkills profile={profile} active={tab === 'skills'} onDirty={skillsDirty} /></div>
      <div hidden={tab !== 'experience' && tab !== 'result'}><ExperienceDesk key={versionId+':'+profile?.id} productId={productId} versionId={versionId} profile={profile}
        active={tab==='experience'||tab==='result'} view={tab === 'result' ? 'result' : 'experience'} contentDirty={!!dirty.assessment} onDirty={experienceDirty} onChanged={refresh}/></div>
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
            <p>请先在商品内容页签建立受支持的内容版本。当前使用单选内容协议。</p>
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
        <CleanupPanel key={productId} productId={productId} active={tab === "cleanup"} onDirty={cleanupDirty} />
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
      <aside className="content-inspector" aria-label="当前创作上下文">
        <div className="content-inspector-title">
          <h3>制作依据</h3>
        </div>
        <dl className="content-context-facts">
          <div><dt>内容版本 · 单选</dt><dd>{currentVersion ? `v${currentVersion.number} · ${statuses[currentVersion.status]}` : "尚未建立"}</dd></div>
          <div><dt>共同创作设定</dt><dd>{profile ? `r${profile.revision} · ${profile.profile.title}` : "尚未保存"}</dd></div>
          <div><dt>保存状态</dt><dd className={hasDirty ? "content-pending" : ""}>{dirty.cleanup ? "清理结果待核对" : hasDirty ? "有未保存修改" : "无未保存修改"}</dd></div>
        </dl>
        <h4>四类内容</h4>
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
                <small>{items.length} 份</small>
                <span className={complete ? "is-complete" : ""}>
                  {rows.isPending && versionId ? "读取中" : rows.isError ? "读取失败" : items.length === 0 ? "待制作" : complete ? "可预览" : "草稿 / 待正式文件"}
                </span>
              </div>
            );
          })}
        </div>
        {profile && <>
          <h4>共同目标</h4>
          <dl className="content-context-goals">
            <div><dt>情绪感受</dt><dd>{profile.profile.emotionalGoal}</dd></div>
            <div><dt>加深理解</dt><dd>{profile.profile.understandingGoal}</dd></div>
            <div><dt>语言风格</dt><dd>{profile.profile.language}</dd></div>
          </dl>
        </>}
        <p className="content-inspector-note">各稿件固定引用保存时的设定、内容与 skill 版本。单选题库属于当前内容协议；更新后可在「引用与历史」核对影响。</p>
      </aside>
      </div>
    </div>
  );
}
