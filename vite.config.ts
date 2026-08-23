import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isLocalDemoDev = command === 'serve' && mode === 'demo';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: isLocalDemoDev ? 5174 : 5173,
      strictPort: isLocalDemoDev,
      open: true,
      // Same-origin /api for local demo only. Production demo builds keep relative /api/v1
      // and are served behind Nginx — this proxy is not used by `vite build --mode demo`.
      proxy: isLocalDemoDev
        ? {
            '/api': {
              target: 'http://127.0.0.1:3001',
              changeOrigin: true,
            },
            '/health': {
              target: 'http://127.0.0.1:3001',
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
