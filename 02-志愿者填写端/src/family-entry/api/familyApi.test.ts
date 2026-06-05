import { beforeEach, describe, expect, it, vi } from 'vitest';
import { familyLogin, familyLogout, getFamilyProfile, isFamilyLoggedIn } from './familyAuthApi';
import { getBoundElders, getElderDetail, getElderQrCode, requestDisableElderQrCode, updateElderContacts } from './familyElderApi';
import { addMedication, deleteMedication, getMedications, updateMedication } from './medicationApi';
import { previewInvitation, registerWithInvitation, sendInvitationSms } from './invitationApi';
import { sendSmsCode, verifySmsCode } from './smsApi';
import { clearToken, del, get, post, put, setToken } from './httpClient';

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

describe('family entry api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearToken();
  });

  it('covers family token helpers and low-level verbs', async () => {
    const fetchMock = queueFetch({ ok: 1 }, { ok: 2 }, { ok: 3 }, { ok: 4 });
    setToken('family-token');

    await expect(get('/api/a')).resolves.toEqual({ ok: 1 });
    await expect(post('/api/b', { b: 1 })).resolves.toEqual({ ok: 2 });
    await expect(put('/api/c', { c: 1 })).resolves.toEqual({ ok: 3 });
    await expect(del('/api/d')).resolves.toEqual({ ok: 4 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer family-token');

    clearToken();
    expect(localStorage.getItem('family_token')).toBeNull();
  });

  it('clears family token on 401 and merges custom headers', async () => {
    setToken('expired-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 })),
    );

    await expect(get('/api/protected', { headers: { 'X-Debug': '1' } })).rejects.toThrow('unauthorized');

    expect(fetch).toHaveBeenCalledWith(
      '/api/protected',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer expired-token',
          'X-Debug': '1',
        }),
      }),
    );
    expect(localStorage.getItem('family_token')).toBeNull();
  });

  it('normalizes family login success, missing token, failure and logout state', async () => {
    queueFetch(
      { token: 'token-1' },
      {},
      new Response('账号错误', { status: 401 }),
    );

    await expect(familyLogin({ phone: '13800000000', password: 'pass' })).resolves.toMatchObject({ success: true });
    expect(isFamilyLoggedIn()).toBe(true);
    await expect(familyLogin({ phone: '13800000000', password: 'pass' })).resolves.toMatchObject({ success: false });
    await expect(familyLogin({ phone: '13800000000', password: 'bad' })).resolves.toMatchObject({ success: false, message: '账号错误' });
    await expect(getFamilyProfile()).resolves.toMatchObject({ id: 'current' });
    familyLogout();
    expect(isFamilyLoggedIn()).toBe(false);
  });

  it('covers family elder, medication, invitation and sms wrappers', async () => {
    const fetchMock = queueFetch(
      [{ id: 'elder-1' }],
      { id: 'elder-1' },
      { id: 'elder-1' },
      { id: 'qr-1' },
      { id: 'qr-2' },
      [{ id: 'med-1' }],
      { id: 'med-2' },
      { id: 'med-3' },
      {},
      { code: 'INVITE' },
      {},
      { token: 'registered-token' },
      {},
      {},
      new Response('验证码错误', { status: 400 }),
    );

    await expect(getBoundElders()).resolves.toEqual([{ id: 'elder-1' }]);
    await expect(getElderDetail('elder 1')).resolves.toEqual({ id: 'elder-1' });
    await expect(updateElderContacts('elder 1', {
      emergencyContactName: '家属',
      emergencyContactPhone: '13800000000',
      emergencyContactRelation: '女儿',
      backupContactName: '',
      backupContactPhone: '',
      backupContactRelation: '',
    })).resolves.toEqual({ success: true, message: '联系人信息已更新' });
    await expect(getElderQrCode('elder 1')).resolves.toEqual({ id: 'qr-1' });
    await expect(requestDisableElderQrCode('elder 1')).resolves.toEqual({ id: 'qr-2' });
    await expect(getMedications('elder 1')).resolves.toEqual([{ id: 'med-1' }]);
    await expect(addMedication('elder 1', { name: '药品', dosage: '1片', usage: '口服', timing: '早' })).resolves.toEqual({ id: 'med-2' });
    await expect(updateMedication('elder 1', 'med 1', { name: '药品', dosage: '2片', usage: '口服', timing: '晚' })).resolves.toEqual({ id: 'med-3' });
    await expect(deleteMedication('elder 1', 'med 1')).resolves.toEqual({ success: true });
    await expect(previewInvitation('code 1')).resolves.toEqual({ code: 'INVITE' });
    await expect(sendInvitationSms('code 1', '13800000000')).resolves.toEqual({ success: true, message: '验证码已发送' });
    await expect(registerWithInvitation({
      code: 'code 1',
      name: '家属',
      phone: '13800000000',
      relationship: '女儿',
      password: 'pass',
      smsCode: '123456',
    })).resolves.toEqual({ success: true, message: '注册成功' });
    await expect(sendSmsCode('13800000000')).resolves.toEqual({ success: true, message: '验证码已发送' });
    await expect(verifySmsCode('13800000000', '123456')).resolves.toEqual({ success: true, message: '验证成功' });
    await expect(verifySmsCode('13800000000', '000000')).resolves.toEqual({ success: false, message: '验证码错误' });

    expect(fetchMock.mock.calls.map((call) => call[0])).toContain('/api/family/elders/elder%201/medications/med%201');
  });

  it('covers invitation sms failure and register without token', async () => {
    queueFetch(
      new Response('发送失败', { status: 500 }),
      { success: true, message: '已注册' },
    );

    await expect(sendInvitationSms('code 1', '13800000000')).resolves.toMatchObject({
      success: false,
      message: '发送失败',
    });

    await expect(registerWithInvitation({
      code: 'code 1',
      name: '家属',
      phone: '13800000000',
      relationship: '女儿',
      password: 'pass',
      smsCode: '123456',
    })).resolves.toMatchObject({ success: true });
  });

  it('covers register failure and sms code failure', async () => {
    queueFetch(
      new Response('注册失败', { status: 400 }),
      new Response('发送失败', { status: 500 }),
    );

    await expect(registerWithInvitation({
      code: 'bad',
      name: '家属',
      phone: '13800000000',
      relationship: '女儿',
      password: 'pass',
      smsCode: '000000',
    })).resolves.toMatchObject({ success: false, message: '注册失败' });

    await expect(sendSmsCode('13800000000')).resolves.toMatchObject({
      success: false,
      message: '发送失败',
    });
  });
});
