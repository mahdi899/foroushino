'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import {
  completeIranCityInput,
  IRAN_CITY_SEARCH_MIN_LENGTH,
  searchIranCitySuggestions,
} from '@/lib/iran/iranCityBank';
import { cn } from '@/lib/cn';
import { sanitizePersianCityInput } from '@/lib/persian/persianCity';

type PanelCitySheetFieldProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onRejectedInput?: () => void;
  required?: boolean;
  title?: string;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
};

const LIST_GAP_PX = 6;
const LIST_MAX_HEIGHT_PX = 256;

export function PanelCitySheetField({
  id,
  name,
  value: controlledValue,
  defaultValue = '',
  onChange,
  onRejectedInput,
  required,
  placeholder = 'مثلاً تهران',
  invalid = false,
  describedBy,
}: PanelCitySheetFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const listboxId = `${fieldId}-suggestions`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef('');

  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [listStyle, setListStyle] = useState<React.CSSProperties | null>(null);

  draftRef.current = draft;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    setPortalTarget(document.getElementById('panel-root') ?? document.body);
  }, []);

  const suggestions = useMemo(() => searchIranCitySuggestions(draft, 8), [draft]);
  const canSuggest = draft.trim().length >= IRAN_CITY_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        const listNode = document.getElementById(listboxId);
        if (listNode?.contains(event.target as Node)) return;
        commitDraft(draftRef.current);
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, listboxId]);

  function commitValue(next: string) {
    const trimmed = next.trim();
    if (controlledValue === undefined) setInternal(trimmed);
    onChange?.(trimmed);
    setDraft(trimmed);
  }

  function commitDraft(next: string) {
    const trimmed = next.trim();
    const resolved =
      trimmed.length >= IRAN_CITY_SEARCH_MIN_LENGTH ? completeIranCityInput(trimmed) : trimmed;
    commitValue(resolved);
    setActiveIndex(-1);
  }

  function selectSuggestion(label: string) {
    commitDraft(label);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onInputChange(next: string) {
    const sanitized = sanitizePersianCityInput(next);
    if (next !== sanitized) onRejectedInput?.();
    setDraft(sanitized);
    setOpen(sanitized.trim().length >= IRAN_CITY_SEARCH_MIN_LENGTH);
    setActiveIndex(-1);
    onChange?.(sanitized);
  }

  function onInputFocus() {
    if (canSuggest) setOpen(true);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      if (!canSuggest || suggestions.length === 0) return;
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!canSuggest || suggestions.length === 0) return;
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex].label);
        return;
      }
      commitDraft(draft);
      setOpen(false);
      return;
    }

    if (event.key === 'Escape') {
      setDraft(value);
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showSuggestions = open && canSuggest && suggestions.length > 0;

  useLayoutEffect(() => {
    if (!showSuggestions || !inputRef.current) {
      setListStyle(null);
      return;
    }

    const updatePosition = () => {
      const input = inputRef.current;
      if (!input) return;

      const rect = input.getBoundingClientRect();
      const availableAbove = Math.max(0, rect.top - LIST_GAP_PX - 8);
      const maxHeight = Math.min(LIST_MAX_HEIGHT_PX, availableAbove);

      setListStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + LIST_GAP_PX,
        maxHeight: maxHeight > 0 ? maxHeight : LIST_MAX_HEIGHT_PX,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showSuggestions, suggestions.length, draft]);

  const suggestionsList =
    showSuggestions && portalTarget && listStyle ? (
      <ul
        id={listboxId}
        className="panel-city-combobox__list panel-city-combobox__list--floating"
        style={listStyle}
        role="listbox"
      >
        {suggestions.map((item, index) => (
          <li key={item.label} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn('panel-city-combobox__option', index === activeIndex && 'is-active')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(item.label)}
            >
              <span className="panel-city-combobox__option-city">{item.city}</span>
              <span className="panel-city-combobox__option-province">{item.province}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className="panel-city-combobox">
      {name ? <input type="hidden" name={name} value={value} required={required && !value} /> : null}

      {suggestionsList && portalTarget ? createPortal(suggestionsList, portalTarget) : null}

      <div className="panel-city-combobox__input-wrap">
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          className={cn('field-input panel-city-combobox__input', invalid && 'field-input--error')}
          value={draft}
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={onInputFocus}
          onBlur={() => {
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                const listNode = document.getElementById(listboxId);
                if (listNode?.contains(document.activeElement)) return;
                commitDraft(draftRef.current);
                setOpen(false);
              }
            }, 120);
          }}
          onKeyDown={onInputKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
        />
        <MapPin className="panel-city-combobox__icon" aria-hidden />
      </div>
    </div>
  );
}
