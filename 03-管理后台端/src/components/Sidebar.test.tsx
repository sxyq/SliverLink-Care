import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

describe('Sidebar', () => {
  it('shows allowed navigation items for auditor role', () => {
    render(
      <MemoryRouter initialEntries={['/audit/admin']}>
        <Sidebar role="审计员" onLogout={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('操作日志')).toBeInTheDocument();
    expect(screen.getByLabelText('管理员操作')).toBeInTheDocument();
    expect(screen.queryByLabelText('二维码管理')).not.toBeInTheDocument();
  });

  it('hides text labels when collapsed and triggers collapse callback', () => {
    const onToggleCollapse = vi.fn();

    render(
      <MemoryRouter>
        <Sidebar role="系统管理员" onLogout={vi.fn()} collapsed onToggleCollapse={onToggleCollapse} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('系统首页')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开导航' }));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('calls logout and navigates to login route', () => {
    const onLogout = vi.fn();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Sidebar role="系统管理员" onLogout={onLogout} collapsed={false} onToggleCollapse={vi.fn()} />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '退出登录' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/login');
  });
});
