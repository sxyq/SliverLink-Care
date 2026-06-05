import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from './TableColumnMenu';

type TestKey = 'name' | 'age' | 'status' | 'actions';

const options: TableColumnOption<TestKey>[] = [
  { key: 'name', label: '姓名', defaultVisible: true },
  { key: 'age', label: '年龄', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: false },
  { key: 'actions', label: '操作', required: true },
];

function renderHook<T>(hookFn: () => T) {
  let result: { current: T } = { current: undefined as unknown as T };
  function TestComponent() {
    result.current = hookFn();
    return null;
  }
  render(<TestComponent />);
  return { result };
}

describe('useTableColumnVisibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default visibility when no stored state', () => {
    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));
    expect(result.current.isVisible('name')).toBe(true);
    expect(result.current.isVisible('age')).toBe(true);
    expect(result.current.isVisible('status')).toBe(false);
    expect(result.current.isVisible('actions')).toBe(true);
  });

  it('loads stored column state from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify({ name: false, age: true, status: true, actions: false }));

    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));
    expect(result.current.isVisible('name')).toBe(false);
    expect(result.current.isVisible('status')).toBe(true);
    expect(result.current.isVisible('actions')).toBe(true);
  });

  it('falls back to defaults when JSON parse fails', () => {
    localStorage.setItem('test-key', 'not-valid-json{');

    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));
    expect(result.current.isVisible('name')).toBe(true);
    expect(result.current.isVisible('actions')).toBe(true);
  });

  it('forces required columns to always be visible', () => {
    localStorage.setItem('test-key', JSON.stringify({ name: true, age: true, status: true, actions: false }));

    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));
    expect(result.current.isVisible('actions')).toBe(true);
  });

  it('toggle does not change required columns', () => {
    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));

    act(() => {
      result.current.toggle('actions');
    });

    expect(result.current.isVisible('actions')).toBe(true);
  });

  it('toggle changes non-required column visibility', () => {
    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));

    expect(result.current.isVisible('name')).toBe(true);
    act(() => {
      result.current.toggle('name');
    });
    expect(result.current.isVisible('name')).toBe(false);

    act(() => {
      result.current.toggle('name');
    });
    expect(result.current.isVisible('name')).toBe(true);
  });

  it('reset restores default visibility', () => {
    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));

    act(() => {
      result.current.toggle('name');
    });
    expect(result.current.isVisible('name')).toBe(false);

    act(() => {
      result.current.reset();
    });
    expect(result.current.isVisible('name')).toBe(true);
    expect(result.current.isVisible('status')).toBe(false);
  });

  it('persists visibility state to localStorage', () => {
    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));

    act(() => {
      result.current.toggle('name');
    });

    const stored = JSON.parse(localStorage.getItem('test-key')!);
    expect(stored.name).toBe(false);
  });

  it('uses fallback for keys not in stored state', () => {
    localStorage.setItem('test-key', JSON.stringify({ name: true }));

    const { result } = renderHook(() => useTableColumnVisibility('test-key', options));
    expect(result.current.isVisible('age')).toBe(true);
    expect(result.current.isVisible('status')).toBe(false);
  });
});

describe('TableColumnMenu', () => {
  const defaultProps = {
    options,
    isVisible: (key: TestKey) => {
      const map: Record<TestKey, boolean> = { name: true, age: true, status: false, actions: true };
      return map[key] !== false;
    },
    onToggle: vi.fn(),
    onReset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders column menu button with visible count', () => {
    render(<TableColumnMenu {...defaultProps} />);

    expect(screen.getByRole('button', { name: /字段/ })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens popover on button click and shows column options', async () => {
    const user = userEvent.setup();
    render(<TableColumnMenu {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /字段/ }));

    expect(screen.getByText('字段显示')).toBeInTheDocument();
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('年龄')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
  });

  it('shows required label for required columns', async () => {
    const user = userEvent.setup();
    render(<TableColumnMenu {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /字段/ }));

    expect(screen.getByText('固定')).toBeInTheDocument();
  });

  it('disables checkbox for required columns', async () => {
    const user = userEvent.setup();
    render(<TableColumnMenu {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /字段/ }));

    const actionsCheckbox = screen.getByRole('checkbox', { name: /操作/ });
    expect(actionsCheckbox).toBeDisabled();
  });

  it('calls onToggle when non-required checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<TableColumnMenu {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /字段/ }));

    fireEvent.click(await screen.findByLabelText('姓名'));

    expect(defaultProps.onToggle).toHaveBeenCalledWith('name');
  });

  it('calls onReset when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<TableColumnMenu {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /字段/ }));

    fireEvent.click(await screen.findByRole('button', { name: /重置/ }));

    expect(defaultProps.onReset).toHaveBeenCalled();
  });

  it('closes popover when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <TableColumnMenu {...defaultProps} />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /字段/ }));
    expect(screen.getByText('字段显示')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('字段显示')).not.toBeInTheDocument();
    });
  });

  it('toggles popover open and closed on button click', async () => {
    const user = userEvent.setup();
    render(<TableColumnMenu {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /字段/ }));
    expect(screen.getByText('字段显示')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /字段/ }));
    await waitFor(() => {
      expect(screen.queryByText('字段显示')).not.toBeInTheDocument();
    });
  });
});

describe('useTableColumnVisibility options sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('syncs visibility when options change and required columns stay visible', () => {
    const initialOptions: TableColumnOption<'a' | 'b'>[] = [
      { key: 'a', label: 'A', defaultVisible: true },
      { key: 'b', label: 'B', defaultVisible: true },
    ];

    const { result, rerender } = renderHookWithRerender(
      (props: { opts: TableColumnOption<string>[] }) => useTableColumnVisibility('sync-test', props.opts),
      { opts: initialOptions },
    );

    expect(result.current.isVisible('a')).toBe(true);
    expect(result.current.isVisible('b')).toBe(true);

    const updatedOptions: TableColumnOption<'a' | 'b' | 'c'>[] = [
      { key: 'a', label: 'A', defaultVisible: true },
      { key: 'b', label: 'B', defaultVisible: false },
      { key: 'c', label: 'C', required: true },
    ];

    rerender({ opts: updatedOptions });

    expect(result.current.isVisible('a')).toBe(true);
    expect(result.current.isVisible('c')).toBe(true);
  });
});

function renderHookWithRerender<T, P>(hookFn: (props: P) => T, initialProps: P) {
  let result: { current: T } = { current: undefined as unknown as T };
  function TestComponent(props: P) {
    result.current = hookFn(props);
    return null;
  }
  const { rerender } = render(<TestComponent {...initialProps} />);
  return { result, rerender: (props: P) => rerender(<TestComponent {...props} />) };
}
