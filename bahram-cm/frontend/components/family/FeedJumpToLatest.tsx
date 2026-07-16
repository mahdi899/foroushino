'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { familyFeedDebug } from '@/lib/family/feedDebug';

export type FeedJumpToLatestHandle = {
  setVisible: (show: boolean) => void;
  setUnreadCount: (count: number) => void;
};

/** Telegram-style jump FAB — local state so the feed tree does not re-render on scroll. */
export const FeedJumpToLatest = forwardRef<
  FeedJumpToLatestHandle,
  {
    onClick: () => void;
  }
>(function FeedJumpToLatest({ onClick }, ref) {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      setVisible: (show: boolean) => {
        setVisible((prev) => (prev === show ? prev : show));
      },
      setUnreadCount: (count: number) => {
        const next = Math.max(0, count);
        setUnreadCount((prev) => (prev === next ? prev : next));
      },
    }),
    [],
  );

  const show = visible;

  return (
    <button
      type="button"
      onClick={(event) => {
        familyFeedDebug.info('fab', 'click jump', { unreadCount, visible: show });
        onClick();
        // Drop keyboard/mouse focus so global emerald focus-visible ring never sticks.
        event.currentTarget.blur();
      }}
      className={cn(
        'family-feed-jump',
        show && 'family-feed-jump--visible',
        unreadCount > 0 && 'family-feed-jump--badged',
      )}
      aria-label={
        unreadCount > 0
          ? `رفتن به آخرین پست · ${unreadCount.toLocaleString('fa-IR')} پیام جدید`
          : 'رفتن به آخرین پست'
      }
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
    >
      {unreadCount > 0 && (
        <span className="family-feed-jump__badge">
          {unreadCount > 999 ? '999+' : unreadCount.toLocaleString('fa-IR')}
        </span>
      )}
      <ChevronDown className="family-feed-jump__icon" aria-hidden strokeWidth={2.25} />
    </button>
  );
});
