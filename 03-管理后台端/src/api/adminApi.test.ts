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
  });

  it('logs in with cookie session, caches GET responses and clears session on forbidden responses', async () => {
    const cleared = vi.fn();
    window.addEventListener('sl-admin-session-cleared', cleared);
    const fetchMock = queueFetch(
      { role: '管理员' },
      { role: '管理员', account: 'admin' },
      [{ id: 'elder-1', name: '老人', status: 'ACTIVE' }],
      new Response('Forbidden', { status: 403 }),
    );

    await expect(loginAdmin('admin', 'pass')).resolves.toEqual({ ok: true, role: '管理员' });
    expect(localStorage.getItem('sl_admin_role')).toBe('管理员');

    await expect(fetchElders()).resolves.toHaveLength(1);
    await expect(fetchElders()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1].credentials).toBe('same-origin');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[2][1].headers['X-Signature']).toBeUndefined();
    expect(fetchMock.mock.calls[2][1].headers['X-Timestamp']).toBeUndefined();
    expect(fetchMock.mock.calls[2][1].headers['X-Nonce']).toBeUndefined();

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
    const notices: string[] = [];
    const handleNotice = (event: Event) => notices.push((event as CustomEvent<string>).detail);
    window.addEventListener('sl-admin-notice', handleNotice);
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
      '/silverlink-api/api/admin/elders',
      '/silverlink-api/api/admin/elders/elder-1',
      '/silverlink-api/api/admin/elders/elder-1/status',
      '/silverlink-api/api/admin/volunteers',
      '/silverlink-api/api/admin/volunteers/vol-1',
      '/silverlink-api/api/admin/volunteers/vol-1/scope',
      '/silverlink-api/api/admin/volunteers/vol-1',
      '/silverlink-api/api/admin/qrcodes',
      '/silverlink-api/api/admin/qrcodes/qr-1/disable',
      '/silverlink-api/api/admin/qrcodes/qr-1/regenerate',
      '/silverlink-api/api/admin/qrcodes/qr-1/relay-device',
    ]);
    expect(notices).toEqual([
      '老人档案新增成功',
      '老人档案删除成功',
      '老人档案状态更新成功',
      '志愿者账号新增成功',
      '志愿者信息修改成功',
      '志愿者服务范围保存成功',
      '志愿者账号删除成功',
      '二维码生成成功',
      '二维码停用成功',
      '二维码重新生成成功',
      '短信接收设备绑定成功',
    ]);
    window.removeEventListener('sl-admin-notice', handleNotice);
  });

  it('does not show a success notice when a mutation fails', async () => {
    const notice = vi.fn();
    window.addEventListener('sl-admin-notice', notice);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('保存失败', { status: 500 })));

    await expect(createVolunteer({ account: 'vol' })).rejects.toThrow('保存失败');
    expect(notice).not.toHaveBeenCalled();
    window.removeEventListener('sl-admin-notice', notice);
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

  it('formats qr status with DISABLED and ENABLED variants', async () => {
    queueFetch([
      { id: 'qr-1', status: 'DISABLED' },
      { id: 'qr-2', status: 'ENABLED' },
    ]);
    const qrCodes = await fetchQrCodes();
    expect(qrCodes).toEqual([
      expect.objectContaining({ id: 'qr-1', status: '已停用' }),
      expect.objectContaining({ id: 'qr-2', status: '启用' }),
    ]);
  });

  it('formats relay status with EXPIRED and unknown values', async () => {
    invalidateAdminCache();
    queueFetch([
      { deviceId: 'd1', status: 'EXPIRED', lastHeartbeat: 0 },
      { deviceId: 'd2', status: 'SOMETHING', lastHeartbeat: 'not-a-date' },
    ]);
    const devices = await fetchSmsRelayDevices();
    expect(devices).toEqual([
      expect.objectContaining({ status: '已过期', lastHeartbeat: '-' }),
      expect.objectContaining({ status: 'SOMETHING', lastHeartbeat: 'not-a-date' }),
    ]);
  });

  it('formats datetime with numeric timestamp and invalid date', async () => {
    invalidateAdminCache();
    const ts = 1770000000000;
    queueFetch([
      { id: 'r1', status: 'UPLOADED', receivedAt: ts, uploadedAt: '' },
    ]);
    const records = await fetchSmsRelayRecords();
    expect(records[0].receivedAt).toBe(new Date(ts).toLocaleString('zh-CN', { hour12: false }));
    expect(records[0].uploadedAt).toBe('-');
  });

  it('normalizes error messages from various response formats', async () => {
    invalidateAdminCache();
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response('{"message":"自定义错误消息"}', { status: 400, headers: { 'Content-Type': 'application/json' } }));
    fetchMock.mockResolvedValueOnce(new Response('{"error":"error字段消息"}', { status: 400, headers: { 'Content-Type': 'application/json' } }));
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 400, headers: { 'Content-Type': 'application/json' } }));
    fetchMock.mockResolvedValueOnce(new Response('纯文本错误', { status: 400, headers: { 'Content-Type': 'text/plain' } }));
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, headers: { 'Content-Type': 'text/plain' } }));
    fetchMock.mockResolvedValueOnce(new Response('{invalid json', { status: 400, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchElders()).rejects.toThrow('自定义错误消息');
    await expect(fetchElders()).rejects.toThrow('error字段消息');
    await expect(fetchElders()).rejects.toThrow('请求失败');
    await expect(fetchElders()).rejects.toThrow('纯文本错误');
    await expect(fetchElders()).rejects.toThrow('请求失败');
    await expect(fetchElders()).rejects.toThrow('请求失败');
  });

  it('handles envelope with error code >= 400', async () => {
    invalidateAdminCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 500, message: '服务器内部错误', data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(fetchElders()).rejects.toThrow('服务器内部错误');
  });

  it('handles non-envelope response', async () => {
    invalidateAdminCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'elder-1', name: '老人' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const elders = await fetchElders();
    expect(elders).toEqual([expect.objectContaining({ id: 'elder-1' })]);
  });

  it('rethrows non-Unauthorized login errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('Network Error', { status: 500 }),
    ));

    await expect(loginAdmin('admin', 'pass')).rejects.toThrow('Network Error');
  });

  it('converts Unauthorized login error to Chinese message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 401, message: 'Unauthorized', data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(loginAdmin('admin', 'wrong')).rejects.toThrow('账号或密码错误');
  });

  it('returns default role when login response has empty role', async () => {
    queueFetch({ role: '' }, { role: '' });

    const result = await loginAdmin('admin', 'pass');
    expect(result).toEqual({ ok: true, role: '系统管理员' });
  });

  it('does not require token fields in cookie-based login responses', async () => {
    queueFetch({ role: '登录响应角色' }, { role: '管理员' });

    const result = await loginAdmin('admin', 'pass');
    expect(result).toEqual({ ok: true, role: '管理员' });
  });

  it('deduplicates concurrent GET requests', async () => {
    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
    const fetchMock = vi.fn();
    fetchMock.mockReturnValueOnce(firstPromise);
    fetchMock.mockResolvedValueOnce(response([{ id: 'e1' }]));
    vi.stubGlobal('fetch', fetchMock);

    const p1 = fetchElders();
    const p2 = fetchElders();

    resolveFirst!(response([{ id: 'e1' }]));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual([expect.objectContaining({ id: 'e1' })]);
    expect(r2).toEqual([expect.objectContaining({ id: 'e1' })]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bypasses expired cache entries', async () => {
    const fetchMock = queueFetch(
      [{ id: 'elder-1', name: '老人', status: 'ACTIVE' }],
      [{ id: 'elder-2', name: '新人', status: 'ACTIVE' }],
    );

    await fetchElders();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cacheKey = [...(fetchElders as unknown as { _cache?: Map<string, { expiresAt: number }> })._cache?.keys?.() ?? []];

    invalidateAdminCache();
    const second = await fetchElders();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second).toEqual([expect.objectContaining({ id: 'elder-2' })]);
  });

  it('sends requests without legacy token or signature headers', async () => {
    const fetchMock = queueFetch([{ id: 'e1', name: '老人', status: 'ACTIVE' }]);

    await fetchElders();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers['X-Signature']).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers['X-Timestamp']).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers['X-Nonce']).toBeUndefined();
  });

  it('handles response.text() rejection gracefully', async () => {
    invalidateAdminCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockRejectedValue(new Error('body read error')),
      json: vi.fn(),
    }));

    await expect(fetchElders()).rejects.toThrow('请求失败');
  });

  it('formats invitation with empty expiresAt as 未使用', async () => {
    queueFetch([
      { id: 'inv-1', status: 'ACTIVE', expiresAt: '', usedCount: 0, maxUses: 1 },
    ]);
    const invitations = await fetchInvitations();
    expect(invitations[0].status).toBe('未使用');
  });

  it('formats invitation with negative maxUses as 未使用 even when usedCount > 0', async () => {
    queueFetch([
      { id: 'inv-1', status: 'ACTIVE', expiresAt: '2099-12-31', usedCount: 5, maxUses: -1 },
    ]);
    const invitations = await fetchInvitations();
    expect(invitations[0].status).toBe('未使用');
  });

  it('formats invitation with invalid expiresAt date as 未使用', async () => {
    queueFetch([
      { id: 'inv-1', status: 'ACTIVE', expiresAt: 'not-a-date', usedCount: 0, maxUses: 1 },
    ]);
    const invitations = await fetchInvitations();
    expect(invitations[0].status).toBe('未使用');
  });

  it('formats qr status with ACTIVE and unknown fallback', async () => {
    queueFetch([
      { id: 'qr-1', status: 'ACTIVE' },
      { id: 'qr-2', status: 'UNKNOWN_STATUS' },
    ]);
    const qrCodes = await fetchQrCodes();
    expect(qrCodes).toEqual([
      expect.objectContaining({ id: 'qr-1', status: '启用' }),
      expect.objectContaining({ id: 'qr-2', status: '启用' }),
    ]);
  });

  it('formats relay status with empty value as 未知', async () => {
    invalidateAdminCache();
    queueFetch([
      { deviceId: 'd1', status: '', lastHeartbeat: '' },
    ]);
    const devices = await fetchSmsRelayDevices();
    expect(devices[0].status).toBe('未知');
  });

  it('formats datetime with numeric zero and valid date string', async () => {
    invalidateAdminCache();
    queueFetch([
      { id: 'r1', status: 'UPLOADED', receivedAt: 0, uploadedAt: '2026-05-25T10:30:00Z' },
    ]);
    const records = await fetchSmsRelayRecords();
    expect(records[0].receivedAt).toBe('-');
    expect(records[0].uploadedAt).toBe(new Date('2026-05-25T10:30:00Z').toLocaleString('zh-CN', { hour12: false }));
  });

  it('skips elders without id in fetchAllScales', async () => {
    queueFetch(
      [{ id: 'scale-1', date: '2026-05-25' }],
    );
    const allScales = await fetchAllScales([
      { id: '', archiveNo: 'A', name: '无ID老人' },
      { id: 'elder-1', archiveNo: 'B', name: '有ID老人' },
    ]);
    expect(allScales).toEqual([expect.objectContaining({ elderId: 'elder-1' })]);
  });

  it('fetches all scales without eldersInput by calling fetchElders', async () => {
    queueFetch(
      [{ id: 'elder-1', name: '老人', status: 'ACTIVE', archiveNo: 'A001' }],
      [{ id: 'scale-1', date: '2026-05-25' }],
    );
    const allScales = await fetchAllScales();
    expect(allScales).toEqual([expect.objectContaining({ elderId: 'elder-1' })]);
  });

  it('maps volunteers with assignedElderIds and assignedElders arrays', async () => {
    invalidateAdminCache();
    queueFetch([
      {
        id: 'vol-1',
        assignedElderIds: ['e1', 'e2'],
        assignedElders: [
          { id: 'e3', archiveNo: 'A003', name: '老人C', age: 75, status: 'ACTIVE' },
          { elderId: '', archiveNo: '', name: '', age: 0, status: '' },
        ],
        status: 'ACTIVE',
      },
    ]);
    const volunteers = await fetchVolunteers();
    expect(volunteers[0].elderCount).toBe(2);
    expect(volunteers[0].assignedElderIds).toEqual(['e1', 'e2']);
    expect(volunteers[0].assignedElders).toEqual([
      expect.objectContaining({ id: 'e3', name: '老人C' }),
    ]);
  });

  it('handles 401 response by clearing session and throwing', async () => {
    const cleared = vi.fn();
    window.addEventListener('sl-admin-session-cleared', cleared);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })));

    await expect(fetchElders()).rejects.toThrow('登录态已失效');
    expect(cleared).toHaveBeenCalled();
    window.removeEventListener('sl-admin-session-cleared', cleared);
  });

  it('handles envelope with code >= 400 and no message', async () => {
    invalidateAdminCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 403, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(fetchElders()).rejects.toThrow('API 403');
  });
});
