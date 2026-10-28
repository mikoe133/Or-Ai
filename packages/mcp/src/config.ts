import { realpath, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { z } from "zod";
import { AdapterError } from "./errors.js";

export const DomainSchema = z.enum(["assessment", "cover", "video", "copy", "experience"]);
export type AdapterConfig = {
  domain: z.infer<typeof DomainSchema>;
  apiOrigin: string;
  token: string;
  allowedRoot: string;
  uploadTimeoutMs: number;
};
export const MAX_FILE_BYTES = 200 * 1024 * 1024;

export async function readConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AdapterConfig> {
  try {
    const domain = DomainSchema.parse(env.ORAI_MCP_DOMAIN);
    const uploadTimeoutMs = env.ORAI_MCP_UPLOAD_TIMEOUT_MS === undefined ? 120_000 :
      z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1000).max(600_000)).parse(env.ORAI_MCP_UPLOAD_TIMEOUT_MS);
    const token = z.string().min(32).max(1024)
      .regex(/^[A-Za-z0-9._~-]+$/).parse(env.ORAI_MCP_TOKEN);
    const url = new URL(env.ORAI_MCP_API_URL ?? "http://127.0.0.1:4100");
    if (url.protocol !== "http:" || url.username || url.password || url.search ||
        url.hash || url.pathname !== "/" ||
        !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname))
      throw new Error("invalid origin");
    // Pin localhost to a loopback address instead of depending on DNS resolution.
    if (url.hostname === "localhost") url.hostname = "127.0.0.1";
    const root = env.ORAI_MCP_ALLOWED_ROOT;
    if (!root || !isAbsolute(root)) throw new Error("invalid root");
    const allowedRoot = await realpath(root);
    if (!(await stat(allowedRoot)).isDirectory()) throw new Error("invalid root");
    return { domain, token, apiOrigin: url.origin, allowedRoot, uploadTimeoutMs };
  } catch {
    throw new AdapterError(
      "CONFIGURATION_ERROR",
      "Set ORAI_MCP_DOMAIN, ORAI_MCP_TOKEN, ORAI_MCP_ALLOWED_ROOT and a loopback HTTP ORAI_MCP_API_URL.",
    );
  }
}
