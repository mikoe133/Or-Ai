import { IdSchema, PageSchema } from "@orai/contracts";
import {
  ContentImpactSchema,
  ContentDiffSchema,
  ContentReferenceSchema,
  ContentContextSchema,
  ContentPackageSchema,
  ContentPackagePreviewSchema,
  FileCleanupCandidateSchema,
  FileCleanupPlanSchema,
} from "@orai/contracts/admin";
import { api } from "../api/consumer.js";
const id = (value: string) => IdSchema.parse(value).toLowerCase();
export const workflowApi = {
  profileDiff: (from: string, to: string, signal?: AbortSignal) =>
    api.request(
      `/api/admin/creative-profiles/${id(from)}/diff?to=${id(to)}`,
      ContentDiffSchema,
      { signal },
    ),
  cleanupPlan: (planId: string, signal?: AbortSignal) =>
    api.request(
      "/api/admin/file-cleanups/" + id(planId),
      FileCleanupPlanSchema,
      { signal },
    ),
  impact: (revisionId: string, signal?: AbortSignal) =>
    api.request(
      `/api/admin/content-revisions/${id(revisionId)}/impact`,
      ContentImpactSchema,
      { signal },
    ),
  diff: (from: string, to: string, signal?: AbortSignal) =>
    api.request(
      `/api/admin/content-revisions/${id(from)}/diff?to=${id(to)}`,
      ContentDiffSchema,
      { signal },
    ),
  recheck: (revisionId: string, body: unknown) =>
    api.request(
      `/api/admin/content-revisions/${id(revisionId)}/recheck`,
      ContentImpactSchema,
      { method: "POST", body },
    ),
  references: (query: string, signal?: AbortSignal) =>
    api.request(
      "/api/admin/content-references?" + query,
      PageSchema(ContentReferenceSchema),
      { signal },
    ),
  context: (body: unknown) =>
    api.request("/api/admin/content-contexts/resolve", ContentContextSchema, {
      method: "POST",
      body,
    }),
  preview: (body: unknown) =>
    api.request(
      "/api/admin/content-packages/preview",
      ContentPackagePreviewSchema,
      { method: "POST", body, timeoutMs: 60000 },
    ),
  adopt: (body: unknown) =>
    api.request("/api/admin/content-packages", ContentPackageSchema, {
      method: "POST",
      body,
      timeoutMs: 60000,
    }),
  packages: (productId: string, page = 1, signal?: AbortSignal) =>
    api.request(
      `/api/admin/products/${id(productId)}/content-packages?page=${page}`,
      PageSchema(ContentPackageSchema),
      { signal },
    ),
  package: (packageId: string) =>
    api.request(
      "/api/admin/content-packages/" + id(packageId),
      ContentPackageSchema,
    ),
  candidates: (productId: string, page = 1, signal?: AbortSignal) =>
    api.request(
      `/api/admin/products/${id(productId)}/cleanup-candidates?page=${page}`,
      PageSchema(FileCleanupCandidateSchema),
      { signal },
    ),
  cleanupPreview: (body: unknown) =>
    api.request("/api/admin/file-cleanups/preview", FileCleanupPlanSchema, {
      method: "POST",
      body,
    }),
  cleanup: (planId: string, body: unknown) =>
    api.request(
      `/api/admin/file-cleanups/${id(planId)}/execute`,
      FileCleanupPlanSchema,
      { method: "POST", body, timeoutMs: 60000 },
    ),
};
export type Impact = Awaited<ReturnType<typeof workflowApi.impact>>;
export type Package = Awaited<ReturnType<typeof workflowApi.adopt>>;
