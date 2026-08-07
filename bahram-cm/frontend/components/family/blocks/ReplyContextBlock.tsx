'use client';

import { cn } from '@/lib/cn';

export function ReplyContextBlock({
  commentBody,
  userName,
  onNavigate,
}: {
  commentBody: string;
  userName: string | null;
  onNavigate?: () => void;
}) {
  const body = (
    <>
      <span className="family-reply-quote__author">{userName ?? 'یکی از اعضا'}</span>
      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--family-text)] opacity-90">
        {commentBody}
      </p>
    </>
  );

  if (!onNavigate) {
    return <div className="family-reply-quote">{body}</div>;
  }

  return (
    <button
      type="button"
      className={cn('family-reply-quote', 'family-reply-quote--link')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onNavigate();
      }}
      aria-label={`رفتن به نظر ${userName ?? 'عضو'}`}
    >
      {body}
    </button>
  );
}
