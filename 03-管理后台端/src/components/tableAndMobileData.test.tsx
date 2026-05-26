import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MobileDataList } from './MobileDataList';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from './TableColumnMenu';

const options: TableColumnOption<'name' | 'age' | 'status'>[] = [
  { key: 'name', label: '姓名', required: true },
  { key: 'age', label: '年龄', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: false },
];

function ColumnHarness({ storageKey = 'columns-test' }: { storageKey?: string }) {
  const column = useTableColumnVisibility(storageKey, options);
  return (
    <>
      <span data-testid="name-visible">{String(column.isVisible('name'))}</span>
      <span data-testid="age-visible">{String(column.isVisible('age'))}</span>
      <span data-testid="status-visible">{String(column.isVisible('status'))}</span>
      <TableColumnMenu
        options={options}
        isVisible={column.isVisible}
        onToggle={column.toggle}
        onReset={column.reset}
      />
    </>
  );
}

describe('table column menu and mobile data list', () => {
  it('toggles optional columns, keeps required columns and resets defaults', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('columns-test');
    render(<ColumnHarness />);

    expect(screen.getByTestId('name-visible')).toHaveTextContent('true');
    expect(screen.getByTestId('age-visible')).toHaveTextContent('true');
    expect(screen.getByTestId('status-visible')).toHaveTextContent('false');

    await user.click(screen.getByRole('button', { name: /字段/ }));
    fireEvent.click(await screen.findByLabelText('年龄'));
    fireEvent.click(await screen.findByLabelText('状态'));

    await waitFor(() => expect(screen.getByTestId('age-visible')).toHaveTextContent('false'));
    expect(screen.getByTestId('status-visible')).toHaveTextContent('true');

    fireEvent.click(await screen.findByRole('button', { name: /重置/ }));
    await waitFor(() => expect(screen.getByTestId('age-visible')).toHaveTextContent('true'));
    expect(screen.getByTestId('status-visible')).toHaveTextContent('false');
  });

  it('renders empty mobile list text', () => {
    render(
      <MobileDataList
        rows={[]}
        getKey={(_, index) => String(index)}
        getTitle={() => '标题'}
        emptyText="没有记录"
      />,
    );

    expect(screen.getByText('没有记录')).toBeInTheDocument();
  });

  it('renders mobile cards and expands detail/actions', async () => {
    const user = userEvent.setup();
    render(
      <MobileDataList
        rows={[{ id: '1', name: '王测试', status: '启用' }]}
        getKey={(row) => row.id}
        getTitle={(row) => row.name}
        getSummary={() => '摘要'}
        getStatus={(row) => row.status}
        getMeta={() => [
          { label: '电话', value: '138****0000' },
          { label: '空值', value: '' },
          { label: '地址', value: '滨江社区', fullWidth: true },
        ]}
        renderExpanded={() => <span>详情内容</span>}
        renderActions={() => <button>操作</button>}
      />,
    );

    expect(screen.getByText('王测试')).toBeInTheDocument();
    expect(screen.getByText('摘要')).toBeInTheDocument();
    expect(screen.getByText('138****0000')).toBeInTheDocument();
    expect(screen.queryByText('空值')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /展开查看更多/ }));
    expect(screen.getByText('详情内容')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /收起详情/ }));
    expect(screen.queryByText('详情内容')).not.toBeInTheDocument();
  });
});
