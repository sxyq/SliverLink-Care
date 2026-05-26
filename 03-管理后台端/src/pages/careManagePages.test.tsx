import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ScaleManagePage } from './ScaleManagePage';
import { MedicationManagePage } from './MedicationManagePage';

const fetchAllScales = vi.fn();
const fetchElderScales = vi.fn();
const saveElderScales = vi.fn();
const fetchMedications = vi.fn();
const fetchElderMedications = vi.fn();
const saveElderMedications = vi.fn();
const exportToCsv = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchAllScales: (...args: unknown[]) => fetchAllScales(...args),
  fetchElderScales: (...args: unknown[]) => fetchElderScales(...args),
  saveElderScales: (...args: unknown[]) => saveElderScales(...args),
  fetchMedications: (...args: unknown[]) => fetchMedications(...args),
  fetchElderMedications: (...args: unknown[]) => fetchElderMedications(...args),
  saveElderMedications: (...args: unknown[]) => saveElderMedications(...args),
}));

vi.mock('../utils/exportCsv', () => ({
  exportToCsv: (...args: unknown[]) => exportToCsv(...args),
}));

vi.mock('../components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) => <span>{status}</span>,
}));

function renderWithRoute(ui: ReactNode, entry = '/') {
  return render(<MemoryRouter initialEntries={[entry]}>{ui}</MemoryRouter>);
}

describe('ScaleManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads list, filters rows and exports current scale view', async () => {
    fetchAllScales.mockResolvedValue([
      {
        id: 'scale-1',
        elderId: 'elder-1',
        archiveNo: 'A-001',
        elderName: '李奶奶',
        scaleName: 'PHQ-9',
        score: 10,
        date: '2026-05-26',
        volunteer: '王志愿者',
      },
      {
        id: 'scale-2',
        elderId: 'elder-2',
        archiveNo: 'A-002',
        elderName: '张爷爷',
        scaleName: 'UCLA',
        score: 38,
        date: '2026-05-20',
        volunteer: '',
      },
    ]);

    renderWithRoute(<ScaleManagePage />);

    expect(await screen.findByRole('heading', { name: '量表管理' })).toBeInTheDocument();
    expect(await screen.findByText('李奶奶')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('搜索档案编号、老人姓名或量表类型'), {
      target: { value: 'A-001' },
    });
    fireEvent.change(screen.getByDisplayValue('全部量表'), { target: { value: 'PHQ-9' } });

    expect(screen.getByText('李奶奶')).toBeInTheDocument();
    expect(screen.queryByText('张爷爷')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledTimes(1);
  });

  it('opens editor with query params and saves edited scales', async () => {
    fetchElderScales
      .mockResolvedValueOnce([
        {
          id: 'scale-1',
          elderId: 'elder-1',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          scaleName: 'PHQ-9',
          score: 6,
          date: '2026-05-01',
          volunteer: '王志愿者',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'scale-3',
          elderId: 'elder-1',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          scaleName: 'GAD-7',
          score: 12,
          date: '2026-05-26',
          volunteer: '',
        },
      ]);
    saveElderScales.mockResolvedValue(undefined);

    renderWithRoute(<ScaleManagePage />, '/?elderId=elder-1&archiveNo=A-001&elderName=李奶奶');

    expect(await screen.findByRole('heading', { name: '老人量表编辑' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑量表' }));

    expect(await screen.findByRole('heading', { name: '编辑量表信息' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新增量表' }));

    fireEvent.change(screen.getAllByDisplayValue('PHQ-9')[0], { target: { value: 'GAD-7' } });
    fireEvent.change(screen.getAllByDisplayValue('0')[0], { target: { value: '12' } });
    fireEvent.change(screen.getAllByDisplayValue(new Date().toISOString().slice(0, 10))[0], {
      target: { value: '2026-05-26' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[1]);

    fireEvent.click(screen.getByRole('button', { name: '保存量表' }));

    await waitFor(() => {
      expect(saveElderScales).toHaveBeenCalledWith('elder-1', [
        { name: 'GAD-7', score: 12, date: '2026-05-26' },
      ]);
    });
  });
});

describe('MedicationManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads list, filters by keyword and exports medications', async () => {
    fetchMedications.mockResolvedValue([
      {
        id: 'med-1',
        elderId: 'elder-1',
        archiveNo: 'A-001',
        elderName: '李奶奶',
        drugName: '阿司匹林',
        dosage: '1 片',
        usage: '口服',
        timing: '早饭后',
        updatedAt: '2026-05-26 09:00:00',
        status: '使用中',
      },
      {
        id: 'med-2',
        elderId: 'elder-2',
        archiveNo: 'A-002',
        elderName: '张爷爷',
        drugName: '维生素D',
        dosage: '2 滴',
        usage: '口服',
        timing: '睡前',
        updatedAt: '2026-05-26 09:10:00',
        status: '使用中',
      },
    ]);

    renderWithRoute(<MedicationManagePage />);

    expect(await screen.findByRole('heading', { name: '用药信息管理' })).toBeInTheDocument();
    expect(await screen.findByText('阿司匹林')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('搜索档案编号、老人姓名或药品'), {
      target: { value: '李奶奶' },
    });

    expect(screen.getByText('阿司匹林')).toBeInTheDocument();
    expect(screen.queryByText('维生素D')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(exportToCsv).toHaveBeenCalledTimes(1);
  });

  it('opens editor for elder route, adds row and saves medications', async () => {
    fetchElderMedications
      .mockResolvedValueOnce([
        {
          id: 'med-1',
          elderId: 'elder-1',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          drugName: '阿司匹林',
          dosage: '1 片',
          usage: '口服',
          timing: '早饭后',
          updatedAt: '2026-05-26 09:00:00',
          status: '使用中',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'med-2',
          elderId: 'elder-1',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          drugName: '维生素B',
          dosage: '1 粒',
          usage: '口服',
          timing: '晚饭后',
          updatedAt: '2026-05-26 10:00:00',
          status: '使用中',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'med-2',
          elderId: 'elder-1',
          archiveNo: 'A-001',
          elderName: '李奶奶',
          drugName: '维生素B',
          dosage: '1 粒',
          usage: '口服',
          timing: '晚饭后',
          updatedAt: '2026-05-26 10:00:00',
          status: '使用中',
        },
      ]);
    saveElderMedications.mockResolvedValue(undefined);

    renderWithRoute(<MedicationManagePage />, '/?elderId=elder-1&archiveNo=A-001&elderName=李奶奶');

    expect(await screen.findByRole('heading', { name: '老人用药编辑' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑用药' }));

    expect(await screen.findByRole('heading', { name: '编辑用药信息' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新增用药' }));

    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '维生素B' } });
    fireEvent.change(screen.getAllByRole('textbox')[2], { target: { value: '1 粒' } });
    fireEvent.change(screen.getAllByRole('textbox')[3], { target: { value: '口服' } });
    fireEvent.change(screen.getAllByRole('textbox')[4], { target: { value: '晚饭后' } });

    fireEvent.click(screen.getByRole('button', { name: '保存用药' }));

    await waitFor(() => {
      expect(saveElderMedications).toHaveBeenCalledWith('elder-1', [
        { name: '维生素B', dosage: '1 粒', usage: '口服', timing: '晚饭后' },
      ]);
    });
  });
});
