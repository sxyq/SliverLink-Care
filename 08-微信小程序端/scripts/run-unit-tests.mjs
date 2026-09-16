import { build } from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testEntries = [
  path.join(projectRoot, 'scripts/unit/logic.test.ts'),
  path.join(projectRoot, 'scripts/unit/i18n-pages.test.ts'),
];
const taroStub = path.join(projectRoot, 'scripts/unit/taro-stub.ts');
const taroComponentsStub = path.join(projectRoot, 'scripts/unit/taro-components-stub.ts');
const qrcodeStub = path.join(projectRoot, 'scripts/unit/qrcode-stub.ts');
const reactPackage = path.join(projectRoot, 'node_modules/react');
const reactDomPackage = path.join(projectRoot, 'node_modules/react-dom');
const sharedI18nRoot = path.resolve(projectRoot, '../shared/i18n');
const outdir = path.join(projectRoot, '.local/weapp-unit-tests');

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
  const [switcherSource, appStyles, loginSource, loginStyles, homeSource, formatterSource, qrcodeSource, pageShellSource, i18nSource, appEntrySource, pageSources] = await Promise.all([
    fsp.readFile(path.join(projectRoot, 'src/components/LanguageSwitcher.tsx'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/app.scss'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/pages/auth/login.tsx'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/pages/auth/login.scss'), 'utf8'),
    fsp.readFile(path.join(projectRoot, 'src/pages/home/index.tsx'), 'utf8'),
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
  assert.match(switcherSource, /onTap=\{\(\) => setOpen\(\(current\) => !current\)\}/, 'language trigger must use the WeChat tap event');
  assert.match(switcherSource, /onTap=\{\(\) => selectLocale\(optionLocale\)\}/, 'language options must use the WeChat tap event');
  assert.match(switcherSource, /dir: getDirection\(optionLocale\)/);
  assert.match(switcherSource, /is-\$\{getDirection\(optionLocale\)\}/);
  assert.doesNotMatch(switcherSource, /\bdocument\b/);

  assert.match(appStyles, /safe-area-inset-top/);
  assert.match(appStyles, /\.sl-language-menu[\s\S]*?right: 0;[\s\S]*?left: auto;/);
  assert.match(appStyles, /\.sl-language-switcher__scrim[\s\S]*?position: fixed;/);
  assert.match(loginStyles, /\.auth-login-language-switcher \.sl-language-menu[\s\S]*?position: relative;[\s\S]*?z-index: 2;/, 'login language menu must stay above the scrim');

  const ltrLoginFields = loginSource.match(/auth-login-field__input sl-ltr-data/g) || [];
  assert.ok(ltrLoginFields.length >= 5, 'account, password, invitation code and phone fields must stay LTR');
  assert.match(loginSource, /agreementAccepted, setAgreementAccepted\] = useState\(false\)/, 'agreement consent must be unchecked by default');
  assert.match(loginSource, /if \(!agreementAccepted\)/, 'login must require agreement consent');
  const agreementSource = await fsp.readFile(path.join(projectRoot, 'src/components/feedback/AgreementConsentRow.tsx'), 'utf8');
  assert.match(agreementSource, /<CheckboxGroup[\s\S]*onChange=\{\(event\) => onToggle\(event\.detail\.value\.includes\('agreement'\)\)\}/, 'weapp checkbox state must come from CheckboxGroup change event');
  assert.doesNotMatch(agreementSource, /<Checkbox(?:\s|>)[\s\S]*onChange=/, 'weapp checkbox must not bind the unsupported Checkbox change event');
  assert.match(loginSource, /auth-login-language-switcher[\s\S]*<LanguageSwitcher\s*\/>/, 'login language switcher must sit inside the form');
  assert.match(loginSource, /I18nPageShell navigationTitleKey='common\.brandTitle' showLanguageSwitcher=\{false\}/, 'login must disable the global language switcher');
  assert.match(homeSource, /I18nPageShell navigationTitleKey='common\.brandTitle' showLanguageSwitcher=\{false\}/, 'home must keep only the form language switcher');
  assert.doesNotMatch(loginSource, /<LanguageSwitcher\s*\/>[\s\S]*<LanguageSwitcher\s*\/>/, 'login must not render duplicate language switchers');
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
  assert.match(i18nSource, /useSyncExternalStore/);
  assert.match(i18nSource, /subscribeLocale/);
  assert.match(i18nSource, /i18nRuntime\.setLocale\(nextLocale\)/);
  assert.match(i18nSource, /localeListeners\.forEach/);
  assert.doesNotMatch(appEntrySource, /LanguageSwitcher|sl-app-root|I18nProvider/);

  const verifySource = await fsp.readFile(path.join(projectRoot, 'src/subpackages/scan/verify/index.tsx'), 'utf8');
  assert.match(verifySource, /<Input\s+className='sl-form-input sl-auto-data'\s+value=\{identityName\}/, 'visitor name must preserve its own bidirectional text direction');

  assert.equal(pageSources.length, 16, 'all registered page roots must be covered by the page-level i18n shell');
  for (const pageSource of pageSources) {
    assert.match(pageSource, /I18nPageShell/);
    assert.match(pageSource, /export default function \w+Entry\(\)[\s\S]*<I18nPageShell navigationTitleKey=['"][a-z]+\.[A-Za-z]+['"][^>]*>/);
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
    builder.onResolve({ filter: /^@tarojs\/components$/ }, () => ({ path: taroComponentsStub }));
    builder.onResolve({ filter: /^qrcode$/ }, () => ({ path: qrcodeStub }));
    builder.onResolve({ filter: /^@shared-i18n\/messages$/ }, () => ({ path: path.join(sharedI18nRoot, 'messages.ts') }));
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, (args) => ({ path: args.path, external: true }));
    builder.onResolve({ filter: /^@\// }, (args) => ({ path: resolveSourceImport(args.path) }));
  },
};

await fsp.rm(outdir, { recursive: true, force: true });
await fsp.mkdir(outdir, { recursive: true });
await assertLanguageMenuContracts();

for (const testEntry of testEntries) {
  const outfile = path.join(outdir, `${path.basename(testEntry, path.extname(testEntry))}.mjs`);
  await build({
    entryPoints: [testEntry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    sourcemap: 'inline',
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
    jsx: 'automatic',
    loader: { '.scss': 'empty', '.css': 'empty' },
    plugins: [testAliasPlugin],
    logLevel: 'silent',
  });
  await import(pathToFileURL(outfile).href);
}
