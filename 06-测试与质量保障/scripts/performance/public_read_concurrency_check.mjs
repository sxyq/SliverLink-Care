#!/usr/bin/env node

import { fetchAndDrain, runBenchmark, summarizeSamples, writeBenchmarkReports } from './benchmark_utils.mjs';

const root = process.cwd();
const webBaseUrl = (process.env.SILVERLINK_WEB_BASE_URL || 'http://sxyq27.online/silverlink').replace(/\/$/, '');
const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || 'http://sxyq27.online/silverlink-api').replace(/\/$/, '');
const iterations = Number(process.env.SILVERLINK_PERF_ITERATIONS || 24);
const concurrency = Number(process.env.SILVERLINK_PERF_CONCURRENCY || 6);
const targetFilter = new Set(
  String(process.env.SILVERLINK_PERF_TARGETS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const targets = [
  { name: 'scan-web-home', type: 'page', url: `${webBaseUrl}/` },
  { name: 'admin-web-home', type: 'page', url: `${webBaseUrl}/admin/` },
  { name: 'volunteer-web-home', type: 'page', url: `${webBaseUrl}/volunteer/` },
  { name: 'invitation-preview', type: 'api', url: `${apiBaseUrl}/api/invitations/INVITE001/preview` },
  { name: 'nameplate-preview', type: 'api', url: `${apiBaseUrl}/api/nameplates/elder-001/preview?blank=false` },
  { name: 'nameplate-pdf', type: 'api', url: `${apiBaseUrl}/api/nameplates/elder-001/pdf` },
];

const selectedTargets = targetFilter.size
  ? targets.filter((target) => targetFilter.has(target.name))
  : targets;

const benchmarkTargets = [];
for (const target of selectedTargets) {
  const samples = await runBenchmark(target.name, iterations, concurrency, () => fetchAndDrain(target.url, { method: 'GET' }));
  benchmarkTargets.push({
    ...target,
    summary: summarizeSamples(samples),
    samples,
  });
}

const summary = summarizeSamples(benchmarkTargets.flatMap((target) => target.samples));
const report = {
  title: 'SilverLink 公开页面与只读资源并发读取性能报告',
  generatedAt: new Date().toISOString(),
  webBaseUrl,
  apiBaseUrl,
  iterationsPerTarget: iterations,
  concurrencyPerTarget: concurrency,
  summary,
  targets: benchmarkTargets,
};

const reportPaths = await writeBenchmarkReports({
  root,
  topic: 'public-read-concurrency',
  report,
  describeTarget: (target) => `${target.name}<br/>${target.url}`,
});

console.log(JSON.stringify({
  ...reportPaths,
  summary: {
    requestCount: summary.requestCount,
    successCount: summary.successCount,
    failureCount: summary.failureCount,
    avgMs: summary.avgMs,
    p50Ms: summary.p50Ms,
    p95Ms: summary.p95Ms,
    p99Ms: summary.p99Ms,
  },
}, null, 2));

process.exit(summary.failureCount === 0 ? 0 : 1);
