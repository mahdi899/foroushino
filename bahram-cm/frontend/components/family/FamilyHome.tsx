'use client';

import { Suspense, useState } from 'react';
import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { FamilyTopBar } from '@/components/family/FamilyTopBar';
import { FeedView } from '@/components/family/FeedView';
import { GuestBanner } from '@/components/family/GuestBanner';
import { JoinScreen } from '@/components/family/JoinScreen';
import { OnboardingModal } from '@/components/family/OnboardingModal';

type Mode = 'guest' | 'join' | 'member';

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
        <FamilyTopBar isMember={false} />
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
      <FamilyTopBar isMember={mode === 'member'} memberCount={memberCount} />
      <FamilyMain>
        <FeedView />
      </FamilyMain>
      {mode === 'guest' && <GuestBanner />}
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
    </FamilyShell>
  );
}
