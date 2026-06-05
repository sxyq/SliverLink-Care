import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmsRelayManagePage } from './SmsRelayManagePage';
import { InvitationManagePage } from './InvitationManagePage';
import { SecuritySettingsPage } from './SecuritySettingsPage';
import { FamilyBindingManagePage } from './FamilyBindingManagePage';

const fetchSmsRelayDevices = vi.fn();
const fetchSmsRelayRecords = vi.fn();
const fetchSmsRelaySessions = vi.fn();
const updateSmsRelayDevice = vi.fn();
const fetchFamilyBindings = vi.fn();
const unbindFamily = vi.fn();
const exportToCsv = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchSmsRelayDevices: (...args: unknown[]) => fetchSmsRelayDevices(...args),
  fetchSmsRelayRecords: (...args: unknown[]) => fetchSmsRelayRecords(...args),
  fetchSmsRelaySessions: (...args: unknown[]) => fetchSmsRelaySessions(...args),
  updateSmsRelayDevice: (...args: unknown[]) => updateSmsRelayDevice(...args),
  fetchFamilyBindings: (...args: unknown[]) => fetchFamilyBindings(...args),
  unbindFamily: (...args: unknown[]) => unbindFamily(...args),
}));

vi.mock('../components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('../components/InvitationManageSection', () => ({
  InvitationManageSection: () => <div>InvitationManageSection</div>,
}));

vi.mock('../utils/exportCsv', () => ({
  exportToCsv: (...args: unknown[]) => exportToCsv(...args),
}));

describe('SmsRelayManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSmsRelayDevices.mockResolvedValue([
      {
        deviceId: 'device-1',
        receiverPhone: '13800000000',
        serverUrl: 'https://server-a',
        messagePrefix: '【验证】',
        status: '在线',
        serviceStatus: '后台服务运行中',
        lastHeartbeat: '2026-05-26 09:00:00',
      },
    ]);
    fetchSmsRelayRecords.mockResolvedValue([
      {
        id: 'record-1',
        deviceId: 'device-1',
        receiverPhone: '13800000000',
        senderPhone: '13911112222',
        messageBody: '验证码 123456',
        receivedAt: '2026-05-26 09:00:01',
        uploadedAt: '2026-05-26 09:00:02',
        status: '已上传',
      },
    ]);
    fetchSmsRelaySessions.mockResolvedValue([
      {
        sessionId: 'session-1',
        elderId: 'elder-1',
        target: 'health',
        relayDeviceId: 'device-1',
        receiverPhone: '13800000000',
        messageBody: '验证码 123456',
        status: '已验证',
        expiresAt: '2026-05-26 09:05:00',
        verifiedAt: '2026-05-26 09:01:00',
        senderPhoneMasked: '139****2222',
        createdAt: '2026-05-26 09:00:00',
      },
    ]);
    updateSmsRelayDevice.mockResolvedValue({
      deviceId: 'device-1',
      receiverPhone: '13900000000',
      serverUrl: 'https://server-b',
      messagePrefix: '【新前缀】',
      status: '在线',
      serviceStatus: '后台服务运行中',
      lastHeartbeat: '2026-05-26 09:10:00',
    });
  });

  it('loads relay data, filters records and saves device config', async () => {
    render(<SmsRelayManagePage />);

    expect(await screen.findByText('短信中转管理')).toBeInTheDocument();
    expect((await screen.findAllByText('验证码 123456')).length).toBeGreaterThan(0);
    expect(screen.getByText('设备总数')).toBeInTheDocument();
    expect(screen.getByText('在线设备')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('搜索设备、手机号或短信内容');
    fireEvent.change(searchInput, { target: { value: '1391111' } });
    expect(screen.getAllByText('验证码 123456').length).toBeGreaterThan(0);

    const serverUrlInputs = screen.getAllByDisplayValue('https://server-a');
    fireEvent.change(serverUrlInputs[0], { target: { value: 'https://server-b' } });
    const phoneInputs = screen.getAllByDisplayValue('13800000000');
    fireEvent.change(phoneInputs[0], { target: { value: '13900000000' } });
    fireEvent.change(screen.getByDisplayValue('【验证】'), { target: { value: '【新前缀】' } });
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(updateSmsRelayDevice).toHaveBeenCalledWith('device-1', {
        receiverPhone: '13900000000',
        serverUrl: 'https://server-b',
        messagePrefix: '【新前缀】',
      });
      expect(screen.getByDisplayValue('https://server-b')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => {
      expect(fetchSmsRelayDevices).toHaveBeenCalledTimes(2);
      expect(fetchSmsRelayRecords).toHaveBeenCalledTimes(2);
      expect(fetchSmsRelaySessions).toHaveBeenCalledTimes(2);
    });
  });

  it('shows save error when device update fails', async () => {
    updateSmsRelayDevice.mockRejectedValueOnce(new Error('保存失败'));

    render(<SmsRelayManagePage />);
    await screen.findByText('短信中转管理');
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    expect(await screen.findByText('保存失败')).toBeInTheDocument();
  });
});

describe('simple admin pages', () => {
  it('renders invitation manage page wrapper', () => {
    render(<InvitationManagePage />);
    expect(screen.getByRole('heading', { name: '邀请码管理' })).toBeInTheDocument();
    expect(screen.getByText('InvitationManageSection')).toBeInTheDocument();
  });

  it('renders security settings modules', () => {
    render(<SecuritySettingsPage />);
    expect(screen.getByText('安全策略')).toBeInTheDocument();
    expect(screen.getByText('HTTPS')).toBeInTheDocument();
    expect(screen.getByText('JWT 短时 Token')).toBeInTheDocument();
    expect(screen.getByText('AES-256-GCM')).toBeInTheDocument();
  });
});

describe('FamilyBindingManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchFamilyBindings.mockResolvedValue([
      {
        id: 'binding-1',
        familyName: '张家属',
        familyPhoneMasked: '138****0000',
        relationship: '女儿',
        elderName: '李奶奶',
        elderArchiveNo: 'A-001',
        invitationCode: 'INV-001',
        createMethod: '邀请码注册',
        boundAt: '2026-05-26T09:00:00.000Z',
        status: '已绑定',
      },
      {
        id: 'binding-2',
        familyName: '王家属',
        familyPhoneMasked: '139****1111',
        relationship: '儿子',
        elderName: '赵爷爷',
        elderArchiveNo: 'A-002',
        invitationCode: 'INV-002',
        createMethod: '',
        boundAt: '2026-05-26T10:00:00.000Z',
        status: '已解绑',
      },
    ]);
    unbindFamily.mockResolvedValue(undefined);
  });

  it('loads rows, filters, exports and unbinds family relations', async () => {
    render(<FamilyBindingManagePage />);

    expect(await screen.findByRole('heading', { name: '家属绑定管理' })).toBeInTheDocument();
    expect(await screen.findByText('张家属')).toBeInTheDocument();
    expect(screen.getByText('李奶奶')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('按手机号、老人姓名或档案编号搜索'), {
      target: { value: 'A-001' },
    });
    expect(screen.getByText('张家属')).toBeInTheDocument();
    expect(screen.queryByText('王家属')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '解绑' }));
    await waitFor(() => {
      expect(unbindFamily).toHaveBeenCalledWith('binding-1');
      expect(fetchFamilyBindings).toHaveBeenCalledTimes(2);
    });
  });

  it('covers invalid binding timestamps, default create method and silent load failure branch', async () => {
    fetchFamilyBindings
      .mockResolvedValueOnce([
        {
          id: 'binding-invalid',
          familyName: '空时间家属',
          familyPhoneMasked: '136****2222',
          relationship: '配偶',
          elderName: '空时间老人',
          elderArchiveNo: 'A-010',
          invitationCode: '',
          createMethod: '',
          boundAt: 'bad-time',
          status: '已解绑',
        },
        {
          id: 'binding-empty',
          familyName: '缺失时间家属',
          familyPhoneMasked: '135****3333',
          relationship: '儿子',
          elderName: '缺失时间老人',
          elderArchiveNo: 'A-011',
          invitationCode: 'INV-011',
          createMethod: '后台导入',
          boundAt: '',
          status: '已绑定',
        },
      ])
      .mockRejectedValueOnce(new Error('load failed'));

    const first = render(<FamilyBindingManagePage />);
    expect(await screen.findByText('空时间家属')).toBeInTheDocument();
    expect(screen.getByText('bad-time')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledWith(
      expect.stringMatching(/^family-bindings-/),
      expect.arrayContaining([
        expect.objectContaining({ 创建方式: '邀请码注册' }),
        expect.objectContaining({ 创建方式: '后台导入' }),
      ]),
    );
    first.unmount();

    render(<FamilyBindingManagePage />);
    expect(await screen.findByRole('heading', { name: '家属绑定管理' })).toBeInTheDocument();
    expect(screen.queryByText('空时间家属')).not.toBeInTheDocument();
  });
});
