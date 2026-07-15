'use client';

import { Suspense, useCallback, useState } from 'react';
import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { FamilyTopBar } from '@/components/family/FamilyTopBar';
import { FeedView } from '@/components/family/FeedView';
import { GuestBanner } from '@/components/family/GuestBanner';
import { JoinScreen } from '@/components/family/JoinScreen';
import { OnboardingModal } from '@/components/family/OnboardingModal';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';
import type { FamilyComment } from '@/lib/family/types';

type Mode = 'guest' | 'join' | 'member';

type CommentsTarget = {
  postId: number;
  onCommentAdded: (comment: FamilyComment) => void;
};

function FamilyStickyHeader({
  memberCount,
  showPinned,
  onOpenComments,
}: {
  memberCount?: number;
  showPinned?: boolean;
  onOpenComments?: (target: CommentsTarget) => void;
}) {
  return (
    <div className="z-30 shrink-0">
      <FamilyTopBar memberCount={memberCount} />
      {showPinned && <PinnedMessageBar onOpenComments={onOpenComments} />}
    </div>
  );
}

export function FamilyHome({
  mode,
  memberCount,
  needsOnboarding,
}: {
  mode: Mode;
  memberCount?: number;
  needsOnboarding: boolean;
}) {
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);
  const [commentsTarget, setCommentsTarget] = useState<CommentsTarget | null>(null);

  const openComments = useCallback((target: CommentsTarget) => {
    setCommentsTarget(target);
  }, []);

  if (mode === 'join') {    return (
      <FamilyShell>
        <div className="lg:hidden">
          <FamilyStickyHeader />
        </div>
        <FamilyMain className="min-h-0 overflow-y-auto lg:flex lg:items-center lg:justify-center lg:overflow-hidden lg:px-8">
          <div className="w-full lg:max-w-md">
            <Suspense>
              <JoinScreen />
            </Suspense>
          </div>
        </FamilyMain>
      </FamilyShell>
    );
  }

  return (
    <FamilyShell>
      <div className="lg:hidden">
        <FamilyStickyHeader
          memberCount={memberCount}
          showPinned={mode === 'member' && !commentsTarget}
          onOpenComments={openComments}
        />
      </div>
      <FamilyMain className="min-h-0">
        <FeedView
          memberCount={memberCount}
          showPinned={mode === 'member'}
          commentsTarget={commentsTarget}
          onOpenComments={openComments}
          onCloseComments={() => setCommentsTarget(null)}
        />
      </FamilyMain>      {mode === 'guest' && <GuestBanner />}
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
    </FamilyShell>
  );
}
