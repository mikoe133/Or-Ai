import { IdSchema, PageSchema } from "@orai/contracts";
import {
  MachineCallSchema,
  MachineCredentialIssuedSchema,
  MachineCredentialSchema,
} from "@orai/contracts/admin";
import { api } from "../api/consumer.js";

const root = "/api/admin/machine-credentials";
const id = (value: string) => IdSchema.parse(value).toLowerCase();
export const machineApi = {
  list: (page: number, signal?: AbortSignal) =>
    api.request(root + `?page=${page}&pageSize=20`, PageSchema(MachineCredentialSchema), { signal }),
  create: (body: unknown) =>
    api.request(root, MachineCredentialIssuedSchema, { method: "POST", body }),
  revoke: (credentialId: string, body: unknown) =>
    api.request(root + "/" + id(credentialId) + "/revoke", MachineCredentialSchema, { method: "POST", body }),
  calls: (credentialId: string, page: number, signal?: AbortSignal) =>
    api.request(root + "/" + id(credentialId) + `/calls?page=${page}&pageSize=20`, PageSchema(MachineCallSchema), { signal }),
};
export type MachineCredential = Awaited<ReturnType<typeof machineApi.revoke>>;
