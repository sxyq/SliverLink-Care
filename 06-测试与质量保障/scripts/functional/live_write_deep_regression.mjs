#!/usr/bin/env node

import {
  adminAccount,
  apiBaseUrl,
  isoFileTs,
  loginAdmin,
  loginFamily,
  loginVolunteer,
  requestJson,
  signedHeaders,
  volunteerAccount as defaultVolunteerAccount,
  volunteerPassword as defaultVolunteerPassword,
  webBaseUrl,
  writeJsonReport,
} from '../common/live_api_helpers.mjs';

function requireApiSuccess(result, label) {
  if (!result.ok || result.json?.code === 500) {
    throw new Error(`${label} failed: HTTP ${result.status} ${result.text}`);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const admin = await loginAdmin();
const family = await loginFamily();
const checks = [];
const cleanup = [];

async function addCheck(name, fn) {
  const startedAt = new Date().toISOString();
  try {
    const result = await fn();
    checks.push({ name, startedAt, ok: true, ...result });
  } catch (error) {
    checks.push({
      name,
      startedAt,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function adminGet(path) {
  return requestJson(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('GET', path),
    },
  });
}

async function adminPost(path, body) {
  return requestJson(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('POST', path),
    },
    body: JSON.stringify(body),
  });
}

async function adminPut(path, body = undefined) {
  return requestJson(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('PUT', path),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function adminDelete(path) {
  return requestJson(path, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      ...signedHeaders('DELETE', path),
    },
  });
}

async function safeCleanup(label, fn) {
  try {
    await fn();
  } catch (error) {
    checks.push({
      name: `cleanup: ${label}`,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const tempElderName = `回归老人-${suffix}`;
const tempVolunteerName = `回归志愿者-${suffix}`;
const tempVolunteerAccount = `reg_${suffix.toLowerCase()}`;
const tempVolunteerPassword = `Volunteer@${suffix.slice(-6)}!`;
const directVolunteerAccount = `direct_${suffix.toLowerCase()}`;
const directVolunteerPassword = `Direct@${suffix.slice(-6)}!`;
let createdElderId = '';
let createdInvitationId = '';
let createdInvitationCode = '';
let registeredVolunteerId = '';
let directVolunteerId = '';
let reviewRequestId = '';
let latestQrCodeId = '';
let qrTokenBefore = '';
let qrTokenAfterRegenerate = '';
let registeredVolunteerToken = '';

try {
  await addCheck('admin create elder and verify it is visible', async () => {
    const create = requireApiSuccess(await adminPost('/api/admin/elders', {
      name: tempElderName,
      gender: '女',
      age: 79,
      residence: '测试回归地址',
      emergencyContactName: '回归联系人',
      emergencyPhone: '13800001111',
      relationship: '女儿',
      backupContactName: '回归备用',
      backupPhone: '13900002222',
      aboType: 'A',
      rhType: '+',
      allergySummary: '无',
    }), 'create elder');
    createdElderId = create.json?.data?.id ?? '';
    assert(createdElderId, `create elder returned no id: ${create.text}`);
    cleanup.push(() => safeCleanup('delete temp elder', async () => {
      await adminDelete(`/api/admin/elders/${createdElderId}`);
    }));

    const list = requireApiSuccess(await adminGet('/api/admin/elders'), 'list elders');
    const elder = list.json?.data?.find?.((item) => item.id === createdElderId);
    assert(elder, `created elder ${createdElderId} not found in admin list`);

    const qrList = requireApiSuccess(await adminGet('/api/admin/qrcodes'), 'list qrcodes after elder create');
    const qr = qrList.json?.data?.find?.((item) => item.elderId === createdElderId);
    assert(qr?.id, `created elder ${createdElderId} has no qr code`);
    latestQrCodeId = qr.id;
    qrTokenBefore = qr.token ?? qr.url ?? '';

    return {
      elderId: createdElderId,
      qrCodeId: latestQrCodeId,
      elderName: elder.name ?? tempElderName,
      visibleInAdminList: true,
      qrCreated: true,
    };
  });

  await addCheck('admin create invitation and preview it for the temp elder', async () => {
    const create = requireApiSuccess(await adminPost('/api/admin/invitations', {
      elderId: createdElderId,
      expiresInDays: 3,
      maxUses: 1,
    }), 'create invitation');
    createdInvitationId = create.json?.data?.id ?? '';
    createdInvitationCode = create.json?.data?.code ?? '';
    assert(createdInvitationId && createdInvitationCode, `create invitation returned incomplete data: ${create.text}`);
    cleanup.push(() => safeCleanup('delete temp invitation', async () => {
      await adminDelete(`/api/admin/invitations/${createdInvitationId}`);
    }));

    const preview = requireApiSuccess(await requestJson(`/api/invitations/${createdInvitationCode}/preview`, {
      method: 'GET',
    }), 'preview invitation');
    const previewCode = preview.json?.data?.code ?? '';
    const previewStatus = preview.json?.data?.status ?? '';
    assert(previewCode === createdInvitationCode, `preview code mismatch: ${previewCode} !== ${createdInvitationCode}`);
    assert(previewStatus === 'ACTIVE', `preview status mismatch: ${previewStatus}`);

    return {
      invitationId: createdInvitationId,
      invitationCode: createdInvitationCode,
      previewCode,
      previewStatus,
      previewHttpStatus: preview.status,
    };
  });

  await addCheck('volunteer register with invitation, login, and see temp elder', async () => {
    const register = requireApiSuccess(await requestJson('/api/volunteer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitationCode: createdInvitationCode,
        account: tempVolunteerAccount,
        password: tempVolunteerPassword,
        name: tempVolunteerName,
        phone: '13700003333',
      }),
    }), 'volunteer register with invitation');
    registeredVolunteerId = register.json?.data?.volunteerId ?? '';
    registeredVolunteerToken = register.json?.data?.token ?? '';
    assert(registeredVolunteerId && registeredVolunteerToken, `register returned incomplete volunteer data: ${register.text}`);
    cleanup.push(() => safeCleanup('disable registered temp volunteer', async () => {
      await adminDelete(`/api/admin/volunteers/${registeredVolunteerId}`);
    }));

    const login = requireApiSuccess(await requestJson('/api/volunteer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: tempVolunteerAccount, password: tempVolunteerPassword }),
    }), 'temp volunteer login');
    const token = login.json?.data?.token ?? registeredVolunteerToken;
    assert(token, 'temp volunteer login returned no token');

    const myElders = requireApiSuccess(await requestJson('/api/volunteer/me/elders', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }), 'temp volunteer my elders');
    const ownsTempElder = myElders.json?.data?.some?.((item) => item.id === createdElderId) ?? false;
    assert(ownsTempElder, `temp volunteer does not see temp elder ${createdElderId}`);

    return {
      volunteerId: registeredVolunteerId,
      volunteerAccount: tempVolunteerAccount,
      ownsTempElder,
      elderCount: myElders.json?.data?.length ?? 0,
    };
  });

  await addCheck('volunteer qr manage regenerate disable request and admin approve flow', async () => {
    const token = registeredVolunteerToken || (await loginVolunteer()).token;
    const manage = requireApiSuccess(await requestJson(`/api/volunteer/me/elders/${createdElderId}/qr-manage`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }), 'volunteer qr manage');
    assert(manage.json?.data?.id, `qr-manage returned no qr code id: ${manage.text}`);
    latestQrCodeId = manage.json.data.id;
    const originalToken = manage.json?.data?.token ?? '';

    const regenerate = requireApiSuccess(await requestJson(`/api/volunteer/me/elders/${createdElderId}/qr-regenerate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }), 'volunteer qr regenerate');
    latestQrCodeId = regenerate.json?.data?.id ?? latestQrCodeId;
    qrTokenAfterRegenerate = regenerate.json?.data?.token ?? '';
    assert(qrTokenAfterRegenerate, `qr regenerate returned no token: ${regenerate.text}`);
    assert(qrTokenAfterRegenerate !== originalToken, 'qr regenerate token did not change');

    const disableRequest = requireApiSuccess(await requestJson(`/api/volunteer/me/elders/${createdElderId}/qr-disable`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }), 'volunteer qr disable request');
    reviewRequestId = disableRequest.json?.data?.disableReviewId ?? '';
    assert(reviewRequestId, `qr disable request returned no review id: ${disableRequest.text}`);

    const pendingReviews = requireApiSuccess(await adminGet('/api/admin/review-requests'), 'list pending review requests');
    const pending = pendingReviews.json?.data?.find?.((item) => item.id === reviewRequestId);
    assert(pending, `pending review ${reviewRequestId} not found`);

    const approve = requireApiSuccess(await adminPost(`/api/admin/review-requests/${reviewRequestId}/approve`, {}), 'approve qr disable review');
    const approvedStatus = approve.json?.data?.status ?? '';
    assert(approvedStatus === 'APPROVED', `review ${reviewRequestId} not approved: ${approve.text}`);

    const qrListAfterApprove = requireApiSuccess(await adminGet('/api/admin/qrcodes'), 'list qrcodes after approve');
    const qrAfterApprove = qrListAfterApprove.json?.data?.find?.((item) => item.id === latestQrCodeId);
    assert(qrAfterApprove?.status === 'DISABLED', `qr ${latestQrCodeId} not disabled after approve`);

    return {
      qrCodeId: latestQrCodeId,
      reviewRequestId,
      originalTokenChanged: true,
      approvedStatus,
      qrStatusAfterApprove: qrAfterApprove?.status ?? '',
    };
  });

  await addCheck('family cross-record protection still blocks temp elder access', async () => {
    const detail = await requestJson(`/api/family/elders/${createdElderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${family.token}` },
    });
    assert(detail.status === 403, `family cross-record expected 403, got ${detail.status}`);
    return {
      expectedStatus: 403,
      actualStatus: detail.status,
      body: detail.json ?? detail.text,
    };
  });

  await addCheck('admin create and delete direct volunteer', async () => {
    const create = requireApiSuccess(await adminPost('/api/admin/volunteers', {
      account: directVolunteerAccount,
      password: directVolunteerPassword,
      name: `直建-${tempVolunteerName}`,
      phone: '13600004444',
    }), 'create direct volunteer');
    directVolunteerId = create.json?.data?.id ?? '';
    assert(directVolunteerId, `create direct volunteer returned no id: ${create.text}`);
    cleanup.push(() => safeCleanup('disable direct temp volunteer', async () => {
      await adminDelete(`/api/admin/volunteers/${directVolunteerId}`);
    }));

    const list = requireApiSuccess(await adminGet('/api/admin/volunteers'), 'list volunteers after direct create');
    const created = list.json?.data?.find?.((item) => item.id === directVolunteerId);
    assert(created, `direct volunteer ${directVolunteerId} not visible in admin list`);

    const remove = requireApiSuccess(await adminDelete(`/api/admin/volunteers/${directVolunteerId}`), 'delete direct volunteer');
    const listAfterDelete = requireApiSuccess(await adminGet('/api/admin/volunteers'), 'list volunteers after direct delete');
    const deleted = listAfterDelete.json?.data?.find?.((item) => item.id === directVolunteerId);
    assert(deleted?.status === 'DISABLED', `direct volunteer ${directVolunteerId} not disabled after delete`);

    return {
      volunteerId: directVolunteerId,
      deleteStatus: remove.status,
      finalStatus: deleted?.status ?? '',
    };
  });

  await addCheck('admin delete registered volunteer temp elder and invitation cleanup', async () => {
    const deleteVolunteer = requireApiSuccess(await adminDelete(`/api/admin/volunteers/${registeredVolunteerId}`), 'delete registered volunteer');
    const volunteers = requireApiSuccess(await adminGet('/api/admin/volunteers'), 'list volunteers after registered volunteer delete');
    const volunteer = volunteers.json?.data?.find?.((item) => item.id === registeredVolunteerId);
    assert(volunteer?.status === 'DISABLED', `registered volunteer ${registeredVolunteerId} not disabled`);

    const deleteInvitation = requireApiSuccess(await adminDelete(`/api/admin/invitations/${createdInvitationId}`), 'delete temp invitation');
    const invitations = requireApiSuccess(await adminGet('/api/admin/invitations'), 'list invitations after delete');
    const invitationGone = !(invitations.json?.data?.some?.((item) => item.id === createdInvitationId) ?? false);
    assert(invitationGone, `invitation ${createdInvitationId} still present after delete`);

    const deleteElder = requireApiSuccess(await adminDelete(`/api/admin/elders/${createdElderId}`), 'delete temp elder');
    const elders = requireApiSuccess(await adminGet('/api/admin/elders'), 'list elders after temp elder delete');
    const elder = elders.json?.data?.find?.((item) => item.id === createdElderId);
    assert(elder?.status === 'DISABLED', `temp elder ${createdElderId} not disabled after delete`);

    return {
      volunteerId: registeredVolunteerId,
      invitationId: createdInvitationId,
      elderId: createdElderId,
      registeredVolunteerStatus: volunteer?.status ?? '',
      invitationGone,
      elderStatus: elder?.status ?? '',
      statuses: {
        deleteVolunteer: deleteVolunteer.status,
        deleteInvitation: deleteInvitation.status,
        deleteElder: deleteElder.status,
      },
    };
  });
} finally {
  while (cleanup.length) {
    const task = cleanup.pop();
    if (task) {
      await task();
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'live-write-deep-regression',
  webBaseUrl,
  apiBaseUrl,
  adminAccount,
  tempResources: {
    createdElderId,
    createdInvitationId,
    createdInvitationCode,
    registeredVolunteerId,
    directVolunteerId,
    reviewRequestId,
    latestQrCodeId,
    tempVolunteerAccount,
    directVolunteerAccount,
  },
  checks,
  passed: checks.every((item) => item.ok),
};

const reportPath = await writeJsonReport('06-测试与质量保障/reports/functional', 'live-write-deep-regression', report);
console.log(JSON.stringify({ reportPath, passed: report.passed, total: checks.length }, null, 2));
process.exit(report.passed ? 0 : 1);
