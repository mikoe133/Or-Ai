import { IdSchema, PageSchema } from "@orai/contracts";
import {
  CreativeSkillSetSchema,
  FixedSkillVersionSchema,
  ProductionDomainSchema,
} from "@orai/contracts/admin";
import { api } from "../api/consumer.js";
const id = (value: string) => IdSchema.parse(value).toLowerCase();
export const bindingsApi = {
  list: (profileId: string, page = 1, signal?: AbortSignal) =>
    api.request(
      `/api/admin/creative-profiles/${id(profileId)}/skill-sets?page=${page}&pageSize=50`,
      PageSchema(CreativeSkillSetSchema),
      { signal },
    ),
  read: (setId: string, signal?: AbortSignal) =>
    api.request(
      `/api/admin/creative-skill-sets/${id(setId)}`,
      CreativeSkillSetSchema,
      { signal },
    ),
  save: (profileId: string, body: unknown) =>
    api.request(
      `/api/admin/creative-profiles/${id(profileId)}/skill-sets`,
      CreativeSkillSetSchema,
      { method: "POST", body },
    ),
  candidates: (domain: string, query: string, signal?: AbortSignal) =>
    api.request(
      `/api/admin/skills/${ProductionDomainSchema.parse(domain)}/candidates?${query}`,
      PageSchema(FixedSkillVersionSchema),
      { signal },
    ),
};
export type SkillSet = Awaited<ReturnType<typeof bindingsApi.read>>;
