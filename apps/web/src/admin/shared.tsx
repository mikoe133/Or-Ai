import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminApi } from "./api.js";
import { Loading } from "../business/shared.js";
import { AdminFailure as Failure } from "./feedback.js";
import { type AdminRecoveryArea } from "./feedback-view.js";
import { isAccessFailure, RefreshNotice } from "./refresh-notice.js";
export function ProductVersionSelect({
  value,
  onChange,
  area,
}: {
  value: string;
  onChange: (value: string) => void;
  area: AdminRecoveryArea;
}) {
  const [search, setSearch] = useState("");
  const products = useQuery({
    queryKey: ["private", "admin", "product-options", search],
    queryFn: ({ signal }) =>
      adminApi.products(
        new URLSearchParams({
          query: search,
          status: "published",
          pageSize: "50",
        }).toString(),
        signal,
      ),
    placeholderData: keepPreviousData,
  });
  const data = isAccessFailure(products.error) ? undefined : products.data;
  const options = data?.items.filter(product => product.currentVersionId) ?? [];
  return (
    <div className="admin-product-selection" aria-busy={products.isFetching}>
      <label>
        搜索交付商品
        <input
          aria-label="搜索交付商品"
          maxLength={100}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
        <label>
          商品版本
          <select
            aria-label="商品版本"
            required
            value={value}
            disabled={!data || products.isPlaceholderData}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">请选择已发布商品</option>
            {value && !isAccessFailure(products.error) && !options.some(product => product.currentVersionId === value) &&
              <option value={value}>已选版本 · {value}</option>}
            {options
              .map((product) => (
                <option key={product.id} value={product.currentVersionId!}>
                  {product.name}
                </option>
              ))}
          </select>
        </label>
      {products.isPending && <Loading label="正在读取可交付商品…" />}
      {products.isFetching && data && <p className="admin-product-search-progress" role="status">正在读取商品，所选版本已保留。</p>}
      {products.isError && (data ? <RefreshNotice busy={products.isFetching} retry={() => void products.refetch()} /> :
        <Failure area={area} error={products.error} retry={() => void products.refetch()} />)}
      {data && !products.isPlaceholderData && options.length === 0 && <p className="admin-product-search-progress" role="status">没有匹配的已发布商品，试试其他关键词。</p>}
      <small>
        每次最多显示 50 款匹配商品，可搜索缩小范围；订单与素材固定引用所选版本。
      </small>
    </div>
  );
}
