import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setAuthToken = vi.fn();
const clearAuthToken = vi.fn();
const fetchVolunteerProfile = vi.fn();

vi.mock('../api/httpClient', () => ({
  setAuthToken: (...args: unknown[]) => setAuthToken(...args),
  clearAuthToken: (...args: unknown[]) => clearAuthToken(...args),
}));

vi.mock('../api/volunteerApi', () => ({
  fetchVolunteerProfile: (...args: unknown[]) => fetchVolunteerProfile(...args),
}));

vi.mock('../pages/LoginPage', () => ({
  LoginPage: () => <p>volunteer login page</p>,
}));

vi.mock('../pages/AssignedElderListPage', () => ({
  AssignedElderListPage: ({ onSelect, onEditBasic }: any) => (
    <div>
      <p>assigned elder list</p>
      <button onClick={() => onSelect(sampleElder())}>select elder</button>
      <button onClick={() => onEditBasic(sampleElder())}>edit elder</button>
    </div>
  ),
}));

vi.mock('../pages/ElderDetailPage', () => ({
  ElderDetailPage: ({ onBack, onEditBasic, onEditMedication, onEditScale, onManageQrCode }: any) => (
    <div>
      <p>elder detail</p>
      <button onClick={onBack}>go list</button>
      <button onClick={onEditBasic}>go basic</button>
      <button onClick={onEditMedication}>go medication</button>
      <button onClick={onEditScale}>go scale</button>
      <button onClick={onManageQrCode}>go qrcode</button>
    </div>
  ),
}));

vi.mock('../pages/BasicInfoFormPage', () => ({
  BasicInfoFormPage: ({ elder, onBack }: any) => (
    <div>
      <p>basic form:{elder.name}</p>
      <button onClick={onBack}>back basic</button>
    </div>
  ),
}));

vi.mock('../pages/MedicationFormPage', () => ({
  MedicationFormPage: ({ elder, onBack }: any) => (
    <div>
      <p>medication form:{elder.name}</p>
      <button onClick={onBack}>back medication</button>
    </div>
  ),
}));

vi.mock('../pages/ScaleFormPage', () => ({
  ScaleFormPage: ({ elder, onBack }: any) => (
    <div>
      <p>scale form:{elder.name}</p>
      <button onClick={onBack}>back scale</button>
    </div>
  ),
}));

vi.mock('../pages/QrCodeManagePage', () => ({
  QrCodeManagePage: ({ elder, onBack }: any) => (
    <div>
      <p>qrcode form:{elder.name}</p>
      <button onClick={onBack}>back qrcode</button>
    </div>
  ),
}));

vi.mock('../family-entry/App', () => ({
  default: () => <p>family entry app</p>,
}));

import { AuthProvider, useAuth } from './AuthProvider';
import { App } from '../App';

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <p>logged:{String(auth.loggedIn)}</p>
      <p>user:{auth.user?.account || '-'}</p>
      <button onClick={() => auth.login('token-1', { account: 'vol-1', name: '志愿者甲' })}>login</button>
      <button onClick={() => auth.updateUser({ account: 'vol-2', name: '志愿者乙' })}>update</button>
      <button onClick={auth.logout}>logout</button>
    </div>
  );
}

function DefaultAuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <p>default-logged:{String(auth.loggedIn)}</p>
      <p>default-user:{auth.user?.account || '-'}</p>
      <button onClick={() => auth.login('noop')}>default login</button>
      <button onClick={() => auth.updateUser({ account: 'noop', name: 'noop' })}>default update</button>
      <button onClick={auth.logout}>default logout</button>
    </div>
  );
}

describe('volunteer auth provider and app flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAuthToken.mockReset();
    clearAuthToken.mockReset();
    fetchVolunteerProfile.mockReset();
    fetchVolunteerProfile.mockRejectedValue(new Error('not authenticated'));
    localStorage.clear();
    window.location.hash = '';
  });

  it('hydrates, logs in, updates user and logs out', async () => {
    fetchVolunteerProfile.mockResolvedValue({ account: 'seed', name: '初始', phone: '' });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('logged:true')).toBeInTheDocument();
    expect(screen.getByText('user:seed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(setAuthToken).toHaveBeenCalledWith('token-1');
    expect(screen.getByText('user:vol-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    expect(screen.getByText('user:vol-2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(clearAuthToken).toHaveBeenCalled();
    expect(screen.getByText('logged:false')).toBeInTheDocument();
  });

  it('falls back safely when profile hydration fails and login has no profile payload', async () => {
    function LoginWithoutProfileProbe() {
      const auth = useAuth();
      return (
        <div>
          <p>logged:{String(auth.loggedIn)}</p>
          <p>user:{auth.user?.account || '-'}</p>
          <button onClick={() => auth.login('token-2')}>login without profile</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LoginWithoutProfileProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('logged:false')).toBeInTheDocument();
    expect(screen.getByText('user:-')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'login without profile' }));
    expect(setAuthToken).toHaveBeenCalledWith('token-2');
    expect(screen.getByText('logged:true')).toBeInTheDocument();
  });

  it('keeps a hydrated profile without an account safely displayable', async () => {
    fetchVolunteerProfile.mockResolvedValue({ account: '', name: '只有姓名', phone: '' });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('logged:true')).toBeInTheDocument();
    expect(screen.getByText('user:-')).toBeInTheDocument();
  });

  it('exposes safe default auth context outside provider', () => {
    render(<DefaultAuthProbe />);

    expect(screen.getByText('default-logged:false')).toBeInTheDocument();
    expect(screen.getByText('default-user:-')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'default login' }));
    fireEvent.click(screen.getByRole('button', { name: 'default update' }));
    fireEvent.click(screen.getByRole('button', { name: 'default logout' }));

    expect(setAuthToken).not.toHaveBeenCalled();
    expect(clearAuthToken).not.toHaveBeenCalled();
  });

  it('renders login page when not logged in and family app when hash enters family entry', async () => {
    const first = render(<App />);
    expect(await screen.findByText('volunteer login page')).toBeInTheDocument();
    first.unmount();

    window.location.hash = '#/family/login';
    render(<App />);
    expect(await screen.findByText('family entry app')).toBeInTheDocument();
  });

  it('renders list, detail and quick-nav forms when logged in', async () => {
    fetchVolunteerProfile.mockResolvedValue({ account: 'vol', name: '志愿者', phone: '' });

    render(<App />);
    expect(await screen.findByText('assigned elder list')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select elder' }));
    expect(screen.getByText('elder detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go medication' }));
    expect(screen.getByText('medication form:王桂兰')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '档案资料' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /基本信息/ }));
    expect(screen.getByText('basic form:王桂兰')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /主要用药/ }));
    expect(screen.getByText('medication form:王桂兰')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /量表信息/ }));
    expect(screen.getByText('scale form:王桂兰')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /二维码管理/ }));
    expect(screen.getByText('qrcode form:王桂兰')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'back qrcode' }));
    expect(screen.getByText('elder detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go list' }));
    expect(screen.getByText('assigned elder list')).toBeInTheDocument();
  });

  it('allows direct basic editing from list', async () => {
    fetchVolunteerProfile.mockResolvedValue({ account: 'vol', name: '志愿者', phone: '' });
    render(<App />);

    expect(await screen.findByText('assigned elder list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'edit elder' }));
    expect(screen.getByText('basic form:王桂兰')).toBeInTheDocument();
  });

  it('supports direct detail shortcuts for basic, scale and qrcode pages', async () => {
    fetchVolunteerProfile.mockResolvedValue({ account: 'vol', name: '志愿者', phone: '' });

    render(<App />);
    expect(await screen.findByText('assigned elder list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'select elder' }));
    expect(screen.getByText('elder detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go basic' }));
    expect(screen.getByText('basic form:王桂兰')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'back basic' }));
    expect(screen.getByText('elder detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go scale' }));
    expect(screen.getByText('scale form:王桂兰')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'back scale' }));
    expect(screen.getByText('elder detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go qrcode' }));
    expect(screen.getByText('qrcode form:王桂兰')).toBeInTheDocument();
  });

  it('switches into family entry when hash changes after initial render', async () => {
    fetchVolunteerProfile.mockResolvedValue({ account: 'vol', name: '志愿者', phone: '' });
    render(<App />);

    expect(await screen.findByText('assigned elder list')).toBeInTheDocument();

    await act(async () => {
      window.location.hash = '#/family/';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(await screen.findByText('family entry app')).toBeInTheDocument();
  });

  it('treats #/family as a family entry route', async () => {
    window.location.hash = '#/family';

    render(<App />);
    expect(await screen.findByText('family entry app')).toBeInTheDocument();
  });
});

function sampleElder() {
  return {
    id: 'elder-1',
    archiveNo: 'A001',
    name: '王桂兰',
    age: 82,
    lastVisitDate: '2026-05-26',
    status: '在档',
  };
}
