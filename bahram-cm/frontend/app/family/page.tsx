import { FamilyHome } from '@/components/family/FamilyHome';
import { brandingFromMeAndFeed } from '@/lib/family/shellCache';
import { familyFetch } from '@/lib/family/session';
import { getCurrentStudent } from '@/lib/student/session';
import type { FamilyFeedResponse, FamilyMeResponse } from '@/lib/family/types';

const FEED_PAGE_SIZE = 15;

async function loadInitialFeed(): Promise<FamilyFeedResponse | null> {
  try {
    const params = new URLSearchParams({ limit: String(FEED_PAGE_SIZE) });
    return await familyFetch<FamilyFeedResponse>(`/feed?${params.toString()}`);
  } catch {
    return null;
  }
}

async function loadMe(): Promise<{ data: FamilyMeResponse }> {
  return familyFetch<{ data: FamilyMeResponse }>('/me').catch(() => ({
    data: { is_member: false, display_name: 'خانواده داداش بهرام' } as FamilyMeResponse,
  }));
}

function resolveInitialMemberCount(
  me: FamilyMeResponse,
  feed: FamilyFeedResponse | null,
): number | undefined {
  if (typeof me.member_count === 'number') return me.member_count;
  if (typeof feed?.meta.member_count === 'number') return feed.meta.member_count;
  return undefined;
}

export default async function FamilyPage() {
  const [user, initialFeed, me] = await Promise.all([
    getCurrentStudent(),
    loadInitialFeed(),
    loadMe(),
  ]);

  const initialBranding = brandingFromMeAndFeed(me.data, initialFeed);
  const initialMemberCount = resolveInitialMemberCount(me.data, initialFeed);

  if (!user) {
    return (
      <FamilyHome
        mode="guest"
        needsOnboarding={false}
        initialFeed={initialFeed}
        initialBranding={initialBranding}
        initialMemberCount={initialMemberCount}
        viewerKey="guest"
      />
    );
  }

  const viewerKey = user.id;

  if (!me.data.is_member) {
    return (
      <FamilyHome
        mode="join"
        needsOnboarding={false}
        initialFeed={initialFeed}
        initialBranding={initialBranding}
        initialMemberCount={initialMemberCount}
        viewerKey={viewerKey}
      />
    );
  }

  return (
    <FamilyHome
      mode="member"
      memberCount={initialMemberCount}
      needsOnboarding={!me.data.onboarding_completed}
      initialFeed={initialFeed}
      initialBranding={initialBranding}
      initialMemberCount={initialMemberCount}
      viewerKey={viewerKey}
    />
  );
}
