import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/silverlink/admin/',
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://sxyq27.online/silverlink-api',
        changeOrigin: true,
      },
    },
  },
});
