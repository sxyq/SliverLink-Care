import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const defaultReportDir = path.join(
  repoRoot,
  '06-测试与质量保障/reports/regression/20260606-190933-weapp-local-comprehensive',
);
const reportDir = path.resolve(process.argv[2] || defaultReportDir);

async function readText(filePath) {
  return fsp.readFile(filePath, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function resolveFromReport(relativePath) {
  return path.resolve(reportDir, relativePath);
}

function assertFile(filePath, label = filePath) {
  assert.ok(fs.existsSync(filePath), `${label} is missing: ${filePath}`);
}

function assertImage(filePath) {
  assertFile(filePath, 'image evidence');
  const header = fs.readFileSync(filePath).subarray(0, 12);
  const hex = header.toString('hex');
  const isPng = hex.startsWith('89504e470d0a1a0a');
  const isJpeg = hex.startsWith('ffd8ff');
  const isWebp = header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
  assert.ok(isPng || isJpeg || isWebp, `${filePath} is not a supported image evidence file`);
  assert.ok(fs.statSync(filePath).size > 1024, `${filePath} is unexpectedly small`);
}

function assertTextIncludes(text, patterns, label) {
  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      assert.match(text, pattern, `${label} missing pattern ${pattern}`);
    } else {
      assert.ok(text.includes(pattern), `${label} missing ${pattern}`);
    }
  }
}

assertFile(reportDir, 'main weapp report directory');

const requiredMainFiles = [
  'summary.md',
  'failures.md',
  'commands.log',
  'logs/weapp-ci-preview-current.log',
  'performance.json',
  'evidence-matrix.md',
  'evidence-matrix.json',
  'screenshots/miniprogram-ci-qrcode.png',
];

for (const relativePath of requiredMainFiles) {
  assertFile(resolveFromReport(relativePath), `main report evidence ${relativePath}`);
}

for (const relativePath of requiredMainFiles.filter((item) => item.endsWith('.png'))) {
  assertImage(resolveFromReport(relativePath));
}

const summary = await readText(resolveFromReport('summary.md'));
assertTextIncludes(summary, [
  'npm run test:unit',
  'npm run test:static',
  'npm run test:route-contract',
  'npm run test:platform-contract',
  'npm run test:backend-contract',
  'npm run test:page-privacy-render',
  'npm run test:dist-security',
  'npm run typecheck',
  'npm run test:build-performance',
  'npm run build:weapp',
  'npm run test:artifact',
  'npm run test:performance-budget',
  'npm run ci:preview',
  'evidence-matrix.md',
  '本轮不执行实机或界面测试',
  '代码层',
], 'summary.md');

const failures = await readText(resolveFromReport('failures.md'));
assertTextIncludes(failures, [
  '历史运行时环境记录',
  '本轮非目标',
  '不影响本轮代码层测试结论',
  'miniprogram-ci-qrcode.png',
], 'failures.md');

const commandsLog = await readText(resolveFromReport('commands.log'));
assertTextIncludes(commandsLog, [
  'test:unit 22/22 passed',
  'test:static',
  'static audit checks passed',
  'test:route-contract passed',
  'test:platform-contract passed',
  'test:backend-contract passed',
  'test:page-privacy-render passed',
  'test:dist-security passed',
  'typecheck passed',
  'test:build-performance passed',
  'build:weapp passed',
  'test:artifact passed',
  'test:performance-budget passed',
  'ci:preview',
], 'commands.log');

const performance = await readJson(resolveFromReport('performance.json'));
assert.equal(performance.module, '08-微信小程序端', 'performance module drifted');
assert.equal(performance.checks.evidenceCheck.status, 'passed', 'evidence check status drifted');
assert.equal(performance.checks.evidenceCheck.matrixLayers, 6, 'evidence check matrix layer count drifted');
assert.ok(
  performance.checks.evidenceCheck.coverage.includes('code-level report required files'),
  'evidence check should focus on code-level required files',
);
assert.equal(performance.checks.unit.status, 'passed', 'unit status drifted');
assert.equal(performance.checks.unit.cases, 22, 'unit case count drifted');
assert.equal(performance.checks.staticAudit.status, 'passed', 'static audit status drifted');
assert.equal(performance.checks.staticAudit.conditions, 12, 'static audit condition count drifted');
assert.equal(performance.checks.staticAudit.sourceFilesScanned, 98, 'static audit scanned file count drifted');
assert.equal(performance.checks.routeContract.status, 'passed', 'route contract status drifted');
assert.equal(performance.checks.routeContract.routeConstants, 15, 'route contract route constant count drifted');
assert.equal(performance.checks.routeContract.registeredPages, 15, 'route contract registered page count drifted');
assert.equal(performance.checks.routeContract.sourceRouteReferences, 49, 'route contract source reference count drifted');
assert.equal(performance.checks.routeContract.queryContracts, 10, 'route contract query contract count drifted');
assert.equal(performance.checks.routeContract.navigationContracts, 12, 'route contract navigation contract count drifted');
assert.equal(performance.checks.routeContract.switchTabUsages, 0, 'route contract switchTab usage count drifted');
assert.equal(performance.checks.platformContract.status, 'passed', 'platform contract status drifted');
assert.equal(performance.checks.platformContract.taroMethods, 27, 'platform contract Taro method count drifted');
assert.equal(performance.checks.platformContract.platformContracts, 9, 'platform contract count drifted');
assert.equal(performance.checks.platformContract.windowReferences, 1, 'platform contract window reference count drifted');
assert.equal(performance.checks.backendContract.status, 'passed', 'backend contract status drifted');
assert.equal(performance.checks.backendContract.contracts, 38, 'backend contract count drifted');
assert.equal(performance.checks.backendContract.backendRoutesScanned, 94, 'backend route scan count drifted');
assert.equal(performance.checks.backendContract.responseShapeContracts, 15, 'backend response-shape contract count drifted');
assert.equal(performance.checks.pagePrivacyRender.status, 'passed', 'page privacy render status drifted');
assert.equal(performance.checks.pagePrivacyRender.sourceFilesScanned, 57, 'page privacy source scan count drifted');
assert.equal(performance.checks.pagePrivacyRender.pagesScanned, 15, 'page privacy page count drifted');
assert.equal(performance.checks.pagePrivacyRender.componentsScanned, 14, 'page privacy component count drifted');
assert.equal(performance.checks.pagePrivacyRender.fieldClassificationGroups, 4, 'page privacy field classification count drifted');
assert.equal(performance.checks.pagePrivacyRender.privacyContracts, 8, 'page privacy contract count drifted');
assert.equal(performance.checks.pagePrivacyRender.dangerousRenderHits, 0, 'page privacy dangerous render hits drifted');
assert.equal(performance.checks.pagePrivacyRender.consoleHits, 0, 'page privacy console hits drifted');
assert.equal(performance.checks.pagePrivacyRender.imageBindings, 3, 'page privacy image binding count drifted');
assert.equal(performance.checks.pagePrivacyRender.distFilesScanned, 38, 'page privacy dist scan count drifted');
assert.equal(performance.checks.buildWeapp.status, 'passed', 'build status drifted');
assert.ok(performance.checks.buildWeapp.durationMs > 0, 'build duration should be recorded');
assert.equal(performance.checks.buildWeapp.thresholdMs, 40000, 'build duration threshold drifted');
assert.ok(performance.checks.buildWeapp.durationMs < performance.checks.buildWeapp.thresholdMs, 'build duration should stay below threshold');
assert.equal(performance.checks.distSecurity.status, 'passed', 'dist security status drifted');
assert.equal(performance.checks.distSecurity.filesScanned, 73, 'dist security scanned file count drifted');
assert.ok(performance.checks.distSecurity.warnings >= 1, 'dist security warning count should record source map upload policy review');
assert.equal(performance.checks.artifact.status, 'passed', 'artifact status drifted');
assert.equal(performance.checks.artifact.files, 73, 'artifact file count drifted');
assert.equal(performance.checks.artifact.totalBytes, 529578, 'artifact total size drifted');
assert.equal(performance.checks.performanceBudget.status, 'passed', 'performance budget status drifted');
assert.equal(performance.checks.performanceBudget.totalBytes, 529578, 'performance budget total size drifted');
assert.equal(performance.checks.performanceBudget.scanSubpackageBytes, 55692, 'performance budget scan subpackage size drifted');
assert.equal(performance.checks.performanceBudget.workbenchSubpackageBytes, 78443, 'performance budget workbench subpackage size drifted');
assert.equal(performance.checks.wechatCiPreview.status, 'passed', 'CI preview status drifted');
assert.equal(performance.checks.wechatCiPreview.subPackageInfo.find((item) => item.name === '__FULL__')?.bytes, 575877, 'CI preview full package size drifted');
assert.equal(performance.checks.wechatDevtoolsGui.status, 'out_of_scope', 'DevTools GUI should stay outside the current code-level scope');
assert.equal(performance.checks.wechatDevtoolsRerunScript.status, 'optional', 'DevTools rerun script should remain optional runtime evidence');

const evidenceMatrix = await readJson(resolveFromReport('evidence-matrix.json'));
assert.equal(evidenceMatrix.module, '08-微信小程序端', 'evidence matrix module drifted');
assert.equal(evidenceMatrix.layers.length, 6, 'evidence matrix should contain six layers');
const expectedLayers = ['unit', 'functional', 'integration', 'performance', 'security', 'regression'];
assert.deepEqual(evidenceMatrix.layers.map((item) => item.layer), expectedLayers, 'evidence matrix layer order drifted');
assert.deepEqual(
  evidenceMatrix.layers.map((item) => item.status),
  ['passed', 'code-level-passed', 'code-level-passed', 'code-level-passed', 'code-level-covered', 'code-level-local-passed'],
  'evidence matrix statuses should reflect current code-level scope',
);
for (const layer of evidenceMatrix.layers) {
  assert.ok(layer.status, `layer ${layer.layer} missing status`);
  assert.ok(layer.proves?.length > 0, `layer ${layer.layer} missing proves`);
  assert.ok(layer.evidence?.length > 0, `layer ${layer.layer} missing evidence`);
  const nonTargets = layer.nonTargets || layer.gaps;
  assert.ok(nonTargets?.length > 0, `layer ${layer.layer} missing non-target scope notes`);
  for (const evidencePath of layer.evidence) {
    assertFile(path.resolve(repoRoot, evidencePath), `evidence matrix path ${evidencePath}`);
  }
}

const ciPreviewLog = await readText(resolveFromReport('logs/weapp-ci-preview-current.log'));
assertTextIncludes(ciPreviewLog, [
  '二维码已输出到',
  '"__FULL__"',
  '575877',
], 'weapp-ci-preview.log');

console.log('weapp evidence checks passed');
console.log(`reportDir: ${reportDir}`);
console.log(`matrixLayers: ${evidenceMatrix.layers.length}`);
console.log('scope: code-level unit/performance/security evidence');
