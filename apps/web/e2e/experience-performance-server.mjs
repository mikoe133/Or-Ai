// Loopback-only measurement server; production JS/CSS bytes are served unchanged.
import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

export async function startPerformanceServer({ root, apiOrigin, port }) {
  const build = resolve(root, 'apps/web/dist'), probe = await readFile(resolve(root, 'apps/web/e2e/experience-performance-probe.js'), 'utf8');
  const mime = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health/')) {
        const upstream = httpRequest(new URL(url.pathname + url.search, apiOrigin), { method: req.method,
          headers: { ...req.headers, host: new URL(apiOrigin).host } }, response => {
          res.writeHead(response.statusCode, response.headers); response.pipe(res);
        });
        upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(upstream); return;
      }
      if (url.pathname === '/__orai-performance-probe.js') {
        res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' });
        res.end('window.__oraiExpectedImages=1;\n' + probe); return;
      }
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.includes('\0') || decoded.includes('\\')) { res.writeHead(400); res.end(); return; }
      const candidate = resolve(build, '.' + decoded);
      if (!candidate.startsWith(build + sep)) { res.writeHead(404); res.end(); return; }
      if (url.pathname.startsWith('/assets/') || extname(decoded)) {
        const bytes = await readFile(candidate);
        res.writeHead(200, { 'content-type': mime[extname(decoded)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(bytes); return;
      }
      const html = (await readFile(resolve(build, 'index.html'), 'utf8')).replace('<head>', '<head><script src="/__orai-performance-probe.js"></script>');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(html);
    } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { async close() { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } };
}
