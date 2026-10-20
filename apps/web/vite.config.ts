import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const ports = loadEnv(mode, root, ['API_PORT', 'WEB_PORT']);
  const target = `http://127.0.0.1:${ports.API_PORT || '4100'}`;
  return {
    plugins: [react()],
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
