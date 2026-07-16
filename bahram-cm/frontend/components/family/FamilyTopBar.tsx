'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { familyMotion } from '@/lib/family/motion';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StoryViewer } from '@/components/family/StoryViewer';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';
import { FamilyStoryHint } from '@/components/family/FamilyStoryHint';
import { useFamilyStoryState } from '@/lib/family/hooks/useFamilyStoryState';

export function FamilyTopBar({
  memberCount,
  canViewStories = true,
}: {
  memberCount?: number;
  canViewStories?: boolean;
}) {
  const { branding } = useFamilyBranding();
  const { hasStories, hasUnseen, markSeen } = useFamilyStoryState(branding);
  const [storyOpen, setStoryOpen] = useState(false);
  const reduceMotion = useReducedMotion();
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
      <motion.header
        className="family-topbar"
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={familyMotion.tween}
      >
        <div className="family-topbar__inner">
          <Link href="/" aria-label="بازگشت به سایت" className="family-topbar__back">
            <ChevronRight className="family-topbar__back-icon" aria-hidden />
          </Link>

          {profileControl}
        </div>
      </motion.header>

      {canViewStories && (
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
