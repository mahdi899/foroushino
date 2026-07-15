import { describe, expect, it } from 'vitest';
import { normalizeLoginOtpResponse, resolveLoginOtpStep } from '@/lib/auth/loginOtpResponse';

describe('normalizeLoginOtpResponse', () => {
  it('reads otp bypass from Next.js route shape', () => {
    expect(normalizeLoginOtpResponse({ ok: true, otp_required: false })).toEqual({
      otp_required: false,
      mobile: undefined,
      mobile_masked: undefined,
      expires_in: undefined,
    });
  });

  it('reads otp bypass from Laravel nested data', () => {
    expect(
      normalizeLoginOtpResponse({
        token: 'abc',
        data: { otp_required: false, name: 'Admin' },
      }),
    ).toEqual({
      otp_required: false,
      mobile: undefined,
      mobile_masked: undefined,
      expires_in: undefined,
    });
  });

  it('prefers top-level fields when both shapes are present', () => {
    expect(
      normalizeLoginOtpResponse({
        otp_required: true,
        mobile: '09120000000',
        data: { otp_required: false, mobile: '09999999999' },
      }),
    ).toEqual({
      otp_required: true,
      mobile: '09120000000',
      mobile_masked: undefined,
      expires_in: undefined,
    });
  });

  it('reads OTP step fields from nested data', () => {
    expect(
      normalizeLoginOtpResponse({
        data: {
          otp_required: true,
          mobile: '09121234567',
          mobile_masked: '0912***4567',
          expires_in: 120,
        },
      }),
    ).toEqual({
      otp_required: true,
      mobile: '09121234567',
      mobile_masked: '0912***4567',
      expires_in: 120,
    });
  });
});

describe('resolveLoginOtpStep', () => {
  it('returns authenticated when otp is skipped', () => {
    expect(resolveLoginOtpStep({ ok: true, otp_required: false })).toEqual({ kind: 'authenticated' });
  });

  it('returns otp step with normalized mobile fields', () => {
    expect(
      resolveLoginOtpStep({
        otp_required: true,
        mobile: '09121234567',
        mobile_masked: '0912***4567',
        expires_in: 120,
      }),
    ).toEqual({
      kind: 'otp',
      mobile: '09121234567',
      mobile_masked: '0912***4567',
      expires_in: 120,
    });
  });

  it('rejects malformed otp responses without mobile', () => {
    expect(resolveLoginOtpStep({ ok: true, otp_required: true })).toEqual({
      kind: 'invalid',
      message: 'ورود ناموفق بود.',
    });
  });

  it('rejects blank mobile values', () => {
    expect(resolveLoginOtpStep({ otp_required: true, mobile: '   ' })).toEqual({
      kind: 'invalid',
      message: 'ورود ناموفق بود.',
    });
  });

  it('rejects otp_required without mobile even when flag is omitted', () => {
    expect(resolveLoginOtpStep({ ok: true, data: { expires_in: 120 } })).toEqual({
      kind: 'invalid',
      message: 'ورود ناموفق بود.',
    });
  });

  it('accepts otp step when mobile is present without otp_required flag', () => {
    expect(resolveLoginOtpStep({ data: { mobile: '09121234567', mobile_masked: '0912***4567' } })).toEqual({
      kind: 'otp',
      mobile: '09121234567',
      mobile_masked: '0912***4567',
      expires_in: undefined,
    });
  });
});
