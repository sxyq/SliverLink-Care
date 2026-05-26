#!/usr/bin/env node

import crypto from 'node:crypto';
import { fetchAndDrain, runBenchmark, summarizeSamples, writeBenchmarkReports } from './benchmark_utils.mjs';

const root = process.cwd();
const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || 'http://sxyq27.online/silverlink-api').replace(/\/$/, '');
const resolveIterations = Number(process.env.SILVERLINK_SCAN_RESOLVE_ITERATIONS || 80);
const resolveConcurrency = Number(process.env.SILVERLINK_SCAN_RESOLVE_CONCURRENCY || 24);
const detailIterations = Number(process.env.SILVERLINK_SCAN_DETAIL_ITERATIONS || 80);
const detailConcurrency = Number(process.env.SILVERLINK_SCAN_DETAIL_CONCURRENCY || 24);
const adminAccount = process.env.SILVERLINK_ADMIN_ACCOUNT || 'admin';
const adminPassword = process.env.SILVERLINK_ADMIN_PASSWORD || 'admin';
const signatureSecret = process.env.SILVERLINK_ADMIN_SIGNATURE_SECRET || 'demo-admin-signature-secret';

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

async function requestText(path, options = {}) {
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

async function loginAdmin() {
  const result = await requestText('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ account: adminAccount, password: adminPassword }),
  });
  if (!result.ok) {
    throw new Error(`admin login failed: ${result.status} ${result.text}`);
  }
  const token = JSON.parse(result.text)?.data?.token;
  if (!token) {
    throw new Error('admin login did not return token');
  }
  return token;
}

async function fetchQrCodeSeed(token) {
  const response = await requestText('/api/admin/qrcodes', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...createSignatureHeaders('GET', '/api/admin/qrcodes'),
    },
  });
  if (!response.ok) {
    throw new Error(`fetch qrcodes failed: ${response.status}`);
  }
  const rows = JSON.parse(response.text)?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('qrcode list is empty');
  }
  const row = rows.find((item) => item?.status === 'ENABLED' && item?.url) || rows.find((item) => item?.url) || rows[0];
  const url = String(row.url || '');
  const tokenParam = new URL(url).searchParams.get('token');
  if (!tokenParam) {
    throw new Error('cannot extract scan token from qrcode url');
  }
  return {
    qrCodeId: String(row.id || ''),
    elderId: String(row.elderId || ''),
    archiveNo: String(row.archiveNo || ''),
    token: tokenParam,
  };
}

async function resolveToken(token) {
  return requestText('/api/scan/resolve', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

async function createVerifiedSession(elderId) {
  const response = await requestText('/api/scan/verification/identity', {
    method: 'POST',
    body: JSON.stringify({
      elderId,
      target: 'health',
      name: '性能测试访客',
      phone: '13800001111',
      idCard: '110101199001011237',
    }),
  });
  if (!response.ok) {
    throw new Error(`identity verification failed: ${response.status} ${response.text}`);
  }
  const sessionId = JSON.parse(response.text)?.data?.sessionId;
  if (!sessionId) {
    throw new Error('identity verification did not return sessionId');
  }
  return sessionId;
}

const adminToken = await loginAdmin();
const seed = await fetchQrCodeSeed(adminToken);

const resolveSeed = await resolveToken(seed.token);
if (!resolveSeed.ok) {
  throw new Error(`seed resolve failed: ${resolveSeed.status} ${resolveSeed.text}`);
}
const resolved = JSON.parse(resolveSeed.text)?.data;
const elderId = String(resolved?.elderId || seed.elderId || '');
if (!elderId) {
  throw new Error('resolve did not return elderId');
}

const sessionId = await createVerifiedSession(elderId);

const resolveSamples = await runBenchmark('scan-resolve', resolveIterations, resolveConcurrency, async () => {
  const response = await resolveToken(seed.token);
  return { ok: response.ok, status: response.status, bytes: response.bytes };
});

const detailTargets = [
  {
    name: 'scan-basic-info',
    path: `/api/scan/basic-info?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    displayPath: `/api/scan/basic-info?elderId=${elderId}&sessionId=[REDACTED_SESSION]`,
  },
  {
    name: 'scan-archive',
    path: `/api/scan/archive?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    displayPath: `/api/scan/archive?elderId=${elderId}&sessionId=[REDACTED_SESSION]`,
  },
  {
    name: 'scan-medications',
    path: `/api/scan/medications?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    displayPath: `/api/scan/medications?elderId=${elderId}&sessionId=[REDACTED_SESSION]`,
  },
  {
    name: 'scan-scales',
    path: `/api/scan/scales?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    displayPath: `/api/scan/scales?elderId=${elderId}&sessionId=[REDACTED_SESSION]`,
  },
];

const targetResults = [
  {
    name: 'scan-resolve',
    path: '/api/scan/resolve',
    displayPath: '/api/scan/resolve',
    summary: summarizeSamples(resolveSamples),
    samples: resolveSamples,
  },
];

for (const target of detailTargets) {
  const samples = await runBenchmark(
    target.name,
    detailIterations,
    detailConcurrency,
    () => fetchAndDrain(`${apiBaseUrl}${target.path}`, { method: 'GET' }),
  );
  targetResults.push({
    ...target,
    summary: summarizeSamples(samples),
    samples,
  });
}

const summary = summarizeSamples(targetResults.flatMap((item) => item.samples));
const report = {
  title: 'SilverLink 扫码查看与登记信息详细查看极限并发报告',
  generatedAt: new Date().toISOString(),
  apiBaseUrl,
  seed: {
    qrCodeId: seed.qrCodeId,
    archiveNo: seed.archiveNo,
    elderId,
  },
  sessionSetup: {
    verificationMethod: 'IDENTITY',
    sessionIdHint: `${sessionId.slice(0, 16)}...`,
  },
  loadProfile: {
    resolveIterations,
    resolveConcurrency,
    detailIterations,
    detailConcurrency,
  },
  summary,
  targets: targetResults,
};

report.targets = report.targets.map((target) => ({
  ...target,
  path: target.displayPath || target.path,
}));

const redactedReportPaths = await writeBenchmarkReports({
  root,
  topic: 'scan-view-extreme-concurrency',
  report,
  describeTarget: (target) => `${target.name}<br/>${target.displayPath || target.path}`,
});

const output = {
  ...redactedReportPaths,
  summary: {
    requestCount: summary.requestCount,
    successCount: summary.successCount,
    failureCount: summary.failureCount,
    avgMs: summary.avgMs,
    p50Ms: summary.p50Ms,
    p95Ms: summary.p95Ms,
    p99Ms: summary.p99Ms,
  },
};

console.log(
  process.env.SILVERLINK_JSON_ONLY === '1'
    ? JSON.stringify(output)
    : JSON.stringify(output, null, 2),
);

process.exit(summary.failureCount === 0 ? 0 : 1);
