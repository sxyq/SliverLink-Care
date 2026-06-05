import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BasicInfoPage } from './BasicInfoPage';
import { MedicationPage } from './MedicationPage';
import { NameplatePreviewPage } from './NameplatePreviewPage';
import { NotFoundPage } from './NotFoundPage';
import type { ElderBasicInfo } from '../types';

const reportAudit = vi.fn();

vi.mock('../api/auditApi', () => ({
  reportAudit: (...args: unknown[]) => reportAudit(...args),
}));

describe('scan pages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    reportAudit.mockReset();
  });

  it('renders not-found variants with the correct copy', () => {
    const { rerender } = render(<NotFoundPage variant="missing-token" />);
    expect(screen.getByRole('heading', { name: '请扫码二维码' })).toBeInTheDocument();
    expect(screen.getByText('请回到微信或相机，重新扫描名牌上的二维码。')).toBeInTheDocument();

    rerender(<NotFoundPage variant="invalid-qr" />);
    expect(screen.getByRole('heading', { name: '该二维码已经过期' })).toBeInTheDocument();
    expect(screen.getByText(/二维码已经停用/)).toBeInTheDocument();
  });

  it('renders medication loading, empty and list states', () => {
    const { rerender } = render(<MedicationPage data={null} loading />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();

    rerender(<MedicationPage data={[]} loading={false} />);
    expect(screen.getByText('暂无用药记录')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <MedicationPage data={[{ name: '阿司匹林', dosage: '100mg', time: '早饭后' }]} loading={false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '阿司匹林' })).toBeInTheDocument();
    expect(screen.getByText('100mg | 早饭后')).toBeInTheDocument();
    expect(screen.getByText('请遵医嘱')).toBeInTheDocument();
  });

  it('downloads nameplate PDF and reports audit on success', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:pdf');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(new Blob(['pdf'])) }));
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLAnchorElement;
      if (tagName === 'a') {
        element.click = click;
      }
      return element;
    });

    render(<NameplatePreviewPage elderId="elder-1" name="赵永福" age={79} phone="13877778888" archiveNo="A001" />);
    await user.click(screen.getByRole('button', { name: /下载 PDF/ }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
    expect(reportAudit).toHaveBeenCalledWith({ action: 'nameplate_pdf_download', target: 'A001' });
  });

  it('alerts when nameplate PDF generation fails', async () => {
    const user = userEvent.setup();
    const alert = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    vi.stubGlobal('alert', alert);

    render(<NameplatePreviewPage elderId="elder-1" />);
    await user.click(screen.getByRole('button', { name: /生成 PDF/ }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('PDF 下载失败，请稍后重试'));
  });

  it('keeps UI responsive when audit reporting fails after nameplate download succeeds', async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:pdf');
    const revokeObjectURL = vi.fn();
    reportAudit.mockRejectedValueOnce(new Error('audit failed'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(new Blob(['pdf'])) }));
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLAnchorElement;
      if (tagName === 'a') {
        element.click = click;
      }
      return element;
    });

    render(<NameplatePreviewPage elderId="elder-2" archiveNo="" />);
    await user.click(screen.getByRole('button', { name: /下载 PDF/ }));

    await waitFor(() => {
      expect(click).toHaveBeenCalledTimes(1);
      expect(reportAudit).toHaveBeenCalledWith({ action: 'nameplate_pdf_download', target: 'elder-2' });
    });

    expect(screen.getByRole('button', { name: /生成 PDF/ })).toBeEnabled();
  });

  it('asks for consent before viewing protected archive when not verified', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<BasicInfoPage data={basicInfo()} />} />
          <Route path="/verify" element={<p>verify page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('姓名： 王**')).toBeInTheDocument();
    expect(screen.getByText('完成验证后可查看老人详细住址信息')).toBeInTheDocument();
    expect(screen.getByText(/紧急联系人： 王女士/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看健康档案' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '暂不查看' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看健康档案' }));
    await user.click(screen.getByRole('button', { name: '继续查看' }));
    expect(screen.getByText('verify page')).toBeInTheDocument();
  });

  it('shows full basic info and opens archive directly after verification', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<BasicInfoPage data={{ ...basicInfo(), residence: '' }} verified />} />
          <Route path="/health" element={<p>health page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('姓名： 王桂兰')).toBeInTheDocument();
    expect(screen.getByText('待补充')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('王丽（女儿）') && content.includes('13800006666'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看健康档案' }));
    expect(screen.getByText('health page')).toBeInTheDocument();
  });
});

function basicInfo(): ElderBasicInfo {
  return {
    id: 'elder-1',
    archiveNo: 'A001',
    name: '王桂兰',
    gender: '女',
    age: 82,
    residence: '滨江社区 3 栋 2 单元',
    emergencyContact: '王丽',
    emergencyPhoneMasked: '138****6666',
    emergencyPhoneDial: '13800006666',
    relationship: '女儿',
    aboType: 'O',
    rhType: '阳性',
    allergySummary: '无明确药物过敏史',
  };
}
