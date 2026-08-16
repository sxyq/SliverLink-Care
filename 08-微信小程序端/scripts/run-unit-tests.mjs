import { build } from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testEntry = path.join(projectRoot, 'scripts/unit/logic.test.ts');
const taroStub = path.join(projectRoot, 'scripts/unit/taro-stub.ts');
const qrcodeStub = path.join(projectRoot, 'scripts/unit/qrcode-stub.ts');
const reactPackage = path.join(projectRoot, 'node_modules/react');
const outdir = path.join(os.tmpdir(), 'silverlink-weapp-unit-tests');
const outfile = path.join(outdir, 'logic.test.mjs');

async function collectTsxFiles(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTsxFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.tsx') ? [entryPath] : [];
  }));

  return nested.flat();
}

async function assertLanguageMenuContracts() {
  const [switcherSource, appStyles, loginSource, formatterSource, qrcodeSource, pageShellSource, i18nSource, appEntrySource, pageSources] = await Promise.all([
    fsp.readFile(path.join(projectRoot, 'src/components/LanguageSwitcher.tsx'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/app.scss'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/pages/auth/login.tsx'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/utils/formatters.ts'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/subpackages/workbench/qrcode/index.tsx'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/components/layout/I18nPageShell.tsx'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/i18n/index.ts'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/app/app-entry.tsx'), 'utf8'),
    Promise.all([
      collectTsxFiles(path.join(projectRoot, 'src/pages')),
      collectTsxFiles(path.join(projectRoot, 'src/subpackages')),
    ]).then((groups) => Promise.all(groups.flat().map((file) => fsp.readFile(file, 'utf8')))),
  ]);

  assert.match(switcherSource, /SUPPORTED_LOCALES/);
  assert.match(switcherSource, /LOCALE_META/);
  assert.match(switcherSource, /Button, Text, View/);
  assert.match(switcherSource, /sl-language-switcher__scrim/);
  assert.match(switcherSource, /dir: getDirection\(optionLocale\)/);
  assert.match(switcherSource, /is-\$\{getDirection\(optionLocale\)\}/);
  assert.doesNotMatch(switcherSource, /\bdocument\b/);

  assert.match(appStyles, /safe-area-inset-top/);
  assert.match(appStyles, /\.sl-language-menu[\s\S]*?right: 0;[\s\S]*?left: auto;/);
  assert.match(appStyles, /\.sl-language-switcher__scrim[\s\S]*?position: fixed;/);

  const ltrLoginFields = loginSource.match(/auth-login-field__input sl-ltr-data/g) || [];
  assert.ok(ltrLoginFields.length >= 5, 'account, password, invitation code and phone fields must stay LTR');
  assert.doesNotMatch(formatterSource, /locale\s*===\s*['"]zh-CN['"]/);
  assert.match(formatterSource, /\$\{year\}-\$\{month\}-\$\{day\} \$\{hour\}:\$\{minute\}/);

  assert.match(qrcodeSource, /t\(\s*['"]workbench\.qrCreatedAt['"]\s*\)\s*\.split\(\s*['"]\{time\}['"]\s*\)/);
  const ltrDateText = qrcodeSource.match(/<Text\b(?=[^>]*\bclassName\s*=\s*(?:'[^']*\bsl-ltr-data\b[^']*'|"[^"]*\bsl-ltr-data\b[^"]*"))(?=[^>]*\bdir\s*[:=]\s*['"]ltr['"])[^>]*>\s*\{([A-Za-z_$][\w$]*)\}\s*<\/Text>/);
  assert.ok(ltrDateText, 'QR creation time must render in an LTR Text node');
  assert.match(qrcodeSource, new RegExp(`\\b${ltrDateText[1]}\\s*=\\s*formatDateTimeLabel\\s*\\(`));
  assert.doesNotMatch(qrcodeSource, /\bt\(\s*['"]workbench\.qrCreatedAt['"]\s*,\s*\{\s*time\s*:\s*formatDateTimeLabel\s*\(/);

  assert.match(pageShellSource, /<LanguageSwitcher\s*\/>/);
  assert.match(pageShellSource, /sl-app-root sl-dir-\$\{direction\}/);
  assert.match(pageShellSource, /dir: direction/);
  assert.match(pageShellSource, /export function I18nPageShell/);
  assert.match(pageShellSource, /<LanguageSwitcher\s*\/>/);
  assert.match(pageShellSource, /Taro\.setNavigationBarTitle\(\{ title: t\(navigationTitleKey\) \}\)/);
  assert.doesNotMatch(pageShellSource, /withI18nPage|useDidShow\(|getCurrentPages\(/);
  assert.match(i18nSource, /localeListeners/);
  assert.match(i18nSource, /i18nRuntime\.setLocale\(nextLocale\)/);
  assert.match(i18nSource, /localeListeners\.forEach/);
  assert.doesNotMatch(appEntrySource, /LanguageSwitcher|sl-app-root|I18nProvider/);

  assert.equal(pageSources.length, 15, 'all registered page roots must be covered by the page-level i18n shell');
  for (const pageSource of pageSources) {
    assert.match(pageSource, /I18nPageShell/);
    assert.match(pageSource, /export default function \w+Entry\(\)[\s\S]*<I18nPageShell navigationTitleKey=['"][a-z]+\.[A-Za-z]+['"]>/);
  }
}

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
  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) || basePath;
}

const testAliasPlugin = {
  name: 'silverlink-weapp-test-alias',
  setup(builder) {
    builder.onResolve({ filter: /^@tarojs\/taro$/ }, () => ({ path: taroStub }));
    builder.onResolve({ filter: /^qrcode$/ }, () => ({ path: qrcodeStub }));
    builder.onResolve({ filter: /^react(?:\/.*)?$/ }, (args) => ({
      path: args.path === 'react' ? path.join(reactPackage, 'index.js') : path.join(reactPackage, `${args.path.slice('react/'.length)}.js`),
    }));
    builder.onResolve({ filter: /^@\// }, (args) => ({ path: resolveSourceImport(args.path) }));
  },
};

await fsp.rm(outdir, { recursive: true, force: true });
await fsp.mkdir(outdir, { recursive: true });
await assertLanguageMenuContracts();

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
