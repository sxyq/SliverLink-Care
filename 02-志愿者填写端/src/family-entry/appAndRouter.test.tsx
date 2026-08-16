import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FamilyEntryApp from './App';
import { AppRouter } from './routes/router';
import { clearToken, setToken } from './api/httpClient';

vi.mock('./pages/InviteLandingPage', () => ({
  default: () => <p>invite landing route</p>,
}));

vi.mock('./pages/FamilyRegisterPage', () => ({
  default: () => <p>family register route</p>,
}));

vi.mock('./pages/SmsVerifyPage', () => ({
  default: () => <p>family sms verify route</p>,
}));

vi.mock('./pages/FamilyLoginPage', () => ({
  default: () => <p>family login route</p>,
}));

vi.mock('./pages/FamilyHomePage', () => ({
  default: () => <p>family home route</p>,
}));

vi.mock('./pages/ElderBasicManagePage', () => ({
  default: () => <p>elder basic route</p>,
}));

vi.mock('./pages/ContactManagePage', () => ({
  default: () => <p>contact manage route</p>,
}));

vi.mock('./pages/MedicationManagePage', () => ({
  default: () => <p>medication manage route</p>,
}));

vi.mock('./pages/QrCodeViewPage', () => ({
  default: () => <p>qrcode view route</p>,
}));

describe('family entry app and router', () => {
  afterEach(() => {
    clearToken();
    window.location.hash = '';
  });

  it('renders hash-router routes under the /family basename', async () => {
    window.location.hash = '#/family/invite/INV-001';
    render(<FamilyEntryApp />);

    expect(await screen.findByText('invite landing route')).toBeInTheDocument();
  });

  it('routes all configured family pages and falls back to home on unknown routes', () => {
    const first = render(
      <MemoryRouter initialEntries={['/register']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('family register route')).toBeInTheDocument();
    first.unmount();

    const second = render(
      <MemoryRouter initialEntries={['/verify']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('family sms verify route')).toBeInTheDocument();
    second.unmount();

    const third = render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('family login route')).toBeInTheDocument();
    third.unmount();

    setToken('family-token');

    const fourth = render(
      <MemoryRouter initialEntries={['/elders/elder-1']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('elder basic route')).toBeInTheDocument();
    fourth.unmount();

    const fifth = render(
      <MemoryRouter initialEntries={['/elders/elder-1/contacts']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('contact manage route')).toBeInTheDocument();
    fifth.unmount();

    const sixth = render(
      <MemoryRouter initialEntries={['/elders/elder-1/medications']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('medication manage route')).toBeInTheDocument();
    sixth.unmount();

    const seventh = render(
      <MemoryRouter initialEntries={['/elders/elder-1/qrcode']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('qrcode view route')).toBeInTheDocument();
    seventh.unmount();

    render(
      <MemoryRouter initialEntries={['/unexpected']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('family home route')).toBeInTheDocument();
  });
});
