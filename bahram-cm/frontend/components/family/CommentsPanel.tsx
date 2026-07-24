'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { EmojiRichText } from '@/components/emoji/EmojiRichText';
import { CommentAvatar } from '@/components/family/CommentAvatar';
import { useFamilyComments } from '@/lib/family/hooks/useFamilyComments';
import { FamilyApiError } from '@/lib/family/errors';
import { formatPostDateTime } from '@/lib/family/datetime';
import { familyFeedDebug } from '@/lib/family/feedDebug';
import { useFamilyDebugRender } from '@/lib/family/useFamilyDebugRender';
import type { FamilyComment } from '@/lib/family/types';
import { cn } from '@/lib/cn';

type CommentsPanelProps = {
  postId: number;
  onCommentAdded?: (comment: FamilyComment) => void;
  variant?: 'inline' | 'page';
  hideTitle?: boolean;
  className?: string;
};

const TEXTAREA_MAX_PX = 120;

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
      <div className="family-comment-bubble min-w-0 flex-1 overflow-hidden px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="family-comment-bubble__author">{comment.user.name}</span>
          {comment.is_pending_mine && (
            <span className="rounded-full bg-[color-mix(in_oklab,var(--family-text)_8%,transparent)] px-2 py-0.5 text-[10px] text-[var(--family-tg-subtitle)]">
              در انتظار بررسی
            </span>
          )}
        </div>
        <EmojiRichText
          text={comment.body}
          emojiSize={20}
          emojiMode="loop"
          className="family-comment-body mt-1 text-[15px] leading-[1.35] text-[var(--family-text)]"
        />
        {comment.created_at ? (
          <time dateTime={comment.created_at} className="family-comment-bubble__time">
            {formatPostDateTime(comment.created_at)}
          </time>
        ) : null}
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
  useFamilyDebugRender(`CommentsPanel:${postId}`);
  const { comments, isLoading, error: loadError, submitting, submit, loadMore, loadingMore, hasMore } =
    useFamilyComments(postId, true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const isPage = variant === 'page';
  const avatarSize = isPage ? 'md' : 'sm';

  const orderedComments = useMemo(() => [...comments].reverse(), [comments]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
    const root = listRef.current;
    if (!root) return;
    root.scrollTo({ top: root.scrollHeight, behavior });
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_PX);
    el.style.height = `${Math.max(40, next)}px`;
  }, []);

  useEffect(() => {
    setValue('');
    setError(null);
    setJustSent(false);
  }, [postId]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

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

  /** Keep composer tight above the mobile keyboard (Telegram-like). */
  useEffect(() => {
    if (!isPage || typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 48 ? inset : 0);
      if (inset > 48) {
        requestAnimationFrame(() => scrollToLatest('auto'));
      }
    };

    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [isPage, scrollToLatest]);

  const handleSubmit = async () => {
    const body = value.trim();
    if (!body || submitting) return;
    setError(null);
    familyFeedDebug.mark(`comment:${postId}`);
    familyFeedDebug.info('comment', 'submit start', { postId, len: body.length });
    try {
      const created = await submit(body);
      setValue('');
      setJustSent(true);
      familyFeedDebug.measure(`comment:${postId}`, 'comment', {
        postId,
        id: created?.id,
        pending: Boolean(created?.is_pending_mine),
      });
      if (created && !created.is_pending_mine) {
        onCommentAdded?.(created);
      }
      setTimeout(() => setJustSent(false), 3000);
    } catch (e) {
      const message = e instanceof FamilyApiError ? e.message : 'ارسال نظر ناموفق بود.';
      familyFeedDebug.error('comment', 'submit failed', { postId, error: message });
      setError(message);
    }
  };

  return (
    <section
      className={cn(
        'family-comments-panel flex min-h-0 min-w-0 flex-col overflow-x-hidden',
        variant === 'inline' && 'border-t border-[var(--family-border-subtle)]',
        isPage && keyboardInset > 0 && 'family-comments-panel--keyboard',
        className,
      )}
      style={
        isPage && keyboardInset > 0
          ? ({ ['--family-keyboard-inset' as string]: `${keyboardInset}px` } as CSSProperties)
          : undefined
      }
    >
      {!hideTitle && (
        <div className="shrink-0 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-bone/90">نظرات</h3>
        </div>
      )}

      <div
        ref={listRef}
        className={cn(
          'family-feed-scroll family-comments-list min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain',
          isPage ? 'flex-1 px-3 py-3 sm:px-4 lg:px-5' : 'max-h-[280px] px-3 sm:px-4 lg:max-h-[320px]',
        )}
      >
        {isLoading ? (
          <div className={cn('flex items-center justify-center', isPage ? 'min-h-full' : 'py-16')} aria-busy>
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80"
              aria-label="در حال بارگذاری"
            />
          </div>
        ) : loadError ? (
          <p className="py-12 text-center text-sm text-red-400">{loadError}</p>
        ) : orderedComments.length === 0 ? (
          <p className="py-12 text-center text-sm text-bone/50">هنوز نظری ثبت نشده. اولین نفر باش.</p>
        ) : (
          <ul className="space-y-2 pb-2">
            {hasMore && (
              <li className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  aria-label={loadingMore ? 'در حال بارگذاری' : 'نظرات قدیمی‌تر'}
                  className="flex min-h-8 min-w-[7.5rem] items-center justify-center rounded-full border border-[var(--family-border-subtle)] px-4 py-1.5 text-xs text-bone/65 transition hover:bg-white/[0.04] disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80" />
                  ) : (
                    'نظرات قدیمی‌تر'
                  )}
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
        ref={composerRef}
        className={cn(
          'family-glass-bar family-comment-composer shrink-0 p-3 sm:p-4',
          isPage && 'family-comment-composer--page',
        )}
      >
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        {justSent && !error && <p className="mb-2 text-xs text-gold/80">نظر شما ثبت شد.</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              window.setTimeout(() => scrollToLatest('smooth'), 80);
            }}
            maxLength={500}
            rows={1}
            placeholder="نظرت رو بنویس…"
            className="family-input family-comment-input min-h-10 flex-1 resize-none rounded-[1.25rem] px-4 py-2.5 text-sm leading-5"
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
