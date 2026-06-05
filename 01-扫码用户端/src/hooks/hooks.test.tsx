import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clearResolvedScanContextMock = vi.fn();
const fetchBasicInfoMock = vi.fn();
const fetchVerifiedBasicInfoMock = vi.fn();
const fetchHealthRecordMock = vi.fn();
const fetchMedicationsMock = vi.fn();
const fetchScaleSummariesMock = vi.fn();

vi.mock('../api/scanApi', () => ({
  clearResolvedScanContext: (...args: unknown[]) => clearResolvedScanContextMock(...args),
  fetchBasicInfo: (...args: unknown[]) => fetchBasicInfoMock(...args),
  fetchVerifiedBasicInfo: (...args: unknown[]) => fetchVerifiedBasicInfoMock(...args),
  fetchHealthRecord: (...args: unknown[]) => fetchHealthRecordMock(...args),
  fetchMedications: (...args: unknown[]) => fetchMedicationsMock(...args),
  fetchScaleSummaries: (...args: unknown[]) => fetchScaleSummariesMock(...args),
}));

import { useProtectedArchive } from './useProtectedArchive';
import { useQrToken } from './useQrToken';
import { useScanBasicInfo } from './useScanBasicInfo';

describe('scan hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearResolvedScanContextMock.mockClear();
    fetchBasicInfoMock.mockReset();
    fetchVerifiedBasicInfoMock.mockReset();
    fetchHealthRecordMock.mockReset();
    fetchMedicationsMock.mockReset();
    fetchScaleSummariesMock.mockReset();
    window.history.replaceState({}, '', '/silverlink/scan/?token=qr-token-123456');
  });

  it('tracks qr token validity and reacts to history changes', () => {
    const { result } = renderHook(() => useQrToken());

    expect(result.current.token).toBe('qr-token-123456');
    expect(result.current.isValid).toBe(true);

    act(() => {
      window.history.pushState({}, '', '/silverlink/scan/?token=bad');
    });

    expect(result.current.href).toContain('token=bad');
    expect(result.current.token).toBe('bad');
    expect(result.current.isValid).toBe(false);
  });

  it('tracks replaceState, qr query fallback and missing token state', () => {
    const { result } = renderHook(() => useQrToken());

    act(() => {
      window.history.replaceState({}, '', '/silverlink/scan/?qr=qr-query-1234');
    });
    expect(result.current.href).toContain('qr=qr-query-1234');
    expect(result.current.token).toBe('qr-query-1234');
    expect(result.current.isValid).toBe(true);

    act(() => {
      window.history.replaceState({}, '', '/silverlink/scan/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.href).toContain('/silverlink/scan/');
    expect(result.current.token).toBeNull();
    expect(result.current.isValid).toBe(false);
  });

  it('loads basic info for a token and clears context when token is missing', async () => {
    fetchBasicInfoMock.mockResolvedValue({ id: 'elder-1', name: '老人' });
    const { result, rerender } = renderHook(({ token }) => useScanBasicInfo(token), {
      initialProps: { token: 'qr-token-123456' as string | null },
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: 'elder-1', name: '老人' });
    expect(result.current.error).toBeNull();

    rerender({ token: null });
    expect(clearResolvedScanContextMock).toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('二维码参数缺失');
  });

  it('normalizes basic info load failures', async () => {
    fetchBasicInfoMock.mockRejectedValue(new Error('expired'));
    const { result } = renderHook(() => useScanBasicInfo('qr-token-123456'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('二维码无效或已过期');
  });

  it('clears protected archive when not verified', () => {
    const { result } = renderHook(() => useProtectedArchive(false, '', undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.verifiedBasicInfo).toBeNull();
    expect(result.current.healthRecord).toBeNull();
  });

  it('loads protected archive only when returned elder id matches requested elder', async () => {
    fetchVerifiedBasicInfoMock.mockResolvedValue({ id: 'elder-1', name: '老人' });
    fetchHealthRecordMock.mockResolvedValue({ bmi: 22 });
    fetchMedicationsMock.mockResolvedValue([{ name: '药品' }]);
    fetchScaleSummariesMock.mockResolvedValue([{ name: 'ADL', score: 10 }]);

    const { result } = renderHook(() => useProtectedArchive(true, 'session-1', 'elder-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.verifiedBasicInfo).toEqual({ id: 'elder-1', name: '老人' });
    expect(result.current.healthRecord).toEqual({ bmi: 22 });
    expect(result.current.medications).toEqual([{ name: '药品' }]);
    expect(result.current.scaleSummaries).toEqual([{ name: 'ADL', score: 10 }]);
  });

  it('drops protected archive if backend returns another elder', async () => {
    fetchVerifiedBasicInfoMock.mockResolvedValue({ id: 'elder-other', name: '串档老人' });
    fetchHealthRecordMock.mockResolvedValue({ bmi: 22 });
    fetchMedicationsMock.mockResolvedValue([]);
    fetchScaleSummariesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useProtectedArchive(true, 'session-1', 'elder-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.verifiedBasicInfo).toBeNull();
    expect(result.current.healthRecord).toBeNull();
  });

  it('clears protected archive when remote fetch fails', async () => {
    fetchVerifiedBasicInfoMock.mockRejectedValue(new Error('boom'));
    fetchHealthRecordMock.mockResolvedValue({ bmi: 22 });
    fetchMedicationsMock.mockResolvedValue([{ name: '药品' }]);
    fetchScaleSummariesMock.mockResolvedValue([{ name: 'ADL', score: 10 }]);

    const { result } = renderHook(() => useProtectedArchive(true, 'session-1', 'elder-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.verifiedBasicInfo).toBeNull();
    expect(result.current.healthRecord).toBeNull();
    expect(result.current.medications).toBeNull();
    expect(result.current.scaleSummaries).toBeNull();
  });
});
