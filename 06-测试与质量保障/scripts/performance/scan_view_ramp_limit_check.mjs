#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '06-测试与质量保障/reports/performance');
const stepSpec = process.env.SILVERLINK_SCAN_RAMP_STEPS || '60x200,80x250,120x300,160x300';
const apiBaseUrl = process.env.SILVERLINK_API_BASE_URL || 'http://sxyq27.online/silverlink-api';
const scriptPath = path.join(root, '06-测试与质量保障/scripts/performance/scan_view_extreme_concurrency_check.mjs');
const successRateThreshold = Number(process.env.SILVERLINK_SUCCESS_RATE_THRESHOLD || 90);

function parseSteps(spec) {
  return spec
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(\d+)x(\d+)$/);
      if (!match) {
        throw new Error(`invalid ramp step: ${item}`);
      }
      return {
        concurrency: Number(match[1]),
        iterations: Number(match[2]),
      };
    });
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

function evaluateLevel(report) {
  const { summary } = report;
  const successRate = summary.requestCount > 0
    ? Number(((summary.successCount / summary.requestCount) * 100).toFixed(2))
    : 0;
  if (successRate < successRateThreshold) {
    return { status: 'below-threshold', reason: `成功率 ${successRate}% 低于阈值 ${successRateThreshold}%`, successRate };
  }
  if (summary.p95Ms > 500) {
    return { status: 'degraded', reason: `P95=${summary.p95Ms}ms 超过 500ms`, successRate };
  }
  if (summary.p99Ms > 800) {
    return { status: 'degraded', reason: `P99=${summary.p99Ms}ms 超过 800ms`, successRate };
  }
  return { status: 'passed', reason: '未出现失败，且延迟保持在阈值内', successRate };
}

await fs.mkdir(outDir, { recursive: true });
const steps = parseSteps(stepSpec);
const runs = [];
let limitConclusion = {
  highestStableConcurrency: 0,
  firstDegradedConcurrency: null,
  firstBelowThresholdConcurrency: null,
};

for (const step of steps) {
  const env = {
    SILVERLINK_API_BASE_URL: apiBaseUrl,
    SILVERLINK_SCAN_RESOLVE_ITERATIONS: String(step.iterations),
    SILVERLINK_SCAN_RESOLVE_CONCURRENCY: String(step.concurrency),
    SILVERLINK_SCAN_DETAIL_ITERATIONS: String(step.iterations),
    SILVERLINK_SCAN_DETAIL_CONCURRENCY: String(step.concurrency),
  };
  const childResult = await runNodeScript(env);
  const parsed = parseRunOutput(childResult.stdout);
  const reportJson = JSON.parse(await fs.readFile(parsed.jsonPath, 'utf8'));
  const evaluation = evaluateLevel(reportJson);
  runs.push({
    concurrency: step.concurrency,
    iterationsPerTarget: step.iterations,
    childExitCode: childResult.code,
    jsonPath: parsed.jsonPath,
    mdPath: parsed.mdPath,
    summary: reportJson.summary,
    evaluation,
  });

  if (evaluation.status === 'passed') {
    limitConclusion.highestStableConcurrency = step.concurrency;
    continue;
  }
  if (evaluation.status === 'degraded' && limitConclusion.firstDegradedConcurrency == null) {
    limitConclusion.firstDegradedConcurrency = step.concurrency;
  }
  if (evaluation.status === 'below-threshold' && limitConclusion.firstBelowThresholdConcurrency == null) {
    limitConclusion.firstBelowThresholdConcurrency = step.concurrency;
  }
  if (evaluation.status === 'below-threshold') {
    break;
  }
}

const report = {
  title: 'SilverLink 扫码查看链路并发极限阶梯测试',
  generatedAt: new Date().toISOString(),
  apiBaseUrl,
  steps,
  runs,
  limitConclusion,
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(outDir, `${timestamp}-scan-view-ramp-limit.json`);
const mdPath = path.join(outDir, `${timestamp}-scan-view-ramp-limit.md`);
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# SilverLink 扫码查看链路并发极限阶梯测试',
  '',
  `- 生成时间：${report.generatedAt}`,
  `- API Base：${apiBaseUrl}`,
  `- 成功率阈值：${successRateThreshold}%`,
  `- 最高稳定并发：${limitConclusion.highestStableConcurrency || '未测出'}`,
  `- 首个退化并发：${limitConclusion.firstDegradedConcurrency ?? '未出现'}`,
  `- 首个成功率低于阈值并发：${limitConclusion.firstBelowThresholdConcurrency ?? '未出现'}`,
  '',
  '| 并发 | 单目标请求数 | 成功 | 失败 | 成功率 | P50 | P95 | P99 | 结果 | 说明 | 报告 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
];

for (const run of runs) {
  lines.push(
    `| ${run.concurrency} | ${run.iterationsPerTarget} | ${run.summary.successCount} | ${run.summary.failureCount} | ${run.evaluation.successRate}% | ${run.summary.p50Ms}ms | ${run.summary.p95Ms}ms | ${run.summary.p99Ms}ms | ${run.evaluation.status} | ${run.evaluation.reason} | ${path.basename(run.mdPath)} |`,
  );
}

lines.push('');
await fs.writeFile(mdPath, `${lines.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  jsonPath,
  mdPath,
  limitConclusion,
  runs: runs.map((run) => ({
    concurrency: run.concurrency,
    iterationsPerTarget: run.iterationsPerTarget,
    evaluation: run.evaluation,
    summary: run.summary,
  })),
}, null, 2));
