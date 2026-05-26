import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveAdminReviewRequest,
  createElder,
  createInvitation,
  createQrCode,
  createVolunteer,
  deleteElder,
  deleteInvitation,
  deleteVolunteer,
  disableInvitation,
  disableQrCode,
  fetchAdminReviewRequests,
  fetchAllScales,
  fetchAuditLogs,
  fetchDashboard,
  fetchElderMedications,
  fetchElderScales,
  fetchElders,
  fetchFamilyBindings,
  fetchInvitations,
  fetchMedications,
  fetchQrCodes,
  fetchSmsRelayDevices,
  fetchSmsRelayRecords,
  fetchSmsRelaySessions,
  fetchVolunteers,
  invalidateAdminCache,
  loginAdmin,
  logoutAdmin,
  regenerateQrCode,
  rejectAdminReviewRequest,
  saveElderMedications,
  saveElderScales,
  setElderStatus,
  unbindFamily,
  updateQrCodeRelayDevice,
  updateSmsRelayDevice,
  updateVolunteer,
  updateVolunteerScope,
} from './adminApi';

function response(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify({ code: 200, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function queueFetch(...items: Array<unknown | Response>) {
  const queue = [...items];
  const fetchMock = vi.fn().mockImplementation(() => {
    const next = queue.shift();
    return Promise.resolve(next instanceof Response ? next : response(next));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('adminApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    invalidateAdminCache();
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto,
    });
  });

  it('logs in, signs requests, caches GET responses and clears session on forbidden responses', async () => {
    const cleared = vi.fn();
    window.addEventListener('sl-admin-session-cleared', cleared);
    const fetchMock = queueFetch(
      { token: 'token-1', role: '管理员' },
      [{ id: 'elder-1', name: '老人', status: 'ACTIVE' }],
      new Response('Forbidden', { status: 403 }),
    );

    await expect(loginAdmin('admin', 'pass')).resolves.toEqual({ ok: true, role: '管理员' });
    expect(localStorage.getItem('sl_admin_token')).toBe('token-1');

    await expect(fetchElders()).resolves.toHaveLength(1);
    await expect(fetchElders()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer token-1');
    expect(fetchMock.mock.calls[1][1].headers['X-Signature']).toMatch(/^[a-f0-9]{64}$/);

    invalidateAdminCache();
    await expect(fetchElders()).rejects.toThrow('登录态已失效');
    expect(cleared).toHaveBeenCalled();
    window.removeEventListener('sl-admin-session-cleared', cleared);
  });

  it('maps dashboard, elder, volunteer and audit rows', async () => {
    queueFetch(
      { elderCount: 2, volunteerCount: 3, qrCodeCount: 4, auditCount: 5 },
      [{ id: 'elder-1', archiveNo: 'A001', emergencyContactPhone: '13800000000', status: 'ACTIVE' }],
      [{ time: 'now', operator: 'admin', result: 'SUCCESS', sourceIp: '127.0.0.1' }],
      [{ id: 'vol-1', scopeCount: 2, status: 'DISABLED', source: '后台创建' }],
    );

    await expect(fetchDashboard()).resolves.toMatchObject({
      dashboardMetrics: [
        { label: '老人档案', value: '2' },
        { label: '志愿者账号', value: '3' },
        { label: '二维码', value: '4' },
        { label: '操作日志', value: '5' },
      ],
    });
    invalidateAdminCache();
    await expect(fetchVolunteers()).resolves.toEqual([
      expect.objectContaining({ id: 'vol-1', elderCount: 2, status: '停用' }),
    ]);
  });

  it('sends elder, volunteer and qr mutations to the expected endpoints', async () => {
    const fetchMock = queueFetch(
      { id: 'elder-new' },
      {},
      {},
      { id: 'vol-new' },
      {},
      {},
      {},
      { qrId: 'qr-1' },
      {},
      { qrId: 'qr-2' },
      { id: 'qr-1', relayDeviceId: 'device-1', relayReceiverPhone: '13800000000' },
    );

    await createElder({ name: '老人' });
    await deleteElder('elder-1');
    await setElderStatus('elder-1', 'DISABLED');
    await createVolunteer({ account: 'vol' });
    await updateVolunteer('vol-1', { name: '志愿者' });
    await updateVolunteerScope('vol-1', ['elder-1']);
    await deleteVolunteer('vol-1');
    await createQrCode('elder-1', 'A001');
    await disableQrCode('qr-1');
    await regenerateQrCode('qr-1');
    await expect(updateQrCodeRelayDevice('qr-1', 'device-1')).resolves.toMatchObject({
      relayDeviceId: 'device-1',
    });

    const calledPaths = fetchMock.mock.calls.map((call) => call[0]);
    expect(calledPaths).toEqual([
      '/api/admin/elders',
      '/api/admin/elders/elder-1',
      '/api/admin/elders/elder-1/status',
      '/api/admin/volunteers',
      '/api/admin/volunteers/vol-1',
      '/api/admin/volunteers/vol-1/scope',
      '/api/admin/volunteers/vol-1',
      '/api/admin/qrcodes',
      '/api/admin/qrcodes/qr-1/disable',
      '/api/admin/qrcodes/qr-1/regenerate',
      '/api/admin/qrcodes/qr-1/relay-device',
    ]);
  });

  it('maps qrcode, invitation, family binding and review workflows', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    queueFetch(
      [{ id: 'qr-1', qrId: 'hash', status: 'REGENERATED', elderAge: '80' }],
      [
        { id: 'disabled', status: 'DISABLED' },
        { id: 'expired', expiresAt: yesterday },
        { id: 'used', usedCount: 1, maxUses: 1 },
        { id: 'fresh', usedCount: 0, maxUses: 2 },
      ],
      { code: 'INVITE' },
      {},
      {},
      [{ id: 'binding-1', status: 'ACTIVE' }],
      {},
      [{ id: 'review-1', title: '审核' }],
      { id: 'review-1', status: 'APPROVED' },
      { id: 'review-1', status: 'REJECTED' },
    );

    await expect(fetchQrCodes()).resolves.toEqual([
      expect.objectContaining({ id: 'qr-1', token: 'hash', status: '已重新生成', elderAge: 80 }),
    ]);
    await expect(fetchInvitations()).resolves.toEqual([
      expect.objectContaining({ id: 'disabled', status: '已作废' }),
      expect.objectContaining({ id: 'expired', status: '已过期' }),
      expect.objectContaining({ id: 'used', status: '已使用' }),
      expect.objectContaining({ id: 'fresh', status: '未使用' }),
    ]);
    await createInvitation('elder-1', 7, 1);
    await disableInvitation('invite-1');
    await deleteInvitation('invite-1');
    await expect(fetchFamilyBindings()).resolves.toEqual([
      expect.objectContaining({ id: 'binding-1', status: '已绑定' }),
    ]);
    await unbindFamily('binding-1');
    await expect(fetchAdminReviewRequests()).resolves.toEqual([expect.objectContaining({ id: 'review-1' })]);
    await expect(approveAdminReviewRequest('review-1')).resolves.toMatchObject({ status: 'APPROVED' });
    await expect(rejectAdminReviewRequest('review-1', '原因')).resolves.toMatchObject({ status: 'REJECTED' });
  });

  it('maps medications, scale records and relay rows', async () => {
    queueFetch(
      [{ id: 'med-1', name: '药品A', updateTime: '2026-05-25' }],
      [{ id: 'med-2', drugName: '药品B' }],
      { recordId: 'med-record' },
      [{ id: 'scale-1', name: 'ADL', score: '12', updatedAt: '2026-05-25' }],
      { recordId: 'scale-record' },
      [{ id: 'scale-a', date: '2026-05-25' }],
      [{ id: 'scale-b', date: '2026-05-24' }],
      [{ deviceId: 'device-1', status: 'PENDING', lastHeartbeat: 1770000000000 }],
      { deviceId: 'device-1', status: '在线', lastHeartbeat: 'bad-date' },
      [{ id: 'record-1', status: 'UPLOADED', receivedAt: 1770000000000 }],
      [{ sessionId: 'session-1', status: 'VERIFIED', createdAt: '2026-05-25T00:00:00Z' }],
    );

    await expect(fetchMedications()).resolves.toEqual([expect.objectContaining({ id: 'med-1', drugName: '药品A' })]);
    await expect(fetchElderMedications('elder-1')).resolves.toEqual([expect.objectContaining({ drugName: '药品B' })]);
    await expect(saveElderMedications('elder-1', [{ drugName: '药品C' }])).resolves.toEqual({ recordId: 'med-record' });
    await expect(fetchElderScales('elder-1')).resolves.toEqual([expect.objectContaining({ scaleName: 'ADL', score: 12 })]);
    await expect(saveElderScales('elder-1', [{ scaleName: 'ADL' }])).resolves.toEqual({ recordId: 'scale-record' });
    const allScales = await fetchAllScales([
      { id: 'elder-a', archiveNo: 'A', name: '老人A' },
      { id: 'elder-b', archiveNo: 'B', name: '老人B' },
    ]);
    expect(allScales.map((item) => item.id)).toEqual(['scale-a', 'scale-b']);
    expect(new Set(allScales.map((item) => item.elderId))).toEqual(new Set(['elder-a', 'elder-b']));
    await expect(fetchSmsRelayDevices()).resolves.toEqual([expect.objectContaining({ status: '等待验证' })]);
    await expect(updateSmsRelayDevice('device-1', {
      receiverPhone: '13800000000',
      serverUrl: 'http://localhost',
      messagePrefix: 'SL',
    })).resolves.toMatchObject({ status: '在线', lastHeartbeat: 'bad-date' });
    await expect(fetchSmsRelayRecords()).resolves.toEqual([expect.objectContaining({ status: '已上传' })]);
    await expect(fetchSmsRelaySessions()).resolves.toEqual([expect.objectContaining({ status: '已验证' })]);
  });

  it('normalizes logout failures without surfacing remote errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 404 })));

    await expect(logoutAdmin()).resolves.toBeUndefined();
  });
});
