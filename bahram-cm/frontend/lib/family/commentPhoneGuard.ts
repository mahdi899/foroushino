import { toLatinDigits } from '@/lib/persian';

const IR_MOBILE_INLINE =
  /(?<![\d.])(?:\+|00)?(?:98[\s\-.]?)?0?9[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}(?![\d.])/u;
const IR_LANDLINE_INLINE = /(?<![\d.])0\d{2,3}[\s\-.]?\d{7,8}(?![\d.])/u;
const INTL_MOBILE_INLINE = /(?:\+|00)?98[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}/u;

function isIranMobileDigits(digits: string): boolean {
  const normalized = digits.replace(/\D/g, '');
  if (/^09\d{9}$/.test(normalized)) return true;
  if (/^989\d{9}$/.test(normalized)) return true;
  if (/^00989\d{9}$/.test(normalized)) return true;
  return false;
}

/** Block member comments that include a phone number (admins are exempt). */
export function commentContainsPhoneNumber(body: string): boolean {
  const text = toLatinDigits(body);
  const compact = text.replace(/\D/g, '');

  if (compact) {
    const mobileMatches = compact.match(/0?9\d{9}/g);
    if (mobileMatches?.some(isIranMobileDigits)) return true;
  }

  if (INTL_MOBILE_INLINE.test(text)) return true;
  if (IR_MOBILE_INLINE.test(text)) return true;
  if (IR_LANDLINE_INLINE.test(text)) return true;

  return false;
}

export const COMMENT_PHONE_WARNING =
  'لطفاً شماره تلفن در نظر قرار ندهید. فقط ادمین می‌تواند شماره منتشر کند.';
