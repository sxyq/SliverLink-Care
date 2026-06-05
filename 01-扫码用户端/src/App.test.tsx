import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const securityState = vi.hoisted(() => ({
  verified: false,
  verifiedSessionId: '',
  verifiedElderId: '',
  clearVerification: vi.fn(),
}));

const qrTokenState = vi.hoisted(() => ({
  token: 'qr-token-1',
  isValid: true,
}));

const basicInfoState = vi.hoisted(() => ({
  data: {
    id: 'elder-1',
    name: '王桂兰',
    age: 82,
    archiveNo: 'A001',
    emergencyPhoneMasked: '138****1111',
  },
  loading: false,
  error: '',
}));

const protectedArchiveState = vi.hoisted(() => ({
  verifiedBasicInfo: null as null | { id: string; archiveNo: string; name?: string; age?: number; emergencyPhoneMasked?: string },
  healthRecord: null,
  medications: [],
  scaleSummaries: [],
  loading: false,
}));

vi.mock('./app/SecurityProvider', () => ({
  SecurityProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="security-provider">{children}</div>,
  useSecurity: () => securityState,
}));

vi.mock('./hooks/useQrToken', () => ({
  useQrToken: () => qrTokenState,
}));

vi.mock('./hooks/useScanBasicInfo', () => ({
  useScanBasicInfo: () => basicInfoState,
}));

vi.mock('./hooks/useProtectedArchive', () => ({
  useProtectedArchive: () => protectedArchiveState,
}));

vi.mock('./components/ContentProtection', () => ({
  ContentProtection: ({ enabled, watermarkText }: { enabled: boolean; watermarkText: string }) => (
    <div data-testid="content-protection">
      enabled:{String(enabled)} watermark:{watermarkText}
    </div>
  ),
}));

vi.mock('./pages/BasicInfoPage', () => ({
  BasicInfoPage: ({ data, verified }: { data: { name: string; archiveNo: string }; verified: boolean }) => (
    <div>
      <p>basic:{data.name}</p>
      <p>archive:{data.archiveNo}</p>
      <p>verified:{String(verified)}</p>
    </div>
  ),
}));

vi.mock('./pages/SmsVerifyPage', () => ({
  SmsVerifyPage: () => <p>sms verify page</p>,
}));

vi.mock('./pages/HealthArchivePage', () => ({
  HealthArchivePage: () => <p>health archive page</p>,
}));

vi.mock('./pages/MedicationPage', () => ({
  MedicationPage: () => <p>medication page</p>,
}));

vi.mock('./pages/ScaleSummaryPage', () => ({
  ScaleSummaryPage: () => <p>scale summary page</p>,
}));

vi.mock('./pages/ScaleDetailPage', () => ({
  ScaleDetailPage: () => <p>scale detail page</p>,
}));

vi.mock('./pages/NameplatePreviewPage', () => ({
  NameplatePreviewPage: () => <p>nameplate page</p>,
}));

vi.mock('./pages/NotFoundPage', () => ({
  NotFoundPage: ({ variant }: { variant: string }) => <p>notfound:{variant}</p>,
}));

vi.mock('./routes/router', () => ({
  createAppRouter: (...elements: React.ReactNode[]) => ({ elements }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    RouterProvider: ({ router }: { router: { elements?: React.ReactNode[] } }) => (
      <div data-testid="router-provider">{router.elements?.[0] || null}</div>
    ),
  };
});

describe('scan App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();

    securityState.verified = false;
    securityState.verifiedSessionId = '';
    securityState.verifiedElderId = '';
    securityState.clearVerification.mockReset();

    qrTokenState.token = 'qr-token-1';
    qrTokenState.isValid = true;

    basicInfoState.data = {
      id: 'elder-1',
      name: '王桂兰',
      age: 82,
      archiveNo: 'A001',
      emergencyPhoneMasked: '138****1111',
    };
    basicInfoState.loading = false;
    basicInfoState.error = '';

    protectedArchiveState.verifiedBasicInfo = null;
    protectedArchiveState.healthRecord = null;
    protectedArchiveState.medications = [];
    protectedArchiveState.scaleSummaries = [];
    protectedArchiveState.loading = false;
  });

  it('wraps routes in SecurityProvider and renders the basic page', () => {
    render(<App />);

    expect(screen.getByTestId('security-provider')).toBeInTheDocument();
    expect(screen.getByText('basic:王桂兰')).toBeInTheDocument();
    expect(screen.getByText('archive:A001')).toBeInTheDocument();
    expect(screen.getByText('verified:false')).toBeInTheDocument();
  });

  it('renders the loading router state while basic info is loading', () => {
    basicInfoState.loading = true;

    render(<App />);

    expect(screen.getByText('正在读取智联名牌...')).toBeInTheDocument();
  });

  it('renders missing-token and invalid-qr error routes', () => {
    basicInfoState.data = null as any;
    basicInfoState.error = 'bad token';
    qrTokenState.token = '';
    qrTokenState.isValid = false;

    const { rerender } = render(<App />);
    expect(screen.getByText('notfound:missing-token')).toBeInTheDocument();

    qrTokenState.token = 'broken';
    rerender(<App />);
    expect(screen.getByText('notfound:invalid-qr')).toBeInTheDocument();
  });

  it('clears verification when stored qr token mismatches current token', async () => {
    window.sessionStorage.setItem('silverlink.scan.verifiedQrToken', 'old-token');

    render(<App />);

    await waitFor(() => {
      expect(securityState.clearVerification).toHaveBeenCalledTimes(1);
    });
  });

  it('clears verification when verified elder differs from resolved elder', async () => {
    securityState.verified = true;
    securityState.verifiedElderId = 'elder-2';

    render(<App />);

    await waitFor(() => {
      expect(securityState.clearVerification).toHaveBeenCalledTimes(1);
    });
  });

  it('uses verified basic info with matching elder id in watermark and page props', () => {
    securityState.verified = true;
    securityState.verifiedSessionId = 'session-abcdef';
    protectedArchiveState.verifiedBasicInfo = {
      id: 'elder-1',
      archiveNo: 'A999',
      name: '王桂兰',
      age: 82,
      emergencyPhoneMasked: '138****1111',
    };

    render(<App />);

    expect(screen.getByText('archive:A999')).toBeInTheDocument();
    expect(screen.getByTestId('content-protection')).toHaveTextContent('enabled:true');
    expect(screen.getByTestId('content-protection')).toHaveTextContent('watermark:智联名牌 仅供查看 A999 abcdef');
  });

  it('falls back to resolved basic info in watermark when verified data belongs to another elder', () => {
    securityState.verified = true;
    securityState.verifiedSessionId = 'session-public';
    protectedArchiveState.verifiedBasicInfo = {
      id: 'elder-other',
      archiveNo: 'A777',
      name: '他人',
    };

    render(<App />);

    expect(screen.getByText('archive:A001')).toBeInTheDocument();
    expect(screen.getByTestId('content-protection')).toHaveTextContent('watermark:智联名牌 仅供查看 A001 public');
  });
});
