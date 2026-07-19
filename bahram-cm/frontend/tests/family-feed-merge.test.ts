import { describe, expect, it } from 'vitest';
import {
  feedPagesContainPost,
  latestPostIdFromPages,
  prependPostToFeedPages,
  reconcileDiskCacheWithCurrent,
} from '@/lib/family/feedMerge';
import type { FeedCachePage } from '@/lib/family/feedCache';
import type { FamilyPost } from '@/lib/family/types';

const post = (id: number): FamilyPost =>
  ({
    id,
    type: 'text',
    published_at: '2026-07-16T10:00:00Z',
    author: { id: 1, name: 'B' },
    blocks: [],
    actions: [],
    stats: {
      fire: 0,
      heart: 0,
      target: 0,
      clap: 0,
      thumbs_up: 0,
      laugh: 0,
      sad: 0,
      party: 0,
      star: 0,
      rocket: 0,
      eyes: 0,
      pray: 0,
      muscle: 0,
      hundred: 0,
      wink: 0,
      comments: 0,
      action_responses: 0,
      views: 0,
    },
    user_reaction: null,
    is_pinned: false,
    is_important: false,
  }) as FamilyPost;

const basePages: FeedCachePage[] = [
  {
    data: [post(3), post(2)],
    meta: { next_cursor: 'cursor-1', guest: false, display_name: 'Family' },
  },
];

describe('feedMerge', () => {
  it('prepends a new post to the tip page', () => {
    const next = prependPostToFeedPages(basePages, post(4));
    expect(next?.[0]?.data.map((p) => p.id)).toEqual([4, 3, 2]);
  });

  it('does not duplicate an existing post', () => {
    const next = prependPostToFeedPages(basePages, post(3));
    expect(next).toBe(basePages);
  });

  it('detects post membership across pages', () => {
    expect(feedPagesContainPost(basePages, 2)).toBe(true);
    expect(feedPagesContainPost(basePages, 9)).toBe(false);
  });

  it('keeps a fresher network tip when disk has more pages', () => {
    const staleDisk: FeedCachePage[] = [
      {
        data: [post(3), post(2), post(1)],
        meta: { next_cursor: 'older', guest: false, display_name: 'Family' },
      },
      {
        data: [post(0)],
        meta: { next_cursor: null, guest: false, display_name: 'Family' },
      },
    ];
    const freshNetwork: FeedCachePage[] = [
      {
        data: [post(5), post(4)],
        meta: { next_cursor: 'cursor-1', guest: false, display_name: 'Family' },
      },
    ];

    const next = reconcileDiskCacheWithCurrent(freshNetwork, staleDisk);
    expect(latestPostIdFromPages(next)).toBe(5);
    expect(next).toHaveLength(2);
    expect(next[0]?.data.map((p) => p.id)).toEqual([5, 4]);
    expect(next[1]?.data.map((p) => p.id)).toEqual([0]);
  });

  it('uses disk when its tip is newer than the live cache', () => {
    const disk: FeedCachePage[] = [
      {
        data: [post(8), post(7)],
        meta: { next_cursor: null, guest: false, display_name: 'Family' },
      },
    ];
    const live: FeedCachePage[] = [
      {
        data: [post(6), post(5)],
        meta: { next_cursor: null, guest: false, display_name: 'Family' },
      },
    ];

    expect(reconcileDiskCacheWithCurrent(live, disk)).toBe(disk);
  });
});
