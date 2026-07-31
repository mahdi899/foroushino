'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, MapPin, Search } from 'lucide-react';
import { IRAN_CITIES } from '@/lib/iran/cities';
import { cn } from '@/lib/cn';

type PanelCitySheetFieldProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  title?: string;
  placeholder?: string;
};

export function PanelCitySheetField({
  id,
  name,
  value: controlledValue,
  defaultValue = '',
  onChange,
  required,
  title = 'شهر',
  placeholder = 'انتخاب شهر',
}: PanelCitySheetFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const labelId = `${fieldId}-label`;
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('panel-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = window.setTimeout(() => searchRef.current?.focus(), 80);
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return IRAN_CITIES;
    return IRAN_CITIES.filter((city) => city.includes(q));
  }, [query]);

  const showCustom =
    Boolean(query.trim()) && !IRAN_CITIES.some((city) => city === query.trim());

  function commit(next: string) {
    const city = next.trim();
    if (!city) return;
    if (controlledValue === undefined) setInternal(city);
    onChange?.(city);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="panel-option-sheet-field">
      {name ? <input type="hidden" name={name} value={value} required={required && !value} /> : null}

      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        className="jalali-date-input-wrap"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen(true)}
      >
        <span className={cn('jalali-date-input', !value && 'jalali-date-input--empty')}>
          {value || placeholder}
        </span>
        <MapPin className="jalali-date-input__icon" aria-hidden />
      </button>

      {open && portalTarget
        ? createPortal(
            <div className="wheel-date-overlay" role="presentation" onClick={() => setOpen(false)}>
              <div
                className="wheel-date-sheet panel-option-sheet panel-option-sheet--city"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="wheel-date-sheet__header">
                  <span className="wheel-date-sheet__title">{title}</span>
                  {value ? <span className="wheel-date-sheet__preview">{value}</span> : null}
                </div>

                <label className="panel-option-sheet__search">
                  <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="جستجوی شهر…"
                    className="panel-option-sheet__search-input"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && showCustom) {
                        e.preventDefault();
                        commit(query);
                      }
                    }}
                  />
                </label>

                <div className="panel-option-sheet__list panel-option-sheet__list--scroll" role="listbox">
                  {filtered.map((city) => {
                    const active = city === value;
                    return (
                      <button
                        key={city}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn('panel-option-sheet__item', active && 'is-selected')}
                        onClick={() => commit(city)}
                      >
                        <span>{city}</span>
                        {active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                      </button>
                    );
                  })}

                  {showCustom ? (
                    <button
                      type="button"
                      className="btn btn-primary panel-option-sheet__custom-commit"
                      onClick={() => commit(query)}
                    >
                      ثبت «{query.trim()}»
                    </button>
                  ) : null}

                  {filtered.length === 0 && !showCustom ? (
                    <p className="panel-option-sheet__empty">شهری پیدا نشد.</p>
                  ) : null}
                </div>

                <div className="wheel-date-sheet__actions wheel-date-sheet__actions--single">
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                    بستن
                  </button>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
