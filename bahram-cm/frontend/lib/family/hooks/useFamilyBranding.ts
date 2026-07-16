'use client';

import useSWR from 'swr';
import { getBranding } from '@/lib/family/api';
import { familyBrandingSwr } from '@/lib/family/swr';
import type { FamilyBranding } from '@/lib/family/types';

const DEFAULT_BRANDING: FamilyBranding = {
  display_name: 'خانواده داداش بهرام',
  profile_name: 'بهرام',
  profile_avatar: null,
  community_avatar: null,
  has_active_stories: false,
  latest_story_id: null,
};

export function useFamilyBranding(fallback?: FamilyBranding) {
  const { data, mutate, isLoading } = useSWR(
    'family-branding',
    async () => (await getBranding()).data,
    {
      fallbackData: fallback,
      ...familyBrandingSwr,
    },
  );

  const resolved = data ?? fallback ?? DEFAULT_BRANDING;

  return {
    branding: resolved,
    /** True until the first branding response (no cached/fallback data yet). */
    isLoading: Boolean(isLoading && !data && !fallback),
    refreshBranding: mutate,
  };
}
