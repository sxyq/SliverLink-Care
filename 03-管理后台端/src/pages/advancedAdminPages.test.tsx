import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VolunteerManagePage } from './VolunteerManagePage';
import { AuditLogPage } from './AuditLogPage';

const fetchVolunteers = vi.fn();
const fetchElders = vi.fn();
const fetchFamilyBindings = vi.fn();
const createVolunteer = vi.fn();
const updateVolunteer = vi.fn();
const deleteVolunteer = vi.fn();
const updateVolunteerScope = vi.fn();
const unbindFamily = vi.fn();
const fetchAuditLogs = vi.fn();
const fetchAuditLogPage = vi.fn();
const fetchAuditLogSummary = vi.fn();
const createAuditLogExport = vi.fn();
const exportToCsv = vi.fn();
const exportAuditLogs = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchVolunteers: (...args: unknown[]) => fetchVolunteers(...args),
  fetchElders: (...args: unknown[]) => fetchElders(...args),
  fetchFamilyBindings: (...args: unknown[]) => fetchFamilyBindings(...args),
  createVolunteer: (...args: unknown[]) => createVolunteer(...args),
  updateVolunteer: (...args: unknown[]) => updateVolunteer(...args),
  deleteVolunteer: (...args: unknown[]) => deleteVolunteer(...args),
  updateVolunteerScope: (...args: unknown[]) => updateVolunteerScope(...args),
  unbindFamily: (...args: unknown[]) => unbindFamily(...args),
  fetchAuditLogs: (...args: unknown[]) => fetchAuditLogs(...args),
  fetchAuditLogPage: (...args: unknown[]) => fetchAuditLogPage(...args),
  fetchAuditLogSummary: (...args: unknown[]) => fetchAuditLogSummary(...args),
  createAuditLogExport: (...args: unknown[]) => createAuditLogExport(...args),
}));

vi.mock('../utils/exportCsv', () => ({
  exportToCsv: (...args: unknown[]) => exportToCsv(...args),
}));

vi.mock('../features/audit/auditExport', () => ({
  exportAuditLogs: (...args: unknown[]) => exportAuditLogs(...args),
}));

vi.mock('../components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('../components/InvitationManageSection', () => ({
  InvitationManageSection: ({ embedded }: { embedded?: boolean }) => <div>InvitationManageSection-{embedded ? 'embedded' : 'plain'}</div>,
}));

describe('VolunteerManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    fetchVolunteers.mockResolvedValue([
      {
        id: 'vol-1',
        name: '王志愿者',
        account: 'vol001',
        phone: '13800000000',
        elderCount: 1,
        status: '启用',
        createMethod: '后台创建',
        createdAt: '2026/05/26 09:00:00',
        invitationCode: '',
        lastSubmit: '2026/05/26 10:00:00',
      },
    ]);
    fetchElders.mockResolvedValue([
      { id: 'elder-1', archiveNo: 'A-001', name: '李奶奶', age: 72, status: '启用' },
      { id: 'elder-2', archiveNo: 'A-002', name: '赵爷爷', age: 80, status: '启用' },
    ]);
    fetchFamilyBindings.mockResolvedValue([
      {
        id: 'binding-1',
        familyName: '张家属',
        familyPhoneMasked: '138****0000',
        relationship: '女儿',
        elderName: '李奶奶',
        elderArchiveNo: 'A-001',
        invitationCode: 'INV-001',
        createMethod: '',
        boundAt: '2026-05-26 10:00:00',
        status: '已绑定',
      },
    ]);
    createVolunteer.mockResolvedValue({ id: 'vol-2' });
    updateVolunteer.mockResolvedValue(undefined);
    deleteVolunteer.mockResolvedValue(undefined);
    updateVolunteerScope.mockResolvedValue(undefined);
    unbindFamily.mockResolvedValue(undefined);
  });

  it('covers create, edit, scope assignment, export, family review and delete flows', async () => {
    render(<VolunteerManagePage />);

    expect(await screen.findByRole('heading', { name: '志愿者、家属与邀请码管理' })).toBeInTheDocument();
    expect(await screen.findByText('王志愿者')).toBeInTheDocument();
    expect(screen.getByText('账号：vol001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '新增志愿者账号' }));
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));
    expect(await screen.findByText('请填写志愿者姓名和账号')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '新志愿者' } });
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'vol002' } });
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13900000000' } });
    fireEvent.change(screen.getByLabelText('初始密码'), { target: { value: 'Pass@123456' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    await waitFor(() => {
      expect(createVolunteer).toHaveBeenCalledWith({
        name: '新志愿者',
        account: 'vol002',
        phone: '13900000000',
        password: 'Pass@123456',
      });
    });

    const volunteerRow = screen.getByText('王志愿者').closest('tr');
    expect(volunteerRow).not.toBeNull();
    const volunteerActions = within(volunteerRow as HTMLElement);

    fireEvent.click(volunteerActions.getByRole('button', { name: '编辑' }));
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13711112222' } });
    fireEvent.change(screen.getByLabelText('修改密码'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    await waitFor(() => {
      expect(updateVolunteer).toHaveBeenCalledWith('vol-1', {
        name: '王志愿者',
        account: 'vol001',
        phone: '13711112222',
        status: 'ACTIVE',
        password: 'new-password',
      });
    });

    fireEvent.click(volunteerActions.getByRole('button', { name: '负责老人' }));
    expect(await screen.findByRole('heading', { name: '负责老人管理 - 王志愿者' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加老人' }));
    fireEvent.click(screen.getAllByRole('button', { name: '添加' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '保存负责老人' }));

    await waitFor(() => {
      expect(updateVolunteerScope).toHaveBeenCalledWith('vol-1', ['elder-1']);
    });

    fireEvent.click(volunteerActions.getByRole('button', { name: '停用' }));
    await waitFor(() => {
      expect(updateVolunteer).toHaveBeenCalledWith('vol-1', {
        name: '王志愿者',
        account: 'vol001',
        status: 'DISABLED',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: '家属协管' }));
    expect(await screen.findByText('张家属')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看绑定老人' }));
    expect(await screen.findByRole('heading', { name: '家属绑定老人审查' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '解绑' }));
    await waitFor(() => {
      expect(unbindFamily).toHaveBeenCalledWith('binding-1');
    });

    fireEvent.click(screen.getByRole('button', { name: '志愿者' }));
    expect(await screen.findByText('账号：vol001')).toBeInTheDocument();
    const refreshedVolunteerRow = screen.getByText('王志愿者').closest('tr');
    fireEvent.click(within(refreshedVolunteerRow as HTMLElement).getByRole('button', { name: '删除' }));
    await waitFor(() => {
      expect(deleteVolunteer).toHaveBeenCalledWith('vol-1');
    });
  });

  it('covers invitation tab rendering and scope validation branches', async () => {
    fetchVolunteers.mockResolvedValueOnce([
      {
        id: 'vol-1',
        name: '王志愿者',
        account: 'vol001',
        phone: '13800000000',
        elderCount: 1,
        assignedElderIds: ['elder-1'],
        status: '启用',
        createMethod: '后台创建',
        createdAt: '2026/05/26 09:00:00',
        invitationCode: '',
        lastSubmit: '2026/05/26 10:00:00',
      },
    ]);

    render(<VolunteerManagePage />);

    expect(await screen.findByRole('heading', { name: '志愿者、家属与邀请码管理' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '邀请码管理' }));
    expect(await screen.findByText('InvitationManageSection-embedded')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '志愿者' }));
    const volunteerRow = screen.getByText('王志愿者').closest('tr');
    expect(volunteerRow).not.toBeNull();
    fireEvent.click(within(volunteerRow as HTMLElement).getByRole('button', { name: '负责老人' }));

    expect(await screen.findByRole('heading', { name: '负责老人管理 - 王志愿者' })).toBeInTheDocument();
    const scopeDialog = screen.getByRole('heading', { name: '负责老人管理 - 王志愿者' }).closest('.modal-content');
    expect(scopeDialog).not.toBeNull();
    fireEvent.click(within(scopeDialog as HTMLElement).getAllByRole('button', { name: '删除' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '保存负责老人' }));

    expect(await screen.findByText('请至少保留 1 位负责老人')).toBeInTheDocument();
  });

  it('shows duplicate account and API errors without closing the create dialog', async () => {
    render(<VolunteerManagePage />);

    expect(await screen.findByText('王志愿者')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新增志愿者账号' }));
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '重复账号志愿者' } });
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'vol001' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    expect(await screen.findByText('该登录账号已存在，请更换后重试')).toBeInTheDocument();
    expect(createVolunteer).not.toHaveBeenCalled();

    createVolunteer.mockRejectedValueOnce(new Error('服务暂时不可用'));
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'vol003' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    expect(await screen.findByText('服务暂时不可用')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '新增志愿者账号' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认新增' })).toBeEnabled();
  });

  it('covers volunteer query trim, status filter, scope rail toggle, chip remove and family empty state', async () => {
    fetchVolunteers.mockResolvedValueOnce([
      {
        id: 'vol-1',
        name: '王志愿者',
        account: 'vol001',
        phone: '13800000000',
        elderCount: 2,
        assignedElderIds: ['elder-1', 'elder-2'],
        status: '停用',
        createMethod: '后台创建',
        createdAt: '2026/05/26 09:00:00',
        invitationCode: 'INV-001',
        lastSubmit: '2026/05/26 10:00:00',
      },
      {
        id: 'vol-2',
        name: '李志愿者',
        account: 'vol002',
        phone: '13900000000',
        elderCount: 1,
        assignedElderIds: ['elder-2'],
        status: '启用',
        createMethod: '邀请码注册',
        createdAt: '2026/05/26 09:10:00',
        invitationCode: '',
        lastSubmit: '2026/05/26 10:10:00',
      },
    ]);
    fetchFamilyBindings.mockResolvedValueOnce([]);

    render(<VolunteerManagePage />);

    expect(await screen.findByText('王志愿者')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索姓名、账号、ID、邀请码'), {
      target: { value: ' 王志愿者 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    fireEvent.change(screen.getByDisplayValue('全部状态'), { target: { value: '停用' } });
    expect(screen.getByDisplayValue('王志愿者')).toBeInTheDocument();

    const volunteerRow = screen.getByText('王志愿者').closest('tr');
    expect(volunteerRow).not.toBeNull();
    fireEvent.click(within(volunteerRow as HTMLElement).getByRole('button', { name: '负责老人' }));
    expect(await screen.findByRole('heading', { name: '负责老人管理 - 王志愿者' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '收起已选老人' }));
    expect(document.querySelector('.scope-name-rail-count')?.textContent).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: '展开已选老人' }));
    fireEvent.click(screen.getByTitle('李奶奶 / A-001'));
    fireEvent.click(screen.getByRole('button', { name: '保存负责老人' }));
    await waitFor(() => {
      expect(updateVolunteerScope).toHaveBeenCalledWith('vol-1', ['elder-2']);
    });

    fireEvent.click(screen.getByRole('button', { name: '家属协管' }));
    expect(await screen.findByText('暂无家属绑定数据')).toBeInTheDocument();
  });

  it('covers derived create time, family export and family dialog close branch', async () => {
    fetchVolunteers.mockResolvedValueOnce([
      {
        id: 'vol-1716979200000',
        name: '边界志愿者',
        account: 'vol003',
        phone: '13600000000',
        elderCount: 0,
        assignedElderIds: [],
        status: '停用',
        createMethod: '-',
        createdAt: '-',
        invitationCode: '',
        lastSubmit: '-',
      },
    ]);
    fetchFamilyBindings.mockResolvedValueOnce([
      {
        id: 'binding-close',
        familyName: '王家属',
        familyPhoneMasked: '137****1000',
        relationship: '儿子',
        elderName: '周奶奶',
        elderArchiveNo: 'A-009',
        invitationCode: '',
        createMethod: '',
        boundAt: '',
        status: '已解绑',
      },
    ]);

    render(<VolunteerManagePage />);

    expect(await screen.findByText('边界志愿者')).toBeInTheDocument();
    expect(screen.getByText(/创建时间：20/)).toBeInTheDocument();
    expect(screen.getByText('暂无分配')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '家属协管' }));
    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledWith(
      expect.stringMatching(/^family-groups-/),
      expect.arrayContaining([
        expect.objectContaining({
          家属姓名: '王家属',
          创建方式: '邀请码注册',
          绑定老人数量: '1',
        }),
      ]),
    );

    fireEvent.click(screen.getByRole('button', { name: '查看绑定老人' }));
    expect(await screen.findByRole('heading', { name: '家属绑定老人审查' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '家属绑定老人审查' })).not.toBeInTheDocument();
    });
  });
});

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchAuditLogs.mockResolvedValue([
      {
        time: '2026-05-26T09:00:00Z',
        operator: 'visitor-13800001111',
        action: 'IDENTITY_VERIFY',
        target: 'A-001',
        ip: '127.0.0.1',
        result: '成功',
        role: 'VISITOR',
        verificationMethod: 'IDENTITY',
        visitorName: '张三',
        visitorPhone: '13800001111',
        visitorIdCard: '110101199001011234',
      },
      {
        time: '2026-05-26T10:00:00Z',
        operator: 'visitor-13900002222',
        action: 'SMS_RELAY_START',
        target: '138****0000',
        ip: '127.0.0.2',
        result: '失败',
        role: 'VISITOR',
        verificationMethod: 'SMS_RELAY',
        visitorName: '李四',
        visitorPhoneMasked: '139****2222',
        visitorIdCardMasked: '320***********1234',
      },
      {
        time: '2026-05-26T11:00:00Z',
        operator: 'admin',
        action: 'LOGIN',
        target: 'system',
        ip: '127.0.0.3',
        result: '成功',
        role: 'SYSTEM_ADMIN',
      },
    ]);
    fetchElders.mockResolvedValue([
      {
        id: 'elder-1',
        archiveNo: 'A-001',
        name: '李奶奶',
        age: 72,
        phoneMasked: '138****9999',
        volunteer: '王志愿者',
      },
    ]);
    fetchAuditLogPage.mockImplementation(async (filters: { operator?: string; target?: string; sourceIp?: string } = {}) => {
      const items = await fetchAuditLogs();
      const filtered = items.filter((item: { operator?: string; visitorName?: string; target?: string; ip?: string }) => (
        (!filters.operator || item.operator === filters.operator || item.visitorName === filters.operator)
        && (!filters.target || item.target === filters.target || item.target?.includes(filters.target))
        && (!filters.sourceIp || item.ip === filters.sourceIp)
      ));
      return { items: filtered, nextCursor: null, hasMore: false };
    });
    fetchAuditLogSummary.mockImplementation(async () => {
      const items = await fetchAuditLogs();
      return {
        total: items.length,
        successCount: items.filter((item: { result?: string }) => item.result === '成功').length,
        failureCount: items.filter((item: { result?: string }) => item.result === '失败').length,
        sourceIpCount: new Set(items.map((item: { ip?: string }) => item.ip).filter(Boolean)).size,
        actions: [],
        verificationMethods: [],
        trend: [],
        recent: items,
      };
    });
    createAuditLogExport.mockResolvedValue({ id: 'export-1', status: 'QUEUED' });
  });

  it('covers visitor metrics, filters, target detail and export', async () => {
    render(<AuditLogPage category="visitor" />);

    expect((await screen.findAllByRole('heading', { name: '访问人员记录' })).length).toBeGreaterThan(0);
    expect(await screen.findByText('当前分类下有 1 条失败记录，请重点检查来源 IP 和操作内容。')).toBeInTheDocument();
    expect(screen.getByText('访问记录数')).toBeInTheDocument();
    expect(screen.getAllByText('身份登记').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('筛选手机号或姓名'), { target: { value: '张三' } });
    const visitorSelects = screen.getAllByRole('combobox');
    fireEvent.change(visitorSelects[1], { target: { value: '身份登记' } });
    fireEvent.change(visitorSelects[2], { target: { value: '成功' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));

    expect((await screen.findAllByText('张三')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryAllByText('李四')).toHaveLength(0));

    fireEvent.click(screen.getByRole('button', { name: '李奶奶（A-001）' }));
    expect(await screen.findByRole('heading', { name: '访问对象详情' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('李奶奶')).toBeInTheDocument();
    expect(screen.getByDisplayValue('王志愿者')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));

    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('全部').length).toBeGreaterThan(0);
      expect(fetchAuditLogPage).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(createAuditLogExport).toHaveBeenCalledTimes(1);
  });

  it('renders admin category table rows', async () => {
    render(<AuditLogPage category="admin" />);

    expect(await screen.findByRole('heading', { name: '管理员操作' })).toBeInTheDocument();
    const auditTable = screen.getByRole('table');
    expect(within(auditTable).getByText('登录')).toBeInTheDocument();
    expect(within(auditTable).getByText('admin')).toBeInTheDocument();
    expect(within(auditTable).getByText('system')).toBeInTheDocument();
  });

  it('keeps empty state when audit request fails silently', async () => {
    fetchAuditLogs.mockRejectedValueOnce(new Error('日志加载失败'));

    render(<AuditLogPage category="admin" />);

    expect(await screen.findByText('暂无记录')).toBeInTheDocument();
  });

  it('covers medical/family categories, direct-sms labels and visitor fallback targets', async () => {
    const auditRows = [
      {
        time: '2026-05-26T08:00:00Z',
        operator: 'volunteer-helper',
        action: 'SMS_SEND',
        target: '138****9988',
        ip: '10.0.0.1',
        result: '成功',
        role: 'VOLUNTEER',
        verificationMethod: 'DIRECT_SMS',
        visitorName: '',
      },
      {
        time: '2026-05-26T08:30:00Z',
        operator: 'family-account',
        action: 'LOGIN',
        target: 'system',
        ip: '10.0.0.2',
        result: '失败',
        role: 'FAMILY',
      },
      {
        time: '2026-05-26T09:00:00Z',
        operator: 'unknown',
        action: 'SMS_SEND',
        target: '139****7788',
        ip: '10.0.0.3',
        result: '成功',
        role: '',
        verificationMethod: 'DIRECT_SMS',
        visitorIdCardMasked: '320***********5678',
      },
    ];
    fetchAuditLogs.mockResolvedValue(auditRows);
    fetchElders.mockResolvedValue([]);

    const medicalView = render(<AuditLogPage category="medical" />);
    expect(await screen.findByRole('heading', { name: '医护/志愿者操作' })).toBeInTheDocument();
    expect(screen.getByText('volunteer-helper')).toBeInTheDocument();
    medicalView.unmount();

    const familyView = render(<AuditLogPage category="family" />);
    expect(await screen.findByRole('heading', { name: '家属操作' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('筛选家属账号')).toBeInTheDocument();
    expect(screen.getByText('family-account')).toBeInTheDocument();
    familyView.unmount();

    fetchElders.mockResolvedValue([
      { id: 'elder-1', archiveNo: 'A-001', name: '李奶奶', age: 72, phoneMasked: '138****9999', volunteer: '王志愿者' },
    ]);
    render(<AuditLogPage category="visitor" />);
    expect((await screen.findAllByText('手机号 139****7788')).length).toBeGreaterThan(0);
    expect(screen.getByText('320***********5678')).toBeInTheDocument();
    expect(screen.getAllByText('短信验证码').length).toBeGreaterThan(0);
  });

  it('covers visitor toolbar inputs, timestamp fallbacks, operator-derived groups and query button no-op', async () => {
    fetchAuditLogs.mockResolvedValue([
      {
        time: '',
        operator: '审计管理员',
        action: 'LOGIN',
        target: 'system',
        ip: '10.0.0.10',
        result: '成功',
        role: '',
      },
      {
        time: 'bad-time',
        operator: '医护张三',
        action: 'SMS_SEND',
        target: 'silverlink_care',
        ip: '10.0.0.11',
        result: '失败',
        role: '',
        verificationMethod: 'DIRECT_SMS',
      },
      {
        time: '2026-05-26T09:01:00Z',
        operator: '家属王五',
        action: 'LOGIN',
        target: 'A-001',
        ip: '10.0.0.12',
        result: '成功',
        role: '',
      },
    ]);
    fetchElders.mockResolvedValue([
      { id: 'elder-1', archiveNo: 'A-001', name: '李奶奶', age: 72, phoneMasked: '138****9999', volunteer: '王志愿者' },
    ]);

    const adminView = render(<AuditLogPage category="admin" />);
    expect(await screen.findByText('-')).toBeInTheDocument();
    expect(screen.getByText('审计管理员')).toBeInTheDocument();
    adminView.unmount();

    const medicalView = render(<AuditLogPage category="medical" />);
    expect(await screen.findByText('bad-time')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('筛选操作人'), { target: { value: '医护张三' } });
    fireEvent.change(screen.getByPlaceholderText('筛选操作对象'), { target: { value: 'silverlink' } });
    fireEvent.change(screen.getByPlaceholderText('筛选来源 IP'), { target: { value: '10.0.0.11' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(fetchAuditLogPage).toHaveBeenCalled());
    medicalView.unmount();

    render(<AuditLogPage category="family" />);
    expect(await screen.findByText('家属王五')).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '成功' } });
    expect(screen.getByText('A-001')).toBeInTheDocument();
  });
});
