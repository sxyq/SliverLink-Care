#!/usr/bin/env node

import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export function percentile(values, target) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1);
  return sorted[index];
}

export function summarizeSamples(samples) {
  const okSamples = samples.filter((sample) => sample.ok);
  const durations = okSamples.map((sample) => sample.durationMs);
  const sizes = okSamples.map((sample) => sample.bytes ?? 0);
  const avgMs = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 0;
  const avgBytes = sizes.length
    ? Math.round(sizes.reduce((sum, value) => sum + value, 0) / sizes.length)
    : 0;
  const statuses = {};
  for (const sample of samples) {
    const key = String(sample.status ?? 0);
    statuses[key] = (statuses[key] || 0) + 1;
  }

  return {
    requestCount: samples.length,
    successCount: okSamples.length,
    failureCount: samples.length - okSamples.length,
    avgMs,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    maxMs: durations.length ? Math.max(...durations) : 0,
    avgBytes,
    totalBytes: sizes.reduce((sum, value) => sum + value, 0),
    statuses,
  };
}

export async function oneRequest(name, requestFn) {
  const startedAt = performance.now();
  try {
    const result = await requestFn();
    return {
      target: name,
      ok: result.ok,
      status: result.status,
      bytes: result.bytes ?? 0,
      durationMs: Math.round(performance.now() - startedAt),
      error: result.error,
    };
  } catch (error) {
    return {
      target: name,
      ok: false,
      status: 0,
      bytes: 0,
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runBenchmark(name, iterations, concurrency, requestFn) {
  const samples = [];
  let cursor = 0;

  async function worker() {
    while (cursor < iterations) {
      cursor += 1;
      samples.push(await oneRequest(name, requestFn));
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return samples;
}

export async function fetchAndDrain(url, options = {}) {
  const response = await fetch(url, options);
  const buffer = await response.arrayBuffer();
  return {
    ok: response.ok,
    status: response.status,
    bytes: buffer.byteLength,
  };
}

export async function writeBenchmarkReports({
  root,
  topic,
  report,
  describeTarget,
}) {
  const outDir = path.join(root, '06-测试与质量保障/reports/performance');
  await fs.mkdir(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uniqueSuffix = `${process.pid}-${randomUUID().slice(0, 8)}`;
  const jsonPath = path.join(outDir, `${timestamp}-${topic}-${uniqueSuffix}.json`);
  const mdPath = path.join(outDir, `${timestamp}-${topic}-${uniqueSuffix}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    `# ${report.title}`,
    '',
    `- 生成时间：${report.generatedAt}`,
    `- 基准主题：${topic}`,
    `- 总请求数：${report.summary.requestCount}`,
    `- 成功数：${report.summary.successCount}`,
    `- 失败数：${report.summary.failureCount}`,
    `- 平均耗时：${report.summary.avgMs}ms`,
    `- P50：${report.summary.p50Ms}ms`,
    `- P95：${report.summary.p95Ms}ms`,
    `- P99：${report.summary.p99Ms}ms`,
    '',
    '| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  for (const target of report.targets) {
    const summary = target.summary;
    lines.push(
      `| ${describeTarget(target)} | ${summary.requestCount} | ${summary.successCount} | ${summary.failureCount} | ${summary.avgMs}ms | ${summary.p50Ms}ms | ${summary.p95Ms}ms | ${summary.p99Ms}ms | ${summary.maxMs}ms | ${summary.avgBytes}B | ${Object.entries(summary.statuses).map(([key, value]) => `${key}:${value}`).join(', ')} |`,
    );
  }

  lines.push('');
  await fs.writeFile(mdPath, `${lines.join('\n')}\n`, 'utf8');
  return { jsonPath, mdPath };
}
