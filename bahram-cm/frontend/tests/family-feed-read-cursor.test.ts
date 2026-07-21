import { beforeEach, describe, expect, it } from 'vitest';
import {
  countUnreadStillBelow,
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

describe('countUnreadStillBelow', () => {
  it('does not count virtualized-above posts as still below when near tip', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        bottom: 400,
        left: 0,
        right: 360,
        width: 360,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const tip = document.createElement('article');
    tip.id = 'family-post-30';
    document.body.appendChild(tip);
    Object.defineProperty(tip, 'getBoundingClientRect', {
      value: () => ({
        top: 300,
        bottom: 380,
        left: 0,
        right: 360,
        width: 360,
        height: 80,
        x: 0,
        y: 300,
        toJSON: () => ({}),
      }),
    });

    const posts = [{ id: 10 }, { id: 20 }, { id: 30 }];
    expect(countUnreadStillBelow(posts, 10, root, 40)).toBe(0);

    tip.remove();
    root.remove();
  });
});
