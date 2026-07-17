import { describe, expect, it, beforeEach } from 'vitest';
import {
  feedBrowserCacheKey,
  invalidateOnFamilyFeedEvent,
  mergeBrandingFromFeed,
} from '@/lib/family/browserCache';
import { mergeFeedBrandingIntoCurrent } from '@/lib/family/shellCache';

describe('browserCache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds stable feed cache keys', () => {
    expect(feedBrowserCacheKey('member', 42)).toBe('member:42');
    expect(feedBrowserCacheKey('guest', 'anon')).toBe('guest:anon');
  });

  it('merges branding via coordinator helper', () => {
    const merged = mergeBrandingFromFeed(
      {
        display_name: 'A',
        profile_name: 'بهرام',
        profile_avatar: '/a.jpg?v=2',
        community_avatar: '/c.jpg?v=2',
        branding_version: 2,
      },
      {
        display_name: 'A',
        profile_name: 'بهرام',
        profile_avatar: '/a.jpg?v=1',
        community_avatar: '/c.jpg?v=1',
        branding_version: 1,
      },
    );

    expect(merged.community_avatar).toBe('/c.jpg?v=2');
    expect(mergeFeedBrandingIntoCurrent).toBeDefined();
  });

  it('routes pinned events without throwing', () => {
    expect(() =>
      invalidateOnFamilyFeedEvent({
        post_id: 1,
        latest_post_id: 1,
        event: 'pinned',
      }),
    ).not.toThrow();
  });
});
