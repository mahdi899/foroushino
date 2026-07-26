'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { CommentsPanel } from '@/components/family/CommentsPanel';
import { cn } from '@/lib/cn';
import { useVisualViewportBox } from '@/lib/hooks/useVisualViewportBox';
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
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const viewport = useVisualViewportBox(mobile);

  return (
    <div
      className={cn(
        'z-50 flex min-h-0 flex-col overflow-hidden bg-[var(--family-bg)]',
        mobile ? 'fixed inset-x-0' : 'absolute inset-0',
        className,
      )}
      style={
        mobile
          ? {
              top: viewport.offsetTop,
              height: viewport.height > 0 ? viewport.height : '100dvh',
            }
          : undefined
      }
    >
      <header className="family-panel-header shrink-0 gap-2">
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
