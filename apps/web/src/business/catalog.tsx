import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { KeySchema } from "@orai/contracts";
import { api, consumer } from "../api/consumer.js";
import { MutationIntent } from "../api/intent.js";
import { Page, Loading, Failure, Demo } from "./shared.js";

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
    <p className="biz-note">{src ? "封面暂不可用" : "封面待补"}</p>
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
    <Page title={result.data?.name ?? "商品详情"}>
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <Failure error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <Demo show={result.data.isDemo} />
          <ProductCover
            key={result.data.coverUrl}
            className="biz-cover"
            src={result.data.coverUrl}
            alt="商品封面"
          />
          <p>{result.data.hook}</p>
          <p>{result.data.description}</p>
          <p>
            {result.data.questionCount} 道题 · 约 {result.data.durationMinutes}{" "}
            分钟 · 版本 {result.data.versionNumber} · ¥{" "}
            {(result.data.price.amountFen / 100).toFixed(2)}
          </p>
          <section className="biz-card">
            <h2>{result.data.publicSample.label}</h2>
            <p>{result.data.publicSample.summary}</p>
            {result.data.publicSample.dimensions.map((value, index) => (
              <p key={index}>
                {value.label}：{value.score === null ? "信息不足" : value.score}
              </p>
            ))}
            <p>{result.data.publicSample.suggestion}</p>
            <small>这是公开样例，与个人报告分开。</small>
          </section>
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
          <Link className="biz-button" to="/redeem">
            已有兑换码，领取或恢复
          </Link>
          <Link to="/">返回商城</Link>
        </>
      )}
    </Page>
  );
}
