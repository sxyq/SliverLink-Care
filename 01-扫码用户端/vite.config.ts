import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/silverlink/scan/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared-i18n': path.resolve(__dirname, '../shared/i18n'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://sxyq27.online/silverlink-api',
        changeOrigin: true,
      },
    },
  },
}));
