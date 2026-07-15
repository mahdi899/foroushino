import { describe, expect, it } from 'vitest';
import { displayPostViews } from '@/lib/family/displayViews';

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
