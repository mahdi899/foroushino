'use client';

import { ChevronRight, MessageCircle } from 'lucide-react';
import { CommentsPanel } from '@/components/family/CommentsPanel';
import { cn } from '@/lib/cn';
import type { FamilyComment } from '@/lib/family/types';

/** Inline comments panel inside the feed column (desktop + mobile). */
export function FeedCommentsPanel({
  postId,
  onClose,
  onCommentAdded,
  className,
}: {
  postId: number;
  onClose: () => void;
  onCommentAdded?: (comment: FamilyComment) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden', className)}>
      <header className="family-panel-header flex shrink-0 items-center gap-2 px-4 py-2.5 lg:px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="بازگشت به فید"
          className="family-panel-back"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
          <span>فید</span>
        </button>
        <h2 className="family-panel-title">
          <MessageCircle className="h-4 w-4 text-[var(--family-tg-pinned-accent)]" strokeWidth={1.75} />
          نظرات
        </h2>
        <span className="w-[72px]" aria-hidden />
      </header>

      <CommentsPanel
        postId={postId}
        onCommentAdded={onCommentAdded}
        variant="page"
        hideTitle
        className="min-h-0 flex-1"
      />
    </div>
  );
}
