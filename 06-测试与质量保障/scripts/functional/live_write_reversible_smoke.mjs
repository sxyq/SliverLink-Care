#!/usr/bin/env node

import {
  adminAccount,
  adminPassword,
  apiBaseUrl,
  familyPhone,
  familyPassword,
  loginAdmin,
  loginFamily,
  requestJson,
  signedHeaders,
  writeJsonReport,
} from '../common/live_api_helpers.mjs';

function requireApiSuccess(result, label) {
  if (!result.ok || result.json?.code === 500) {
    throw new Error(`${label} failed: HTTP ${result.status} ${result.text}`);
  }
  return result;
}

const admin = await loginAdmin();
const family = await loginFamily();
const checks = [];

async function addCheck(name, fn) {
  const result = await fn();
  checks.push({ name, ...result });
}

await addCheck('admin create invitation and delete it', async () => {
  const createHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${admin.token}`,
    ...signedHeaders('POST', '/api/admin/invitations'),
  };
  const createResult = requireApiSuccess(await requestJson('/api/admin/invitations', {
    method: 'POST',
    headers: createHeaders,
    body: JSON.stringify({ elderId: 'elder-001', expiresInDays: 3, maxUses: 1 }),
  }), 'create invitation');
  const createdId = createResult.json?.data?.id;
  const createdCode = createResult.json?.data?.code;
  if (!createdId || !createdCode) {
    throw new Error(`create invitation returned no id/code: ${createResult.text}`);
  }

  const listResult = requireApiSuccess(await requestJson('/api/admin/invitations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('GET', '/api/admin/invitations'),
    },
  }), 'list invitations after create');
  const createdVisible = Array.isArray(listResult.json?.data) && listResult.json.data.some((item) => item.id === createdId);

  const deleteResult = requireApiSuccess(await requestJson(`/api/admin/invitations/${createdId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('DELETE', `/api/admin/invitations/${createdId}`),
    },
  }), 'delete invitation');

  const listAfterDelete = requireApiSuccess(await requestJson('/api/admin/invitations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('GET', '/api/admin/invitations'),
    },
  }), 'list invitations after delete');
  const deletedGone = Array.isArray(listAfterDelete.json?.data) && !listAfterDelete.json.data.some((item) => item.id === createdId);

  return {
    ok: createdVisible && deleteResult.ok && deletedGone,
    createdId,
    createdCode,
    createdVisible,
    deletedGone,
    createStatus: createResult.status,
    deleteStatus: deleteResult.status,
  };
});

await addCheck('admin disable endpoint toggles invitation state and restores it', async () => {
  const listBefore = requireApiSuccess(await requestJson('/api/admin/invitations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('GET', '/api/admin/invitations'),
    },
  }), 'list invitations before toggle');
  const target = listBefore.json?.data?.find?.((item) => item.code === 'FAMILY005') || listBefore.json?.data?.[0];
  if (!target?.id) {
    throw new Error(`no invitation available for toggle: ${JSON.stringify(listBefore.json?.data?.slice?.(0, 3) ?? null)}`);
  }
  const beforeStatus = target.status;

  const toggleOnce = requireApiSuccess(await requestJson(`/api/admin/invitations/${target.id}/disable`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('PUT', `/api/admin/invitations/${target.id}/disable`),
    },
  }), 'toggle invitation once');
  const listAfterOnce = requireApiSuccess(await requestJson('/api/admin/invitations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('GET', '/api/admin/invitations'),
    },
  }), 'list invitations after toggle once');
  const afterOnce = listAfterOnce.json?.data?.find?.((item) => item.id === target.id)?.status;

  const toggleTwice = requireApiSuccess(await requestJson(`/api/admin/invitations/${target.id}/disable`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('PUT', `/api/admin/invitations/${target.id}/disable`),
    },
  }), 'toggle invitation twice');
  const listAfterTwice = requireApiSuccess(await requestJson('/api/admin/invitations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('GET', '/api/admin/invitations'),
    },
  }), 'list invitations after toggle twice');
  const restoredStatus = listAfterTwice.json?.data?.find?.((item) => item.id === target.id)?.status;

  return {
    ok: toggleOnce.ok && toggleTwice.ok && beforeStatus !== afterOnce && restoredStatus === beforeStatus,
    invitationId: target.id,
    code: target.code,
    beforeStatus,
    afterOnce,
    restoredStatus,
  };
});

await addCheck('family update contacts and restore original values', async () => {
  const detailBefore = requireApiSuccess(await requestJson('/api/family/elders/elder-001', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${family.token}`,
    },
  }), 'family elder detail before update');
  const original = detailBefore.json?.data;
  if (!original) {
    throw new Error(`family elder detail missing data: ${detailBefore.text}`);
  }
  const replacement = {
    emergencyContactName: `${original.emergencyContactName || '联系人'}-回归`,
    emergencyContactPhone: '13800001234',
    emergencyContactRelation: original.emergencyContactRelation || '家属',
    backupContactName: `${original.backupContactName || '备用联系人'}-回归`,
    backupContactPhone: '13900005678',
    backupContactRelation: original.backupContactRelation || '备用联系人',
  };

  const updateOnce = requireApiSuccess(await requestJson('/api/family/elders/elder-001/contacts', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${family.token}`,
    },
    body: JSON.stringify(replacement),
  }), 'family update contacts');

  const detailUpdated = requireApiSuccess(await requestJson('/api/family/elders/elder-001', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${family.token}`,
    },
  }), 'family elder detail after update');
  const updated = detailUpdated.json?.data;

  const restorePayload = {
    emergencyContactName: original.emergencyContactName,
    emergencyContactPhone: original.emergencyContactPhone,
    emergencyContactRelation: original.emergencyContactRelation,
    backupContactName: original.backupContactName,
    backupContactPhone: original.backupContactPhone,
    backupContactRelation: original.backupContactRelation,
  };
  const restoreResult = requireApiSuccess(await requestJson('/api/family/elders/elder-001/contacts', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${family.token}`,
    },
    body: JSON.stringify(restorePayload),
  }), 'family restore contacts');

  const detailRestored = requireApiSuccess(await requestJson('/api/family/elders/elder-001', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${family.token}`,
    },
  }), 'family elder detail after restore');
  const restored = detailRestored.json?.data;

  return {
    ok:
      updateOnce.ok &&
      restoreResult.ok &&
      updated?.emergencyContactPhone === replacement.emergencyContactPhone &&
      restored?.emergencyContactPhone === original.emergencyContactPhone &&
      restored?.backupContactPhone === original.backupContactPhone,
    operator: `${familyPhone}/${familyPassword}`,
    before: {
      emergencyContactName: original.emergencyContactName,
      emergencyContactPhone: original.emergencyContactPhone,
      backupContactName: original.backupContactName,
      backupContactPhone: original.backupContactPhone,
    },
    updated: {
      emergencyContactName: updated?.emergencyContactName,
      emergencyContactPhone: updated?.emergencyContactPhone,
      backupContactName: updated?.backupContactName,
      backupContactPhone: updated?.backupContactPhone,
    },
    restored: {
      emergencyContactName: restored?.emergencyContactName,
      emergencyContactPhone: restored?.emergencyContactPhone,
      backupContactName: restored?.backupContactName,
      backupContactPhone: restored?.backupContactPhone,
    },
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'live-write-reversible',
  apiBaseUrl,
  adminAccount,
  checks,
  passed: checks.every((item) => item.ok),
};

const reportPath = await writeJsonReport('06-测试与质量保障/reports/functional', 'live-write-reversible-smoke', report);
console.log(JSON.stringify({ reportPath, passed: report.passed, total: checks.length }, null, 2));
process.exit(report.passed ? 0 : 1);
