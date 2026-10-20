import { IdSchema, PageSchema } from "@orai/contracts";
import {
  CreativeProfileRevisionSchema,
  ContentRevisionSchema,
  ContentRevisionDetailSchema,
  ProductionRecordSchema,
} from "@orai/contracts/admin";
import { api } from "../api/consumer.js";
const id = (value: string) => IdSchema.parse(value).toLowerCase();
export const contentApi = {
  profiles: (productId: string, page = 1, signal?: AbortSignal) =>
    api.request(
      `/api/admin/products/${id(productId)}/creative-profiles?pageSize=50&page=${page}`,
      PageSchema(CreativeProfileRevisionSchema),
      { signal },
    ),
  saveProfile: (productId: string, body: unknown) =>
    api.request(
      `/api/admin/products/${id(productId)}/creative-profiles`,
      CreativeProfileRevisionSchema,
      { method: "POST", body },
    ),
  revisions: (query: string, signal?: AbortSignal) =>
    api.request(
      "/api/admin/content-revisions?" + query,
      PageSchema(ContentRevisionSchema),
      { signal },
    ),
  revision: (revisionId: string, signal?: AbortSignal) =>
    api.request(
      "/api/admin/content-revisions/" + id(revisionId),
      ContentRevisionDetailSchema,
      { signal },
    ),
  saveAsset: (body: unknown) =>
    api.request("/api/admin/content-assets", ContentRevisionSchema, {
      method: "POST",
      body,
    }),
  production: (body: unknown) =>
    api.request("/api/admin/production-records", ProductionRecordSchema, {
      method: "POST",
      body,
    }),
};
export async function allPages<T>(
  read: (
    page: number,
  ) => Promise<{ items: T[]; pageSize: number; total: number }>,
) {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await read(page);
    items.push(...result.items);
    if (page * result.pageSize >= result.total) return items;
  }
}
export type Profile = Awaited<ReturnType<typeof contentApi.saveProfile>>;
export type Revision = Awaited<ReturnType<typeof contentApi.saveAsset>>;
export type RevisionDetail = Awaited<ReturnType<typeof contentApi.revision>>;
