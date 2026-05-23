import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/silverlink/scan/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/silverlink-api': {
        target: 'http://sxyq27.online',
        changeOrigin: true,
      },
    },
  },
}));
