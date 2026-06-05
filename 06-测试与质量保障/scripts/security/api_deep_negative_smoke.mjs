#!/usr/bin/env node

import {
  apiBaseUrl,
  loginAdmin,
  loginFamily,
  loginVolunteer,
  requestJson,
  signedHeaders,
  writeJsonReport,
} from '../common/live_api_helpers.mjs';

function extractMessage(result) {
  return (
    result.json?.message ||
    result.json?.msg ||
    result.json?.error ||
    result.text ||
    ''
  );
}

async function runCase(name, acceptedStatuses, acceptedMessageFragments, fn) {
  const result = await fn();
  const message = extractMessage(result);
  const ok =
    acceptedStatuses.includes(result.status) &&
    acceptedMessageFragments.some((fragment) => !fragment || message.includes(fragment));
  return {
    name,
    status: result.status,
    durationMs: result.durationMs,
    ok,
    acceptedStatuses,
    acceptedMessageFragments,
    message,
    preview: result.json?.data ?? null,
  };
}

const checks = [];

checks.push(await runCase(
  'admin-login invalid timestamp rejected',
  [400],
  ['invalid timestamp'],
  async () => requestJson('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...signedHeaders('POST', '/api/admin/login', { timestamp: 'bad-ts', nonce: 'negative-invalid-ts' }),
    },
    body: JSON.stringify({ account: 'admin', password: 'admin' }),
  })
));

checks.push(await runCase(
  'admin-login expired timestamp rejected',
  [400],
  ['timestamp expired'],
  async () => requestJson('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...signedHeaders('POST', '/api/admin/login', {
        timestamp: String(Math.floor(Date.now() / 1000) - 3600),
        nonce: 'negative-expired-ts',
      }),
    },
    body: JSON.stringify({ account: 'admin', password: 'admin' }),
  })
));

checks.push(await runCase(
  'admin-login invalid signature rejected',
  [400],
  ['invalid signature'],
  async () => requestJson('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...signedHeaders('POST', '/api/admin/login', {
        nonce: 'negative-invalid-signature',
        secret: 'wrong-secret-for-negative-smoke',
      }),
    },
    body: JSON.stringify({ account: 'admin', password: 'admin' }),
  })
));

{
  const replayNonce = `replay-${Date.now()}`;
  const replayHeaders = {
    'Content-Type': 'application/json',
    ...signedHeaders('POST', '/api/admin/login', { nonce: replayNonce }),
  };
  const first = await requestJson('/api/admin/login', {
    method: 'POST',
    headers: replayHeaders,
    body: JSON.stringify({ account: 'admin', password: 'admin' }),
  });
  const second = await requestJson('/api/admin/login', {
    method: 'POST',
    headers: replayHeaders,
    body: JSON.stringify({ account: 'admin', password: 'admin' }),
  });
  checks.push({
    name: 'admin-login nonce replay rejected',
    status: second.status,
    durationMs: second.durationMs,
    ok: first.status === 200 && second.status === 400 && extractMessage(second).includes('nonce already used'),
    acceptedStatuses: [400],
    acceptedMessageFragments: ['nonce already used'],
    message: extractMessage(second),
    preview: null,
  });
}

{
  const volunteer = await loginVolunteer();
  checks.push(await runCase(
    'volunteer token cannot access family endpoint',
    [403],
    ['无权', 'Forbidden', 'Access Denied', 'forbidden', '访问'],
    async () => requestJson('/api/family/me/elders', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${volunteer.token}`,
      },
    })
  ));
}

{
  const family = await loginFamily();
  checks.push(await runCase(
    'family token cannot access admin dashboard even with valid signature',
    [403],
    ['Forbidden', 'Access Denied', 'forbidden', '权限', 'denied'],
    async () => requestJson('/api/admin/dashboard', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${family.token}`,
        ...signedHeaders('GET', '/api/admin/dashboard'),
      },
    })
  ));
}

{
  const admin = await loginAdmin();
  checks.push(await runCase(
    'admin token cannot access family scoped elder list',
    [403],
    ['Forbidden', 'Access Denied', 'forbidden', '权限', 'denied'],
    async () => requestJson('/api/family/me/elders', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
  ));
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'deep-negative-live',
  apiBaseUrl,
  checks,
  passed: checks.every((item) => item.ok),
};

const reportPath = await writeJsonReport('06-测试与质量保障/reports/security', 'api-deep-negative-smoke', report);
console.log(JSON.stringify({ reportPath, passed: report.passed, total: checks.length }, null, 2));
process.exit(report.passed ? 0 : 1);
