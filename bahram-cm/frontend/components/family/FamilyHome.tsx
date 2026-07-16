'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { FamilyAutoJoin } from '@/components/family/FamilyAutoJoin';
import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { FamilyTopBar } from '@/components/family/FamilyTopBar';
import { FeedView } from '@/components/family/FeedView';
import { FamilyGuestBlur, FamilyGuestLoginBoot } from '@/components/family/FamilyGuestAuth';
import { GuestBanner } from '@/components/family/GuestBanner';
import { JoinBanner } from '@/components/family/JoinBanner';
import { JoinContextBoot } from '@/components/family/JoinContextBoot';
import { OnboardingModal } from '@/components/family/OnboardingModal';
import { useFamilyMemberCount } from '@/lib/family/hooks/useFamilyMemberCount';
import { invalidateAllFamilyBrowserCache } from '@/lib/family/browserCache';
import { writeFamilyShellSnapshot } from '@/lib/family/shellCache';
import type { FamilyBranding, FamilyComment, FamilyFeedResponse } from '@/lib/family/types';

type Mode = 'guest' | 'join' | 'member';

type CommentsTarget = {
  postId: number;
  onCommentAdded: (comment: FamilyComment) => void;
};

export function FamilyHome({
  mode,
  memberCount,
  needsOnboarding,
  initialFeed = null,
  initialBranding,
  initialMemberCount,
  viewerKey = 'anon',
}: {
  mode: Mode;
  memberCount?: number;
  needsOnboarding: boolean;
  initialFeed?: FamilyFeedResponse | null;
  initialBranding?: FamilyBranding;
  initialMemberCount?: number;
  viewerKey?: string | number;
}) {
  const { memberCount: resolvedMemberCount, syncMemberCount } = useFamilyMemberCount(
    memberCount ?? initialMemberCount,
  );

  useEffect(() => {
    if (!initialBranding && typeof initialMemberCount !== 'number') return;
    writeFamilyShellSnapshot(
      {
        branding: initialBranding,
        memberCount: memberCount ?? initialMemberCount,
      },
      viewerKey,
    );
  }, [initialBranding, initialMemberCount, memberCount, viewerKey]);

  const prevViewerKeyRef = useRef(viewerKey);
  useEffect(() => {
    const prev = prevViewerKeyRef.current;
    if (prev !== viewerKey) {
      void invalidateAllFamilyBrowserCache(prev);
      prevViewerKeyRef.current = viewerKey;
    }
  }, [viewerKey]);

  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);
  const [commentsTarget, setCommentsTarget] = useState<CommentsTarget | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const openComments = useCallback((target: CommentsTarget) => {
    setNotificationsOpen(false);
    setCommentsTarget(target);
  }, []);

  const openNotifications = useCallback(() => {
    setCommentsTarget(null);
    setNotificationsOpen(true);
  }, []);

  const closeComments = useCallback(() => setCommentsTarget(null), []);
  const closeNotifications = useCallback(() => setNotificationsOpen(false), []);

  const previewMode = mode === 'guest' ? 'guest' : mode === 'join' ? 'join' : null;
  const isGuest = mode === 'guest';
  const isMember = mode === 'member';

  const feed = (
    <>
      <div className="lg:hidden">
        <FamilyTopBar
          memberCount={resolvedMemberCount}
          initialBranding={initialBranding}
          canViewStories={isMember}
          showNotifications={isMember}
          notificationsActive={notificationsOpen}
          onOpenNotifications={openNotifications}
          onCloseNotifications={closeNotifications}
        />
      </div>
      <FamilyMain className="min-h-0">
        <FeedView
          memberCount={resolvedMemberCount}
          onMemberCountChange={syncMemberCount}
          previewMode={previewMode}
          showPinned={isMember && !commentsTarget && !notificationsOpen}
          initialFeed={initialFeed}
          initialBranding={initialBranding}
          viewerKey={viewerKey}
          commentsTarget={commentsTarget}
          onOpenComments={openComments}
          onCloseComments={closeComments}
          notificationsOpen={notificationsOpen}
          onOpenNotifications={openNotifications}
          onCloseNotifications={closeNotifications}
        />
      </FamilyMain>
    </>
  );

  return (
    <FamilyShell>
      <Suspense>
        <JoinContextBoot />
      </Suspense>
      {isGuest ? (
        <>
          <FamilyGuestLoginBoot />
          <div className="flex min-h-0 flex-1 flex-col">
            <FamilyGuestBlur className="flex min-h-0 flex-1 flex-col overflow-hidden">{feed}</FamilyGuestBlur>
            <GuestBanner />
          </div>
        </>
      ) : (
        feed
      )}
      {mode === 'join' && (
        <Suspense>
          <FamilyAutoJoin />
        </Suspense>
      )}
      {mode === 'join' && (
        <Suspense>
          <JoinBanner id="family-join-cta" />
        </Suspense>
      )}
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
    </FamilyShell>
  );
}
