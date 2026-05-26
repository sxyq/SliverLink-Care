import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthToken, getAuthToken, http, setAuthToken } from './httpClient';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('volunteer httpClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearAuthToken();
  });

  it('stores, reads and clears auth token', () => {
    setAuthToken('token-1');
    expect(getAuthToken()).toBe('token-1');
    expect(localStorage.getItem('sl_token')).toBe('token-1');

    clearAuthToken();
    expect(getAuthToken()).toBe('');
    expect(localStorage.getItem('sl_token')).toBeNull();
  });

  it('adds json and bearer headers and returns envelope data', async () => {
    setAuthToken('token-1');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(http('/api/demo', { headers: { 'X-Test': '1' } })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/demo', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-1',
        'X-Test': '1',
      }),
    }));
  });

  it('normalizes plain, json and business errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('plain error', { status: 500 })));
    await expect(http('/api/plain-error')).rejects.toThrow('plain error');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'json error' }), { status: 500 })));
    await expect(http('/api/json-error')).rejects.toThrow('json error');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ code: 400, message: 'biz error', data: null })));
    await expect(http('/api/biz-error')).rejects.toThrow('biz error');
  });

  it('clears auth token on unauthorized responses', async () => {
    setAuthToken('token-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));

    await expect(http('/api/unauthorized')).rejects.toThrow('请求失败');
    expect(getAuthToken()).toBe('');
  });
});
