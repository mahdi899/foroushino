import { describe, expect, it } from 'vitest';
import { sanitizeLatinDigits, toLatinDigits } from '@/lib/persian';

describe('toLatinDigits', () => {
  it('converts Persian digits', () => {
    expect(toLatinDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
  });

  it('converts Arabic digits', () => {
    expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('leaves Latin digits unchanged', () => {
    expect(toLatinDigits('1234567890')).toBe('1234567890');
  });
});

describe('sanitizeLatinDigits', () => {
  it('normalizes and strips non-digits for national code input', () => {
    expect(sanitizeLatinDigits('۱۲۳۴-۵۶۷۸۹', 10)).toBe('123456789');
    expect(sanitizeLatinDigits('٠٠١٢٣٤٥٦٧٨', 10)).toBe('0012345678');
  });
});
