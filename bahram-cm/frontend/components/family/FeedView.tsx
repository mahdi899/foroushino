'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FeedDateSeparator } from '@/components/family/FeedDateSeparator';
import { FeedJumpToLatest, type FeedJumpToLatestHandle } from '@/components/family/FeedJumpToLatest';
import { FeedPreviewGate, FeedPreviewIntro } from '@/components/family/FeedPreviewIntro';
import { FeedUnreadDivider } from '@/components/family/FeedUnreadDivider';
import { useFamilyGuestLogin } from '@/components/family/FamilyGuestAuth';
import { FamilyBrandingSidebar } from '@/components/family/FamilyBrandingSidebar';
import { FamilyNotificationsPanel } from '@/components/family/FamilyNotificationsPanel';
import { FeedCommentsPanel } from '@/components/family/FeedCommentsPanel';
import { FamilyFeedChrome } from '@/components/family/FamilyFeedChrome';
import { FamilyFeedScroll, type FamilyFeedScrollHandle } from '@/components/family/FamilyFeedScroll';
import { FamilyFeedBootSkeleton } from '@/components/family/FamilyShellLoading';
import { PostCard } from '@/components/family/PostCard';
import { cn } from '@/lib/cn';
import { FamilyFeedMediaProvider } from '@/lib/family/FamilyFeedMediaContext';
import {
  captureFeedScrollRestore,
  getFeedDistanceFromBottom,
  getLenisDistanceFromBottom,
  pinFeedElementBottomUntilSettled,
  restoreFeedScrollPosition,
  scrollFeedToElement,
  scrollFeedToLatest,
  type FeedScrollRestoreSnapshot,
} from '@/lib/family/feedScroll';
import {
  countUnreadPosts,
  countUnreadStillBelow,
  firstUnreadPostId,
  chronologicalLatestPostId,
  consumeEnterUnreadAfter,
  getLastReadPostId,
  hasUnreadSince,
  resolveUnreadCursor,
  isFeedTipInView,
  setLastReadPostId,
} from '@/lib/family/feedReadCursor';
import { getFeedUnreadSummary } from '@/lib/family/api';
import {
  familyFeedDebug,
  installFamilyFeedDebugGlobals,
} from '@/lib/family/feedDebug';
import { useFamilyFeed } from '@/lib/family/hooks/useFamilyFeed';
import { useFamilyRealtime } from '@/lib/family/hooks/useFamilyRealtime';
import { formatFeedDaySeparator, getPostDayKey } from '@/lib/family/datetime';
import type { FamilyComment, FamilyFeedResponse, FamilyPost } from '@/lib/family/types';

type FeedItem =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'unread'; key: string; count: number }
  | { kind: 'post'; key: string; post: FamilyPost };

type CommentsTarget = {
  postId: number;
  onCommentAdded: (comment: FamilyComment) => void;
};

const SCROLL_IDLE_MS = 650;

function buildFeedItems(
  posts: FamilyPost[],
  unreadAfterId: number | null,
  dividerCount: number,
): FeedItem[] {
  const items: FeedItem[] = [];
  let lastDayKey: string | null = null;
  let unreadInserted = false;
  const unreadCount =
    unreadAfterId != null
      ? dividerCount > 0
        ? dividerCount
        : countUnreadPosts(posts, unreadAfterId)
      : 0;

  for (const post of posts) {
    if (
      !unreadInserted &&
      unreadAfterId != null &&
      unreadCount > 0 &&
      firstUnreadPostId(posts, unreadAfterId) === post.id
    ) {
      items.push({
        kind: 'unread',
        key: `unread-${unreadAfterId}`,
        count: unreadCount,
      });
      unreadInserted = true;
    }

    const dayKey = getPostDayKey(post.published_at);
    if (dayKey && dayKey !== lastDayKey && post.published_at) {
      items.push({
        kind: 'separator',
        key: `day-${dayKey}`,
        label: formatFeedDaySeparator(post.published_at),
      });
      lastDayKey = dayKey;
    }

    items.push({ kind: 'post', key: `post-${post.id}`, post });
  }

  return items;
}

export function FeedView({
  memberCount,
  previewMode = null,
  showPinned = false,
  initialFeed = null,
  viewerKey = 'anon',
  commentsTarget,
  onOpenComments,
  onCloseComments,
  onRegisterScrollToPost,
  notificationsOpen = false,
  onOpenNotifications,
  onCloseNotifications,
}: {
  memberCount?: number;
  previewMode?: 'guest' | 'join' | null;
  showPinned?: boolean;
  initialFeed?: FamilyFeedResponse | null;
  /** Isolates SWR feed cache per viewer so login switches cannot leak `responded`. */
  viewerKey?: string | number;
  commentsTarget?: CommentsTarget | null;
  onOpenComments?: (target: CommentsTarget) => void;
  onCloseComments?: () => void;
  onRegisterScrollToPost?: (scrollToPost: ((postId: number) => Promise<void>) | null) => void;
  notificationsOpen?: boolean;
  onOpenNotifications?: () => void;
  onCloseNotifications?: () => void;
}) {
  const isPreview = Boolean(previewMode);
  const effectivePreviewMode = previewMode ?? 'guest';
  const feedScope: 'guest' | 'member' = isPreview ? 'guest' : 'member';
  const initialPage = initialFeed ? { data: initialFeed.data, meta: initialFeed.meta } : null;
  const { openLogin } = useFamilyGuestLogin();

  const { posts, meta, isLoading, hasMore, loadMore, isValidating, mutate } = useFamilyFeed(
    feedScope,
    initialPage,
    viewerKey,
  );
  const resolvedMemberCount = meta?.member_count ?? memberCount;
  const isStaff = meta?.is_staff ?? false;

  const scrollToPreviewCta = useCallback(() => {
    if (effectivePreviewMode === 'guest') {
      openLogin();
      return;
    }
    document.getElementById('family-join-cta')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [effectivePreviewMode, openLogin]);
  const feedScrollRef = useRef<FamilyFeedScrollHandle | null>(null);

  const getScrollCtx = useCallback(() => {
    const handle = feedScrollRef.current;
    return {
      root: handle?.getScrollElement() ?? null,
      lenis: handle?.getLenis() ?? null,
    };
  }, []);
  const feedContentRef = useRef<HTMLDivElement | null>(null);
  const chromeStackRef = useRef<HTMLDivElement | null>(null);
  const chromeInsetRef = useRef(0);
  const [chromeInset, setChromeInset] = useState(0);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const jumpFabRef = useRef<FeedJumpToLatestHandle | null>(null);
  const jumpVisibleRef = useRef(false);
  const feedReadyRef = useRef(false);
  const commentsOpenRef = useRef(false);
  const notificationsOpenRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const anchoredToBottomRef = useRef(false);
  const historyReadyRef = useRef(false);
  const loadingHistoryRef = useRef(false);
  const pinNavigateRef = useRef(false);
  const scrollRestoreRef = useRef<FeedScrollRestoreSnapshot | null>(null);
  /** Keep re-pinning the same post briefly after history prepend (images/layout settle). */
  const historyPinRef = useRef<FeedScrollRestoreSnapshot | null>(null);
  const historyPinClearTimerRef = useRef<number | null>(null);
  const restoringFromCommentsRef = useRef(false);
  const pendingInitialUnreadScrollRef = useRef<number | null>(null);
  const unreadSplitRef = useRef<number | null>(null);
  /** Blocks tip-stick / scroll-to-latest while unread landing is in progress. */
  const unreadBootLockRef = useRef(false);
  /** Last unreadSplitId we already finished landing for — prevents re-pin loops. */
  const unreadLandCompletedForRef = useRef<number | null>(null);
  /** Bumps to cancel in-flight scrollToLatestReliable rAF/timeouts. */
  const scrollLatestGenRef = useRef(0);
  const scrollStickRafRef = useRef<number | null>(null);
  const scrollAnchorRafRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const maxPostIdRef = useRef(0);
  /** False until initial scroll target is applied — hides feed to prevent top→bottom jump. */
  const [feedReady, setFeedReady] = useState(false);
  const [bootTick, setBootTick] = useState(0);
  const [scrollIdle, setScrollIdle] = useState(true);
  const [unreadSplitId, setUnreadSplitId] = useState<number | null>(null);
  /** Frozen label for the in-feed unread divider (does not shrink on scroll). */
  const [unreadDividerCount, setUnreadDividerCount] = useState(0);
  const unreadBadgeRef = useRef(0);
  const scrollIdleRef = useRef(true);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const feedItems = useMemo(
    () => buildFeedItems(posts, isPreview ? null : unreadSplitId, unreadDividerCount),
    [posts, isPreview, unreadSplitId, unreadDividerCount],
  );
  const hasMoreRef = useRef(hasMore);
  const postsRef = useRef(posts);

  useEffect(() => {
    installFamilyFeedDebugGlobals();
  }, []);

  const pushUnreadBadge = useCallback((count: number) => {
    const next = Math.max(0, Math.floor(count));
    if (unreadBadgeRef.current === next) return;
    unreadBadgeRef.current = next;
    jumpFabRef.current?.setUnreadCount(next);
    familyFeedDebug.info('fab', 'unread badge', { count: next });
    // Keep FAB visible while unread remains below; parent still hides at tip.
    if (next > 0) {
      jumpVisibleRef.current = true;
      jumpFabRef.current?.setVisible(true);
    }
  }, []);

  useFamilyRealtime({
    onFeedUpdated: (payload) => {
      void mutate();
      if (isPreview) return;
      if (anchoredToBottomRef.current) return;

      const lastRead = getLastReadPostId(viewerKey);
      const fromLoaded = countUnreadPosts(postsRef.current, lastRead);
      const nextBadge = Math.max(
        fromLoaded,
        postsRef.current.some((p) => p.id === payload.post_id) ? fromLoaded : fromLoaded + 1,
        1,
      );
      pushUnreadBadge(Math.max(unreadBadgeRef.current, nextBadge));
      if (unreadSplitRef.current == null && lastRead > 0) {
        unreadSplitRef.current = lastRead;
        setUnreadSplitId(lastRead);
        setUnreadDividerCount((prev) => Math.max(prev, nextBadge));
      }
    },
  });
  const isValidatingRef = useRef(isValidating);

  useEffect(() => {
    hasMoreRef.current = hasMore;
    postsRef.current = posts;
    isValidatingRef.current = isValidating;
  }, [hasMore, posts, isValidating]);

  useEffect(() => {
    feedReadyRef.current = feedReady;
    commentsOpenRef.current = Boolean(commentsTarget);
    notificationsOpenRef.current = notificationsOpen;
  }, [feedReady, commentsTarget, notificationsOpen]);

  const setJumpFabVisible = useCallback((show: boolean) => {
    if (jumpVisibleRef.current === show) {
      jumpFabRef.current?.setVisible(show);
      return;
    }
    jumpVisibleRef.current = show;
    jumpFabRef.current?.setVisible(show);
    familyFeedDebug.info('fab', show ? 'show jump' : 'hide jump', {
      unreadBadge: unreadBadgeRef.current,
      unreadSplit: unreadSplitRef.current,
      anchored: anchoredToBottomRef.current,
    });
  }, []);

  const jumpFabCallbackRef = useCallback((handle: FeedJumpToLatestHandle | null) => {
    jumpFabRef.current = handle;
    if (!handle) return;
    // Re-apply after mount — boot may have pushed before the FAB existed.
    handle.setUnreadCount(unreadBadgeRef.current);
    handle.setVisible(jumpVisibleRef.current || unreadBadgeRef.current > 0);
  }, []);

  const syncJumpFabFromScroll = useCallback(() => {
    const { root, lenis } = getScrollCtx();
    if (!root) {
      setJumpFabVisible(false);
      return;
    }
    const distanceFromBottom = lenis
      ? getLenisDistanceFromBottom(lenis)
      : getFeedDistanceFromBottom(root);
    const canShow =
      feedReadyRef.current &&
      !commentsOpenRef.current &&
      !notificationsOpenRef.current &&
      distanceFromBottom > 120;
    setJumpFabVisible(canShow);
  }, [getScrollCtx, setJumpFabVisible]);

  const openComments = useCallback(
    (target: CommentsTarget) => {
      anchoredToBottomRef.current = false;
      onOpenComments?.(target);
    },
    [onOpenComments],
  );

  const closeComments = useCallback(() => {
    anchoredToBottomRef.current = false;
    restoringFromCommentsRef.current = true;
    onCloseComments?.();
    window.requestAnimationFrame(() => {
      restoringFromCommentsRef.current = false;
    });
  }, [onCloseComments]);

  const stickToBottomIfAnchored = useCallback(() => {
    const { root, lenis } = getScrollCtx();
    if (!root || pinNavigateRef.current || restoringFromCommentsRef.current) return;
    // Never jump to tip while older pages are being prepended / unread boot.
    if (loadingHistoryRef.current || scrollRestoreRef.current || unreadBootLockRef.current) return;

    // After prepend, keep the captured post glued while media/layout settle.
    if (historyPinRef.current) {
      restoreFeedScrollPosition(historyPinRef.current, { root, lenis });
      return;
    }

    // Active unread session: only the jump FAB / user scroll may reach the tip.
    if (unreadSplitRef.current != null && !anchoredToBottomRef.current) return;

    // Do NOT scroll-to-latest while historyReady is false — that raced unread landing on every resize/re-render.
    if (!historyReadyRef.current) return;
    if (!anchoredToBottomRef.current) return;
    familyFeedDebug.warn('stick', 'scroll to latest (anchored)');
    scrollFeedToLatest('auto', { root, lenis });
  }, [getScrollCtx]);

  const markCaughtUpToLatest = useCallback(() => {
    if (isPreview || postsRef.current.length === 0) return;
    if (unreadBootLockRef.current) {
      familyFeedDebug.warn('catchup', 'blocked by boot lock');
      return;
    }
    const latestId = chronologicalLatestPostId(postsRef.current);
    if (latestId <= 0) return;

    const already = getLastReadPostId(viewerKey);
    const split = unreadSplitRef.current;
    // Idempotent — stop scroll-handler spam once caught up.
    if (already >= latestId && (split == null || split >= latestId)) {
      return;
    }

    familyFeedDebug.info('catchup', 'mark caught up', {
      latestId,
      prevSplit: split,
      already,
      stack: new Error().stack?.split('\n').slice(1, 5).map((s) => s.trim()),
    });
    setLastReadPostId(viewerKey, latestId);
    pushUnreadBadge(0);
    // Must clear to null — leaving latestId broke FAB jump (treated as active unread split).
    if (split != null) {
      unreadSplitRef.current = null;
      unreadLandCompletedForRef.current = null;
      setUnreadSplitId(null);
      setUnreadDividerCount(0);
    }
  }, [isPreview, pushUnreadBadge, viewerKey]);

  const revealFeed = useCallback(() => {
    if (revealTimerRef.current != null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFeedReady(true));
    });
  }, []);

  const scheduleRevealFeed = useCallback(
    (delayMs = 0) => {
      if (revealTimerRef.current != null) return;
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null;
        revealFeed();
      }, delayMs);
    },
    [revealFeed],
  );
  const scrollToLatestReliable = useCallback(
    (behavior: 'auto' | 'smooth' = 'auto') => {
      const gen = ++scrollLatestGenRef.current;
      familyFeedDebug.warn('scroll', 'scrollToLatestReliable start', {
        behavior,
        gen,
        unreadBootLock: unreadBootLockRef.current,
        unreadSplit: unreadSplitRef.current,
        anchored: anchoredToBottomRef.current,
      });
      const run = () => {
        if (gen !== scrollLatestGenRef.current) return;
        if (unreadBootLockRef.current) {
          familyFeedDebug.info('scroll', 'latest cancelled (boot lock)', { gen });
          return;
        }
        // Don't yank to tip while an unread divider session still has unread posts.
        const split = unreadSplitRef.current;
        if (
          split != null &&
          !anchoredToBottomRef.current &&
          countUnreadPosts(postsRef.current, split) > 0
        ) {
          familyFeedDebug.info('scroll', 'latest cancelled (unread split)', { gen, split });
          return;
        }
        const { root, lenis } = getScrollCtx();
        scrollFeedToLatest(behavior, { root, lenis });
        anchoredToBottomRef.current = true;
      };
      run();
      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(run);
      });
      window.setTimeout(run, 120);
      window.setTimeout(run, 360);
    },
    [getScrollCtx],
  );

  const scheduleStickToBottom = useCallback(() => {
    if (scrollStickRafRef.current != null) return;
    scrollStickRafRef.current = requestAnimationFrame(() => {
      scrollStickRafRef.current = null;
      stickToBottomIfAnchored();
    });
  }, [stickToBottomIfAnchored]);

  const updateAnchoredToBottom = useCallback(() => {
    const { root, lenis } = getScrollCtx();
    if (!root) return;
    if (unreadBootLockRef.current) return;
    // Do NOT call lenis.resize() here — it runs on every scroll frame and tanks FPS.
    const distanceFromBottom = lenis
      ? getLenisDistanceFromBottom(lenis)
      : getFeedDistanceFromBottom(root);

    const split = unreadSplitRef.current;
    const lastRead = split ?? getLastReadPostId(viewerKey);
    const chronoUnread =
      !isPreview && lastRead > 0 ? countUnreadPosts(postsRef.current, lastRead) : 0;
    const unreadSession = split != null && chronoUnread > 0;

    // Stricter tip threshold during unread — Lenis settle can sit ~40–79px above tip.
    const nearScrollEnd = distanceFromBottom < (unreadSession ? 24 : 80);

    let tipInView = false;
    if (nearScrollEnd) {
      tipInView = isFeedTipInView(root, chronologicalLatestPostId(postsRef.current));
    }

    // If last-seen is still on screen, we are in the unread landing zone — never auto-catchup
    // (short posts can fit tip + last-read in one viewport and falsely look "at tip").
    let lastReadInView = false;
    if (unreadSession && lastRead > 0) {
      const el = document.getElementById(`family-post-${lastRead}`);
      if (el) {
        const rootRect = root.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        lastReadInView =
          elRect.bottom > rootRect.top + 8 && elRect.top < rootRect.bottom - 8;
      }
    }

    // Always measure what's still below — never fall back to full chrono when tip peeks in
    // (that flashed badge 1→10 and forced a false catch-up).
    const remainingUnread =
      !isPreview && lastRead > 0 && chronoUnread > 0
        ? countUnreadStillBelow(postsRef.current, lastRead, root)
        : 0;

    const atBottom =
      nearScrollEnd &&
      tipInView &&
      remainingUnread === 0 &&
      !(unreadSession && lastReadInView);
    anchoredToBottomRef.current = atBottom;

    const badgeCount = remainingUnread;

    const canShowJump =
      feedReadyRef.current &&
      !commentsOpenRef.current &&
      !notificationsOpenRef.current &&
      !atBottom &&
      (badgeCount > 0 || distanceFromBottom > 120 || unreadSession);
    setJumpFabVisible(canShowJump);

    if (atBottom && !isPreview && postsRef.current.length > 0) {
      if (unreadSession || badgeCount > 0) {
        familyFeedDebug.info('anchor', 'at tip → catch up', {
          distanceFromBottom: Math.round(distanceFromBottom),
          tipInView,
          lastReadInView,
          unreadSession,
          remainingUnread,
          chronoUnread,
        });
      }
      markCaughtUpToLatest();
      setJumpFabVisible(false);
      return;
    }

    if (!isPreview) {
      pushUnreadBadge(badgeCount);
    }
  }, [getScrollCtx, isPreview, markCaughtUpToLatest, pushUnreadBadge, setJumpFabVisible, viewerKey]);

  const markScrolling = useCallback(() => {
    if (!scrollIdleRef.current) {
      if (scrollIdleTimerRef.current != null) window.clearTimeout(scrollIdleTimerRef.current);
    } else {
      scrollIdleRef.current = false;
      setScrollIdle(false);
    }

    scrollIdleTimerRef.current = window.setTimeout(() => {
      scrollIdleRef.current = true;
      setScrollIdle(true);
      scrollIdleTimerRef.current = null;
    }, SCROLL_IDLE_MS);
  }, []);

  const handleFeedScroll = useCallback(() => {
    // User is scrolling — stop fighting them with history pin restores.
    if (historyPinRef.current) {
      historyPinRef.current = null;
      if (historyPinClearTimerRef.current != null) {
        window.clearTimeout(historyPinClearTimerRef.current);
        historyPinClearTimerRef.current = null;
      }
    }
    markScrolling();
    if (pinNavigateRef.current) return;
    if (scrollAnchorRafRef.current != null) return;
    scrollAnchorRafRef.current = requestAnimationFrame(() => {
      scrollAnchorRafRef.current = null;
      updateAnchoredToBottom();
    });
  }, [markScrolling, updateAnchoredToBottom]);

  useEffect(() => {
    if (commentsTarget || notificationsOpen || restoringFromCommentsRef.current) {
      setJumpFabVisible(false);
      return;
    }
    // Don't re-measure anchor while history prepend is in flight (would false-trigger tip stick).
    if (loadingHistoryRef.current || scrollRestoreRef.current) return;
    updateAnchoredToBottom();
  }, [posts.length, commentsTarget, notificationsOpen, setJumpFabVisible, updateAnchoredToBottom]);

  useEffect(() => {
    if (!feedReady || commentsTarget || notificationsOpen) {
      setJumpFabVisible(false);
      return;
    }
    syncJumpFabFromScroll();
  }, [feedReady, commentsTarget, notificationsOpen, setJumpFabVisible, syncJumpFabFromScroll]);

  const scrollToPost = useCallback(
    async (
      postId: number,
      options?: { behavior?: 'auto' | 'smooth'; highlight?: boolean; align?: 'start' | 'end' },
    ) => {
      const behavior = options?.behavior ?? 'smooth';
      const shouldHighlight = options?.highlight ?? behavior === 'smooth';
      const align = options?.align ?? 'start';

      const highlight = (el: HTMLElement) => {
        el.classList.add('family-post--highlight');
        window.setTimeout(() => el.classList.remove('family-post--highlight'), 2200);
      };

      const tryScroll = (): boolean => {
        const { root, lenis } = getScrollCtx();
        const el = document.getElementById(`family-post-${postId}`);
        if (!root || !el) return false;

        scrollFeedToElement(el, behavior, { root, lenis, align, padding: align === 'end' ? 16 : 20 });
        anchoredToBottomRef.current = false;
        if (shouldHighlight) highlight(el);
        return true;
      };

      if (tryScroll()) return;

      pinNavigateRef.current = true;
      let attempts = 0;

      while (attempts < 12) {
        if (postsRef.current.some((post) => post.id === postId)) {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          if (tryScroll()) {
            pinNavigateRef.current = false;
            return;
          }
        }

        if (isValidatingRef.current) {
          await new Promise<void>((resolve) => {
            const wait = () => {
              if (!isValidatingRef.current) resolve();
              else window.setTimeout(wait, 50);
            };
            wait();
          });
        }

        if (!hasMoreRef.current) break;

        loadingHistoryRef.current = true;
        scrollRestoreRef.current = null;
        loadMore();
        attempts += 1;

        await new Promise<void>((resolve) => {
          const wait = () => {
            if (!isValidatingRef.current) resolve();
            else window.setTimeout(wait, 50);
          };
          wait();
        });
      }

      pinNavigateRef.current = false;
      tryScroll();
    },
    [getScrollCtx, loadMore],
  );

  useEffect(() => {
    onRegisterScrollToPost?.(scrollToPost);
    return () => onRegisterScrollToPost?.(null);
  }, [onRegisterScrollToPost, scrollToPost]);

  useEffect(() => {
    // Don't clear while scroll restore still owns the history-load cycle.
    if (!isValidating && !scrollRestoreRef.current) {
      loadingHistoryRef.current = false;
    }
  }, [isValidating]);

  useLayoutEffect(() => {
    const snapshot = scrollRestoreRef.current;
    if (!snapshot) return;

    const apply = () => {
      const ctx = getScrollCtx();
      if (!ctx.root) return;
      restoreFeedScrollPosition(snapshot, { root: ctx.root, lenis: ctx.lenis });
    };

    apply();
    // One follow-up frame for Lenis/layout; avoid resize thrash loops.
    requestAnimationFrame(() => {
      apply();
      scrollRestoreRef.current = null;
      loadingHistoryRef.current = false;
      historyPinRef.current = snapshot;
      if (historyPinClearTimerRef.current != null) {
        window.clearTimeout(historyPinClearTimerRef.current);
      }
      // Short pin window — long enough for image decode, short enough not to fight scroll.
      historyPinClearTimerRef.current = window.setTimeout(() => {
        historyPinRef.current = null;
        historyPinClearTimerRef.current = null;
      }, 180);
    });
  }, [getScrollCtx, posts.length]);

  // Keep catching up to bottom after media/layout settles (caught-up sessions only).
  // Do NOT depend on unreadSplitId — clearing the split must not re-trigger tip scroll.
  useEffect(() => {
    if (!feedReady || isPreview || !initialScrollDoneRef.current) return;
    if (unreadSplitRef.current != null || unreadBootLockRef.current) return;
    if (!anchoredToBottomRef.current) return;
    if (loadingHistoryRef.current || scrollRestoreRef.current || historyPinRef.current) return;
    const t1 = window.setTimeout(() => {
      if (unreadBootLockRef.current || unreadSplitRef.current != null) return;
      if (loadingHistoryRef.current || scrollRestoreRef.current || historyPinRef.current) return;
      if (anchoredToBottomRef.current) scrollToLatestReliable('auto');
    }, 200);
    const t2 = window.setTimeout(() => {
      if (unreadBootLockRef.current || unreadSplitRef.current != null) return;
      if (loadingHistoryRef.current || scrollRestoreRef.current || historyPinRef.current) return;
      if (anchoredToBottomRef.current) markCaughtUpToLatest();
    }, 500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [feedReady, isPreview, markCaughtUpToLatest, posts.length, scrollToLatestReliable]);
  useLayoutEffect(() => {
    if (isLoading) return;

    if (posts.length === 0) {
      if (!feedReady) setFeedReady(true);
      return;
    }

    const { root } = getScrollCtx();
    if (!root) {
      // Lenis/native scroll root may mount one frame later than posts.
      const id = window.requestAnimationFrame(() => setBootTick((n) => n + 1));
      return () => window.cancelAnimationFrame(id);
    }

    if (!initialScrollDoneRef.current) {
      // Wait for first-page revalidation so we never lock "caught up" on a stale tip.
      if (isValidating) return;

      const lastRead = isPreview ? 0 : resolveUnreadCursor(viewerKey, posts);
      const latestId = chronologicalLatestPostId(posts);
      maxPostIdRef.current = Math.max(
        maxPostIdRef.current,
        posts.reduce((max, post) => Math.max(max, post.id), 0),
      );

      // Only unread-land when the loaded tip is actually newer than the cursor.
      // Nav handoff alone must NOT force tip landing (that looked like "jumped to latest").
      const hasLocalUnread = lastRead > 0 && hasUnreadSince(posts, lastRead);
      consumeEnterUnreadAfter();

      familyFeedDebug.info('boot', 'initial scroll decision', {
        lastRead,
        latestId,
        hasLocalUnread,
        posts: posts.length,
        tipIds: posts.slice(-5).map((p) => p.id),
        viewerKey: String(viewerKey),
      });

      if (!isPreview && hasLocalUnread) {
        // Cancel any stray tip-scroll timers from a previous mount/race.
        scrollLatestGenRef.current += 1;
        unreadBootLockRef.current = true;
        unreadLandCompletedForRef.current = null;
        initialScrollDoneRef.current = true;
        try {
          localStorage.setItem(`family-feed-last-read-id:${String(viewerKey)}`, String(lastRead));
          localStorage.setItem('family-feed-last-read-id', String(lastRead));
        } catch {
          /* ignore */
        }
        unreadSplitRef.current = lastRead;
        pendingInitialUnreadScrollRef.current = lastRead;
        setUnreadSplitId(lastRead);
        const localCount = countUnreadPosts(posts, lastRead);
        familyFeedDebug.info('boot', 'unread landing path', {
          lastRead,
          localCount,
          firstUnread: firstUnreadPostId(posts, lastRead),
        });
        setUnreadDividerCount(Math.max(localCount, 1));
        pushUnreadBadge(Math.max(localCount, 1));
        void getFeedUnreadSummary(lastRead)
          .then((res) => {
            const apiCount = res.data.unread_count;
            familyFeedDebug.info('boot', 'api unread summary', {
              afterId: lastRead,
              apiCount,
              latest: res.data.latest_post_id,
            });
            if (apiCount > 0) {
              setUnreadDividerCount(apiCount);
              pushUnreadBadge(apiCount);
            }
          })
          .catch((err) => {
            familyFeedDebug.warn('boot', 'api unread summary failed', {
              error: String(err),
            });
          });
        anchoredToBottomRef.current = false;
        historyReadyRef.current = true;
        return;
      }

      familyFeedDebug.info('boot', 'caught-up path → tip', { latestId });
      initialScrollDoneRef.current = true;

      if (!isPreview) {
        setLastReadPostId(viewerKey, latestId);
      }

      historyReadyRef.current = true;
      anchoredToBottomRef.current = true;
      unreadBootLockRef.current = false;
      scrollToLatestReliable('auto');
      scheduleRevealFeed(160);
      return;
    }

    if (!historyReadyRef.current) {
      historyReadyRef.current = true;
    }
  }, [
    bootTick,
    feedReady,
    getScrollCtx,
    isLoading,
    isPreview,
    isValidating,
    posts,
    pushUnreadBadge,
    scheduleRevealFeed,
    scrollToLatestReliable,
    viewerKey,
  ]);

  // Persist catch-up when leaving the page while at the bottom.
  useEffect(() => {
    if (isPreview) return;
    const persistIfCaughtUp = () => {
      if (!anchoredToBottomRef.current) return;
      markCaughtUpToLatest();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistIfCaughtUp();
    };
    window.addEventListener('pagehide', persistIfCaughtUp);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', persistIfCaughtUp);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isPreview, markCaughtUpToLatest]);

  useLayoutEffect(() => {
    if (unreadSplitId == null) return;
    // Already landed for this split — never re-pin (was yanking user back to last-read).
    if (unreadLandCompletedForRef.current === unreadSplitId) return;

    const targetId = pendingInitialUnreadScrollRef.current ?? unreadSplitId;
    pendingInitialUnreadScrollRef.current = null;
    unreadBootLockRef.current = true;
    anchoredToBottomRef.current = false;

    let cancelled = false;
    const landGen = ++scrollLatestGenRef.current;
    const splitAtStart = unreadSplitId;

    const landOnLastSeen = async () => {
      familyFeedDebug.info('land', 'start', { targetId, landGen });
      await scrollToPost(targetId, { behavior: 'auto', highlight: false, align: 'end' });
      if (cancelled) {
        familyFeedDebug.warn('land', 'cancelled after scrollToPost', { targetId, landGen });
        return;
      }

      const measure = (label: string) => {
        const { root, lenis } = getScrollCtx();
        const el = document.getElementById(`family-post-${targetId}`);
        if (!root || !el) {
          familyFeedDebug.warn('land', `${label}: missing el/root`, { targetId });
          return null;
        }
        const rootRect = root.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const drift = elRect.bottom - (rootRect.bottom - 16);
        familyFeedDebug.info('land', label, {
          targetId,
          drift: Math.round(drift * 10) / 10,
          elBottom: Math.round(elRect.bottom),
          rootBottom: Math.round(rootRect.bottom),
          scroll: lenis ? Math.round(lenis.scroll) : Math.round(root.scrollTop),
          limit: lenis ? Math.round(lenis.limit) : null,
        });
        return { root, lenis, el, drift };
      };

      const settle = async () => {
        const before = measure('before pin');
        if (!before) return;
        await pinFeedElementBottomUntilSettled(before.el, {
          root: before.root,
          lenis: before.lenis,
          inset: 16,
          maxPasses: 8,
        });
        measure('after pin');
      };

      anchoredToBottomRef.current = false;
      await settle();
      if (cancelled) return;
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await settle();
      if (cancelled) return;

      const { root } = getScrollCtx();
      if (root && unreadSplitRef.current != null) {
        const lastRead = unreadSplitRef.current;
        const below = countUnreadStillBelow(postsRef.current, lastRead, root);
        const chrono = countUnreadPosts(postsRef.current, lastRead);
        familyFeedDebug.info('land', 'badge after land', {
          below,
          chrono,
          tipInView: isFeedTipInView(root, chronologicalLatestPostId(postsRef.current)),
          lastRead,
        });
        pushUnreadBadge(below > 0 ? below : Math.max(chrono, 1));
      }
      setJumpFabVisible(true);
      scheduleRevealFeed(40);
      unreadLandCompletedForRef.current = splitAtStart;
      unreadBootLockRef.current = false;
      familyFeedDebug.info('land', 'boot lock released', { landGen, completedFor: splitAtStart });
    };

    void landOnLastSeen();
    return () => {
      cancelled = true;
    };
    // Intentionally only unreadSplitId — other values read from refs to avoid re-land loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadSplitId]);

  // Safety: reveal feed if boot stalls — never force scroll-to-latest (that kills unread landing).
  useEffect(() => {
    if (feedReady || isLoading) return;
    if (posts.length === 0) return;
    const t = window.setTimeout(() => {
      if (unreadSplitRef.current != null || pendingInitialUnreadScrollRef.current != null || unreadBootLockRef.current) {
        setJumpFabVisible(true);
        scheduleRevealFeed(0);
        return;
      }
      if (!initialScrollDoneRef.current) {
        initialScrollDoneRef.current = true;
        historyReadyRef.current = true;
        anchoredToBottomRef.current = true;
        scrollToLatestReliable('auto');
      }
      setFeedReady(true);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [
    feedReady,
    isLoading,
    posts.length,
    scheduleRevealFeed,
    scrollToLatestReliable,
    setJumpFabVisible,
  ]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current != null) {
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    maxPostIdRef.current = posts.reduce(
      (max, post) => Math.max(max, post.id),
      maxPostIdRef.current,
    );
  }, [posts]);

  // Keep jump FAB badge aligned after feed mutates (realtime) — count what's still below.
  useEffect(() => {
    if (isPreview || !initialScrollDoneRef.current) return;
    if (unreadBootLockRef.current) return;
    if (anchoredToBottomRef.current) return;
    const { root } = getScrollCtx();
    const lastRead = unreadSplitRef.current ?? resolveUnreadCursor(viewerKey, posts);
    if (lastRead <= 0) return;
    const chrono = countUnreadPosts(posts, lastRead);
    if (chrono <= 0) return;
    if (root) {
      const below = countUnreadStillBelow(posts, lastRead, root);
      // Keep at least chrono while unread session is open — don't collapse to 0 if tip also fits.
      pushUnreadBadge(below > 0 ? below : chrono);
    } else {
      pushUnreadBadge(chrono);
    }
    if (unreadSplitRef.current == null) {
      unreadSplitRef.current = lastRead;
      setUnreadSplitId(lastRead);
      setUnreadDividerCount((prev) => Math.max(prev, chrono));
    }
  }, [getScrollCtx, isPreview, posts, pushUnreadBadge, viewerKey]);

  // Keep sticky bottom only while the user is already near the end.
  // Never force-jump when they are reading older posts / interacting mid-feed.
  useEffect(() => {
    const content = feedContentRef.current;
    if (!content || posts.length === 0) return;

    const observer = new ResizeObserver(() => {
      scheduleStickToBottom();
    });

    observer.observe(content);
    return () => {
      observer.disconnect();
      if (scrollStickRafRef.current != null) {
        cancelAnimationFrame(scrollStickRafRef.current);
        scrollStickRafRef.current = null;
      }
    };
  }, [posts.length, scheduleStickToBottom]);

  // Load older posts when the top sentinel enters view (works mid-feed / unread landing).
  useEffect(() => {
    const { root } = getScrollCtx();
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel || !hasMore || commentsTarget || notificationsOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!historyReadyRef.current || pinNavigateRef.current) return;
        if (!entries[0]?.isIntersecting || isValidatingRef.current || loadingHistoryRef.current) {
          return;
        }
        if (!hasMoreRef.current) return;

        const ctx = getScrollCtx();
        const scrollRoot = ctx.root;
        if (!scrollRoot) return;

        loadingHistoryRef.current = true;
        // Pin the first visible post — height/scrollTop math is unreliable with Lenis.
        scrollRestoreRef.current = captureFeedScrollRestore(scrollRoot, ctx.lenis);
        loadMore();
      },
      { root, rootMargin: '240px 0px 0px 0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [commentsTarget, getScrollCtx, hasMore, loadMore, notificationsOpen, posts.length]);

  useEffect(() => {
    return () => {
      if (scrollIdleTimerRef.current != null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }
      if (historyPinClearTimerRef.current != null) {
        window.clearTimeout(historyPinClearTimerRef.current);
      }
    };
  }, []);

  const showFeed = !commentsTarget && !notificationsOpen;

  useLayoutEffect(() => {
    if (!showFeed) {
      chromeInsetRef.current = 0;
      setChromeInset(0);
      return;
    }

    const stack = chromeStackRef.current;
    if (!stack) {
      chromeInsetRef.current = 0;
      setChromeInset(0);
      return;
    }

    // Only the pinned bar reserves scroll padding. Now-playing overlays the feed
    // so opening/closing it never shifts the page.
    const measurePin = () => {
      const pin = stack.querySelector('.family-feed-chrome-stack__pin') as HTMLElement | null;
      return pin?.offsetHeight ?? 0;
    };

    const update = () => {
      const next = measurePin();
      if (next === chromeInsetRef.current) return;
      chromeInsetRef.current = next;
      setChromeInset(next);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(stack);
    const pin = stack.querySelector('.family-feed-chrome-stack__pin');
    if (pin) observer.observe(pin);
    return () => observer.disconnect();
  }, [showFeed, showPinned]);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <FamilyBrandingSidebar
        memberCount={resolvedMemberCount}
        isMember={!isPreview}
        notificationsActive={notificationsOpen}
        onOpenNotifications={onOpenNotifications}
        onCloseNotifications={onCloseNotifications}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="family-feed-pane relative flex min-h-0 min-w-0 flex-1 flex-col">
          {!isPreview && notificationsOpen ? (
            <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-[var(--family-bg)]">
              <FamilyNotificationsPanel
                enabled={!isPreview}
                onClose={() => onCloseNotifications?.()}
                className="flex min-h-0 flex-1 flex-col"
              />
            </div>
          ) : null}

          {commentsTarget ? (
            <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-[var(--family-bg)]">
              <FeedCommentsPanel
                postId={commentsTarget.postId}
                onClose={closeComments}
                onCommentAdded={commentsTarget.onCommentAdded}
                className="flex min-h-0 flex-1 flex-col"
              />
            </div>
          ) : null}

          <div
            className={
              commentsTarget || notificationsOpen
                ? 'pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col'
                : 'flex min-h-0 min-w-0 flex-1 flex-col'
            }
            aria-hidden={Boolean(commentsTarget) || notificationsOpen}
          >
          <div ref={chromeStackRef} className="family-feed-chrome-stack">
            <div className="family-feed-chrome-stack__pin">
              <FamilyFeedChrome
                parts="pinned"
                showPinned={showPinned}
                showNowPlaying={false}
                onScrollToPost={(postId) => {
                  void scrollToPost(postId);
                }}
              />
            </div>
            <FamilyFeedChrome parts="now" showPinned={false} showNowPlaying />
          </div>

          <FamilyFeedMediaProvider scrollIdle={scrollIdle}>
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              {!feedReady ? (
                <FamilyFeedBootSkeleton className="absolute inset-0 z-20 overflow-hidden bg-[var(--family-chat-bg)]" />
              ) : null}
              <FamilyFeedScroll
                ref={feedScrollRef}
                onScroll={handleFeedScroll}
                className={cn(!feedReady && 'invisible')}
                style={chromeInset > 0 ? { paddingTop: chromeInset } : undefined}
              >
              <div ref={feedContentRef} className="family-feed-content mx-auto flex w-full max-w-[680px] flex-col">
              {isPreview && effectivePreviewMode && posts.length > 0 && (
                <div className="pt-4 sm:pt-5">
                  <FeedPreviewIntro mode={effectivePreviewMode} />
                </div>
              )}
              {posts.length === 0 && isLoading && !initialPage ? (
                <div className="min-h-[40vh] lg:min-h-[50vh]" aria-hidden />
              ) : posts.length === 0 ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:min-h-[50vh]">
                  <p className="family-feed-empty max-w-sm text-sm lg:text-[15px]">
                    هنوز پستی منتشر نشده. به‌زودی داداش بهرام اولین پیام رو می‌فرسته.
                  </p>
                </div>
              ) : (
                <div className="family-feed-list">
                  {!isPreview && hasMore && (
                    <div
                      ref={topSentinelRef}
                      className="flex items-center justify-center py-3"
                      aria-busy={isValidating && posts.length > 0}
                    >
                      {isValidating && posts.length > 0 ? (
                        <span
                          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bone/20 border-t-gold/80"
                          aria-label="در حال بارگذاری"
                        />
                      ) : null}
                    </div>
                  )}
                  {feedItems.map((item) => {
                    const animateEnter =
                      feedReady &&
                      item.kind === 'post' &&
                      item.post.id > maxPostIdRef.current;

                    if (item.kind === 'separator') {
                      return <FeedDateSeparator key={item.key} label={item.label} />;
                    }

                    if (item.kind === 'unread') {
                      return <FeedUnreadDivider key={item.key} count={item.count} />;
                    }

                    return (
                      <PostCard
                        key={item.key}
                        anchorId={`family-post-${item.post.id}`}
                        post={item.post}
                        memberCount={resolvedMemberCount}
                        isStaff={isStaff}
                        previewMode={isPreview ? effectivePreviewMode : null}
                        viewerKey={viewerKey}
                        onPreviewInteract={scrollToPreviewCta}
                        animateEnter={animateEnter}
                        onOpenComments={
                          isPreview
                            ? undefined
                            : (handlers) => openComments({ postId: item.post.id, ...handlers })
                        }
                      />
                    );
                  })}
                  {isPreview && effectivePreviewMode && (
                    <FeedPreviewGate mode={effectivePreviewMode} />
                  )}
                  <div ref={bottomAnchorRef} aria-hidden className="h-px shrink-0" />
                </div>
              )}
            </div>
          </FamilyFeedScroll>
            </div>
          </FamilyFeedMediaProvider>

          {!isPreview && (
            <FeedJumpToLatest
              ref={jumpFabCallbackRef}
              onClick={() => {
                unreadBootLockRef.current = false;
                anchoredToBottomRef.current = true;
                // Clear unread session first so scrollToLatestReliable is not cancelled.
                unreadSplitRef.current = null;
                setUnreadSplitId(null);
                setUnreadDividerCount(0);
                markCaughtUpToLatest();
                setJumpFabVisible(false);
                scrollToLatestReliable('smooth');
              }}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
