import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/env', () => ({
  ALLOW_LOCAL_VERIFICATION_FALLBACK: true,
}));

const getDesignPreviewBasicInfoMock = vi.fn();
const getDesignPreviewArchiveMock = vi.fn();

vi.mock('../dev/designPreview', () => ({
  isDesignPreviewEnabled: vi.fn(),
  getDesignPreviewBasicInfo: (...args: unknown[]) => getDesignPreviewBasicInfoMock(...args),
  getDesignPreviewArchive: (...args: unknown[]) => getDesignPreviewArchiveMock(...args),
}));

const fetchVerifiedBasicInfoMock = vi.fn();
const fetchHealthRecordMock = vi.fn();
const fetchMedicationsMock = vi.fn();
const fetchScaleSummariesMock = vi.fn();

vi.mock('../api/scanApi', () => ({
  clearResolvedScanContext: vi.fn(),
  fetchBasicInfo: vi.fn(),
  fetchVerifiedBasicInfo: (...args: unknown[]) => fetchVerifiedBasicInfoMock(...args),
  fetchHealthRecord: (...args: unknown[]) => fetchHealthRecordMock(...args),
  fetchMedications: (...args: unknown[]) => fetchMedicationsMock(...args),
  fetchScaleSummaries: (...args: unknown[]) => fetchScaleSummariesMock(...args),
}));

import { useProtectedArchive } from './useProtectedArchive';

describe('useProtectedArchive – local verification fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getDesignPreviewBasicInfoMock.mockReset();
    getDesignPreviewArchiveMock.mockReset();
    fetchVerifiedBasicInfoMock.mockReset();
    fetchHealthRecordMock.mockReset();
    fetchMedicationsMock.mockReset();
    fetchScaleSummariesMock.mockReset();
  });

  it('loads preview data when sessionId starts with local-relay-', async () => {
    const previewBasicInfo = { id: 'elder-preview-001', name: '王桂兰' };
    const previewArchive = {
      healthRecord: { bmi: 21.5 },
      medications: [{ name: '苯磺酸氨氯地平片' }],
      scaleSummaries: [{ name: 'PHQ-9', score: 4 }],
    };

    getDesignPreviewBasicInfoMock.mockReturnValue(previewBasicInfo);
    getDesignPreviewArchiveMock.mockReturnValue(previewArchive);

    const { result } = renderHook(() =>
      useProtectedArchive(true, 'local-relay-session-1', 'elder-preview-001'),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getDesignPreviewBasicInfoMock).toHaveBeenCalled();
    expect(getDesignPreviewArchiveMock).toHaveBeenCalled();
    expect(result.current.verifiedBasicInfo).toEqual(previewBasicInfo);
    expect(result.current.healthRecord).toEqual(previewArchive.healthRecord);
    expect(result.current.medications).toEqual(previewArchive.medications);
    expect(result.current.scaleSummaries).toEqual(previewArchive.scaleSummaries);
    expect(result.current.loading).toBe(false);

    expect(fetchVerifiedBasicInfoMock).not.toHaveBeenCalled();
    expect(fetchHealthRecordMock).not.toHaveBeenCalled();
    expect(fetchMedicationsMock).not.toHaveBeenCalled();
    expect(fetchScaleSummariesMock).not.toHaveBeenCalled();
  });

  it('loads preview data when sessionId starts with local-identity-', async () => {
    const previewBasicInfo = { id: 'elder-preview-001', name: '王桂兰' };
    const previewArchive = {
      healthRecord: { bmi: 21.5 },
      medications: [],
      scaleSummaries: [],
    };

    getDesignPreviewBasicInfoMock.mockReturnValue(previewBasicInfo);
    getDesignPreviewArchiveMock.mockReturnValue(previewArchive);

    const { result } = renderHook(() =>
      useProtectedArchive(true, 'local-identity-session-2', 'elder-preview-001'),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getDesignPreviewBasicInfoMock).toHaveBeenCalled();
    expect(getDesignPreviewArchiveMock).toHaveBeenCalled();
    expect(result.current.verifiedBasicInfo).toEqual(previewBasicInfo);
    expect(result.current.healthRecord).toEqual(previewArchive.healthRecord);
    expect(result.current.medications).toEqual(previewArchive.medications);
    expect(result.current.scaleSummaries).toEqual(previewArchive.scaleSummaries);
    expect(result.current.loading).toBe(false);

    expect(fetchVerifiedBasicInfoMock).not.toHaveBeenCalled();
  });

  it('does not use preview fallback for regular sessionId', async () => {
    fetchVerifiedBasicInfoMock.mockResolvedValue({ id: 'elder-1', name: '老人' });
    fetchHealthRecordMock.mockResolvedValue({ bmi: 22 });
    fetchMedicationsMock.mockResolvedValue([]);
    fetchScaleSummariesMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useProtectedArchive(true, 'regular-session-1', 'elder-1'),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getDesignPreviewBasicInfoMock).not.toHaveBeenCalled();
    expect(getDesignPreviewArchiveMock).not.toHaveBeenCalled();
    expect(fetchVerifiedBasicInfoMock).toHaveBeenCalledWith('regular-session-1', 'elder-1');
  });

  it('ignores resolved data when the request is cancelled before Promise.all succeeds', async () => {
    let resolveBasic: ((value: { id: string; name: string }) => void) | undefined;
    fetchVerifiedBasicInfoMock.mockImplementation(
      () => new Promise((resolve) => { resolveBasic = resolve; }),
    );
    fetchHealthRecordMock.mockResolvedValue({ bmi: 22 });
    fetchMedicationsMock.mockResolvedValue([]);
    fetchScaleSummariesMock.mockResolvedValue([]);

    const { result, unmount } = renderHook(() =>
      useProtectedArchive(true, 'session-cancel-ok', 'elder-1'),
    );

    expect(result.current.loading).toBe(true);
    unmount();

    await act(async () => {
      resolveBasic?.({ id: 'elder-1', name: '老人' });
      await Promise.resolve();
    });
  });

  it('ignores rejection cleanup when the request is cancelled before Promise.all fails', async () => {
    let rejectBasic: ((reason?: unknown) => void) | undefined;
    fetchVerifiedBasicInfoMock.mockImplementation(
      () => new Promise((_, reject) => { rejectBasic = reject; }),
    );
    fetchHealthRecordMock.mockResolvedValue({ bmi: 22 });
    fetchMedicationsMock.mockResolvedValue([]);
    fetchScaleSummariesMock.mockResolvedValue([]);

    const { result, unmount } = renderHook(() =>
      useProtectedArchive(true, 'session-cancel-fail', 'elder-1'),
    );

    expect(result.current.loading).toBe(true);
    unmount();

    await act(async () => {
      rejectBasic?.(new Error('network'));
      await Promise.resolve();
    });
  });
});
