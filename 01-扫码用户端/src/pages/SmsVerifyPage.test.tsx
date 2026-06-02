import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmsVerifyPage } from './SmsVerifyPage';

const clearVerification = vi.fn();
const setGlobalVerified = vi.fn();
const startAuthTimer = vi.fn();
const startRelayVerification = vi.fn();
const getRelayVerificationStatus = vi.fn();
const confirmRelayVerificationSent = vi.fn();
const verifyIdentityAccess = vi.fn();

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
  verifyIdentityAccess: (...args: unknown[]) => verifyIdentityAccess(...args),
}));

vi.mock('../config/env', () => ({
  ALLOW_LOCAL_VERIFICATION_FALLBACK: false,
}));

describe('SmsVerifyPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearVerification.mockReset();
    setGlobalVerified.mockReset();
    startAuthTimer.mockReset();
    startRelayVerification.mockReset();
    getRelayVerificationStatus.mockReset();
    confirmRelayVerificationSent.mockReset();
    verifyIdentityAccess.mockReset();
  });

  it('creates SMS session, copies content, opens SMS and completes verified status', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-1',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL ABC123',
      status: 'PENDING',
    });
    getRelayVerificationStatus.mockResolvedValue({
      sessionId: 'session-1',
      elderId: 'elder-1',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();

    expect(await screen.findByText('13800001111')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /复制内容/ }));
    expect(writeText).toHaveBeenCalledWith('SL ABC123');

    await user.click(screen.getByRole('button', { name: /打开短信/ }));
    expect(screen.getByText(/如果没有自动打开短信/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /我已发送/ }));
    await waitFor(() => expect(setGlobalVerified).toHaveBeenCalledWith('session-1', 'elder-1'));
    expect(startAuthTimer).toHaveBeenCalledTimes(1);
    expect(screen.getByText('health page')).toBeInTheDocument();
    expect(confirmRelayVerificationSent).not.toHaveBeenCalled();
  });

  it('shows SMS creation and status errors', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockRejectedValueOnce(new Error('network'));
    const { unmount } = renderVerifyPage();
    expect(await screen.findByText('无法创建验证会话，请稍后重试')).toBeInTheDocument();
    unmount();

    startRelayVerification.mockResolvedValue({
      sessionId: 'session-2',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL WAIT',
      status: 'PENDING',
    });
    getRelayVerificationStatus.mockResolvedValue({ sessionId: 'session-2', status: 'PENDING', verified: false });
    renderVerifyPage();
    expect(await screen.findByText('SL WAIT')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /我已发送/ }));
    expect(await screen.findByText('暂未收到验证结果，请发送短信后再检查')).toBeInTheDocument();

    getRelayVerificationStatus.mockResolvedValueOnce({ sessionId: 'session-2', status: 'EXPIRED', verified: false });
    await user.click(screen.getByRole('button', { name: /我已发送/ }));
    expect(await screen.findByText('本次验证已过期，请重新发起验证')).toBeInTheDocument();
  });

  it('validates identity fields and submits verified identity access', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-3',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL ID',
      status: 'PENDING',
    });
    verifyIdentityAccess.mockResolvedValue({
      sessionId: 'identity-session-1',
      elderId: 'elder-1',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(screen.getByText('请输入姓名')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '孙一洋');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '2434');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(screen.getByText('请输入符合规范的身份证号')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('请输入符合规范的身份证号'));
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '500102200212180836');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));

    await waitFor(() => expect(verifyIdentityAccess).toHaveBeenCalledWith('health', {
      name: '孙一洋',
      phone: '15826216543',
      idCard: '500102200212180836',
    }));
    expect(setGlobalVerified).toHaveBeenCalledWith('identity-session-1', 'elder-1');
    expect(screen.getByText('health page')).toBeInTheDocument();
  });

  it('rejects identity verification when API returns mismatch or failure', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-4',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL ID',
      status: 'PENDING',
    });
    verifyIdentityAccess
      .mockResolvedValueOnce({ sessionId: 'bad-session', elderId: 'elder-2', status: 'VERIFIED', verified: true })
      .mockResolvedValueOnce({ sessionId: 'fail-session', elderId: 'elder-1', status: 'PENDING', verified: false })
      .mockRejectedValueOnce(new Error('服务异常'));

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));
    await fillValidIdentity(user);

    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(await screen.findByText('验证会话与当前二维码不一致，请重新扫码后再试')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(await screen.findByText('身份信息校验未通过，请稍后重试')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(await screen.findByText('服务异常')).toBeInTheDocument();
  });

  it('shows clipboard failure error when copy fails', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-5',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL COPY',
      status: 'PENDING',
    });

    renderVerifyPage();
    expect(await screen.findByText('SL COPY')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /复制内容/ }));
    expect(await screen.findByText('复制失败，请手动选择短信内容')).toBeInTheDocument();
  });

  it('rejects SMS verification when elder ID mismatches', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-6',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL MISMATCH',
      status: 'PENDING',
    });
    getRelayVerificationStatus.mockResolvedValue({
      sessionId: 'session-6',
      elderId: 'elder-2',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();
    expect(await screen.findByText('SL MISMATCH')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /我已发送/ }));
    expect(await screen.findByText('验证会话与当前二维码不一致，请重新扫码后再试')).toBeInTheDocument();
  });

  it('shows check status error on network failure', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-7',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL ERR',
      status: 'PENDING',
    });
    getRelayVerificationStatus.mockRejectedValue(new Error('network'));

    renderVerifyPage();
    expect(await screen.findByText('SL ERR')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /我已发送/ }));
    expect(await screen.findByText('检查验证结果失败，请稍后重试')).toBeInTheDocument();
  });

  it('validates phone number format in identity form', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-8',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL PHONE',
      status: 'PENDING',
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '测试');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '1234567');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '500102200212180836');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(screen.getByText('请输入 11 位数字手机号')).toBeInTheDocument();
  });

  it('switches back from identity mode to sms mode', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-9',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL SWITCH',
      status: 'PENDING',
    });

    renderVerifyPage();
    expect(await screen.findByText('SL SWITCH')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '切换到证件登记验证' }));
    expect(screen.getByText('身份登记')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '切换到短信验证' }));
    expect(screen.getByText('短信验证')).toBeInTheDocument();
  });

  it('renders session without messageBody gracefully', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-10',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: '',
      status: 'PENDING',
    });

    renderVerifyPage();
    expect(await screen.findByText('13800001111')).toBeInTheDocument();
    expect(screen.getByText('未生成短信内容')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /复制内容/ })).toBeDisabled();
  });

  it('validates 15-digit id card as valid', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-15id',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL 15ID',
      status: 'PENDING',
    });
    verifyIdentityAccess.mockResolvedValue({
      sessionId: 'id-15',
      elderId: 'elder-1',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '测试');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '123456789012345');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(screen.queryByText('请输入符合规范的身份证号')).not.toBeInTheDocument();
  });

  it('rejects 18-digit id card with invalid checksum', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-badid',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL BADID',
      status: 'PENDING',
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '测试');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '500102200212180830');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(screen.getByText('请输入符合规范的身份证号')).toBeInTheDocument();
  });

  it('rejects id card with wrong length format', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-wronglen',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL LEN',
      status: 'PENDING',
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '测试');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '12345678');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(screen.getByText('请输入符合规范的身份证号')).toBeInTheDocument();
  });

  it('normalizes id card to uppercase on submit', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-upper',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL UPPER',
      status: 'PENDING',
    });
    verifyIdentityAccess.mockResolvedValue({
      sessionId: 'id-upper',
      elderId: 'elder-1',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '测试');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '11010119900307803x');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));

    await waitFor(() => expect(verifyIdentityAccess).toHaveBeenCalledWith('health', expect.objectContaining({
      idCard: '11010119900307803X',
    })));
  });

  it('normalizes phone by stripping non-digits on submit', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-normphone',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL NORM',
      status: 'PENDING',
    });
    verifyIdentityAccess.mockResolvedValue({
      sessionId: 'id-normphone',
      elderId: 'elder-1',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '测试');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '11010119900307803X');

    const phoneInput = screen.getByPlaceholderText('请输入 11 位数字手机号');
    expect(phoneInput).toHaveValue('15826216543');

    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));

    await waitFor(() => expect(verifyIdentityAccess).toHaveBeenCalledWith('health', expect.objectContaining({
      phone: '15826216543',
    })));
  });

  it('trims name whitespace on submit', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-trim',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL TRIM',
      status: 'PENDING',
    });
    verifyIdentityAccess.mockResolvedValue({
      sessionId: 'id-trim',
      elderId: 'elder-1',
      status: 'VERIFIED',
      verified: true,
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    await user.type(screen.getByPlaceholderText('请输入真实姓名'), '  测试  ');
    await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
    await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '500102200212180836');
    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));

    await waitFor(() => expect(verifyIdentityAccess).toHaveBeenCalledWith('health', expect.objectContaining({
      name: '测试',
    })));
  });

  it('shows non-Error message when identity submit throws string', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-strerr',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL STR',
      status: 'PENDING',
    });
    verifyIdentityAccess.mockRejectedValue('string error');

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));
    await fillValidIdentity(user);

    await user.click(screen.getByRole('button', { name: /登记信息并查看/ }));
    expect(await screen.findByText('提交身份信息失败，请稍后重试')).toBeInTheDocument();
  });

  it('renders identity mode without loading state', async () => {
    const user = userEvent.setup();
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-idmode',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL IDMODE',
      status: 'PENDING',
    });

    renderVerifyPage();
    await user.click(await screen.findByRole('button', { name: '切换到证件登记验证' }));

    expect(screen.queryByText(/正在生成验证短信内容/)).not.toBeInTheDocument();
    expect(screen.getByText('身份登记')).toBeInTheDocument();
  });

  it('uses default target when no target param', async () => {
    startRelayVerification.mockResolvedValue({
      sessionId: 'session-notarget',
      elderId: 'elder-1',
      receiverPhone: '13800001111',
      messageBody: 'SL NOTARGET',
      status: 'PENDING',
    });

    render(
      <MemoryRouter initialEntries={['/verify']}>
        <Routes>
          <Route path="/verify" element={<SmsVerifyPage />} />
          <Route path="/health" element={<p>health page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(startRelayVerification).toHaveBeenCalledWith('health'));
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

async function fillValidIdentity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('请输入真实姓名'), '孙一洋');
  await user.type(screen.getByPlaceholderText('请输入 11 位数字手机号'), '15826216543');
  await user.type(screen.getByPlaceholderText('请输入符合规范的身份证号'), '500102200212180836');
}
