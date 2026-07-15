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

export default async function FamilyPage() {
  const user = await getCurrentStudent();

  if (!user) {
    const initialFeed = await loadInitialFeed();
    return <FamilyHome mode="guest" needsOnboarding={false} initialFeed={initialFeed} />;
  }

  let me = await familyFetch<{ data: FamilyMeResponse }>('/me').catch(() => ({
    data: { is_member: false, display_name: 'خانواده داداش بهرام' } as FamilyMeResponse,
  }));

  if (!me.data.is_member) {
    await familyFetch('/join', { method: 'POST', body: {} }).catch(() => undefined);
    me = await familyFetch<{ data: FamilyMeResponse }>('/me').catch(() => me);
  }

  const initialFeed = await loadInitialFeed();

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
