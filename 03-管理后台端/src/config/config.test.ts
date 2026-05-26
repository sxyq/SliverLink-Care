import { describe, expect, it } from 'vitest';
import { ENDPOINTS } from './endpoints';
import { API_BASE_URL } from './env';
import { menuConfig } from './menu';

describe('config modules', () => {
  it('exposes stable admin endpoints', () => {
    expect(ENDPOINTS.admin.login).toBe('/api/admin/login');
    expect(ENDPOINTS.admin.dashboard).toBe('/api/admin/dashboard');
    expect(ENDPOINTS.qrcode.disable('qr-1')).toBe('/api/admin/qrcodes/qr-1/disable');
    expect(ENDPOINTS.qrcode.regenerate('qr-1')).toBe('/api/admin/qrcodes/qr-1/regenerate');
    expect(ENDPOINTS.audit.logs).toBe('/api/admin/audit-logs');
  });

  it('keeps base url and menu definitions available', () => {
    expect(typeof API_BASE_URL).toBe('string');
    expect(menuConfig.map((item) => item.label)).toContain('首页概览');
    expect(menuConfig.map((item) => item.path)).toContain('/qrcodes');
  });
});
