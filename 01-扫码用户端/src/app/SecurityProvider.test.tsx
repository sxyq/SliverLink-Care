import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityProvider, useSecurity } from './SecurityProvider';

const readQrToken = vi.fn();

vi.mock('../utils/qrToken', () => ({
  readQrToken: () => readQrToken(),
}));

function Consumer() {
  const security = useSecurity();
  return (
    <div>
      <span data-testid="verified">{String(security.verified)}</span>
      <span data-testid="session">{security.verifiedSessionId}</span>
      <span data-testid="elder">{security.verifiedElderId}</span>
      <button type="button" onClick={() => security.setVerified(true)}>set verified</button>
      <button type="button" onClick={() => security.verify('session-1', 'elder-1')}>verify</button>
      <button type="button" onClick={() => security.clearVerification()}>clear</button>
      <button type="button" onClick={() => security.setVerified(false)}>unset</button>
    </div>
  );
}

function BareConsumer() {
  const security = useSecurity();
  return (
    <div>
      <span data-testid="bare-verified">{String(security.verified)}</span>
      <button type="button" onClick={() => security.setVerified(true)}>bare set verified</button>
      <button type="button" onClick={() => security.verify('session-outside')}>bare verify</button>
      <button type="button" onClick={() => security.clearVerification()}>bare clear</button>
    </div>
  );
}

describe('SecurityProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T00:00:00Z'));
    window.sessionStorage.clear();
    readQrToken.mockReset();
    readQrToken.mockReturnValue('qr-token-123456');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates verification only when current qr token and ttl both match', () => {
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedSessionId', 'session-stored');
    window.sessionStorage.setItem('silverlink.scan.verifiedElderId', 'elder-stored');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() + 60_000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'qr-token-123456');

    const { unmount } = render(
      <SecurityProvider>
        <Consumer />
      </SecurityProvider>,
    );

    expect(screen.getByTestId('verified')).toHaveTextContent('true');
    expect(screen.getByTestId('session')).toHaveTextContent('session-stored');
    expect(screen.getByTestId('elder')).toHaveTextContent('elder-stored');
    unmount();

    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() + 60_000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'other-token');

    render(
      <SecurityProvider>
        <Consumer />
      </SecurityProvider>,
    );

    expect(screen.getByTestId('verified')).toHaveTextContent('false');
  });

  it('stores verification context, supports setVerified and clears state on demand or expiry', () => {
    render(
      <SecurityProvider>
        <Consumer />
      </SecurityProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'verify' }));
    expect(screen.getByTestId('verified')).toHaveTextContent('true');
    expect(screen.getByTestId('session')).toHaveTextContent('session-1');
    expect(screen.getByTestId('elder')).toHaveTextContent('elder-1');
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedSessionId')).toBe('session-1');
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedElderId')).toBe('elder-1');

    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByTestId('verified')).toHaveTextContent('false');
    expect(window.sessionStorage.getItem('silverlink.scan.verified')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'set verified' }));
    expect(screen.getByTestId('verified')).toHaveTextContent('true');
    expect(window.sessionStorage.getItem('silverlink.scan.verified')).toBe('1');
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedSessionId')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'unset' }));
    expect(screen.getByTestId('verified')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'verify' }));
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000 + 1);
    });
    expect(screen.getByTestId('verified')).toHaveTextContent('false');
    expect(window.sessionStorage.getItem('silverlink.scan.verified')).toBeNull();
  });

  it('keeps qr-token storage empty when setVerified and verify run without a current qr token', () => {
    readQrToken.mockReturnValue('');

    render(
      <SecurityProvider>
        <Consumer />
      </SecurityProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'set verified' }));
    expect(window.sessionStorage.getItem('silverlink.scan.verified')).toBe('1');
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedQrToken')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'verify' }));
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedSessionId')).toBe('session-1');
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedQrToken')).toBeNull();
  });

  it('exposes safe default context outside provider', () => {
    render(<BareConsumer />);

    expect(screen.getByTestId('bare-verified')).toHaveTextContent('false');
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'bare set verified' }))).not.toThrow();
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'bare verify' }))).not.toThrow();
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'bare clear' }))).not.toThrow();
  });

});
