import { describe, expect, it, vi, beforeEach } from 'vitest';
import { httpClient } from './httpClient';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('httpClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('merges json headers and returns envelope data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(httpClient('/api/demo', { headers: { 'X-Test': '1' } })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/demo', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Test': '1',
      }),
    }));
  });

  it('returns plain json when backend does not use envelope format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    await expect(httpClient('/api/plain')).resolves.toEqual({ ok: true });
  });

  it('throws http status errors before parsing json', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'no' }, { status: 500 })));

    await expect(httpClient('/api/fail')).rejects.toThrow('HTTP 500');
  });

  it('throws envelope business errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ code: 400, message: '业务错误', data: null })));

    await expect(httpClient('/api/business-fail')).rejects.toThrow('业务错误');
  });
});
