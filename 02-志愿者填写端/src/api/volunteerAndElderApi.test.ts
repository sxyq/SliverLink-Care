import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAssignedElder,
  disableVolunteerElderQrCode,
  fetchAssignedElders,
  fetchVolunteerElderQrCode,
  fetchVolunteerProfile,
  loginVolunteer,
  previewVolunteerInvitation,
  regenerateVolunteerElderQrCode,
  registerVolunteer,
  updateVolunteerProfile,
} from './volunteerApi';
import {
  fetchScaleRecords,
  saveBasicInfo,
  saveHealthRecord,
  saveMedications,
  saveScaleRecords,
} from './elderApi';
import { sendSmsVerify, submitScaleRecord, verifySmsCode } from './index';

function response(data: unknown) {
  return new Response(JSON.stringify({ code: 200, data }), { headers: { 'Content-Type': 'application/json' } });
}

function queueFetch(...items: unknown[]) {
  const queue = [...items];
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response(queue.shift())));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('volunteer and elder api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('covers volunteer auth, invitation preview, profile and qrcode endpoints', async () => {
    const fetchMock = queueFetch(
      { token: 'token-1', name: '志愿者' },
      { code: 'INVITE' },
      { token: 'token-2', name: '新志愿者' },
      [{ elderId: 'elder-1', emergencyPhoneDial: '13800000000', relationship: '女儿' }],
      { id: 'elder-new' },
      { account: 'vol', name: '志愿者', phone: '13800000000' },
      { account: 'vol2', name: '志愿者2', phone: '13800000001', token: 'token-3' },
      { id: 'qr-1' },
      { id: 'qr-2' },
      { id: 'qr-3' },
    );

    await expect(loginVolunteer('vol', 'pass')).resolves.toMatchObject({ ok: true, token: 'token-1' });
    await expect(previewVolunteerInvitation('code 1')).resolves.toEqual({ code: 'INVITE' });
    await expect(registerVolunteer({
      invitationCode: 'code',
      account: 'vol',
      password: 'pass',
      name: '志愿者',
      phone: '13800000000',
    })).resolves.toMatchObject({ ok: true, token: 'token-2' });
    await expect(fetchAssignedElders()).resolves.toEqual([
      expect.objectContaining({ id: 'elder-1', status: '在档', emergencyContactRelation: '女儿' }),
    ]);
    await createAssignedElder({
      name: ' 老人 ',
      gender: '女',
      age: '82',
      residence: ' 社区 ',
      emergencyContactName: ' 家属 ',
      emergencyContactPhone: ' 13800000000 ',
      emergencyContactRelation: ' 女儿 ',
      aboType: ' O ',
      rhType: ' 阳性 ',
      allergySummary: ' 无 ',
    });
    await expect(fetchVolunteerProfile()).resolves.toMatchObject({ account: 'vol' });
    await expect(updateVolunteerProfile({
      account: ' vol2 ',
      name: ' 志愿者2 ',
      phone: ' 13800000001 ',
      currentPassword: 'old',
      password: 'new',
    })).resolves.toMatchObject({ token: 'token-3' });
    await fetchVolunteerElderQrCode('elder-1');
    await regenerateVolunteerElderQrCode('elder-1');
    await disableVolunteerElderQrCode('elder-1');

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/silverlink-api/api/volunteer/login',
      '/silverlink-api/api/invitations/code%201/preview',
      '/silverlink-api/api/volunteer/register',
      '/silverlink-api/api/volunteer/me/elders',
      '/silverlink-api/api/volunteer/me/elders',
      '/silverlink-api/api/volunteer/me/profile',
      '/silverlink-api/api/volunteer/me/profile',
      '/silverlink-api/api/volunteer/me/elders/elder-1/qr-manage',
      '/silverlink-api/api/volunteer/me/elders/elder-1/qr-regenerate',
      '/silverlink-api/api/volunteer/me/elders/elder-1/qr-disable',
    ]);
  });

  it('covers elder save endpoints and scale mapping', async () => {
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-05-25T00:00:00.000Z');
    queueFetch(
      { recordId: 'basic' },
      { recordId: 'health' },
      { recordId: 'med' },
      { recordId: 'scale' },
      [{ scale: 'PHQ-9', score: '9', updatedAt: '2026-05-25', answers: [{ question: 'Q1', value: '2' }] }],
      { recordId: 'submit-scale' },
      { maskedPhone: '138****0000' },
      { verified: true },
    );

    await expect(saveBasicInfo('elder-1', {
      name: '老人',
      gender: '女',
      age: '82',
      residence: '社区',
      emergencyContactName: '家属',
      emergencyContactPhone: '13800000000',
      emergencyContactRelation: '女儿',
      aboBloodType: 'O',
      rhBloodType: '阳性',
      allergyHistory: '无',
    })).resolves.toEqual({ recordId: 'basic' });
    await expect(saveHealthRecord('elder-1', {
      heightCm: '170',
      weightKg: '68',
      waistCm: '80',
      healthSelfAssessment: '良好',
      selfCareAssessment: '可自理',
      cognitiveScreening: '正常',
      emotionScreening: '稳定',
    })).resolves.toEqual({ recordId: 'health' });
    await saveMedications('elder-1', [{ id: 'm1', name: '药品', dosage: '1片', usage: '口服', timing: '早' }]);
    await saveScaleRecords('elder-1', {
      type: 'PHQ-9',
      answers: [{ question: 'Q1', value: 2 }, { question: 'Q2', value: null }],
    });
    await expect(fetchScaleRecords('elder-1')).resolves.toEqual([
      expect.objectContaining({ name: 'PHQ-9', score: 9, answers: [{ question: 'Q1', value: 2 }] }),
    ]);
    await expect(submitScaleRecord('elder-1', {
      type: 'ADL',
      answers: [{ question: 'Q1', value: 1 }],
    })).resolves.toEqual({ recordId: 'submit-scale' });
    await expect(sendSmsVerify('13800000000')).resolves.toEqual({ maskedPhone: '138****0000' });
    await expect(verifySmsCode('13800000000', '123456')).resolves.toEqual({ ok: true, message: '验证成功' });
  });

  it('fetchAssignedElders maps elderId fallback and missing fields', async () => {
    queueFetch([{
      elderId: 'e-fallback',
      emergencyPhoneDial: '13800001111',
      emergencyContactRelation: '儿子',
      allergyHistory: '花粉',
    }]);

    const result = await fetchAssignedElders();
    expect(result[0]).toMatchObject({
      id: 'e-fallback',
      emergencyContactPhone: '13800001111',
      emergencyContactRelation: '儿子',
      allergySummary: '花粉',
    });
  });

  it('fetchAssignedElders defaults missing fields to empty/zero', async () => {
    queueFetch([{}]);

    const result = await fetchAssignedElders();
    expect(result[0]).toMatchObject({
      id: '',
      archiveNo: '',
      name: '',
      gender: '',
      age: 0,
      residence: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      aboType: '',
      rhType: '',
      allergySummary: '',
      lastVisitDate: '',
      status: '在档',
    });
  });

  it('loginVolunteer returns ok false when token is empty', async () => {
    queueFetch({ token: '', name: undefined });

    const result = await loginVolunteer('vol', 'pass');
    expect(result.ok).toBe(false);
    expect(result.token).toBe('');
  });

  it('registerVolunteer returns ok false when token is empty', async () => {
    queueFetch({ token: '', name: undefined });

    const result = await registerVolunteer({
      invitationCode: 'code',
      account: 'vol',
      password: 'pass',
      name: '志愿者',
      phone: '13800000000',
    });
    expect(result.ok).toBe(false);
  });
});
