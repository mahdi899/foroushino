'use client';

import { Suspense, useCallback, useState } from 'react';
import { FamilyFeedChrome } from '@/components/family/FamilyFeedChrome';
import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { FamilyTopBar } from '@/components/family/FamilyTopBar';
import { FeedView } from '@/components/family/FeedView';
import { GuestBanner } from '@/components/family/GuestBanner';
import { JoinBanner } from '@/components/family/JoinBanner';
import { OnboardingModal } from '@/components/family/OnboardingModal';
import type { FamilyComment } from '@/lib/family/types';

type Mode = 'guest' | 'join' | 'member';

type CommentsTarget = {
  postId: number;
  onCommentAdded: (comment: FamilyComment) => void;
};

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

  const previewMode = mode === 'guest' ? 'guest' : mode === 'join' ? 'join' : null;

  return (
    <FamilyShell>
      <div className="lg:hidden">
        <FamilyTopBar memberCount={memberCount} />
        <FamilyFeedChrome
          showPinned={mode === 'member' && !commentsTarget}
          showNowPlaying={false}
          onOpenComments={openComments}
        />
      </div>
      <FamilyMain className="min-h-0">
        <FeedView
          memberCount={memberCount}
          previewMode={previewMode}
          showPinned={mode === 'member'}
          commentsTarget={commentsTarget}
          onOpenComments={openComments}
          onCloseComments={() => setCommentsTarget(null)}
        />
      </FamilyMain>
      {mode === 'guest' && <GuestBanner />}
      {mode === 'join' && (
        <Suspense>
          <JoinBanner id="family-join-cta" />
        </Suspense>
      )}
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
    </FamilyShell>
  );
}
