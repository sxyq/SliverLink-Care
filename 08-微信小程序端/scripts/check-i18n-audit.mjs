import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharedRoot = path.resolve(projectRoot, '../shared/i18n');
const outdir = path.join(projectRoot, '.local/i18n-audit');
const require = createRequire(import.meta.url);

/** 上下文中的中文允许保留：人名/地名/机构名、数据态、技术缩写、原生导航兜底、量表 API 题干。 */
const WHITELIST_PATTERNS = [
  { label: 'API gender value', pattern: /['"](男|女)['"]/ },
  { label: 'API QR status value', pattern: /['"](已停用|已重新生成|启用)['"]/ },
  { label: 'legacy ERROR_MESSAGES constant', pattern: /ERROR_MESSAGES|requestFailed:|networkFailed:|invalidQr:|permissionDenied:/ },
  { label: 'native navigationBarTitleText', pattern: /navigationBarTitleText:\s*['"]/ },
  { label: 'asset manifest notes', pattern: /source:|usage:/ },
  { label: 'agreement long-form content', pattern: /content\/agreements\.ts/ },
  { label: 'comment', pattern: /^\s*(\/\/|\*|\/\*)/ },
  { label: 'scale API question identity keys', pattern: /scaleQuestions|做事时提不起劲|感到心情低落|入睡困难|感觉疲倦|食欲不振|觉得自己很糟|对事物专注|动作或说话|有不如死掉|感到紧张|无法停止|对各种各样|很难放松|坐立不安|变得很容易|感到好像|你多久感到/ },
];

const PAGE_SURFACE_KEYS = {
  home: [
    'common.brandTitle',
    'common.brandSubtitle',
    'common.attribution',
    'auth.volunteerLogin',
    'auth.invitationRegister',
    'auth.login',
    'auth.scanView',
    'auth.scanElderInfo',
  ],
  elderDetail: [
    'workbench.elderDetail',
    'common.edit',
    'common.back',
    'common.archiveNumber',
    'common.contactPhone',
    'common.bloodType',
    'common.allergyHistory',
    'workbench.basicInfo',
    'workbench.archiveData',
    'workbench.medication',
    'workbench.medicationRecords',
    'workbench.scale',
    'workbench.qrManagement',
    'workbench.scanNameplate',
    'scan.addressInfo',
    'workbench.emergencyContact',
    'common.relationship',
    'common.attribution',
  ],
};

async function loadMessages() {
  const entry = path.join(sharedRoot, 'messages.ts');
  const outfile = path.join(outdir, `messages-${Date.now()}.mjs`);
  const { build } = await import('esbuild');
  await fsp.mkdir(outdir, { recursive: true });
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href);
}

function walkFiles(directory, extensions) {
  const stack = [directory];
  const files = [];
  while (stack.length) {
    const current = stack.pop();
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
      } else if (extensions.some((ext) => name.endsWith(ext))) {
        files.push(full);
      }
    }
  }
  return files.sort();
}

function readMessage(tree, key) {
  const value = key.split('.').reduce((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[part];
  }, tree);
  return typeof value === 'string' ? value : undefined;
}

function placeholders(value) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function extractUsedKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/\bt\(\s*['"]([a-zA-Z][\w.]*[\w])['"]/g)) {
    keys.add(match[1]);
  }
  return keys;
}

function findUnwhitelistedChinese(source, relativePath) {
  const findings = [];
  const lines = source.split('\n');
  lines.forEach((line, index) => {
    if (!/[一-鿿]/.test(line)) return;
    if (WHITELIST_PATTERNS.some((item) => item.pattern.test(line) || item.pattern.test(relativePath))) {
      return;
    }
    // 字段名/接口枚举等非可见文案
    if (/gender|status ===|ROLE_TYPES|import |from '|type |interface |console\.|catch|ERROR_MESSAGES/.test(line)) {
      return;
    }
    findings.push({ file: relativePath, line: index + 1, text: line.trim().slice(0, 140) });
  });
  return findings;
}

const report = {
  pages: [],
  keyCoverage: {},
  hardcodedChinese: [],
  navigationTitles: [],
  localeSwitch: {},
  failures: [],
};

function fail(message) {
  report.failures.push(message);
}

await fsp.rm(outdir, { recursive: true, force: true });
await fsp.mkdir(outdir, { recursive: true });

const { messages, getMessageKeys, SUPPORTED_LOCALES, LOCALE_META, createI18nRuntime, getDirection } = await loadMessages();

// 1) 键覆盖与占位符
const sourceKeys = getMessageKeys(messages['zh-CN']);
for (const locale of SUPPORTED_LOCALES) {
  const missing = [];
  const placeholderDrift = [];
  for (const key of sourceKeys) {
    const source = readMessage(messages['zh-CN'], key);
    const translated = readMessage(messages[locale], key);
    if (!translated) {
      missing.push(key);
      continue;
    }
    if (JSON.stringify(placeholders(translated)) !== JSON.stringify(placeholders(source))) {
      placeholderDrift.push(key);
    }
    if (locale === 'ii-CN' && !['common.token', 'scan.bmi'].includes(key) && /[一-鿿]/.test(translated)) {
      fail(`ii-CN still contains Chinese for ${key}: ${translated}`);
    }
  }
  report.keyCoverage[locale] = {
    total: sourceKeys.length,
    missing,
    placeholderDrift,
  };
  assert.equal(missing.length, 0, `${locale} missing keys: ${missing.slice(0, 10).join(', ')}`);
  assert.equal(placeholderDrift.length, 0, `${locale} placeholder drift: ${placeholderDrift.slice(0, 10).join(', ')}`);
}

// 2) 页面/子包源码 t() 键与硬编码中文
const pageRoots = [
  path.join(projectRoot, 'src/pages'),
  path.join(projectRoot, 'src/subpackages'),
  path.join(projectRoot, 'src/components'),
];
const pageFiles = pageRoots.flatMap((root) => walkFiles(root, ['.tsx', '.ts']));
const allUsedKeys = new Set();
for (const file of pageFiles) {
  const relativePath = path.relative(projectRoot, file).replaceAll('\\', '/');
  const source = await fsp.readFile(file, 'utf8');
  for (const key of extractUsedKeys(source)) {
    allUsedKeys.add(key);
    if (!sourceKeys.includes(key)) {
      fail(`missing message key used in ${relativePath}: ${key}`);
    }
  }
  const chinese = findUnwhitelistedChinese(source, relativePath);
  report.hardcodedChinese.push(...chinese);
  for (const item of chinese) {
    fail(`unwhitelisted Chinese in ${item.file}:${item.line} -> ${item.text}`);
  }
}

// 3) 导航标题：config 中文仅作原生兜底，页面必须经 I18nPageShell 同步
const configFiles = pageRoots.flatMap((root) => walkFiles(root, ['.config.ts']));
for (const file of configFiles) {
  const relativePath = path.relative(projectRoot, file).replaceAll('\\', '/');
  const source = await fsp.readFile(file, 'utf8');
  const titleMatch = source.match(/navigationBarTitleText:\s*['"]([^'"]+)['"]/);
  const pageSourcePath = file.replace(/\.config\.ts$/, '.tsx');
  const pageSource = await fsp.readFile(pageSourcePath, 'utf8');
  const navKeyMatch = pageSource.match(/navigationTitleKey=['"]([a-zA-Z][\w.]*)['"]/);
  assert.ok(titleMatch, `${relativePath} missing navigationBarTitleText`);
  assert.ok(navKeyMatch, `${pageSourcePath} missing I18nPageShell navigationTitleKey`);
  const key = navKeyMatch[1];
  const titles = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, readMessage(messages[locale], key)]));
  report.navigationTitles.push({
    page: relativePath,
    nativeFallback: titleMatch[1],
    key,
    titles,
  });
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(titles[locale], `nav title missing for ${locale} on ${relativePath}`);
  }
}

// 4) 首页 / 老人详情关键键四语言覆盖
for (const [surface, keys] of Object.entries(PAGE_SURFACE_KEYS)) {
  const table = {};
  for (const key of keys) {
    table[key] = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, readMessage(messages[locale], key) || '']));
    for (const locale of SUPPORTED_LOCALES) {
      if (!table[key][locale]) fail(`${surface} missing ${locale} for ${key}`);
      if (locale !== 'zh-CN' && table[key][locale] === table[key]['zh-CN'] && /[一-鿿]/.test(table[key]['zh-CN'])) {
        fail(`${surface} ${locale} not translated for ${key}`);
      }
    }
  }
  report.pages.push({ surface, keys: table });
}

// 5) 运行时切换：立即改变文案与导航标题，且无旧语言缓存
function runtimeSnapshot(locale) {
  const runtime = createI18nRuntime({ getItem: () => null, setItem: () => undefined });
  runtime.setLocale(locale);
  const home = PAGE_SURFACE_KEYS.home.map((key) => runtime.t(key));
  const elderDetail = PAGE_SURFACE_KEYS.elderDetail.map((key) => runtime.t(key));
  return {
    locale: runtime.getLocale(),
    direction: runtime.getDirection(),
    directionMeta: getDirection(locale),
    navHome: runtime.t('common.brandTitle'),
    navElderDetail: runtime.t('workbench.elderDetail'),
    home,
    elderDetail,
    edit: runtime.t('common.edit'),
    tiles: {
      basic: runtime.t('workbench.basicInfo'),
      medication: runtime.t('workbench.medication'),
      scale: runtime.t('workbench.scale'),
      qrcode: runtime.t('workbench.qrManagement'),
    },
  };
}

const snapshots = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, runtimeSnapshot(locale)]));
report.localeSwitch = snapshots;

for (const locale of SUPPORTED_LOCALES) {
  const snap = snapshots[locale];
  assert.equal(snap.locale, locale);
  const expectedDirection = LOCALE_META[locale].direction;
  assert.equal(snap.direction, expectedDirection);
  assert.equal(snap.directionMeta, expectedDirection);
  if (locale === 'ii-CN') {
    assert.notEqual(snap.navElderDetail, snapshots['zh-CN'].navElderDetail);
    assert.notEqual(snap.edit, snapshots['zh-CN'].edit);
    assert.notEqual(snap.tiles.basic, snapshots['zh-CN'].tiles.basic);
    assert.equal(/[一-鿿]/.test(snap.tiles.basic), false);
    assert.equal(/[一-鿿]/.test(snap.edit), false);
  }
  if (expectedDirection === 'rtl') {
    for (const key of ['common.contactPhone', 'common.archiveNumber']) {
      assert.ok(readMessage(messages[locale], key));
    }
  }
}

// 同一 runtime 连续切换不得残留旧语言
const switchRuntime = createI18nRuntime({ getItem: () => null, setItem: () => undefined });
const switchTrace = [];
for (const locale of SUPPORTED_LOCALES) {
  switchRuntime.setLocale(locale);
  switchTrace.push({
    locale,
    basic: switchRuntime.t('workbench.basicInfo'),
    nav: switchRuntime.t('workbench.elderDetail'),
    edit: switchRuntime.t('common.edit'),
  });
}
for (let index = 1; index < switchTrace.length; index += 1) {
  const prev = switchTrace[index - 1];
  const curr = switchTrace[index];
  assert.notEqual(curr.basic, prev.basic, `locale cache stale for basic after ${curr.locale}`);
  assert.notEqual(curr.nav, prev.nav, `locale cache stale for nav after ${curr.locale}`);
  assert.notEqual(curr.edit, prev.edit, `locale cache stale for edit after ${curr.locale}`);
}
report.localeSwitch.switchTrace = switchTrace;

// 6) 组件源码不得在模块级固化 t() 结果
for (const file of pageFiles) {
  const relativePath = path.relative(projectRoot, file).replaceAll('\\', '/');
  const source = await fsp.readFile(file, 'utf8');
  const moduleLevelT = source.match(/^const\s+\w+\s*=\s*t\(/m);
  if (moduleLevelT) {
    fail(`module-level t() cache in ${relativePath}`);
  }
}

await fsp.writeFile(path.join(outdir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (report.failures.length) {
  console.error('i18n audit failed:');
  for (const item of report.failures) console.error(` - ${item}`);
  process.exitCode = 1;
} else {
  console.log('i18n audit passed');
  console.log(`- locales: ${SUPPORTED_LOCALES.join(', ')}`);
  console.log(`- message keys: ${sourceKeys.length}`);
  console.log(`- page files scanned: ${pageFiles.length}`);
  console.log(`- nav titles synced: ${report.navigationTitles.length}`);
  console.log(`- report: ${path.relative(projectRoot, path.join(outdir, 'report.json'))}`);
}
