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
});
