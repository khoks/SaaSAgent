import { defineConfig } from 'vite';

/**
 * Demo-host Vite config.
 *
 * Vite resolves @saasagent/web-shell via the workspace symlink → its `dist/`
 * output (per package.json `main` / `exports`). `pnpm dev` runs `predev` first
 * to ensure web-shell + protocol are built. For tighter inner-loop iteration
 * later, we can add a vite-tsconfig-paths plugin to resolve workspace TS
 * sources directly.
 */
export default defineConfig({
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    // Force Vite to pre-bundle the workspace deps (so HMR sees them as deps,
    // not as part of the app source).
    include: ['@saasagent/web-shell', '@saasagent/protocol'],
  },
});
