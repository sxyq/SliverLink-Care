import { build } from 'esbuild';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testEntry = path.join(projectRoot, 'scripts/unit/logic.test.ts');
const taroStub = path.join(projectRoot, 'scripts/unit/taro-stub.ts');
const qrcodeStub = path.join(projectRoot, 'scripts/unit/qrcode-stub.ts');
const outdir = path.join(os.tmpdir(), 'silverlink-weapp-unit-tests');
const outfile = path.join(outdir, 'logic.test.mjs');

function resolveSourceImport(importPath) {
  const basePath = path.join(projectRoot, 'src', importPath.slice(2));
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || basePath;
}

const testAliasPlugin = {
  name: 'silverlink-weapp-test-alias',
  setup(builder) {
    builder.onResolve({ filter: /^@tarojs\/taro$/ }, () => ({ path: taroStub }));
    builder.onResolve({ filter: /^qrcode$/ }, () => ({ path: qrcodeStub }));
    builder.onResolve({ filter: /^@\// }, (args) => ({ path: resolveSourceImport(args.path) }));
  },
};

await fsp.rm(outdir, { recursive: true, force: true });
await fsp.mkdir(outdir, { recursive: true });

await build({
  entryPoints: [testEntry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: 'inline',
  plugins: [testAliasPlugin],
  logLevel: 'silent',
});

await import(pathToFileURL(outfile).href);
