'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { EmojiRichText } from '@/components/emoji/EmojiRichText';
import { CommentAvatar } from '@/components/family/CommentAvatar';
import { useFamilyComments } from '@/lib/family/hooks/useFamilyComments';
import { FamilyApiError } from '@/lib/family/errors';
import { familyHaptic } from '@/lib/family/haptics';
import { formatPostDateTime } from '@/lib/family/datetime';
import { familyFeedDebug } from '@/lib/family/feedDebug';
import { useFamilyDebugRender } from '@/lib/family/useFamilyDebugRender';
import type { FamilyComment } from '@/lib/family/types';
import { encodeReplyBody, parseReplyBody } from '@/lib/family/replyTag';
import { cn } from '@/lib/cn';

type CommentsPanelProps = {
  postId: number;
  onCommentAdded?: (comment: FamilyComment) => void;
  variant?: 'inline' | 'page';
  hideTitle?: boolean;
  className?: string;
  /** Mobile keyboard inset (px) from the panel's visualViewport tracking — used to
   * drop the safe-area padding under the composer while the keyboard is open, so
   * the input sits flush above it instead of leaving a gap (Telegram-like). */
  keyboardInset?: number;
};

type ReplyTarget = {
  /** Root comment id for nesting (Instagram one-level thread). */
  rootId: number;
  /** Comment being answered (for banner label). */
  commentId: number;
  userName: string;
};

const TEXTAREA_MAX_PX = 120;
/** Instagram-style: collapsed thread shows one preview reply. */
const COLLAPSED_REPLY_PREVIEW = 1;

function CommentRichText({
  text,
  className,
  emojiSize,
}: {
  text: string;
  className?: string;
  emojiSize?: number;
}) {
  const { tag, body } = useMemo(() => parseReplyBody(text), [text]);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {tag ? <span className="family-comment-name-chip">{tag}</span> : null}
      {body ? <EmojiRichText text={body} emojiSize={emojiSize} emojiMode="static" /> : null}
    </span>
  );
}

function sortRepliesForDisplay(replies: FamilyComment[]): FamilyComment[] {
  // Bahram/manager replies float to the top; then chronological.
  return [...replies].sort((a, b) => {
    const bahramDiff = Number(Boolean(b.is_bahram_reply)) - Number(Boolean(a.is_bahram_reply));
    if (bahramDiff !== 0) return bahramDiff;
    return a.id - b.id;
  });
}

function CommentReplyRow({
  reply,
  onReply,
}: {
  reply: FamilyComment;
  onReply: () => void;
}) {
  return (
    <div
      className={cn(
        'family-comment-reply',
        reply.is_bahram_reply && 'family-comment-reply--bahram',
      )}
    >
      <CommentAvatar
        name={reply.user.name}
        avatar={reply.user.avatar}
        avatarVersion={reply.user.avatar_version}
        size="xs"
      />
      <div className="family-comment-reply__content min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="family-comment-reply__author">{reply.user.name}</span>
          {reply.is_bahram_reply ? (
            <span className="family-comment-reply__badge">بهرام</span>
          ) : null}
          {reply.is_pending_mine ? (
            <span className="rounded-full bg-[color-mix(in_oklab,var(--family-text)_8%,transparent)] px-1.5 py-0.5 text-[9px] text-[var(--family-tg-subtitle)]">
              در انتظار بررسی
            </span>
          ) : null}
        </div>
        <CommentRichText
          text={reply.body}
          emojiSize={17}
          className="family-comment-reply__body"
        />
        <div className="family-comment-reply__meta">
          {reply.created_at ? (
            <time dateTime={reply.created_at} className="family-comment-reply__time">
              {formatPostDateTime(reply.created_at)}
            </time>
          ) : (
            <span />
          )}
          {!reply.is_mine ? (
            <button type="button" className="family-comment-reply-btn" onClick={onReply}>
              پاسخ
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  avatarSize,
  onReply,
}: {
  comment: FamilyComment;
  avatarSize: 'sm' | 'md';
  onReply: (target: ReplyTarget) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sortedReplies = useMemo(
    () => sortRepliesForDisplay(comment.replies ?? []),
    [comment.replies],
  );
  const hasReplies = sortedReplies.length > 0;
  const hiddenCount = Math.max(0, sortedReplies.length - COLLAPSED_REPLY_PREVIEW);
  const visibleReplies = expanded || hiddenCount === 0
    ? sortedReplies
    : sortedReplies.slice(0, COLLAPSED_REPLY_PREVIEW);

  const startReply = (target: FamilyComment, rootId: number) => {
    onReply({
      rootId,
      commentId: target.id,
      userName: target.user.name,
    });
  };

  return (
    <li className="py-1">
      <div className="flex items-start gap-3">
        <CommentAvatar
          name={comment.user.name}
          avatar={comment.user.avatar}
          avatarVersion={comment.user.avatar_version}
          size={avatarSize}
        />
        <div
          className={cn(
            'family-comment-bubble min-w-0 flex-1 overflow-hidden px-3 py-2',
            comment.is_important && 'family-comment-bubble--important',
            hasReplies && 'family-comment-bubble--threaded',
          )}
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="family-comment-bubble__author">{comment.user.name}</span>
            {comment.is_important && (
              <span className="family-comment-bubble__important-badge">مهم</span>
            )}
            {comment.is_pending_mine && (
              <span className="rounded-full bg-[color-mix(in_oklab,var(--family-text)_8%,transparent)] px-2 py-0.5 text-[10px] text-[var(--family-tg-subtitle)]">
                در انتظار بررسی
              </span>
            )}
          </div>
          <CommentRichText
            text={comment.body}
            emojiSize={20}
            className="family-comment-body mt-1 text-[15px] leading-[1.35] text-[var(--family-text)]"
          />
          <div className="family-comment-actions">
            {comment.created_at ? (
              <time dateTime={comment.created_at} className="family-comment-bubble__time family-comment-bubble__time--inline">
                {formatPostDateTime(comment.created_at)}
              </time>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="family-comment-reply-btn"
              onClick={() => startReply(comment, comment.id)}
            >
              پاسخ
            </button>
          </div>
          {hasReplies ? (
            <div className="family-comment-replies">
              {visibleReplies.map((reply) => (
                <CommentReplyRow
                  key={reply.id}
                  reply={reply}
                  onReply={() => startReply(reply, comment.id)}
                />
              ))}
              {hiddenCount > 0 && !expanded ? (
                <button
                  type="button"
                  className="family-comment-view-more"
                  onClick={() => setExpanded(true)}
                >
                  مشاهده {hiddenCount.toLocaleString('fa-IR')} پاسخ دیگر
                </button>
              ) : null}
              {expanded && hiddenCount > 0 ? (
                <button
                  type="button"
                  className="family-comment-view-more"
                  onClick={() => setExpanded(false)}
                >
                  پنهان کردن پاسخ‌ها
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
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
  keyboardInset = 0,
}: CommentsPanelProps) {
  useFamilyDebugRender(`CommentsPanel:${postId}`);
  const keyboardOpen = keyboardInset > 40;
  const { comments, isLoading, error: loadError, submitting, submit, loadMore, loadingMore, hasMore } =
    useFamilyComments(postId, true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const [justSentWasReply, setJustSentWasReply] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const composerFocusedRef = useRef(false);
  const isPage = variant === 'page';
  const avatarSize = isPage ? 'md' : 'sm';

  const orderedComments = useMemo(() => [...comments].reverse(), [comments]);

  const pinLatestComment = useCallback((behavior: ScrollBehavior = 'auto') => {
    const list = listRef.current;
    if (!list) return;
    // Never use scrollIntoView here — on mobile it can pan ancestors / the
    // visual viewport behind the comments overlay when the keyboard opens.
    // Scroll only the comments list itself.
    const top = list.scrollHeight;
    if (behavior === 'smooth' && typeof list.scrollTo === 'function') {
      list.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    list.scrollTop = top;
  }, []);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      pinLatestComment(behavior);
    },
    [pinLatestComment],
  );

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_PX);
    el.style.height = `${Math.max(40, next)}px`;
  }, []);

  const beginReply = useCallback((target: ReplyTarget) => {
    setReplyTarget(target);
    // Keep only the user's typed text — name is shown as a chip, not @ in the input.
    setValue((prev) => parseReplyBody(prev).body);
    setError(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  const clearReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  useEffect(() => {
    setValue('');
    setError(null);
    setJustSent(false);
    setJustSentWasReply(false);
    setReplyTarget(null);
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

  // Keep the last comment glued to the composer while the keyboard opens/closes.
  // Driven by the list's own ResizeObserver instead of guessed timers — it moves
  // in the exact same frames as the real layout change, so there's no visible
  // "catch-up" jump after the keyboard is already open.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (!composerFocusedRef.current) return;
      pinLatestComment('auto');
    });
    ro.observe(list);
    return () => ro.disconnect();
  }, [pinLatestComment]);

  const handleSubmit = async () => {
    const typed = value.trim();
    if (!typed || submitting) return;
    const body = encodeReplyBody(replyTarget?.userName, typed);
    setError(null);
    familyFeedDebug.mark(`comment:${postId}`);
    familyFeedDebug.info('comment', 'submit start', {
      postId,
      len: body.length,
      parentId: replyTarget?.rootId ?? null,
    });
    try {
      const wasReply = Boolean(replyTarget);
      const created = await submit(body, replyTarget?.rootId ?? null);
      setValue('');
      setReplyTarget(null);
      setJustSentWasReply(wasReply);
      setJustSent(true);
      familyHaptic('success');
      familyFeedDebug.measure(`comment:${postId}`, 'comment', {
        postId,
        id: created?.id,
        pending: Boolean(created?.is_pending_mine),
        reply: Boolean(created?.parent_id),
      });
      if (created && !created.is_pending_mine && !created.parent_id) {
        onCommentAdded?.(created);
      }
      setTimeout(() => setJustSent(false), 3000);
    } catch (e) {
      const message = e instanceof FamilyApiError ? e.message : 'ارسال نظر ناموفق بود.';
      familyFeedDebug.error('comment', 'submit failed', { postId, error: message });
      familyHaptic('warning');
      setError(message);
    }
  };

  const composerBody = (
    <>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      {justSent && !error && (
        <p className="mb-2 text-xs text-gold/80">
          {justSentWasReply ? 'پاسخ شما ثبت شد.' : 'نظر شما ثبت شد.'}
        </p>
      )}
      {replyTarget ? (
        <div className="family-comment-reply-target mb-2" role="status">
          <div className="family-comment-reply-target__quote min-w-0 flex-1">
            <span className="family-comment-reply-target__label">پاسخ به</span>
            <span className="family-comment-name-chip">{replyTarget.userName}</span>
          </div>
          <button
            type="button"
            onClick={clearReply}
            className="family-comment-reply-target__close"
            aria-label="لغو پاسخ"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ) : null}
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
            composerFocusedRef.current = true;
            pinLatestComment('auto');
          }}
          onBlur={() => {
            composerFocusedRef.current = false;
          }}
          maxLength={500}
          rows={1}
          placeholder={
            replyTarget ? `پاسخ به ${replyTarget.userName}…` : 'نظرت رو بنویس…'
          }
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
    </>
  );

  const composerNode = (
    <div
      ref={composerRef}
      className={cn(
        'family-glass-bar family-comment-composer shrink-0 p-3 sm:p-4',
        isPage && 'family-comment-composer--page',
        isPage && keyboardOpen && 'family-comment-composer--keyboard',
      )}
      dir="rtl"
    >
      {composerBody}
    </div>
  );

  return (
    <section
      className={cn(
        'family-comments-panel flex min-h-0 min-w-0 flex-col overflow-x-hidden',
        variant === 'inline' && 'border-t border-[var(--family-border-subtle)]',
        isPage && keyboardOpen && 'family-comments-panel--keyboard',
        className,
      )}
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
          isPage ? 'flex flex-1 flex-col px-3 py-3 sm:px-4 lg:px-5' : 'max-h-[280px] px-3 sm:px-4 lg:max-h-[320px]',
          isPage && keyboardOpen && 'family-comments-list--keyboard',
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
          <p className={cn('py-12 text-center text-sm text-bone/50', isPage && 'mt-auto')}>
            هنوز نظری ثبت نشده. اولین نفر باش.
          </p>
        ) : (
          <ul className={cn('family-comments-thread space-y-2 pb-2', isPage && 'mt-auto')}>
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
              <CommentRow
                key={comment.id}
                comment={comment}
                avatarSize={avatarSize}
                onReply={beginReply}
              />
            ))}
            <div
              ref={bottomRef}
              aria-hidden
              className="h-px shrink-0 scroll-mt-2"
              style={{ scrollMarginBottom: keyboardOpen ? 0 : '0.5rem' }}
            />
          </ul>
        )}
      </div>

      {composerNode}
    </section>
  );
}
