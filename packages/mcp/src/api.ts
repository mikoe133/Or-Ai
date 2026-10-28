import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { z } from "zod";
import { ApiErrorSchema } from "@orai/contracts";
import {
  MachineConnectionSchema, MachineUploadPrepareSchema,
  MachineUploadPreparedSchema, MachineUploadSchema, MachineContentOperationSchema,
  type MachineContentOperation,
  MachineProjectOperationSchema, type MachineProjectOperation, ProductionRunOperationSchema, type ProductionRunOperation,
} from "@orai/contracts/admin";
import { type AdapterConfig } from "./config.js";
import { AdapterError } from "./errors.js";
import { checkedChunks, openCheckedFile } from "./local-file.js";

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
type Upload = z.infer<typeof MachineUploadSchema>;
type RequestBody = string | Readable;

export class MachineApi {
  constructor(private readonly config: AdapterConfig) {}

  private async request<T>(
    method: "GET" | "POST" | "PUT",
    path: string,
    schema: z.ZodType<T>,
    body?: RequestBody,
    extra: Record<string, string> = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.config.apiOrigin}/api/machine/${this.config.domain}/${path}`, {
        method,
        headers: {
          authorization: `Bearer ${this.config.token}`,
          accept: "application/json",
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...extra,
        },
        body: body as BodyInit | undefined,
        ...(body instanceof Readable ? { duplex: "half" } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(body instanceof Readable ? this.config.uploadTimeoutMs : 30_000),
      });
    } catch {
      throw new AdapterError("API_UNAVAILABLE", "The configured local API could not complete the request.", true);
    }
    if (!response.ok) {
      let code = ({
        400: "INVALID_INPUT", 401: "AUTH_REQUIRED", 403: "FORBIDDEN",
        404: "NOT_FOUND", 409: "CONFLICT", 410: "EXPIRED",
        413: "FILE_TOO_LARGE", 429: "RATE_LIMITED",
      } as Record<number, string>)[response.status] ?? "API_ERROR";
      // Preserve a known business error code so clients can distinguish stale
      // revisions from other conflicts; never echo upstream messages or stacks.
      try {
        const parsed = ApiErrorSchema.safeParse(await this.readJson(response));
        if (parsed.success) code = parsed.data.error.code;
      } catch { /* Generic HTTP code remains safe for incompatible error bodies. */ }
      throw new AdapterError(code,
        `The local API rejected this operation (HTTP ${response.status}).`,
        response.status === 429 || response.status >= 500);
    }
    try {
      return schema.parse(await this.readJson(response));
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      throw new AdapterError("INVALID_API_RESPONSE", "The local API returned an incompatible response.");
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    if (!response.headers.get("content-type")?.includes("application/json") || !response.body)
      throw new Error("invalid response");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        total += result.value.byteLength;
        if (total > MAX_RESPONSE_BYTES)
          throw new AdapterError("RESPONSE_TOO_LARGE",
            "The response exceeds 8 MiB. Reduce pageSize or request fewer context inputs.");
        chunks.push(result.value);
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  content<T>(operation: MachineContentOperation, input: unknown, schema: z.ZodType<T>) {
    const fixed = MachineContentOperationSchema.parse(operation);
    return this.request("POST", `tools/${fixed}`, schema, JSON.stringify(input));
  }
  project<T>(operation: MachineProjectOperation, input: unknown, schema: z.ZodType<T>) {
    return this.request('POST', `tools/${MachineProjectOperationSchema.parse(operation)}`, schema, JSON.stringify(input));
  }

  run<T>(operation: ProductionRunOperation, input: unknown, schema: z.ZodType<T>) {
    return this.request('POST', `tools/${ProductionRunOperationSchema.parse(operation)}`, schema, JSON.stringify(input));
  }

  connection() {
    return this.request("GET", "connection", MachineConnectionSchema);
  }

  prepare(input: z.infer<typeof MachineUploadPrepareSchema>) {
    return this.request("POST", "uploads", MachineUploadPreparedSchema, JSON.stringify(input));
  }

  status(uploadId: string) {
    return this.request("GET", `uploads/${uploadId}`, MachineUploadSchema);
  }

  complete(uploadId: string, ticket: string, requestId: string) {
    return this.request("POST", `uploads/${uploadId}/complete`, MachineUploadSchema,
      JSON.stringify({ requestId }), { "x-orai-upload-ticket": ticket });
  }

  async uploadFile(uploadId: string, ticket: string, filePath: string): Promise<Upload> {
    const upload = await this.status(uploadId);
    // A lost PUT/complete response can be retried without retransmitting bytes.
    if (upload.status === "uploaded" || upload.status === "available") return upload;
    if (upload.status !== "pending")
      throw new AdapterError("UPLOAD_NOT_PENDING", "This upload cannot receive bytes in its current state.");
    const file = await openCheckedFile(this.config.allowedRoot, filePath, upload);
    const hash = createHash("sha256");
    const body = Readable.from((async function* () {
      for await (const chunk of checkedChunks(file, upload.byteSize)) {
        hash.update(chunk);
        yield chunk;
      }
      if (hash.digest("hex") !== upload.checksum)
        throw new AdapterError("FILE_CHANGED", "The local file changed during transfer.");
    })());
    try {
      return await this.request("PUT", `uploads/${uploadId}/content`, MachineUploadSchema, body, {
        "content-type": "application/octet-stream",
        "content-length": String(upload.byteSize),
        "x-orai-upload-ticket": ticket,
      });
    } finally {
      body.destroy();
      await file.close();
    }
  }
}
