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
  peekEnterUnreadAfter,
  resolveUnreadCursor,
  setLastReadPostId,
} from '@/lib/family/feedReadCursor';
import { getFeedUnreadSummary } from '@/lib/family/api';
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

  const pushUnreadBadge = useCallback((count: number) => {
    const next = Math.max(0, Math.floor(count));
    if (unreadBadgeRef.current === next) return;
    unreadBadgeRef.current = next;
    jumpFabRef.current?.setUnreadCount(next);
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
    jumpVisibleRef.current = show;
    jumpFabRef.current?.setVisible(show);
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
    // Never jump to tip while older pages are being prepended.
    if (loadingHistoryRef.current || scrollRestoreRef.current) return;

    // After prepend, keep the captured post glued while media/layout settle.
    if (historyPinRef.current) {
      restoreFeedScrollPosition(historyPinRef.current, { root, lenis });
      return;
    }

    if (!historyReadyRef.current) {
      scrollFeedToLatest('auto', { root, lenis });
      return;
    }

    if (!anchoredToBottomRef.current) return;
    scrollFeedToLatest('auto', { root, lenis });
  }, [getScrollCtx]);

  const markCaughtUpToLatest = useCallback(() => {
    if (isPreview || postsRef.current.length === 0) return;
    const latestId = chronologicalLatestPostId(postsRef.current);
    if (latestId <= 0) return;
    setLastReadPostId(viewerKey, latestId);
    pushUnreadBadge(0);
    if (unreadSplitRef.current != null) {
      unreadSplitRef.current = latestId;
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
      const run = () => {
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
    const distanceFromBottom = lenis
      ? getLenisDistanceFromBottom(lenis)
      : getFeedDistanceFromBottom(root);
    const atBottom = distanceFromBottom < 80;
    anchoredToBottomRef.current = atBottom;

    const lastRead = unreadSplitRef.current ?? getLastReadPostId(viewerKey);
    const remainingUnread =
      !isPreview && lastRead > 0
        ? countUnreadStillBelow(postsRef.current, lastRead, root)
        : 0;

    const canShowJump =
      feedReadyRef.current &&
      !commentsOpenRef.current &&
      !notificationsOpenRef.current &&
      (remainingUnread > 0 || distanceFromBottom > 120);
    setJumpFabVisible(canShowJump);

    if (atBottom && !isPreview && postsRef.current.length > 0) {
      markCaughtUpToLatest();
      return;
    }

    if (!isPreview) {
      pushUnreadBadge(remainingUnread);
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
    // Lenis/layout often settles a frame later; re-pin the same post.
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => {
        apply();
        scrollRestoreRef.current = null;
        loadingHistoryRef.current = false;
        historyPinRef.current = snapshot;
        if (historyPinClearTimerRef.current != null) {
          window.clearTimeout(historyPinClearTimerRef.current);
        }
        historyPinClearTimerRef.current = window.setTimeout(() => {
          historyPinRef.current = null;
          historyPinClearTimerRef.current = null;
        }, 450);
      });
    });
  }, [getScrollCtx, posts.length]);

  // Keep catching up to bottom after media/layout settles (caught-up sessions only).
  // Skip while prepending history — that resize must not yank the user to the tip.
  useEffect(() => {
    if (!feedReady || isPreview || !initialScrollDoneRef.current || unreadSplitId != null) return;
    if (!anchoredToBottomRef.current) return;
    if (loadingHistoryRef.current || scrollRestoreRef.current || historyPinRef.current) return;
    const t1 = window.setTimeout(() => {
      if (loadingHistoryRef.current || scrollRestoreRef.current || historyPinRef.current) return;
      if (anchoredToBottomRef.current) scrollToLatestReliable('auto');
    }, 200);
    const t2 = window.setTimeout(() => {
      if (loadingHistoryRef.current || scrollRestoreRef.current || historyPinRef.current) return;
      if (anchoredToBottomRef.current) markCaughtUpToLatest();
    }, 500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [feedReady, isPreview, markCaughtUpToLatest, posts.length, scrollToLatestReliable, unreadSplitId]);
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
      const lastRead = isPreview ? 0 : resolveUnreadCursor(viewerKey, posts);
      const latestId = chronologicalLatestPostId(posts);
      const forceUnreadFromNav = !isPreview && peekEnterUnreadAfter() > 0;
      maxPostIdRef.current = Math.max(
        maxPostIdRef.current,
        posts.reduce((max, post) => Math.max(max, post.id), 0),
      );

      const hasLocalUnread = lastRead > 0 && hasUnreadSince(posts, lastRead);
      if (!isPreview && lastRead > 0 && (hasLocalUnread || forceUnreadFromNav)) {
        // Nav promised unread — wait for revalidated tip before locking caught-up.
        if (forceUnreadFromNav && !hasLocalUnread && isValidating) return;

        initialScrollDoneRef.current = true;
        consumeEnterUnreadAfter();
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
        setUnreadDividerCount(Math.max(localCount, forceUnreadFromNav ? 1 : 0));
        pushUnreadBadge(Math.max(localCount, forceUnreadFromNav ? 1 : 0));
        void getFeedUnreadSummary(lastRead)
          .then((res) => {
            const apiCount = res.data.unread_count;
            if (apiCount > 0) {
              setUnreadDividerCount(apiCount);
              pushUnreadBadge(apiCount);
            }
          })
          .catch(() => {});
        anchoredToBottomRef.current = false;
        historyReadyRef.current = true;
        return;
      }

      // Wait for first-page revalidation so we don't lock "caught up" on a stale tip.
      if (isValidating) return;

      initialScrollDoneRef.current = true;

      if (!isPreview) {
        setLastReadPostId(viewerKey, latestId);
      }

      historyReadyRef.current = true;
      anchoredToBottomRef.current = true;
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
    const targetId = pendingInitialUnreadScrollRef.current;
    if (targetId == null || unreadSplitId == null) return;
    pendingInitialUnreadScrollRef.current = null;
    void scrollToPost(targetId, { behavior: 'auto', highlight: false, align: 'end' }).then(() => {
      anchoredToBottomRef.current = false;
      // Recompute remaining-below after layout settles (last-read is now at the bottom).
      requestAnimationFrame(() => {
        const { root } = getScrollCtx();
        if (root && unreadSplitRef.current != null) {
          const remaining = countUnreadStillBelow(postsRef.current, unreadSplitRef.current, root);
          pushUnreadBadge(remaining);
        }
        setJumpFabVisible(true);
        scheduleRevealFeed(40);
      });
    });
  }, [unreadSplitId, scheduleRevealFeed, scrollToPost, setJumpFabVisible, getScrollCtx, pushUnreadBadge]);

  // Safety: reveal feed if boot stalls — never force scroll-to-latest (that kills unread landing).
  useEffect(() => {
    if (feedReady || isLoading) return;
    if (posts.length === 0) return;
    const t = window.setTimeout(() => {
      if (unreadSplitRef.current != null || pendingInitialUnreadScrollRef.current != null) {
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
    if (anchoredToBottomRef.current) return;
    const { root } = getScrollCtx();
    const lastRead = unreadSplitRef.current ?? resolveUnreadCursor(viewerKey, posts);
    if (lastRead <= 0) return;
    if (root) {
      pushUnreadBadge(countUnreadStillBelow(posts, lastRead, root));
    } else {
      pushUnreadBadge(countUnreadPosts(posts, lastRead));
    }
    if (countUnreadPosts(posts, lastRead) > 0 && unreadSplitRef.current == null) {
      unreadSplitRef.current = lastRead;
      setUnreadSplitId(lastRead);
      setUnreadDividerCount((prev) => Math.max(prev, countUnreadPosts(posts, lastRead)));
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
              ref={jumpFabRef}
              onClick={() => {
                scrollToLatestReliable('smooth');
                markCaughtUpToLatest();
              }}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
