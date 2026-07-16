'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { getBranding } from '@/lib/family/api';
import { readFamilyShellSnapshot, writeFamilyShellSnapshot } from '@/lib/family/shellCache';
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

export function useFamilyBranding(initial?: FamilyBranding) {
  const { data, mutate, isLoading } = useSWR(
    'family-branding',
    async () => (await getBranding()).data,
    {
      fallbackData: initial,
      ...familyBrandingSwr,
    },
  );

  useEffect(() => {
    if (data || initial) return;
    const cached = readFamilyShellSnapshot()?.branding;
    if (cached) void mutate(cached, { revalidate: true });
  }, [data, initial, mutate]);

  useEffect(() => {
    if (!data) return;
    writeFamilyShellSnapshot({ branding: data });
  }, [data]);

  const resolved = data ?? initial ?? DEFAULT_BRANDING;

  return {
    branding: resolved,
    /** True only when there is no cached/SSR branding to show yet. */
    isLoading: Boolean(isLoading && !data && !initial),
    refreshBranding: mutate,
  };
}
