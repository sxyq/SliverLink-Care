import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearResolvedScanContext,
  fetchBasicInfo,
  fetchHealthRecord,
  fetchMedications,
  fetchScaleSummaries,
  fetchVerifiedBasicInfo,
  getResolvedElderId,
  getResolvedEmergencyPhone,
  getResolvedEmergencyPhoneMasked,
} from './scanApi';

function mockFetchData(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 200, data })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const resolvedDto = {
  elderId: 'elder-001',
  archiveNo: 'A001',
  name: '王测试',
  gender: '女',
  age: 82,
  residence: '滨江社区',
  emergencyContactName: '家属',
  emergencyPhoneMasked: '138****0000',
  emergencyPhoneDial: '13800000000',
  relationship: '女儿',
  aboType: 'O',
  rhType: '阳性',
  allergySummary: '无',
};

describe('scanApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/silverlink/scan/?token=qr-token-123456');
  });

  it('resolves basic info and stores token-bound context', async () => {
    const fetchMock = mockFetchData(resolvedDto);

    const result = await fetchBasicInfo('qr-token-123456');

    expect(result).toMatchObject({ id: 'elder-001', age: 82, emergencyPhoneDial: '13800000000' });
    expect(getResolvedElderId()).toBe('elder-001');
    expect(getResolvedEmergencyPhone()).toBe('13800000000');
    expect(getResolvedEmergencyPhoneMasked()).toBe('138****0000');
    expect(fetchMock).toHaveBeenCalledWith('/api/scan/resolve', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'qr-token-123456' }),
    }));
  });

  it('clears resolved scan context and rejects stale qr tokens', async () => {
    mockFetchData(resolvedDto);
    await fetchBasicInfo('qr-token-123456');
    window.history.pushState({}, '', '/silverlink/scan/?token=another-token-123456');

    expect(getResolvedElderId()).toBe('');
    expect(getResolvedEmergencyPhone()).toBe('');
    expect(getResolvedEmergencyPhoneMasked()).toBe('');

    window.history.pushState({}, '', '/silverlink/scan/?token=qr-token-123456');
    clearResolvedScanContext();
    expect(getResolvedElderId()).toBe('');
  });

  it('fetches verified basic info using explicit elder id', async () => {
    const fetchMock = mockFetchData({ ...resolvedDto, age: 79, residence: undefined });

    const result = await fetchVerifiedBasicInfo('session-1', 'elder-002');

    expect(result.age).toBe(79);
    expect(result.residence).toBe('');
    expect(fetchMock.mock.calls[0][0]).toContain('/api/scan/basic-info?elderId=elder-002&sessionId=session-1');
  });

  it('maps health archive default values defensively', async () => {
    mockFetchData({ heightCm: 170, weightKg: 62, volunteer: '志愿者' });

    await expect(fetchHealthRecord('session-1', 'elder-001')).resolves.toMatchObject({
      volunteer: '志愿者',
      heightCm: 170,
      waistCm: 0,
      emotionScreening: '',
    });
  });

  it('fetches medications without remapping backend rows', async () => {
    mockFetchData([{ drugName: '药品A' }]);

    await expect(fetchMedications('session-1', 'elder-001')).resolves.toEqual([{ drugName: '药品A' }]);
  });

  it('maps scale summaries and coerces answer values', async () => {
    mockFetchData([
      {
        scale: 'ADL',
        score: '12',
        date: '2026-05-25',
        answers: [
          { question: 'Q1', value: '3' },
          { question: 'Q2', value: null },
        ],
      },
    ]);

    await expect(fetchScaleSummaries('session-1', 'elder-001')).resolves.toEqual([
      {
        name: 'ADL',
        score: 12,
        updatedAt: '2026-05-25',
        volunteer: '',
        answers: [
          { question: 'Q1', value: 3 },
          { question: 'Q2', value: null },
        ],
      },
    ]);
  });

  it('fetches verified basic info falling back to resolved elder id', async () => {
    mockFetchData(resolvedDto);
    window.sessionStorage.setItem('silverlink.scan.qrToken', 'qr-token-123456');
    window.sessionStorage.setItem('silverlink.scan.elderId', 'elder-001');

    const result = await fetchVerifiedBasicInfo('session-1');
    expect(result.id).toBe('elder-001');
  });

  it('fetches health record falling back to resolved elder id', async () => {
    mockFetchData({ heightCm: 165, weightKg: 60 });
    window.sessionStorage.setItem('silverlink.scan.qrToken', 'qr-token-123456');
    window.sessionStorage.setItem('silverlink.scan.elderId', 'elder-001');

    const result = await fetchHealthRecord('session-1');
    expect(result.heightCm).toBe(165);
  });

  it('fetches medications falling back to resolved elder id', async () => {
    mockFetchData([{ name: '药品B' }]);
    window.sessionStorage.setItem('silverlink.scan.qrToken', 'qr-token-123456');
    window.sessionStorage.setItem('silverlink.scan.elderId', 'elder-001');

    const result = await fetchMedications('session-1');
    expect(result).toEqual([{ name: '药品B' }]);
  });

  it('fetches scale summaries falling back to resolved elder id', async () => {
    mockFetchData([{ name: 'PHQ-9', score: 5, updatedAt: '2026-05-25' }]);
    window.sessionStorage.setItem('silverlink.scan.qrToken', 'qr-token-123456');
    window.sessionStorage.setItem('silverlink.scan.elderId', 'elder-001');

    const result = await fetchScaleSummaries('session-1');
    expect(result).toEqual([{ name: 'PHQ-9', score: 5, updatedAt: '2026-05-25', volunteer: '', answers: [] }]);
  });

  it('handles fetchBasicInfo without emergency phone fields', async () => {
    const dtoWithoutPhone = { ...resolvedDto, emergencyPhoneDial: undefined, emergencyPhoneMasked: undefined };
    mockFetchData(dtoWithoutPhone);

    const result = await fetchBasicInfo('qr-token-123456');
    expect(result.emergencyPhoneDial).toBe('');
    expect(result.emergencyPhoneMasked).toBeUndefined();
  });

  it('maps scale summaries with name fallback to scale field', async () => {
    mockFetchData([{ scale: 'GAD-7', score: 3, date: '2026-05-25' }]);

    const result = await fetchScaleSummaries('session-1', 'elder-001');
    expect(result[0].name).toBe('GAD-7');
  });

  it('maps scale summaries with default name when both name and scale are missing', async () => {
    mockFetchData([{ score: 3, date: '2026-05-25' }]);

    const result = await fetchScaleSummaries('session-1', 'elder-001');
    expect(result[0].name).toBe('PHQ-9');
  });

  it('returns empty elder id when no qr token in url', () => {
    window.history.pushState({}, '', '/silverlink/scan/');
    window.sessionStorage.setItem('silverlink.scan.qrToken', 'qr-token-123456');
    window.sessionStorage.setItem('silverlink.scan.elderId', 'elder-001');

    expect(getResolvedElderId()).toBe('');
    expect(getResolvedEmergencyPhone()).toBe('');
    expect(getResolvedEmergencyPhoneMasked()).toBe('');
  });

  it('returns empty when resolved token does not match current token', () => {
    window.sessionStorage.setItem('silverlink.scan.qrToken', 'old-token');
    window.sessionStorage.setItem('silverlink.scan.elderId', 'elder-001');
    window.sessionStorage.setItem('silverlink.scan.emergencyPhone', '13800000000');
    window.sessionStorage.setItem('silverlink.scan.emergencyPhoneMasked', '138****0000');

    expect(getResolvedElderId()).toBe('');
    expect(getResolvedEmergencyPhone()).toBe('');
    expect(getResolvedEmergencyPhoneMasked()).toBe('');
  });

  it('returns resolved values when tokens match', () => {
    window.sessionStorage.setItem('silverlink.scan.qrToken', 'qr-token-123456');
    window.sessionStorage.setItem('silverlink.scan.elderId', 'elder-001');
    window.sessionStorage.setItem('silverlink.scan.emergencyPhone', '13800000000');
    window.sessionStorage.setItem('silverlink.scan.emergencyPhoneMasked', '138****0000');

    expect(getResolvedElderId()).toBe('elder-001');
    expect(getResolvedEmergencyPhone()).toBe('13800000000');
    expect(getResolvedEmergencyPhoneMasked()).toBe('138****0000');
  });

  it('clearResolvedScanContext removes all stored keys', async () => {
    mockFetchData(resolvedDto);
    await fetchBasicInfo('qr-token-123456');

    expect(getResolvedElderId()).toBe('elder-001');
    clearResolvedScanContext();
    expect(window.sessionStorage.getItem('silverlink.scan.qrToken')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.elderId')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.emergencyPhone')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.emergencyPhoneMasked')).toBeNull();
  });

  it('fetchBasicInfo defaults age to 0 when missing', async () => {
    mockFetchData({ ...resolvedDto, age: undefined });

    const result = await fetchBasicInfo('qr-token-123456');
    expect(result.age).toBe(0);
  });

  it('fetchBasicInfo defaults residence to empty string when missing', async () => {
    mockFetchData({ ...resolvedDto, residence: undefined });

    const result = await fetchBasicInfo('qr-token-123456');
    expect(result.residence).toBe('');
  });

  it('fetchVerifiedBasicInfo defaults emergencyPhoneDial to empty string when missing', async () => {
    mockFetchData({ ...resolvedDto, emergencyPhoneDial: undefined });

    const result = await fetchVerifiedBasicInfo('session-1', 'elder-001');
    expect(result.emergencyPhoneDial).toBe('');
  });

  it('fetchVerifiedBasicInfo defaults age to 0 and residence to empty when missing', async () => {
    mockFetchData({ ...resolvedDto, age: undefined, residence: undefined });

    const result = await fetchVerifiedBasicInfo('session-1', 'elder-001');
    expect(result.age).toBe(0);
    expect(result.residence).toBe('');
  });

  it('fetchHealthRecord returns all defaults when dto is empty', async () => {
    mockFetchData({});

    const result = await fetchHealthRecord('session-1', 'elder-001');
    expect(result).toEqual({
      date: '',
      volunteer: '',
      heightCm: 0,
      weightKg: 0,
      waistCm: 0,
      bmi: 0,
      healthSelfAssessment: '',
      selfCareAssessment: '',
      cognitiveScreening: '',
      emotionScreening: '',
    });
  });

  it('fetchScaleSummaries handles answers not being an array', async () => {
    mockFetchData([{ name: 'PHQ-9', score: 5, updatedAt: '2026-05-25', answers: null }]);

    const result = await fetchScaleSummaries('session-1', 'elder-001');
    expect(result[0].answers).toEqual([]);
  });

  it('fetchScaleSummaries falls back updatedAt to date when updatedAt is missing', async () => {
    mockFetchData([{ name: 'PHQ-9', score: 5, date: '2026-05-20' }]);

    const result = await fetchScaleSummaries('session-1', 'elder-001');
    expect(result[0].updatedAt).toBe('2026-05-20');
  });

  it('fetchScaleSummaries handles answer with numeric value directly', async () => {
    mockFetchData([{
      name: 'PHQ-9',
      score: 5,
      updatedAt: '2026-05-25',
      answers: [{ question: 'Q1', value: 2 }],
    }]);

    const result = await fetchScaleSummaries('session-1', 'elder-001');
    expect(result[0].answers).toEqual([{ question: 'Q1', value: 2 }]);
  });

  it('fetchScaleSummaries handles answer with undefined value', async () => {
    mockFetchData([{
      name: 'PHQ-9',
      score: 5,
      updatedAt: '2026-05-25',
      answers: [{ question: 'Q1', value: undefined }],
    }]);

    const result = await fetchScaleSummaries('session-1', 'elder-001');
    expect(result[0].answers).toEqual([{ question: 'Q1', value: null }]);
  });

  it('fetchBasicInfo does not store phone keys when dial and masked are absent', async () => {
    const dto = { ...resolvedDto, emergencyPhoneDial: undefined, emergencyPhoneMasked: undefined };
    mockFetchData(dto);

    await fetchBasicInfo('qr-token-123456');
    expect(window.sessionStorage.getItem('silverlink.scan.emergencyPhone')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.emergencyPhoneMasked')).toBeNull();
  });
});
