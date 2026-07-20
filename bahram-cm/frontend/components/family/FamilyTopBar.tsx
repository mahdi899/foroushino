'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StoryViewer } from '@/components/family/StoryViewer';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';
import { useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';
import { FamilyStoryHint } from '@/components/family/FamilyStoryHint';
import { useFamilyStoryState } from '@/lib/family/hooks/useFamilyStoryState';

import { useFamilyGuestAccessOptional } from '@/components/family/FamilyGuestAccess';
import type { FamilyBranding } from '@/lib/family/types';
import { ThemeIconButton } from '@/components/theme/ThemeIconButton';
import { familyHomeHref } from '@/lib/domains';

function TopBarInnerSkeleton({ showNotifications }: { showNotifications: boolean }) {
  return (
    <>
      <div className="family-topbar__back family-topbar__back--skel" aria-hidden>
        <span className="family-skeleton family-topbar-skel__icon" />
      </div>
      <div className="family-topbar__profile" aria-hidden>
        <span className="family-skeleton family-topbar-skel__avatar shrink-0 rounded-full" />
        <div className="family-topbar-skel__text min-w-0">
          <span className="family-skeleton family-topbar-skel__title" />
          <span className="family-skeleton family-topbar-skel__sub" />
        </div>
      </div>
      <div className="family-topbar__actions" aria-hidden>
        {showNotifications ? (
          <span className="family-skeleton family-topbar-skel__icon family-topbar__action family-topbar__action--skel" />
        ) : null}
        <span className="family-skeleton family-topbar-skel__icon family-topbar__action family-topbar__action--skel" />
      </div>
    </>
  );
}

export function FamilyTopBar({
  memberCount,
  initialBranding,
  canViewStories = true,
  guestStoriesLocked = false,
  showNotifications = false,
  notificationsActive = false,
  onOpenNotifications,
  onCloseNotifications,
}: {
  memberCount?: number;
  initialBranding?: FamilyBranding;
  canViewStories?: boolean;
  guestStoriesLocked?: boolean;
  showNotifications?: boolean;
  notificationsActive?: boolean;
  onOpenNotifications?: () => void;
  onCloseNotifications?: () => void;
}) {
  const guestAccess = useFamilyGuestAccessOptional();
  const { branding, isLoading } = useFamilyBranding(initialBranding);
  const { unreadCount } = useFamilyUnreadCount(showNotifications && !isLoading);
  const { hasStories, hasUnseen, markSeen } = useFamilyStoryState(branding);
  const [storyOpen, setStoryOpen] = useState(false);
  const storiesAvailable = canViewStories && hasStories;
  const storiesLocked = guestStoriesLocked && storiesAvailable;

  const openStories = useCallback(() => {
    if (storiesLocked) {
      guestAccess?.promptLogin('stories');
      return;
    }
    if (!storiesAvailable) return;
    setStoryOpen(true);
  }, [guestAccess, storiesAvailable, storiesLocked]);

  const handleStoriesFinished = useCallback(
    (storyIds: number[]) => {
      const latest = storyIds.length > 0 ? Math.max(...storyIds) : undefined;
      markSeen(latest);
    },
    [markSeen],
  );

  const profileControl = storiesAvailable ? (
    <button type="button" onClick={openStories} className="family-topbar__profile">
      <FamilyAuthorAvatar
        name={branding.profile_name}
        avatar={branding.community_avatar ?? branding.profile_avatar}
        avatarVersion={branding.branding_version}
        size="lg"
        hasStoryRing
        storyUnseen={!storiesLocked && hasUnseen}
        verified
      />
      <div className="min-w-0 leading-tight">
        <p className="family-topbar__title truncate">{branding.display_name}</p>
        <FamilyStoryHint
          memberCount={memberCount}
          maskMemberCount={guestStoriesLocked}
          onMaskedMemberCountClick={() => guestAccess?.promptLogin('morePosts')}
          hasUnseen={!storiesLocked && hasUnseen}
          onOpenStories={openStories}
          showOnlineDot={!guestStoriesLocked && typeof memberCount === 'number' && memberCount > 0}
          nested
        />
      </div>
    </button>
  ) : (
    <Link href={familyHomeHref()} className="family-topbar__profile">
      <FamilyAuthorAvatar
        name={branding.profile_name}
        avatar={branding.community_avatar ?? branding.profile_avatar}
        avatarVersion={branding.branding_version}
        size="lg"
        verified
      />
      <div className="min-w-0 leading-tight">
        <p className="family-topbar__title truncate">{branding.display_name}</p>
        <FamilyStoryHint
          memberCount={memberCount}
          maskMemberCount={guestStoriesLocked}
          onMaskedMemberCountClick={() => guestAccess?.promptLogin('morePosts')}
          hasUnseen={false}
          onOpenStories={openStories}
          showOnlineDot={!guestStoriesLocked && typeof memberCount === 'number' && memberCount > 0}
          nested
        />
      </div>
    </Link>
  );

  return (
    <>
      <header
        className="family-topbar"
        aria-busy={isLoading || undefined}
        aria-label={isLoading ? 'در حال بارگذاری' : undefined}
      >
        <div className="family-topbar__inner">
          {isLoading ? (
            <TopBarInnerSkeleton showNotifications={showNotifications} />
          ) : (
            <>
              <Link href="/" aria-label="بازگشت به سایت" className="family-topbar__back">
                <ChevronRight className="family-topbar__back-icon" aria-hidden />
              </Link>

              {profileControl}

              <div className="family-topbar__actions">
                {showNotifications ? (
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
                      'family-topbar__action',
                      notificationsActive && 'family-topbar__action--active',
                    )}
                  >
                    <Bell className="family-topbar__action-icon" strokeWidth={1.85} aria-hidden />
                    {unreadCount > 0 && (
                      <span className="family-topbar__badge" aria-hidden>
                        {unreadCount > 9 ? '9+' : unreadCount.toLocaleString('en-US')}
                      </span>
                    )}
                  </button>
                ) : null}
                <ThemeIconButton />
              </div>
            </>
          )}
        </div>
      </header>

      {canViewStories && !guestStoriesLocked && !isLoading && (
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
