import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { KeySchema } from "@orai/contracts";
import { api, consumer } from "../api/consumer.js";
import { MutationIntent } from "../api/intent.js";
import { Page, Loading, Failure, Demo } from "./shared.js";
import { Icon } from "../store/icons";

function ProductCover({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return !src || failed ? (
    <div className="consumer-cover-placeholder"><Icon name="file" size={38} /><p className="biz-note">{src ? "封面暂不可用" : "封面待补"}</p></div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export { CatalogPage } from "./storefront.js";

export function ProductPage() {
  const { slug = "" } = useParams(),
    [params] = useSearchParams(),
    intent = useRef(new MutationIntent()),
    observed = useRef("");
  const result = useQuery({
    queryKey: ["public", "product", slug],
    queryFn: ({ signal }) => consumer.product(slug, signal),
  });
  useEffect(() => {
    if (!result.data || observed.current === result.data.versionId) return;
    observed.current = result.data.versionId;
    const campaign = params.get("campaign"),
      body = intent.current.for({
        kind: "view",
        productVersionId: result.data.versionId,
        ...(KeySchema.safeParse(campaign).success
          ? { campaignCode: campaign }
          : {}),
      });
    void api
      .request(
        "/api/events",
        {
          safeParse: (value) =>
            value &&
            typeof value === "object" &&
            "accepted" in value &&
            value.accepted === true
              ? { success: true, data: true }
              : { success: false },
        },
        { method: "POST", body },
      )
      .catch(() => undefined);
  }, [result.data, params]);
  return (
    <Page title={result.data?.name ?? "商品详情"} view="product" hideTitle={Boolean(result.data)}>
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <Failure error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <nav className="consumer-breadcrumb" aria-label="商品位置"><Link to="/">应用商城</Link><span aria-hidden="true">/</span><span>{result.data.category.name}</span></nav>
          <section className="consumer-product-hero">
          <div className="consumer-product-intro">
          <span className="consumer-eyebrow">{result.data.category.name}</span>
          <h1 tabIndex={-1}>{result.data.name}</h1>
          <p className="consumer-product-hook">{result.data.hook}</p>
          <Demo show={result.data.isDemo} />
          </div>
          <ProductCover
            key={result.data.coverUrl}
            className="biz-cover"
            src={result.data.coverUrl}
            alt="商品封面"
          />
          </section>
          <section className="consumer-product-purchase" aria-label="商品信息与兑换">
            <ul className="consumer-product-meta"><li><Icon name="file" size={20} />{result.data.questionCount} 道题</li><li><Icon name="clock" size={20} />约 {result.data.durationMinutes} 分钟</li><li>版本 {result.data.versionNumber}</li></ul>
            <div className="consumer-price"><small>{result.data.price.isTestPrice ? "测试价格" : "价格"}</small><strong>¥ {(result.data.price.amountFen / 100).toFixed(2)}</strong></div>
            <Link className="biz-button consumer-primary" to="/redeem">已有兑换码，领取或恢复</Link>
          </section>
          <section className="consumer-product-description"><h2>测评介绍</h2><p>{result.data.description}</p></section>
          <section className="biz-card consumer-public-sample" aria-label="公开报告样例">
            <div className="consumer-section-heading"><h2>报告样例</h2><span className="consumer-eyebrow">公开示例</span></div>
            <div className="consumer-sample-copy">
            <h2>{result.data.publicSample.label}</h2>
            <p>{result.data.publicSample.summary}</p>
            </div>
            <dl className="consumer-sample-scores">
            {result.data.publicSample.dimensions.map((value, index) => (
              <div key={index}><dt>{value.label}</dt><dd>{value.score === null ? "信息不足" : value.score}</dd></div>
            ))}
            </dl>
            <p>{result.data.publicSample.suggestion}</p>
            <small>这是公开样例，与个人报告分开。</small>
          </section>
          <section className="biz-card consumer-purchase-notice"><h2>购买与兑换说明</h2>
          <p>{result.data.purchaseNotice}</p>
          {result.data.purchaseUrl ? (
            <a
              className="biz-button"
              href={result.data.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              前往购买平台
            </a>
          ) : (
            <p>当前未提供购买链接。</p>
          )}
          <p>{result.data.redemptionNotice}</p>
          </section>
          <Link to="/">返回商城</Link>
        </>
      )}
    </Page>
  );
}
