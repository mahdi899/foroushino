'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Pin } from 'lucide-react';
import { getPinnedPosts } from '@/lib/family/api';
import { getPinnedPreview } from '@/lib/family/pinnedPreview';
import type { FamilyPost } from '@/lib/family/types';

export function PinnedMessageBar({
  pinnedPosts: pinnedProp,
  onScrollToPost,
}: {
  pinnedPosts?: FamilyPost[];
  onScrollToPost?: (postId: number) => void;
}) {
  const { data } = useSWR(
    pinnedProp ? null : 'family-pinned',
    async () => (await getPinnedPosts()).data,
    { revalidateOnFocus: true },
  );

  const [cursor, setCursor] = useState(0);

  const pinnedPosts = pinnedProp ?? data ?? [];

  useEffect(() => {
    setCursor(0);
  }, [pinnedPosts.map((p) => p.id).join(',')]);

  if (pinnedPosts.length === 0) return null;

  const index = cursor % pinnedPosts.length;
  const pinned = pinnedPosts[index];
  const { label, thumbnail } = getPinnedPreview(pinned);

  const handleClick = () => {
    onScrollToPost?.(pinned.id);
    if (pinnedPosts.length > 1) {
      setCursor((c) => (c + 1) % pinnedPosts.length);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="family-pinned-bar flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-right backdrop-blur-md transition sm:px-4 lg:px-5"
      aria-label={`رفتن به پیام سنجاق‌شده${pinnedPosts.length > 1 ? ` (${index + 1} از ${pinnedPosts.length})` : ''}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
        <Pin className="h-4 w-4" strokeWidth={2} />
      </span>

      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-sky-300/90">
          <span>پیام سنجاق‌شده</span>
          {pinnedPosts.length > 1 ? (
            <span className="rounded-full bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-200/80">
              {pinnedPosts.length}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[13px] leading-snug text-bone/70">{label}</span>
      </span>
    </button>
  );
}
