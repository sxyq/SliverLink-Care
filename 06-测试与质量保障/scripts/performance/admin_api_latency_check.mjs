#!/usr/bin/env node

import { fetchAndDrain, runBenchmark, summarizeSamples, writeBenchmarkReports } from './benchmark_utils.mjs';

const root = process.cwd();
const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || 'http://sxyq27.online/silverlink-api').replace(/\/$/, '');
const iterations = Number(process.env.SILVERLINK_ADMIN_PERF_ITERATIONS || process.env.SILVERLINK_PERF_ITERATIONS || 18);
const concurrency = Number(process.env.SILVERLINK_ADMIN_PERF_CONCURRENCY || process.env.SILVERLINK_PERF_CONCURRENCY || 4);
const account = process.env.SILVERLINK_ADMIN_ACCOUNT || 'admin';
const password = process.env.SILVERLINK_ADMIN_PASSWORD || 'admin';
const targetFilter = new Set(
  String(process.env.SILVERLINK_ADMIN_PERF_TARGETS || process.env.SILVERLINK_PERF_TARGETS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const setCookie = response.headers.get('set-cookie') || '';
  return {
    ok: response.ok,
    status: response.status,
    bytes: Buffer.byteLength(text),
    text,
    sessionCookie: setCookie
      .split(',')
      .map((value) => value.trim().split(';', 1)[0])
      .find((value) => value.startsWith('sl_admin_session=')) || '',
  };
}

async function login() {
  const result = await requestJson('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
  if (!result.ok) {
    throw new Error(`admin login failed: ${result.status} ${result.text}`);
  }
  if (!result.sessionCookie) {
    throw new Error('admin login response does not contain the session cookie');
  }
  return result.sessionCookie;
}

async function authedGet(path, sessionCookie) {
  return fetchAndDrain(`${apiBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      Cookie: sessionCookie,
    },
  });
}

const sessionCookie = await login();
const elderSeedResponse = await requestJson('/api/admin/elders', {
  method: 'GET',
  headers: {
    Cookie: sessionCookie,
  },
});
if (!elderSeedResponse.ok) {
  throw new Error(`seed elder fetch failed: ${elderSeedResponse.status}`);
}
const elderRows = JSON.parse(elderSeedResponse.text)?.data;
const elderId = Array.isArray(elderRows) && elderRows.length ? String(elderRows[0].id || 'elder-001') : 'elder-001';

const targets = [
  { name: 'admin-dashboard-summary', path: '/api/admin/dashboard/summary' },
  { name: 'admin-elders', path: '/api/admin/elders' },
  { name: 'admin-volunteers', path: '/api/admin/volunteers' },
  { name: 'admin-qrcodes', path: '/api/admin/qrcodes' },
  { name: 'admin-audit-page', path: '/api/admin/audit-logs/page?limit=50' },
  { name: 'admin-audit-overview', path: '/api/admin/audit-logs/summary/overview' },
  { name: 'admin-audit-trend', path: '/api/admin/audit-logs/summary/trend' },
  { name: 'admin-audit-distribution', path: '/api/admin/audit-logs/summary/distribution' },
  { name: 'admin-family-bindings', path: '/api/admin/family-bindings' },
  { name: 'admin-invitations', path: '/api/admin/invitations' },
  { name: 'admin-medications', path: `/api/admin/medications?elderId=${encodeURIComponent(elderId)}` },
  { name: 'admin-scales', path: `/api/admin/scales?elderId=${encodeURIComponent(elderId)}` },
  { name: 'admin-smsrelay-devices', path: '/api/sms-relay/admin/devices' },
  { name: 'admin-smsrelay-summary', path: '/api/sms-relay/admin/summary' },
  { name: 'admin-smsrelay-records-page', path: '/api/sms-relay/admin/records/page?limit=50' },
  { name: 'admin-smsrelay-sessions-page', path: '/api/sms-relay/admin/sessions/page?limit=50' },
];

const selectedTargets = targetFilter.size
  ? targets.filter((target) => targetFilter.has(target.name))
  : targets;

const benchmarkTargets = [];
for (const target of selectedTargets) {
  const samples = await runBenchmark(target.name, iterations, concurrency, () => authedGet(target.path, sessionCookie));
  benchmarkTargets.push({
    ...target,
    summary: summarizeSamples(samples),
    samples,
  });
}

const summary = summarizeSamples(benchmarkTargets.flatMap((target) => target.samples));
const report = {
  title: 'SilverLink 管理后台只读 API 并发性能报告',
  generatedAt: new Date().toISOString(),
  apiBaseUrl,
  iterationsPerTarget: iterations,
  concurrencyPerTarget: concurrency,
  adminAccount: account,
  elderId,
  summary,
  targets: benchmarkTargets,
};

const reportPaths = await writeBenchmarkReports({
  root,
  topic: 'admin-api-latency',
  report,
  describeTarget: (target) => `${target.name}<br/>${target.path}`,
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
