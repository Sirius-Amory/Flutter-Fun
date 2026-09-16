import { defineConfig } from 'vite';

const apiProxy = {
  '/api': {
    target: 'http://localhost:7071',
    changeOrigin: true,
  },
};

export default defineConfig({
  server: {
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: apiProxy,
  },
  preview: {
    port: 4280,
    proxy: apiProxy,
  },
  build: {
    outDir: 'dist',
  },
});
