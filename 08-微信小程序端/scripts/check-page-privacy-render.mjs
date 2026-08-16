import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

const scanRoots = [
  'src/pages',
  'src/subpackages',
  'src/components',
  'src/hooks',
  'src/services/scan',
  'src/store',
];

const workbenchServiceFiles = [
  'src/services/workbench/elderService.ts',
  'src/services/workbench/medicationService.ts',
  'src/services/workbench/scaleService.ts',
  'src/services/workbench/qrcodeService.ts',
];

const forbiddenSourcePatterns = [
  [/\bRichText\b/, 'RichText component'],
  [/<\s*rich-text\b/i, 'rich-text element'],
  [/<\s*web-view\b/i, 'web-view element'],
  [/\bWebView\b/, 'WebView component'],
  [/\bdangerouslySetInnerHTML\b/, 'dangerouslySetInnerHTML'],
  [/\binnerHTML\b/, 'innerHTML'],
  [/\bouterHTML\b/, 'outerHTML'],
  [/\beval\s*\(/, 'eval call'],
  [/\bnew\s+Function\b/, 'new Function'],
];

const forbiddenQueryPatterns = [
  [/[?&](?:idCard|password|currentPassword|phone|mobile|authToken)=/i, 'sensitive query key literal'],
  [/searchParams\.set\(\s*['"](?:idCard|password|currentPassword|phone|mobile|authToken)['"]/i, 'sensitive search param builder'],
];

const forbiddenStoragePatterns = [
  [/setStorageValue(?:Async)?\([^)]*(?:identityPhone|identityIdCard|smsMessageBody|smsReceiverPhone|idCard|currentPassword|password)/s, 'sensitive scan credential storage'],
];

const fieldClassification = {
  'public-before-verify': ['name(masked)', 'gender', 'age', 'archiveNo', 'emergencyPhoneMasked', 'relationship', 'aboType', 'rhType', 'allergySummary'],
  'verified-only': ['residence', 'archive', 'medications', 'scales', 'sessionId'],
  'auth-only': ['frontPhone', 'qrcode public link', 'nameplate preview/pdf', 'workbench elder full profile'],
  'never-render': ['idCard', 'password', 'currentPassword', 'authToken', 'qrToken', 'backQrToken', 'smsSessionId'],
};

async function collectFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

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

async function readText(relativePath) {
  return fsp.readFile(path.join(projectRoot, relativePath), 'utf8');
}

function toRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function assertContainsAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} missing snippet: ${snippet}`);
  }
}

function assertNotContains(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(!source.includes(snippet), `${label} contains forbidden snippet: ${snippet}`);
  }
}

function assertOrdered(source, snippets, label) {
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    assert.ok(index > cursor, `${label} missing ordered snippet after index ${cursor}: ${snippet}`);
    cursor = index;
  }
}

function collectPatternHits(fileSources, patterns) {
  const hits = [];
  for (const [relativePath, source] of fileSources.entries()) {
    for (const [pattern, label] of patterns) {
      if (pattern.test(source)) {
        hits.push({ relativePath, label });
      }
    }
  }
  return hits;
}

function assertNoPatternHits(fileSources, patterns, label) {
  const hits = collectPatternHits(fileSources, patterns);
  assert.deepEqual(
    hits,
    [],
    `${label}: ${hits.map((hit) => `${hit.relativePath} contains ${hit.label}`).join('; ')}`,
  );
  return hits.length;
}

function collectImageBindings(fileSources) {
  const bindings = [];
  const imagePattern = /<Image\b[\s\S]*?\bsrc=\{([^}]+)\}[\s\S]*?\/?>/g;
  for (const [relativePath, source] of fileSources.entries()) {
    for (const match of source.matchAll(imagePattern)) {
      bindings.push({
        relativePath,
        value: match[1].trim(),
      });
    }
  }
  return bindings;
}

const sourceFileSet = new Set();
for (const root of scanRoots) {
  for (const filePath of await collectFiles(path.join(projectRoot, root))) {
    if (/\.(?:ts|tsx)$/.test(filePath)) {
      sourceFileSet.add(filePath);
    }
  }
}
for (const relativePath of workbenchServiceFiles) {
  sourceFileSet.add(path.join(projectRoot, relativePath));
}

const sourceFiles = [...sourceFileSet].sort();
const fileSources = new Map();
for (const filePath of sourceFiles) {
  fileSources.set(toRelative(filePath), await fsp.readFile(filePath, 'utf8'));
}

const pageFiles = sourceFiles.filter((filePath) => (
  /\/src\/pages\/.*\.tsx$/.test(filePath) ||
  /\/src\/subpackages\/.*\/index\.tsx$/.test(filePath)
));
const componentFiles = sourceFiles.filter((filePath) => /\/src\/components\/.*\.tsx$/.test(filePath));

assertNoPatternHits(fileSources, forbiddenSourcePatterns, 'dangerous render API scan failed');
assertNoPatternHits(fileSources, [[/\bconsole\.(?:log|warn|error|info|debug)\b/, 'console output']], 'console output scan failed');
assertNoPatternHits(fileSources, forbiddenQueryPatterns, 'sensitive query scan failed');
assertNoPatternHits(fileSources, forbiddenStoragePatterns, 'sensitive storage scan failed');

const landingSource = await readText('src/subpackages/scan/landing/index.tsx');
assertContainsAll(landingSource, [
  'function maskName(name: string)',
  'maskName(basicInfo.name)',
  'basicInfo.emergencyPhoneMasked',
  "t('scan.completeVerifyToViewAddress')",
  'handleEmergencyCall(basicInfo.emergencyPhoneDial)',
  'basicInfo.allergySummary',
], 'scan landing public-before-verify privacy contract');
assertNotContains(landingSource, ['basicInfo.residence'], 'scan landing must not render full residence before verification');

const verifySource = await readText('src/subpackages/scan/verify/index.tsx');
assertContainsAll(verifySource, [
  'function formatSmsReceiverLabel(maskedPhone: string, fallback: string)',
  'value={identityPhone}',
  'value={identityIdCard}',
  'phone: normalizePhone(identityPhone)',
  'idCard: normalizeIdCard(identityIdCard)',
  'await Taro.setClipboardData({ data: smsMessageBody })',
  'window.location.href = buildSmsLink(smsReceiverPhone, smsMessageBody)',
  "formatSmsReceiverLabel(smsReceiverPhoneMasked, t('errors.noPhone'))",
  'smsReceiverPhoneMasked ?',
  'scan-verify-data-card scan-verify-data-card--message',
], 'scan verify sensitive field channel contract');
assertNotContains(verifySource, [
  'smsReceiverPhoneMasked || smsReceiverPhone',
  '${smsReceiverPhone}',
], 'scan verify modal/toast must not expose full receiver phone fallback');

for (const relativePath of [
  'src/subpackages/scan/archive/index.tsx',
  'src/subpackages/scan/medications/index.tsx',
  'src/subpackages/scan/scales/index.tsx',
]) {
  const source = await readText(relativePath);
  assertContainsAll(source, [
    'const sessionId = String(router.params?.sessionId || \'\')',
    'const hasProtectedContext = Boolean(elderId && sessionId)',
    'if (!elderId || !sessionId)',
  ], `${relativePath} protected scan context contract`);
}

const qrcodePageSource = await readText('src/subpackages/workbench/qrcode/index.tsx');
assertContainsAll(qrcodePageSource, [
  'const session = getAuthSession()',
  'if (!session)',
  'Taro.redirectTo({ url: APP_ROUTES.login })',
  'const image = await resolveWorkbenchQrPreviewImage(info)',
  'src={previewImage}',
], 'workbench qrcode auth-only render contract');
assertNotContains(qrcodePageSource, [
  'src={info.qrImageUrl}',
  'src={info.url}',
  'src={info.publicUrl}',
], 'workbench qrcode image source contract');

const nameplateSource = await readText('src/subpackages/scan/nameplate/index.tsx');
assertOrdered(nameplateSource, [
  'if (!session)',
  'Taro.redirectTo({ url: APP_ROUTES.login })',
  'const result = await fetchNameplatePreview(elderId)',
], 'nameplate preview must guard auth before fetching sensitive preview');
assertContainsAll(nameplateSource, [
  'if (!session) {',
  'return null',
  'resolveBase64PreviewImage(base64, \'nameplate-pdf-preview\')',
  'resolveBase64PreviewImage(directBase64, \'nameplate-qr-preview\')',
  'resolveQrPayloadPreviewImage(nameplateQrValue, \'nameplate-qr-preview\')',
  'resolveWorkbenchQrPreviewImage(info)',
  'src={pdfPreviewImage}',
  'src={qrImage}',
], 'nameplate preview safe image render contract');
assertNotContains(nameplateSource, [
  'directBase64.startsWith(\'data:image\') ? directBase64',
  'src={preview.backQrImageBase64}',
  'src={preview.backQrUrl}',
  'src={preview.backQrPayload}',
  'src={preview.backQrToken}',
], 'nameplate image source contract');

const qrcodeServiceSource = await readText('src/services/workbench/qrcodeService.ts');
assertContainsAll(qrcodeServiceSource, [
  'function normalizeBase64Image(value?: string)',
  'export async function resolveBase64PreviewImage',
  'export async function resolveQrPayloadPreviewImage',
  'export async function resolveWorkbenchQrPreviewImage',
  'return resolveQrPayloadPreviewImage(displayUrl, \'qr-preview\')',
], 'qrcode service safe resolver contract');
assertNotContains(qrcodeServiceSource, ['return info.qrImageUrl'], 'qrcode service must not directly bind backend image URL');

const imageBindings = collectImageBindings(fileSources);
const allowedImageBindings = new Set(['previewImage', 'pdfPreviewImage', 'qrImage']);
for (const binding of imageBindings) {
  assert.ok(
    allowedImageBindings.has(binding.value),
    `${binding.relativePath} has unreviewed Image src binding: ${binding.value}`,
  );
}

let distFilesScanned = 0;
if (fs.existsSync(distRoot)) {
  const distFiles = (await collectFiles(distRoot)).filter((filePath) => /\.(?:js|wxml)$/.test(filePath));
  distFilesScanned = distFiles.length;
  const distSources = new Map();
  for (const filePath of distFiles) {
    distSources.set(toRelative(filePath), await fsp.readFile(filePath, 'utf8'));
  }
  assertNoPatternHits(distSources, [
    [/<\s*rich-text\b/i, 'rich-text element'],
    [/<\s*web-view\b/i, 'web-view element'],
    [/\bnodes\s*=/i, 'rich-text nodes attribute'],
    [/\beval\s*\(/, 'eval call'],
  ], 'dist dangerous render scan failed');
}

const privacyContracts = 8;
console.log('page privacy render checks passed');
console.log(`sourceFilesScanned: ${sourceFiles.length}`);
console.log(`pagesScanned: ${pageFiles.length}`);
console.log(`componentsScanned: ${componentFiles.length}`);
console.log(`fieldClassificationGroups: ${Object.keys(fieldClassification).length}`);
console.log(`privacyContracts: ${privacyContracts}`);
console.log('dangerousRenderHits: 0');
console.log('consoleHits: 0');
console.log(`imageBindings: ${imageBindings.length}`);
console.log(`distFilesScanned: ${distFilesScanned}`);
