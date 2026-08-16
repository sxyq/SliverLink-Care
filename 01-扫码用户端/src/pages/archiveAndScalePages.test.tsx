import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HealthArchivePage } from './HealthArchivePage';
import { ScaleDetailPage } from './ScaleDetailPage';
import { ScaleSummaryPage } from './ScaleSummaryPage';
import type { ElderBasicInfo, HealthRecord, ScaleSummary } from '../types';

describe('archive and scale pages', () => {
  it('renders health archive loading, empty, masked and verified contact states', () => {
    const { rerender } = render(
      <MemoryRouter>
        <HealthArchivePage data={null} basicInfo={basicInfo()} loading />
      </MemoryRouter>,
    );
    expect(screen.getByText('加载中...')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <HealthArchivePage data={null} basicInfo={basicInfo()} loading={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText('暂无健康档案')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <HealthArchivePage data={healthRecord()} basicInfo={basicInfo()} loading={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText('健康档案编号')).toBeInTheDocument();
    expect(screen.getByText('身高 160cm，体重 55kg，BMI 21.5')).toBeInTheDocument();
    expect(screen.getByText('王女士')).toHaveAttribute('dir', 'auto');
    expect(screen.getByText('138****6666')).toHaveAttribute('dir', 'ltr');

    rerender(
      <MemoryRouter>
        <HealthArchivePage data={{ ...healthRecord(), volunteer: '', healthSelfAssessment: '', emotionScreening: '', cognitiveScreening: '' }} basicInfo={{ ...basicInfo(), relationship: '' }} loading={false} verified />
      </MemoryRouter>,
    );
    expect(screen.getByText('记录人： 暂无记录')).toBeInTheDocument();
    expect(screen.getByText('王丽')).toHaveAttribute('dir', 'auto');
    expect(screen.getByText('13800006666')).toHaveAttribute('dir', 'ltr');
    expect(screen.getAllByText('暂无记录').length).toBeGreaterThan(0);
  });

  it('renders scale summary loading, empty and navigates to detail page', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <ScaleSummaryPage data={null} loading />
      </MemoryRouter>,
    );
    expect(screen.getByText('加载中...')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ScaleSummaryPage data={[]} loading={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText('暂无量表记录')).toBeInTheDocument();

    render(
      <MemoryRouter initialEntries={['/scale']}>
        <Routes>
          <Route path="/scale" element={<ScaleSummaryPage data={scaleSummaries()} loading={false} />} />
          <Route path="/scale/:scaleName" element={<p>detail route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /PHQ-9/ }));
    expect(screen.getByText('detail route')).toBeInTheDocument();
  });

  it('renders scale detail variants, answers and fallback navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/scale/PHQ-9']}>
        <Routes>
          <Route path="/scale/:scaleName" element={<ScaleDetailPage data={scaleSummaries()} loading={false} />} />
          <Route path="/scale" element={<p>scale list</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('抑郁情绪筛查')).toBeInTheDocument();
    expect(screen.getByText('当前分值提示需持续关注')).toBeInTheDocument();
    expect(screen.getByText('几乎每天')).toBeInTheDocument();
    expect(screen.getByText('未填写')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /返回量表列表/ }));
    expect(screen.getByText('scale list')).toBeInTheDocument();
  });

  it('renders scale detail loading and missing states plus GAD and UCLA copy', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/scale/GAD-7']}>
        <ScaleDetailPage data={null} loading />
      </MemoryRouter>,
    );
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    unmount();

    const missing = render(
      <MemoryRouter initialEntries={['/scale/MISSING']}>
        <Routes>
          <Route path="/scale/:scaleName" element={<ScaleDetailPage data={scaleSummaries()} loading={false} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('未找到量表详情')).toBeInTheDocument();
    missing.unmount();

    const gad = render(
      <MemoryRouter initialEntries={['/scale/GAD-7']}>
        <Routes>
          <Route path="/scale/:scaleName" element={<ScaleDetailPage data={scaleSummaries()} loading={false} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('焦虑情绪筛查')).toBeInTheDocument();
    expect(screen.getByText('选项 9')).toBeInTheDocument();
    gad.unmount();

    render(
      <MemoryRouter initialEntries={['/scale/UCLA']}>
        <Routes>
          <Route path="/scale/:scaleName" element={<ScaleDetailPage data={scaleSummaries()} loading={false} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('孤独感筛查')).toBeInTheDocument();
    expect(screen.getByText('当前分值建议进一步随访')).toBeInTheDocument();
  });
});

function basicInfo(): ElderBasicInfo {
  return {
    id: 'elder-1',
    archiveNo: 'A001',
    name: '王桂兰',
    gender: '女',
    age: 82,
    residence: '滨江社区',
    emergencyContact: '王丽',
    emergencyPhoneMasked: '138****6666',
    emergencyPhoneDial: '13800006666',
    relationship: '女儿',
    aboType: 'O',
    rhType: '阳性',
    allergySummary: '',
  };
}

function healthRecord(): HealthRecord {
  return {
    date: '2026-05-25',
    volunteer: '赵社工',
    heightCm: 160,
    weightKg: 55,
    waistCm: 80,
    bmi: 21.5,
    healthSelfAssessment: '高血压',
    selfCareAssessment: '可自理',
    cognitiveScreening: '认知正常',
    emotionScreening: '情绪稳定',
  };
}

function scaleSummaries(): ScaleSummary[] {
  return [
    {
      name: 'PHQ-9',
      score: 9,
      updatedAt: '2026-05-25',
      volunteer: '赵社工',
      answers: [
        { question: '睡眠问题', value: 3 },
        { question: '食欲问题', value: null },
      ],
    },
    {
      name: 'GAD-7',
      score: 16,
      updatedAt: 'bad-date',
      volunteer: '',
      answers: [{ question: '担忧', value: 9 }],
    },
    {
      name: 'UCLA',
      score: 49,
      updatedAt: '2026-05-24',
      volunteer: '李社工',
      answers: [],
    },
  ];
}
