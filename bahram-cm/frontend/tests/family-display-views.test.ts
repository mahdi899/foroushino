import { describe, expect, it } from 'vitest';
import { displayPostViews, formatCompactViewCount } from '@/lib/family/displayViews';

describe('displayPostViews', () => {
  it('returns 0 for zero or negative real views', () => {
    expect(displayPostViews(0)).toBe(0);
    expect(displayPostViews(-1)).toBe(0);
  });

  it('multiplies by 2.3 and rounds to nearest integer', () => {
    expect(displayPostViews(1)).toBe(2);
    expect(displayPostViews(2)).toBe(5);
    expect(displayPostViews(10)).toBe(23);
  });
});

describe('formatCompactViewCount', () => {
  it('keeps counts below 1000 as-is', () => {
    expect(formatCompactViewCount(0)).toBe('0');
    expect(formatCompactViewCount(999)).toBe('999');
  });

  it('formats thousands like Telegram', () => {
    expect(formatCompactViewCount(1000)).toBe('1K');
    expect(formatCompactViewCount(1753)).toBe('1.7K');
    expect(formatCompactViewCount(10000)).toBe('10K');
  });

  it('formats millions compactly', () => {
    expect(formatCompactViewCount(1_000_000)).toBe('1M');
    expect(formatCompactViewCount(1_750_000)).toBe('1.7M');
  });
});
