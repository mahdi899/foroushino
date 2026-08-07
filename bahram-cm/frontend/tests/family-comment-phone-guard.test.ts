import { describe, expect, it } from 'vitest';
import { commentContainsPhoneNumber } from '@/lib/family/commentPhoneGuard';

describe('commentContainsPhoneNumber', () => {
  it('detects Iranian mobile numbers', () => {
    expect(commentContainsPhoneNumber('تماس: 09123456789')).toBe(true);
    expect(commentContainsPhoneNumber('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(commentContainsPhoneNumber('0912-345-6789')).toBe(true);
  });

  it('allows normal comments', () => {
    expect(commentContainsPhoneNumber('خیلی عالی بود، ممنون')).toBe(false);
    expect(commentContainsPhoneNumber('ساعت ۱۰ جلسه داریم')).toBe(false);
  });
});
