import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ElderListItem } from './ElderListItem';
import { FormSection } from './FormSection';
import { ScaleQuestion } from './ScaleQuestion';
import { SelectChips } from './SelectChips';
import { SubmitBar } from './SubmitBar';
import { TextInput } from './TextInput';

describe('volunteer components', () => {
  it('renders form section title, icon and body', () => {
    render(
      <FormSection title="基本信息" icon={<span aria-label="icon">I</span>}>
        <input aria-label="姓名" />
      </FormSection>,
    );

    expect(screen.getByRole('heading', { name: '基本信息' })).toBeInTheDocument();
    expect(screen.getByLabelText('icon')).toBeInTheDocument();
    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
  });

  it('selects elder row and keeps edit click from selecting the row', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onEdit = vi.fn();

    render(
      <ElderListItem
        selected
        onClick={onClick}
        onEdit={onEdit}
        elder={{
          id: 'elder-1',
          name: '王桂兰',
          age: 82,
          archiveNo: 'A001',
          status: '需复核',
          residence: '滨江社区',
        }}
      />,
    );

    expect(screen.getByText('王桂兰').closest('.sl-elder-item')).toHaveClass('sl-elder-item-active');
    expect(screen.getByText('需复核')).toHaveClass('sl-status-review');
    await user.click(screen.getByText('王桂兰'));
    await user.click(screen.getByRole('button', { name: /编辑/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('updates scale answers and respects read-only mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ScaleQuestion
        index={1}
        item={{ question: '睡眠情况', value: 0 }}
        options={['较差', '良好']}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: '良好' }));
    expect(onChange).toHaveBeenCalledWith(1);

    rerender(
      <ScaleQuestion
        index={1}
        item={{ question: '睡眠情况', value: 1 }}
        options={['较差', '良好']}
        onChange={onChange}
        readOnly
      />,
    );
    expect(screen.getByRole('button', { name: '良好' })).toBeDisabled();
  });

  it('renders selectable chips and forwards selected value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectChips options={['男', '女']} value="男" onChange={onChange} />);

    expect(screen.getByRole('button', { name: '男' })).toHaveClass('sl-chip-selected');
    await user.click(screen.getByRole('button', { name: '女' }));
    expect(onChange).toHaveBeenCalledWith('女');
  });

  it('renders submit actions with loading and optional draft button', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onDraft = vi.fn();
    const { rerender } = render(<SubmitBar onSubmit={onSubmit} onDraft={onDraft} />);

    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    await user.click(screen.getByRole('button', { name: /提交保存/ }));
    expect(onDraft).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(<SubmitBar onSubmit={onSubmit} loading />);
    expect(screen.queryByRole('button', { name: '保存草稿' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存中/ })).toBeDisabled();
  });

  it('renders text input state, suffix and validation error', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TextInput
        label="年龄"
        value="82"
        suffix="岁"
        error="年龄不能为空"
        placeholder="请输入"
        onChange={onChange}
      />,
    );

    expect(screen.getByText('岁')).toBeInTheDocument();
    expect(screen.getByText('年龄不能为空')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入')).toHaveClass('sl-input-error');
    await user.type(screen.getByPlaceholderText('请输入'), '3');
    expect(onChange).toHaveBeenCalled();
  });
});
