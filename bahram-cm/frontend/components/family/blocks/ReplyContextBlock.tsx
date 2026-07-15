export function ReplyContextBlock({ commentBody, userName }: { commentBody: string; userName: string | null }) {
  return (
    <div className="family-reply-quote">
      <span className="family-reply-quote__author">{userName ?? 'یکی از اعضا'}</span>
      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--family-text)] opacity-90">{commentBody}</p>
    </div>
  );
}
