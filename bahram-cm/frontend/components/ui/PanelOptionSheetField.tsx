'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PanelSheetOption = {
  value: string;
  label: string;
};

type PanelOptionSheetFieldProps = {
  id?: string;
  name?: string;
  title: string;
  placeholder?: string;
  options: PanelSheetOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
  /** Compact grid of options (good for few choices). Default: list. */
  layout?: 'list' | 'grid';
  invalid?: boolean;
};

export function PanelOptionSheetField({
  id,
  name,
  title,
  placeholder = 'انتخاب کنید',
  options,
  value: controlledValue,
  defaultValue = '',
  onChange,
  required,
  className,
  layout = 'list',
  invalid = false,
}: PanelOptionSheetFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const labelId = `${fieldId}-label`;
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('panel-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const selectedLabel = useMemo(
    () => options.find((opt) => opt.value === value)?.label ?? '',
    [options, value],
  );

  function select(next: string) {
    if (controlledValue === undefined) setInternal(next);
    onChange?.(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className={cn('panel-option-sheet-field', className)}>
      {name ? <input type="hidden" name={name} value={value} required={required && !value} /> : null}

      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        className={cn('jalali-date-input-wrap', invalid && 'field-input--error')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen(true)}
      >
        <span className={cn('jalali-date-input', !selectedLabel && 'jalali-date-input--empty')}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="jalali-date-input__icon" aria-hidden />
      </button>

      {open && portalTarget
        ? createPortal(
            <div className="wheel-date-overlay" role="presentation" onClick={() => setOpen(false)}>
              <div
                className="wheel-date-sheet panel-option-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="wheel-date-sheet__header panel-option-sheet__header">
                  <div className="panel-option-sheet__header-main">
                    <span className="wheel-date-sheet__title">{title}</span>
                    {selectedLabel ? (
                      <span className="wheel-date-sheet__preview">{selectedLabel}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="panel-option-sheet__close"
                    aria-label="بستن"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <div
                  className={cn(
                    'panel-option-sheet__list',
                    layout === 'grid' && 'panel-option-sheet__list--grid',
                  )}
                  role="listbox"
                  aria-label={title}
                >
                  {options.map((opt) => {
                    const active = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn('panel-option-sheet__item', active && 'is-selected')}
                        onClick={() => select(opt.value)}
                      >
                        <span>{opt.label}</span>
                        {active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
