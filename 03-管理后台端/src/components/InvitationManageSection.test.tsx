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
});
