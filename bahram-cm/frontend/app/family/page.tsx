import { FamilyHome } from '@/components/family/FamilyHome';
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

export default async function FamilyPage() {
  const [user, initialFeed, me] = await Promise.all([
    getCurrentStudent(),
    loadInitialFeed(),
    loadMe(),
  ]);

  if (!user) {
    return (
      <FamilyHome mode="guest" needsOnboarding={false} initialFeed={initialFeed} viewerKey="guest" />
    );
  }

  const viewerKey = user.id;

  if (!me.data.is_member) {
    return (
      <FamilyHome
        mode="join"
        needsOnboarding={false}
        initialFeed={initialFeed}
        viewerKey={viewerKey}
      />
    );
  }

  return (
    <FamilyHome
      mode="member"
      memberCount={me.data.member_count}
      needsOnboarding={!me.data.onboarding_completed}
      initialFeed={initialFeed}
      viewerKey={viewerKey}
    />
  );
}
