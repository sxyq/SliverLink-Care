import path from 'node:path';
import { defineConfig, type UserConfigExport } from '@tarojs/cli';

import devConfig from './dev';
import prodConfig from './prod';

const config: UserConfigExport<'vite'> = {
  projectName: 'silverlink-wechat-miniapp',
  date: '2026-06-02',
  designWidth: 375,
  deviceRatio: {
    375: 2,
    640: 2.34,
    750: 1,
    828: 1.81,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'vite',
  alias: {
    '@': path.resolve(process.cwd(), 'src'),
  },
  plugins: [],
  mini: {
    postcss: {
      autoprefixer: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
};

export default defineConfig(async (merge) => {
  const envConfig = process.env.NODE_ENV === 'development' ? devConfig : prodConfig;
  return merge({}, config, envConfig);
});
