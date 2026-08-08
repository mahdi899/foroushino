'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { CommentsPanel } from '@/components/family/CommentsPanel';
import { cn } from '@/lib/cn';
import { useBackgroundScrollLock } from '@/lib/hooks/useBackgroundScrollLock';
import { useVisualViewportBox } from '@/lib/hooks/useVisualViewportBox';
import type { FamilyComment } from '@/lib/family/types';

/** Inline comments panel inside the feed column (desktop + mobile). */
export function FeedCommentsPanel({
  postId,
  onClose,
  onCommentAdded,
  focusCommentId = null,
  allowPhoneNumbers = false,
  commentsEnabled = true,
  className,
}: {
  postId: number;
  onClose: () => void;
  onCommentAdded?: (comment: FamilyComment) => void;
  focusCommentId?: number | null;
  allowPhoneNumbers?: boolean;
  commentsEnabled?: boolean;
  className?: string;
}) {
  const [mobile, setMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Resize only — avoid visualViewport `scroll` thrashing while the keyboard
  // animates open/closed (that re-layout fought the feed behind the panel).
  const viewport = useVisualViewportBox(mobile, { watchScroll: false });
  useBackgroundScrollLock(mobile, { allowTouchInsideRef: panelRef });

  return (
    <div
      ref={panelRef}
      className={cn(
        'family-feed-overlay z-50 flex min-h-0 flex-col overflow-hidden',
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
      <div className="family-feed-overlay__content">
        <header className="family-panel-header shrink-0 gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="بازگشت به فید"
            title="بازگشت"
            className="family-topbar__back"
          >
            <ChevronRight className="family-topbar__back-icon" aria-hidden />
          </button>
          <h2 className="family-panel-title">
            <MessageCircle className="h-4 w-4 text-[var(--family-tg-pinned-accent)]" strokeWidth={1.75} />
            نظرات
          </h2>
          <span className="family-topbar__back invisible" aria-hidden />
        </header>

        <CommentsPanel
          postId={postId}
          onCommentAdded={onCommentAdded}
          focusCommentId={focusCommentId}
          allowPhoneNumbers={allowPhoneNumbers}
          commentsEnabled={commentsEnabled}
          variant="page"
          hideTitle
          className="min-h-0 flex-1"
          keyboardInset={mobile ? viewport.keyboardInset : 0}
        />
      </div>
    </div>
  );
}
