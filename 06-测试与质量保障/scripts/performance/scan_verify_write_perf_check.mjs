#!/usr/bin/env node

import crypto from 'node:crypto';
import { runBenchmark, summarizeSamples, writeBenchmarkReports } from './benchmark_utils.mjs';

const root = process.cwd();
const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || 'http://sxyq27.online/silverlink-api').replace(/\/$/, '');
const adminAccount = process.env.SILVERLINK_ADMIN_ACCOUNT || 'admin';
const adminPassword = process.env.SILVERLINK_ADMIN_PASSWORD || 'admin';
const signatureSecret = process.env.SILVERLINK_ADMIN_SIGNATURE_SECRET || 'demo-admin-signature-secret';

const startIterations = Number(process.env.SILVERLINK_SCAN_VERIFY_START_ITERATIONS || 1000);
const startConcurrency = Number(process.env.SILVERLINK_SCAN_VERIFY_START_CONCURRENCY || 1000);
const statusIterations = Number(process.env.SILVERLINK_SCAN_VERIFY_STATUS_ITERATIONS || 1000);
const statusConcurrency = Number(process.env.SILVERLINK_SCAN_VERIFY_STATUS_CONCURRENCY || 1000);
const identityIterations = Number(process.env.SILVERLINK_SCAN_VERIFY_IDENTITY_ITERATIONS || 1000);
const identityConcurrency = Number(process.env.SILVERLINK_SCAN_VERIFY_IDENTITY_CONCURRENCY || 1000);

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
    elderId: String(row.elderId || ''),
    token: tokenParam,
    archiveNo: String(row.archiveNo || ''),
  };
}

async function resolveToken(token) {
  const response = await requestText('/api/scan/resolve', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    throw new Error(`seed resolve failed: ${response.status} ${response.text}`);
  }
  const elderId = JSON.parse(response.text)?.data?.elderId;
  if (!elderId) {
    throw new Error('resolve did not return elderId');
  }
  return String(elderId);
}

function compactText(text, maxLength = 160) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
}

async function oneRequestWithBody(name, requestFn) {
  const startedAt = Date.now();
  try {
    const result = await requestFn();
    const durationMs = Date.now() - startedAt;
    return {
      target: name,
      ok: result.ok,
      status: result.status,
      bytes: result.bytes ?? 0,
      durationMs,
      bodySnippet: result.ok ? undefined : compactText(result.text),
    };
  } catch (error) {
    return {
      target: name,
      ok: false,
      status: 0,
      bytes: 0,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runBenchmarkWithBody(name, iterations, concurrency, requestFn) {
  const samples = [];
  let cursor = 0;

  async function worker() {
    while (cursor < iterations) {
      cursor += 1;
      samples.push(await oneRequestWithBody(name, requestFn));
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return samples;
}

async function createPendingSession(elderId) {
  const response = await requestText('/api/scan/verification/start', {
    method: 'POST',
    body: JSON.stringify({ elderId, target: 'health' }),
  });
  if (!response.ok) {
    throw new Error(`seed verification/start failed: ${response.status} ${response.text}`);
  }
  const sessionId = JSON.parse(response.text)?.data?.sessionId;
  if (!sessionId) {
    throw new Error('verification/start did not return sessionId');
  }
  return sessionId;
}

function createIdentityPayload(elderId, index) {
  const suffix = String(index).padStart(4, '0');
  const checksumMap = '10X98765432';
  const base17 = `11010119900101${suffix}`.slice(0, 17);
  let total = 0;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  for (let i = 0; i < 17; i += 1) {
    total += Number(base17[i]) * weights[i];
  }
  const idCard = `${base17}${checksumMap[total % 11]}`;

  return {
    elderId,
    target: 'health',
    name: `性能测试访客${suffix}`,
    phone: `138${String(10000000 + index).slice(-8)}`,
    idCard,
  };
}

const adminToken = await loginAdmin();
const seed = await fetchQrCodeSeed(adminToken);
const elderId = seed.elderId || await resolveToken(seed.token);
const pendingSessionId = await createPendingSession(elderId);

const startSamples = await runBenchmarkWithBody(
  'verification-start',
  startIterations,
  startConcurrency,
  () => requestText('/api/scan/verification/start', {
    method: 'POST',
    body: JSON.stringify({ elderId, target: 'health' }),
  }),
);

const statusPath = `/api/scan/verification/status?sessionId=${encodeURIComponent(pendingSessionId)}`;
const statusSamples = await runBenchmarkWithBody(
  'verification-status',
  statusIterations,
  statusConcurrency,
  () => requestText(statusPath, { method: 'GET' }),
);

let identityCursor = 0;
const identitySamples = await runBenchmarkWithBody(
  'verification-identity',
  identityIterations,
  identityConcurrency,
  () => {
    identityCursor += 1;
    const payload = createIdentityPayload(elderId, identityCursor);
    return requestText('/api/scan/verification/identity', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
);

const targets = [
  {
    name: 'verification-start',
    path: '/api/scan/verification/start',
    summary: summarizeSamples(startSamples),
    samples: startSamples,
  },
  {
    name: 'verification-status',
    path: '/api/scan/verification/status?sessionId=[REDACTED_SESSION]',
    summary: summarizeSamples(statusSamples),
    samples: statusSamples,
  },
  {
    name: 'verification-identity',
    path: '/api/scan/verification/identity',
    summary: summarizeSamples(identitySamples),
    samples: identitySamples,
  },
];

const summary = summarizeSamples(targets.flatMap((item) => item.samples));
const report = {
  title: 'SilverLink 扫码验证写链路性能报告',
  generatedAt: new Date().toISOString(),
  apiBaseUrl,
  environment: {
    target: 'online-live-service',
    backupReference: '/opt/silverlink-care/backups/pre-perf-20260526-142753',
    mode: 'controlled-write-load',
  },
  seed: {
    elderId,
    archiveNo: seed.archiveNo,
    statusSessionHint: `${pendingSessionId.slice(0, 20)}...`,
  },
  loadProfile: {
    startIterations,
    startConcurrency,
    statusIterations,
    statusConcurrency,
    identityIterations,
    identityConcurrency,
    peakConcurrencyApprox: Math.max(startConcurrency, statusConcurrency, identityConcurrency),
  },
  summary,
  targets,
  failureSamples: targets.flatMap((target) =>
    target.samples
      .filter((sample) => !sample.ok)
      .slice(0, 10)
      .map((sample) => ({
        target: target.name,
        status: sample.status,
        durationMs: sample.durationMs,
        bodySnippet: sample.bodySnippet,
        error: sample.error,
      })),
  ),
};

const reportPaths = await writeBenchmarkReports({
  root,
  topic: 'scan-verify-write-performance',
  report,
  describeTarget: (target) => `${target.name}<br/>${target.path}`,
});

const output = {
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
  targets: targets.map((target) => ({
    name: target.name,
    summary: target.summary,
  })),
};

console.log(
  process.env.SILVERLINK_JSON_ONLY === '1'
    ? JSON.stringify(output)
    : JSON.stringify(output, null, 2),
);

process.exit(summary.failureCount === 0 ? 0 : 1);
