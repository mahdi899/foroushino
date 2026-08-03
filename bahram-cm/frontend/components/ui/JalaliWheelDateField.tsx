'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';
import DateObject from 'react-date-object';
import { persian, persian_fa } from '@/lib/jalali-datetime';
import { cn } from '@/lib/cn';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

type JalaliParts = { year: number; month: number; day: number };

function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function toNumericJalaliLabel({ year, month, day }: JalaliParts): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return toFaDigits(`${year}/${pad(month)}/${pad(day)}`);
}

function gregorianToJalali(date: Date): JalaliParts {
  const d = new DateObject({ date, calendar: persian, locale: persian_fa });
  return { year: d.year, month: d.month.number, day: d.day };
}

function jalaliToGregorian({ year, month, day }: JalaliParts): Date {
  return new DateObject({ year, month, day, calendar: persian, locale: persian_fa }).toDate();
}

/** Jalali leap years follow a 33-year cycle of remainders. */
function isJalaliLeapYear(year: number): boolean {
  const remainder = year % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(remainder);
}

function daysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

function parseApiDate(value: string | undefined): JalaliParts | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const gregorian = new Date(y, m - 1, d);
  if (Number.isNaN(gregorian.getTime())) return null;
  return gregorianToJalali(gregorian);
}

function toApiDate(parts: JalaliParts): string {
  const d = jalaliToGregorian(parts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function comparableJalali({ year, month, day }: JalaliParts): number {
  return year * 10000 + month * 100 + day;
}

function clampParts(parts: JalaliParts, min: JalaliParts, max: JalaliParts): JalaliParts {
  const year = Math.min(Math.max(parts.year, min.year), max.year);
  let month = parts.month;
  if (year === min.year) month = Math.max(month, min.month);
  if (year === max.year) month = Math.min(month, max.month);
  let day = Math.min(parts.day, daysInJalaliMonth(year, month));
  if (year === min.year && month === min.month) day = Math.max(day, min.day);
  if (year === max.year && month === max.month) day = Math.min(day, max.day);
  return { year, month, day };
}

type WheelItem = { value: number; label: string };

type WheelColumnProps = {
  items: WheelItem[];
  value: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
};

function WheelColumn({ items, value, onChange, label, className }: WheelColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userScrolling = useRef(false);

  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  useEffect(() => {
    const node = listRef.current;
    if (!node || userScrolling.current) return;
    const target = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(node.scrollTop - target) < 1) return;
    node.scrollTo({ top: target, behavior: 'smooth' });
  }, [selectedIndex]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const handleScroll = useCallback(() => {
    const node = listRef.current;
    if (!node) return;
    userScrolling.current = true;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      userScrolling.current = false;
      const index = Math.min(
        items.length - 1,
        Math.max(0, Math.round(node.scrollTop / ITEM_HEIGHT)),
      );
      const next = items[index];
      if (next && next.value !== value) onChange(next.value);
      else node.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
    }, 140);
  }, [items, onChange, value]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = items[Math.min(items.length - 1, Math.max(0, selectedIndex + delta))];
    if (next) onChange(next.value);
  }

  return (
    <div className={`wheel-date__column ${className ?? ''}`}>
      <div
        ref={listRef}
        className="wheel-date__list"
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
      >
        <div className="wheel-date__spacer" />
        {items.map((item, index) => (
          <button
            key={item.value}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={`wheel-date__item ${index === selectedIndex ? 'is-selected' : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
        <div className="wheel-date__spacer" />
      </div>
    </div>
  );
}

type JalaliWheelDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  invalid?: boolean;
};

export function JalaliWheelDateField({
  value,
  onChange,
  id,
  placeholder = 'انتخاب تاریخ',
  minDate,
  maxDate,
  invalid = false,
}: JalaliWheelDateFieldProps) {
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('panel-root') ?? document.body);
  }, []);

  const bounds = useMemo(() => {
    const max = gregorianToJalali(maxDate ?? new Date());
    const min = minDate
      ? gregorianToJalali(minDate)
      : { year: max.year - 110, month: 1, day: 1 };
    return { min, max };
  }, [minDate, maxDate]);

  const selectedParts = useMemo(() => parseApiDate(value), [value]);

  const defaultParts = useMemo<JalaliParts>(
    () => clampParts({ year: bounds.max.year - 15, month: 1, day: 1 }, bounds.min, bounds.max),
    [bounds],
  );

  const [draft, setDraft] = useState<JalaliParts>(selectedParts ?? defaultParts);

  useEffect(() => {
    if (open) setDraft(selectedParts ?? defaultParts);
  }, [open, selectedParts, defaultParts]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const yearItems = useMemo<WheelItem[]>(() => {
    const items: WheelItem[] = [];
    for (let year = bounds.max.year; year >= bounds.min.year; year -= 1) {
      items.push({ value: year, label: toFaDigits(year) });
    }
    return items;
  }, [bounds]);

  const monthItems = useMemo<WheelItem[]>(() => {
    const first = draft.year === bounds.min.year ? bounds.min.month : 1;
    const last = draft.year === bounds.max.year ? bounds.max.month : 12;
    return JALALI_MONTHS.slice(first - 1, last).map((name, index) => ({
      value: first + index,
      label: name,
    }));
  }, [draft.year, bounds]);

  const dayItems = useMemo<WheelItem[]>(() => {
    const first =
      draft.year === bounds.min.year && draft.month === bounds.min.month ? bounds.min.day : 1;
    const last =
      draft.year === bounds.max.year && draft.month === bounds.max.month
        ? bounds.max.day
        : daysInJalaliMonth(draft.year, draft.month);
    const items: WheelItem[] = [];
    for (let day = first; day <= last; day += 1) {
      items.push({ value: day, label: toFaDigits(day) });
    }
    return items;
  }, [draft.year, draft.month, bounds]);

  const updateDraft = useCallback(
    (patch: Partial<JalaliParts>) => {
      setDraft((current) => clampParts({ ...current, ...patch }, bounds.min, bounds.max));
    },
    [bounds],
  );

  function confirm() {
    onChange(toApiDate(draft));
    setOpen(false);
    triggerRef.current?.focus();
  }

  const displayValue = selectedParts ? toNumericJalaliLabel(selectedParts) : '';

  const draftLabel = toNumericJalaliLabel(draft);

  const isOutOfRange =
    selectedParts !== null &&
    (comparableJalali(selectedParts) > comparableJalali(bounds.max) ||
      comparableJalali(selectedParts) < comparableJalali(bounds.min));

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={cn('jalali-date-input-wrap', invalid && 'field-input--error')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
        onClick={() => setOpen(true)}
      >
        <span
          className={`jalali-date-input ${displayValue ? 'jalali-date-input--value' : 'jalali-date-input--empty'}`}
          dir="ltr"
        >
          {displayValue || placeholder}
        </span>
        <CalendarDays className="jalali-date-input__icon" aria-hidden />
      </button>

      {isOutOfRange ? (
        <p className="wheel-date__hint wheel-date__hint--error">تاریخ انتخاب‌شده مجاز نیست.</p>
      ) : null}

      {open && portalTarget
        ? createPortal(
            <div className="wheel-date-overlay" role="presentation" onClick={() => setOpen(false)}>
              <div
                className="wheel-date-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="انتخاب تاریخ تولد"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="wheel-date-sheet__header">
                  <span className="wheel-date-sheet__title">تاریخ تولد</span>
                  <span className="wheel-date-sheet__preview">{draftLabel}</span>
                </div>

                <div className="wheel-date__labels" dir="ltr" aria-hidden>
                  <span>سال</span>
                  <span>ماه</span>
                  <span>روز</span>
                </div>

                <div className="wheel-date__wheels" dir="ltr">
                  <div className="wheel-date__highlight" aria-hidden />
                  <WheelColumn
                    items={yearItems}
                    value={draft.year}
                    onChange={(year) => updateDraft({ year })}
                    label="سال"
                    className="wheel-date__column--year"
                  />
                  <WheelColumn
                    items={monthItems}
                    value={draft.month}
                    onChange={(month) => updateDraft({ month })}
                    label="ماه"
                    className="wheel-date__column--month"
                  />
                  <WheelColumn
                    items={dayItems}
                    value={draft.day}
                    onChange={(day) => updateDraft({ day })}
                    label="روز"
                    className="wheel-date__column--day"
                  />
                </div>

                <div className="wheel-date-sheet__actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                    انصراف
                  </button>
                  <button type="button" className="btn btn-primary" onClick={confirm}>
                    تأیید
                  </button>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
