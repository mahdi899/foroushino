'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowRight, Bell, CirclePlay } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyStoryHint } from '@/components/family/FamilyStoryHint';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StoryViewer } from '@/components/family/StoryViewer';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';
import { useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';
import { useFamilyStoryState } from '@/lib/family/hooks/useFamilyStoryState';
import type { FamilyBranding } from '@/lib/family/types';

/** Desktop branding column — Telegram channel-info panel + iOS glass. */
export function FamilyBrandingSidebar({
  memberCount,
  isMember = true,
  initialBranding,
  notificationsActive = false,
  onOpenNotifications,
  onCloseNotifications,
}: {
  memberCount?: number;
  isMember?: boolean;
  initialBranding?: FamilyBranding;
  notificationsActive?: boolean;
  onOpenNotifications?: () => void;
  onCloseNotifications?: () => void;
}) {
  const { branding } = useFamilyBranding(initialBranding);
  const { unreadCount } = useFamilyUnreadCount(isMember);
  const { hasStories, hasUnseen, markSeen } = useFamilyStoryState(branding);
  const [storyOpen, setStoryOpen] = useState(false);
  const communityAvatar = branding.community_avatar ?? branding.profile_avatar;
  const storiesAvailable = isMember && hasStories;

  const openStories = useCallback(() => {
    if (!storiesAvailable) return;
    setStoryOpen(true);
  }, [storiesAvailable]);

  const handleStoriesFinished = useCallback(
    (storyIds: number[]) => {
      const latest = storyIds.length > 0 ? Math.max(...storyIds) : undefined;
      markSeen(latest);
    },
    [markSeen],
  );

  return (
    <>
      <aside className="family-sidebar hidden h-full w-[min(100%,300px)] shrink-0 flex-col overflow-hidden lg:flex">
        <div className="family-sidebar__inner">
          <nav className="family-sidebar__toolbar" aria-label="میانبرهای خانواده">
            <Link
              href="/"
              className="family-sidebar__tool-btn"
              title="بازگشت به سایت"
              aria-label="بازگشت به سایت"
            >
              <ArrowRight className="family-sidebar__tool-icon" strokeWidth={1.85} aria-hidden />
            </Link>

            {isMember && (
              <button
                type="button"
                onClick={() => {
                  if (notificationsActive) onCloseNotifications?.();
                  else onOpenNotifications?.();
                }}
                aria-pressed={notificationsActive || undefined}
                aria-label={notificationsActive ? 'بستن اعلان‌ها' : 'اعلان‌ها'}
                title={notificationsActive ? 'بستن اعلان‌ها' : 'اعلان‌ها'}
                className={cn(
                  'family-sidebar__tool-btn',
                  notificationsActive && 'family-sidebar__tool-btn--active',
                )}
              >
                <Bell className="family-sidebar__tool-icon" strokeWidth={1.85} aria-hidden />
                {unreadCount > 0 && (
                  <span className="family-sidebar__badge" aria-hidden>
                    {unreadCount > 9 ? '9+' : unreadCount.toLocaleString('en-US')}
                  </span>
                )}
              </button>
            )}

            <span className="family-sidebar__toolbar-spacer" aria-hidden />

            <ThemeToggle mini className="family-sidebar__theme-toggle" />
          </nav>

          <div className="family-sidebar__body">
            <div className="family-sidebar__hero">
              {storiesAvailable ? (
                <button
                  type="button"
                  className="family-sidebar__avatar-btn"
                  onClick={openStories}
                  aria-label={`مشاهده استوری ${branding.profile_name}`}
                >
                  <FamilyAuthorAvatar
                    name={branding.profile_name}
                    avatar={communityAvatar}
                    size="xl"
                    hasStoryRing
                    storyUnseen={hasUnseen}
                    verified
                  />
                </button>
              ) : (
                <div className="family-sidebar__avatar-btn family-sidebar__avatar-btn--static">
                  <FamilyAuthorAvatar
                    name={branding.profile_name}
                    avatar={communityAvatar}
                    size="xl"
                    verified
                  />
                </div>
              )}
            </div>

            <div className="family-sidebar__card">
              <h2 className="family-sidebar__channel-name">{branding.display_name}</h2>
              <FamilyStoryHint
                memberCount={memberCount}
                memberLabel="عضو فعال"
                hasUnseen={isMember && hasUnseen}
                onOpenStories={openStories}
                showOnlineDot={typeof memberCount === 'number' && memberCount > 0}
                className="family-sidebar__subtitle"
              />
              <p className="family-sidebar__bio">
                فضای نزدیک {branding.profile_name}
                <span className="family-sidebar__bio-dot" aria-hidden>
                  ·
                </span>
                پست، صوت، ویدیو و گفتگو
              </p>
            </div>

            {storiesAvailable && (
              <button type="button" onClick={openStories} className="family-sidebar__story-cta">
                <CirclePlay className="family-sidebar__story-cta-icon" strokeWidth={1.85} aria-hidden />
                {hasUnseen ? 'استوری جدید' : 'مشاهده استوری‌ها'}
              </button>
            )}
          </div>

          <footer className="family-sidebar__footer">
            <span className="family-sidebar__footer-label">خانواده داداش بهرام</span>
          </footer>
        </div>
      </aside>

      {isMember && (
        <StoryViewer
          open={storyOpen}
          onClose={() => setStoryOpen(false)}
          onFinished={handleStoriesFinished}
          profileName={branding.profile_name}
        />
      )}
    </>
  );
}
