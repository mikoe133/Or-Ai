import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { reflectionGardenGraphics } from '@orai/contracts/experience';

function experienceBudgets(): Plugin {
  return {
    name: 'experience-budgets', apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
      const closure = (roots: string[]) => {
        const visited = new Set<string>();
        const visit = (name: string) => {
          if (visited.has(name)) return;
          const item = bundle[name];
          if (!item || item.type !== 'chunk') return;
          visited.add(name); item.imports.forEach(visit);
        };
        roots.forEach(visit); return visited;
      };
      const eager = closure(chunks.filter(item => item.isEntry).map(item => item.fileName));
      const hasThree = (ids: string[]) => ids.some(id => /\/node_modules\/(?:\.pnpm\/three@[^/]+\/node_modules\/)?three\//.test(id));
      if (chunks.some(item => eager.has(item.fileName) && hasThree(item.moduleIds)))
        this.error('Three.js must remain outside the application entry static imports');
      const renderer = chunks.find(item => item.moduleIds.some(id => id.replaceAll('\\', '/').endsWith('/src/experience/garden-renderer.ts')));
      if (!renderer) this.error('The registered garden renderer is missing from the build');
      if (eager.has(renderer.fileName)) this.error('The garden renderer must be loaded dynamically');
      // Count the entire renderer static import graph, including shared dependencies.
      const files = [...closure([renderer.fileName])].map(fileName => {
        const item = bundle[fileName];
        if (!item || item.type !== 'chunk') throw new Error('Missing renderer chunk');
        return { fileName, rawBytes: Buffer.byteLength(item.code), gzipBytes: gzipSync(item.code).byteLength };
      });
      const gzipBytes = files.reduce((sum, file) => sum + file.gzipBytes, 0);
      if (gzipBytes > reflectionGardenGraphics.maxRendererGzipBytes)
        this.error(`Garden renderer gzip ${gzipBytes} exceeds budget ${reflectionGardenGraphics.maxRendererGzipBytes}`);
      this.emitFile({ type: 'asset', fileName: 'experience-budget.json', source: JSON.stringify({
        renderer: 'reflection-garden@1', entryStaticImportsExcludeThree: true,
        rendererIsDynamic: true, gzipBytes, maxGzipBytes: reflectionGardenGraphics.maxRendererGzipBytes, files,
      }, null, 2) + '\n' });
    },
  };
}

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const ports = loadEnv(mode, root, ['API_PORT', 'WEB_PORT']);
  const target = `http://127.0.0.1:${ports.API_PORT || '4100'}`;
  return {
    plugins: [react(), experienceBudgets()],
    envDir: root,
    envPrefix: 'VITE_',
    server: {
      host: '127.0.0.1',
      port: Number(ports.WEB_PORT || 5173),
      strictPort: true,
      proxy: { '/api': target, '/health': target },
    },
  };
});
