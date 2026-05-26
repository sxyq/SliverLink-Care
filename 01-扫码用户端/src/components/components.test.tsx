import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from './ActionButton';
import { InfoCard } from './InfoCard';
import { SensitiveField } from './SensitiveField';

describe('scan client components', () => {
  it('renders button variant, icon, type and disabled state', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ActionButton icon={Home} variant="emergency" type="submit" onClick={onClick}>
        一键拨打
      </ActionButton>,
    );

    const button = screen.getByRole('button', { name: /一键拨打/ });
    expect(button).toHaveClass('sl-action-btn', 'emergency');
    expect(button).toHaveAttribute('type', 'submit');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders href action as a link', () => {
    render(<ActionButton href="tel:13800000000">拨打</ActionButton>);

    expect(screen.getByRole('link', { name: '拨打' })).toHaveAttribute('href', 'tel:13800000000');
  });

  it('renders info items and wide rows', () => {
    render(
      <InfoCard
        items={[
          { label: '姓名', value: '赵测试' },
          { label: '地址', value: '滨江社区', wide: true },
        ]}
      >
        <button>更多</button>
      </InfoCard>,
    );

    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('赵测试')).toBeInTheDocument();
    expect(screen.getByText('地址').parentElement).toHaveClass('wide');
    expect(screen.getByRole('button', { name: '更多' })).toBeInTheDocument();
  });

  it('masks sensitive phone numbers unless explicitly disabled', () => {
    const { rerender } = render(<SensitiveField value="13812345678" />);
    expect(screen.getByText('138****5678')).toBeInTheDocument();

    rerender(<SensitiveField value="13812345678" masked={false} />);
    expect(screen.getByText('13812345678')).toBeInTheDocument();
  });
});
