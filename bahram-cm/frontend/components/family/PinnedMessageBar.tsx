'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { CommentsPage } from '@/components/family/CommentsSheet';
import { PostCard } from '@/components/family/PostCard';
import { getPinnedPosts } from '@/lib/family/api';
import { getPinnedPreview } from '@/lib/family/pinnedPreview';
import type { FamilyComment } from '@/lib/family/types';

export function PinnedMessageBar() {
  const { data } = useSWR('family-pinned', async () => (await getPinnedPosts()).data, {
    revalidateOnFocus: true,
  });

  const [expanded, setExpanded] = useState(false);
  const [commentsTarget, setCommentsTarget] = useState<{
    postId: number;
    onCommentAdded: (comment: FamilyComment) => void;
  } | null>(null);

  const pinned = data?.[0];
  if (!pinned) return null;

  const { label, thumbnail } = getPinnedPreview(pinned);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2.5 border-b border-white/10 bg-[#141c24]/98 px-3 py-2 text-right backdrop-blur-md transition hover:bg-[#182028] sm:px-4 lg:px-5"
        aria-label="مشاهده پیام سنجاق‌شده"
      >
        <span className="h-10 w-0.5 shrink-0 rounded-full bg-sky-400" aria-hidden />

        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/5 text-base">
            📌
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold leading-tight text-sky-300">پیام سنجاق‌شده</span>
          <span className="mt-0.5 block truncate text-[13px] leading-snug text-bone/75">{label}</span>
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-charcoal p-3 shadow-2xl sm:rounded-2xl sm:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-bone">پیام سنجاق‌شده</p>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-full px-2 py-1 text-sm text-bone/60 hover:text-bone"
                >
                  بستن
                </button>
              </div>
              <PostCard
                post={pinned}
                onOpenComments={(handlers) => {
                  setExpanded(false);
                  setCommentsTarget({ postId: pinned.id, ...handlers });
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commentsTarget && (
          <CommentsPage
            postId={commentsTarget.postId}
            onClose={() => setCommentsTarget(null)}
            onCommentAdded={commentsTarget.onCommentAdded}
          />
        )}
      </AnimatePresence>
    </>
  );
}
