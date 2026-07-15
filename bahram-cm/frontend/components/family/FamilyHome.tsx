'use client';

import { Suspense, useCallback, useRef, useState } from 'react';
import { FamilyAutoJoin } from '@/components/family/FamilyAutoJoin';
import { FamilyFeedChrome } from '@/components/family/FamilyFeedChrome';
import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { FamilyTopBar } from '@/components/family/FamilyTopBar';
import { FeedView } from '@/components/family/FeedView';
import { GuestBanner } from '@/components/family/GuestBanner';
import { JoinBanner } from '@/components/family/JoinBanner';
import { OnboardingModal } from '@/components/family/OnboardingModal';
import type { FamilyComment, FamilyFeedResponse } from '@/lib/family/types';

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
  viewerKey = 'anon',
}: {
  mode: Mode;
  memberCount?: number;
  needsOnboarding: boolean;
  initialFeed?: FamilyFeedResponse | null;
  viewerKey?: string | number;
}) {
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);
  const [commentsTarget, setCommentsTarget] = useState<CommentsTarget | null>(null);
  const scrollToPostRef = useRef<((postId: number) => Promise<void>) | null>(null);

  const openComments = useCallback((target: CommentsTarget) => {
    setCommentsTarget(target);
  }, []);

  const handleScrollToPost = useCallback((postId: number) => {
    void scrollToPostRef.current?.(postId);
  }, []);

  const previewMode = mode === 'guest' ? 'guest' : mode === 'join' ? 'join' : null;

  return (
    <FamilyShell>
      <div className="lg:hidden">
        <FamilyTopBar memberCount={memberCount} canViewStories={mode === 'member'} />
        <FamilyFeedChrome
          showPinned={mode === 'member' && !commentsTarget}
          showNowPlaying={false}
          onScrollToPost={handleScrollToPost}
        />
      </div>
      <FamilyMain className="min-h-0">
        <FeedView
          memberCount={memberCount}
          previewMode={previewMode}
          showPinned={mode === 'member'}
          initialFeed={initialFeed}
          viewerKey={viewerKey}
          commentsTarget={commentsTarget}
          onOpenComments={openComments}
          onCloseComments={() => setCommentsTarget(null)}
          onRegisterScrollToPost={(fn) => {
            scrollToPostRef.current = fn;
          }}
        />
      </FamilyMain>
      {mode === 'join' && (
        <Suspense>
          <FamilyAutoJoin />
        </Suspense>
      )}
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
