'use client';

import { Suspense, useState } from 'react';
import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { FamilyTopBar } from '@/components/family/FamilyTopBar';
import { FeedView } from '@/components/family/FeedView';
import { GuestBanner } from '@/components/family/GuestBanner';
import { JoinScreen } from '@/components/family/JoinScreen';
import { OnboardingModal } from '@/components/family/OnboardingModal';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';

type Mode = 'guest' | 'join' | 'member';

function FamilyStickyHeader({ memberCount, showPinned }: { memberCount?: number; showPinned?: boolean }) {
  return (
    <div className="sticky top-0 z-30 shrink-0">
      <FamilyTopBar memberCount={memberCount} />
      {showPinned && <PinnedMessageBar />}
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

  if (mode === 'join') {
    return (
      <FamilyShell>
        <FamilyStickyHeader />
        <FamilyMain>
          <Suspense>
            <JoinScreen />
          </Suspense>
        </FamilyMain>
      </FamilyShell>
    );
  }

  return (
    <FamilyShell>
      <FamilyStickyHeader memberCount={memberCount} showPinned={mode === 'member'} />
      <FamilyMain>
        <FeedView />
      </FamilyMain>
      {mode === 'guest' && <GuestBanner />}
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
    </FamilyShell>
  );
}
