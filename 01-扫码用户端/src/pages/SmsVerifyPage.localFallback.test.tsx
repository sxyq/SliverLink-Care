import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const clearVerification = vi.fn();
const setGlobalVerified = vi.fn();
const startAuthTimer = vi.fn();
const startRelayVerification = vi.fn();
const getRelayVerificationStatus = vi.fn();
const confirmRelayVerificationSent = vi.fn();

vi.mock('../app/SecurityProvider', () => ({
  useSecurity: () => ({
    verified: false,
    clearVerification,
    verify: setGlobalVerified,
  }),
}));

vi.mock('../features/verification/verificationStore', () => ({
  useVerificationStore: () => ({
    startAuthTimer,
  }),
}));

vi.mock('../api/scanApi', () => ({
  getResolvedElderId: () => 'elder-1',
}));

vi.mock('../api/smsApi', () => ({
  startRelayVerification: (...args: unknown[]) => startRelayVerification(...args),
  getRelayVerificationStatus: (...args: unknown[]) => getRelayVerificationStatus(...args),
  confirmRelayVerificationSent: (...args: unknown[]) => confirmRelayVerificationSent(...args),
  verifyIdentityAccess: vi.fn(),
}));

vi.mock('../config/env', () => ({
  ALLOW_LOCAL_VERIFICATION_FALLBACK: true,
}));

import { SmsVerifyPage } from './SmsVerifyPage';

describe('SmsVerifyPage local fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearVerification.mockReset();
    setGlobalVerified.mockReset();
    startAuthTimer.mockReset();
    startRelayVerification.mockReset();
    getRelayVerificationStatus.mockReset();
    confirmRelayVerificationSent.mockReset();
  });

  it('confirms relay verification before checking status when local fallback is enabled', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-fallback',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL LOCAL',
      status: 'PENDING',
    });
    getRelayVerificationStatus.mockResolvedValue({
      sessionId: 'session-fallback',
      elderId: 'elder-1',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();
    expect(await screen.findByText('SL LOCAL')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /我已发送/ }));

    await waitFor(() => {
      expect(confirmRelayVerificationSent).toHaveBeenCalledWith('session-fallback');
      expect(setGlobalVerified).toHaveBeenCalledWith('session-fallback', 'elder-1');
    });
  });

  it('supports demo bypass tap and keyboard activation after five attempts', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-demo',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL DEMO',
      status: 'PENDING',
    });

    const { container } = renderVerifyPage();
    await screen.findByText('SL DEMO');
    const heroButton = container.querySelector('.sl-verify-hero-icon[role="button"]') as HTMLElement | null;
    expect(heroButton).not.toBeNull();

    fireEvent.keyDown(heroButton!, { key: 'Enter' });
    fireEvent.keyDown(heroButton!, { key: ' ' });
    fireEvent.click(heroButton!);
    fireEvent.click(heroButton!);
    fireEvent.click(heroButton!);

    await waitFor(() => {
      expect(setGlobalVerified).toHaveBeenCalledWith('local-relay-demo-1234567890', 'elder-1');
      expect(startAuthTimer).toHaveBeenCalledTimes(1);
      expect(screen.getByText('health page')).toBeInTheDocument();
    });
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('Cannot update a component while rendering a different component'),
    );
  });
});

function renderVerifyPage() {
  return render(
    <MemoryRouter initialEntries={['/verify?target=health']}>
      <Routes>
        <Route path="/verify" element={<SmsVerifyPage />} />
        <Route path="/health" element={<p>health page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
