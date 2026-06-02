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

  it('normalizes non-JSON error response starting with brace', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{invalid', { status: 500 })));
    await expect(http('/api/bad-json')).rejects.toThrow('请求失败');
  });

  it('throws API code when envelope code >= 400 without message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ code: 500, data: null })));
    await expect(http('/api/no-message')).rejects.toThrow('API 500');
  });

  it('returns data directly when response is not an envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ id: '1', name: 'test' })));
    await expect(http('/api/direct')).resolves.toEqual({ id: '1', name: 'test' });
  });

  it('returns envelope data when code is 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ code: 200, data: { result: 'ok' } })));
    await expect(http('/api/envelope')).resolves.toEqual({ result: 'ok' });
  });

  it('does not add bearer header when token is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await http('/api/no-token');
    expect(fetchMock).toHaveBeenCalledWith('/api/no-token', expect.objectContaining({
      headers: expect.not.objectContaining({ Authorization: expect.anything() }),
    }));
  });

  it('normalizes error with error field in JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'custom error' }), { status: 500 })));
    await expect(http('/api/error-field')).rejects.toThrow('custom error');
  });

  it('normalizes JSON error without message or error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ foo: 'bar' }), { status: 500 })));
    await expect(http('/api/json-no-msg')).rejects.toThrow('请求失败');
  });

  it('normalizes empty error text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(http('/api/empty-error')).rejects.toThrow('请求失败');
  });

  it('falls back to 请求失败 when res.text() throws', async () => {
    const badRes = new Response('', { status: 500 });
    vi.spyOn(badRes, 'text').mockRejectedValue(new Error('text failed'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(badRes));

    await expect(http('/api/text-fail')).rejects.toThrow('请求失败');
  });

  it('preserves custom headers alongside defaults', async () => {
    setAuthToken('my-token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await http('/api/custom', { headers: { 'X-Custom': 'value' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/custom', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-token',
        'X-Custom': 'value',
      }),
    }));
  });
});
