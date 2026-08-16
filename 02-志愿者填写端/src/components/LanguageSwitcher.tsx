import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  getDirection,
  getLocaleLabel,
  LOCALE_META,
  SUPPORTED_LOCALES,
  type Locale,
} from '@shared-i18n/messages';
import { useI18n } from '../i18n';

const localeOptions = SUPPORTED_LOCALES.filter((candidate) =>
  Object.prototype.hasOwnProperty.call(LOCALE_META, candidate),
);

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setFocusIndex(null);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [open]);

  useEffect(() => {
    if (open && focusIndex != null) {
      itemRefs.current[focusIndex]?.focus();
    }
  }, [focusIndex, open]);

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    setFocusIndex(null);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openMenu(nextFocusIndex: number | null = null) {
    setOpen(true);
    setFocusIndex(nextFocusIndex ?? Math.max(localeOptions.indexOf(locale), 0));
  }

  function selectLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    closeMenu(true);
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const currentIndex = Math.max(localeOptions.indexOf(locale), 0);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) closeMenu(true);
      else openMenu(currentIndex);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      openMenu(localeOptions.length - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      openMenu(localeOptions.length - 1);
    }
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectLocale(localeOptions[index]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === 'Tab') {
      closeMenu();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      setFocusIndex((index + 1) % localeOptions.length);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setFocusIndex((index - 1 + localeOptions.length) % localeOptions.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocusIndex(localeOptions.length - 1);
    }
  }

  return (
    <div ref={rootRef} className="sl-language-switcher" dir="ltr">
      <button
        ref={triggerRef}
        type="button"
        className="sl-language-switcher__trigger"
        dir={getDirection(locale)}
        lang={locale}
        aria-label={`${t('common.switchTo')}${getLocaleLabel(locale)}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? closeMenu(true) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{getLocaleLabel(locale)}</span>
        <span className="sl-language-switcher__chevron" aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div id={menuId} className="sl-language-menu" role="menu" aria-label={t('common.switchTo')} dir="ltr">
          {localeOptions.map((optionLocale, index) => (
            <button
              key={optionLocale}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              className="sl-language-menu__item"
              role="menuitemradio"
              aria-checked={locale === optionLocale}
              tabIndex={focusIndex === index ? 0 : -1}
              lang={optionLocale}
              dir={getDirection(optionLocale)}
              onClick={() => selectLocale(optionLocale)}
              onKeyDown={(event) => handleMenuKeyDown(event, index)}
            >
              <span>{getLocaleLabel(optionLocale)}</span>
              {locale === optionLocale ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
