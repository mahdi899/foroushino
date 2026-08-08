import { describe, expect, it } from 'vitest';
import {
  applyCommentRealtimeEvent,
  applyCommentRealtimeEventToList,
  type FamilyCommentChangedPayload,
  type FamilyCommentsPage,
} from '@/lib/family/commentRealtimeMerge';
import { patchCommentsCountInFeedPages } from '@/lib/family/feedMerge';
import { mutateFamilyFeedPages, registerFamilyFeedPagesMutator } from '@/lib/family/feedPagesMutate';
import type { FeedCachePage } from '@/lib/family/feedCache';
import type { FamilyComment, FamilyPost } from '@/lib/family/types';

const comment = (partial: Partial<FamilyComment> & { id: number }): FamilyComment => ({
  body: 'متن',
  status: 'approved',
  created_at: '2026-08-07T10:00:00Z',
  is_pending_mine: false,
  user: { name: 'کاربر', avatar: null },
  replies: [],
  ...partial,
});

const page = (data: FamilyComment[]): FamilyCommentsPage => ({
  data,
  meta: { next_cursor: null, family_id: 24 },
});

describe('applyCommentRealtimeEvent', () => {
  it('prepends a new root comment idempotently', () => {
    const existing = comment({ id: 1, body: 'قدیمی' });
    const created = comment({ id: 2, body: 'جدید' });
    const event: FamilyCommentChangedPayload = {
      action: 'created',
      post_id: 10,
      family_id: 24,
      comment_id: 2,
      comment: created,
    };

    const once = applyCommentRealtimeEvent(page([existing]), event)!;
    expect(once.data.map((c) => c.id)).toEqual([2, 1]);

    const twice = applyCommentRealtimeEvent(once, event)!;
    expect(twice.data.map((c) => c.id)).toEqual([2, 1]);
    expect(twice.data[0]?.body).toBe('جدید');
  });

  it('attaches replies under the root without duplicating', () => {
    const root = comment({ id: 10, body: 'ریشه' });
    const reply = comment({ id: 11, body: 'پاسخ', parent_id: 10, is_bahram_reply: true });
    const event: FamilyCommentChangedPayload = {
      action: 'created',
      post_id: 10,
      family_id: 24,
      comment_id: 11,
      comment: reply,
    };

    const next = applyCommentRealtimeEvent(page([root]), event)!;
    expect(next.data[0]?.replies?.map((r) => r.id)).toEqual([11]);

    const again = applyCommentRealtimeEvent(next, event)!;
    expect(again.data[0]?.replies?.map((r) => r.id)).toEqual([11]);
  });

  it('updates an existing comment in place', () => {
    const root = comment({ id: 5, body: 'عادی', is_important: false });
    const event: FamilyCommentChangedPayload = {
      action: 'updated',
      post_id: 10,
      family_id: 24,
      comment_id: 5,
      comment: comment({ id: 5, body: 'عادی', is_important: true }),
    };

    const next = applyCommentRealtimeEvent(page([root]), event)!;
    expect(next.data[0]?.is_important).toBe(true);
  });

  it('removes roots and nested replies', () => {
    const root = comment({
      id: 1,
      replies: [comment({ id: 2, parent_id: 1, body: 'فرزند' })],
    });

    const removeReply = applyCommentRealtimeEvent(page([root]), {
      action: 'removed',
      post_id: 10,
      family_id: 24,
      comment_id: 2,
    })!;
    expect(removeReply.data[0]?.replies).toEqual([]);

    const removeRoot = applyCommentRealtimeEvent(removeReply, {
      action: 'removed',
      post_id: 10,
      family_id: 24,
      comment_id: 1,
    })!;
    expect(removeRoot.data).toEqual([]);
  });

  it('updates extra list via list helper', () => {
    const list = [comment({ id: 9 })];
    const next = applyCommentRealtimeEventToList(list, {
      action: 'created',
      post_id: 1,
      family_id: 24,
      comment_id: 8,
      comment: comment({ id: 8 }),
    });
    expect(next.map((c) => c.id)).toEqual([8, 9]);
  });
});

describe('patchCommentsCountInFeedPages', () => {
  it('soft-patches stats.comments without refetch shape', () => {
    const pages: FeedCachePage[] = [
      {
        data: [
          {
            id: 55,
            type: 'text',
            published_at: '2026-08-07T10:00:00Z',
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
              comments: 2,
              action_responses: 0,
              views: 0,
            },
            user_reaction: null,
            is_pinned: false,
            is_important: false,
            comments_enabled: true,
          } as FamilyPost,
        ],
        meta: {} as FeedCachePage['meta'],
      },
    ];

    const next = patchCommentsCountInFeedPages(pages, 55, 5)!;
    expect(next[0]?.data[0]?.stats.comments).toBe(5);
    expect(pages[0]?.data[0]?.stats.comments).toBe(2);
  });

  it('is a no-op when count is unchanged', () => {
    const pages: FeedCachePage[] = [
      {
        data: [
          {
            id: 1,
            stats: { comments: 4 },
          } as FamilyPost,
        ],
        meta: {} as FeedCachePage['meta'],
      },
    ];
    const next = patchCommentsCountInFeedPages(pages, 1, 4);
    expect(next).toBe(pages);
  });
});

describe('mutateFamilyFeedPages', () => {
  it('applies updater through registered bound mutators', async () => {
    let pages: FeedCachePage[] = [
      {
        data: [{ id: 9, stats: { comments: 1 } } as FamilyPost],
        meta: {} as FeedCachePage['meta'],
      },
    ];

    const unregister = registerFamilyFeedPagesMutator(async (updater) => {
      pages = (await updater(pages)) ?? pages;
    });

    const changed = await mutateFamilyFeedPages(
      (current) => patchCommentsCountInFeedPages(current, 9, 7) ?? current,
    );

    expect(changed).toBe(true);
    expect(pages[0]?.data[0]?.stats.comments).toBe(7);
    unregister();
  });
});
