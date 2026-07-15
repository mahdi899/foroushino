'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FAMILY_STORIES_SEEN_EVENT,
  getSeenStoryId,
  hasUnseenStories,
  markStoriesSeen,
} from '@/lib/family/storySeen';
import type { FamilyBranding } from '@/lib/family/types';

export function useFamilyStoryState(branding: FamilyBranding) {
  const [seenId, setSeenId] = useState(0);

  useEffect(() => {
    setSeenId(getSeenStoryId());

    const sync = () => setSeenId(getSeenStoryId());
    window.addEventListener(FAMILY_STORIES_SEEN_EVENT, sync);
    return () => window.removeEventListener(FAMILY_STORIES_SEEN_EVENT, sync);
  }, []);

  const hasStories = Boolean(branding.has_active_stories);
  const hasUnseen = hasUnseenStories(branding.has_active_stories, branding.latest_story_id);

  const markSeen = useCallback(
    (storyId?: number | null) => {
      const id = storyId ?? branding.latest_story_id;
      if (id) markStoriesSeen(id);
      setSeenId(getSeenStoryId());
    },
    [branding.latest_story_id],
  );

  return { hasStories, hasUnseen, markSeen, seenId };
}
