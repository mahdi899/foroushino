'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowRight } from 'lucide-react';
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

  return (
    <>
      <header className="family-topbar flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6 lg:py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <FamilyAuthorAvatar
            name={branding.profile_name}
            avatar={branding.community_avatar ?? branding.profile_avatar}
            size="lg"
            hasStoryRing={storiesAvailable}
            onClick={storiesAvailable ? openStories : undefined}
          />
          <div className="min-w-0 leading-tight">
            <Link href="/family" className="block min-w-0">
              <p className="truncate text-sm font-bold text-bone lg:text-[15px]">{branding.display_name}</p>
            </Link>
            <FamilyStoryHint
              memberCount={memberCount}
              hasUnseen={canViewStories && hasUnseen}
              onOpenStories={openStories}
            />
          </div>
        </div>

        <Link
          href="/"
          aria-label="بازگشت به سایت"
          className="family-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:text-[var(--family-accent)]"
        >
          <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>
      </header>

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
