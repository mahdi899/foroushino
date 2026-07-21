import { describe, expect, it } from 'vitest';
import {
  formatFeedDaySeparator,
  formatPostBubbleMeta,
  formatPostDateTime,
  getPostDayKey,
} from '@/lib/family/datetime';

describe('family datetime (Asia/Tehran)', () => {
  it('formats post time in Iran timezone with Jalali date', () => {
    // 2026-07-20 12:30 UTC = 16:00 Asia/Tehran
    const text = formatPostDateTime('2026-07-20T12:30:00.000Z');
    expect(text).toMatch(/۱۶:۰۰/);
    expect(text).toContain('·');
    // always includes a Jalali calendar date segment (not time-only)
    expect(text.split('·')).toHaveLength(2);
  });

  it('treats offset timestamps as absolute instants', () => {
    // Same instant as above, expressed with Tehran offset
    const fromUtc = formatPostDateTime('2026-07-20T12:30:00.000Z');
    const fromTehran = formatPostDateTime('2026-07-20T16:00:00+03:30');
    expect(fromUtc).toBe(fromTehran);
  });

  it('includes date in bubble meta along with author', () => {
    const text = formatPostBubbleMeta('2026-07-20T12:30:00.000Z', 'بهرام');
    expect(text).toContain('بهرام');
    expect(text).toMatch(/۱۶:۰۰/);
    expect(text.split('·').length).toBeGreaterThanOrEqual(3);
  });

  it('groups posts by Tehran calendar day', () => {
    // 22:30 Tehran on Jul 20 = 19:00 UTC
    expect(getPostDayKey('2026-07-20T19:00:00.000Z')).toBe('2026-07-20');
    // 00:30 Tehran on Jul 21 = 21:00 UTC Jul 20
    expect(getPostDayKey('2026-07-20T21:00:00.000Z')).toBe('2026-07-21');
  });

  it('labels today separator in Tehran', () => {
    expect(formatFeedDaySeparator(new Date().toISOString())).toBe('امروز');
  });
});
