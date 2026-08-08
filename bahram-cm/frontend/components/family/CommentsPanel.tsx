'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { EmojiRichText } from '@/components/emoji/EmojiRichText';
import { CommentAvatar } from '@/components/family/CommentAvatar';
import { useFamilyComments } from '@/lib/family/hooks/useFamilyComments';
import { FamilyApiError } from '@/lib/family/errors';
import { familyHaptic } from '@/lib/family/haptics';
import { formatPostTime } from '@/lib/family/datetime';
import { familyFeedDebug } from '@/lib/family/feedDebug';
import {
  captureFeedScrollRestore,
  restoreFeedScrollPosition,
  restoreFeedScrollPositionUntilSettled,
  type FeedScrollRestoreSnapshot,
} from '@/lib/family/feedScroll';
import { useFamilyDebugRender } from '@/lib/family/useFamilyDebugRender';
import type { FamilyComment } from '@/lib/family/types';
import { encodeReplyBody, parseReplyBody } from '@/lib/family/replyTag';
import { commentNeedsManualReview, COMMENT_REVIEW_NOTICE } from '@/lib/family/commentPhoneGuard';
import { cn } from '@/lib/cn';

const COMMENT_SCROLL_ANCHOR = '[id^="family-comment-"]';

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
  /** Scroll to / highlight this comment (root or nested reply) after load. */
  focusCommentId?: number | null;
  /** Family managers / admins may include phone numbers in comments. */
  allowPhoneNumbers?: boolean;
};

type ReplyTarget = {
  /** Root comment id for nesting (Instagram one-level thread). */
  rootId: number;
  /** Comment being answered (for banner label). */
  commentId: number;
  userName: string;
};

const TEXTAREA_MAX_PX = 120;
/** Default: one preview reply (Bahram floated first via sort). */
const REPLY_PREVIEW_COUNT = 1;
/** Reveal more replies in batches — keeps long threads usable. */
const REPLY_PAGE_SIZE = 5;

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
  highlighted = false,
}: {
  reply: FamilyComment;
  onReply: () => void;
  highlighted?: boolean;
}) {
  return (
    <div
      id={`family-comment-${reply.id}`}
      className={cn(
        'family-comment-reply',
        reply.is_bahram_reply && 'family-comment-reply--bahram',
        highlighted && 'family-comment--highlight',
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
              {formatPostTime(reply.created_at)}
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
  focusCommentId = null,
}: {
  comment: FamilyComment;
  avatarSize: 'sm' | 'md';
  onReply: (target: ReplyTarget) => void;
  focusCommentId?: number | null;
}) {
  const [visibleCount, setVisibleCount] = useState(REPLY_PREVIEW_COUNT);
  const sortedReplies = useMemo(
    () => sortRepliesForDisplay(comment.replies ?? []),
    [comment.replies],
  );
  const totalReplies = sortedReplies.length;
  const hasReplies = totalReplies > 0;
  const focusIsNestedReply =
    focusCommentId != null &&
    focusCommentId !== comment.id &&
    sortedReplies.some((reply) => reply.id === focusCommentId);

  // New thread → reset; if replies grow while already expanded, keep progress.
  useEffect(() => {
    setVisibleCount(REPLY_PREVIEW_COUNT);
  }, [comment.id]);

  useEffect(() => {
    setVisibleCount((prev) => {
      if (focusIsNestedReply) return totalReplies;
      if (totalReplies <= REPLY_PREVIEW_COUNT) return Math.max(totalReplies, REPLY_PREVIEW_COUNT);
      return Math.min(Math.max(prev, REPLY_PREVIEW_COUNT), totalReplies);
    });
  }, [focusIsNestedReply, totalReplies]);

  const shownCount = Math.min(visibleCount, totalReplies);
  const visibleReplies = sortedReplies.slice(0, shownCount);
  const remaining = Math.max(0, totalReplies - shownCount);
  const nextBatch = Math.min(REPLY_PAGE_SIZE, remaining);
  const isExpanded = shownCount > REPLY_PREVIEW_COUNT;

  const startReply = (target: FamilyComment, rootId: number) => {
    onReply({
      rootId,
      commentId: target.id,
      userName: target.user.name,
    });
  };

  return (
    <li id={`family-comment-${comment.id}`} className="py-1">
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
            focusCommentId === comment.id && 'family-comment--highlight',
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
                {formatPostTime(comment.created_at)}
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
                  highlighted={focusCommentId === reply.id}
                  onReply={() => startReply(reply, comment.id)}
                />
              ))}
              {remaining > 0 ? (
                <button
                  type="button"
                  className="family-comment-view-more"
                  onClick={() =>
                    setVisibleCount((n) => Math.min(n + REPLY_PAGE_SIZE, totalReplies))
                  }
                >
                  <span className="family-comment-view-more__line" aria-hidden />
                  <span>
                    مشاهده {nextBatch.toLocaleString('fa-IR')} پاسخ دیگر
                    {totalReplies > REPLY_PREVIEW_COUNT + REPLY_PAGE_SIZE ? (
                      <span className="family-comment-view-more__meta">
                        {' '}
                        · {(shownCount).toLocaleString('fa-IR')} از {totalReplies.toLocaleString('fa-IR')}
                      </span>
                    ) : null}
                  </span>
                </button>
              ) : null}
              {isExpanded && remaining === 0 && totalReplies > REPLY_PREVIEW_COUNT ? (
                <button
                  type="button"
                  className="family-comment-view-more"
                  onClick={() => setVisibleCount(REPLY_PREVIEW_COUNT)}
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
  focusCommentId = null,
  allowPhoneNumbers = false,
}: CommentsPanelProps) {
  useFamilyDebugRender(`CommentsPanel:${postId}`);
  const keyboardOpen = keyboardInset > 40;
  const { comments, isLoading, error: loadError, submitting, submit, loadMore, loadingMore, hasMore } =
    useFamilyComments(postId, true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const [justSentWasReply, setJustSentWasReply] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLLIElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const composerFocusedRef = useRef(false);
  /** Only auto-pin to the latest comment once per post open — not after loading older pages. */
  const initialPinnedForPostRef = useRef<number | null>(null);
  /**
   * Snapshot before older comments prepend — held through measure settle so
   * mt-auto / avatar layout can't yank the viewport to the tip or oldest tip.
   */
  const pendingScrollRestoreRef = useRef<FeedScrollRestoreSnapshot | null>(null);
  const historySettleActiveRef = useRef(false);
  const historySettleGenRef = useRef(0);
  const focusHandledRef = useRef<number | null>(null);
  const focusLoadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const orderedLengthRef = useRef(0);
  const isPage = variant === 'page';
  const avatarSize = isPage ? 'md' : 'sm';

  const orderedComments = useMemo(() => [...comments].reverse(), [comments]);
  orderedLengthRef.current = orderedComments.length;

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

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

  const captureListScrollRestore = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    pendingScrollRestoreRef.current = captureFeedScrollRestore(list, null, {
      anchorSelector: COMMENT_SCROLL_ANCHOR,
    });
  }, []);

  const handleLoadOlder = useCallback(async () => {
    const lengthBefore = orderedLengthRef.current;
    captureListScrollRestore();
    try {
      await loadMore();
    } catch {
      pendingScrollRestoreRef.current = null;
      return;
    }
    // If nothing was prepended (no cursor / empty page), drop the snapshot so a
    // later length change (e.g. sending a comment) doesn't apply a stale restore.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          pendingScrollRestoreRef.current &&
          !historySettleActiveRef.current &&
          orderedLengthRef.current === lengthBefore
        ) {
          pendingScrollRestoreRef.current = null;
        }
      });
    });
  }, [captureListScrollRestore, loadMore]);

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
    setReviewNotice(null);
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
    setReviewNotice(null);
    setJustSent(false);
    setJustSentWasReply(false);
    setReplyTarget(null);
    initialPinnedForPostRef.current = null;
    pendingScrollRestoreRef.current = null;
    historySettleActiveRef.current = false;
    historySettleGenRef.current += 1;
    focusHandledRef.current = null;
    focusLoadingRef.current = false;
  }, [postId, focusCommentId]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  useLayoutEffect(() => {
    if (isLoading || orderedComments.length === 0) return;

    const list = listRef.current;
    const snapshot = pendingScrollRestoreRef.current;
    if (snapshot && list) {
      // Older comments prepend above the fold — keep the same messages under the viewport.
      // Re-pin across a few frames: flex mt-auto + avatars change height after first paint.
      restoreFeedScrollPosition(snapshot, { root: list, lenis: null });

      const gen = ++historySettleGenRef.current;
      historySettleActiveRef.current = true;
      void restoreFeedScrollPositionUntilSettled(snapshot, {
        getScrollCtx: () => ({ root: listRef.current, lenis: null }),
        maxPasses: 6,
        isCancelled: () => gen !== historySettleGenRef.current,
      }).finally(() => {
        if (gen !== historySettleGenRef.current) return;
        historySettleActiveRef.current = false;
        pendingScrollRestoreRef.current = null;
      });
      return () => {
        historySettleGenRef.current += 1;
      };
    }

    // When focusing a specific comment, don't yank to the tip.
    if (focusCommentId) {
      initialPinnedForPostRef.current = postId;
      return;
    }

    // Initial open only — loading older must not yank to the tip.
    if (initialPinnedForPostRef.current === postId) return;
    initialPinnedForPostRef.current = postId;
    scrollToLatest('auto');
    const frame = requestAnimationFrame(() => scrollToLatest('auto'));
    return () => cancelAnimationFrame(frame);
  }, [focusCommentId, isLoading, orderedComments.length, postId, scrollToLatest]);

  useEffect(() => {
    if (!focusCommentId || focusCommentId <= 0 || isLoading) return;
    if (focusHandledRef.current === focusCommentId) return;

    const foundInComments = comments.some(
      (comment) =>
        comment.id === focusCommentId ||
        (comment.replies ?? []).some((reply) => reply.id === focusCommentId),
    );

    if (!foundInComments) {
      if (!hasMore || loadingMore || focusLoadingRef.current) return;
      focusLoadingRef.current = true;
      // Same prepend path as infinite scroll — preserve viewport while paging history.
      void handleLoadOlder().finally(() => {
        focusLoadingRef.current = false;
      });
      return;
    }

    focusHandledRef.current = focusCommentId;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const list = listRef.current;
        const el = document.getElementById(`family-comment-${focusCommentId}`);
        if (!list || !el || !list.contains(el)) return;
        const listRect = list.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const nextTop = list.scrollTop + (elRect.top - listRect.top) - Math.max(24, list.clientHeight * 0.2);
        list.scrollTop = Math.max(0, nextTop);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [comments, focusCommentId, handleLoadOlder, hasMore, isLoading, loadingMore]);

  // Auto-load older comments when scrolling up (Telegram-style — no button tap).
  useEffect(() => {
    const root = listRef.current;
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loadingMoreRef.current || focusLoadingRef.current) return;
        if (historySettleActiveRef.current || pendingScrollRestoreRef.current) return;

        const list = listRef.current;
        if (!list) return;

        const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 12;
        const contentOverflows = list.scrollHeight > list.clientHeight + 8;
        // Pinned on latest in a long thread — wait until the user scrolls up.
        if (contentOverflows && atBottom && !focusCommentId) return;
        // Let initial pin / focus scroll settle before fetching history.
        if (initialPinnedForPostRef.current !== postId && !focusCommentId) return;

        void handleLoadOlder();
      },
      { root, rootMargin: '96px 0px 0px 0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [focusCommentId, handleLoadOlder, hasMore, isLoading, orderedComments.length, postId]);

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
      if (loadingMoreRef.current || pendingScrollRestoreRef.current || historySettleActiveRef.current) {
        return;
      }
      const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      // Only stick while the user is already reading the tip (composer focused).
      if (distanceFromBottom > 80) return;
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
    setReviewNotice(null);
    familyFeedDebug.mark(`comment:${postId}`);
    familyFeedDebug.info('comment', 'submit start', {
      postId,
      len: body.length,
      parentId: replyTarget?.rootId ?? null,
      needsReview: !allowPhoneNumbers && commentNeedsManualReview(body),
    });
    try {
      const wasReply = Boolean(replyTarget);
      const created = await submit(body, replyTarget?.rootId ?? null);
      setValue('');
      setReplyTarget(null);
      setJustSentWasReply(wasReply);
      setJustSent(true);
      familyHaptic('success');
      if (!allowPhoneNumbers && (created?.is_pending_mine || commentNeedsManualReview(body))) {
        setReviewNotice(COMMENT_REVIEW_NOTICE);
      }
      familyFeedDebug.measure(`comment:${postId}`, 'comment', {
        postId,
        id: created?.id,
        pending: Boolean(created?.is_pending_mine),
        reply: Boolean(created?.parent_id),
      });
      if (created && !created.is_pending_mine && !created.parent_id) {
        onCommentAdded?.(created);
      }
      setTimeout(() => {
        setJustSent(false);
        setReviewNotice(null);
      }, 4500);
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
      {reviewNotice && !error && (
        <p className="mb-2 text-xs text-amber-300/90">{reviewNotice}</p>
      )}
      {justSent && !error && !reviewNotice && (
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
            {hasMore ? (
              <li
                ref={topSentinelRef}
                className="flex min-h-8 justify-center py-2"
                aria-hidden={!loadingMore}
              >
                {loadingMore ? (
                  <span
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80"
                    aria-label="در حال بارگذاری نظرات قدیمی‌تر"
                  />
                ) : null}
              </li>
            ) : null}
            {orderedComments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                avatarSize={avatarSize}
                onReply={beginReply}
                focusCommentId={focusCommentId}
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
