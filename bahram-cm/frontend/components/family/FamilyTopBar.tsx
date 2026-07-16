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
      {showNotifications ? (
        <div className="family-topbar__action family-topbar__action--skel" aria-hidden>
          <span className="family-skeleton family-topbar-skel__icon" />
        </div>
      ) : null}
    </>
  );
}

export function FamilyTopBar({
  memberCount,
  canViewStories = true,
  showNotifications = false,
  notificationsActive = false,
  onOpenNotifications,
}: {
  memberCount?: number;
  canViewStories?: boolean;
  showNotifications?: boolean;
  notificationsActive?: boolean;
  onOpenNotifications?: () => void;
}) {
  const { branding, isLoading } = useFamilyBranding();
  const { unreadCount } = useFamilyUnreadCount(showNotifications && !isLoading);
  const { hasStories, hasUnseen, markSeen } = useFamilyStoryState(branding);
  const [storyOpen, setStoryOpen] = useState(false);
  const storiesAvailable = canViewStories && hasStories;

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

  const profileControl = storiesAvailable ? (
    <button type="button" onClick={openStories} className="family-topbar__profile">
      <FamilyAuthorAvatar
        name={branding.profile_name}
        avatar={branding.community_avatar ?? branding.profile_avatar}
        size="lg"
        hasStoryRing={storiesAvailable}
        storyUnseen={hasUnseen}
      />
      <div className="min-w-0 leading-tight">
        <p className="family-topbar__title truncate">{branding.display_name}</p>
        <FamilyStoryHint
          memberCount={memberCount}
          hasUnseen={canViewStories && hasUnseen}
          onOpenStories={openStories}
          showOnlineDot={typeof memberCount === 'number' && memberCount > 0}
          nested
        />
      </div>
    </button>
  ) : (
    <Link href="/family" className="family-topbar__profile">
      <FamilyAuthorAvatar
        name={branding.profile_name}
        avatar={branding.community_avatar ?? branding.profile_avatar}
        size="lg"
      />
      <div className="min-w-0 leading-tight">
        <p className="family-topbar__title truncate">{branding.display_name}</p>
        <FamilyStoryHint
          memberCount={memberCount}
          hasUnseen={false}
          onOpenStories={openStories}
          showOnlineDot={typeof memberCount === 'number' && memberCount > 0}
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

              {showNotifications ? (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  aria-current={notificationsActive ? 'page' : undefined}
                  aria-label="اعلان‌ها"
                  title="اعلان‌ها"
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
            </>
          )}
        </div>
      </header>

      {canViewStories && !isLoading && (
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
