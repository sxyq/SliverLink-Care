import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sharedI18nRoot = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(sharedI18nRoot, '../../01-扫码用户端');

export default {
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      react: path.resolve(clientRoot, 'node_modules/react'),
      'react-dom': path.resolve(clientRoot, 'node_modules/react-dom'),
      '@testing-library/react': path.resolve(clientRoot, 'node_modules/@testing-library/react'),
    },
  },
  test: {
    environment: 'jsdom',
  },
};
