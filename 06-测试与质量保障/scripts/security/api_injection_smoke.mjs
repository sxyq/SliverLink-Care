#!/usr/bin/env node

import {
  apiBaseUrl,
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

function bodyPreview(result) {
  if (result.json?.data !== undefined) {
    return result.json.data;
  }
  return result.text;
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
    preview: bodyPreview(result),
  };
}

const adminSqlInjectionAccount = "admin' OR '1'='1";
const familySqlInjectionPhone = "13800000001' OR '1'='1";
const xssPayload = `<img src=x onerror="window.__slXss=1">`;
const invitationInjectionCode = "FAMILY001' OR '1'='1";

const checks = [];

checks.push(await runCase(
  'admin login rejects sql injection style account payload',
  [200, 400, 401],
  (result) => result.json?.code !== 200 || !result.json?.data?.token,
  async () => requestJson('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...signedHeaders('POST', '/api/admin/login', { nonce: `sqli-admin-${Date.now()}` }),
    },
    body: JSON.stringify({
      account: adminSqlInjectionAccount,
      password: 'whatever',
    }),
  })
));

checks.push(await runCase(
  'family login rejects sql injection style phone payload',
  [200, 400, 401],
  (result) => result.json?.data?.ok !== true,
  async () => requestJson('/api/family/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: familySqlInjectionPhone,
      password: 'whatever',
    }),
  })
));

checks.push(await runCase(
  'invitation preview does not expand sql injection style code payload',
  [400, 404],
  (result) => !result.json?.data?.code,
  async () => requestJson(`/api/invitations/${encodeURIComponent(invitationInjectionCode)}/preview`, {
    method: 'GET',
  })
));

checks.push(await runCase(
  'invitation register rejects sql injection style payloads',
  [200, 400, 404],
  (result) => result.json?.data?.ok !== true,
  async () => requestJson(`/api/invitations/${encodeURIComponent(invitationInjectionCode)}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: xssPayload,
      phone: familySqlInjectionPhone,
      relationship: "女儿' OR '1'='1",
      password: "x' OR '1'='1",
      smsCode: '123456',
    }),
  })
));

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'live-api-injection-smoke',
  apiBaseUrl,
  payloads: {
    adminSqlInjectionAccount,
    familySqlInjectionPhone,
    invitationInjectionCode,
    xssPayload,
  },
  checks,
  passed: checks.every((item) => item.ok),
};

const reportPath = await writeJsonReport('06-测试与质量保障/reports/security', 'api-injection-smoke', report);
console.log(JSON.stringify({ reportPath, passed: report.passed, total: checks.length }, null, 2));
process.exit(report.passed ? 0 : 1);
