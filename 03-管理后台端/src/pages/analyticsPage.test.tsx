import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';

const fetchElders = vi.fn();
const fetchMedications = vi.fn();
const fetchAllScales = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchElders: (...args: unknown[]) => fetchElders(...args),
  fetchMedications: (...args: unknown[]) => fetchMedications(...args),
  fetchAllScales: (...args: unknown[]) => fetchAllScales(...args),
}));

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metrics, distributions and latest scale records', async () => {
    fetchElders.mockResolvedValue([
      {
        id: 'elder-1',
        archiveNo: 'A-001',
        name: '李奶奶',
        age: 68,
        phoneMasked: '138****0000',
        aboType: 'A',
        volunteer: '王志愿者',
        status: '启用',
      },
      {
        id: 'elder-2',
        archiveNo: 'A-002',
        name: '赵爷爷',
        age: 82,
        phoneMasked: '139****1111',
        aboType: 'O',
        volunteer: '张志愿者',
        status: '启用',
      },
    ]);
    fetchMedications.mockResolvedValue([
      { id: 'med-1', elderId: 'elder-1', archiveNo: 'A-001', elderName: '李奶奶', drugName: '阿司匹林', dosage: '1片', usage: '口服', timing: '早饭后', updatedAt: '', status: '使用中' },
      { id: 'med-2', elderId: 'elder-2', archiveNo: 'A-002', elderName: '赵爷爷', drugName: '维生素D', dosage: '2滴', usage: '口服', timing: '睡前', updatedAt: '', status: '使用中' },
    ]);
    fetchAllScales.mockResolvedValue([
      { id: 'scale-1', elderId: 'elder-1', elderName: '李奶奶', scaleName: 'PHQ-9', score: 12, date: '2026-05-26', volunteer: '王志愿者' },
      { id: 'scale-2', elderId: 'elder-2', elderName: '赵爷爷', scaleName: 'UCLA', score: 38, date: '2026-05-25', volunteer: '张志愿者' },
    ]);

    render(<AnalyticsPage />);

    expect(await screen.findByRole('heading', { name: '老人健康与量表统计分析' })).toBeInTheDocument();
    expect(screen.getByText('老人档案总数')).toBeInTheDocument();
    expect(screen.getByText('平均年龄')).toBeInTheDocument();
    expect(screen.getByText('量表平均分')).toBeInTheDocument();
    expect(screen.getByText('量表风险分层')).toBeInTheDocument();
    expect(screen.getByText('最近量表记录')).toBeInTheDocument();
    expect(screen.getByText('李奶奶')).toBeInTheDocument();
    expect(screen.getByText('赵爷爷')).toBeInTheDocument();
    expect(screen.getByText('PHQ-9 · 中等风险')).toBeInTheDocument();
    expect(screen.getByText('UCLA · 中等关注')).toBeInTheDocument();
  });

  it('shows load error when data request fails', async () => {
    fetchElders.mockRejectedValue(new Error('统计加载失败'));
    fetchMedications.mockResolvedValue([]);
    fetchAllScales.mockResolvedValue([]);

    render(<AnalyticsPage />);

    expect(await screen.findByText('统计加载失败')).toBeInTheDocument();
  });

  it('renders zero-state metrics and low-risk labels when datasets are sparse', async () => {
    fetchElders.mockResolvedValue([
      {
        id: 'elder-3',
        archiveNo: 'A-003',
        name: '孙奶奶',
        age: 93,
        phoneMasked: '137****2222',
        aboType: '',
        volunteer: '',
        status: '启用',
      },
    ]);
    fetchMedications.mockResolvedValue([]);
    fetchAllScales.mockResolvedValue([
      { id: 'scale-3', elderId: 'elder-3', elderName: '孙奶奶', scaleName: 'GAD-7', score: 2, date: '2026-05-20', volunteer: '' },
      { id: 'scale-4', elderId: 'elder-3', elderName: '孙奶奶', scaleName: 'PHQ-9', score: 18, date: '2026-05-19', volunteer: '' },
    ]);

    render(<AnalyticsPage />);

    expect(await screen.findByText('90岁以上')).toBeInTheDocument();
    expect(screen.getByText('未填写')).toBeInTheDocument();
    expect(screen.getByText('GAD-7 · 低风险')).toBeInTheDocument();
    expect(screen.getByText('PHQ-9 · 较高风险')).toBeInTheDocument();
    expect(screen.getByText('0 位老人有用药记录')).toBeInTheDocument();
  });

  it('covers non-Error load fallback and uncategorized aggregates', async () => {
    fetchElders.mockResolvedValue([
      {
        id: 'elder-4',
        archiveNo: 'A-004',
        name: '周奶奶',
        age: 74,
        phoneMasked: '136****3333',
        aboType: '',
        volunteer: '',
        status: '启用',
      },
    ]);
    fetchMedications.mockResolvedValue([
      { id: 'med-3', elderId: '', archiveNo: 'A-004', elderName: '周奶奶', drugName: '钙片', dosage: '1 片', usage: '口服', timing: '午饭后', updatedAt: '', status: '使用中' },
    ]);
    fetchAllScales.mockResolvedValue([
      { id: 'scale-5', elderId: 'elder-4', elderName: '周奶奶', scaleName: '', score: 28, date: '2026-05-21', volunteer: '' },
    ]);

    render(<AnalyticsPage />);

    expect((await screen.findAllByText('未分类')).length).toBeGreaterThan(1);
    expect(screen.getByText('1 位老人有用药记录')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('低关注'))).toBeInTheDocument();
    expect(screen.getByText('2026-05-21')).toBeInTheDocument();
  });

  it('falls back to default copy when analytics load rejects with a non-Error value', async () => {
    fetchElders.mockRejectedValue('analytics-down');
    fetchMedications.mockResolvedValue([]);
    fetchAllScales.mockResolvedValue([]);

    render(<AnalyticsPage />);

    expect(await screen.findByText('加载失败')).toBeInTheDocument();
  });
});
