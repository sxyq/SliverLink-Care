import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { SecurityProvider, useSecurity } from './SecurityProvider';
import { createAppRouter } from '../routes/router';
import { getDesignPreviewArchive, getDesignPreviewBasicInfo, isDesignPreviewEnabled } from '../dev/designPreview';

const mockReadQrToken = vi.hoisted(() => vi.fn());

vi.mock('../utils/qrToken', () => ({
  readQrToken: mockReadQrToken,
}));

vi.mock('../config/env', () => ({
  API_BASE_URL: '',
  DEV_DEFAULT_QR_TOKEN: '',
  DEV_FIXED_SMS_CODE: '',
  DEV_SMS_RELAY_RECEIVER_PHONE: '13800001111',
  DEV_SMS_RELAY_PREFIX: 'SL',
  ALLOW_LOCAL_VERIFICATION_FALLBACK: false,
}));

function SecurityProbe() {
  const security = useSecurity();
  return (
    <div>
      <p>verified:{String(security.verified)}</p>
      <p>session:{security.verifiedSessionId || '-'}</p>
      <p>elder:{security.verifiedElderId || '-'}</p>
      <button onClick={() => security.setVerified(true)}>set verified</button>
      <button onClick={() => security.setVerified(false)}>set unverified</button>
      <button onClick={() => security.verify('session-1', 'elder-1')}>verify</button>
      <button onClick={() => security.verify('session-2')}>verify no elder</button>
      <button onClick={() => security.clearVerification()}>clear</button>
    </div>
  );
}

describe('scan app shell, security provider and router', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.sessionStorage.clear();
    window.location.hash = '';
    mockReadQrToken.mockReturnValue('qr-token-123456');
  });

  it('renders shell children and design preview sample data', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<span>inside app</span>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('inside app')).toBeInTheDocument();
    expect(screen.getByText('重庆医科大学护理学院 银龄守护团队')).toBeInTheDocument();
    expect(isDesignPreviewEnabled()).toBe(false);
    expect(getDesignPreviewBasicInfo()).toMatchObject({ name: '王桂兰' });
    expect(getDesignPreviewArchive().scaleSummaries).toHaveLength(3);
  });

  it('persists verification, clears it and expires it with timer', async () => {
    vi.useFakeTimers();
    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'verify' }));
    expect(screen.getByText('verified:true')).toBeInTheDocument();
    expect(screen.getByText('session:session-1')).toBeInTheDocument();
    expect(screen.getByText('elder:elder-1')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedQrToken')).toBe('qr-token-123456');

    fireEvent.click(screen.getByRole('button', { name: 'verify no elder' }));
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedElderId')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByText('verified:false')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'set verified' }));
    await act(async () => {
      vi.advanceTimersByTime(20 * 60 * 1000 + 1);
    });
    expect(screen.getByText('verified:false')).toBeInTheDocument();
  });

  it('hydrates only matching unexpired qr token verification state', () => {
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedSessionId', 'session-old');
    window.sessionStorage.setItem('silverlink.scan.verifiedElderId', 'elder-old');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() + 60_000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'another-token');

    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);
    expect(screen.getByText('verified:false')).toBeInTheDocument();
    expect(screen.getByText('session:-')).toBeInTheDocument();
  });

  it('creates hash routes including protected and fallback routes', () => {
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() + 60_000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'qr-token-123456');

    const router = createAppRouter(
      <p>basic</p>,
      <p>verify</p>,
      <p>health</p>,
      <p>medication</p>,
      <p>scale</p>,
      <p>scale detail</p>,
      <p>nameplate</p>,
    );

    render(<SecurityProvider><RouterProvider router={router} /></SecurityProvider>);
    expect(screen.getByText('basic')).toBeInTheDocument();
  });

  it('initial state is verified=true when sessionStorage has valid matching data', () => {
    const futureUntil = Date.now() + 60_000;
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedSessionId', 'session-hydrated');
    window.sessionStorage.setItem('silverlink.scan.verifiedElderId', 'elder-hydrated');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(futureUntil));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'qr-token-123456');

    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);
    expect(screen.getByText('verified:true')).toBeInTheDocument();
    expect(screen.getByText('session:session-hydrated')).toBeInTheDocument();
    expect(screen.getByText('elder:elder-hydrated')).toBeInTheDocument();
  });

  it('setVerified(false) clears verification state and sessionStorage', () => {
    vi.useFakeTimers();
    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'verify' }));
    expect(screen.getByText('verified:true')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'set unverified' }));
    expect(screen.getByText('verified:false')).toBeInTheDocument();
    expect(screen.getByText('session:-')).toBeInTheDocument();
    expect(screen.getByText('elder:-')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('silverlink.scan.verified')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedSessionId')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedElderId')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedUntil')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedQrToken')).toBeNull();
  });

  it('initial verified is false when readQrToken returns null', () => {
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() + 60_000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'qr-token-123456');

    mockReadQrToken.mockReturnValue(null);
    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);
    expect(screen.getByText('verified:false')).toBeInTheDocument();
  });

  it('mismatched verifiedQrToken yields empty verifiedSessionId and verifiedElderId', () => {
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedSessionId', 'session-old');
    window.sessionStorage.setItem('silverlink.scan.verifiedElderId', 'elder-old');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() + 60_000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'wrong-token');

    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);
    expect(screen.getByText('verified:false')).toBeInTheDocument();
    expect(screen.getByText('session:-')).toBeInTheDocument();
    expect(screen.getByText('elder:-')).toBeInTheDocument();
  });

  it('initial verified is false when verifiedUntil is expired in sessionStorage', () => {
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() - 1000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'qr-token-123456');

    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);
    expect(screen.getByText('verified:false')).toBeInTheDocument();
  });

  it('setVerified(true) stores verification without sessionId or elderId', () => {
    vi.useFakeTimers();
    render(<SecurityProvider><SecurityProbe /></SecurityProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'set verified' }));
    expect(screen.getByText('verified:true')).toBeInTheDocument();
    expect(screen.getByText('session:-')).toBeInTheDocument();
    expect(screen.getByText('elder:-')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('silverlink.scan.verified')).toBe('1');
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedSessionId')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedElderId')).toBeNull();
    expect(window.sessionStorage.getItem('silverlink.scan.verifiedQrToken')).toBe('qr-token-123456');
  });

  it('router redirects protected /health to /verify when unverified', () => {
    window.location.hash = '#/health';
    const router = createAppRouter(
      <p>basic</p>,
      <p>verify page</p>,
      <p>health page</p>,
      <p>medication</p>,
      <p>scale</p>,
      <p>scale detail</p>,
      <p>nameplate</p>,
    );

    render(<SecurityProvider><RouterProvider router={router} /></SecurityProvider>);
    expect(screen.getByText('verify page')).toBeInTheDocument();
    expect(screen.queryByText('health page')).not.toBeInTheDocument();
  });

  it('router shows protected /health content when verified', () => {
    window.sessionStorage.setItem('silverlink.scan.verified', '1');
    window.sessionStorage.setItem('silverlink.scan.verifiedUntil', String(Date.now() + 60_000));
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'qr-token-123456');
    window.location.hash = '#/health';

    const router = createAppRouter(
      <p>basic</p>,
      <p>verify page</p>,
      <p>health page</p>,
      <p>medication</p>,
      <p>scale</p>,
      <p>scale detail</p>,
      <p>nameplate</p>,
    );

    render(<SecurityProvider><RouterProvider router={router} /></SecurityProvider>);
    expect(screen.getByText('health page')).toBeInTheDocument();
  });

  it('router renders /nameplate without verification', () => {
    window.location.hash = '#/nameplate';
    const router = createAppRouter(
      <p>basic</p>,
      <p>verify page</p>,
      <p>health page</p>,
      <p>medication</p>,
      <p>scale</p>,
      <p>scale detail</p>,
      <p>nameplate page</p>,
    );

    render(<SecurityProvider><RouterProvider router={router} /></SecurityProvider>);
    expect(screen.getByText('nameplate page')).toBeInTheDocument();
  });

  it('router redirects unknown route to /404', () => {
    window.location.hash = '#/nonexistent';
    const router = createAppRouter(
      <p>basic</p>,
      <p>verify page</p>,
      <p>health page</p>,
      <p>medication</p>,
      <p>scale</p>,
      <p>scale detail</p>,
      <p>nameplate page</p>,
    );

    render(<SecurityProvider><RouterProvider router={router} /></SecurityProvider>);
    expect(screen.getByText('该二维码已经过期')).toBeInTheDocument();
  });
});
