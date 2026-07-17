import { FamilyHome } from '@/components/family/FamilyHome';
import { brandingFromMeAndFeed } from '@/lib/family/shellCache';
import { familyFetch } from '@/lib/family/session';
import { getCurrentStudent } from '@/lib/student/session';
import type { FamilyFeedResponse, FamilyMeResponse } from '@/lib/family/types';

const FEED_PAGE_SIZE = 15;

function oneParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = sp[key];
  if (Array.isArray(value)) return value[0] || undefined;
  return value || undefined;
}

/** URL attribution for server-side join (sessionStorage is client-only). */
function joinContextFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const reel = oneParam(sp, 'reel') ?? oneParam(sp, 'entry_event_ref');
  const entryEvent = oneParam(sp, 'entry_event') ?? oneParam(sp, 'entry_event_id');

  return {
    source: oneParam(sp, 'utm_source') ?? oneParam(sp, 'src'),
    campaign: oneParam(sp, 'utm_campaign'),
    content: oneParam(sp, 'utm_content'),
    entry_event: entryEvent,
    entry_event_ref: reel,
    reel: oneParam(sp, 'reel'),
    family_id: oneParam(sp, 'family_id') ?? oneParam(sp, 'family'),
  };
}

async function loadInitialFeed(): Promise<FamilyFeedResponse | null> {
  try {
    const params = new URLSearchParams({ limit: String(FEED_PAGE_SIZE) });
    return await familyFetch<FamilyFeedResponse>(`/feed?${params.toString()}`);
  } catch {
    return null;
  }
}

async function loadMe(): Promise<FamilyMeResponse> {
  try {
    const res = await familyFetch<{ data: FamilyMeResponse }>('/me');
    return res.data;
  } catch {
    return { is_member: false, display_name: 'خانواده داداش بهرام' } as FamilyMeResponse;
  }
}

async function ensureMembership(
  sp: Record<string, string | string[] | undefined>,
): Promise<FamilyMeResponse> {
  try {
    await familyFetch('/join', {
      method: 'POST',
      body: joinContextFromSearchParams(sp),
    });
  } catch {
    /* capacity / validation — fall through and re-check /me */
  }
  return loadMe();
}

function resolveInitialMemberCount(
  me: FamilyMeResponse,
  feed: FamilyFeedResponse | null,
): number | undefined {
  if (typeof me.member_count === 'number') return me.member_count;
  if (typeof feed?.meta.member_count === 'number') return feed.meta.member_count;
  return undefined;
}

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getCurrentStudent();

  if (!user) {
    const [initialFeed, me] = await Promise.all([loadInitialFeed(), loadMe()]);
    const initialBranding = brandingFromMeAndFeed(me, initialFeed);
    const initialMemberCount = resolveInitialMemberCount(me, initialFeed);

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

  let me = await loadMe();
  if (!me.is_member) {
    // Join before first paint so the user never flashes join CTAs after login.
    me = await ensureMembership(sp);
  }

  // Load feed only after membership is settled — guest preview ≠ member tip page.
  const initialFeed = await loadInitialFeed();
  const initialBranding = brandingFromMeAndFeed(me, initialFeed);
  const initialMemberCount = resolveInitialMemberCount(me, initialFeed);
  const viewerKey = user.id;

  if (!me.is_member) {
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
      needsOnboarding={!me.onboarding_completed}
      initialFeed={initialFeed}
      initialBranding={initialBranding}
      initialMemberCount={initialMemberCount}
      viewerKey={viewerKey}
    />
  );
}
