#!/usr/bin/env node
/**
 * Read-only smoke checks for public/local entrypoints.
 *
 * Defaults to the public deployment and only performs GET requests. Override
 * SILVERLINK_WEB_BASE_URL for localhost or a staging host.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = process.cwd();
const baseUrl = (process.env.SILVERLINK_WEB_BASE_URL || 'http://sxyq27.online/silverlink').replace(/\/$/, '');
const outDir = path.join(root, '06-测试与质量保障/reports/functional');
const paths = ['/', '/admin/', '/volunteer/'];

async function requestWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const text = await response.text();
    return {
      url,
      ok: response.ok,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      hasHtml: /<!doctype html|<html/i.test(text),
      bodyBytes: Buffer.byteLength(text),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

await fs.mkdir(outDir, { recursive: true });
const checks = [];
for (const item of paths) {
  checks.push(await requestWithTimeout(`${baseUrl}${item}`));
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'read-only',
  baseUrl,
  checks,
  passed: checks.every((item) => item.ok && item.hasHtml),
};
const reportPath = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-live-readonly-smoke.json`);
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ reportPath, passed: report.passed }, null, 2));
process.exit(report.passed ? 0 : 1);
