import { beforeEach, describe, expect, it } from 'vitest';
import {
  getLastReadPostId,
  resolveUnreadCursor,
  setLastReadPostId,
  stashEnterUnreadAfter,
} from '@/lib/family/feedReadCursor';

describe('resolveUnreadCursor', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns 0 for a new viewer even when another viewer left a global cursor', () => {
    setLastReadPostId('old-user', 5);
    expect(resolveUnreadCursor('new-user', [{ id: 1 }, { id: 10 }])).toBe(0);
    expect(getLastReadPostId('new-user')).toBe(0);
  });

  it('uses the per-viewer local cursor when unread remains', () => {
    setLastReadPostId(42, 5);
    expect(resolveUnreadCursor(42, [{ id: 1 }, { id: 5 }, { id: 10 }])).toBe(5);
  });

  it('prefers nav enter handoff over local cursor', () => {
    setLastReadPostId(42, 2);
    stashEnterUnreadAfter(7);
    expect(resolveUnreadCursor(42, [{ id: 1 }, { id: 7 }, { id: 10 }])).toBe(7);
  });
});
