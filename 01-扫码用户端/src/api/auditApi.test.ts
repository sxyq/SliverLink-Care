import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportAudit } from './auditApi';

describe('reportAudit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts audit payload with timestamp and user agent', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1770000000000);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 200, data: { ok: true } })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(reportAudit({ action: 'VIEW', target: 'elder-001' })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/audit-logs/report', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        action: 'VIEW',
        target: 'elder-001',
        ts: 1770000000000,
        ua: navigator.userAgent,
      }),
    }));
  });
});
