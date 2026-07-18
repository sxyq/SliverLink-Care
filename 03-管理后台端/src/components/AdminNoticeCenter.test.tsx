import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminNoticeCenter } from './AdminNoticeCenter';
import { showAdminSuccess } from '../utils/adminNotice';

describe('AdminNoticeCenter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows, replaces and closes success notices', () => {
    render(<AdminNoticeCenter />);

    act(() => showAdminSuccess('志愿者账号新增成功'));
    expect(screen.getByRole('status')).toHaveTextContent('志愿者账号新增成功');

    act(() => showAdminSuccess('志愿者信息修改成功'));
    expect(screen.getByRole('status')).toHaveTextContent('志愿者信息修改成功');

    fireEvent.click(screen.getByRole('button', { name: '关闭成功提示' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dismisses notices automatically', () => {
    vi.useFakeTimers();
    render(<AdminNoticeCenter />);

    act(() => showAdminSuccess('保存成功'));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
