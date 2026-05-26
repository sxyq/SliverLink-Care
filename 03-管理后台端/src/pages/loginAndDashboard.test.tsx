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
});
