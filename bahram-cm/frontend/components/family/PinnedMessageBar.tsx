'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { Pin, X } from 'lucide-react';
import { PostCard } from '@/components/family/PostCard';
import { getPinnedPosts } from '@/lib/family/api';
import { getPinnedPreview } from '@/lib/family/pinnedPreview';
import type { FamilyComment, FamilyPost } from '@/lib/family/types';

export function PinnedMessageBar({
  pinned: pinnedProp,
  onOpenComments,
}: {
  pinned?: FamilyPost;
  onOpenComments?: (handlers: {
    postId: number;
    onCommentAdded: (comment: FamilyComment) => void;
  }) => void;
}) {
  const { data } = useSWR(
    pinnedProp ? null : 'family-pinned',
    async () => (await getPinnedPosts()).data,
    { revalidateOnFocus: true },
  );

  const [expanded, setExpanded] = useState(false);

  const pinned = pinnedProp ?? data?.[0];
  if (!pinned) return null;

  const { label, thumbnail } = getPinnedPreview(pinned);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="family-pinned-bar flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-right backdrop-blur-md transition sm:px-4 lg:px-5"
        aria-label="مشاهده پیام سنجاق‌شده"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
          <Pin className="h-4 w-4" strokeWidth={2} />
        </span>

        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold tracking-wide text-sky-300/90">پیام سنجاق‌شده</span>
          <span className="mt-0.5 block truncate text-[13px] leading-snug text-bone/70">{label}</span>
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="family-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-end sm:p-0 lg:items-center lg:p-6"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ y: 48, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 32, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="family-modal flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border sm:rounded-t-2xl lg:max-h-[min(85vh,820px)] lg:max-w-[680px] lg:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="family-panel-header flex shrink-0 items-center justify-between border-b px-4 py-3.5 lg:px-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                    <Pin className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-bone">پیام سنجاق‌شده</p>
                    <p className="text-[11px] text-bone/45">مهم‌ترین پیام خانواده</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="بستن"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-bone/55 transition hover:bg-[var(--family-surface-muted)] hover:text-bone"
                >
                  <X className="h-4.5 w-4.5" strokeWidth={1.75} />
                </button>
              </header>

              <div className="family-feed-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
                <PostCard
                  post={pinned}
                  variant="modal"
                  onOpenComments={(handlers) => {
                    setExpanded(false);
                    onOpenComments?.({ postId: pinned.id, ...handlers });
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
