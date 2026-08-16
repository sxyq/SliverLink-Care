import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { AssignedElderListPage } from './AssignedElderListPage';

const authState = {
  login: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
  user: { account: 'vol1', name: '志愿者甲' },
};

const loginVolunteer = vi.fn();
const previewVolunteerInvitation = vi.fn();
const registerVolunteer = vi.fn();
const fetchAssignedElders = vi.fn();
const fetchVolunteerProfile = vi.fn();
const updateVolunteerProfile = vi.fn();
const createAssignedElder = vi.fn();
const logoutVolunteer = vi.fn();

vi.mock('../app/AuthProvider', () => ({
  useAuth: () => authState,
}));

vi.mock('../api/volunteerApi', () => ({
  loginVolunteer: (...args: unknown[]) => loginVolunteer(...args),
  previewVolunteerInvitation: (...args: unknown[]) => previewVolunteerInvitation(...args),
  registerVolunteer: (...args: unknown[]) => registerVolunteer(...args),
  fetchAssignedElders: (...args: unknown[]) => fetchAssignedElders(...args),
  fetchVolunteerProfile: (...args: unknown[]) => fetchVolunteerProfile(...args),
  updateVolunteerProfile: (...args: unknown[]) => updateVolunteerProfile(...args),
  createAssignedElder: (...args: unknown[]) => createAssignedElder(...args),
  logoutVolunteer: (...args: unknown[]) => logoutVolunteer(...args),
}));

vi.mock('@shared/SubjectListPage', () => ({
  SubjectListPage: ({
    title,
    loading,
    subjects,
    keyword,
    onKeywordChange,
    onSelect,
    onSecondaryAction,
    headerLeadingAction,
    headerAction,
    secondaryActionLabel,
  }: Record<string, unknown>) => (
    <div>
      <h1>{String(title)}</h1>
      <p data-testid="loading-state">{String(loading)}</p>
      <input
        aria-label="keyword"
        value={String(keyword)}
        onChange={(event) => (onKeywordChange as (value: string) => void)(event.target.value)}
      />
      <div>{headerLeadingAction as React.ReactNode}</div>
      <div>{headerAction as React.ReactNode}</div>
      <button type="button" onClick={() => (onSecondaryAction as (subject: unknown) => void)({})}>
        {String(secondaryActionLabel)}
      </button>
      {(subjects as Array<{ id: string; name: string }>).map((subject) => (
        <button key={subject.id} type="button" onClick={() => (onSelect as (subject: unknown) => void)(subject)}>
          {subject.name}
        </button>
      ))}
    </div>
  ),
}));

async function expectInvitationElderPreview() {
  const elderName = await screen.findByText('李奶奶');
  expect(elderName).toHaveAttribute('dir', 'auto');
  expect(elderName.parentElement).toHaveTextContent(/关联老人：/);
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs in volunteer successfully', async () => {
    loginVolunteer.mockResolvedValue({ ok: true, token: 'token-1', name: '志愿者甲' });

    render(<LoginPage />);

    const accountInput = screen.getByPlaceholderText('请输入账号');
    expect(accountInput).toHaveAttribute('dir', 'ltr');
    expect(accountInput).toHaveClass('sl-ltr-data');
    fireEvent.change(accountInput, { target: { value: 'vol1' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(loginVolunteer).toHaveBeenCalledWith('vol1', 'pwd');
      expect(authState.login).toHaveBeenCalledWith('token-1', { account: 'vol1', name: '志愿者甲' });
    });
  });

  it('validates invitation and registers volunteer', async () => {
    previewVolunteerInvitation.mockResolvedValue({
      elderName: '李奶奶',
      elderAge: 78,
      elderArchiveNo: 'A-001',
      expiresAt: '2026-12-31',
    });
    registerVolunteer.mockResolvedValue({ ok: true, token: 'token-2', name: '新志愿者' });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '邀请码注册' }));
    const invitationInput = screen.getByPlaceholderText('请输入邀请码');
    expect(invitationInput).toHaveAttribute('dir', 'ltr');
    expect(invitationInput).toHaveClass('sl-ltr-data');
    fireEvent.change(invitationInput, { target: { value: ' abc123 ' } });
    fireEvent.click(screen.getByRole('button', { name: '验证邀请码' }));

    await expectInvitationElderPreview();

    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '新志愿者' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录账号'), { target: { value: 'new-vol' } });
    const phoneInput = screen.getByPlaceholderText('选填，用于后续联系');
    expect(phoneInput).toHaveAttribute('type', 'tel');
    expect(phoneInput).toHaveAttribute('inputmode', 'numeric');
    expect(phoneInput).toHaveAttribute('dir', 'ltr');
    expect(phoneInput).toHaveClass('sl-ltr-data');
    fireEvent.change(phoneInput, { target: { value: '13800000000' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录密码'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: '注册并进入' }));

    await waitFor(() => {
      expect(registerVolunteer).toHaveBeenCalledWith({
        invitationCode: 'ABC123',
        name: '新志愿者',
        account: 'new-vol',
        phone: '13800000000',
        password: 'secret',
      });
      expect(authState.login).toHaveBeenCalledWith('token-2', { account: 'new-vol', name: '新志愿者' });
    });
  });

  it('shows request errors for login, invitation check and register failure branches', async () => {
    loginVolunteer.mockRejectedValueOnce(new Error('网络异常'));
    previewVolunteerInvitation.mockRejectedValueOnce('bad invite');
    registerVolunteer.mockResolvedValueOnce({ ok: false });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('请输入账号'), { target: { value: 'vol1' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('网络异常')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '邀请码注册' }));
    fireEvent.change(screen.getByPlaceholderText('请输入邀请码'), { target: { value: ' invite ' } });
    fireEvent.click(screen.getByRole('button', { name: '验证邀请码' }));
    expect(await screen.findByText('邀请码校验失败')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '新志愿者' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录账号'), { target: { value: 'new-vol' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录密码'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: '注册并进入' }));
    expect(await screen.findByText('注册失败，请稍后重试')).toBeInTheDocument();
  });

  it('falls back to default copy for non-Error failures and validates empty register inputs', async () => {
    loginVolunteer.mockRejectedValueOnce('network-down');
    registerVolunteer.mockRejectedValueOnce('register-down');

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('请输入账号'), { target: { value: '  vol1  ' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('登录失败，请稍后重试')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '邀请码注册' }));
    fireEvent.click(screen.getByRole('button', { name: '验证邀请码' }));
    expect(screen.getByText('请输入邀请码')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '注册并进入' }));
    expect(screen.getByText('请输入邀请码')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请输入邀请码'), { target: { value: 'ok-1' } });
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '新志愿者' } });
    fireEvent.click(screen.getByRole('button', { name: '注册并进入' }));
    expect(screen.getByText('请完整填写邀请码、姓名、账号和密码')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请设置登录账号'), { target: { value: ' new-vol ' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录密码'), { target: { value: ' secret ' } });
    fireEvent.click(screen.getByRole('button', { name: '注册并进入' }));
    expect(await screen.findByText('注册失败，请稍后重试')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '志愿者登录' }));
    expect(screen.queryByText('注册失败，请稍后重试')).not.toBeInTheDocument();
  });
});

describe('AssignedElderListPage', () => {
  const elders = [
    {
      id: 'elder-1',
      archiveNo: 'A-001',
      name: '李奶奶',
      gender: '女',
      age: 78,
      residence: '重庆',
      emergencyContactName: '家属甲',
      emergencyContactPhone: '13800000000',
      emergencyContactRelation: '女儿',
      aboType: 'A',
      rhType: 'Rh+',
      allergySummary: '无',
      lastVisitDate: '2026-05-01',
      status: '在档' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    fetchAssignedElders.mockResolvedValue(elders);
    fetchVolunteerProfile.mockResolvedValue({
      account: 'vol1',
      name: '志愿者甲',
      phone: '13812345678',
    });
    updateVolunteerProfile.mockResolvedValue({
      token: 'token-new',
      account: 'vol2',
      name: '志愿者乙',
      phone: '13900000000',
    });
    createAssignedElder.mockResolvedValue({ id: 'elder-2' });
    logoutVolunteer.mockResolvedValue(undefined);
  });

  it('loads elders, filters, opens account panel and saves account', async () => {
    const onSelect = vi.fn();
    const onEditBasic = vi.fn();

    render(<AssignedElderListPage onSelect={onSelect} onEditBasic={onEditBasic} />);

    expect(await screen.findByText('李奶奶')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('keyword'), { target: { value: '李' } });
    fireEvent.click(screen.getByText('李奶奶'));
    expect(onSelect).toHaveBeenCalledWith(elders[0]);

    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    expect(await screen.findByDisplayValue('13812345678')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('志愿者甲'), { target: { value: '志愿者乙' } });
    fireEvent.change(screen.getByDisplayValue('vol1'), { target: { value: 'vol2' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    await waitFor(() => {
      expect(updateVolunteerProfile).toHaveBeenCalled();
      expect(authState.login).toHaveBeenCalledWith('token-new', { account: 'vol2', name: '志愿者乙' });
      expect(authState.updateUser).toHaveBeenCalledWith({ account: 'vol2', name: '志愿者乙' });
    });
  });

  it('closes account panel, logs out from panel and edits keyword/create form fields', async () => {
    const onEditBasic = vi.fn();

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={onEditBasic} />);

    await screen.findByText('李奶奶');
    fireEvent.change(screen.getByLabelText('keyword'), { target: { value: '不存在' } });
    expect(screen.queryByText('李奶奶')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    await screen.findByDisplayValue('13812345678');
    fireEvent.click(screen.getByRole('button', { name: '关闭账号管理' }));
    await waitFor(() => {
      expect(screen.queryByDisplayValue('13812345678')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    const accountPhoneInput = await screen.findByDisplayValue('13812345678');
    const modalCard = accountPhoneInput.closest('.sl-modal-card');
    expect(modalCard).not.toBeNull();
    fireEvent.click(within(modalCard as HTMLElement).getByRole('button', { name: '退出登录' }));
    await waitFor(() => {
      expect(logoutVolunteer).toHaveBeenCalledTimes(1);
      expect(authState.logout).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '张奶奶' } });
    fireEvent.change(screen.getByPlaceholderText('请输入住址'), { target: { value: '渝中区' } });
    fireEvent.change(screen.getByPlaceholderText('请输入紧急联系人姓名'), { target: { value: '家属丙' } });
    fireEvent.change(screen.getByPlaceholderText('请输入紧急联系人电话'), { target: { value: '13911112222' } });
    fireEvent.change(screen.getByPlaceholderText('请输入与老人关系'), { target: { value: '女儿' } });
    fireEvent.click(screen.getByText('男').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    await waitFor(() => {
      expect(createAssignedElder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '张奶奶',
          gender: '男',
          residence: '渝中区',
          emergencyContactName: '家属丙',
          emergencyContactPhone: '13911112222',
          emergencyContactRelation: '女儿',
        }),
      );
    });
  });

  it('handles account panel profile failure, password validation and save failure', async () => {
    fetchVolunteerProfile.mockRejectedValueOnce(new Error('加载账号信息失败'));
    updateVolunteerProfile.mockRejectedValueOnce(new Error('保存失败'));

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={vi.fn()} />);
    await screen.findByText('李奶奶');

    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    expect(await screen.findByText('加载账号信息失败')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('不修改可留空'), { target: { value: 'new-pass' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(screen.getByText('修改密码前请输入当前密码')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('修改密码时必须填写'), { target: { value: 'old-pass' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(await screen.findByText('保存失败')).toBeInTheDocument();
  });

  it('creates elder and routes to edit after creation', async () => {
    const onEditBasic = vi.fn();

    fetchAssignedElders
      .mockResolvedValueOnce(elders)
      .mockResolvedValueOnce([
        ...elders,
        {
          ...elders[0],
          id: 'elder-2',
          name: '张爷爷',
          archiveNo: 'A-002',
        },
      ]);

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={onEditBasic} />);

    await screen.findByText('李奶奶');
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '张爷爷' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    await waitFor(() => {
      expect(createAssignedElder).toHaveBeenCalled();
      expect(onEditBasic).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'elder-2',
          name: '张爷爷',
        }),
      );
    });
  });

  it('validates elder creation form and shows create failure copy', async () => {
    createAssignedElder.mockRejectedValueOnce(new Error('新增失败'));

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={vi.fn()} />);
    await screen.findByText('李奶奶');

    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));
    expect(screen.getByText('请先填写老人姓名')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '张爷爷' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));
    expect(await screen.findByText('新增失败')).toBeInTheDocument();
  });

  it('handles login failure', async () => {
    loginVolunteer.mockResolvedValue({ ok: false, message: '账号或密码错误' });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('请输入账号'), { target: { value: 'bad' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(screen.getByText('账号或密码错误')).toBeInTheDocument();
    });
  });

  it('handles invitation preview failure', async () => {
    previewVolunteerInvitation.mockRejectedValue(new Error('邀请码无效'));

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '邀请码注册' }));
    fireEvent.change(screen.getByPlaceholderText('请输入邀请码'), { target: { value: 'BAD' } });
    fireEvent.click(screen.getByRole('button', { name: '验证邀请码' }));

    await waitFor(() => {
      expect(screen.getByText('邀请码无效')).toBeInTheDocument();
    });
  });

  it('handles registration failure', async () => {
    previewVolunteerInvitation.mockResolvedValue({
      elderName: '李奶奶',
      elderAge: 78,
      elderArchiveNo: 'A-001',
      expiresAt: '2026-12-31',
    });
    registerVolunteer.mockResolvedValue({ ok: false, message: '注册失败，账号已存在' });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '邀请码注册' }));
    fireEvent.change(screen.getByPlaceholderText('请输入邀请码'), { target: { value: 'GOOD' } });
    fireEvent.click(screen.getByRole('button', { name: '验证邀请码' }));

    await expectInvitationElderPreview();

    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '新志愿者' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录账号'), { target: { value: 'dup' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录密码'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: '注册并进入' }));

    await waitFor(() => {
      expect(screen.getByText('注册失败，请稍后重试')).toBeInTheDocument();
    });
  });

  it('handles profile update failure', async () => {
    updateVolunteerProfile.mockRejectedValue(new Error('保存失败'));

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={vi.fn()} />);

    await screen.findByText('李奶奶');
    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    await screen.findByDisplayValue('13812345678');
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    await waitFor(() => {
      expect(screen.getByText('保存失败')).toBeInTheDocument();
    });
  });

  it('handles elder creation failure', async () => {
    createAssignedElder.mockRejectedValue(new Error('创建失败'));
    fetchAssignedElders.mockResolvedValue(elders);

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={vi.fn()} />);

    await screen.findByText('李奶奶');
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '新老人' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    await waitFor(() => {
      expect(screen.getByText('创建失败')).toBeInTheDocument();
    });
  });

  it('handles fetch elders failure gracefully', async () => {
    fetchAssignedElders.mockRejectedValue(new Error('加载失败'));

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    });
  });

  it('supports account save guards, default error copy and create success without matched elder', async () => {
    const onEditBasic = vi.fn();
    fetchVolunteerProfile.mockRejectedValueOnce('加载失败');
    updateVolunteerProfile.mockRejectedValueOnce('bad save');
    createAssignedElder.mockResolvedValueOnce({ id: 'elder-missing' });
    fetchAssignedElders
      .mockResolvedValueOnce(elders)
      .mockResolvedValueOnce(elders);

    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={onEditBasic} />);

    await screen.findByText('李奶奶');
    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    expect(await screen.findByText('加载账号信息失败')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(updateVolunteerProfile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '志愿者乙' } });
    fireEvent.change(screen.getByPlaceholderText('请设置登录账号'), { target: { value: 'vol2' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(await screen.findByText('保存失败，请稍后重试')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    await waitFor(() => {
      expect(screen.queryByText('本账号管理')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '新老人' } });
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }));

    await waitFor(() => {
      expect(createAssignedElder).toHaveBeenCalled();
    });
    expect(onEditBasic).not.toHaveBeenCalled();
  });

  it('covers account phone/password inputs, extra create fields and create panel close buttons', async () => {
    render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={vi.fn()} />);

    await screen.findByText('李奶奶');
    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    await screen.findByDisplayValue('13812345678');
    fireEvent.change(screen.getByDisplayValue('13812345678'), { target: { value: '13611112222' } });
    fireEvent.change(screen.getByPlaceholderText('修改密码时必须填写'), { target: { value: 'old-pass' } });
    fireEvent.change(screen.getByPlaceholderText('不修改可留空'), { target: { value: 'new-pass' } });
    fireEvent.click(screen.getByRole('button', { name: '关闭账号管理' }));
    await waitFor(() => {
      expect(screen.queryByText('本账号管理')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '赵奶奶' } });
    fireEvent.change(screen.getByPlaceholderText('请输入年龄'), { target: { value: '79' } });
    fireEvent.change(screen.getByPlaceholderText('请输入住址'), { target: { value: '江北区' } });
    fireEvent.change(screen.getByPlaceholderText('请输入紧急联系人姓名'), { target: { value: '家属丁' } });
    fireEvent.change(screen.getByPlaceholderText('请输入与老人关系'), { target: { value: '儿子' } });
    fireEvent.change(screen.getByPlaceholderText('请输入紧急联系人电话'), { target: { value: '13711112222' } });
    fireEvent.click(screen.getByText('男').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: '关闭新增老人' }));
    await waitFor(() => {
      expect(screen.queryByText('新增老人')).not.toBeInTheDocument();
    });
  });

  it('covers account/create overlay close, account phone field, create age field and cancel branch', async () => {
    const view = render(<AssignedElderListPage onSelect={vi.fn()} onEditBasic={vi.fn()} />);

    await screen.findByText('李奶奶');
    fireEvent.click(screen.getByRole('button', { name: '本账号管理' }));
    await screen.findByDisplayValue('13812345678');
    fireEvent.change(screen.getByDisplayValue('13812345678'), { target: { value: '13599990000' } });
    fireEvent.click(view.container.querySelector('.sl-modal-overlay') as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByText('本账号管理')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    expect(await screen.findByText('新增老人')).toBeInTheDocument();
    fireEvent.click(view.container.querySelector('.sl-modal-overlay') as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByText('新增老人')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    expect(await screen.findByText('新增老人')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭新增老人' }));
    await waitFor(() => {
      expect(screen.queryByText('新增老人')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    expect(await screen.findByText('新增老人')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('请输入姓名'), { target: { value: '王奶奶' } });
    fireEvent.change(screen.getByPlaceholderText('请输入年龄'), { target: { value: '76' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => {
      expect(screen.queryByText('新增老人')).not.toBeInTheDocument();
    });
  });
});
