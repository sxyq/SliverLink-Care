import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns3, RotateCcw } from 'lucide-react';

export interface TableColumnOption<T extends string = string> {
  key: T;
  label: string;
  required?: boolean;
  defaultVisible?: boolean;
}

function buildDefaultMap<T extends string>(options: TableColumnOption<T>[]) {
  return Object.fromEntries(
    options.map((option) => [option.key, option.defaultVisible !== false || option.required === true]),
  ) as Record<T, boolean>;
}

function loadColumnState<T extends string>(storageKey: string, options: TableColumnOption<T>[]) {
  const fallback = buildDefaultMap(options);

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return options.reduce(
      (acc, option) => {
        acc[option.key] =
          option.required === true
            ? true
            : typeof parsed[option.key] === 'boolean'
              ? parsed[option.key]
              : fallback[option.key];
        return acc;
      },
      {} as Record<T, boolean>,
    );
  } catch {
    return fallback;
  }
}

export function useTableColumnVisibility<T extends string>(storageKey: string, options: TableColumnOption<T>[]) {
  const [visibleMap, setVisibleMap] = useState<Record<T, boolean>>(() => loadColumnState(storageKey, options));

  useEffect(() => {
    setVisibleMap((prev) => {
      const defaults = buildDefaultMap(options);
      const next = options.reduce(
        (acc, option) => {
          acc[option.key] = option.required ? true : prev[option.key] ?? defaults[option.key];
          return acc;
        },
        {} as Record<T, boolean>,
      );
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [options]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visibleMap));
  }, [storageKey, visibleMap]);

  function isVisible(key: T) {
    return visibleMap[key] !== false;
  }

  function toggle(key: T) {
    const option = options.find((item) => item.key === key);
    if (!option || option.required) return;
    setVisibleMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function reset() {
    const next = buildDefaultMap(options);
    setVisibleMap(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  return { isVisible, visibleMap, toggle, reset };
}

export function TableColumnMenu<T extends string>({
  options,
  isVisible,
  onToggle,
  onReset,
}: {
  options: TableColumnOption<T>[];
  isVisible: (key: T) => boolean;
  onToggle: (key: T) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePopoverPosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(240, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      setPopoverStyle({
        top: rect.bottom + 8,
        left,
        width,
      });
    }

    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open]);

  const visibleCount = useMemo(() => options.filter((item) => isVisible(item.key)).length, [isVisible, options]);

  const popover = open && popoverStyle
    ? createPortal(
        <div
          className="column-menu-popover column-menu-popover--portal"
          style={{ top: popoverStyle.top, left: popoverStyle.left, width: popoverStyle.width }}
        >
          <div className="column-menu-header">
            <strong>字段显示</strong>
            <button className="secondary" type="button" onClick={onReset}>
              <RotateCcw size={14} />
              重置
            </button>
          </div>
          <div className="column-menu-list">
            {options.map((option) => (
              <label key={option.key} className="column-menu-item">
                <input
                  type="checkbox"
                  checked={isVisible(option.key)}
                  disabled={option.required}
                  onChange={() => onToggle(option.key)}
                />
                <span>{option.label}</span>
                {option.required && <em>固定</em>}
              </label>
            ))}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="column-menu" ref={rootRef}>
      <button className="secondary" type="button" ref={buttonRef} onClick={() => setOpen((prev) => !prev)}>
        <Columns3 size={14} />
        字段
        <span className="column-menu-count">{visibleCount}</span>
      </button>
      {popover}
    </div>
  );
}
