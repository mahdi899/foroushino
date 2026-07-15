'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { CommentsPanel } from '@/components/family/CommentsPanel';
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
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden bg-[var(--family-surface-panel)]"
      >
        <header className="family-panel-header flex shrink-0 items-center gap-2 border-b px-3 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="بازگشت"
            className="flex items-center gap-1 rounded-full px-1 py-1 text-bone/70 transition hover:bg-[var(--family-surface-muted)] hover:text-bone"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium">بازگشت</span>
          </button>
          <h3 className="flex-1 text-center text-sm font-semibold text-bone">نظرات</h3>
          <span className="w-[72px]" aria-hidden />
        </header>

        <CommentsPanel postId={postId} onCommentAdded={onCommentAdded} variant="page" className="min-h-0 flex-1" />
      </motion.div>
    </div>
  );
}

/** @deprecated Use CommentsPage — kept for test imports */
export const CommentsSheet = CommentsPage;
