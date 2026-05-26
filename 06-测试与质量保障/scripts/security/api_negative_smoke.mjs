#!/usr/bin/env node
/**
 * Safe negative security smoke checks.
 *
 * The script intentionally sends unauthenticated/invalid requests only. It
 * never creates, updates, or deletes business data.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = process.cwd();
const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || process.env.SILVERLINK_WEB_BASE_URL || 'http://sxyq27.online').replace(/\/$/, '');
const outDir = path.join(root, '06-测试与质量保障/reports/security');

const cases = [
  {
    name: 'admin dashboard rejects missing token',
    url: `${apiBaseUrl}/api/admin/dashboard`,
    options: { method: 'GET' },
    acceptedStatuses: [401, 403],
  },
  {
    name: 'scan resolve rejects malformed token',
    url: `${apiBaseUrl}/api/scan/resolve`,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token-for-negative-smoke' }),
    },
    acceptedStatuses: [400, 401, 403, 404],
  },
  {
    name: 'admin elders rejects missing signature or token',
    url: `${apiBaseUrl}/api/admin/elders`,
    options: { method: 'GET' },
    acceptedStatuses: [401, 403],
  },
];

async function runCase(item) {
  const startedAt = performance.now();
  try {
    const response = await fetch(item.url, item.options);
    await response.text().catch(() => '');
    return {
      name: item.name,
      url: item.url,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      ok: item.acceptedStatuses.includes(response.status),
      acceptedStatuses: item.acceptedStatuses,
    };
  } catch (error) {
    return {
      name: item.name,
      url: item.url,
      status: 0,
      durationMs: Math.round(performance.now() - startedAt),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      acceptedStatuses: item.acceptedStatuses,
    };
  }
}

await fs.mkdir(outDir, { recursive: true });
const checks = [];
for (const item of cases) {
  checks.push(await runCase(item));
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'negative-read-only',
  apiBaseUrl,
  checks,
  passed: checks.every((item) => item.ok),
};
const reportPath = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-api-negative-smoke.json`);
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ reportPath, passed: report.passed }, null, 2));
process.exit(report.passed ? 0 : 1);
