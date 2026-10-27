#!/usr/bin/env node
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { readConfig } from "./config.js";
import { safeError } from "./errors.js";
import { createServer } from "./server.js";

try {
  const config = await readConfig();
  serveStdio(() => createServer(config), {
    legacy: "serve",
    transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 2 * 1024 * 1024 }),
    // The SDK error can include caller-supplied values. Emit only a fixed message.
    onerror: () => { process.stderr.write("orai-mcp: protocol operation failed.\n"); },
  });
} catch (error) {
  const safe = safeError(error);
  process.stderr.write(`orai-mcp: ${safe.code}: ${safe.message}\n`);
  process.exitCode = 1;
}
