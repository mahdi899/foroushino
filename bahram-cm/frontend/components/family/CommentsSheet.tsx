'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { CommentsPanel } from '@/components/family/CommentsPanel';
import { FamilyFeedWallpaper } from '@/components/family/FamilyFeedWallpaper';
import type { FamilyComment } from '@/lib/family/types';

export function CommentsPage({
  postId,
  onClose,
  onCommentAdded,
}: {
  postId: number;
  onClose: () => void;
  onCommentAdded?: (comment: FamilyComment) => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <motion.div
        key="comments-page"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        className="family-wallpaper-surface flex h-[100dvh] max-h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden"
      >
        <FamilyFeedWallpaper />
        <header className="family-panel-header flex shrink-0 items-center gap-2 border-b px-3 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="بازگشت"
            title="بازگشت"
            className="family-topbar__back"
          >
            <ChevronRight className="family-topbar__back-icon" aria-hidden />
          </button>
          <h3 className="family-panel-title">نظرات</h3>
          <span className="family-topbar__back invisible" aria-hidden />
        </header>

        <CommentsPanel postId={postId} onCommentAdded={onCommentAdded} variant="page" className="min-h-0 flex-1" />
      </motion.div>
    </div>
  );
}

/** @deprecated Use CommentsPage — kept for test imports */
export const CommentsSheet = CommentsPage;
