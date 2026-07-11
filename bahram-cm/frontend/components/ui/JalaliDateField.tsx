'use client';

import DatePicker from 'react-multi-date-picker';
import { CalendarDays } from 'lucide-react';
import type DateObject from 'react-date-object';
import {
  apiDateToDateObject,
  dateObjectToApiDate,
  persian,
  persian_fa,
} from '@/lib/jalali-datetime';

type JalaliDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  maxDate?: Date;
  minDate?: Date;
};

export function JalaliDateField({
  value,
  onChange,
  id,
  placeholder = 'انتخاب تاریخ',
  required,
  maxDate,
  minDate,
}: JalaliDateFieldProps) {
  const pickerValue = apiDateToDateObject(value);

  function handleChange(next: DateObject | DateObject[] | null) {
    if (!next || Array.isArray(next)) {
      onChange('');
      return;
    }
    onChange(dateObjectToApiDate(next));
  }

  return (
    <DatePicker
      id={id}
      value={pickerValue}
      onChange={handleChange}
      calendar={persian}
      locale={persian_fa}
      format="YYYY/MM/DD"
      maxDate={maxDate}
      minDate={minDate}
      calendarPosition="bottom-right"
      arrow={false}
      required={required}
      containerClassName="jalali-date-field"
      render={(displayValue, openCalendar) => (
        <button
          type="button"
          className="jalali-date-input-wrap"
          onClick={openCalendar}
          aria-labelledby={id ? `${id}-label` : undefined}
        >
          <span className={`jalali-date-input ${displayValue ? '' : 'jalali-date-input--empty'}`}>
            {displayValue || placeholder}
          </span>
          <CalendarDays className="jalali-date-input__icon" aria-hidden />
        </button>
      )}
    />
  );
}
