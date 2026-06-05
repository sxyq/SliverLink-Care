#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '06-测试与质量保障/reports/performance');
const scriptPath = path.join(root, '06-测试与质量保障/scripts/performance/scan_view_extreme_concurrency_check.mjs');

const apiBaseUrl = process.env.SILVERLINK_API_BASE_URL || 'http://sxyq27.online/silverlink-api';
const shardCount = Math.max(1, Number(process.env.SILVERLINK_MP_SHARDS || 4));
const totalConcurrency = Math.max(1, Number(process.env.SILVERLINK_MP_TOTAL_CONCURRENCY || 8000));
const totalIterations = Math.max(1, Number(process.env.SILVERLINK_MP_TOTAL_ITERATIONS || 20000));
const coolDownMs = Math.max(0, Number(process.env.SILVERLINK_MP_COOLDOWN_MS || 0));
const successRateThreshold = Number(process.env.SILVERLINK_SUCCESS_RATE_THRESHOLD || 90);

function divideInteger(total, parts) {
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runNodeScript(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: root,
      env: {
        ...process.env,
        ...env,
        SILVERLINK_JSON_ONLY: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function parseRunOutput(stdout) {
  const trimmed = stdout.trim();
  const lastLine = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (!lastLine) {
    throw new Error(`cannot parse child output: ${trimmed}`);
  }
  return JSON.parse(lastLine);
}

function mergeStatuses(statusMaps) {
  const merged = {};
  for (const map of statusMaps) {
    for (const [status, count] of Object.entries(map || {})) {
      merged[status] = (merged[status] || 0) + Number(count);
    }
  }
  return merged;
}

function percentile(values, target) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1);
  return sorted[index];
}

function mergeSummaries(summaries) {
  const weightedDurations = [];
  const weightedBytes = [];
  let requestCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let maxMs = 0;
  let totalBytes = 0;

  for (const summary of summaries) {
    requestCount += summary.requestCount;
    successCount += summary.successCount;
    failureCount += summary.failureCount;
    maxMs = Math.max(maxMs, summary.maxMs || 0);
    totalBytes += summary.totalBytes || 0;
    for (let index = 0; index < summary.successCount; index += 1) {
      weightedDurations.push(summary.avgMs);
      weightedBytes.push(summary.avgBytes || 0);
    }
  }

  const avgMs = weightedDurations.length
    ? Math.round(weightedDurations.reduce((sum, value) => sum + value, 0) / weightedDurations.length)
    : 0;
  const avgBytes = weightedBytes.length
    ? Math.round(weightedBytes.reduce((sum, value) => sum + value, 0) / weightedBytes.length)
    : 0;

  return {
    requestCount,
    successCount,
    failureCount,
    avgMs,
    p50Ms: percentile(weightedDurations, 50),
    p95Ms: percentile(weightedDurations, 95),
    p99Ms: percentile(weightedDurations, 99),
    maxMs,
    avgBytes,
    totalBytes,
  };
}

function evaluateSummary(summary) {
  const successRate = summary.requestCount > 0
    ? Number(((summary.successCount / summary.requestCount) * 100).toFixed(2))
    : 0;
  if (successRate < successRateThreshold) {
    return { status: 'below-threshold', successRate, reason: `成功率 ${successRate}% 低于阈值 ${successRateThreshold}%` };
  }
  if (summary.p95Ms > 500) {
    return { status: 'degraded', successRate, reason: `P95=${summary.p95Ms}ms 超过 500ms` };
  }
  if (summary.p99Ms > 800) {
    return { status: 'degraded', successRate, reason: `P99=${summary.p99Ms}ms 超过 800ms` };
  }
  return { status: 'passed', successRate, reason: '未出现失败，且延迟保持在阈值内' };
}

await fs.mkdir(outDir, { recursive: true });

const shardConcurrency = divideInteger(totalConcurrency, shardCount);
const shardIterations = divideInteger(totalIterations, shardCount);
const shardPlans = shardConcurrency.map((concurrency, index) => ({
  shardId: index + 1,
  concurrency,
  iterationsPerTarget: shardIterations[index],
}));

const shardTasks = shardPlans.map((plan, index) => (async () => {
  if (coolDownMs > 0 && index > 0) {
    await sleep(coolDownMs * index);
  }

  const env = {
    SILVERLINK_API_BASE_URL: apiBaseUrl,
    SILVERLINK_SCAN_RESOLVE_ITERATIONS: String(plan.iterationsPerTarget),
    SILVERLINK_SCAN_RESOLVE_CONCURRENCY: String(plan.concurrency),
    SILVERLINK_SCAN_DETAIL_ITERATIONS: String(plan.iterationsPerTarget),
    SILVERLINK_SCAN_DETAIL_CONCURRENCY: String(plan.concurrency),
  };

  const childResult = await runNodeScript(env);
  const parsed = parseRunOutput(childResult.stdout);
  const reportJson = JSON.parse(await fs.readFile(parsed.jsonPath, 'utf8'));

  return {
    ...plan,
    childExitCode: childResult.code,
    jsonPath: parsed.jsonPath,
    mdPath: parsed.mdPath,
    summary: reportJson.summary,
    targetSummaries: reportJson.targets.map((target) => ({
      name: target.name,
      summary: target.summary,
      path: target.path,
    })),
    statuses: mergeStatuses(reportJson.targets.map((target) => target.summary.statuses)),
  };
})());

const shardResults = await Promise.all(shardTasks);

const aggregateSummary = mergeSummaries(shardResults.map((result) => result.summary));
aggregateSummary.statuses = mergeStatuses(shardResults.map((result) => result.statuses));
const evaluation = evaluateSummary(aggregateSummary);

const report = {
  title: 'SilverLink 扫码查看链路多进程分片并发压测',
  generatedAt: new Date().toISOString(),
  apiBaseUrl,
  strategy: 'scheme-c-multi-process-sharded',
  shardCount,
  totalConcurrency,
  totalIterationsPerTarget: totalIterations,
  totalExpectedRequests: totalIterations * 5,
  coolDownMs,
  shardPlans,
  shardResults,
  summary: aggregateSummary,
  evaluation,
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(outDir, `${timestamp}-scan-view-multiprocess-sharded.json`);
const mdPath = path.join(outDir, `${timestamp}-scan-view-multiprocess-sharded.md`);
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# SilverLink 扫码查看链路多进程分片并发压测',
  '',
  `- 生成时间：${report.generatedAt}`,
  `- API Base：${apiBaseUrl}`,
  `- 策略：${report.strategy}`,
  `- 分片数：${shardCount}`,
  `- 总并发目标：${totalConcurrency}`,
  `- 单目标总请求：${totalIterations}`,
  `- 总请求量：${report.totalExpectedRequests}`,
  `- 冷却间隔：${coolDownMs}ms`,
  `- 聚合成功率：${evaluation.successRate}%`,
  `- 聚合结果：${evaluation.status}`,
  `- 聚合说明：${evaluation.reason}`,
  '',
  '| 分片 | 单目标请求 | 分片并发 | 成功 | 失败 | 成功率 | P50 | P95 | P99 | Max | 状态 | 报告 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
];

for (const shard of shardResults) {
  const successRate = shard.summary.requestCount > 0
    ? (((shard.summary.successCount / shard.summary.requestCount) * 100).toFixed(2))
    : '0.00';
  lines.push(
    `| ${shard.shardId} | ${shard.iterationsPerTarget} | ${shard.concurrency} | ${shard.summary.successCount} | ${shard.summary.failureCount} | ${successRate}% | ${shard.summary.p50Ms}ms | ${shard.summary.p95Ms}ms | ${shard.summary.p99Ms}ms | ${shard.summary.maxMs}ms | ${shard.childExitCode === 0 ? 'ok' : 'non-zero'} | ${path.basename(shard.mdPath)} |`,
  );
}

lines.push('');
lines.push('## 聚合结果');
lines.push('');
lines.push(`- 总请求：${aggregateSummary.requestCount}`);
lines.push(`- 成功：${aggregateSummary.successCount}`);
lines.push(`- 失败：${aggregateSummary.failureCount}`);
lines.push(`- P50：${aggregateSummary.p50Ms}ms`);
lines.push(`- P95：${aggregateSummary.p95Ms}ms`);
lines.push(`- P99：${aggregateSummary.p99Ms}ms`);
lines.push(`- Max：${aggregateSummary.maxMs}ms`);
lines.push(`- 状态分布：${Object.entries(aggregateSummary.statuses).map(([key, value]) => `${key}:${value}`).join(', ')}`);
lines.push('');

await fs.writeFile(mdPath, `${lines.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  jsonPath,
  mdPath,
  shardPlans,
  summary: aggregateSummary,
  evaluation,
}, null, 2));

process.exit(evaluation.status === 'below-threshold' ? 1 : 0);
