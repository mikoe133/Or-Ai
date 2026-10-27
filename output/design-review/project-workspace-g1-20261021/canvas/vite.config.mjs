import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: fileURLToPath(new URL('./src/entry.tsx', import.meta.url)), name: 'G1Canvas', formats: ['iife'], fileName: () => 'g1-canvas.js', cssFileName: 'g1-canvas' },
    minify: true,
    outDir: 'bundle',
    sourcemap: false,
  },
});
