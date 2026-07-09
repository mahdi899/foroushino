'use client';

import DatePicker from 'react-multi-date-picker';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';
import 'react-multi-date-picker/styles/colors/teal.css';
import type DateObject from 'react-date-object';
import {
  apiDateTimeToDateObject,
  dateObjectToApiDateTime,
  persian,
  persian_fa,
} from '@/lib/jalali-datetime';

type JalaliDateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
};

export function JalaliDateTimeField({
  value,
  onChange,
  id,
  placeholder = 'انتخاب تاریخ و ساعت',
}: JalaliDateTimeFieldProps) {
  const pickerValue = apiDateTimeToDateObject(value);

  function handleChange(next: DateObject | DateObject[] | null) {
    if (!next || Array.isArray(next)) {
      onChange('');
      return;
    }
    onChange(dateObjectToApiDateTime(next));
  }

  return (
    <DatePicker
      id={id}
      value={pickerValue}
      onChange={handleChange}
      calendar={persian}
      locale={persian_fa}
      format="YYYY/MM/DD HH:mm"
      plugins={[<TimePicker key="time" hideSeconds position="bottom" />]}
      inputClass="field-input jalali-datetime-input"
      containerClassName="jalali-datetime-field"
      calendarPosition="bottom-right"
      arrow={false}
      placeholder={placeholder}
    />
  );
}
