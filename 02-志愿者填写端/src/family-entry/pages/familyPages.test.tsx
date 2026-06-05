import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FamilyHomePage from './FamilyHomePage';
import FamilyLoginPage from './FamilyLoginPage';
import FamilyRegisterPage from './FamilyRegisterPage';
import InviteLandingPage from './InviteLandingPage';
import QrCodeViewPage from './QrCodeViewPage';
import MedicationManagePage from './MedicationManagePage';
import ContactManagePage from './ContactManagePage';
import ElderBasicManagePage from './ElderBasicManagePage';
import { resetInviteState } from '../features/invite-register/inviteStore';

const familyLogin = vi.fn();
const getBoundElders = vi.fn();
const previewInvitation = vi.fn();
const getElderQrCode = vi.fn();
const requestDisableElderQrCode = vi.fn();
const getMedications = vi.fn();
const addMedication = vi.fn();
const updateMedication = vi.fn();
const deleteMedication = vi.fn();
const getElderDetail = vi.fn();
const updateElderContacts = vi.fn();
const downloadNameplatePdf = vi.fn();

vi.mock('../api/familyAuthApi', () => ({
  familyLogin: (...args: unknown[]) => familyLogin(...args),
}));

vi.mock('../api/familyElderApi', () => ({
  getBoundElders: (...args: unknown[]) => getBoundElders(...args),
  getElderQrCode: (...args: unknown[]) => getElderQrCode(...args),
  requestDisableElderQrCode: (...args: unknown[]) => requestDisableElderQrCode(...args),
  getElderDetail: (...args: unknown[]) => getElderDetail(...args),
  updateElderContacts: (...args: unknown[]) => updateElderContacts(...args),
}));

vi.mock('../api/invitationApi', () => ({
  previewInvitation: (...args: unknown[]) => previewInvitation(...args),
}));

vi.mock('../api/medicationApi', () => ({
  getMedications: (...args: unknown[]) => getMedications(...args),
  addMedication: (...args: unknown[]) => addMedication(...args),
  updateMedication: (...args: unknown[]) => updateMedication(...args),
  deleteMedication: (...args: unknown[]) => deleteMedication(...args),
}));

vi.mock('@shared/MedicationEditorPage', () => ({
  MedicationEditorPage: ({ title, loading, medications, onBack, onCreate, onUpdate, onDelete }: any) => (
    <div>
      <p>editor:{title}</p>
      <p>loading:{String(loading)}</p>
      <p>med-count:{medications.length}</p>
      <button onClick={onBack}>editor back</button>
      <button onClick={() => onCreate?.({ name: '药品A', dosage: '1片', usage: '口服', timing: '早' })}>editor create</button>
      <button onClick={() => onUpdate?.('med-1', { name: '药品B', dosage: '2片', usage: '口服', timing: '晚' })}>editor update</button>
      <button onClick={() => onDelete?.('med-1')}>editor delete</button>
    </div>
  ),
}));

vi.mock('@shared/SubjectDetailPage', () => ({
  SubjectDetailPage: ({ title, subject, onBack, actions, headerAction }: any) => (
    <div>
      <p>subject-detail:{title}</p>
      <p>subject-name:{subject?.name}</p>
      <button onClick={onBack}>detail back</button>
      {actions?.map((a: any) => (
        <button key={a.key} onClick={a.onClick}>{a.title}</button>
      ))}
      {headerAction}
    </div>
  ),
}));

vi.mock('../../shared-workbench/nameplateExport', () => ({
  downloadNameplatePdf: (...args: unknown[]) => downloadNameplatePdf(...args),
}));

describe('family entry pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetInviteState();
    familyLogin.mockReset();
    getBoundElders.mockReset();
    previewInvitation.mockReset();
    getElderQrCode.mockReset();
    requestDisableElderQrCode.mockReset();
    getMedications.mockReset();
    addMedication.mockReset();
    updateMedication.mockReset();
    deleteMedication.mockReset();
    downloadNameplatePdf.mockReset();
    downloadNameplatePdf.mockResolvedValue(undefined);
    vi.stubGlobal('open', vi.fn());
    vi.stubGlobal('alert', vi.fn());
  });

  it('handles family login validation, failure, enter key and success navigation', async () => {
    familyLogin.mockResolvedValueOnce({ success: false, message: '账号错误' }).mockResolvedValueOnce({ success: true });

    const first = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<FamilyLoginPage />} />
          <Route path="/" element={<p>family home route</p>} />
          <Route path="/register" element={<p>register route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(screen.getByText('请输入手机号和密码')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13800000000' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'pass' } });
    fireEvent.keyDown(screen.getByPlaceholderText('请输入密码'), { key: 'Enter' });
    expect(await screen.findByText('账号错误')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '注册家属账号' }));
    expect(screen.getByText('register route')).toBeInTheDocument();
    first.unmount();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<FamilyLoginPage />} />
          <Route path="/" element={<p>family home route</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13800000000' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('family home route')).toBeInTheDocument();
  });

  it('validates family registration and navigates with preset code', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/register', state: { code: 'INV-1' } as any }]}>
        <Routes>
          <Route path="/register" element={<FamilyRegisterPage />} />
          <Route path="/verify" element={<p>verify route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue('INV-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步：短信验证' }));
    expect(screen.getByText('请输入姓名')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请输入后台发放的邀请码'), { target: { value: ' INV-2 ' } });
    fireEvent.change(screen.getByPlaceholderText('请输入您的姓名'), { target: { value: '家属甲' } });
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('子女'));
    fireEvent.change(screen.getByPlaceholderText('首次注册请设置密码；已有账号请输入原密码'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('请再次输入密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步：短信验证' }));
    expect(screen.getByText('手机号格式不正确')).toBeInTheDocument();
    expect(screen.getByText('密码至少6位')).toBeInTheDocument();
    expect(screen.getByText('两次密码不一致')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13800000000' } });
    fireEvent.change(screen.getByPlaceholderText('首次注册请设置密码；已有账号请输入原密码'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('请再次输入密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步：短信验证' }));
    expect(await screen.findByText('verify route')).toBeInTheDocument();
  });

  it('requires invite code when registration has no preset code', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<FamilyRegisterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '下一步：短信验证' }));
    expect(screen.getByText('请输入邀请码')).toBeInTheDocument();
  });

  it('loads family invitation page for active and disabled invitations', async () => {
    previewInvitation
      .mockResolvedValueOnce({
        code: 'INV-1',
        elderName: '王桂兰',
        elderAge: 82,
        elderArchiveNo: 'ARCHIVE12345',
        status: 'ACTIVE',
        expiresAt: '2099-05-26',
        maxUses: 2,
        usedCount: 0,
      })
      .mockResolvedValueOnce({
        code: 'INV-2',
        elderName: '赵永福',
        elderAge: 79,
        elderArchiveNo: 'ARCHIVE54321',
        status: 'DISABLED',
        expiresAt: '2099-05-26',
        maxUses: 1,
        usedCount: 1,
      });

    const first = render(
      <MemoryRouter initialEntries={['/invite/INV-1']}>
        <Routes>
          <Route path="/invite/:code" element={<InviteLandingPage />} />
          <Route path="/register" element={<p>family register route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('家属协管邀请')).toBeInTheDocument();
    expect(screen.getByText('ARCHI****345')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续注册 / 绑定' }));
    expect(await screen.findByText('family register route')).toBeInTheDocument();
    first.unmount();
    resetInviteState();

    render(
      <MemoryRouter initialEntries={['/invite/INV-2']}>
        <Routes>
          <Route path="/invite/:code" element={<InviteLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('该邀请码已作废')).toBeInTheDocument();
  });

  it('handles missing code, preview failure and used/expired invitation statuses', async () => {
    const empty = render(
      <MemoryRouter initialEntries={['/invite']}>
        <Routes>
          <Route path="/invite" element={<InviteLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(previewInvitation).not.toHaveBeenCalled();
    expect(empty.container.textContent).toBe('');
    empty.unmount();

    previewInvitation.mockRejectedValueOnce(new Error('邀请码信息加载失败'));
    const failure = render(
      <MemoryRouter initialEntries={['/invite/FAIL']}>
        <Routes>
          <Route path="/invite/:code" element={<InviteLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('邀请码信息加载失败')).toBeInTheDocument();
    failure.unmount();
    resetInviteState();

    previewInvitation
      .mockResolvedValueOnce({
        code: 'INV-USED',
        elderName: '刘婆婆',
        elderAge: 76,
        elderArchiveNo: 'ARCHIVE66789',
        status: 'USED',
        expiresAt: '2099-05-26',
        maxUses: 1,
        usedCount: 1,
      })
      .mockResolvedValueOnce({
        code: 'INV-EXP',
        elderName: '周爷爷',
        elderAge: 81,
        elderArchiveNo: 'ARCHIVE99887',
        status: 'EXPIRED',
        expiresAt: '2099-05-26',
        maxUses: 1,
        usedCount: 1,
      });

    const used = render(
      <MemoryRouter initialEntries={['/invite/INV-USED']}>
        <Routes>
          <Route path="/invite/:code" element={<InviteLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('该邀请码已被使用')).toBeInTheDocument();
    used.unmount();
    resetInviteState();

    render(
      <MemoryRouter initialEntries={['/invite/INV-EXP']}>
        <Routes>
          <Route path="/invite/:code" element={<InviteLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('该邀请码已过期')).toBeInTheDocument();
  });

  it('renders family home states, binding modal and limit reached copy', async () => {
    getBoundElders
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        elder('1'), elder('2'), elder('3'), elder('4'),
      ]);

    const first = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
          <Route path="/invite/:code" element={<p>invite route</p>} />
          <Route path="/elders/:elderId" element={<p>elder route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('暂无已绑定老人')).toBeInTheDocument();
    first.unmount();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
          <Route path="/invite/:code" element={<p>invite route</p>} />
          <Route path="/elders/:elderId" element={<p>elder route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('当前已绑定 4/4 位，已达到上限。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /输入邀请码/ })).toBeDisabled();
  });

  it('opens bind modal and navigates to invitation detail when slots remain', async () => {
    getBoundElders.mockResolvedValue([elder('1')]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
          <Route path="/invite/:code" element={<p>invite route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/当前家属账号已绑定 1\/4 位老人/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /输入邀请码/ }));
    fireEvent.change(screen.getByPlaceholderText('请输入后台发放的邀请码'), { target: { value: 'INV-OPEN' } });
    fireEvent.click(screen.getByRole('button', { name: '继续绑定' }));
    expect(await screen.findByText('invite route')).toBeInTheDocument();
  });

  it('filters bound elders, navigates to elder detail and closes bind modal without navigating on blank code', async () => {
    getBoundElders.mockResolvedValue([elder('1'), elder('2')]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
          <Route path="/invite/:code" element={<p>invite route</p>} />
          <Route path="/elders/:elderId" element={<p>elder detail route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('老人1')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('请输入老人姓名或档案编号'), { target: { value: 'A002' } });
    expect(screen.queryByText('老人1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /输入邀请码/ }));
    expect(await screen.findByText('绑定上限')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '继续绑定' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '关闭增加档案' }));
    await waitFor(() => {
      expect(screen.queryByText('绑定上限')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('进入档案'));
    expect(await screen.findByText('elder detail route')).toBeInTheDocument();
  });

  it('closes bind modal via cancel button and clears register-mode errors when switching back to login', async () => {
    getBoundElders.mockResolvedValue([elder('1')]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/当前家属账号已绑定 1\/4 位老人/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /输入邀请码/ }));
    expect(await screen.findByText('绑定上限')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => {
      expect(screen.queryByText('绑定上限')).not.toBeInTheDocument();
    });
  });

  it('falls back to empty list when bound elder loading fails and closes bind modal by overlay', async () => {
    getBoundElders.mockRejectedValueOnce(new Error('load failed'));

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
          <Route path="/invite/:code" element={<p>invite route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('暂无已绑定老人')).toBeInTheDocument();

    getBoundElders.mockResolvedValueOnce([elder('1')]);
    const next = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/当前家属账号已绑定 1\/4 位老人/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /输入邀请码/ }));
    expect(await screen.findByText('绑定上限')).toBeInTheDocument();
    fireEvent.click(next.container.querySelector('.sl-modal-overlay') as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByText('绑定上限')).not.toBeInTheDocument();
    });
  });

  it('renders qr code view success, download, disable request, error and empty states', async () => {
    getElderQrCode
      .mockResolvedValueOnce({
        elderId: 'elder-1',
        token: 'token-1',
        status: '启用',
        createdAt: '2026-05-26',
        pdfUrl: 'https://example.com/a.pdf',
      })
      .mockRejectedValueOnce(new Error('二维码信息加载失败'))
      .mockResolvedValueOnce(null);
    requestDisableElderQrCode.mockResolvedValue({
      elderId: 'elder-1',
      token: 'token-1',
      status: '启用',
      createdAt: '2026-05-26',
      pdfUrl: 'https://example.com/a.pdf',
      disableReviewStatus: 'PENDING',
      reviewMessage: '审核中',
    });

    const first = render(
      <MemoryRouter initialEntries={['/elders/elder-1/qrcode']}>
        <Routes>
          <Route path="/elders/:elderId/qrcode" element={<QrCodeViewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('token-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下载名牌 PDF' }));
    expect(window.open).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '申请停用二维码' }));
    expect(await screen.findByText('审核中')).toBeInTheDocument();
    first.unmount();

    const second = render(
      <MemoryRouter initialEntries={['/elders/elder-2/qrcode']}>
        <Routes>
          <Route path="/elders/:elderId/qrcode" element={<QrCodeViewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('二维码信息加载失败')).toBeInTheDocument();
    second.unmount();

    render(
      <MemoryRouter initialEntries={['/elders/elder-3/qrcode']}>
        <Routes>
          <Route path="/elders/:elderId/qrcode" element={<QrCodeViewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('暂无二维码信息')).toBeInTheDocument();
  });

  it('wires family medication page to create, update, delete and back handlers', async () => {
    getMedications.mockResolvedValue([{ id: 'med-1', name: '阿司匹林', dosage: '1片', usage: '口服', timing: '早', updatedAt: '2026-05-26' }]);
    addMedication.mockResolvedValue({});
    updateMedication.mockResolvedValue({});
    deleteMedication.mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={['/back', '/elders/elder-1/medications']} initialIndex={1}>
        <Routes>
          <Route path="/elders/:elderId/medications" element={<MedicationManagePage />} />
          <Route path="/back" element={<p>back route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('editor:用药信息维护')).toBeInTheDocument();
    expect(screen.getByText('med-count:1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'editor create' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor update' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor delete' }));

    await waitFor(() => {
      expect(addMedication).toHaveBeenCalledWith('elder-1', expect.objectContaining({ name: '药品A' }));
      expect(updateMedication).toHaveBeenCalledWith('elder-1', 'med-1', expect.objectContaining({ name: '药品B' }));
      expect(deleteMedication).toHaveBeenCalledWith('elder-1', 'med-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'editor back' }));
    expect(await screen.findByText('back route')).toBeInTheDocument();
  });

  it('keeps medication page usable without elder id and skips api side effects', async () => {
    render(
      <MemoryRouter initialEntries={['/medications']}>
        <Routes>
          <Route path="/medications" element={<MedicationManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('editor:用药信息维护')).toBeInTheDocument();
    expect(screen.getByText('loading:false')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'editor create' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor update' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor delete' }));

    expect(getMedications).not.toHaveBeenCalled();
    expect(addMedication).not.toHaveBeenCalled();
    expect(updateMedication).not.toHaveBeenCalled();
    expect(deleteMedication).not.toHaveBeenCalled();
  });

  it('renders contact manage page, tracks phone changes and saves successfully', async () => {
    getElderDetail.mockResolvedValue({
      id: 'elder-1',
      name: '王桂兰',
      emergencyContactName: '王丽',
      emergencyContactPhone: '13800006666',
      emergencyContactRelation: '女儿',
      backupContactName: '',
      backupContactPhone: '',
      backupContactRelation: '',
    });
    updateElderContacts.mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={['/elders/elder-1', '/elders/elder-1/contacts']} initialIndex={1}>
        <Routes>
          <Route path="/elders/:elderId/contacts" element={<ContactManagePage />} />
          <Route path="/elders/:elderId" element={<p>elder detail</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('联系人维护')).toBeInTheDocument();
    expect(screen.getByDisplayValue('王丽')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13800006666')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('13800006666'), { target: { value: '13900007777' } });
    expect(screen.getByText('修改电话号码后需短信验真确认')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(updateElderContacts).toHaveBeenCalledWith(
        'elder-1',
        expect.objectContaining({
          emergencyContactPhone: '13900007777',
        }),
      );
      expect(screen.getByText('elder detail')).toBeInTheDocument();
    });
  });

  it('renders contact manage page loading then empty state', async () => {
    getElderDetail.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/elders/elder-1/contacts']}>
        <Routes>
          <Route path="/elders/:elderId/contacts" element={<ContactManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('联系人维护')).toBeInTheDocument();
    });
  });

  it('renders contact manage page without elder id and skips loading loop', async () => {
    const priorCalls = getElderDetail.mock.calls.length;

    render(
      <MemoryRouter initialEntries={['/contacts']}>
        <Routes>
          <Route path="/contacts" element={<ContactManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('联系人维护')).toBeInTheDocument();
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
    expect(getElderDetail).toHaveBeenCalledTimes(priorCalls);
  });

  it('keeps contact phone-change banner until all changed phones are restored and surfaces request errors', async () => {
    getElderDetail.mockResolvedValue({
      id: 'elder-1',
      name: '王桂兰',
      emergencyContactName: '王丽',
      emergencyContactPhone: '13800006666',
      emergencyContactRelation: '女儿',
      backupContactName: '王梅',
      backupContactPhone: '13700002222',
      backupContactRelation: '侄女',
    });
    updateElderContacts
      .mockResolvedValueOnce({ success: false, message: '保存失败' })
      .mockRejectedValueOnce(new Error('请求异常'));

    render(
      <MemoryRouter initialEntries={['/elders/elder-1/contacts']}>
        <Routes>
          <Route path="/elders/:elderId/contacts" element={<ContactManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('13700002222')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('13800006666'), { target: { value: '13900007777' } });
    const backupPhoneInput = screen.getByDisplayValue('13700002222');
    fireEvent.change(backupPhoneInput, { target: { value: '13600003333' } });
    expect(screen.getByText('修改电话号码后需短信验真确认')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('13600003333'), { target: { value: '13700002222' } });
    expect(screen.getByText('修改电话号码后需短信验真确认')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('13900007777'), { target: { value: '13800006666' } });
    expect(screen.queryByText('修改电话号码后需短信验真确认')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      expect(updateElderContacts).toHaveBeenCalled();
    });
    expect(window.alert).toHaveBeenCalledWith('保存失败');

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('请求异常');
    });
  });

  it('updates all contact fields before save so non-phone inputs and backup relation branches are covered', async () => {
    getElderDetail.mockResolvedValue({
      id: 'elder-1',
      name: '王桂兰',
      emergencyContactName: '王丽',
      emergencyContactPhone: '13800006666',
      emergencyContactRelation: '女儿',
      backupContactName: '王梅',
      backupContactPhone: '13700002222',
      backupContactRelation: '侄女',
    });
    updateElderContacts.mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={['/elders/elder-1/contacts']}>
        <Routes>
          <Route path="/elders/:elderId/contacts" element={<ContactManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('王丽')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('王丽'), { target: { value: '王芳' } });
    fireEvent.change(screen.getByDisplayValue('女儿'), { target: { value: '外孙女' } });
    fireEvent.change(screen.getByDisplayValue('王梅'), { target: { value: '王琴' } });
    fireEvent.change(screen.getByDisplayValue('侄女'), { target: { value: '邻居' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(updateElderContacts).toHaveBeenCalledWith(
        'elder-1',
        expect.objectContaining({
          emergencyContactName: '王芳',
          emergencyContactRelation: '外孙女',
          backupContactName: '王琴',
          backupContactRelation: '邻居',
        }),
      );
    });
  });

  it('renders elder basic manage page with elder detail and action navigation', async () => {
    getElderDetail.mockResolvedValue({
      id: 'elder-1',
      name: '王桂兰',
      gender: '女',
      age: 82,
      archiveNo: 'A001',
      bloodType: 'O',
      allergyHistory: '无',
      emergencyContactName: '王丽',
      emergencyContactPhone: '13800006666',
      emergencyContactRelation: '女儿',
    });

    render(
      <MemoryRouter initialEntries={['/elders/elder-1/basic']}>
        <Routes>
          <Route path="/elders/:elderId/basic" element={<ElderBasicManagePage />} />
          <Route path="/" element={<p>home</p>} />
          <Route path="/elders/:elderId/contacts" element={<p>contacts route</p>} />
          <Route path="/elders/:elderId/medications" element={<p>medications route</p>} />
          <Route path="/elders/:elderId/qrcode" element={<p>qrcode route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('subject-detail:老人信息')).toBeInTheDocument();
    expect(screen.getByText('subject-name:王桂兰')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '联系人维护' }));
    expect(screen.getByText('contacts route')).toBeInTheDocument();
  });

  it('renders elder basic manage page empty state', async () => {
    getElderDetail.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/elders/elder-1/basic']}>
        <Routes>
          <Route path="/elders/:elderId/basic" element={<ElderBasicManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('未找到老人信息')).toBeInTheDocument();
  });

  it('renders elder basic page without elder id and avoids detail request', async () => {
    const priorCalls = getElderDetail.mock.calls.length;

    render(
      <MemoryRouter initialEntries={['/basic']}>
        <Routes>
          <Route path="/basic" element={<ElderBasicManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('未找到老人信息')).toBeInTheDocument();
    expect(getElderDetail).toHaveBeenCalledTimes(priorCalls);
  });

  it('handles elder basic export success, export failure and back navigation', async () => {
    getElderDetail
      .mockResolvedValueOnce({
        id: 'elder-1',
        name: '王桂兰',
        gender: '女',
        age: 82,
        archiveNo: 'A001',
        bloodType: 'O',
        allergyHistory: '无',
        emergencyContactName: '王丽',
        emergencyContactPhone: '13800006666',
        emergencyContactRelation: '女儿',
      })
      .mockResolvedValueOnce({
        id: 'elder-2',
        name: '赵永福',
        gender: '男',
        age: 79,
        archiveNo: 'A002',
        bloodType: 'A',
        allergyHistory: '青霉素过敏',
        emergencyContactName: '赵丽',
        emergencyContactPhone: '13800008888',
        emergencyContactRelation: '儿媳',
      });
    downloadNameplatePdf
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('导出失败，请稍后重试'));

    const first = render(
      <MemoryRouter initialEntries={['/', '/elders/elder-1/basic']} initialIndex={1}>
        <Routes>
          <Route path="/" element={<p>family home</p>} />
          <Route path="/elders/:elderId/basic" element={<ElderBasicManagePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('subject-name:王桂兰')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '导出名牌 PDF' }));
    await waitFor(() => {
      expect(downloadNameplatePdf).toHaveBeenCalledWith({
        elderId: 'elder-1',
        archiveNo: 'A001',
        tokenStorageKey: 'family_token',
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'detail back' }));
    expect(screen.getByText('family home')).toBeInTheDocument();
    first.unmount();

    render(
      <MemoryRouter initialEntries={['/elders/elder-2/basic']}>
        <Routes>
          <Route path="/elders/:elderId/basic" element={<ElderBasicManagePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('subject-name:赵永福')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '导出名牌 PDF' }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('导出失败，请稍后重试');
    });
  });

  it('navigates to medication and qrcode actions from elder basic manage page', async () => {
    getElderDetail.mockResolvedValue({
      id: 'elder-1',
      name: '王桂兰',
      gender: '女',
      age: 82,
      archiveNo: 'A001',
      bloodType: 'O',
      allergyHistory: '无',
      emergencyContactName: '王丽',
      emergencyContactPhone: '13800006666',
      emergencyContactRelation: '女儿',
    });

    const first = render(
      <MemoryRouter initialEntries={['/elders/elder-1/basic']}>
        <Routes>
          <Route path="/elders/:elderId/basic" element={<ElderBasicManagePage />} />
          <Route path="/elders/:elderId/medications" element={<p>medications route</p>} />
          <Route path="/elders/:elderId/qrcode" element={<p>qrcode route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('subject-detail:老人信息')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '用药信息' }));
    expect(await screen.findByText('medications route')).toBeInTheDocument();
    first.unmount();

    render(
      <MemoryRouter initialEntries={['/elders/elder-1/basic']}>
        <Routes>
          <Route path="/elders/:elderId/basic" element={<ElderBasicManagePage />} />
          <Route path="/elders/:elderId/qrcode" element={<p>qrcode route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('subject-detail:老人信息')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '二维码查看' }));
    expect(await screen.findByText('qrcode route')).toBeInTheDocument();
  });
});

function elder(id: string) {
  return {
    id,
    archiveNo: `A00${id}`,
    name: `老人${id}`,
    age: 80,
    gender: '女',
    bloodType: 'O',
    allergyHistory: '无',
    emergencyContactName: '家属',
    emergencyContactPhone: '13800000000',
    emergencyContactRelation: '女儿',
  };
}
