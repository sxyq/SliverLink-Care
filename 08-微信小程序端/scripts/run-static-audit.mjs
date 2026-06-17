import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const expectedTopPages = ['pages/home/index', 'pages/auth/login', 'pages/auth-role-redirect/index'];
const expectedScanPages = ['landing/index', 'verify/index', 'archive/index', 'medications/index', 'scales/index', 'nameplate/index'];
const expectedWorkbenchPages = ['elder-list/index', 'elder-detail/index', 'basic/index', 'medication/index', 'scale/index', 'qrcode/index'];
const expectedConditionNames = [
  'scan-landing',
  'scan-verify',
  'scan-archive',
  'scan-medications',
  'scan-scales',
  'scan-nameplate',
  'workbench-elder-list',
  'workbench-elder-detail',
  'workbench-basic',
  'workbench-medication',
  'workbench-scale',
  'workbench-qrcode',
];

async function readText(relativePath) {
  return fsp.readFile(path.join(projectRoot, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function collectFiles(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return [fullPath];
  }));
  return nested.flat();
}

function assertIncludesAll(actual, expected, label) {
  for (const item of expected) {
    assert.ok(actual.includes(item), `${label} missing ${item}`);
  }
}

function assertNoSensitiveMaterial(relativePath, content) {
  const forbiddenPatterns = [
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key block'],
    [/\bappsecret\s*[:=]\s*['"][A-Za-z0-9_-]{8,}/i, 'appid secret literal'],
    [/\b(secretId|secretKey)\s*[:=]\s*['"][A-Za-z0-9_-]{8,}/i, 'cloud secret literal'],
    [/AKID[A-Za-z0-9_-]{16,}/, 'cloud access key id'],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert.ok(!pattern.test(content), `${relativePath} contains ${label}`);
  }
}

const packageJson = await readJson('package.json');
assert.equal(packageJson.private, true, 'package must remain private');
assert.ok(packageJson.sideEffects === false, 'package sideEffects should stay false for tree shaking');
for (const scriptName of ['test:unit', 'test:static', 'test:route-contract', 'test:platform-contract', 'test:page-privacy-render', 'test:dist-security', 'test:artifact', 'test:performance-budget', 'test:build-performance', 'test:backend-contract', 'typecheck', 'build:weapp', 'ci:preview']) {
  assert.ok(packageJson.scripts?.[scriptName], `package script missing: ${scriptName}`);
}
assert.ok(packageJson.scripts?.['preci:upload']?.includes('run_weapp_local_checks.sh'), 'ci:upload must keep the local regression preflight');

const gitignore = await readText('.gitignore');
for (const pattern of ['.local/', 'dist-preview/', 'miniprogram-ci-qrcode.png']) {
  assert.match(gitignore, new RegExp(`(^|\\n)${pattern.replaceAll('.', '\\.')}`), `.gitignore must ignore ${pattern}`);
}

const ciScript = await readText('scripts/wechat-ci.mjs');
for (const ignored of ["'node_modules/**/*'", "'.local/**/*'", "'dist-preview/**/*'"]) {
  assert.ok(ciScript.includes(ignored), `wechat-ci ignores must include ${ignored}`);
}
assert.ok(ciScript.includes('privateKeyPath'), 'wechat-ci must keep private key path in local config only');
assert.ok(ciScript.includes("qrcodeFormat: 'image'"), 'wechat-ci preview must emit image QR code');

const ciExample = await readJson('scripts/wechat-ci.config.example.json');
assert.equal(ciExample.appid, 'wxd6f1eb971f5d4bc5', 'CI example appid drifted');
assert.match(ciExample.privateKeyPath, /\/absolute\/path\/to\/private\./, 'CI example must not point at a real private key');
assert.match(ciExample.qrcodeOutputDest, /miniprogram-ci-qrcode\.png$/, 'CI example QR output name drifted');

const projectConfig = await readJson('project.config.json');
assert.equal(projectConfig.appid, 'wxd6f1eb971f5d4bc5', 'project appid drifted');
assert.equal(projectConfig.compileType, 'miniprogram', 'compileType drifted');
assert.equal(projectConfig.miniprogramRoot, 'dist/', 'source project config must point DevTools at dist/');
assert.equal(projectConfig.srcMiniprogramRoot, 'dist/', 'source project srcMiniprogramRoot must point at dist/');
assert.equal(projectConfig.setting?.ignoreUploadUnusedFiles, true, 'ignoreUploadUnusedFiles should stay enabled');
assert.equal(projectConfig.setting?.minified, true, 'minified should stay enabled');
assert.equal(projectConfig.setting?.minifyWXSS, true, 'minifyWXSS should stay enabled');
assert.equal(projectConfig.setting?.minifyWXML, true, 'minifyWXML should stay enabled');

const conditionList = projectConfig.condition?.miniprogram?.list || [];
assert.equal(conditionList.length, 12, 'DevTools condition matrix must cover 12 entries');
assert.deepEqual(conditionList.map((item) => item.name), expectedConditionNames, 'DevTools condition order/name drifted');
for (const condition of conditionList) {
  assert.ok(condition.path, `condition ${condition.name} is missing path`);
  if (condition.path.startsWith('subpackages/scan/') && !['scan-landing', 'scan-nameplate'].includes(condition.name)) {
    assert.match(String(condition.query || ''), /elderId=/, `condition ${condition.name} must carry elderId`);
  }
  if (['scan-archive', 'scan-medications', 'scan-scales'].includes(condition.name)) {
    assert.match(String(condition.query || ''), /sessionId=/, `condition ${condition.name} must carry sessionId`);
  }
}

const appConfigSource = await readText('src/app/app.config.ts');
assertIncludesAll(appConfigSource, expectedTopPages, 'app config top pages');
assertIncludesAll(appConfigSource, expectedScanPages, 'app config scan pages');
assertIncludesAll(appConfigSource, expectedWorkbenchPages, 'app config workbench pages');
assert.ok(appConfigSource.includes("lazyCodeLoading: 'requiredComponents'"), 'lazyCodeLoading should stay enabled');
assert.ok(appConfigSource.includes('request: 15000'), 'request timeout should stay 15000ms');
assert.ok(appConfigSource.includes('downloadFile: 20000'), 'download timeout should stay 20000ms');

const envSource = await readText('src/utils/env.ts');
assert.match(envSource, /https:\/\/sxyq27\.online\/silverlink-api/, 'API fallback must point to live HTTPS backend');
assert.ok(!envSource.includes('http://'), 'env source must not include insecure http URL');
assert.ok(envSource.includes('TARO_APP_API_BASE_URL'), 'API base override constant missing');

const httpClientSource = await readText('src/services/api/httpClient.ts');
for (const invariant of ['enableCookie: true', 'statusCode === 401', 'clearAuthSession()', 'timeout: options.timeout || 15000', 'timeout: 20000']) {
  assert.ok(httpClientSource.includes(invariant), `httpClient invariant missing: ${invariant}`);
}

const authStoreSource = await readText('src/store/auth/authStore.ts');
for (const invariant of ['clearCurrentElderSummary()', 'clearAppSession()', 'removeStorageValue(STORAGE_KEYS.launchContext)', "'api_cache__'", "'sl_weapp_volunteer_medications__'", 'removeStorageValuesByPrefix(AUTH_SCOPED_STORAGE_PREFIXES)']) {
  assert.ok(authStoreSource.includes(invariant), `authStore privacy cleanup invariant missing: ${invariant}`);
}

const sourceFiles = [
  ...(await collectFiles(path.join(projectRoot, 'src'))),
  ...(await collectFiles(path.join(projectRoot, 'config'))),
  ...(await collectFiles(path.join(projectRoot, 'scripts'))),
  path.join(projectRoot, 'package.json'),
  path.join(projectRoot, 'project.config.json'),
  path.join(projectRoot, '.gitignore'),
].filter((filePath) => /\.(?:ts|tsx|mjs|js|json|md|gitignore)$/.test(filePath) || filePath.endsWith('.gitignore'));

for (const filePath of sourceFiles) {
  const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
  assertNoSensitiveMaterial(relativePath, await fsp.readFile(filePath, 'utf8'));
}

const localConfigPath = path.join(projectRoot, '.local/wechat-ci/config.json');
assert.ok(fs.existsSync(localConfigPath), 'local WeChat CI config should exist on this machine for preview checks');
assert.ok(gitignore.includes('.local/'), 'local WeChat CI config must remain ignored by git');

console.log('static audit checks passed');
console.log(`conditions: ${conditionList.length}`);
console.log(`sourceFilesScanned: ${sourceFiles.length}`);
