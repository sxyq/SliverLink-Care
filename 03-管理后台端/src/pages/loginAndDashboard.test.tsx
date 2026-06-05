import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLoginPage } from './AdminLoginPage';
import { DashboardPage } from './DashboardPage';

const loginAdmin = vi.fn();
const fetchAllScales = vi.fn();
const fetchAuditLogs = vi.fn();
const fetchElders = vi.fn();
const fetchFamilyBindings = vi.fn();
const fetchInvitations = vi.fn();
const fetchMedications = vi.fn();
const fetchQrCodes = vi.fn();
const fetchVolunteers = vi.fn();

vi.mock('../api/adminApi', () => ({
  loginAdmin: (...args: unknown[]) => loginAdmin(...args),
  fetchAllScales: (...args: unknown[]) => fetchAllScales(...args),
  fetchAuditLogs: (...args: unknown[]) => fetchAuditLogs(...args),
  fetchElders: (...args: unknown[]) => fetchElders(...args),
  fetchFamilyBindings: (...args: unknown[]) => fetchFamilyBindings(...args),
  fetchInvitations: (...args: unknown[]) => fetchInvitations(...args),
  fetchMedications: (...args: unknown[]) => fetchMedications(...args),
  fetchQrCodes: (...args: unknown[]) => fetchQrCodes(...args),
  fetchVolunteers: (...args: unknown[]) => fetchVolunteers(...args),
}));

describe('AdminLoginPage', () => {
  beforeEach(() => {
    loginAdmin.mockReset();
  });

  it('submits credentials and reports role on success', async () => {
    const onLogin = vi.fn();
    loginAdmin.mockResolvedValue({ ok: true, role: '系统管理员' });

    render(<AdminLoginPage onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('账号'), { target: { value: '  root  ' } });
    fireEvent.change(screen.getByPlaceholderText('密码'), { target: { value: '  secret  ' } });
    fireEvent.click(screen.getByRole('button', { name: '账号密码登录' }));

    await waitFor(() => {
      expect(loginAdmin).toHaveBeenCalledWith('root', 'secret');
      expect(onLogin).toHaveBeenCalledWith('系统管理员');
    });
  });

  it('shows default failure message when login result is not ok', async () => {
    loginAdmin.mockResolvedValue({ ok: false, role: '' });

    render(<AdminLoginPage onLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '账号密码登录' }));

    expect(await screen.findByText('登录失败，请检查账号或密码')).toBeInTheDocument();
  });

  it('shows thrown error message and resets submitting state', async () => {
    loginAdmin.mockRejectedValue(new Error('网络异常'));

    render(<AdminLoginPage onLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '账号密码登录' }));

    expect(screen.getByRole('button')).toHaveTextContent('登录中...');
    expect(await screen.findByText('网络异常')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('账号密码登录');
    });
  });
});

describe('DashboardPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    fetchAllScales.mockReset();
    fetchAuditLogs.mockReset();
    fetchElders.mockReset();
    fetchFamilyBindings.mockReset();
    fetchInvitations.mockReset();
    fetchMedications.mockReset();
    fetchQrCodes.mockReset();
    fetchVolunteers.mockReset();
  });

  it('loads and renders dashboard metrics, panels and latest audits', async () => {
    fetchElders.mockResolvedValue([
      { id: 'elder-1', age: 68, status: '启用', name: '李奶奶', archiveNo: 'A-001' },
      { id: 'elder-2', age: 82, status: '启用', name: '张爷爷', archiveNo: 'A-002' },
    ]);
    fetchVolunteers.mockResolvedValue([{ id: 'vol-1', status: '启用', elderCount: 2 }]);
    fetchQrCodes.mockResolvedValue([{ id: 'qr-1', status: '启用' }, { id: 'qr-2', status: '已停用' }]);
    fetchAuditLogs.mockResolvedValue([
      {
        time: '2026-05-26T00:00:00Z',
        operator: 'admin',
        action: 'LOGIN',
        result: '成功',
        role: 'SYSTEM_ADMIN',
        target: '系统后台',
        ip: '127.0.0.1',
      },
      {
        time: '2026-05-26T01:00:00Z',
        operator: 'visitor-13812345678',
        action: 'SCAN_QR',
        result: '成功',
        role: 'VISITOR',
        target: '老人档案',
        ip: '127.0.0.2',
      },
    ]);
    fetchInvitations.mockResolvedValue([{ id: 'invite-1', status: '未使用' }]);
    fetchFamilyBindings.mockResolvedValue([{ id: 'binding-1', status: '已绑定' }]);
    fetchMedications.mockResolvedValue([{ id: 'med-1', elderId: 'elder-1', archiveNo: 'A-001' }]);
    fetchAllScales.mockResolvedValue([
      { id: 'scale-1', scaleName: 'PHQ-9', score: 12 },
      { id: 'scale-2', scaleName: 'UCLA', score: 38 },
    ]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('管理首页')).toBeInTheDocument();
      expect(screen.getByText('老人档案')).toBeInTheDocument();
      expect(screen.getByText('志愿者账号')).toBeInTheDocument();
      expect(screen.getByText('访问人员统计')).toBeInTheDocument();
      expect(screen.getByText('最近操作记录')).toBeInTheDocument();
      expect(screen.getByText('登录')).toBeInTheDocument();
      expect(screen.getByText('扫码访问')).toBeInTheDocument();
      expect(screen.getByText('量表平均分')).toBeInTheDocument();
    });
  });

  it('shows deferred loading error when secondary requests fail', async () => {
    fetchElders.mockResolvedValue([]);
    fetchVolunteers.mockResolvedValue([]);
    fetchQrCodes.mockResolvedValue([]);
    fetchAuditLogs.mockResolvedValue([]);
    fetchInvitations.mockRejectedValue(new Error('邀请码加载失败'));
    fetchFamilyBindings.mockResolvedValue([]);
    fetchMedications.mockResolvedValue([]);
    fetchAllScales.mockResolvedValue([]);

    render(<DashboardPage />);

    expect(await screen.findByText('邀请码加载失败')).toBeInTheDocument();
  });

  it('renders cached snapshot metrics immediately and tolerates malformed session cache', async () => {
    sessionStorage.setItem(
      'sl_admin_dashboard_snapshot_v1',
      JSON.stringify({
        elders: [{ id: 'elder-snapshot', age: 77, status: '启用', name: '缓存老人', archiveNo: 'SN-001' }],
        volunteers: [],
        qrCodes: [],
        invitations: [],
        familyBindings: [],
        medications: [],
        scales: [],
        auditLogs: [],
      }),
    );
    fetchElders.mockResolvedValue([]);
    fetchVolunteers.mockResolvedValue([]);
    fetchQrCodes.mockResolvedValue([]);
    fetchAuditLogs.mockResolvedValue([]);
    fetchInvitations.mockResolvedValue([]);
    fetchFamilyBindings.mockResolvedValue([]);
    fetchMedications.mockResolvedValue([]);
    fetchAllScales.mockResolvedValue([]);

    const { unmount } = render(<DashboardPage />);
    expect(screen.getByText('老人档案')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    unmount();

    sessionStorage.setItem('sl_admin_dashboard_snapshot_v1', '{');
    render(<DashboardPage />);
    expect(await screen.findByText('管理首页')).toBeInTheDocument();
  });

  it('shows primary loading error when core requests fail early', async () => {
    fetchElders.mockRejectedValue(new Error('首页加载失败'));
    fetchVolunteers.mockResolvedValue([]);
    fetchQrCodes.mockResolvedValue([]);
    fetchAuditLogs.mockResolvedValue([]);
    fetchInvitations.mockResolvedValue([]);
    fetchFamilyBindings.mockResolvedValue([]);
    fetchMedications.mockResolvedValue([]);
    fetchAllScales.mockResolvedValue([]);

    render(<DashboardPage />);

    expect(await screen.findByText('首页加载失败')).toBeInTheDocument();
  });

  it('covers scale risk labels, visitor phone fallbacks and silent panel paths', async () => {
    fetchElders.mockResolvedValue([
      { id: 'elder-1', age: 59, status: '启用', name: '李奶奶', archiveNo: 'A-001' },
      { id: 'elder-2', age: 91, status: '停用', name: '张爷爷', archiveNo: 'A-002' },
    ]);
    fetchVolunteers.mockResolvedValue([
      { id: 'vol-1', status: '启用', elderCount: 0 },
      { id: 'vol-2', status: '停用', elderCount: 2 },
    ]);
    fetchQrCodes.mockResolvedValue([
      { id: 'qr-1', status: '启用' },
      { id: 'qr-2', status: '已停用' },
    ]);
    fetchAuditLogs.mockResolvedValue([
      {
        time: 'invalid-time',
        operator: 'audit-helper',
        action: 'UNKNOWN_ACTION',
        result: '成功',
        role: '',
        target: '177****0000',
        ip: '127.0.0.1',
      },
      {
        time: '2026-05-26T01:00:00Z',
        operator: '志愿者王',
        action: 'SMS_SEND',
        result: '失败',
        role: '',
        target: '138****5678',
        ip: '127.0.0.2',
      },
      {
        time: '2026-05-26T02:00:00Z',
        operator: '家属李',
        action: 'LOGIN',
        result: '成功',
        role: 'FAMILY',
        target: '老人档案',
        ip: '127.0.0.3',
      },
    ]);
    fetchInvitations.mockResolvedValue([]);
    fetchFamilyBindings.mockResolvedValue([]);
    fetchMedications.mockResolvedValue([]);
    fetchAllScales.mockResolvedValue([
      { id: 'scale-1', scaleName: 'GAD custom', score: 17 },
      { id: 'scale-2', scaleName: 'UCLA loneliness', score: 50 },
      { id: 'scale-3', scaleName: '未知量表', score: 3 },
    ]);

    render(<DashboardPage />);

    expect(await screen.findByText('GAD-7 / 重度风险')).toBeInTheDocument();
    expect(screen.getByText('UCLA / 高关注')).toBeInTheDocument();
    expect(screen.getByText('未知量表 / 待评估')).toBeInTheDocument();
    expect(screen.getByText('audit-helper')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN_ACTION')).toBeInTheDocument();
    expect(screen.getByText('invalid-time')).toBeInTheDocument();
    expect(screen.getByText('留痕手机号数')).toBeInTheDocument();
  });
});
