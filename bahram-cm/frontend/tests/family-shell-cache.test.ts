import { describe, expect, it, beforeEach } from 'vitest';
import {
  brandingFromMeAndFeed,
  readFamilyShellSnapshot,
  shellBrandingFromFeedMeta,
  writeFamilyShellSnapshot,
} from '@/lib/family/shellCache';

describe('shellCache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists and reads branding with member count', () => {
    writeFamilyShellSnapshot({
      branding: {
        display_name: 'خانواده تست',
        profile_name: 'بهرام',
        profile_avatar: null,
        community_avatar: null,
      },
      memberCount: 4,
    });

    const snapshot = readFamilyShellSnapshot();
    expect(snapshot?.branding.display_name).toBe('خانواده تست');
    expect(snapshot?.memberCount).toBe(4);
  });

  it('merges branding from me and feed meta', () => {
    const branding = brandingFromMeAndFeed(
      {
        is_member: true,
        display_name: 'خانواده تست',
        branding: {
          display_name: 'خانواده تست',
          profile_name: 'بهرام',
          profile_avatar: null,
          community_avatar: null,
        },
        has_active_stories: true,
      },
      null,
    );

    expect(branding?.has_active_stories).toBe(true);
  });

  it('merges branding from feed meta', () => {
    const branding = shellBrandingFromFeedMeta({
      next_cursor: null,
      guest: false,
      display_name: 'خانواده تست',
      branding: {
        display_name: 'خانواده تست',
        profile_name: 'بهرام',
        profile_avatar: null,
        community_avatar: null,
      },
      has_active_stories: true,
      member_count: 7,
    });

    expect(branding?.has_active_stories).toBe(true);
  });
});
