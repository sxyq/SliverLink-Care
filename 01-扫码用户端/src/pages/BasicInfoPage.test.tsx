import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { BasicInfoPage } from './BasicInfoPage';
import type { ElderBasicInfo } from '../types';

vi.mock('../components/BottomTabBar', () => ({
  BottomTabBar: () => <div data-testid="bottom-tab" />,
}));

vi.mock('../components/AppAttribution', () => ({
  AppAttribution: () => <div data-testid="attribution" />,
}));

const baseData: ElderBasicInfo = {
  id: 'elder-001',
  archiveNo: 'A001',
  name: '王测试',
  gender: '女',
  age: 82,
  residence: '滨江社区',
  emergencyContact: '李家属',
  emergencyPhoneMasked: '138****0000',
  emergencyPhoneDial: '13800000000',
  relationship: '女儿',
  aboType: 'O',
  rhType: '阳性',
  allergySummary: '无',
};

function renderPage(data: ElderBasicInfo = baseData, verified = false) {
  return render(
    <MemoryRouter initialEntries={['/basic']}>
      <Routes>
        <Route path="/basic" element={<BasicInfoPage data={data} verified={verified} />} />
        <Route path="/health" element={<p>health page</p>} />
        <Route path="/verify" element={<p>verify page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BasicInfoPage', () => {
  it('shows masked name when not verified', () => {
    renderPage(baseData, false);
    expect(screen.getByText(/王\*/)).toBeInTheDocument();
  });

  it('shows full name when verified', () => {
    renderPage(baseData, true);
    expect(screen.getByText(/王测试/)).toBeInTheDocument();
  });

  it('shows masked emergency contact when not verified', () => {
    renderPage(baseData, false);
    expect(screen.getByText(/138\*\*\*\*0000/)).toBeInTheDocument();
  });

  it('shows verified emergency contact with relationship when verified', () => {
    renderPage(baseData, true);
    expect(screen.getByText(/李家属（女儿）/)).toBeInTheDocument();
    expect(screen.getByText(/13800000000/)).toBeInTheDocument();
  });

  it('shows verified emergency contact without relationship when relationship is empty', () => {
    const noRelData = { ...baseData, relationship: '' };
    renderPage(noRelData, true);
    const contactLine = screen.getByText(/李家属/);
    expect(contactLine.textContent).toContain('李家属');
    expect(contactLine.textContent).toContain('13800000000');
    expect(contactLine.textContent).not.toContain('（）');
  });

  it('shows residence when verified', () => {
    renderPage(baseData, true);
    expect(screen.getByText(/滨江社区/)).toBeInTheDocument();
  });

  it('shows placeholder when verified but residence is empty', () => {
    const noResData = { ...baseData, residence: '' };
    renderPage(noResData, true);
    expect(screen.getByText(/待补充/)).toBeInTheDocument();
  });

  it('shows masked residence message when not verified', () => {
    renderPage(baseData, false);
    expect(screen.getByText(/完成验证后可查看老人详细住址信息/)).toBeInTheDocument();
  });

  it('navigates to health directly when verified and clicking view archive', async () => {
    const user = userEvent.setup();
    renderPage(baseData, true);

    await user.click(screen.getByRole('button', { name: /查看健康档案/ }));
    expect(screen.getByText('health page')).toBeInTheDocument();
  });

  it('shows consent dialog when not verified and clicking view archive', async () => {
    const user = userEvent.setup();
    renderPage(baseData, false);

    await user.click(screen.getByRole('button', { name: /查看健康档案/ }));
    expect(screen.getByText(/查看详细信息前请先完成登记/)).toBeInTheDocument();
  });

  it('navigates to verify page from consent dialog', async () => {
    const user = userEvent.setup();
    renderPage(baseData, false);

    await user.click(screen.getByRole('button', { name: /查看健康档案/ }));
    await user.click(screen.getByRole('button', { name: /继续查看/ }));
    expect(screen.getByText('verify page')).toBeInTheDocument();
  });

  it('closes consent dialog on cancel', async () => {
    const user = userEvent.setup();
    renderPage(baseData, false);

    await user.click(screen.getByRole('button', { name: /查看健康档案/ }));
    expect(screen.getByText(/查看详细信息前请先完成登记/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /暂不查看/ }));
    expect(screen.queryByText(/查看详细信息前请先完成登记/)).not.toBeInTheDocument();
  });

  it('renders medical info section', () => {
    renderPage(baseData);
    expect(screen.getByText(/O型/)).toBeInTheDocument();
    expect(screen.getByText(/阳性/)).toBeInTheDocument();
    expect(screen.getByText(/无/)).toBeInTheDocument();
  });

  it('renders emergency call button with tel link', () => {
    renderPage(baseData);
    const link = screen.getByRole('link', { name: /一键拨打/ });
    expect(link).toHaveAttribute('href', 'tel:13800000000');
  });
});
