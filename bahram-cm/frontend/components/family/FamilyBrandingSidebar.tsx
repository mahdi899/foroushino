'use client';

import { useCallback, useState } from 'react';
import { Bell, CirclePlay } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyStoryHint } from '@/components/family/FamilyStoryHint';
import { FamilyBackButton } from '@/components/family/FamilyBackButton';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StoryViewer } from '@/components/family/StoryViewer';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';
import { useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';
import { useFamilyStoryState } from '@/lib/family/hooks/useFamilyStoryState';
import { useFamilyGuestAccessOptional } from '@/components/family/FamilyGuestAccess';
import { FAMILY_GUEST_CTA } from '@/lib/family/guest-access';
import type { FamilyBranding } from '@/lib/family/types';
import { FamilyMenuButton } from '@/components/family/FamilyMenuSheet';

/** Desktop branding column — Telegram channel-info panel + iOS glass. */
export function FamilyBrandingSidebar({
  memberCount,
  isMember = true,
  guestStoriesLocked = false,
  initialBranding,
  notificationsActive = false,
  isLoggedIn = false,
  onOpenNotifications,
  onCloseNotifications,
}: {
  memberCount?: number;
  isMember?: boolean;
  guestStoriesLocked?: boolean;
  initialBranding?: FamilyBranding;
  notificationsActive?: boolean;
  isLoggedIn?: boolean;
  onOpenNotifications?: () => void;
  onCloseNotifications?: () => void;
}) {
  const guestAccess = useFamilyGuestAccessOptional();
  const { branding } = useFamilyBranding(initialBranding);
  const { unreadCount } = useFamilyUnreadCount(isMember);
  const { hasStories, hasUnseen, markSeen } = useFamilyStoryState(branding);
  const [storyOpen, setStoryOpen] = useState(false);
  const communityAvatar = branding.community_avatar ?? branding.profile_avatar;
  const storiesAvailable = hasStories;
  const storiesLocked = guestStoriesLocked && storiesAvailable;

  const openStories = useCallback(() => {
    if (storiesLocked) {
      guestAccess?.promptLogin('stories');
      return;
    }
    if (!isMember || !storiesAvailable) return;
    setStoryOpen(true);
  }, [guestAccess, isMember, storiesAvailable, storiesLocked]);

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
            <FamilyBackButton
              className="family-sidebar__tool-btn"
              iconClassName="family-sidebar__tool-icon"
            />

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

            <FamilyMenuButton className="family-sidebar__tool-btn" isLoggedIn={isLoggedIn} />
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
                    avatarVersion={branding.branding_version}
                    size="xl"
                    hasStoryRing
                    storyUnseen={!storiesLocked && hasUnseen}
                    verified
                  />
                </button>
              ) : (
                <div className="family-sidebar__avatar-btn family-sidebar__avatar-btn--static">
                  <FamilyAuthorAvatar
                    name={branding.profile_name}
                    avatar={communityAvatar}
                    avatarVersion={branding.branding_version}
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
                maskMemberCount={guestStoriesLocked}
                onMaskedMemberCountClick={() => guestAccess?.promptLogin('morePosts')}
                hasUnseen={!storiesLocked && isMember && hasUnseen}
                onOpenStories={openStories}
                showOnlineDot={!guestStoriesLocked && typeof memberCount === 'number' && memberCount > 0}
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
                {storiesLocked ? FAMILY_GUEST_CTA : hasUnseen ? 'استوری جدید' : 'مشاهده استوری‌ها'}
              </button>
            )}
          </div>

          <footer className="family-sidebar__footer">
            <span className="family-sidebar__footer-label">خانواده داداش بهرام</span>
          </footer>
        </div>
      </aside>

      {isMember && !guestStoriesLocked && (
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
