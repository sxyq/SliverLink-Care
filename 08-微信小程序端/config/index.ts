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
  modifyViteConfig(viteConfig: any) {
    const build = viteConfig.build ?? (viteConfig.build = {});
    const rollupOptions = build.rollupOptions ?? (build.rollupOptions = {});
    const output = rollupOptions.output ?? (rollupOptions.output = {});

    if (!Array.isArray(output)) {
      output.manualChunks = (id: string) => {
        // 按分包拆分代码
        if (id.includes('/subpackages/scan/')) {
          return 'scan';
        }
        if (id.includes('/subpackages/workbench/')) {
          return 'workbench';
        }
        // node_modules 按库拆分
        if (id.includes('node_modules')) {
          if (id.includes('qrcode')) {
            return 'vendor-qrcode';
          }
          if (id.includes('react') || id.includes('@tarojs')) {
            return 'vendor-framework';
          }
          return 'vendor';
        }
        return undefined;
      };
    }

    // 启用 Tree Shaking
    build.chunkSizeWarningLimit = 500;
  },
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
