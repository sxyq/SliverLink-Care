import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QrCodeManagePage } from './QrCodeManagePage';
import { ElderArchivePage } from './ElderArchivePage';

const fetchQrCodes = vi.fn();
const fetchSmsRelayDevices = vi.fn();
const disableQrCode = vi.fn();
const regenerateQrCode = vi.fn();
const updateQrCodeRelayDevice = vi.fn();
const downloadNameplatePdf = vi.fn();
const fetchElders = vi.fn();
const createElder = vi.fn();
const setElderStatus = vi.fn();
const deleteElder = vi.fn();
const exportToCsv = vi.fn();
const toDataURL = vi.fn();
const writeText = vi.fn();
const openMock = vi.fn();
const assignMock = vi.fn();
const confirmMock = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchQrCodes: (...args: unknown[]) => fetchQrCodes(...args),
  fetchSmsRelayDevices: (...args: unknown[]) => fetchSmsRelayDevices(...args),
  disableQrCode: (...args: unknown[]) => disableQrCode(...args),
  regenerateQrCode: (...args: unknown[]) => regenerateQrCode(...args),
  updateQrCodeRelayDevice: (...args: unknown[]) => updateQrCodeRelayDevice(...args),
  downloadNameplatePdf: (...args: unknown[]) => downloadNameplatePdf(...args),
  fetchElders: (...args: unknown[]) => fetchElders(...args),
  createElder: (...args: unknown[]) => createElder(...args),
  setElderStatus: (...args: unknown[]) => setElderStatus(...args),
  deleteElder: (...args: unknown[]) => deleteElder(...args),
}));

vi.mock('../utils/exportCsv', () => ({
  exportToCsv: (...args: unknown[]) => exportToCsv(...args),
}));

vi.mock('../components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: (...args: unknown[]) => toDataURL(...args),
  },
}));

describe('QrCodeManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(window, 'open', { configurable: true, value: openMock });

    fetchQrCodes
      .mockResolvedValueOnce([
        {
          id: 'qr-1',
          elderId: 'elder-1',
          token: 'token-1',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          elderAge: 72,
          elderPhone: '13800000000',
          relayDeviceId: 'device-1',
          relayReceiverPhone: '13800000000',
          url: 'https://example.com/scan/1',
          status: '启用',
          createdAt: '2026-05-26T09:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'qr-1',
          elderId: 'elder-1',
          token: 'token-1',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          elderAge: 72,
          elderPhone: '13800000000',
          relayDeviceId: 'device-2',
          relayReceiverPhone: '13900000000',
          url: 'https://example.com/scan/1',
          status: '已停用',
          createdAt: '2026-05-26T09:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'qr-1',
          elderId: 'elder-1',
          token: 'token-1b',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          elderAge: 72,
          elderPhone: '13800000000',
          relayDeviceId: 'device-2',
          relayReceiverPhone: '13900000000',
          url: 'https://example.com/scan/2',
          status: '已重新生成',
          createdAt: '2026-05-26T09:00:00Z',
        },
      ]);
    fetchSmsRelayDevices.mockResolvedValue([
      {
        deviceId: 'device-1',
        receiverPhone: '13800000000',
        serverUrl: 'https://relay-a',
        messagePrefix: 'SL',
        status: '在线',
        serviceStatus: '运行中',
        lastHeartbeat: '2026-05-26 09:00:00',
      },
      {
        deviceId: 'device-2',
        receiverPhone: '13900000000',
        serverUrl: 'https://relay-b',
        messagePrefix: 'SL',
        status: '在线',
        serviceStatus: '运行中',
        lastHeartbeat: '2026-05-26 09:10:00',
      },
    ]);
    updateQrCodeRelayDevice.mockResolvedValue({
      relayDeviceId: 'device-2',
      relayReceiverPhone: '13900000000',
    });
    disableQrCode.mockResolvedValue(undefined);
    regenerateQrCode.mockResolvedValue({ url: 'https://example.com/scan/2' });
    downloadNameplatePdf.mockResolvedValue(undefined);
    toDataURL.mockResolvedValue('data:image/png;base64,qr');
    writeText.mockResolvedValue(undefined);
    openMock.mockReturnValue({});
  });

  it('covers preview, copy, open, relay binding, disable, regenerate and export', async () => {
    render(<QrCodeManagePage />);

    expect(await screen.findByRole('heading', { name: '二维码管理' })).toBeInTheDocument();
    expect(await screen.findByText('李奶奶')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '查看与管理' }));
    expect(await screen.findByRole('heading', { name: '二维码查看与管理' })).toBeInTheDocument();
    expect(toDataURL).toHaveBeenCalledWith('https://example.com/scan/1', { width: 220, margin: 1 });

    fireEvent.click(screen.getByRole('button', { name: '复制链接' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://example.com/scan/1');
      expect(screen.getByText('扫码访问链接已复制。')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '打开扫码页' }));
    expect(openMock).toHaveBeenCalledWith('https://example.com/scan/1', '_blank', 'noopener,noreferrer');

    fireEvent.click(screen.getByRole('button', { name: '导出名牌 PDF' }));
    await waitFor(() => {
      expect(downloadNameplatePdf).toHaveBeenCalledWith('elder-1');
      expect(screen.getByText('名牌 PDF 已开始下载。')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('device-1 · 13800000000'), { target: { value: 'device-2' } });
    fireEvent.click(screen.getByRole('button', { name: '保存短信接收设备' }));
    await waitFor(() => {
      expect(updateQrCodeRelayDevice).toHaveBeenCalledWith('qr-1', 'device-2');
      expect(screen.getByText('扫码短信接收设备已更新。')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '停用二维码' }));
    await waitFor(() => {
      expect(disableQrCode).toHaveBeenCalledWith('qr-1');
      expect(screen.getByText('二维码已停用，当前打印码不再放行扫码访问。')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '重新生成二维码' }));
    await waitFor(() => {
      expect(regenerateQrCode).toHaveBeenCalledWith('qr-1');
      expect(screen.getByText('二维码已重新生成；仅在你明确执行该操作后，打印用二维码才会更新。')).toBeInTheDocument();
    });
  });
});

describe('ElderArchivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'confirm', { configurable: true, value: confirmMock });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: assignMock },
    });

    fetchElders
      .mockResolvedValueOnce([
        {
          id: 'elder-1',
          archiveNo: 'A-001',
          name: '李奶奶',
          gender: '女',
          age: 72,
          residence: '上海',
          phoneMasked: '138****0000',
          aboType: 'A',
          rhType: '阳性',
          volunteer: '王志愿者',
          status: '启用',
        },
      ])
      .mockResolvedValue([
        {
          id: 'elder-1',
          archiveNo: 'A-001',
          name: '李奶奶',
          gender: '女',
          age: 72,
          residence: '上海',
          phoneMasked: '138****0000',
          aboType: 'A',
          rhType: '阳性',
          volunteer: '王志愿者',
          status: '启用',
        },
      ]);
    createElder.mockResolvedValue({ id: 'elder-2' });
    setElderStatus.mockResolvedValue(undefined);
    deleteElder.mockResolvedValue(undefined);
    confirmMock.mockReturnValue(true);
  });

  it('covers create validation, custom blood types, export, navigation, status toggle and delete', async () => {
    render(<ElderArchivePage />);

    expect(await screen.findByRole('heading', { name: '老人档案' })).toBeInTheDocument();
    expect(await screen.findByText('李奶奶')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledTimes(1);

    const row = screen.getByText('李奶奶').closest('tr');
    expect(row).not.toBeNull();
    const rowActions = within(row as HTMLElement);

    fireEvent.click(rowActions.getByRole('button', { name: '用药信息' }));
    expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('medications?elderId=elder-1'));
    fireEvent.click(rowActions.getByRole('button', { name: '量表信息' }));
    expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('scales?elderId=elder-1'));

    fireEvent.click(screen.getByRole('button', { name: '新增档案' }));
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));
    expect(await screen.findByText('请填写老人姓名')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '新老人' } });
    fireEvent.change(screen.getByLabelText('年龄'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('联系电话'), { target: { value: '13812345678' } });
    fireEvent.change(screen.getByLabelText('居住地'), { target: { value: '杭州' } });
    fireEvent.change(screen.getByLabelText('紧急联系人'), { target: { value: '张家属' } });
    fireEvent.change(screen.getByLabelText('与老人关系'), { target: { value: '女儿' } });
    fireEvent.change(screen.getAllByDisplayValue('未填写')[0], { target: { value: '__OTHER_ABO__' } });
    fireEvent.change(screen.getByPlaceholderText('请输入 ABO 血型'), { target: { value: '稀有型' } });
    fireEvent.change(screen.getAllByDisplayValue('未填写')[0], { target: { value: '__OTHER_RH__' } });
    fireEvent.change(screen.getByPlaceholderText('请输入 Rh 血型'), { target: { value: '弱阳性' } });
    fireEvent.change(screen.getByLabelText('过敏史'), { target: { value: '青霉素' } });
    fireEvent.change(screen.getByPlaceholderText('不填写则自动生成'), { target: { value: 'A-009' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    await waitFor(() => {
      expect(createElder).toHaveBeenCalledWith({
        archiveNo: 'A-009',
        name: '新老人',
        gender: '男',
        age: 75,
        residence: '杭州',
        emergencyContactName: '张家属',
        emergencyPhone: '13812345678',
        relationship: '女儿',
        aboType: '稀有型',
        rhType: '弱阳性',
        allergySummary: '青霉素',
      });
    });

    fireEvent.click(rowActions.getByRole('button', { name: '停用' }));
    await waitFor(() => {
      expect(setElderStatus).toHaveBeenCalledWith('elder-1', 'DISABLED');
    });

    fireEvent.click(rowActions.getByRole('button', { name: '删除' }));
    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalled();
      expect(deleteElder).toHaveBeenCalledWith('elder-1');
    });
  });

  it('covers invalid age/phone, delete cancel and row actions without id', async () => {
    fetchElders.mockReset();
    fetchElders.mockResolvedValue([
      {
        id: '',
        archiveNo: 'A-VOID',
        name: '无编号老人',
        gender: '男',
        age: 65,
        residence: '',
        phoneMasked: '-',
        aboType: '',
        rhType: '',
        volunteer: '-',
        status: '停用',
      },
    ]);
    confirmMock.mockReturnValue(false);

    render(<ElderArchivePage />);

    expect(await screen.findByText('无编号老人')).toBeInTheDocument();
    const row = screen.getByText('无编号老人').closest('tr');
    expect(row).not.toBeNull();
    const actions = within(row as HTMLElement);

    fireEvent.click(actions.getByRole('button', { name: '启用' }));
    fireEvent.click(actions.getByRole('button', { name: '删除' }));
    expect(setElderStatus).not.toHaveBeenCalled();
    expect(deleteElder).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '新增档案' }));
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '边界老人' } });
    fireEvent.change(screen.getByLabelText('年龄'), { target: { value: '131' } });
    fireEvent.change(screen.getByLabelText('联系电话'), { target: { value: '1380000' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));
    expect(await screen.findByText('请填写有效年龄')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('年龄'), { target: { value: '88' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));
    expect(await screen.findByText('请填写有效联系电话')).toBeInTheDocument();
  });

  it('covers elder search trim, status filter, preset blood-type selections and dialog close', async () => {
    fetchElders.mockReset();
    fetchElders.mockResolvedValue([
      {
        id: 'elder-1',
        archiveNo: 'A-001',
        name: '李奶奶',
        gender: '女',
        age: 72,
        residence: '上海',
        phoneMasked: '138****0000',
        aboType: 'A',
        rhType: '阳性',
        volunteer: '王志愿者',
        status: '启用',
      },
      {
        id: 'elder-2',
        archiveNo: 'A-002',
        name: '张爷爷',
        gender: '男',
        age: 80,
        residence: '重庆',
        phoneMasked: '137****0000',
        aboType: 'B',
        rhType: '阴性',
        volunteer: '李志愿者',
        status: '停用',
      },
    ]);

    render(<ElderArchivePage />);

    expect(await screen.findByText('李奶奶')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索姓名或档案编号'), { target: { value: ' 张爷爷 ' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    fireEvent.change(screen.getByDisplayValue('全部状态'), { target: { value: '停用' } });
    expect(screen.getByText('张爷爷')).toBeInTheDocument();
    expect(screen.queryByText('李奶奶')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '新增档案' }));
    const createDialog = screen.getByRole('heading', { name: '新增老人档案' }).closest('.modal-content');
    expect(createDialog).not.toBeNull();
    const selects = within(createDialog as HTMLElement).getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '女' } });
    fireEvent.change(selects[1], { target: { value: 'A' } });
    fireEvent.change(selects[2], { target: { value: '阳性' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '新增老人档案' })).not.toBeInTheDocument();
    });
  });

  it('closes create dialog when clicking overlay', async () => {
    fetchElders.mockReset();
    fetchElders.mockResolvedValue([
      {
        id: 'elder-1',
        archiveNo: 'A-001',
        name: '李奶奶',
        gender: '女',
        age: 72,
        residence: '上海',
        phoneMasked: '138****0000',
        aboType: 'A',
        rhType: '阳性',
        volunteer: '王志愿者',
        status: '启用',
      },
    ]);

    const { container } = render(<ElderArchivePage />);

    expect(await screen.findByText('李奶奶')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新增档案' }));
    expect(await screen.findByRole('heading', { name: '新增老人档案' })).toBeInTheDocument();
    fireEvent.click(container.querySelector('.modal-overlay') as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '新增老人档案' })).not.toBeInTheDocument();
    });
  });
});
