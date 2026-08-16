import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ElderCard from './ElderCard';
import MedCard from './MedCard';
import SmsVerifyInput from './SmsVerifyInput';
import TopBar from './TopBar';

describe('family entry components', () => {
  it('renders elder card with masked long archive number and forwards click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const elder = {
      id: 'elder-1',
      name: '王桂兰',
      gender: '女',
      age: 82,
      archiveNo: 'A1779472746389',
    };
    render(<ElderCard elder={elder} onClick={onClick} />);

    expect(screen.getByText('王桂兰')).toHaveAttribute('dir', 'auto');
    expect(screen.getByText('王桂兰').closest('.card')).toHaveTextContent(/女\s*·\s*82\s*岁\s*·\s*A1779\*{4}389/);
    await user.click(screen.getByText('王桂兰'));
    expect(onClick).toHaveBeenCalledWith(elder);
  });

  it('keeps short elder archive numbers visible', () => {
    render(<ElderCard elder={{ id: 'elder-1', name: '赵永福', gender: '男', age: 79, archiveNo: 'A001' }} />);
    expect(screen.getByText('赵永福').closest('.card')).toHaveTextContent(/男\s*·\s*79\s*岁\s*·\s*A001/);
  });

  it('renders medication card actions only when handlers exist', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const medication = {
      id: 'med-1',
      name: '阿司匹林',
      dosage: '100mg',
      usage: '口服',
      timing: '早饭后',
      updatedAt: '2026-05-25',
    };
    const { rerender } = render(<MedCard medication={medication} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('阿司匹林')).toBeInTheDocument();
    expect(screen.getByText('剂量：100mg · 用法：口服')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button')[0]);
    await user.click(screen.getAllByRole('button')[1]);
    expect(onEdit).toHaveBeenCalledWith(medication);
    expect(onDelete).toHaveBeenCalledWith(medication);

    rerender(<MedCard medication={medication} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('collects SMS code by typing digits and by paste', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(<SmsVerifyInput length={4} onComplete={onComplete} />);
    const inputs = Array.from(container.querySelectorAll('input'));

    await user.type(inputs[0], '1');
    await user.type(inputs[1], 'a');
    await user.type(inputs[1], '2');
    await user.type(inputs[2], '3');
    await user.type(inputs[3], '4');
    expect(onComplete).toHaveBeenCalledWith('1234');

    fireEvent.paste(inputs[0].parentElement!, {
      clipboardData: {
        getData: () => '9a8765',
      },
    });
    expect(onComplete).toHaveBeenCalledWith('9876');
  });

  it('moves SMS focus backwards on backspace when current field is empty', () => {
    const { container } = render(<SmsVerifyInput length={3} onComplete={vi.fn()} />);
    const inputs = Array.from(container.querySelectorAll('input'));
    inputs[1].focus();
    fireEvent.keyDown(inputs[1], { key: 'Backspace' });
    expect(document.activeElement).toBe(inputs[0]);
  });

  it('renders top bar with optional back button and custom back handler', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <TopBar title="家属端" onBack={onBack} />
      </MemoryRouter>,
    );

    expect(screen.getByText('家属端')).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <TopBar title="无返回" showBack={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
