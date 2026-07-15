'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Bell, Users } from 'lucide-react';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StoryViewer } from '@/components/family/StoryViewer';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';
import { useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';

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
  const [storyOpen, setStoryOpen] = useState(false);
  const hasStories = Boolean(branding.has_active_stories);
  const communityAvatar = branding.community_avatar ?? branding.profile_avatar;

  return (
    <>
      <aside className="family-sidebar hidden h-full w-[min(100%,280px)] shrink-0 flex-col overflow-hidden border-e lg:flex">
        <div className="flex flex-1 flex-col px-5 py-9">
          <div className="relative flex flex-col items-center text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-4 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-gold/[0.12] blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute top-6 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-white/[0.03] blur-2xl"
            />

            <div className="relative mb-5">
              {!hasStories && (
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-full bg-gradient-to-tr from-gold/25 via-transparent to-gold/10 opacity-60 blur-md"
                />
              )}
              <FamilyAuthorAvatar
                name={branding.profile_name}
                avatar={communityAvatar}
                size="xl"
                hasStoryRing={hasStories}
                onClick={hasStories ? () => setStoryOpen(true) : undefined}
                className={hasStories ? undefined : 'shadow-[0_20px_50px_rgba(201,147,10,0.28)] ring-2 ring-gold/25'}
              />
            </div>

            <h2 className="max-w-[220px] text-[17px] font-bold leading-snug tracking-tight text-bone">
              {branding.display_name}
            </h2>
            <p className="mt-2.5 max-w-[230px] text-[13px] leading-relaxed text-bone/45">
              فضای نزدیک {branding.profile_name}
              <span className="mx-1 text-bone/25">·</span>
              پست، صوت، ویدیو و گفتگو
            </p>

            {typeof memberCount === 'number' && (
              <div className="family-chip mt-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium text-bone/55">
                <Users className="h-3.5 w-3.5 shrink-0 text-gold/70" strokeWidth={1.75} />
                <span>{memberCount.toLocaleString('fa-IR')} عضو فعال</span>
              </div>
            )}
          </div>

          <nav className="mt-auto space-y-0.5 pt-10" aria-label="میانبرهای خانواده">
            {isMember && (
              <button
                type="button"
                onClick={onOpenNotifications}
                aria-current={notificationsActive ? 'page' : undefined}
                className={`group family-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${
                  notificationsActive ? 'family-nav-item--active' : ''
                }`}
              >
                <span
                  className={`family-nav-icon relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    notificationsActive ? 'bg-gold/15 text-gold' : 'group-hover:text-bone/80'
                  }`}
                >
                  <Bell className="h-[16px] w-[16px]" strokeWidth={1.75} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-charcoal">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                اعلان‌ها
              </button>
            )}
            <Link
              href="/"
              className="family-nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition"
            >
              <span className="family-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition group-hover:text-bone/80">
                <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </span>
              بازگشت به سایت
            </Link>
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="text-[11px] text-bone/45">حالت نمایش</span>
              <ThemeToggle compact />
            </div>
          </nav>
        </div>
      </aside>
      <StoryViewer open={storyOpen} onClose={() => setStoryOpen(false)} profileName={branding.profile_name} />
    </>
  );
}
