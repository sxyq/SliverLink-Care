import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadNameplatePdf } from './nameplateExport';

describe('downloadNameplatePdf', () => {
  const createObjectURL = vi.fn();
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL.mockReturnValue('blob:nameplate-pdf');
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads the generated pdf and releases its object URL', async () => {
    const pdf = new Blob(['pdf'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(pdf, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await downloadNameplatePdf({
      elderId: 'elder 1',
      archiveNo: 'A001',
      tokenStorageKey: 'token-key',
    });

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(fetchMock).toHaveBeenCalledWith('/api/nameplates/elder%201/pdf', {
      method: 'GET',
      credentials: 'same-origin',
    });
    expect(anchor.href).toBe('blob:nameplate-pdf');
    expect(anchor.download).toBe('nameplate-elder 1.pdf');
    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nameplate-pdf');
  });
});
