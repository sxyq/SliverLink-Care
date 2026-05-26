#!/usr/bin/env node
/**
 * Lightweight latency sampler for read-only/static endpoints.
 *
 * This is intentionally dependency-free. Use k6 later for distributed load;
 * this script gives a repeatable local P50/P95/P99 baseline first.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = process.cwd();
const baseUrl = (process.env.SILVERLINK_PERF_BASE_URL || process.env.SILVERLINK_WEB_BASE_URL || 'http://sxyq27.online/silverlink').replace(/\/$/, '');
const outDir = path.join(root, '06-测试与质量保障/reports/performance');
const iterations = Number(process.env.SILVERLINK_PERF_ITERATIONS || 20);
const concurrency = Number(process.env.SILVERLINK_PERF_CONCURRENCY || 4);
const targetPath = process.env.SILVERLINK_PERF_PATH || '/';

function percentile(values, target) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1);
  return sorted[index];
}

async function oneRequest(url) {
  const startedAt = performance.now();
  try {
    const response = await fetch(url, { method: 'GET' });
    await response.arrayBuffer();
    return { ok: response.ok, status: response.status, durationMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runPool(url) {
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < iterations) {
      cursor += 1;
      results.push(await oneRequest(url));
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

await fs.mkdir(outDir, { recursive: true });
const url = `${baseUrl}${targetPath}`;
const samples = await runPool(url);
const okSamples = samples.filter((sample) => sample.ok);
const durations = okSamples.map((sample) => sample.durationMs);
const report = {
  generatedAt: new Date().toISOString(),
  url,
  iterations,
  concurrency,
  successCount: okSamples.length,
  failureCount: samples.length - okSamples.length,
  p50Ms: percentile(durations, 50),
  p95Ms: percentile(durations, 95),
  p99Ms: percentile(durations, 99),
  maxMs: durations.length ? Math.max(...durations) : 0,
  samples,
};
const reportPath = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-api-latency.json`);
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ reportPath, p50Ms: report.p50Ms, p95Ms: report.p95Ms, p99Ms: report.p99Ms, failureCount: report.failureCount }, null, 2));
process.exit(report.failureCount === 0 ? 0 : 1);
