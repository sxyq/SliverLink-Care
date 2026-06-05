import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationManageSection } from './InvitationManageSection';

const fetchInvitationsMock = vi.fn();
const fetchEldersMock = vi.fn();
const fetchFamilyBindingsMock = vi.fn();
const createInvitationMock = vi.fn();
const deleteInvitationMock = vi.fn();
const disableInvitationMock = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchInvitations: (...args: unknown[]) => fetchInvitationsMock(...args),
  fetchElders: (...args: unknown[]) => fetchEldersMock(...args),
  fetchFamilyBindings: (...args: unknown[]) => fetchFamilyBindingsMock(...args),
  createInvitation: (...args: unknown[]) => createInvitationMock(...args),
  deleteInvitation: (...args: unknown[]) => deleteInvitationMock(...args),
  disableInvitation: (...args: unknown[]) => disableInvitationMock(...args),
}));

vi.mock('../utils/exportCsv', () => ({
  exportToCsv: vi.fn(),
}));

vi.mock('./TableColumnMenu', () => ({
  useTableColumnVisibility: () => ({
    isVisible: () => true,
    toggle: vi.fn(),
    reset: vi.fn(),
  }),
  TableColumnMenu: () => <div>column-menu</div>,
}));

vi.mock('./StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) => <span data-testid="status-tag">{status}</span>,
}));

const invitations = [
  {
    id: 'inv-1',
    code: 'ABC123',
    elderId: 'elder-1',
    elderName: '王桂兰',
    archiveNo: 'A001',
    expiresAt: '2026-12-31T00:00:00Z',
    usedCount: 1,
    maxUses: 2,
    status: '已使用',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'inv-2',
    code: 'DEF456',
    elderId: 'elder-2',
    elderName: '李奶奶',
    archiveNo: 'A002',
    expiresAt: '2026-06-30T00:00:00Z',
    usedCount: 0,
    maxUses: 1,
    status: '未使用',
    createdAt: '2026-05-15T00:00:00Z',
  },
];

const elders = [
  { id: 'elder-1', name: '王桂兰', archiveNo: 'A001' },
  { id: 'elder-2', name: '李奶奶', archiveNo: 'A002' },
];

const bindings = [
  {
    invitationCode: 'ABC123',
    familyName: '王丽',
    familyPhoneMasked: '138****6666',
    relationship: '女儿',
    status: '已绑定',
    boundAt: '2026-05-10T00:00:00Z',
    elderName: '王桂兰',
    elderArchiveNo: 'A001',
  },
];

describe('InvitationManageSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchInvitationsMock.mockResolvedValue(invitations);
    fetchEldersMock.mockResolvedValue(elders);
    fetchFamilyBindingsMock.mockResolvedValue(bindings);
    createInvitationMock.mockResolvedValue({});
    deleteInvitationMock.mockResolvedValue({});
    disableInvitationMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders invitation list with data', async () => {
    render(<InvitationManageSection />);

    expect(await screen.findByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('王桂兰')).toBeInTheDocument();
    expect(screen.getByText('DEF456')).toBeInTheDocument();
    expect(screen.getByText('李奶奶')).toBeInTheDocument();
  });

  it('renders embedded mode without panel title', async () => {
    render(<InvitationManageSection embedded />);

    await screen.findByText('ABC123');
    expect(screen.queryByText('邀请码列表')).not.toBeInTheDocument();
  });

  it('renders non-embedded mode with panel title', async () => {
    render(<InvitationManageSection />);

    expect(await screen.findByText('邀请码列表')).toBeInTheDocument();
  });

  it('shows empty state when no invitations', async () => {
    fetchInvitationsMock.mockResolvedValue([]);

    render(<InvitationManageSection />);

    expect(await screen.findByText('暂无邀请码数据')).toBeInTheDocument();
  });

  it('filters by keyword', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('ABC123');
    const input = screen.getByPlaceholderText('按邀请码、老人姓名、档案编号或家属搜索');
    await user.type(input, '王桂兰');
    await user.click(screen.getByRole('button', { name: /查询/ }));

    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.queryByText('DEF456')).not.toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('ABC123');
    const select = screen.getByDisplayValue('全部状态');
    await user.selectOptions(select, '未使用');

    expect(screen.queryByText('ABC123')).not.toBeInTheDocument();
    expect(screen.getByText('DEF456')).toBeInTheDocument();
  });

  it('opens create dialog and creates invitation', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('ABC123');
    const createButtons = screen.getAllByRole('button', { name: /生成邀请码/ });
    await user.click(createButtons[0]);

    expect(screen.getByText('选择老人')).toBeInTheDocument();
    const elderSelect = screen.getByDisplayValue('请选择老人');
    await user.selectOptions(elderSelect, 'elder-1');
    await user.click(screen.getByRole('button', { name: '确认生成' }));

    await waitFor(() => {
      expect(createInvitationMock).toHaveBeenCalledWith('elder-1', 7, 1);
    });
  });

  it('copies invitation link', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('ABC123');
    const copyButtons = screen.getAllByRole('button', { name: /复制链接/ });
    await user.click(copyButtons[0]);

    await waitFor(() => {
      expect(copyButtons[0]).toBeInTheDocument();
    });
  });

  it('toggles invitation status', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('DEF456');
    const disableButton = screen.getByRole('button', { name: /作废/ });
    await user.click(disableButton);

    await waitFor(() => {
      expect(disableInvitationMock).toHaveBeenCalledWith('inv-2');
    });
  });

  it('deletes invitation', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('ABC123');
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteInvitationMock).toHaveBeenCalled();
    });
  });

  it('opens family detail modal', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('ABC123');
    const detailButtons = screen.getAllByRole('button', { name: /查看家属/ });
    await user.click(detailButtons[0]);

    expect(screen.getByText('邀请码邀请家属明细')).toBeInTheDocument();
    expect(screen.getByText('王丽')).toBeInTheDocument();
  });

  it('regenerates invitation', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);

    await screen.findByText('ABC123');
    const regenButtons = screen.getAllByRole('button', { name: /重新生成/ });
    await user.click(regenButtons[0]);

    await waitFor(() => {
      expect(createInvitationMock).toHaveBeenCalled();
    });
  });

  it('handles load failure gracefully', async () => {
    fetchInvitationsMock.mockRejectedValue(new Error('加载失败'));

    render(<InvitationManageSection />);

    await waitFor(() => {
      expect(fetchInvitationsMock).toHaveBeenCalled();
    });
  });

  it('shows restore button for 已作废 invitations and calls disableInvitation', async () => {
    const user = userEvent.setup();
    fetchInvitationsMock.mockResolvedValue([
      {
        id: 'inv-void',
        code: 'VOID1',
        elderId: 'elder-1',
        elderName: '王桂兰',
        archiveNo: 'A001',
        expiresAt: '2026-12-31T00:00:00Z',
        usedCount: 0,
        maxUses: 1,
        status: '已作废',
        createdAt: '2026-05-01T00:00:00Z',
      },
    ]);

    render(<InvitationManageSection />);
    await screen.findByText('VOID1');

    const restoreButton = screen.getByRole('button', { name: /恢复/ });
    expect(restoreButton).toBeInTheDocument();
    await user.click(restoreButton);

    await waitFor(() => {
      expect(disableInvitationMock).toHaveBeenCalledWith('inv-void');
    });
  });

  it('does not call createInvitation when regenerating without elderId', async () => {
    const user = userEvent.setup();
    const rejectionHandler = vi.fn();
    process.on('unhandledRejection', rejectionHandler);
    fetchInvitationsMock.mockResolvedValue([
      {
        id: 'inv-no-elder',
        code: 'NOELDER',
        elderId: '',
        elderName: '',
        archiveNo: 'A001',
        expiresAt: '2026-12-31T00:00:00Z',
        usedCount: 0,
        maxUses: 1,
        status: '未使用',
        createdAt: '2026-05-01T00:00:00Z',
      },
    ]);

    render(<InvitationManageSection />);
    await screen.findByText('NOELDER');

    const regenButtons = screen.getAllByRole('button', { name: /重新生成/ });
    await user.click(regenButtons[0]);

    await waitFor(() => {
      expect(createInvitationMock).not.toHaveBeenCalled();
    });
    process.off('unhandledRejection', rejectionHandler);
  });

  it('shows no-family state in detail modal when invitation has no invitees', async () => {
    const user = userEvent.setup();
    fetchFamilyBindingsMock.mockResolvedValue([]);

    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const detailButtons = screen.getAllByRole('button', { name: /查看家属/ });
    await user.click(detailButtons[0]);

    expect(screen.getByText('当前尚无家属使用该邀请码')).toBeInTheDocument();
  });

  it('exports filtered invitations to CSV', async () => {
    const { exportToCsv } = await import('../utils/exportCsv');
    const user = userEvent.setup();

    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const exportButton = screen.getByRole('button', { name: /导出/ });
    await user.click(exportButton);

    expect(exportToCsv).toHaveBeenCalled();
  });

  it('disables export button when no filtered results', async () => {
    fetchInvitationsMock.mockResolvedValue([]);

    render(<InvitationManageSection />);
    await screen.findByText('暂无邀请码数据');

    const exportButton = screen.getByRole('button', { name: /导出/ });
    expect(exportButton).toBeDisabled();
  });

  it('does not create invitation when no elder is selected', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const createButtons = screen.getAllByRole('button', { name: /生成邀请码/ });
    await user.click(createButtons[0]);

    const confirmButton = screen.getByRole('button', { name: '确认生成' });
    expect(confirmButton).toBeDisabled();
  });

  it('closes create dialog by clicking overlay', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const createButtons = screen.getAllByRole('button', { name: /生成邀请码/ });
    await user.click(createButtons[0]);
    expect(screen.getByText('选择老人')).toBeInTheDocument();

    const overlay = document.querySelector('.modal-overlay');
    expect(overlay).toBeInTheDocument();
    await user.click(overlay!);

    await waitFor(() => {
      expect(screen.queryByText('选择老人')).not.toBeInTheDocument();
    });
  });

  it('closes family detail modal by clicking overlay', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const detailButtons = screen.getAllByRole('button', { name: /查看家属/ });
    await user.click(detailButtons[0]);
    expect(screen.getByText('邀请码邀请家属明细')).toBeInTheDocument();

    const overlay = document.querySelectorAll('.modal-overlay');
    const detailOverlay = overlay[overlay.length - 1];
    await user.click(detailOverlay!);

    await waitFor(() => {
      expect(screen.queryByText('邀请码邀请家属明细')).not.toBeInTheDocument();
    });
  });

  it('shows +N chip when more than 2 invitees', async () => {
    fetchFamilyBindingsMock.mockResolvedValue([
      { invitationCode: 'ABC123', familyName: '家属1', familyPhoneMasked: '111', relationship: '女儿', status: '已绑定', boundAt: '2026-05-10T00:00:00Z', elderName: '王桂兰', elderArchiveNo: 'A001' },
      { invitationCode: 'ABC123', familyName: '家属2', familyPhoneMasked: '222', relationship: '儿子', status: '已绑定', boundAt: '2026-05-09T00:00:00Z', elderName: '王桂兰', elderArchiveNo: 'A001' },
      { invitationCode: 'ABC123', familyName: '家属3', familyPhoneMasked: '333', relationship: '配偶', status: '已解绑', boundAt: '2026-05-08T00:00:00Z', elderName: '王桂兰', elderArchiveNo: 'A001' },
    ]);

    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    expect(screen.getByText('+1 位')).toBeInTheDocument();
  });

  it('merges invitee groups with status upgrade and boundAt update', async () => {
    fetchFamilyBindingsMock.mockResolvedValue([
      { invitationCode: 'ABC123', familyName: '王丽', familyPhoneMasked: '138****6666', relationship: '女儿', status: '已解绑', boundAt: '2026-05-08T00:00:00Z', elderName: '王桂兰', elderArchiveNo: 'A001' },
      { invitationCode: 'ABC123', familyName: '王丽', familyPhoneMasked: '138****6666', relationship: '女儿', status: '已绑定', boundAt: '2026-05-10T00:00:00Z', elderName: '王桂兰', elderArchiveNo: 'A001' },
    ]);

    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const detailButtons = screen.getAllByRole('button', { name: /查看家属/ });
    const user = userEvent.setup();
    await user.click(detailButtons[0]);

    const statusTags = screen.getAllByTestId('status-tag');
    expect(statusTags[0]).toHaveTextContent('已绑定');
  });

  it('modifies expiresInDays and maxUses in create dialog', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const createButtons = screen.getAllByRole('button', { name: /生成邀请码/ });
    await user.click(createButtons[0]);

    const elderSelect = screen.getByDisplayValue('请选择老人');
    await user.selectOptions(elderSelect, 'elder-1');

    const daysInput = screen.getByRole('spinbutton', { name: /有效期/ });
    await user.clear(daysInput);
    await user.type(daysInput, '14');

    const maxUsesInput = screen.getByRole('spinbutton', { name: /最大使用次数/ });
    await user.clear(maxUsesInput);
    await user.type(maxUsesInput, '3');

    await user.click(screen.getByRole('button', { name: '确认生成' }));

    await waitFor(() => {
      expect(createInvitationMock).toHaveBeenCalledWith('elder-1', 14, 3);
    });
  });

  it('closes create dialog with cancel button', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const createButtons = screen.getAllByRole('button', { name: /生成邀请码/ });
    await user.click(createButtons[0]);
    expect(screen.getByText('选择老人')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取消' }));

    await waitFor(() => {
      expect(screen.queryByText('选择老人')).not.toBeInTheDocument();
    });
  });

  it('closes family detail modal with close button', async () => {
    const user = userEvent.setup();
    render(<InvitationManageSection />);
    await screen.findByText('ABC123');

    const detailButtons = screen.getAllByRole('button', { name: /查看家属/ });
    await user.click(detailButtons[0]);
    expect(screen.getByText('邀请码邀请家属明细')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭' }));

    await waitFor(() => {
      expect(screen.queryByText('邀请码邀请家属明细')).not.toBeInTheDocument();
    });
  });
});
