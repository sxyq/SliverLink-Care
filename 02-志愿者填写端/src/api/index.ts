import { http } from './httpClient';
export { loginVolunteer, fetchAssignedElders } from './volunteerApi';
export { saveBasicInfo, saveHealthRecord, saveMedications, saveScaleRecords } from './elderApi';
export { saveBasicInfo as updateBasicInfo } from './elderApi';

export async function sendSmsVerify(phone: string) {
  return http<{ phone?: string; maskedPhone?: string }>('/api/sms/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifySmsCode(phone: string, code: string) {
  const res = await http<{ verified?: boolean; ok?: boolean }>('/api/sms/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  return { ok: Boolean(res.verified ?? res.ok), message: '验证成功' };
}

export async function submitScaleRecord(elderId: string, scale: import('../types').ScaleForm) {
  const { saveScaleRecords } = await import('./elderApi');
  return saveScaleRecords(elderId, scale);
}
