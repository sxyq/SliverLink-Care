import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminMessageCenter } from './AdminMessageCenter';
import { MetricCard } from './MetricCard';
import { PermissionMatrix } from './PermissionMatrix';
import { Sidebar } from './Sidebar';
import { StatusTag } from './StatusTag';
import { getSecurityStatusBg, getSecurityStatusColor } from '../utils/security';

const fetchAdminReviewRequests = vi.fn();
const approveAdminReviewRequest = vi.fn();
const rejectAdminReviewRequest = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchAdminReviewRequests: (...args: unknown[]) => fetchAdminReviewRequests(...args),
  approveAdminReviewRequest: (...args: unknown[]) => approveAdminReviewRequest(...args),
  rejectAdminReviewRequest: (...args: unknown[]) => rejectAdminReviewRequest(...args),
}));

describe('admin components and security formatting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    fetchAdminReviewRequests.mockReset();
    approveAdminReviewRequest.mockReset();
    rejectAdminReviewRequest.mockReset();
  });

  it.each([
    ['启用', 'status-tag--success'],
    ['失败', 'status-tag--danger'],
    ['已停用', 'status-tag--disabled'],
    ['等待验证', 'status-tag--warning'],
    ['未知', 'status-tag--disabled'],
  ])('renders status %s with expected class', (status, className) => {
    render(<StatusTag status={status} />);
    expect(screen.getByText(status)).toHaveClass(className);
  });

  it('renders metric card with fallback icon and metric text', () => {
    render(<MetricCard metric={{ label: '老人档案', value: '12', trend: '实时数据', icon: 'unknown' }} />);

    expect(screen.getByText('老人档案')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('实时数据')).toBeInTheDocument();
  });

  it.each([
    ['已启用', '#0a8067', '#e6f5f1'],
    ['已配置', '#115f72', '#e6f0f5'],
    ['未配置', '#687989', '#eef2f5'],
  ] as const)('maps security status %s to palette', (status, color, bg) => {
    expect(getSecurityStatusColor(status)).toBe(color);
    expect(getSecurityStatusBg(status)).toBe(bg);
  });

  it('renders sidebar groups, collapsed label and logout navigation', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    const onToggleCollapse = vi.fn();
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar role="审计员" collapsed={false} onLogout={onLogout} onToggleCollapse={onToggleCollapse} />
      </MemoryRouter>,
    );

    expect(screen.getByText('智联名牌')).toBeInTheDocument();
    expect(screen.queryByLabelText('老人档案')).not.toBeInTheDocument();
    expect(screen.getByLabelText('管理员操作')).toBeInTheDocument();
    await user.click(screen.getByLabelText('收起导航'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText('退出登录'));
    expect(onLogout).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar role="未知角色" collapsed onLogout={onLogout} onToggleCollapse={onToggleCollapse} />
      </MemoryRouter>,
    );
    expect(screen.getByText('智联')).toBeInTheDocument();
    expect(screen.getByLabelText('老人档案')).toHaveAttribute('title', '老人档案');
  });

  it('renders permission matrix active and inactive cells', () => {
    render(
      <PermissionMatrix
        roles={[
          {
            role: '测试角色',
            dataScope: '测试数据',
            menuPermissions: ['老人档案'],
            apiPermissions: ['GET /api/elders/assigned'],
            exportPermissions: ['导出日志'],
          },
        ]}
      />,
    );

    expect(screen.getAllByText('测试角色')).toHaveLength(3);
    expect(screen.getByText('测试数据')).toBeInTheDocument();
    expect(document.querySelectorAll('.check-icon').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.cross-icon').length).toBeGreaterThan(0);
  });

  it('loads admin messages and handles approve/reject actions', async () => {
    const user = userEvent.setup();
    fetchAdminReviewRequests.mockResolvedValue([
      {
        id: 'review-1',
        title: '二维码停用申请',
        summary: '赵永福申请停用',
        createdAt: '2026-05-25T12:00:00Z',
      },
    ]);
    approveAdminReviewRequest.mockResolvedValue(undefined);
    rejectAdminReviewRequest.mockResolvedValue(undefined);

    render(<AdminMessageCenter />);
    expect(await screen.findByText('1')).toBeInTheDocument();
    await user.click(screen.getByLabelText('后台消息提醒'));
    expect(screen.getByText('二维码停用申请')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /通过/ }));
    expect(approveAdminReviewRequest).toHaveBeenCalledWith('review-1');

    await user.click(screen.getByRole('button', { name: /驳回/ }));
    expect(rejectAdminReviewRequest).toHaveBeenCalledWith('review-1', '管理员驳回二维码停用申请');
  });

  it('shows admin message empty and error states', async () => {
    const user = userEvent.setup();
    fetchAdminReviewRequests.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('网络异常'));

    render(<AdminMessageCenter />);
    await user.click(screen.getByLabelText('后台消息提醒'));
    expect(await screen.findByText('暂无待审核消息')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '刷新' }));
    expect(await screen.findByText('网络异常')).toBeInTheDocument();
  });
});
