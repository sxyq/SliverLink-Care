import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAuditLogs } from './auditExport';

const exportToCsvMock = vi.fn();

vi.mock('../../utils/exportCsv', () => ({
  exportToCsv: (...args: unknown[]) => exportToCsvMock(...args),
}));

describe('exportAuditLogs', () => {
  beforeEach(() => {
    exportToCsvMock.mockClear();
    vi.setSystemTime(new Date('2026-05-25T08:00:00Z'));
  });

  it('maps audit rows to Chinese CSV headers and default filename', () => {
    exportAuditLogs([
      {
        time: '2026/5/25',
        operator: 'admin',
        role: '系统管理员',
        action: '登录',
        verificationMethod: '短信',
        visitorName: '访客',
        visitorPhone: '',
        visitorPhoneMasked: '138****0000',
        visitorIdCard: '',
        visitorIdCardMasked: '500***********0836',
        target: '系统',
        ip: '127.0.0.1',
        result: '成功',
      },
    ]);

    expect(exportToCsvMock).toHaveBeenCalledWith('audit-logs-20260525.csv', [
      expect.objectContaining({
        操作人: 'admin',
        访问人手机号: '138****0000',
        访问人身份证号: '500***********0836',
        来源IP: '127.0.0.1',
      }),
    ]);
  });

  it('uses explicit filename when provided', () => {
    exportAuditLogs([], 'custom.csv');

    expect(exportToCsvMock).toHaveBeenCalledWith('custom.csv', []);
  });
});
