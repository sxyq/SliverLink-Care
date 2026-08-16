import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomTabBar } from './BottomTabBar';
import { ContentProtection } from './ContentProtection';
import { MedicationList } from './MedicationList';
import { PageTopBar } from './PageTopBar';
import { ProtectedRoute } from './ProtectedRoute';
import { ScaleSummaryCard } from './ScaleSummaryCard';
import { VerificationBadge } from './VerificationBadge';

const securityState = vi.hoisted(() => ({ verified: false }));

vi.mock('../app/SecurityProvider', () => ({
  useSecurity: () => ({
    verified: securityState.verified,
  }),
}));

describe('scan navigation and protection components', () => {
  afterEach(() => {
    securityState.verified = false;
    document.body.classList.remove('sl-protected-surface');
    vi.useRealTimers();
  });

  it('disables sensitive bottom tabs until verification and navigates after verification', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <BottomTabBar />
        <Routes>
          <Route path="/" element={<p>basic</p>} />
          <Route path="/health" element={<p>health page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '基本信息' })).toHaveClass('is-active');
    expect(screen.getByRole('button', { name: '健康档案' })).toBeDisabled();

    securityState.verified = true;
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <BottomTabBar />
        <Routes>
          <Route path="/" element={<p>basic</p>} />
          <Route path="/health" element={<p>health page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: '健康档案' }));
    expect(screen.getByText('health page')).toBeInTheDocument();
  });

  it('redirects protected route until verification succeeds', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/health']}>
        <Routes>
          <Route path="/verify" element={<p>verify page</p>} />
          <Route path="/health" element={<ProtectedRoute><p>secret page</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('verify page')).toBeInTheDocument();
    unmount();

    securityState.verified = true;
    render(
      <MemoryRouter initialEntries={['/health']}>
        <Routes>
          <Route path="/verify" element={<p>verify page</p>} />
          <Route path="/health" element={<ProtectedRoute><p>secret page</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret page')).toBeInTheDocument();
  });

  it('renders top bar leading and custom trailing actions', async () => {
    const user = userEvent.setup();
    const onTrailingClick = vi.fn();
    render(
      <MemoryRouter initialEntries={['/health']}>
        <Routes>
          <Route
            path="/health"
            element={
              <PageTopBar
                title="健康档案"
                leading="home"
                trailingLabel="短信验证"
                trailingAriaLabel="切换短信验证"
                onTrailingClick={onTrailingClick}
              />
            }
          />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '健康档案' })).toBeInTheDocument();
    expect(screen.getByLabelText('返回首页')).toBeInTheDocument();
    await user.click(screen.getByLabelText('切换短信验证'));
    expect(onTrailingClick).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText('返回首页'));
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders medication list and verification badge states', () => {
    const { rerender } = render(
      <>
        <MedicationList items={[{ name: '阿司匹林', dosage: '100mg', usage: '口服', time: '早饭后' }]} />
        <VerificationBadge state="need" />
      </>,
    );

    expect(screen.getByText('阿司匹林')).toBeInTheDocument();
    expect(screen.getByText('需短信验证后查看')).toBeInTheDocument();

    const dosageNode = screen.getByText('100mg');
    expect(dosageNode).toHaveAttribute('dir', 'ltr');
    expect(dosageNode).toHaveClass('sl-ltr-data');
    expect(screen.getByText('阿司匹林')).toHaveAttribute('dir', 'auto');
    const metaLine = dosageNode.closest('div');
    expect(metaLine?.textContent).toContain('口服');
    expect(metaLine?.textContent).toContain('早饭后');

    rerender(<VerificationBadge state="verified" />);
    expect(screen.getByText('已通过短信验证')).toBeInTheDocument();
  });

  it('expands scale summaries and derives level text', async () => {
    const user = userEvent.setup();
    render(
      <ScaleSummaryCard
        items={[
          { name: 'PHQ-9', score: 21, updatedAt: '', volunteer: '' },
          { name: 'GAD-7', score: 12, updatedAt: '2026-05-25', volunteer: '护士' },
          { name: 'UCLA', score: 45, level: '人工标记', updatedAt: '2026-05-25', volunteer: '社工' },
        ]}
      />,
    );

    expect(screen.getByText(/结果：重度/)).toBeInTheDocument();
    expect(screen.getByText(/结果：中度/)).toBeInTheDocument();
    expect(screen.getByText(/结果：人工标记/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /PHQ-9/ }));
    expect(screen.getByText('21 / 27')).toBeInTheDocument();
    expect(screen.getByText('未记录')).toBeInTheDocument();
  });

  it('blocks copy-like events and clears protection state on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<ContentProtection enabled watermarkText="智联名牌 仅供查看" />);

    expect(document.body).toHaveClass('sl-protected-surface');
    expect(document.querySelectorAll('.sl-watermark-item')).toHaveLength(15);
    act(() => {
      document.dispatchEvent(new Event('copy', { cancelable: true }));
    });
    expect(screen.getByText('当前页面已开启隐私保护，禁止复制与传播')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.queryByText('当前页面已开启隐私保护，禁止复制与传播')).not.toBeInTheDocument();
    unmount();
    expect(document.body).not.toHaveClass('sl-protected-surface');
  });

  it('renders nothing when content protection is disabled', () => {
    const { container } = render(<ContentProtection enabled={false} watermarkText="智联名牌" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders top bar with back leading and verified trailing', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/', '/health']} initialIndex={1}>
        <Routes>
          <Route path="/" element={<p>basic page</p>} />
          <Route path="/health" element={<PageTopBar title="健康档案" leading="back" trailing="verified" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('返回上一页')).toBeInTheDocument();
    expect(screen.getByLabelText('验证已开启')).toBeInTheDocument();
    await user.click(screen.getByLabelText('返回上一页'));
    expect(screen.getByText('basic page')).toBeInTheDocument();
  });

  it('renders top bar with menu trailing when no trailing label', () => {
    render(
      <MemoryRouter>
        <PageTopBar title="基本信息" leading="home" trailing="menu" />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('更多操作')).toBeInTheDocument();
  });

  it('blocks keyboard shortcuts when content protection is enabled', () => {
    vi.useFakeTimers();
    render(<ContentProtection enabled watermarkText="test" />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, cancelable: true }));
    });
    expect(screen.getByText('当前页面已开启隐私保护，禁止复制与传播')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }));
    });
    expect(screen.getByText('当前页面已开启隐私保护，禁止复制与传播')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', metaKey: true, cancelable: true }));
    });
    expect(screen.getByText('当前页面已开启隐私保护，禁止复制与传播')).toBeInTheDocument();
  });

  it('blocks PrintScreen key when content protection is enabled', () => {
    vi.useFakeTimers();
    render(<ContentProtection enabled watermarkText="test" />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PrintScreen', cancelable: true }));
    });
    expect(screen.getByText('当前页面已开启隐私保护，禁止复制与传播')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.queryByText('当前页面已开启隐私保护，禁止复制与传播')).not.toBeInTheDocument();
  });

  it('blocks context menu and drag events when protection enabled', () => {
    render(<ContentProtection enabled watermarkText="test" />);

    act(() => {
      const contextEvent = new Event('contextmenu', { cancelable: true });
      document.dispatchEvent(contextEvent);

      const dragEvent = new Event('dragstart', { cancelable: true });
      document.dispatchEvent(dragEvent);

      const selectEvent = new Event('selectstart', { cancelable: true });
      document.dispatchEvent(selectEvent);
    });
  });

  it('highlights active tab based on current path', () => {
    render(
      <MemoryRouter initialEntries={['/health']}>
        <BottomTabBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '基本信息' })).not.toHaveClass('is-active');
    expect(screen.getByRole('button', { name: '健康档案' })).toHaveClass('is-active');
  });
});
