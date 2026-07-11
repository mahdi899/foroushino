import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

/** Convert API / datetime-local string to a Jalali DateObject for the picker. */
export function apiDateTimeToDateObject(value: string | undefined): DateObject | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return new DateObject({ date: d, calendar: persian, locale: persian_fa });
}

/** Convert picker value to `YYYY-MM-DDTHH:mm` for the Laravel API. */
export function dateObjectToApiDateTime(value: DateObject): string {
  const d = value.toDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert API date string (`YYYY-MM-DD`) to a Jalali DateObject for the picker. */
export function apiDateToDateObject(value: string | undefined): DateObject | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  const gregorian = new Date(y, m - 1, d);
  if (Number.isNaN(gregorian.getTime())) return undefined;
  return new DateObject({ date: gregorian, calendar: persian, locale: persian_fa });
}

/** Convert picker value to `YYYY-MM-DD` for the Laravel API. */
export function dateObjectToApiDate(value: DateObject): string {
  const d = value.toDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export { persian, persian_fa };
