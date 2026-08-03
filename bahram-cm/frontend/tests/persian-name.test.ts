import { describe, expect, it } from 'vitest';
import {
  getPersianNameInputError,
  isPersianNameValid,
  sanitizePersianNameInput,
} from '@/lib/persian/persianName';
import { getIdentityStep1FieldErrors } from '@/lib/student/identityVerificationErrors';

describe('sanitizePersianNameInput', () => {
  it('keeps Persian letters and spaces', () => {
    expect(sanitizePersianNameInput('احسان علی')).toBe('احسان علی');
  });

  it('removes Latin letters and digits', () => {
    expect(sanitizePersianNameInput('sdvfsdv')).toBe('');
    expect(sanitizePersianNameInput('احسان123test')).toBe('احسان');
  });
});

describe('isPersianNameValid', () => {
  it('accepts Persian names', () => {
    expect(isPersianNameValid('احسان')).toBe(true);
    expect(isPersianNameValid('محمدرضا')).toBe(true);
  });

  it('rejects Latin-only names', () => {
    expect(isPersianNameValid('sdvfsdv')).toBe(false);
  });

  it('rejects mixed Persian and Latin', () => {
    expect(isPersianNameValid('احسانtest')).toBe(false);
  });
});

describe('getPersianNameInputError', () => {
  it('returns null for empty input', () => {
    expect(getPersianNameInputError('')).toBeNull();
  });

  it('returns error for Latin input', () => {
    expect(getPersianNameInputError('john')).toBeTruthy();
  });
});

describe('getIdentityStep1FieldErrors', () => {
  const base = {
    first_name: 'احسان',
    last_name: 'رستمی',
    national_code: '1234567890',
    date_of_birth: '1374-01-01',
    gender: 'male',
    city: 'تهران - تهران',
  };

  it('flags non-Persian first and last names', () => {
    const errors = getIdentityStep1FieldErrors({
      ...base,
      first_name: 'John',
      last_name: 'sdvfsdv',
    });
    expect(errors.first_name).toBeTruthy();
    expect(errors.last_name).toBeTruthy();
  });
});
