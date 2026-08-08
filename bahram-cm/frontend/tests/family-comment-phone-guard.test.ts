import { describe, expect, it } from 'vitest';
import {
  commentContainsLink,
  commentContainsNegativeLanguage,
  commentContainsPhoneNumber,
  commentNeedsManualReview,
} from '@/lib/family/commentPhoneGuard';

describe('commentContainsPhoneNumber', () => {
  it('detects common Iranian formats', () => {
    expect(commentContainsPhoneNumber('تماس: 09123456789')).toBe(true);
    expect(commentContainsPhoneNumber('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(commentContainsPhoneNumber('0912-345-6789')).toBe(true);
  });

  it('ignores plain text', () => {
    expect(commentContainsPhoneNumber('خیلی عالی بود، ممنون')).toBe(false);
    expect(commentContainsPhoneNumber('ساعت ۱۰ جلسه داریم')).toBe(false);
  });
});

describe('commentContainsLink', () => {
  it('detects urls and short links', () => {
    expect(commentContainsLink('ببین https://example.com/x')).toBe(true);
    expect(commentContainsLink('t.me/foo')).toBe(true);
    expect(commentContainsLink('پیگیری در @SupportBot')).toBe(true);
  });

  it('ignores plain text', () => {
    expect(commentContainsLink('سلام خانواده')).toBe(false);
  });
});

describe('commentContainsNegativeLanguage', () => {
  it('detects scam insults', () => {
    expect(commentContainsNegativeLanguage('این کلاهبرداره')).toBe(true);
    expect(commentContainsNegativeLanguage('کلاه برداری محض')).toBe(true);
  });
});

describe('commentNeedsManualReview', () => {
  it('flags phone, link, or insult', () => {
    expect(commentNeedsManualReview('شماره 09123456789')).toBe(true);
    expect(commentNeedsManualReview('لینک https://x.com')).toBe(true);
    expect(commentNeedsManualReview('کلاهبردار')).toBe(true);
    expect(commentNeedsManualReview('عالی بود ممنون')).toBe(false);
  });
});
