'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export type FeedJumpToLatestHandle = {
  setVisible: (show: boolean) => void;
};

/** Telegram-style jump FAB — visibility is local so the feed tree does not re-render. */
export const FeedJumpToLatest = forwardRef<
  FeedJumpToLatestHandle,
  {
    unreadCount: number;
    onClick: () => void;
  }
>(function FeedJumpToLatest({ unreadCount, onClick }, ref) {
  const [visible, setVisible] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      setVisible: (show: boolean) => {
        setVisible((prev) => (prev === show ? prev : show));
      },
    }),
    [],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'family-feed-jump',
        visible && 'family-feed-jump--visible',
        unreadCount > 0 && 'family-feed-jump--badged',
      )}
      aria-label={
        unreadCount > 0
          ? `رفتن به آخرین پست · ${unreadCount.toLocaleString('fa-IR')} پیام جدید`
          : 'رفتن به آخرین پست'
      }
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
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
