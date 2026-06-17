import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

const allowedExtensions = new Set(['.js', '.json', '.wxml', '.wxss', '.wxs']);
const allowedInsecureUrls = new Set(['http://www.w3.org/2000/svg']);

const forbiddenFilePatterns = [
  [/^(?:^|.*\/)(?:\.local|dist-preview|node_modules)(?:\/|$)/, 'local/dependency output directory'],
  [/(^|\/)\.env(?:\..*)?$/i, 'environment file'],
  [/(^|\/)project\.private\.config\.json$/i, 'private DevTools config'],
  [/(^|\/).*preview-info.*\.json$/i, 'preview metadata file'],
  [/\.(?:map|pem|key|p12|pfx|sqlite|sqlite3|db|sql)$/i, 'source map, credential, or database file'],
  [/(^|\/)miniprogram-ci-qrcode\.(?:png|jpe?g|webp)$/i, 'CI preview QR image'],
];

const forbiddenContentPatterns = [
  [/sourceMappingURL=/, 'source map reference'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key block'],
  [/\bprivateKeyPath\b/, 'private key path config'],
  [/\b(?:appsecret|appSecret|secretId|secretKey)\b\s*[:=]\s*['"][A-Za-z0-9_./+=-]{8,}['"]/, 'cloud or app secret literal'],
  [/\bAKID[A-Za-z0-9_-]{16,}\b/, 'cloud access key id'],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, 'JWT literal'],
  [/\/Users\/[A-Za-z0-9._-]+\//, 'local macOS absolute path'],
  [/(?:^|[^A-Za-z0-9_])(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?:[^A-Za-z0-9_]|$)/i, 'localhost address'],
  [/\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/, 'private network address'],
  [/(?:^|[^A-Za-z0-9])1[3-9]\d{9}(?:[^A-Za-z0-9]|$)/, 'hard-coded mainland China phone number'],
  [/(?:^|[^A-Za-z0-9])\d{17}[\dXx](?:[^A-Za-z0-9]|$)/, 'hard-coded mainland China ID number'],
  [/(?:^|[^A-Za-z0-9_.-])(?:\.local\/|dist-preview\/|miniprogram-ci-qrcode\.)/i, 'local preview artifact reference'],
];

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

function assertNoForbiddenFile(relativePath) {
  for (const [pattern, label] of forbiddenFilePatterns) {
    assert.ok(!pattern.test(relativePath), `${relativePath} is a forbidden dist ${label}`);
  }
}

function assertExpectedExtension(relativePath) {
  const extension = path.extname(relativePath);
  assert.ok(allowedExtensions.has(extension), `${relativePath} has unexpected dist extension ${extension || '(none)'}`);
}

function assertNoForbiddenContent(relativePath, content) {
  for (const [pattern, label] of forbiddenContentPatterns) {
    assert.ok(!pattern.test(content), `${relativePath} contains ${label}`);
  }

  const insecureUrls = [...content.matchAll(/http:\/\/[^\s"'`<>)]+/g)]
    .map((match) => match[0].replace(/[.,;]+$/, ''))
    .filter((url) => !allowedInsecureUrls.has(url));
  assert.deepEqual(insecureUrls, [], `${relativePath} contains insecure URL(s): ${insecureUrls.join(', ')}`);
}

function assertDevtoolsConditionSafety(projectConfig) {
  const conditions = projectConfig.condition?.miniprogram?.list || [];
  assert.equal(conditions.length, 12, 'dist project config should keep the 12-entry DevTools condition matrix');

  const forbiddenQueryKey = /(?:^|[?&])(?:token|authToken|phone|mobile|idCard|password)=/i;
  for (const condition of conditions) {
    const query = String(condition.query || '');
    assert.ok(!forbiddenQueryKey.test(query), `DevTools condition ${condition.name} exposes sensitive query key`);
    assert.ok(!query.includes('http://'), `DevTools condition ${condition.name} uses insecure query URL`);
  }
}

assert.ok(fs.existsSync(distRoot), 'dist directory is missing; run npm run build:weapp first');

const allFiles = await collectFiles(distRoot);
assert.ok(allFiles.length > 0, 'dist is empty');

for (const filePath of allFiles) {
  const relativePath = relativeDistPath(filePath);
  assertNoForbiddenFile(relativePath);
  assertExpectedExtension(relativePath);
  const content = await fsp.readFile(filePath, 'utf8');
  assertNoForbiddenContent(relativePath, content);
}

const projectConfig = JSON.parse(await fsp.readFile(path.join(distRoot, 'project.config.json'), 'utf8'));
assert.equal(projectConfig.compileType, 'miniprogram', 'dist project config compileType drifted');
assert.equal(projectConfig.miniprogramRoot, './', 'dist project config must point miniprogramRoot at ./');
assert.equal(projectConfig.setting?.ignoreUploadUnusedFiles, true, 'dist project config should ignore unused upload files');
assert.equal(projectConfig.setting?.localPlugins, false, 'dist project config should not enable local plugins');
assert.deepEqual(projectConfig.packOptions?.include || [], [], 'dist project config should not force-include extra upload files');
assertDevtoolsConditionSafety(projectConfig);

const warnings = [];
if (projectConfig.setting?.uploadWithSourceMap === true) {
  warnings.push('uploadWithSourceMap=true; no .map/sourceMappingURL is present in dist, but production upload policy should be reviewed.');
}

console.log('dist security checks passed');
console.log(`filesScanned: ${allFiles.length}`);
console.log(`warnings: ${warnings.length}`);
for (const warning of warnings) {
  console.log(`- ${warning}`);
}
