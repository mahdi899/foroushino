import { describe, expect, it } from 'vitest';
import { feedPagesContainPost, prependPostToFeedPages } from '@/lib/family/feedMerge';
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
    stats: { fire: 0, heart: 0, target: 0, clap: 0, comments: 0, action_responses: 0, views: 0 },
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
});
