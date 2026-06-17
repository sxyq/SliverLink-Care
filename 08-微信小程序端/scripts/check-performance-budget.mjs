import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

const budgets = {
  totalBytes: 2 * 1024 * 1024,
  subpackages: {
    'subpackages/scan': 500 * 1024,
    'subpackages/workbench': 700 * 1024,
  },
};

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

function createEmptyMetric() {
  return {
    files: 0,
    bytes: 0,
    gzipBytes: 0,
  };
}

function formatBudget(metric, budget) {
  return `${metric.bytes}/${budget}`;
}

assert.ok(fs.existsSync(distRoot), 'dist directory is missing; run npm run build:weapp first');

const allFiles = await collectFiles(distRoot);
assert.ok(allFiles.length > 0, 'dist is empty');

const metrics = {
  total: createEmptyMetric(),
  appPackage: createEmptyMetric(),
  subpackages: Object.fromEntries(Object.keys(budgets.subpackages).map((root) => [root, createEmptyMetric()])),
};

const largestFiles = [];

for (const filePath of allFiles) {
  const relativePath = relativeDistPath(filePath);
  const bytes = await fsp.readFile(filePath);
  const size = bytes.length;
  const gzipSize = gzipSync(bytes).length;
  const subpackageRoot = Object.keys(budgets.subpackages).find((root) => relativePath.startsWith(`${root}/`));
  const target = subpackageRoot ? metrics.subpackages[subpackageRoot] : metrics.appPackage;

  metrics.total.files += 1;
  metrics.total.bytes += size;
  metrics.total.gzipBytes += gzipSize;
  target.files += 1;
  target.bytes += size;
  target.gzipBytes += gzipSize;
  largestFiles.push({ file: relativePath, size });
}

largestFiles.sort((left, right) => right.size - left.size);

assert.ok(
  metrics.total.bytes < budgets.totalBytes,
  `dist total exceeds miniapp full-package budget: ${formatBudget(metrics.total, budgets.totalBytes)}`,
);

for (const [root, budget] of Object.entries(budgets.subpackages)) {
  const metric = metrics.subpackages[root];
  assert.ok(metric.files > 0, `${root} has no built files`);
  assert.ok(metric.bytes < budget, `${root} exceeds subpackage budget: ${formatBudget(metric, budget)}`);
}

console.log('performance budget checks passed');
console.log(`totalBytes: ${metrics.total.bytes}/${budgets.totalBytes}`);
console.log(`totalGzipBytes: ${metrics.total.gzipBytes}`);
console.log(`appPackageBytes: ${metrics.appPackage.bytes}`);
console.log(`appPackageGzipBytes: ${metrics.appPackage.gzipBytes}`);
for (const [root, budget] of Object.entries(budgets.subpackages)) {
  const metric = metrics.subpackages[root];
  console.log(`${root}Bytes: ${metric.bytes}/${budget}`);
  console.log(`${root}GzipBytes: ${metric.gzipBytes}`);
}
console.log('largestFiles:');
for (const item of largestFiles.slice(0, 5)) {
  console.log(`- ${item.file}: ${item.size}`);
}
