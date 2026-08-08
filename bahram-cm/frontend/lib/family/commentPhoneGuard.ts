import { toLatinDigits } from '@/lib/persian';

const IR_MOBILE_INLINE =
  /(?<![\d.])(?:\+|00)?(?:98[\s\-.]?)?0?9[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}(?![\d.])/u;
const IR_LANDLINE_INLINE = /(?<![\d.])0\d{2,3}[\s\-.]?\d{7,8}(?![\d.])/u;
const INTL_MOBILE_INLINE = /(?:\+|00)?98[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}/u;
const URL_INLINE = /https?:\/\/[^\s<>'")\]]+/i;
const WWW_INLINE = /\bwww\.[a-z0-9][a-z0-9\-.]+\.[a-z]{2,}/i;
const SHORT_LINK_INLINE =
  /(?:^|[\s(])(?:t\.me|telegram\.me|instagram\.com|wa\.me|bit\.ly|cutt\.ly)\/\S+/i;
const HANDLE_INLINE = /(?:^|[\s])@[a-zA-Z][a-zA-Z0-9_]{3,}\b/;
const NEGATIVE_INLINE =
  /کلاه\s*بردار|کلاهبرداری|کلاه\s*برداری|scammer|\bscam\b|\bfraud\b|شیاد|بی\s*شرف|بیشرف|حرومزاده|حرامزاده|مادرجنده|\bجنده\b|خائن|پول\s*شویی|پانزی|هرمی/i;

function isIranMobileDigits(digits: string): boolean {
  const normalized = digits.replace(/\D/g, '');
  if (/^09\d{9}$/.test(normalized)) return true;
  if (/^989\d{9}$/.test(normalized)) return true;
  if (/^00989\d{9}$/.test(normalized)) return true;
  return false;
}

/** Detect Iranian phone numbers in comment text. */
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

export function commentContainsLink(body: string): boolean {
  const text = toLatinDigits(body);
  return URL_INLINE.test(text) || WWW_INLINE.test(text) || SHORT_LINK_INLINE.test(text) || HANDLE_INLINE.test(text);
}

export function commentContainsNegativeLanguage(body: string): boolean {
  return NEGATIVE_INLINE.test(toLatinDigits(body));
}

/** True when the comment will stay pending for admin review (phone / link / insult). */
export function commentNeedsManualReview(body: string): boolean {
  return (
    commentContainsPhoneNumber(body) ||
    commentContainsLink(body) ||
    commentContainsNegativeLanguage(body)
  );
}

/** Soft notice — comment is accepted but not shown publicly until approved. */
export const COMMENT_REVIEW_NOTICE =
  'نظر شما ثبت شد. به‌خاطر شماره، لینک یا محتوای حساس، بعد از بررسی منتشر می‌شود.';

/** @deprecated Use COMMENT_REVIEW_NOTICE — phones are no longer blocked, only held for review. */
export const COMMENT_PHONE_WARNING = COMMENT_REVIEW_NOTICE;
