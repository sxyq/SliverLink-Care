#!/usr/bin/env node

import {
  apiBaseUrl,
  requestJson,
  writeJsonReport,
} from '../common/live_api_helpers.mjs';

const correctElderId = 'elder-002';
const wrongElderId = 'elder-001';
const visitorName = 'Cross Scope Tester';
const visitorPhone = '15800006543';
const visitorIdCard = '110101199001011237';

function extractMessage(result) {
  return (
    result.json?.message ||
    result.json?.msg ||
    result.json?.error ||
    result.text ||
    ''
  );
}

async function runCase(name, acceptedStatuses, predicate, fn) {
  const result = await fn();
  const ok = acceptedStatuses.includes(result.status) && predicate(result);
  return {
    name,
    status: result.status,
    durationMs: result.durationMs,
    ok,
    message: extractMessage(result),
    preview: result.json?.data ?? null,
  };
}

const createSession = await requestJson('/api/scan/verification/identity', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    elderId: correctElderId,
    target: 'health',
    name: visitorName,
    phone: visitorPhone,
    idCard: visitorIdCard,
  }),
});

if (!createSession.ok || !createSession.json?.data?.sessionId) {
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'live-api-cross-record-smoke',
    apiBaseUrl,
    createSession,
    checks: [],
    passed: false,
  };
  const reportPath = await writeJsonReport('06-测试与质量保障/reports/security', 'api-cross-record-smoke', report);
  console.log(JSON.stringify({ reportPath, passed: false, reason: 'failed to create verification session' }, null, 2));
  process.exit(1);
}

const sessionId = createSession.json.data.sessionId;
const checks = [];

const protectedEndpoints = [
  { key: 'basic-info', path: (elderId) => `/api/scan/basic-info?elderId=${elderId}&sessionId=${sessionId}` },
  { key: 'archive', path: (elderId) => `/api/scan/archive?elderId=${elderId}&sessionId=${sessionId}` },
  { key: 'medications', path: (elderId) => `/api/scan/medications?elderId=${elderId}&sessionId=${sessionId}` },
  { key: 'scales', path: (elderId) => `/api/scan/scales?elderId=${elderId}&sessionId=${sessionId}` },
];

for (const endpoint of protectedEndpoints) {
  checks.push(await runCase(
    `${endpoint.key} allows verified session on bound elder`,
    [200],
    (result) => result.json?.code === 200,
    async () => requestJson(endpoint.path(correctElderId), { method: 'GET' })
  ));

  checks.push(await runCase(
    `${endpoint.key} denies cross-elder access`,
    [403],
    (result) => extractMessage(result).includes('elder mismatch') || extractMessage(result).includes('无权') || extractMessage(result).includes('mismatch'),
    async () => requestJson(endpoint.path(wrongElderId), { method: 'GET' })
  ));
}

const scalesResult = await requestJson(`/api/scan/scales?elderId=${correctElderId}&sessionId=${sessionId}`, { method: 'GET' });
const firstScaleName = scalesResult.json?.data?.[0]?.name || scalesResult.json?.data?.[0]?.scale || '';
if (firstScaleName) {
  const encodedScaleName = encodeURIComponent(firstScaleName);
  checks.push(await runCase(
    'scale detail allows verified session on bound elder',
    [200],
    (result) => result.json?.code === 200,
    async () => requestJson(`/api/scan/scales/${encodedScaleName}?elderId=${correctElderId}&sessionId=${sessionId}`, { method: 'GET' })
  ));
  checks.push(await runCase(
    'scale detail denies cross-elder access',
    [403],
    (result) => extractMessage(result).includes('elder mismatch') || extractMessage(result).includes('无权') || extractMessage(result).includes('mismatch'),
    async () => requestJson(`/api/scan/scales/${encodedScaleName}?elderId=${wrongElderId}&sessionId=${sessionId}`, { method: 'GET' })
  ));
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'live-api-cross-record-smoke',
  apiBaseUrl,
  session: {
    elderId: correctElderId,
    wrongElderId,
    sessionId,
    visitorName,
    visitorPhone,
    visitorIdCardMasked: `${visitorIdCard.slice(0, 4)}********${visitorIdCard.slice(-4)}`,
  },
  checks,
  passed: checks.every((item) => item.ok),
};

const reportPath = await writeJsonReport('06-测试与质量保障/reports/security', 'api-cross-record-smoke', report);
console.log(JSON.stringify({ reportPath, passed: report.passed, total: checks.length }, null, 2));
process.exit(report.passed ? 0 : 1);
