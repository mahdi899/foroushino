import { describe, expect, it } from 'vitest';
import { isValidIranNationalCode } from '@/lib/iran/nationalCode';
import { getIdentityStep1FieldErrors } from '@/lib/student/identityVerificationErrors';

describe('isValidIranNationalCode', () => {
  it('accepts a valid national code', () => {
    expect(isValidIranNationalCode('0010350829')).toBe(true);
  });

  it('rejects all-identical digits', () => {
    expect(isValidIranNationalCode('1111111111')).toBe(false);
    expect(isValidIranNationalCode('0000000000')).toBe(false);
  });

  it('rejects random invalid checksum', () => {
    expect(isValidIranNationalCode('1234567890')).toBe(false);
    expect(isValidIranNationalCode('2342342343')).toBe(false);
  });

  it('accepts Persian digits after normalization', () => {
    expect(isValidIranNationalCode('۰۰۱۰۳۵۰۸۲۹')).toBe(true);
  });
});

describe('getIdentityStep1FieldErrors national_code', () => {
  const base = {
    first_name: 'احسان',
    last_name: 'رستمی',
    national_code: '0010350829',
    date_of_birth: '1374-01-01',
    gender: 'male',
    city: 'تهران - تهران',
  };

  it('flags invalid checksum', () => {
    const errors = getIdentityStep1FieldErrors({ ...base, national_code: '2342342343' });
    expect(errors.national_code).toBeTruthy();
  });
});
