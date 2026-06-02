import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportAudit } from './auditApi';

function mockFetchData(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 200, data })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('auditApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports audit with action only', async () => {
    const fetchMock = mockFetchData({ ok: true });

    const result = await reportAudit({ action: 'view_health' });
    expect(result).toEqual({ ok: true });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.action).toBe('view_health');
    expect(body.ts).toBeTypeOf('number');
    expect(body.ua).toBe(navigator.userAgent);
  });

  it('reports audit with target and detail', async () => {
    const fetchMock = mockFetchData({ ok: true });

    await reportAudit({ action: 'view_health', target: 'elder-001', detail: 'via sms' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.action).toBe('view_health');
    expect(body.target).toBe('elder-001');
    expect(body.detail).toBe('via sms');
  });

  it('includes timestamp and user agent in payload', async () => {
    const fetchMock = mockFetchData({ ok: true });

    await reportAudit({ action: 'test' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.ts).toBeGreaterThan(0);
    expect(body.ua).toBe(navigator.userAgent);
  });

  it('sends POST request to audit report endpoint', async () => {
    const fetchMock = mockFetchData({ ok: true });

    await reportAudit({ action: 'test' });

    expect(fetchMock).toHaveBeenCalledWith('/api/audit-logs/report', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });
});
