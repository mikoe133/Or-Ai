import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ProductCardDto } from '@orai/contracts';
import { consumer } from '../api/consumer.js';
import { Icon, type IconName } from '../store/icons';
import { categories as designCategories } from '../store/catalog';
import { catalogSearch, changeCatalogSearch } from './model.js';
import { Loading, Failure, Pager } from './shared.js';
import './storefront.css';

function CatalogCard({ product, compact = false }: { product: ProductCardDto; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const tone = product.category.slug === 'work' ? 'teal'
    : product.category.slug === 'relationships' ? 'lavender'
    : product.category.slug === 'fun' ? 'blush' : 'periwinkle';
  useEffect(() => { setFailed(false); }, [product.coverUrl]);
  // Replace seed placeholders with design artwork; keep published custom covers.
  const cover = !product.coverUrl || product.coverUrl.startsWith('/demo/') || failed
    ? `/assets/store/featured-${tone}.png` : product.coverUrl;
  return <article className="catalog-product">
    <Link to={`/products/${product.slug}`} className={`store-product${compact ? ' store-product-compact' : ''} tone-${tone}`} title={product.name}>
      <img className={compact ? 'catalog-mini-art' : 'store-product-art'} src={cover} alt="" loading={compact ? 'lazy' : 'eager'} onError={() => setFailed(true)} />
      {product.isDemo && !compact && <span className="catalog-demo-badge">演示体验</span>}
      <span className="store-product-copy">
        <h2 className="store-product-title">{product.name}</h2>
        <span className="store-product-hook">{compact ? `${product.questionCount} 道题 · 约 ${product.durationMinutes} 分钟` : product.hook}</span>
        {!compact && <span className="catalog-card-meta">{product.questionCount} 道题 · 约 {product.durationMinutes} 分钟</span>}
        <span className="store-product-cta"><span className="store-price">¥ {(product.price.amountFen / 100).toFixed(2)}</span><span className="store-view-label">{product.price.isTestPrice ? '测试价格' : '查看测试'}</span><Icon name="arrow" size={12} /></span>
      </span>
    </Link>
  </article>;
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  let invalid: unknown = null;
  try { catalogSearch(params); } catch (error) { invalid = error; }
  const search = params.toString();
  const browsing = !search;
  const result = useQuery({ queryKey: ['public', 'catalog', search], queryFn: ({ signal }) => consumer.catalog(search, signal), enabled: !invalid });
  const featured = useQuery({ queryKey: ['public', 'catalog', 'sort=recommended&pageSize=4'], queryFn: ({ signal }) => consumer.catalog('sort=recommended&pageSize=4', signal), enabled: browsing });
  const categories = useQuery({ queryKey: ['public', 'categories'], queryFn: ({ signal }) => consumer.categories(signal) });
  const tags = useQuery({ queryKey: ['public', 'tags'], queryFn: ({ signal }) => consumer.tags(signal) });
  useEffect(() => { document.title = '发现有趣的自己 · MeetMyWorld'; }, []);
  useEffect(() => { document.getElementById('flow-content')?.scrollTo(0, 0); }, [search]);
  function selectCategory(category: string) {
    setParams(changeCatalogSearch(params, { category }));
  }
  function randomProduct() {
    const items = result.data?.items;
    if (!items?.length) return;
    const random = crypto.getRandomValues(new Uint32Array(1))[0]!;
    navigate(`/products/${items[random % items.length]!.slug}`);
  }
  return <>
    <div className="catalog-toolbar store-toolbar">
      <nav className="store-filters" aria-label="商品分类">
        <button type="button" className={!params.has('category') ? 'is-selected' : ''} aria-pressed={!params.has('category')} onClick={() => selectCategory('')}>全部</button>
        {categories.data?.map(category => <button key={category.id} type="button" className={params.get('category') === category.slug ? 'is-selected' : ''} aria-pressed={params.get('category') === category.slug} onClick={() => selectCategory(category.slug)}>{category.name}</button>)}
      </nav>
      <div className="store-quick-actions">
        <Link to="/apps" className="store-button store-button-secondary">继续上次测试<Icon name="clock" size={18} /></Link>
        <button type="button" className="store-button store-button-primary" onClick={randomProduct} disabled={!result.data?.items.length}>随机发现<Icon name="sparkles" size={18} /></button>
      </div>
    </div>
    <details className="catalog-filter-panel" open={invalid ? true : undefined}>
      <summary><Icon name="search" size={16} /><span>搜索与筛选</span><span>{params.get('q') || (search ? '已应用筛选' : '按关键词、价格或时长探索')}<Icon name="chevron" size={14} /></span></summary>
      <form
        key={search}
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const next = changeCatalogSearch(params, {
            q: String(fields.get("q") ?? "").trim(),
            category: String(fields.get("category") ?? ""),
            sort: String(fields.get("sort") ?? "latest"),
            tags: fields.getAll("tags").map(String).join(","),
            minPriceFen: fields.get("minPrice")
              ? String(Math.round(Number(fields.get("minPrice")) * 100))
              : "",
            maxPriceFen: fields.get("maxPrice")
              ? String(Math.round(Number(fields.get("maxPrice")) * 100))
              : "",
            minDurationMinutes: String(fields.get("minDurationMinutes") ?? ""),
            maxDurationMinutes: String(fields.get("maxDurationMinutes") ?? ""),
            experienceType: String(fields.get("experienceType") ?? ""),
            pageSize: String(fields.get("pageSize") ?? 20),
          });
          setParams(next);
        }}
      >
        <div className="biz-grid">
          <label>
            搜索测试
            <input
              aria-label="搜索测试"
              name="q"
              type="search"
              maxLength={100}
              defaultValue={params.get("q") ?? ""}
            />
          </label>
          <label>
            商品分类
            <select
              aria-label="商品分类"
              name="category"
              defaultValue={params.get("category") ?? ""}
            >
              <option value="">全部</option>
              {categories.data?.map((value) => (
                <option key={value.id} value={value.slug}>
                  {value.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            排序
            <select
              aria-label="排序"
              name="sort"
              defaultValue={params.get("sort") ?? "latest"}
            >
              <option value="latest">最新优先</option>
              <option value="recommended">推荐优先</option>
            </select>
          </label>
        </div>
        <details>
          <summary>更多筛选</summary>
          <div className="biz-grid">
            <label>
              最低价格（元）
              <input
                aria-label="最低价格（元）"
                name="minPrice"
                type="number"
                min="0"
                max="100000"
                step=".01"
                defaultValue={
                  params.has("minPriceFen")
                    ? Number(params.get("minPriceFen")) / 100
                    : ""
                }
              />
            </label>
            <label>
              最高价格（元）
              <input
                aria-label="最高价格（元）"
                name="maxPrice"
                type="number"
                min="0"
                max="100000"
                step=".01"
                defaultValue={
                  params.has("maxPriceFen")
                    ? Number(params.get("maxPriceFen")) / 100
                    : ""
                }
              />
            </label>
            <label>
              最短时长（分钟）
              <input
                aria-label="最短时长（分钟）"
                name="minDurationMinutes"
                type="number"
                min="1"
                max="120"
                defaultValue={params.get("minDurationMinutes") ?? ""}
              />
            </label>
            <label>
              最长时长（分钟）
              <input
                aria-label="最长时长（分钟）"
                name="maxDurationMinutes"
                type="number"
                min="1"
                max="120"
                defaultValue={params.get("maxDurationMinutes") ?? ""}
              />
            </label>
            <label>
              结果形式
              <select
                aria-label="结果形式"
                name="experienceType"
                defaultValue={params.get("experienceType") ?? ""}
              >
                <option value="">全部</option>
                <option value="score">分数观察</option>
                <option value="tendency">倾向观察</option>
              </select>
            </label>
            <label>
              每页数量
              <select
                aria-label="每页数量"
                name="pageSize"
                defaultValue={params.get("pageSize") ?? "20"}
              >
                {[1, 10, 20, 50].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>标签（同时满足）</legend>
            {tags.data?.map((value) => (
              <label key={value.id} className="biz-option">
                <input
                  name="tags"
                  type="checkbox"
                  value={value.slug}
                  defaultChecked={(params.get("tags") ?? "")
                    .split(",")
                    .includes(value.slug)}
                />
                {value.name}
              </label>
            ))}
          </fieldset>
        </details>
        <div className="biz-row">
          <button type="submit">应用筛选</button>
          <button type="button" onClick={() => setParams({})}>
            重置筛选
          </button>
        </div>
      </form>
    </details>
    {(categories.isError || tags.isError) && <Failure error={categories.error ?? tags.error} retry={() => { void categories.refetch(); void tags.refetch(); }} />}
    {invalid ? <Failure error={invalid} retry={() => setParams({})} /> : result.isPending ? <Loading /> : result.isError ? <Failure error={result.error} retry={() => void result.refetch()} /> : <>
      {browsing && (featured.isPending ? <Loading /> : featured.isError ? <Failure error={featured.error} retry={() => void featured.refetch()} /> : <section className="store-featured catalog-featured" aria-label="精选测试">{featured.data.items.map(product => <CatalogCard key={product.id} product={product} />)}</section>)}
      {browsing && !!categories.data?.length && <section className="store-section store-scenarios">
        <div className="store-section-heading"><h2>按场景发现</h2><span className="catalog-section-note">从生活里，找到好奇的自己</span></div>
        <div className="store-scenario-grid">{categories.data.map(category => {
          const design = designCategories.find(item => item.id === category.slug);
          return <button type="button" key={category.id} className={`store-scenario tone-${design?.tone ?? 'ivory'}`} onClick={() => selectCategory(category.slug)}>
            <span className="store-scenario-title"><Icon name={(design?.icon ?? 'sparkles') as IconName} size={18} />{category.name}</span>
            <span className="store-scenario-headline">{design?.headline ?? `探索${category.name}`}</span>
            <span className="store-scenario-description">{design?.description ?? '从一个问题开始，发现新倾向'}</span>
          </button>;
        })}</div>
      </section>}
      <section className="store-section catalog-results" aria-label={browsing ? '最新上架' : '筛选结果'}>
        <div className="store-section-heading"><h2>{browsing ? '最新上架' : '探索结果'}</h2><div className="catalog-result-tools"><span role="status">共 {result.data.total} 个商品</span><label>排序<select aria-label="商品排序" value={params.get('sort') ?? 'latest'} onChange={event => setParams(changeCatalogSearch(params, { sort: event.target.value }))}><option value="latest">最新优先</option><option value="recommended">推荐优先</option></select></label></div></div>
        <div className={browsing ? 'store-latest-grid' : 'store-featured catalog-filtered-grid'}>{result.data.items.map(product => <CatalogCard key={product.id} product={product} compact={browsing} />)}</div>
        {!result.data.items.length && <div className="store-empty"><Icon name="search" size={32} /><h3>没有符合条件的商品，请调整筛选。</h3><button type="button" className="store-button store-button-primary" onClick={() => setParams({})}>查看全部测试</button></div>}
        <Pager {...result.data} onChange={page => setParams(changeCatalogSearch(params, { page: String(page) }))} />
      </section>
      <div className="store-content-note"><span>趣味自测，仅供娱乐与自我观察。</span><span>{result.data.items.some(product => product.isDemo) ? '当前含演示商品 · 标记价格为测试价格' : '兑换码领取 · 支持匿名体验'}</span></div>
    </>}
  </>;
}
