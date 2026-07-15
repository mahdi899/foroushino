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
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#0c1117]/80 px-4 py-3 backdrop-blur-md lg:px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="بازگشت به فید"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-bone/65 transition hover:bg-white/[0.05] hover:text-bone"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
          <span className="text-sm font-medium">فید</span>
        </button>
        <h2 className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold text-bone">
          <MessageCircle className="h-4 w-4 text-gold/80" strokeWidth={1.75} />
          نظرات
        </h2>
        <span className="w-[72px]" aria-hidden />
      </header>

      <CommentsPanel
        postId={postId}
        onCommentAdded={onCommentAdded}
        variant="page"
        hideTitle
        className="min-h-0 flex-1 bg-[#0b0f10]"
      />
    </div>
  );
}
