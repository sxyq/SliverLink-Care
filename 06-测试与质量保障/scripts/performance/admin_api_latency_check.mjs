#!/usr/bin/env node

import crypto from 'node:crypto';
import { fetchAndDrain, runBenchmark, summarizeSamples, writeBenchmarkReports } from './benchmark_utils.mjs';

const root = process.cwd();
const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || 'http://sxyq27.online/silverlink-api').replace(/\/$/, '');
const iterations = Number(process.env.SILVERLINK_ADMIN_PERF_ITERATIONS || process.env.SILVERLINK_PERF_ITERATIONS || 18);
const concurrency = Number(process.env.SILVERLINK_ADMIN_PERF_CONCURRENCY || process.env.SILVERLINK_PERF_CONCURRENCY || 4);
const account = process.env.SILVERLINK_ADMIN_ACCOUNT || 'admin';
const password = process.env.SILVERLINK_ADMIN_PASSWORD || 'admin';
const signatureSecret = process.env.SILVERLINK_ADMIN_SIGNATURE_SECRET || 'demo-admin-signature-secret';
const targetFilter = new Set(
  String(process.env.SILVERLINK_ADMIN_PERF_TARGETS || process.env.SILVERLINK_PERF_TARGETS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

function createSignatureHeaders(method, requestPath) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const pathOnly = requestPath.split('?')[0] || requestPath;
  const canonical = `${method.toUpperCase()}\n${pathOnly}\n${timestamp}\n${nonce}`;
  const signature = crypto.createHmac('sha256', signatureSecret).update(canonical).digest('hex');
  return {
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature,
  };
}

async function requestJson(path, options = {}) {
  const method = options.method || 'GET';
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...createSignatureHeaders(method, path),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    bytes: Buffer.byteLength(text),
    text,
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
  const parsed = JSON.parse(result.text);
  const token = parsed?.data?.token;
  if (!token) {
    throw new Error('admin login response does not contain token');
  }
  return token;
}

async function authedGet(path, token) {
  return fetchAndDrain(`${apiBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...createSignatureHeaders('GET', path),
    },
  });
}

const token = await login();
const elderSeedResponse = await requestJson('/api/admin/elders', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    ...createSignatureHeaders('GET', '/api/admin/elders'),
  },
});
if (!elderSeedResponse.ok) {
  throw new Error(`seed elder fetch failed: ${elderSeedResponse.status}`);
}
const elderRows = JSON.parse(elderSeedResponse.text)?.data;
const elderId = Array.isArray(elderRows) && elderRows.length ? String(elderRows[0].id || 'elder-001') : 'elder-001';

const targets = [
  { name: 'admin-dashboard', path: '/api/admin/dashboard' },
  { name: 'admin-elders', path: '/api/admin/elders' },
  { name: 'admin-volunteers', path: '/api/admin/volunteers' },
  { name: 'admin-qrcodes', path: '/api/admin/qrcodes' },
  { name: 'admin-audit-logs', path: '/api/admin/audit-logs' },
  { name: 'admin-family-bindings', path: '/api/admin/family-bindings' },
  { name: 'admin-invitations', path: '/api/admin/invitations' },
  { name: 'admin-medications', path: `/api/admin/medications?elderId=${encodeURIComponent(elderId)}` },
  { name: 'admin-scales', path: `/api/admin/scales?elderId=${encodeURIComponent(elderId)}` },
  { name: 'admin-smsrelay-devices', path: '/api/sms-relay/admin/devices' },
  { name: 'admin-smsrelay-records', path: '/api/sms-relay/admin/records' },
  { name: 'admin-smsrelay-sessions', path: '/api/sms-relay/admin/sessions' },
];

const selectedTargets = targetFilter.size
  ? targets.filter((target) => targetFilter.has(target.name))
  : targets;

const benchmarkTargets = [];
for (const target of selectedTargets) {
  const samples = await runBenchmark(target.name, iterations, concurrency, () => authedGet(target.path, token));
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
