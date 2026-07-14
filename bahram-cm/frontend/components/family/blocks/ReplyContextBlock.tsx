export function ReplyContextBlock({ commentBody, userName }: { commentBody: string; userName: string | null }) {
  return (
    <div className="rounded-xl border-r-2 border-gold/60 bg-white/5 px-3 py-2 text-sm text-bone/70">
      <span className="text-gold/80">{userName ?? 'یکی از اعضا'}</span>
      <p className="mt-0.5 line-clamp-2 text-bone/60">{commentBody}</p>
    </div>
  );
}
