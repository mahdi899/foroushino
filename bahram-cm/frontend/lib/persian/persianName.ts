const PERSIAN_NAME_ALLOWED =
  /[\u0621-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u200c]/u;

const FORBIDDEN_NAME_CHARS = /[A-Za-z0-9]/;

export const PERSIAN_NAME_ONLY_ERROR = 'فقط حروف فارسی مجاز است.';

export function sanitizePersianNameInput(value: string): string {
  return [...value]
    .filter((char) => PERSIAN_NAME_ALLOWED.test(char))
    .join('')
    .replace(/\s{2,}/g, ' ');
}

export function containsForbiddenNameChars(value: string): boolean {
  return FORBIDDEN_NAME_CHARS.test(value);
}

export function isPersianNameValid(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (containsForbiddenNameChars(trimmed)) return false;
  return sanitizePersianNameInput(trimmed) === trimmed;
}

export function getPersianNameInputError(value: string): string | null {
  if (!value.trim()) return null;
  if (!isPersianNameValid(value)) return PERSIAN_NAME_ONLY_ERROR;
  return null;
}
