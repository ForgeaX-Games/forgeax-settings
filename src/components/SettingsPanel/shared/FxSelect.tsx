import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FxSelectOption {
  value: string;
  label: string;
  /** Visual emphasis for risky values (e.g. unrestricted permission). */
  tone?: 'danger';
}

/** Settings-only dropdown — plain CSS (.fx-select in SettingsPanel.css), no Radix/Tailwind. */
export function FxSelect({
  value,
  options,
  onChange,
  className,
  size = 'default',
  'aria-label': ariaLabel,
  title,
  invalid,
}: {
  value: string;
  options: readonly FxSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  size?: 'default' | 'mini';
  'aria-label'?: string;
  title?: string;
  invalid?: boolean;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={[
        'fx-select',
        size === 'mini' ? 'fx-select--mini' : '',
        selected?.tone === 'danger' ? 'fx-select--danger' : '',
        open ? 'is-open' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="fx-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="fx-select-value">{selected?.label ?? ''}</span>
        <ChevronDown className="fx-select-chevron" size={size === 'mini' ? 14 : 16} aria-hidden />
      </button>
      <div className="fx-select-menu" id={listId} role="listbox" aria-label={ariaLabel}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className={`fx-select-item${active ? ' is-active' : ''}${option.tone === 'danger' ? ' fx-select-item--danger' : ''}`}
              role="option"
              aria-selected={active}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              <Check className="fx-select-check" size={14} aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
