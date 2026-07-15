'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowRight, Bell } from 'lucide-react';
import { FamilyStoryHint } from '@/components/family/FamilyStoryHint';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StoryViewer } from '@/components/family/StoryViewer';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';
import { useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';
import { useFamilyStoryState } from '@/lib/family/hooks/useFamilyStoryState';

/** Desktop-only branding column — logo, نام خانواده، آواتار و لینک‌ها. */
export function FamilyBrandingSidebar({
  memberCount,
  isMember = true,
  notificationsActive = false,
  onOpenNotifications,
}: {
  memberCount?: number;
  isMember?: boolean;
  notificationsActive?: boolean;
  onOpenNotifications?: () => void;
}) {
  const { branding } = useFamilyBranding();
  const { unreadCount } = useFamilyUnreadCount(isMember);
  const { hasStories, hasUnseen, markSeen } = useFamilyStoryState(branding);
  const [storyOpen, setStoryOpen] = useState(false);
  const communityAvatar = branding.community_avatar ?? branding.profile_avatar;

  const openStories = useCallback(() => {
    if (!hasStories) return;
    setStoryOpen(true);
  }, [hasStories]);

  const handleStoriesFinished = useCallback(
    (storyIds: number[]) => {
      const latest = storyIds.length > 0 ? Math.max(...storyIds) : undefined;
      markSeen(latest);
    },
    [markSeen],
  );

  return (
    <>
      <aside className="family-sidebar hidden h-full w-[min(100%,280px)] shrink-0 flex-col overflow-hidden border-e lg:flex">
        <div className="flex h-full min-h-0 flex-col px-4 py-5 lg:px-5 lg:py-6">
          <nav
            className="family-sidebar-top flex h-8 shrink-0 items-center gap-1 border-b border-bone/[0.06] pb-3"
            aria-label="میانبرهای خانواده"
          >
            <Link
              href="/"
              className="family-nav-item family-nav-item--compact group flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] transition"
            >
              <span className="family-nav-icon family-nav-icon--compact flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition group-hover:text-bone/80">
                <ArrowRight className="h-[13px] w-[13px]" strokeWidth={1.75} />
              </span>
              سایت
            </Link>
            {isMember && (
              <button
                type="button"
                onClick={onOpenNotifications}
                aria-current={notificationsActive ? 'page' : undefined}
                className={`group family-nav-item family-nav-item--compact flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] transition ${
                  notificationsActive ? 'family-nav-item--active' : ''
                }`}
              >
                <span
                  className={`family-nav-icon family-nav-icon--compact relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
                    notificationsActive ? 'bg-gold/15 text-gold' : 'group-hover:text-bone/80'
                  }`}
                >
                  <Bell className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold px-0.5 text-[8px] font-bold text-charcoal">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                اعلان‌ها
              </button>
            )}
            <div className="flex h-8 shrink-0 items-center">
              <ThemeToggle mini />
            </div>
          </nav>

          <div className="relative flex flex-1 flex-col items-center justify-center px-1 py-6 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.1] blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-2xl"
            />

            <div className="relative mb-6">
              {!hasStories && (
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-full bg-gradient-to-tr from-gold/30 via-transparent to-gold/10 opacity-70 blur-md"
                />
              )}
              <FamilyAuthorAvatar
                name={branding.profile_name}
                avatar={communityAvatar}
                size="xl"
                hasStoryRing={hasStories}
                onClick={hasStories ? openStories : undefined}
                className={hasStories ? undefined : 'shadow-[0_20px_50px_rgba(201,147,10,0.28)] ring-2 ring-gold/25'}
              />
            </div>

            <h2 className="max-w-[220px] text-[18px] font-bold leading-snug tracking-tight text-bone">
              {branding.display_name}
            </h2>
            <FamilyStoryHint
              memberCount={memberCount}
              memberLabel="عضو فعال"
              hasUnseen={hasUnseen}
              onOpenStories={openStories}
              className="mt-3 text-[12px] text-bone/50"
            />
            <p className="mt-2 max-w-[230px] text-[13px] leading-relaxed text-bone/45">
              فضای نزدیک {branding.profile_name}
              <span className="mx-1 text-bone/25">·</span>
              پست، صوت، ویدیو و گفتگو
            </p>
          </div>
        </div>
      </aside>
      <StoryViewer
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        onFinished={handleStoriesFinished}
        profileName={branding.profile_name}
      />
    </>
  );
}
