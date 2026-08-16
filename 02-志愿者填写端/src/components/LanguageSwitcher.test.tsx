import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createI18nRuntime, LOCALE_STORAGE_KEY } from '@shared-i18n/messages';
import { I18nProvider } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

function renderSwitcher() {
  const values = new Map<string, string>();
  const runtime = createI18nRuntime({
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  });

  render(
    <I18nProvider runtime={runtime}>
      <LanguageSwitcher />
    </I18nProvider>,
  );

  return { user: userEvent.setup(), values };
}

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
  delete document.documentElement.dataset.locale;
});

describe('LanguageSwitcher', () => {
  it('renders the shared locale order and supports roving keyboard selection', async () => {
    const { user, values } = renderSwitcher();
    const trigger = screen.getByRole('button', { name: '切换到中文' });

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await user.keyboard('{Enter}');

    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent?.replace('✓', ''))).toEqual(['中文', 'ئۇيغۇرچە', 'قازاقشا']);
    expect(items[0]).toHaveAttribute('lang', 'zh-CN');
    expect(items[0]).toHaveAttribute('dir', 'ltr');
    expect(items[1]).toHaveAttribute('lang', 'ug-Arab-CN');
    expect(items[1]).toHaveAttribute('dir', 'rtl');
    expect(items[2]).toHaveAttribute('lang', 'kk-Arab-CN');
    expect(items[2]).toHaveAttribute('dir', 'rtl');
    expect(items[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(items[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(items[2]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{End}{Enter}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('lang', 'kk-Arab-CN');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(values.get(LOCALE_STORAGE_KEY)).toBe('kk-Arab-CN');
  });

  it('closes by Space, Escape, Tab and outside pointer while restoring focus after selection', async () => {
    const { user } = renderSwitcher();
    const trigger = screen.getByRole('button', { name: '切换到中文' });

    trigger.focus();
    await user.keyboard(' ');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);
    const items = screen.getAllByRole('menuitemradio');
    await user.click(items[1]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.keyboard('{End} ');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
