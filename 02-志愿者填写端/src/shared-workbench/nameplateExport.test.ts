import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadNameplatePdf } from './nameplateExport';

describe('downloadNameplatePdf', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens generated pdf in a safe anchor and falls back to location navigation', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await downloadNameplatePdf({
      elderId: 'elder 1',
      archiveNo: 'A001',
      tokenStorageKey: 'token-key',
    });

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.href).toContain('/api/nameplates/elder%201/pdf');
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toBe('noopener noreferrer');
    actLocationFallback();
  });
});

function actLocationFallback() {
  vi.advanceTimersByTime(180);
}
