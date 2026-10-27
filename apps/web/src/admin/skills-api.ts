import { IdSchema, PageSchema } from "@orai/contracts";
import {
  ProductionDomainSchema,
  StyleSkillSchema,
  StyleSkillVersionSchema,
  StyleSkillExportSchema,
  SkillFileSchema,
  ContentDiffSchema,
} from "@orai/contracts/admin";
import { api } from "../api/consumer.js";
const id = (value: string) => IdSchema.parse(value).toLowerCase();
const root = (domain: string, skillId?: string) =>
  "/api/admin/skills/" +
  ProductionDomainSchema.parse(domain) +
  (skillId ? "/" + id(skillId) : "");
const version = (domain: string, skillId: string, versionId: string) =>
  root(domain, skillId) + "/versions/" + id(versionId);
export const skillsApi = {
  list: (d: string, q: string, signal?: AbortSignal) =>
    api.request(root(d) + "?" + q, PageSchema(StyleSkillSchema), { signal }),
  skill: (d: string, s: string, signal?: AbortSignal) =>
    api.request(root(d, s), StyleSkillSchema, { signal }),
  versions: (d: string, s: string, page = 1, signal?: AbortSignal) =>
    api.request(
      root(d, s) + "/versions?page=" + page + "&pageSize=50",
      PageSchema(StyleSkillVersionSchema),
      { signal },
    ),
  version: (d: string, s: string, v: string, signal?: AbortSignal) =>
    api.request(version(d, s, v), StyleSkillVersionSchema, { signal }),
  create: (d: string, body: unknown) =>
    api.request(root(d), StyleSkillVersionSchema, { method: "POST", body }),
  save: (d: string, s: string, v: string, body: unknown) =>
    api.request(version(d, s, v), StyleSkillVersionSchema, {
      method: "PUT",
      body,
    }),
  clone: (d: string, s: string, body: unknown) =>
    api.request(root(d, s) + "/versions", StyleSkillVersionSchema, {
      method: "POST",
      body,
    }),
  action: (d: string, s: string, v: string, action: string, body: unknown) =>
    api.request(version(d, s, v) + "/" + action, StyleSkillVersionSchema, {
      method: "POST",
      body,
    }),
  diff: (
    d: string,
    s: string,
    from: string,
    to: string,
    signal?: AbortSignal,
  ) =>
    api.request(version(d, s, from) + "/diff?to=" + id(to), ContentDiffSchema, {
      signal,
    }),
  export: (d: string, s: string, v: string) =>
    api.request(version(d, s, v) + "/export", StyleSkillExportSchema),
  prepare: (d: string, s: string, body: unknown) =>
    api.request(root(d, s) + "/files", SkillFileSchema, {
      method: "POST",
      body,
    }),
  file: (d: string, s: string, f: string) =>
    api.request(root(d, s) + "/files/" + id(f), SkillFileSchema),
  upload: (d: string, s: string, f: string, body: Blob) =>
    api.request(root(d, s) + "/files/" + id(f) + "/content", SkillFileSchema, {
      method: "PUT",
      body,
      binary: true,
      timeoutMs: 125000,
    }),
  complete: (d: string, s: string, f: string, body: unknown) =>
    api.request(root(d, s) + "/files/" + id(f) + "/complete", SkillFileSchema, {
      method: "POST",
      body,
    }),
};
export type SkillVersion = Awaited<ReturnType<typeof skillsApi.version>>;
export type Skill = Awaited<ReturnType<typeof skillsApi.skill>>;
export type SkillFile = Awaited<ReturnType<typeof skillsApi.file>>;
