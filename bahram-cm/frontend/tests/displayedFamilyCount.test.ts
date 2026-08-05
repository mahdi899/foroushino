import { describe, expect, it } from 'vitest';
import {
  DISPLAYED_FAMILY_COUNT_CACHE_MS,
  getCachedDisplayedFamilyCount,
  getDisplayedFamilyCount,
  resetDisplayedFamilyCountCache,
} from '@/lib/family/displayedFamilyCount';

describe('getDisplayedFamilyCount', () => {
  it('maps anchor points with a simple additive bonus', () => {
    expect(getDisplayedFamilyCount(0)).toBe(0);
    expect(getDisplayedFamilyCount(1)).toBe(100);
    expect(getDisplayedFamilyCount(50)).toBe(500);
    expect(getDisplayedFamilyCount(100)).toBe(600);
    expect(getDisplayedFamilyCount(500)).toBe(800);
    expect(getDisplayedFamilyCount(999)).toBe(990);
    expect(getDisplayedFamilyCount(1000)).toBe(1000);
    expect(getDisplayedFamilyCount(1200)).toBe(1200);
  });

  it('floors fractional counts', () => {
    expect(getDisplayedFamilyCount(5.9)).toBe(100);
  });
});

describe('getCachedDisplayedFamilyCount', () => {
  it('reuses the same value for 10 minutes', () => {
    resetDisplayedFamilyCountCache();
    const now = 1_700_000_000_000;

    expect(getCachedDisplayedFamilyCount(50, now)).toBe(500);
    expect(getCachedDisplayedFamilyCount(50, now + DISPLAYED_FAMILY_COUNT_CACHE_MS - 1)).toBe(500);
    expect(getCachedDisplayedFamilyCount(50, now + DISPLAYED_FAMILY_COUNT_CACHE_MS)).toBe(500);
  });

  it('recomputes after cache expiry or when real count changes', () => {
    resetDisplayedFamilyCountCache();
    const now = 1_700_000_000_000;

    expect(getCachedDisplayedFamilyCount(50, now)).toBe(500);
    expect(getCachedDisplayedFamilyCount(100, now)).toBe(600);
    expect(getCachedDisplayedFamilyCount(50, now + DISPLAYED_FAMILY_COUNT_CACHE_MS + 1)).toBe(500);
  });
});
