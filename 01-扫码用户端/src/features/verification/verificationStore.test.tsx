import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVerificationStore } from './verificationStore';

describe('useVerificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves through pending, countdown, authorized and expired states', () => {
    const { result, unmount } = renderHook(() => useVerificationStore());

    act(() => result.current.setPending());
    expect(result.current.status).toBe('pending');

    act(() => result.current.startCountdown(2));
    expect(result.current.countdown).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(0);

    act(() => result.current.startAuthTimer());
    expect(result.current.status).toBe('verified');
    expect(result.current.isAuthorized).toBe(true);

    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(result.current.status).toBe('expired');
    expect(result.current.isAuthorized).toBe(false);

    unmount();
  });

  it('expires after five recorded errors and can reset', () => {
    const { result } = renderHook(() => useVerificationStore());

    act(() => result.current.setPending());
    act(() => {
      for (let i = 0; i < 5; i += 1) {
        result.current.recordError(`错误 ${i}`);
      }
    });

    expect(result.current.status).toBe('expired');
    expect(result.current.errorCount).toBe(5);
    expect(result.current.lastError).toBe('错误 4');

    act(() => result.current.reset());
    expect(result.current.status).toBe('none');
    expect(result.current.errorCount).toBe(0);
    expect(result.current.lastError).toBe('');
  });

  it('stays in current status when recording errors below threshold', () => {
    const { result } = renderHook(() => useVerificationStore());

    act(() => result.current.setPending());
    act(() => result.current.recordError('首次错误'));
    expect(result.current.status).toBe('pending');
    expect(result.current.errorCount).toBe(1);
    expect(result.current.lastError).toBe('首次错误');
  });

  it('isAuthorized returns false when not in verified status', () => {
    const { result } = renderHook(() => useVerificationStore());
    expect(result.current.isAuthorized).toBe(false);

    act(() => result.current.setPending());
    expect(result.current.isAuthorized).toBe(false);
  });

  it('restarting countdown clears previous countdown', () => {
    const { result } = renderHook(() => useVerificationStore());

    act(() => result.current.startCountdown(10));
    expect(result.current.countdown).toBe(10);

    act(() => result.current.startCountdown(5));
    expect(result.current.countdown).toBe(5);
  });

  it('restarting auth timer clears previous auth timer', () => {
    const { result } = renderHook(() => useVerificationStore());

    act(() => result.current.startAuthTimer());
    expect(result.current.status).toBe('verified');

    act(() => result.current.startAuthTimer());
    expect(result.current.status).toBe('verified');
    expect(result.current.authorizedUntil).toBeGreaterThan(0);
  });
});
