import { describe, expect, it } from 'vitest';
import {
  getPersianCityInputError,
  isPersianCityValid,
  sanitizePersianCityInput,
} from '@/lib/persian/persianCity';
import { getIdentityStep1FieldErrors } from '@/lib/student/identityVerificationErrors';

describe('sanitizePersianCityInput', () => {
  it('keeps Persian letters, digits, and hyphen', () => {
    expect(sanitizePersianCityInput('تهران - تهران')).toBe('تهران - تهران');
    expect(sanitizePersianCityInput('منطقه ۲')).toBe('منطقه ۲');
  });

  it('removes Latin letters', () => {
    expect(sanitizePersianCityInput('tehran')).toBe('');
    expect(sanitizePersianCityInput('تهرانtest')).toBe('تهران');
  });
});

describe('isPersianCityValid', () => {
  it('accepts Persian city names with digits', () => {
    expect(isPersianCityValid('تهران')).toBe(true);
    expect(isPersianCityValid('منطقه ۲')).toBe(true);
    expect(isPersianCityValid('تهران - تهران')).toBe(true);
  });

  it('rejects Latin-only input', () => {
    expect(isPersianCityValid('tehran')).toBe(false);
  });

  it('rejects digits-only input', () => {
    expect(isPersianCityValid('123')).toBe(false);
  });
});

describe('getPersianCityInputError', () => {
  it('returns null for empty input', () => {
    expect(getPersianCityInputError('')).toBeNull();
  });

  it('returns error for Latin input', () => {
    expect(getPersianCityInputError('tehran')).toBeTruthy();
  });
});

describe('getIdentityStep1FieldErrors city', () => {
  const base = {
    first_name: 'احسان',
    last_name: 'رستمی',
    national_code: '1234567890',
    date_of_birth: '1374-01-01',
    gender: 'male',
    city: 'تهران - تهران',
  };

  it('flags non-Persian city names', () => {
    const errors = getIdentityStep1FieldErrors({
      ...base,
      city: 'tehran',
    });
    expect(errors.city).toBeTruthy();
  });
});
