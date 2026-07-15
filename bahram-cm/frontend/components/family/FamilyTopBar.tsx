'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StoryViewer } from '@/components/family/StoryViewer';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';

export function FamilyTopBar({ memberCount }: { memberCount?: number }) {
  const { branding } = useFamilyBranding();
  const [storyOpen, setStoryOpen] = useState(false);
  const hasStories = Boolean(branding.has_active_stories);

  return (
    <>
      <header className="family-topbar flex shrink-0 items-center justify-between border-b px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6 lg:py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            aria-label="بازگشت به سایت"
            className="family-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:text-[var(--family-accent)]"
          >
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
          <FamilyAuthorAvatar
            name={branding.profile_name}
            avatar={branding.community_avatar ?? branding.profile_avatar}
            size="lg"
            hasStoryRing={hasStories}
            onClick={hasStories ? () => setStoryOpen(true) : undefined}
          />
          <Link href="/family" className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-bone lg:text-[15px]">{branding.display_name}</p>
            {typeof memberCount === 'number' && (
              <p className="text-[11px] text-bone/50 lg:text-xs">{memberCount.toLocaleString('fa-IR')} عضو</p>
            )}
          </Link>
        </div>
      </header>

      <StoryViewer open={storyOpen} onClose={() => setStoryOpen(false)} profileName={branding.profile_name} />
    </>
  );
}
