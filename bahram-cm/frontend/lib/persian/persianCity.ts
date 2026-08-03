const PERSIAN_CITY_ALLOWED =
  /[\u0621-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u200c0-9\u06F0-\u06F9-]/u;

const PERSIAN_LETTER = /[\u0621-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;

const FORBIDDEN_CITY_CHARS = /[A-Za-z]/;

export const PERSIAN_CITY_ONLY_ERROR = 'فقط حروف فارسی و عدد مجاز است.';

export function sanitizePersianCityInput(value: string): string {
  return [...value]
    .filter((char) => PERSIAN_CITY_ALLOWED.test(char))
    .join('')
    .replace(/\s{2,}/g, ' ');
}

export function containsForbiddenCityChars(value: string): boolean {
  return FORBIDDEN_CITY_CHARS.test(value);
}

export function isPersianCityValid(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (containsForbiddenCityChars(trimmed)) return false;
  if (sanitizePersianCityInput(trimmed) !== trimmed) return false;
  if (!PERSIAN_LETTER.test(trimmed)) return false;
  return true;
}

export function getPersianCityInputError(value: string): string | null {
  if (!value.trim()) return null;
  if (!isPersianCityValid(value)) return PERSIAN_CITY_ONLY_ERROR;
  return null;
}
