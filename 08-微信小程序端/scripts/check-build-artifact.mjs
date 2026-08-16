import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

const requiredFiles = [
  'app.json',
  'project.config.json',
  'pages/home/index.js',
  'pages/auth/login.js',
  'pages/auth-role-redirect/index.js',
  'subpackages/scan/landing/index.js',
  'subpackages/scan/verify/index.js',
  'subpackages/scan/archive/index.js',
  'subpackages/scan/medications/index.js',
  'subpackages/scan/scales/index.js',
  'subpackages/scan/nameplate/index.js',
  'subpackages/workbench/elder-list/index.js',
  'subpackages/workbench/elder-detail/index.js',
  'subpackages/workbench/basic/index.js',
  'subpackages/workbench/medication/index.js',
  'subpackages/workbench/scale/index.js',
  'subpackages/workbench/qrcode/index.js',
];

const expectedScanPages = [
  'landing/index',
  'verify/index',
  'archive/index',
  'medications/index',
  'scales/index',
  'nameplate/index',
];

const expectedWorkbenchPages = [
  'elder-list/index',
  'elder-detail/index',
  'basic/index',
  'medication/index',
  'scale/index',
  'qrcode/index',
];

async function readJson(relativePath) {
  return JSON.parse(await fsp.readFile(path.join(distRoot, relativePath), 'utf8'));
}

async function readProjectJson(relativePath) {
  return JSON.parse(await fsp.readFile(path.join(projectRoot, relativePath), 'utf8'));
}

async function readSource(relativePath) {
  return fsp.readFile(path.join(projectRoot, relativePath), 'utf8');
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

function relativeDistPath(fullPath) {
  return path.relative(distRoot, fullPath).replaceAll(path.sep, '/');
}

function assertIncludesAll(actual, expected, label) {
  for (const item of expected) {
    assert.ok(actual.includes(item), `${label} missing ${item}`);
  }
}

function allRegisteredPages(appConfig) {
  const pages = [...appConfig.pages];
  for (const subpackage of appConfig.subpackages || []) {
    for (const page of subpackage.pages || []) {
      pages.push(`${subpackage.root}/${page}`);
    }
  }
  return pages;
}

assert.ok(fs.existsSync(distRoot), 'dist directory is missing; run npm run build:weapp first');

const appJson = await readJson('app.json');
assert.deepEqual(appJson.pages, [
  'pages/home/index',
  'pages/auth/login',
  'pages/auth-role-redirect/index',
]);

const scanSubpackage = appJson.subpackages.find((item) => item.root === 'subpackages/scan');
const workbenchSubpackage = appJson.subpackages.find((item) => item.root === 'subpackages/workbench');
assert.ok(scanSubpackage, 'scan subpackage is missing');
assert.ok(workbenchSubpackage, 'workbench subpackage is missing');
assertIncludesAll(scanSubpackage.pages, expectedScanPages, 'scan subpackage pages');
assertIncludesAll(workbenchSubpackage.pages, expectedWorkbenchPages, 'workbench subpackage pages');

const projectConfig = await readJson('project.config.json');
assert.equal(projectConfig.compileType, 'miniprogram');
assert.equal(projectConfig.miniprogramRoot, './');
assert.ok(projectConfig.appid, 'appid is missing from dist project config');

const sourceProjectConfig = await readProjectJson('project.config.json');
assert.equal(sourceProjectConfig.miniprogramRoot, 'dist/');
assert.equal(sourceProjectConfig.compileType, 'miniprogram');

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(distRoot, relativePath)), `required artifact missing: ${relativePath}`);
}

const registeredPages = allRegisteredPages(appJson);
const devtoolsConditions = sourceProjectConfig.condition?.miniprogram?.list || [];
assert.equal(devtoolsConditions.length, 12, 'DevTools condition matrix should cover 12 miniapp pages');

for (const condition of devtoolsConditions) {
  assert.ok(condition.name, 'DevTools condition is missing name');
  assert.ok(condition.path, `DevTools condition ${condition.name} is missing path`);
  assert.ok(registeredPages.includes(condition.path), `DevTools condition ${condition.name} points to an unregistered page: ${condition.path}`);
  for (const extension of ['js', 'json', 'wxml']) {
    assert.ok(
      fs.existsSync(path.join(distRoot, `${condition.path}.${extension}`)),
      `DevTools condition ${condition.name} missing built ${extension}: ${condition.path}.${extension}`,
    );
  }

  if (condition.path.startsWith('subpackages/scan/') && !condition.path.endsWith('/landing/index') && !condition.path.endsWith('/nameplate/index')) {
    assert.match(String(condition.query || ''), /elderId=/, `DevTools condition ${condition.name} should carry elderId`);
  }

  if (['subpackages/scan/archive/index', 'subpackages/scan/medications/index', 'subpackages/scan/scales/index'].includes(condition.path)) {
    assert.match(String(condition.query || ''), /sessionId=/, `DevTools condition ${condition.name} should carry sessionId`);
  }
}

const verifyConfig = await readJson('subpackages/scan/verify/index.json');
assert.equal(verifyConfig.navigationBarTitleText, '访问验证');

const verifyBundle = await fsp.readFile(path.join(distRoot, 'subpackages/scan/verify/index.js'), 'utf8');
const verifySource = await readSource('src/subpackages/scan/verify/index.tsx');
assert.ok(
  verifyBundle.includes('\\u4e00\\u952e\\u8df3\\u8f6c\\u77ed\\u4fe1') || verifySource.includes("t('verification.openSmsComposer')"),
  'scan verify bundle/source is missing one-tap SMS button text',
);
assert.ok(
  verifyBundle.includes('\\u77ed\\u4fe1\\u5185\\u5bb9\\u5df2\\u590d\\u5236') || verifySource.includes("t('verification.messageCopied')"),
  'scan verify bundle/source is missing SMS copied fallback text',
);
assert.ok(verifyBundle.includes('sessionId') && verifyBundle.includes('elderId'), 'scan verify bundle is missing protected session/elder routing fields');
assert.ok(
  verifyBundle.includes('\\u9a8c\\u8bc1\\u4f1a\\u8bdd\\u4e0e\\u5f53\\u524d\\u8001\\u4eba\\u4e0d\\u4e00\\u81f4') || (
    verifySource.includes('result.elderId && result.elderId !== elderId')
    && verifySource.includes('status.elderId && status.elderId !== elderId')
    && verifySource.includes("setErrorKey('errors.verificationMismatch')")
  ),
  'scan verify bundle/source is missing cross-elder guard message',
);

const scanArchiveBundle = await fsp.readFile(path.join(distRoot, 'subpackages/scan/archive/index.js'), 'utf8');
assert.ok(scanArchiveBundle.includes('sessionId') && scanArchiveBundle.includes('elderId'), 'scan archive bundle is missing protected query fields');

const qrcodeBundle = await fsp.readFile(path.join(distRoot, 'subpackages/workbench/qrcode/index.js'), 'utf8');
const qrcodeSource = await readSource('src/subpackages/workbench/qrcode/index.tsx');
assert.ok(
  qrcodeBundle.includes('\\u4e8c\\u7ef4\\u7801\\u8bbf\\u95ee\\u94fe\\u63a5\\u5df2\\u590d\\u5236') || qrcodeSource.includes("t('workbench.copiedAccessLink')"),
  'workbench qrcode bundle/source is missing copy-link success text',
);
assert.ok(
  qrcodeBundle.includes('\\u5bfc\\u51fa\\u540d\\u724c') || qrcodeSource.includes("t('workbench.exportNameplate')"),
  'workbench qrcode bundle/source is missing nameplate export entry',
);
assert.ok(
  qrcodeBundle.includes('\\u505c\\u7528\\u4e8c\\u7ef4\\u7801') || qrcodeSource.includes("t('workbench.disableQr')"),
  'workbench qrcode bundle/source is missing QR disable action text',
);

const nameplateBundle = await fsp.readFile(path.join(distRoot, 'subpackages/scan/nameplate/index.js'), 'utf8');
const nameplateSource = await readSource('src/subpackages/scan/nameplate/index.tsx');
assert.ok(
  (nameplateBundle.includes('\\u80cc\\u9762') && nameplateBundle.includes('\\u626b\\u7801\\u67e5\\u770b'))
    || (nameplateSource.includes("t('scan.backNameplate')") && nameplateSource.includes("t('scan.wechatScanHealthArchive')")),
  'scan nameplate bundle/source is missing back-side scan preview text',
);
assert.ok(
  nameplateBundle.includes('PDF')
    || (nameplateSource.includes("t('scan.generatePdf')") && nameplateSource.includes("t('scan.downloadPdf')")),
  'scan nameplate bundle/source is missing PDF export text',
);

const qrcodeServiceSource = await fsp.readFile(path.join(projectRoot, 'src/services/workbench/qrcodeService.ts'), 'utf8');
for (const field of ['publicUrl', 'qrImageBase64', 'qrImageUrl', 'disableReviewStatus', 'backQrUrl', 'backQrPayload', 'backQrImageBase64']) {
  assert.ok(qrcodeServiceSource.includes(field), `qrcode service source is missing compatibility field: ${field}`);
}

const allFiles = await collectFiles(distRoot);
const totalBytes = allFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largestFiles = allFiles
  .map((file) => ({ file: relativeDistPath(file), size: fs.statSync(file).size }))
  .sort((left, right) => right.size - left.size)
  .slice(0, 5);

assert.ok(totalBytes > 0, 'dist is empty');
assert.ok(totalBytes < 2 * 1024 * 1024, `dist is unexpectedly large: ${totalBytes} bytes`);

console.log('artifact checks passed');
console.log(`files: ${allFiles.length}`);
console.log(`totalBytes: ${totalBytes}`);
console.log('largestFiles:');
for (const item of largestFiles) {
  console.log(`- ${item.file}: ${item.size}`);
}
