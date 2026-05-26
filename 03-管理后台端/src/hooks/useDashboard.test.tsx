import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboard } from './useDashboard';

const fetchDashboard = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
}));

describe('useDashboard', () => {
  it('loads dashboard metrics, elders and logs', async () => {
    fetchDashboard.mockResolvedValue({
      dashboardMetrics: [{ label: '老人档案', value: 8, trend: '实时数据', icon: 'UsersRound' }],
      elderRows: [{ id: 'elder-1', archiveNo: 'A001', name: '赵永福' }],
      auditLogs: [{ id: 'log-1', action: '登录', operator: 'admin' }],
    });

    const { result } = renderHook(() => useDashboard());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.elders[0].name).toBe('赵永福');
    expect(result.current.logs[0].action).toBe('登录');
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
  });
});
