import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

function mockRect(top: number, bottom: number) {
  return {
    top,
    bottom,
    left: 0,
    right: 360,
    width: 360,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

function mountPost(id: number, top: number, bottom: number) {
  const el = document.createElement('article');
  el.id = `family-post-${id}`;
  document.body.appendChild(el);
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => mockRect(top, bottom),
  });
  return el;
}

describe('countUnreadStillBelow', () => {
  let root: HTMLDivElement;
  const mounted: HTMLElement[] = [];

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => mockRect(0, 400),
    });
  });

  afterEach(() => {
    for (const el of mounted.splice(0)) el.remove();
    root.remove();
  });

  it('does not count virtualized-above posts as still below when near tip', () => {
    mounted.push(mountPost(30, 300, 380));
    const posts = [{ id: 10 }, { id: 20 }, { id: 30 }];
    expect(countUnreadStillBelow(posts, 10, root, 40)).toBe(0);
  });

  it('decrements past virtualized-above posts while scrolling mid-feed', () => {
    // lastRead=10; 20 already scrolled past (unmounted); 30 visible; 40+50 still below (unmounted).
    mounted.push(mountPost(30, 120, 220));
    const posts = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }, { id: 50 }];
    expect(countUnreadStillBelow(posts, 10, root, 500)).toBe(2);
  });

  it('counts only posts still below a mounted unread row', () => {
    mounted.push(mountPost(20, 50, 150));
    mounted.push(mountPost(30, 160, 260));
    mounted.push(mountPost(40, 450, 550));
    const posts = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }, { id: 50 }];
    expect(countUnreadStillBelow(posts, 10, root, 500)).toBe(2);
  });

  it('treats an unread window with nothing mounted as all still below', () => {
    const posts = [{ id: 10 }, { id: 20 }, { id: 30 }];
    expect(countUnreadStillBelow(posts, 10, root, 500)).toBe(2);
  });
});
