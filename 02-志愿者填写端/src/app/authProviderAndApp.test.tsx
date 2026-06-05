import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setAuthToken = vi.fn();
const clearAuthToken = vi.fn();

vi.mock('../api/httpClient', () => ({
  setAuthToken: (...args: unknown[]) => setAuthToken(...args),
  clearAuthToken: (...args: unknown[]) => clearAuthToken(...args),
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
    localStorage.clear();
    window.location.hash = '';
  });

  it('hydrates, logs in, updates user and logs out', () => {
    localStorage.setItem('sl_user', JSON.stringify({ account: 'seed', name: '初始' }));
    localStorage.setItem('sl_token', 'seed-token');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('logged:true')).toBeInTheDocument();
    expect(screen.getByText('user:seed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(setAuthToken).toHaveBeenCalledWith('token-1');
    expect(localStorage.getItem('sl_user')).toContain('vol-1');

    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    expect(screen.getByText('user:vol-2')).toBeInTheDocument();
    expect(localStorage.getItem('sl_user')).toContain('vol-2');

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(clearAuthToken).toHaveBeenCalled();
    expect(screen.getByText('logged:false')).toBeInTheDocument();
  });

  it('falls back safely when persisted user json is invalid and login has no profile payload', () => {
    localStorage.setItem('sl_token', 'seed-token');
    localStorage.setItem('sl_user', '{bad-json');

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

    expect(screen.getByText('logged:true')).toBeInTheDocument();
    expect(screen.getByText('user:-')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'login without profile' }));
    expect(setAuthToken).toHaveBeenCalledWith('token-2');
    expect(localStorage.getItem('sl_user')).toBeNull();
  });

  it('ignores persisted user objects without account field', () => {
    localStorage.setItem('sl_token', 'seed-token');
    localStorage.setItem('sl_user', JSON.stringify({ name: '只有姓名' }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('logged:true')).toBeInTheDocument();
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

  it('renders login page when not logged in and family app when hash enters family entry', () => {
    const first = render(<App />);
    expect(screen.getByText('volunteer login page')).toBeInTheDocument();
    first.unmount();

    window.location.hash = '#/family/login';
    render(<App />);
    expect(screen.getByText('family entry app')).toBeInTheDocument();
  });

  it('renders list, detail and quick-nav forms when logged in', () => {
    localStorage.setItem('sl_token', 'token-1');
    localStorage.setItem('sl_user', JSON.stringify({ account: 'vol', name: '志愿者' }));

    render(<App />);
    expect(screen.getByText('assigned elder list')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select elder' }));
    expect(screen.getByText('elder detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go medication' }));
    expect(screen.getByText('medication form:王桂兰')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '档案快捷切换' })).toBeInTheDocument();

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

  it('allows direct basic editing from list', () => {
    localStorage.setItem('sl_token', 'token-1');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'edit elder' }));
    expect(screen.getByText('basic form:王桂兰')).toBeInTheDocument();
  });

  it('supports direct detail shortcuts for basic, scale and qrcode pages', () => {
    localStorage.setItem('sl_token', 'token-1');
    localStorage.setItem('sl_user', JSON.stringify({ account: 'vol', name: '志愿者' }));

    render(<App />);
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
    localStorage.setItem('sl_token', 'token-1');
    render(<App />);

    expect(screen.getByText('assigned elder list')).toBeInTheDocument();

    await act(async () => {
      window.location.hash = '#/family/';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(await screen.findByText('family entry app')).toBeInTheDocument();
  });

  it('treats #/family as a family entry route', () => {
    localStorage.setItem('sl_token', 'token-1');
    window.location.hash = '#/family';

    render(<App />);
    expect(screen.getByText('family entry app')).toBeInTheDocument();
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
