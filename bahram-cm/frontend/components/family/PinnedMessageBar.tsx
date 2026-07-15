'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { getPinnedPosts } from '@/lib/family/api';
import { familyMotion } from '@/lib/family/motion';
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
      className="family-pinned-bar"
      aria-label={`رفتن به پیام سنجاق‌شده${pinnedPosts.length > 1 ? ` (${index + 1} از ${pinnedPosts.length})` : ''}`}
    >
      <span className="family-pinned-bar__rail" aria-hidden />

      <span className="family-pinned-bar__body">
        <span className="family-pinned-bar__label-row">
          <span className="family-pinned-bar__label">پیام سنجاق‌شده</span>
          {pinnedPosts.length > 1 ? (
            <span className="family-pinned-bar__count">{pinnedPosts.length}</span>
          ) : null}
        </span>
        <span className="family-pinned-bar__preview">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={pinned.id}
              className="family-pinned-bar__preview-inner"
              initial={familyMotion.fadeUp(0).initial}
              animate={familyMotion.fadeUp(0).animate}
              exit={{ opacity: 0, y: -6 }}
              transition={familyMotion.tweenFast}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>

      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="" className="family-pinned-bar__thumb" />
      ) : null}
    </button>
  );
}
