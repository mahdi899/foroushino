import { FamilyHome } from '@/components/family/FamilyHome';
import { familyFetch } from '@/lib/family/session';
import { getCurrentStudent } from '@/lib/student/session';
import type { FamilyMeResponse } from '@/lib/family/types';

export default async function FamilyPage() {
  const user = await getCurrentStudent();

  if (!user) {
    return <FamilyHome mode="guest" needsOnboarding={false} />;
  }

  const me = await familyFetch<{ data: FamilyMeResponse }>('/me').catch(() => ({
    data: { is_member: false, display_name: 'خانواده داداش بهرام' } as FamilyMeResponse,
  }));

  if (!me.data.is_member) {
    return <FamilyHome mode="join" needsOnboarding={false} />;
  }

  return (
    <FamilyHome
      mode="member"
      memberCount={me.data.member_count}
      needsOnboarding={!me.data.onboarding_completed}
    />
  );
}
