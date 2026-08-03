import { sanitizeLatinDigits } from '@/lib/persian';

export function normalizeIranNationalCode(raw: string): string | null {
  const digits = sanitizeLatinDigits(raw, 10);
  return digits.length === 10 ? digits : null;
}

/** Iranian national code checksum — mirrors backend App\Support\NationalCode::isValid */
export function isValidIranNationalCode(raw: string): boolean {
  const code = normalizeIranNationalCode(raw);
  if (!code) return false;

  if (/^(\d)\1{9}$/.test(code)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(code[i]) * (10 - i);
  }

  const remainder = sum % 11;
  const check = Number(code[9]);

  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

export function getIranNationalCodeInputError(raw: string): string | null {
  const digits = sanitizeLatinDigits(raw);
  if (!digits) return null;
  if (digits.length < 10) return null;
  if (digits.length > 10) return 'invalid';
  if (!isValidIranNationalCode(digits)) return 'invalid';
  return null;
}
