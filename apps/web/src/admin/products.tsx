import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AdminProductInputSchema,
  ProductConfigurationSchema,
} from "@orai/contracts/admin";
import {
  adminApi,
  parseEditor,
  productMetadata,
  type AdminProduct,
} from "./api.js";
import { Failure, Loading, Pager, useAction } from "../business/shared.js";
import "./management.css";

const productStatuses: Record<string, string> = { draft: "草稿", reviewed: "已审核", published: "已发布", archived: "已下架" };
type Version = Awaited<ReturnType<typeof adminApi.importVersion>>;
export function Products({ scope }: { scope: "demo" | "live" }) {
  const headingRef = useRef<HTMLElement>(null);
  const [params, setParams] = useSearchParams(),
    client = useQueryClient(),
    action = useAction(),
    [current, setCurrent] = useState<AdminProduct | null>(null),
    [editorOpen, setEditorOpen] = useState(false),
    [activeTab, setActiveTab] = useState<"metadata" | "versions">("metadata"),
    [metadata, setMetadata] = useState(""),
    [recommendationOrder, setRecommendationOrder] = useState(0),
    [configuration, setConfiguration] = useState(""),
    [loaded, setLoaded] = useState(""),
    [version, setVersion] = useState<Version | null>(null),
    [versionPage, setVersionPage] = useState(1),
    [preview, setPreview] = useState<Awaited<
      ReturnType<typeof adminApi.preview>
    > | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => { headingRef.current?.scrollIntoView({ block: "start" }); }, [editorOpen, current?.id]);
  const list = useQuery({
    queryKey: ["private", "admin", "products", params.toString()],
    queryFn: ({ signal }) => adminApi.products(params.toString(), signal),
  });
  const categories = useQuery({
      queryKey: ["private", "admin", "categories"],
      queryFn: ({ signal }) => adminApi.categories(signal),
    }),
    tags = useQuery({
      queryKey: ["private", "admin", "tags"],
      queryFn: ({ signal }) => adminApi.tags(signal),
    });
  const versions = useQuery({
    queryKey: ["private", "admin", "versions", current?.id, versionPage],
    queryFn: ({ signal }) =>
      adminApi.versions(current!.id, versionPage, signal),
    enabled: Boolean(current),
  });
  function changed() {
    void client.invalidateQueries({
      queryKey: ["private", "admin", "products"],
    });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "versions"],
    });
    void client.invalidateQueries({
      queryKey: ["private", "admin", "overview"],
    });
    void client.invalidateQueries({ queryKey: ["public"] });
  }
  function choose(value: AdminProduct) {
    setEditorOpen(true);
    setActiveTab("metadata");
    setCurrent(value);
    setMetadata(JSON.stringify(productMetadata(value), null, 2));
    setRecommendationOrder(value.recommendationOrder);
    setVersion(null);
    setConfiguration("");
    setLoaded("");
    setPreview(null);
    setVersionPage(1);
    setNotice("");
  }
  function newProduct() {
    setEditorOpen(true);
    setActiveTab("metadata");
    setCurrent(null);
    setVersion(null);
    setPreview(null);
    setConfiguration("");
    setLoaded("");
    setRecommendationOrder(0);
    setNotice("");
    setMetadata(
      JSON.stringify(
        {
          slug: "",
          name: "",
          hook: "",
          summary: "",
          description: "",
          categoryId: categories.data?.items[0]?.id ?? "",
          tagIds: [],
          priceFen: 990,
          durationMinutes: 3,
          experienceType: "score",
          themeKey: "gentle",
          coverUrl: null,
          scope,
          recommended: false,
          publicSample: {
            label: "",
            summary: "",
            dimensions: [{ label: "", score: null }],
            suggestion: "",
            isDemo: scope === "demo",
          },
          purchaseUrl: null,
          purchaseNotice: "",
          redemptionNotice: "",
        },
        null,
        2,
      ),
    );
  }
  return (
    <div className="admin-management admin-products">
      <header ref={headingRef} className="admin-management-heading">
        <div><span className="admin-eyebrow">CATALOG / PRODUCTS</span>
          <h2>{editorOpen ? (current ? current.name : "新建商品") : "商品与版本"}</h2>
          <p>{editorOpen ? "维护商品资料与配置版本，审核后再发布。" : "管理商品资料、配置版本与发布状态。公开样例与私人报告分开保存。"}</p>
        </div>
        <div className="biz-row">
          {editorOpen ? <button type="button" disabled={action.busy} onClick={() => { setEditorOpen(false); setNotice(""); }}>返回商品列表</button> :
            <button className="admin-primary" type="button" disabled={action.busy} onClick={newProduct}>新建商品 <span aria-hidden="true">↗</span></button>}
        </div>
      </header>
      {!editorOpen && <>
      <form
        className="biz-row admin-filterbar"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setParams({
            query: String(form.get("query") ?? ""),
            ...(form.get("status")
              ? { status: String(form.get("status")) }
              : {}),
            page: "1",
          });
        }}
      >
        <label>
          搜索商品
          <input
            aria-label="搜索商品"
            name="query"
            maxLength={100}
            defaultValue={params.get("query") ?? ""}
          />
        </label>
        <label>
          商品状态
          <select
            aria-label="商品状态"
            name="status"
            defaultValue={params.get("status") ?? ""}
          >
            <option value="">全部</option>
            {["draft", "reviewed", "published", "archived"].map((value) => (
              <option key={value} value={value}>{productStatuses[value] ?? value}</option>
            ))}
          </select>
        </label>
        <button>筛选商品</button>
      </form>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <Failure error={list.error} retry={() => void list.refetch()} />
      ) : (
        <>
          <div className="admin-section-heading"><h3>全部商品</h3><span>{list.data.total} 个商品</span></div>
          <div className="biz-table-wrap admin-data-table">
            <table><thead><tr><th>商品名称</th><th>状态</th><th>价格</th><th>时长</th><th>修订</th><th><span className="admin-sr-only">操作</span></th></tr></thead>
              <tbody>{list.data.items.map((value) => <tr key={value.id}>
                <td><strong>{value.name}</strong><small className="admin-table-subtitle">{value.slug}</small></td>
                <td><span className="admin-status" data-status={value.status}>{productStatuses[value.status] ?? value.status}</span></td>
                <td>¥ {(value.priceFen / 100).toFixed(2)}</td><td>{value.durationMinutes} 分钟</td><td>r{value.revision}</td>
                <td><button className="admin-table-action" onClick={() => choose(value)} disabled={action.busy}>编辑商品 <span aria-hidden="true">↗</span></button></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!list.data.items.length && <div className="admin-empty-state"><h3>没有匹配的商品</h3><p>调整搜索条件，或创建第一份商品资料。</p></div>}
          <Pager
            {...list.data}
            onChange={(page) =>
              setParams({ ...Object.fromEntries(params), page: String(page) })
            }
          />
        </>
      )}
      </>}
      {editorOpen && (
        <section className="admin-editor-panel">
          {current && <div className="admin-editor-tabs" role="tablist" aria-label="商品编辑区域" onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "metadata" : event.key === "End" ? "versions" : activeTab === "metadata" ? "versions" : "metadata";
            setActiveTab(next);
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next === "metadata" ? 0 : 1]?.focus();
          }}>
            <button id="admin-product-metadata-tab" type="button" role="tab" tabIndex={activeTab === "metadata" ? 0 : -1} aria-controls="admin-product-metadata-panel" aria-selected={activeTab === "metadata"} onClick={() => setActiveTab("metadata")}>商品资料</button>
            <button id="admin-product-versions-tab" type="button" role="tab" tabIndex={activeTab === "versions" ? 0 : -1} aria-controls="admin-product-versions-panel" aria-selected={activeTab === "versions"} onClick={() => setActiveTab("versions")}>配置版本</button>
          </div>}
          {activeTab === "metadata" && <div className="admin-form-panel" id="admin-product-metadata-panel" role={current ? "tabpanel" : undefined} aria-labelledby={current ? "admin-product-metadata-tab" : undefined}>
          <div className="admin-section-heading"><h3>{current ? "商品资料" : "新增商品资料"}</h3>{current && <span>r{current.revision}</span>}</div>
          {current && (
            <>
              <p>
                商品状态：{current.status} · 修订 {current.revision}
              </p>
              <button
                disabled={action.busy}
                onClick={() =>
                  void action.run(() => adminApi.product(current.id), choose)
                }
              >
                刷新商品与修订
              </button>
              <p className="biz-note">
                刷新会重新读取服务器资料，替换当前表单草稿。
              </p>
            </>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(
                () => {
                  const data = parseEditor(AdminProductInputSchema, metadata);
                  if (!current)
                    return adminApi.createProduct(
                      action.intent("create-product", data),
                    );
                  const { slug: _slug, scope: _scope, ...fields } = data;
                  return adminApi.patchProduct(
                    current.id,
                    action.intent("metadata:" + current.id, {
                      ...fields,
                      recommendationOrder,
                      expectedRevision: current.revision,
                    }),
                  );
                },
                (value) => {
                  choose(value);
                  setNotice("商品资料已保存。");
                  changed();
                },
              );
            }}
          >
            <label>
              商品元数据 JSON
              <textarea
                aria-label="商品元数据 JSON"
                className="admin-code-editor"
                spellCheck={false}
                value={metadata}
                maxLength={100000}
                onChange={(event) => setMetadata(event.target.value)}
              />
            </label>
            <label>
              推荐排序
              <input
                aria-label="推荐排序"
                type="number"
                min="0"
                max="10000"
                value={recommendationOrder}
                onChange={(event) =>
                  setRecommendationOrder(Number(event.target.value))
                }
              />
            </label>
            <button className="admin-primary" disabled={action.busy} type="submit">
              {current ? "保存商品资料" : "创建商品"}
            </button>
          </form>
          </div>}
          {current && activeTab === "versions" && (
            <div className="admin-form-panel" id="admin-product-versions-panel" role="tabpanel" aria-labelledby="admin-product-versions-tab">
              <div className="admin-section-heading"><h3>配置版本</h3><span>审核后发布</span></div>
              {versions.isPending ? (
                <Loading />
              ) : versions.isError ? (
                <Failure
                  error={versions.error}
                  retry={() => void versions.refetch()}
                />
              ) : (
                <>
                  <div className="biz-row">
                    {versions.data?.items.map((value) => (
                      <button
                        key={value.id}
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(
                            () => adminApi.preview(current.id, value.id),
                            (result) => {
                              setVersion(result.version);
                              setPreview(result);
                              const text = JSON.stringify(
                                result.configuration,
                                null,
                                2,
                              );
                              setConfiguration(text);
                              setLoaded(text);
                              setNotice("已读取版本预览。");
                            },
                          )
                        }
                      >
                        预览版本 {value.number}（{value.status}）
                      </button>
                    ))}
                  </div>
                  {versions.data && (
                    <Pager {...versions.data} onChange={setVersionPage} />
                  )}
                </>
              )}
              <label>
                从 JSON 文件读取配置
                <input
                  aria-label="从 JSON 文件读取配置"
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void action.run(async () => {
                      if (file.size > 512 * 1024)
                        throw new Error("Configuration too large");
                      return file.text();
                    }, setConfiguration);
                  }}
                />
              </label>
              <label>
                题目与报告配置 JSON
                <textarea
                  aria-label="题目与报告配置 JSON"
                  className="admin-code-editor"
                  spellCheck={false}
                  value={configuration}
                  maxLength={524288}
                  onChange={(event) => setConfiguration(event.target.value)}
                />
              </label>
              <div className="biz-row">
                <button
                  className="admin-primary"
                  disabled={action.busy || !configuration}
                  onClick={() =>
                    void action.run(
                      () =>
                        adminApi.importVersion(
                          current.id,
                          action.intent("import:" + current.id, {
                            configuration: parseEditor(
                              ProductConfigurationSchema,
                              configuration,
                            ),
                          }),
                        ),
                      (value) => {
                        setVersion(value);
                        setPreview(null);
                        setLoaded(configuration);
                        setNotice("已导入新的草稿版本。");
                        changed();
                      },
                    )
                  }
                >
                  导入为新版本
                </button>
                {version && (
                  <button
                    disabled={
                      action.busy ||
                      !["draft", "reviewed"].includes(version.status) ||
                      configuration === loaded
                    }
                    onClick={() =>
                      void action.run(
                        () =>
                          adminApi.replaceVersion(
                            current.id,
                            version.id,
                            action.intent("replace:" + version.id, {
                              configuration: parseEditor(
                                ProductConfigurationSchema,
                                configuration,
                              ),
                              expectedRevision: version.revision,
                            }),
                          ),
                        (value) => {
                          setVersion(value);
                          setLoaded(configuration);
                          setPreview(null);
                          changed();
                        },
                      )
                    }
                  >
                    保存配置草稿
                  </button>
                )}
              </div>
              {version && (
                <>
                  <p>
                    版本 {version.number} · {version.status} · 修订{" "}
                    {version.revision}
                  </p>
                  {configuration !== loaded && (
                    <p>配置有未保存修改，请先保存或导入。</p>
                  )}
                  <div className="biz-row">
                    {(["review", "publish"] as const).map((command) => (
                      <button
                        className={command === "publish" ? "admin-primary" : undefined}
                        key={command}
                        disabled={
                          action.busy ||
                          configuration !== loaded ||
                          (command === "review"
                            ? !["draft", "reviewed"].includes(version.status)
                            : version.status !== "reviewed")
                        }
                        onClick={() =>
                          void action.run(
                            () =>
                              adminApi.versionAction(
                                current.id,
                                version.id,
                                command,
                                action.intent(command + ":" + version.id, {
                                  expectedRevision: version.revision,
                                }),
                              ),
                            (value) => {
                              setVersion(value);
                              setNotice(
                                command === "publish"
                                  ? "版本已发布，请刷新商品资料以继续编辑。"
                                  : "版本已审核。",
                              );
                              changed();
                            },
                          )
                        }
                      >
                        {command === "review" ? "审核版本" : "发布版本"}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {preview && (
                <details>
                  <summary>公开展示预览（尚未发布的版本仍不会公开）</summary>
                  <pre>{JSON.stringify(preview.publicView, null, 2)}</pre>
                </details>
              )}
              <button
                className="admin-danger"
                disabled={action.busy || current.status !== "published"}
                onClick={() =>
                  void action.run(
                    () =>
                      adminApi.archiveProduct(
                        current.id,
                        action.intent("archive:" + current.id, {}),
                      ),
                    () => {
                      setNotice("商品已下架，请刷新商品资料。");
                      changed();
                    },
                  )
                }
              >
                下架商品
              </button>
            </div>
          )}
        </section>
      )}
      <details className="admin-reference-details">
        <summary>分类与标签参考</summary>
        {categories.isError || tags.isError ? (
          <Failure error={categories.error ?? tags.error} />
        ) : (
          <>
            <h3>分类</h3>
            {categories.data?.items.map((value) => (
              <p key={value.id}>
                {value.name}：{value.id}
              </p>
            ))}
            <h3>标签</h3>
            {tags.data?.items.map((value) => (
              <p key={value.id}>
                {value.name}：{value.id}
              </p>
            ))}
          </>
        )}
      </details>
      {notice && <p role="status">{notice}</p>}
      {Boolean(action.error) && (
        <Failure error={action.error} retry={changed} />
      )}
    </div>
  );
}
