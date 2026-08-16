import { useEffect, useMemo } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createI18nRuntime } from './messages';
import { I18nProvider, useI18n, type I18nRuntime } from './react';

afterEach(() => {
  cleanup();
  document.title = '';
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  delete document.documentElement.dataset.locale;
});

describe('I18nProvider', () => {
  it('refreshes consumers that derive values from the t reference after a locale change', () => {
    const runtime = createI18nRuntime({
      getItem: () => null,
      setItem: () => undefined,
    });
    const observedTranslators: I18nRuntime['t'][] = [];

    function DerivedTitle() {
      const { t, setLocale } = useI18n();
      const heading = useMemo(() => t('auth.volunteerLogin'), [t]);

      useEffect(() => {
        observedTranslators.push(t);
        document.title = t('auth.volunteerLogin');
      }, [t]);

      return (
        <>
          <h1>{heading}</h1>
          <button type="button" onClick={() => setLocale('ug-Arab-CN')}>switch</button>
        </>
      );
    }

    render(
      <I18nProvider runtime={runtime}>
        <DerivedTitle />
      </I18nProvider>,
    );

    expect(screen.getByRole('heading').textContent).toBe('志愿者登录');
    expect(document.title).toBe('志愿者登录');

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(screen.getByRole('heading').textContent).toBe('پىدائىي كىرىشى');
    expect(document.title).toBe('پىدائىي كىرىشى');
    expect(observedTranslators).toHaveLength(2);
    expect(observedTranslators[1]).not.toBe(observedTranslators[0]);
  });

  it('syncs html lang, dir, and data-locale with the active locale in both directions', () => {
    const runtime = createI18nRuntime({
      getItem: () => null,
      setItem: () => undefined,
    });

    function LocaleControls() {
      const { locale, direction, setLocale } = useI18n();
      return (
        <>
          <output data-testid="locale">{locale}</output>
          <output data-testid="direction">{direction}</output>
          <button type="button" onClick={() => setLocale('ug-Arab-CN')}>to-ug</button>
          <button type="button" onClick={() => setLocale('kk-Arab-CN')}>to-kk</button>
          <button type="button" onClick={() => setLocale('zh-CN')}>to-zh</button>
        </>
      );
    }

    render(
      <I18nProvider runtime={runtime}>
        <LocaleControls />
      </I18nProvider>,
    );

    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.dataset.locale).toBe('zh-CN');

    fireEvent.click(screen.getByRole('button', { name: 'to-ug' }));
    expect(document.documentElement.lang).toBe('ug-Arab-CN');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.dataset.locale).toBe('ug-Arab-CN');
    expect(screen.getByTestId('locale').textContent).toBe('ug-Arab-CN');
    expect(screen.getByTestId('direction').textContent).toBe('rtl');

    fireEvent.click(screen.getByRole('button', { name: 'to-kk' }));
    expect(document.documentElement.lang).toBe('kk-Arab-CN');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.dataset.locale).toBe('kk-Arab-CN');

    fireEvent.click(screen.getByRole('button', { name: 'to-zh' }));
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.dataset.locale).toBe('zh-CN');
  });

  it('keeps provider state on the runtime-normalized locale when an unsupported value is passed', () => {
    const stored: Record<string, string> = {};
    const runtime = createI18nRuntime({
      getItem: (key) => stored[key] ?? null,
      setItem: (key, value) => { stored[key] = value; },
    });

    function LocaleControls() {
      const { locale, direction, t, setLocale } = useI18n();
      return (
        <>
          <output data-testid="locale">{locale}</output>
          <output data-testid="direction">{direction}</output>
          <output data-testid="heading">{t('auth.volunteerLogin')}</output>
          <button type="button" onClick={() => setLocale('xx-XX' as never)}>to-invalid</button>
        </>
      );
    }

    render(
      <I18nProvider runtime={runtime}>
        <LocaleControls />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'to-invalid' }));
    expect(screen.getByTestId('locale').textContent).toBe('zh-CN');
    expect(screen.getByTestId('direction').textContent).toBe('ltr');
    expect(screen.getByTestId('heading').textContent).toBe('志愿者登录');
    expect(runtime.getLocale()).toBe('zh-CN');
    expect(stored['silverlink.locale']).toBe('zh-CN');
  });
});
