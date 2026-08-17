import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/silverlink/volunteer/',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared-workbench'),
      '@shared-i18n': path.resolve(__dirname, '../shared/i18n'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://sxyq27.online/silverlink-api',
        changeOrigin: true,
      },
    },
  },
});
