import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SmsVerifyPage from './SmsVerifyPage';

const store = vi.hoisted(() => {
  type Listener = () => void;
  const listeners: Listener[] = [];
  let state = {
    phone: '',
    maskedPhone: '',
    countdown: 60,
    canResend: false,
    backupPhone: null as string | null,
    backupCountdown: 120,
    canSwitchBackup: false,
    verified: false,
  };
  const notify = () => listeners.forEach((listener) => listener());
  return { state, listeners, notify };
});

const sendSmsCode = vi.fn();
const verifySmsCode = vi.fn();
const sendInvitationSms = vi.fn();
const registerWithInvitation = vi.fn();
const resetCountdown = vi.fn();
const switchToBackup = vi.fn(() => {
  if (!store.state.backupPhone || !store.state.canSwitchBackup) return;
  store.state = {
    ...store.state,
    phone: store.state.backupPhone,
    maskedPhone: maskPhone(store.state.backupPhone),
    countdown: 60,
    canResend: false,
    canSwitchBackup: false,
    backupCountdown: 0,
  };
  store.notify();
});
const setVerified = vi.fn((verified: boolean) => {
  store.state = { ...store.state, verified };
  store.notify();
});

vi.mock('../api/smsApi', () => ({
  sendSmsCode: (...args: unknown[]) => sendSmsCode(...args),
  verifySmsCode: (...args: unknown[]) => verifySmsCode(...args),
}));

vi.mock('../api/invitationApi', () => ({
  sendInvitationSms: (...args: unknown[]) => sendInvitationSms(...args),
  registerWithInvitation: (...args: unknown[]) => registerWithInvitation(...args),
}));

vi.mock('../features/verification/verificationStore', () => ({
  subscribe: (listener: () => void) => {
    store.listeners.push(listener);
    return () => {
      const index = store.listeners.indexOf(listener);
      if (index >= 0) store.listeners.splice(index, 1);
    };
  },
  getVerificationState: () => store.state,
  initVerification: (phone: string, backupPhone?: string) => {
    store.state = {
      phone,
      maskedPhone: maskPhone(phone),
      countdown: 60,
      canResend: false,
      backupPhone: backupPhone || null,
      backupCountdown: 120,
      canSwitchBackup: false,
      verified: false,
    };
    store.notify();
  },
  resetCountdown: (...args: unknown[]) => resetCountdown(...args),
  switchToBackup: (...args: unknown[]) => switchToBackup(...args),
  setVerified: (...args: unknown[]) => setVerified(...args),
}));

describe('family SmsVerifyPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sendSmsCode.mockReset();
    verifySmsCode.mockReset();
    sendInvitationSms.mockReset();
    registerWithInvitation.mockReset();
    resetCountdown.mockReset();
    switchToBackup.mockClear();
    setVerified.mockClear();
    store.state = {
      phone: '',
      maskedPhone: '',
      countdown: 60,
      canResend: false,
      backupPhone: null,
      backupCountdown: 120,
      canSwitchBackup: false,
      verified: false,
    };
    store.listeners.splice(0, store.listeners.length);
  });

  it('redirects to login when required state is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/verify']}>
        <Routes>
          <Route path="/verify" element={<SmsVerifyPage />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('sends normal SMS, resends and switches to backup phone', async () => {
    const user = userEvent.setup();
    sendSmsCode.mockResolvedValue({ success: true, message: '验证码已发送' });
    verifySmsCode.mockResolvedValue({ success: true, message: '验证成功' });

    renderWithState({ phone: '13800006666', backupPhone: '13900007777' });
    expect(await screen.findByText('138****6666')).toBeInTheDocument();
    expect(sendSmsCode).toHaveBeenCalledWith('13800006666');

    store.state = { ...store.state, canResend: true };
    store.notify();
    await user.click(await screen.findByRole('button', { name: '重新发送' }));
    expect(sendSmsCode).toHaveBeenLastCalledWith('13800006666');
    expect(resetCountdown).toHaveBeenCalledTimes(1);

    store.state = { ...store.state, canSwitchBackup: true };
    store.notify();
    await user.click(await screen.findByRole('button', { name: '切换备用手机号' }));
    expect(switchToBackup).toHaveBeenCalledTimes(1);
    expect(sendSmsCode).toHaveBeenLastCalledWith('13900007777');

    await typeCode(user, '123456');
    await waitFor(() => expect(verifySmsCode).toHaveBeenCalledWith('13900007777', '123456'));
    expect(setVerified).toHaveBeenCalledWith(true);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('registers with invitation after SMS completion', async () => {
    const user = userEvent.setup();
    sendInvitationSms.mockResolvedValue({ success: true, message: '验证码已发送' });
    registerWithInvitation.mockResolvedValue({ success: true, message: '注册成功' });

    renderWithState({
      code: 'INVITE001',
      name: '孙一洋',
      phone: '15826216543',
      relationship: '子女',
      password: 'Passw0rd!',
    });
    expect(await screen.findByText('158****6543')).toBeInTheDocument();
    expect(sendInvitationSms).toHaveBeenCalledWith('INVITE001', '15826216543');

    await typeCode(user, '654321');
    await waitFor(() => expect(registerWithInvitation).toHaveBeenCalledWith({
      code: 'INVITE001',
      name: '孙一洋',
      phone: '15826216543',
      relationship: '子女',
      password: 'Passw0rd!',
      smsCode: '654321',
    }));
    expect(setVerified).toHaveBeenCalledWith(true);
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('shows alerts when SMS or verification operations fail', async () => {
    const user = userEvent.setup();
    const alert = vi.fn();
    vi.stubGlobal('alert', alert);
    sendInvitationSms.mockResolvedValue({ success: false, message: '发送失败' });
    registerWithInvitation.mockResolvedValue({ success: false, message: '注册失败' });

    renderWithState({
      code: 'INVITE002',
      name: '孙一洋',
      phone: '15826216543',
      relationship: '子女',
      password: 'Passw0rd!',
    });

    await waitFor(() => expect(alert).toHaveBeenCalledWith('发送失败'));
    await typeCode(user, '111111');
    await waitFor(() => expect(alert).toHaveBeenCalledWith('注册失败'));
  });
});

function renderWithState(state: Record<string, string>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/verify', state }]}>
      <Routes>
        <Route path="/verify" element={<SmsVerifyPage />} />
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  const inputs = screen.getAllByRole('textbox');
  for (let index = 0; index < code.length; index += 1) {
    await user.type(inputs[index], code[index]);
  }
}

function maskPhone(phone: string) {
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
}
