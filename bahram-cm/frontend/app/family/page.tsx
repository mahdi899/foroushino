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
  const user = await getCurrentStudent();

  if (!user) {
    const initialFeed = await loadInitialFeed();
    return <FamilyHome mode="guest" needsOnboarding={false} initialFeed={initialFeed} />;
  }

  const [me, initialFeed] = await Promise.all([loadMe(), loadInitialFeed()]);

  if (!me.data.is_member) {
    return <FamilyHome mode="join" needsOnboarding={false} initialFeed={initialFeed} />;
  }

  return (
    <FamilyHome
      mode="member"
      memberCount={me.data.member_count}
      needsOnboarding={!me.data.onboarding_completed}
      initialFeed={initialFeed}
    />
  );
}
