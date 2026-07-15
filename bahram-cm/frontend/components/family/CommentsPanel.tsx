'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CommentAvatar } from '@/components/family/CommentAvatar';
import { useFamilyComments } from '@/lib/family/hooks/useFamilyComments';
import { FamilyApiError } from '@/lib/family/errors';
import { formatPostDateTime } from '@/lib/family/datetime';
import type { FamilyComment } from '@/lib/family/types';
import { cn } from '@/lib/cn';

type CommentsPanelProps = {
  postId: number;
  onCommentAdded?: (comment: FamilyComment) => void;
  variant?: 'inline' | 'page';
  hideTitle?: boolean;
  className?: string;
};

function CommentRow({
  comment,
  avatarSize,
}: {
  comment: FamilyComment;
  avatarSize: 'sm' | 'md';
}) {
  return (
    <li className="flex items-start gap-3 py-1">
      <CommentAvatar name={comment.user.name} avatar={comment.user.avatar} size={avatarSize} />
      <div className="family-comment-bubble min-w-0 flex-1 overflow-hidden rounded-xl px-3 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-semibold text-[var(--family-accent)]">{comment.user.name}</span>
          {comment.created_at && (
            <time dateTime={comment.created_at} className="text-[11px] tabular-nums text-bone/40">
              {formatPostDateTime(comment.created_at)}
            </time>
          )}
          {comment.is_pending_mine && (
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-bone/50">
              در انتظار بررسی
            </span>
          )}
        </div>
        <p className="family-comment-body mt-1 whitespace-pre-wrap break-words text-[15px] leading-7 text-bone/88">
          {comment.body}
        </p>
      </div>
    </li>
  );
}

export function CommentsPanel({
  postId,
  onCommentAdded,
  variant = 'inline',
  hideTitle = false,
  className,
}: CommentsPanelProps) {
  const { comments, isLoading, submitting, submit, loadMore, loadingMore, hasMore } = useFamilyComments(postId, true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isPage = variant === 'page';
  const avatarSize = isPage ? 'md' : 'sm';

  const orderedComments = useMemo(() => [...comments].reverse(), [comments]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
    const root = listRef.current;
    if (!root) return;
    root.scrollTo({ top: root.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    setValue('');
    setError(null);
    setJustSent(false);
  }, [postId]);

  useLayoutEffect(() => {
    if (isLoading || orderedComments.length === 0) return;
    scrollToLatest('auto');
    const frame = requestAnimationFrame(() => scrollToLatest('auto'));
    return () => cancelAnimationFrame(frame);
  }, [isLoading, orderedComments.length, postId, scrollToLatest]);

  useLayoutEffect(() => {
    if (!justSent) return;
    scrollToLatest('smooth');
  }, [justSent, orderedComments.length, scrollToLatest]);

  const handleSubmit = async () => {
    const body = value.trim();
    if (!body || submitting) return;
    setError(null);
    try {
      const created = await submit(body);
      setValue('');
      setJustSent(true);
      if (created && !created.is_pending_mine) {
        onCommentAdded?.(created);
      }
      setTimeout(() => setJustSent(false), 3000);
    } catch (e) {
      setError(e instanceof FamilyApiError ? e.message : 'ارسال نظر ناموفق بود.');
    }
  };

  return (
    <section className={cn('flex min-h-0 min-w-0 flex-col overflow-x-hidden', variant === 'inline' && 'border-t border-[var(--family-border-subtle)]', className)}>
      {!hideTitle && (
        <div className="shrink-0 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-bone/90">نظرات</h3>
        </div>
      )}

      <div
        ref={listRef}
        className={cn(
          'family-feed-scroll min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain',
          isPage ? 'flex-1 px-3 py-3 sm:px-4 lg:px-5' : 'max-h-[280px] px-3 sm:px-4 lg:max-h-[320px]',
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80" />
            <p className="text-sm text-bone/50">در حال بارگذاری…</p>
          </div>
        ) : orderedComments.length === 0 ? (
          <p className="py-12 text-center text-sm text-bone/50">هنوز نظری ثبت نشده. اولین نفر باش.</p>
        ) : (
          <ul className="space-y-4 pb-2">
            {hasMore && (
              <li className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-full border border-[var(--family-border-subtle)] px-4 py-1.5 text-xs text-bone/65 transition hover:bg-white/[0.04] disabled:opacity-50"
                >
                  {loadingMore ? 'در حال بارگذاری…' : 'نظرات قدیمی‌تر'}
                </button>
              </li>
            )}
            {orderedComments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} avatarSize={avatarSize} />
            ))}
            <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
          </ul>
        )}
      </div>

      <div
        className={cn(
          'shrink-0 border-t border-[var(--family-border-subtle)] bg-[var(--family-surface-panel)]/95 p-3 backdrop-blur-md sm:p-4',
          isPage && 'pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4',
        )}
      >
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        {justSent && !error && <p className="mb-2 text-xs text-gold/80">نظر شما ثبت شد.</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex items-center gap-2"
        >
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={500}
            rows={1}
            placeholder="نظرت رو بنویس…"
            className="family-input family-comment-input min-h-10 flex-1 resize-none rounded-full px-4 py-2 text-sm leading-5"
          />
          <button
            type="submit"
            disabled={!value.trim() || submitting}
            className="family-btn-primary family-comment-submit h-10 shrink-0 rounded-full px-4 text-sm disabled:opacity-50"
          >
            ارسال
          </button>
        </form>
      </div>
    </section>
  );
}
