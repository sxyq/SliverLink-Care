#!/usr/bin/env node

import {
  apiBaseUrl,
  loginFamily,
  requestJson,
  writeJsonReport,
} from '../common/live_api_helpers.mjs';

const xssPayload = `<img src=x onerror="window.__slXss=1">`;

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function main() {
  const family = await loginFamily();
  const elderList = await requestJson('/api/family/me/elders', {
    method: 'GET',
    headers: { Authorization: `Bearer ${family.token}` },
  });
  if (!elderList.ok || !Array.isArray(elderList.json?.data) || elderList.json.data.length === 0) {
    const report = {
      generatedAt: new Date().toISOString(),
      mode: 'live-api-xss-reversible-smoke',
      apiBaseUrl,
      passed: false,
      reason: 'no family elders available',
    };
    const reportPath = await writeJsonReport('06-测试与质量保障/reports/security', 'api-xss-reversible-smoke', report);
    console.log(JSON.stringify({ reportPath, passed: false }, null, 2));
    process.exit(1);
  }

  const elderId = elderList.json.data[0].id;
  const before = await requestJson(`/api/family/elders/${elderId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${family.token}` },
  });

  const original = {
    emergencyContactName: before.json?.data?.emergencyContactName ?? '',
    emergencyContactPhone: before.json?.data?.emergencyContactPhone ?? '',
    emergencyContactRelation: before.json?.data?.emergencyContactRelation ?? before.json?.data?.relationship ?? '',
    backupContactName: before.json?.data?.backupContactName ?? '',
    backupContactPhone: before.json?.data?.backupContactPhone ?? '',
  };

  const mutated = {
    ...original,
    emergencyContactName: xssPayload,
    backupContactName: xssPayload,
  };

  const update = await requestJson(`/api/family/elders/${elderId}/contacts`, {
    method: 'PUT',
    headers: authHeaders(family.token),
    body: JSON.stringify(mutated),
  });

  const after = await requestJson(`/api/family/elders/${elderId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${family.token}` },
  });

  const restored = await requestJson(`/api/family/elders/${elderId}/contacts`, {
    method: 'PUT',
    headers: authHeaders(family.token),
    body: JSON.stringify(original),
  });

  const checks = [
    {
      name: 'xss payload can be stored and read back for frontend escaping validation',
      status: after.status,
      ok:
        update.status === 200 &&
        after.status === 200 &&
        after.json?.data?.emergencyContactName === xssPayload &&
        after.json?.data?.backupContactName === xssPayload,
      preview: {
        emergencyContactName: after.json?.data?.emergencyContactName ?? null,
        backupContactName: after.json?.data?.backupContactName ?? null,
      },
    },
    {
      name: 'original contact data restored after xss smoke',
      status: restored.status,
      ok: restored.status === 200,
      preview: original,
    },
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'live-api-xss-reversible-smoke',
    apiBaseUrl,
    note: 'This is an API-level reversible XSS storage smoke. It validates storage and restoration, but not final browser-side escaping.',
    elderId,
    checks,
    passed: checks.every((item) => item.ok),
  };

  const reportPath = await writeJsonReport('06-测试与质量保障/reports/security', 'api-xss-reversible-smoke', report);
  console.log(JSON.stringify({ reportPath, passed: report.passed, total: checks.length }, null, 2));
  process.exit(report.passed ? 0 : 1);
}

await main();
