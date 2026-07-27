import { afterEach, describe, expect, it } from 'vitest';
import {
  clearFamilyMediaSeenForTests,
  hasFamilyMediaBeenSeen,
  markFamilyMediaSeen,
} from '@/lib/family/seenFamilyMedia';

describe('seenFamilyMedia', () => {
  afterEach(() => {
    clearFamilyMediaSeenForTests();
  });

  it('tracks URLs marked as seen in the session', () => {
    expect(hasFamilyMediaBeenSeen('https://example/a.webp')).toBe(false);
    markFamilyMediaSeen('https://example/a.webp');
    expect(hasFamilyMediaBeenSeen('https://example/a.webp')).toBe(true);
  });

  it('ignores empty URLs', () => {
    markFamilyMediaSeen(null);
    markFamilyMediaSeen(undefined);
    markFamilyMediaSeen('');
    expect(hasFamilyMediaBeenSeen(null)).toBe(false);
  });
});
