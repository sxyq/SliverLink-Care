import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QrCodeManagePage } from './QrCodeManagePage';

const fetchQrCodes = vi.fn();
const fetchSmsRelayDevices = vi.fn();
const disableQrCode = vi.fn();
const regenerateQrCode = vi.fn();
const updateQrCodeRelayDevice = vi.fn();
const downloadNameplatePdf = vi.fn();
const toDataURL = vi.fn();
const assignMock = vi.fn();
const openMock = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchQrCodes: (...args: unknown[]) => fetchQrCodes(...args),
  fetchSmsRelayDevices: (...args: unknown[]) => fetchSmsRelayDevices(...args),
  disableQrCode: (...args: unknown[]) => disableQrCode(...args),
  regenerateQrCode: (...args: unknown[]) => regenerateQrCode(...args),
  updateQrCodeRelayDevice: (...args: unknown[]) => updateQrCodeRelayDevice(...args),
  downloadNameplatePdf: (...args: unknown[]) => downloadNameplatePdf(...args),
}));

vi.mock('../components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: (...args: unknown[]) => toDataURL(...args),
  },
}));

describe('QrCodeManagePage edge branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    Object.defineProperty(window, 'open', { configurable: true, value: openMock });
    Object.defineProperty(window, 'location', { configurable: true, value: { assign: assignMock } });
    document.execCommand = vi.fn().mockReturnValue(false);

    fetchSmsRelayDevices.mockResolvedValue([
      { deviceId: 'device-1', receiverPhone: '13800000000', serverUrl: 'https://relay-a', messagePrefix: 'SL', status: '在线', serviceStatus: '运行中', lastHeartbeat: '2026-05-26' },
    ]);
    disableQrCode.mockResolvedValue(undefined);
    updateQrCodeRelayDevice.mockResolvedValue({ relayDeviceId: '', relayReceiverPhone: '' });
  });

  it('covers missing preview url, manual-copy fallback, clear relay binding and regenerate without returned url', async () => {
    fetchQrCodes
      .mockResolvedValueOnce([
        {
          id: 'qr-blank',
          token: 'token-blank',
          archiveNo: 'A-009',
          elderName: '空链接老人',
          elderAge: 75,
          elderPhone: '13800000000',
          relayDeviceId: '',
          relayReceiverPhone: '',
          url: '',
          status: '启用',
          createdAt: '2026-05-26T09:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'qr-open',
          token: 'token-open',
          archiveNo: 'A-010',
          elderName: '打开链接老人',
          elderAge: 76,
          elderPhone: '13900000000',
          relayDeviceId: '',
          relayReceiverPhone: '',
          url: 'https://example.com/scan/10',
          status: '已重新生成',
          createdAt: '2026-05-26T09:10:00Z',
        },
      ]);
    regenerateQrCode.mockResolvedValue({});
    toDataURL.mockResolvedValue('data:image/png;base64,ok');
    openMock.mockReturnValue(null);

    const { unmount } = render(<QrCodeManagePage />);

    expect(await screen.findByText('空链接老人')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看与管理' }));
    expect(
      (await screen.findAllByText('当前二维码尚未保存可用扫码链接；如需更换，请手动点击“重新生成二维码”。')).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '保存短信接收设备' }));
    await waitFor(() => {
      expect(updateQrCodeRelayDevice).toHaveBeenCalledWith('qr-blank', '');
      expect(screen.getByText('已清除扫码短信接收设备绑定，将回退到默认可用设备。')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '重新生成二维码' }));
    expect(await screen.findByText('二维码已重新生成；仅在你明确执行该操作后，打印用二维码才会更新。')).toBeInTheDocument();
    unmount();

    fetchQrCodes.mockClear();
    fetchQrCodes.mockResolvedValue([
      {
        id: 'qr-open',
        token: 'token-open',
        archiveNo: 'A-010',
        elderName: '打开链接老人',
        elderAge: 76,
        elderPhone: '13900000000',
        relayDeviceId: '',
        relayReceiverPhone: '',
        url: 'https://example.com/scan/10',
        status: '已重新生成',
        createdAt: '2026-05-26T09:10:00Z',
      },
    ]);
    render(<QrCodeManagePage />);
    expect(await screen.findByText('打开链接老人')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看与管理' }));
    expect(await screen.findByText('https://example.com/scan/10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '复制链接' }));
    expect(await screen.findByText('当前浏览器限制了自动复制，请长按或手动复制上方链接。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '打开扫码页' }));
    expect(assignMock).toHaveBeenCalledWith('https://example.com/scan/10');
  });

  it('covers relay save failure, search and status filters, and modal close reset', async () => {
    fetchQrCodes.mockResolvedValue([
      {
        id: 'qr-search-1',
        token: 'token-search-1',
        archiveNo: 'A-011',
        elderName: '检索老人',
        elderAge: 67,
        elderPhone: '13700000000',
        relayDeviceId: 'device-1',
        relayReceiverPhone: '13800000000',
        url: 'https://example.com/scan/11',
        status: '已停用',
        createdAt: '2026-05-26T11:00:00Z',
      },
      {
        id: 'qr-search-2',
        token: 'token-search-2',
        archiveNo: 'A-012',
        elderName: '常规老人',
        elderAge: 70,
        elderPhone: '13600000000',
        relayDeviceId: '',
        relayReceiverPhone: '',
        url: 'https://example.com/scan/12',
        status: '启用',
        createdAt: '2026-05-26T11:10:00Z',
      },
    ]);
    updateQrCodeRelayDevice.mockRejectedValueOnce(new Error('绑定失败'));
    toDataURL.mockResolvedValue('data:image/png;base64,ok');

    render(<QrCodeManagePage />);

    expect(await screen.findByText('检索老人')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索二维码 ID、档案编号、老人姓名'), { target: { value: '检索' } });
    fireEvent.change(screen.getByDisplayValue('全部状态'), { target: { value: '已停用' } });
    expect(screen.getByText('检索老人')).toBeInTheDocument();
    expect(screen.queryByText('常规老人')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看与管理' }));
    fireEvent.click(screen.getByRole('button', { name: '保存短信接收设备' }));
    expect(await screen.findByText('绑定失败')).toBeInTheDocument();

    const overlay = document.querySelector('.modal-overlay');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay as Element);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '二维码查看与管理' })).not.toBeInTheDocument();
    });
  });
});
