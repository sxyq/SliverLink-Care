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
  downloadNameplatePdf: vi.fn().mockResolvedValue(undefined),
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
    vi.stubGlobal('open', vi.fn());
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
      <MemoryRouter initialEntries={['/elders/elder-1/medications']}>
        <Routes>
          <Route path="/elders/:elderId/medications" element={<MedicationManagePage />} />
          <Route path="/" element={<p>back route</p>} />
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
  });

  it('renders contact manage page with contacts and handles update', async () => {
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
      <MemoryRouter initialEntries={['/elders/elder-1/contacts']}>
        <Routes>
          <Route path="/elders/:elderId/contacts" element={<ContactManagePage />} />
          <Route path="/elders/:elderId" element={<p>elder detail</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('联系人维护')).toBeInTheDocument();
    expect(screen.getByDisplayValue('王丽')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13800006666')).toBeInTheDocument();
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

  it('renders elder basic manage page with elder detail', async () => {
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
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('subject-detail:老人信息')).toBeInTheDocument();
    expect(screen.getByText('subject-name:王桂兰')).toBeInTheDocument();
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
