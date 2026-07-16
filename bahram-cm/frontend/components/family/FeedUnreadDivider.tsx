'use client';

/** Telegram-style divider between previously-read and new posts. */
export function FeedUnreadDivider({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div className="family-feed-unread" role="separator" aria-label="پیام‌های جدید">
      <span className="family-feed-unread__line" aria-hidden />
      <span className="family-feed-unread__label">
        {count === 1 ? '۱ پیام جدید' : `${count.toLocaleString('fa-IR')} پیام جدید`}
      </span>
      <span className="family-feed-unread__line" aria-hidden />
    </div>
  );
}
