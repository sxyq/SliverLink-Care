import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../app/AppShell';
import { PageHeader } from '../components/PageHeader';
import TopBar from '../family-entry/components/TopBar';
import { MedicationEditorPage } from './MedicationEditorPage';
import { SubjectDetailPage } from './SubjectDetailPage';
import { SubjectListPage } from './SubjectListPage';

describe('shared volunteer and family components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('alert', vi.fn());
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('renders app shell, page header and top bar interactions', () => {
    const onBack = vi.fn();
    render(
      <MemoryRouter>
        <AppShell>
          <PageHeader title="标题" subtitle="副标题" onBack={onBack} action={<button>action</button>} />
          <TopBar title="顶部标题" onBack={onBack} />
          <span>content body</span>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('content body')).toBeInTheDocument();
    expect(screen.getByText('重庆医科大学护理学院 银龄守护团队')).toBeInTheDocument();
    expect(screen.getByText('副标题')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    fireEvent.click(screen.getByRole('button', { name: 'action' }));
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(onBack).toHaveBeenCalled();
  });

  it('renders subject list loading, empty, carousel, actions and search changes', () => {
    const onKeywordChange = vi.fn();
    const onSelect = vi.fn();
    const onSecondaryAction = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <SubjectListPage
          title="老人档案"
          loading
          subjects={[]}
          keyword=""
          onKeywordChange={onKeywordChange}
          onSelect={onSelect}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('加载中...')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SubjectListPage
          title="老人档案"
          subjects={[]}
          keyword=""
          onKeywordChange={onKeywordChange}
          onSelect={onSelect}
          emptyText="暂无对象"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('暂无对象')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SubjectListPage
          title="老人档案"
          subjects={[subject('1'), subject('2')]}
          keyword="王"
          onKeywordChange={onKeywordChange}
          onSelect={onSelect}
          primaryHint="仅限授权"
          secondaryActionLabel="新增"
          onSecondaryAction={onSecondaryAction}
          headerAction={<button>header action</button>}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('请输入姓名或档案编号'), { target: { value: '张' } });
    expect(onKeywordChange).toHaveBeenCalledWith('张');
    fireEvent.click(screen.getByRole('button', { name: '下一位老人' }));
    fireEvent.click(screen.getByText('王桂兰2'));
    fireEvent.keyDown(screen.getByText('王桂兰1').closest('[data-elder-card="true"]') as HTMLElement, { key: 'Enter' });
    fireEvent.click(screen.getAllByRole('button', { name: '进入档案' })[0]);
    fireEvent.click(screen.getByRole('button', { name: /新增快速维护基础资料/ }));
    expect(onSelect).toHaveBeenCalled();
    expect(onSecondaryAction).toHaveBeenCalled();
  });

  it('renders subject detail and action cards', () => {
    const onBack = vi.fn();
    const onAction = vi.fn();
    render(
      <MemoryRouter>
        <SubjectDetailPage
          title="老人信息"
          subject={subject('1')}
          onBack={onBack}
          actions={[
            { key: 'basic', title: '基本信息', description: '档案资料', onClick: onAction },
            { key: 'warn', title: '警示动作', description: '风险操作', tone: 'warning', onClick: onAction },
          ]}
          headerAction={<button>导出</button>}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('住址信息')).toBeInTheDocument();
    expect(screen.getByText('王丽（女儿）')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    fireEvent.click(screen.getByRole('button', { name: /基本信息/ }));
    fireEvent.click(screen.getByRole('button', { name: /警示动作/ }));
    expect(onBack).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('covers medication editor batch mode and create-update-delete mode', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onBack = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <MedicationEditorPage
          title="批量模式"
          medications={[]}
          onBack={onBack}
          onSaveBatch={onSaveBatch}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('暂无用药记录')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /添加用药/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认保存' }));
    expect(alert).toHaveBeenCalledWith('请输入药品名称');

    fireEvent.change(screen.getByLabelText('药品名称'), { target: { value: '阿司匹林' } });
    fireEvent.change(screen.getByLabelText('剂量'), { target: { value: '1片' } });
    fireEvent.change(screen.getByLabelText('用法'), { target: { value: '口服' } });
    fireEvent.change(screen.getByLabelText('用药时间'), { target: { value: '早' } });
    fireEvent.click(screen.getByRole('button', { name: '确认保存' }));
    expect(screen.getByText('阿司匹林')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(onSaveBatch).toHaveBeenCalled());

    rerender(
      <MemoryRouter>
        <MedicationEditorPage
          title="单条模式"
          medications={[{ id: 'med-1', name: '阿司匹林', dosage: '1片', usage: '口服', timing: '早' }]}
          onBack={onBack}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('编辑'));
    fireEvent.change(screen.getByLabelText('药品名称'), { target: { value: '氯吡格雷' } });
    fireEvent.click(screen.getByRole('button', { name: '确认保存' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('med-1', expect.objectContaining({ name: '氯吡格雷' })));
    fireEvent.click(screen.getByRole('button', { name: '删除药品' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('med-1'));
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(onBack).toHaveBeenCalled();
  });
});

function subject(id: string) {
  return {
    id,
    archiveNo: `A00${id}`,
    name: `王桂兰${id}`,
    gender: '女',
    age: 82,
    residence: '滨江社区',
    bloodType: 'O',
    allergyHistory: '无',
    emergencyContactName: '王丽',
    emergencyContactPhone: '13800000000',
    emergencyContactRelation: '女儿',
    status: '在档',
    summary: '档案摘要',
  };
}
