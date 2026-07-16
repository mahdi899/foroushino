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
  getFeedDistanceFromBottom,
  getLenisDistanceFromBottom,
  restoreFeedScrollPosition,
  scrollFeedTo,
  scrollFeedToLatest,
} from '@/lib/family/feedScroll';
import {
  countUnreadPosts,
  firstUnreadPostId,
  getLastReadPostId,
  hasUnreadSince,
  setLastReadPostId,
} from '@/lib/family/feedReadCursor';
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

function buildFeedItems(posts: FamilyPost[], unreadAfterId: number | null): FeedItem[] {
  const items: FeedItem[] = [];
  let lastDayKey: string | null = null;
  let unreadInserted = false;
  const unreadCount =
    unreadAfterId != null ? countUnreadPosts(posts.map((p) => p.id), unreadAfterId) : 0;

  for (const post of posts) {
    if (
      !unreadInserted &&
      unreadAfterId != null &&
      unreadCount > 0 &&
      post.id > unreadAfterId
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
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
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
  const [unreadBadge, setUnreadBadge] = useState(0);
  const scrollIdleRef = useRef(true);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const feedItems = useMemo(
    () => buildFeedItems(posts, isPreview ? null : unreadSplitId),
    [posts, isPreview, unreadSplitId],
  );
  const hasMoreRef = useRef(hasMore);
  const postsRef = useRef(posts);

  useFamilyRealtime({
    onFeedUpdated: (payload) => {
      void mutate();
      if (isPreview) return;
      const lastRead = getLastReadPostId(viewerKey);
      if (payload.latest_post_id <= lastRead) return;

      if (anchoredToBottomRef.current) {
        // Stick-to-bottom path will mark caught up after posts refresh.
        return;
      }

      const ids = postsRef.current.map((p) => p.id);
      if (!ids.includes(payload.post_id)) ids.push(payload.post_id);
      const nextBadge = countUnreadPosts(ids, lastRead);
      setUnreadBadge((prev) => Math.max(prev, nextBadge, 1));
      if (unreadSplitRef.current == null) {
        unreadSplitRef.current = lastRead;
        setUnreadSplitId(lastRead);
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

    if (!historyReadyRef.current) {
      scrollFeedToLatest('auto', { root, lenis });
      return;
    }

    if (!anchoredToBottomRef.current) return;
    scrollFeedToLatest('auto', { root, lenis });
  }, [getScrollCtx]);

  const markCaughtUpToLatest = useCallback(() => {
    if (isPreview || postsRef.current.length === 0) return;
    const maxId = postsRef.current.reduce((max, post) => Math.max(max, post.id), 0);
    setLastReadPostId(viewerKey, maxId);
    setUnreadBadge(0);
    if (unreadSplitRef.current != null) {
      unreadSplitRef.current = maxId;
      setUnreadSplitId(null);
    }
  }, [isPreview, viewerKey]);

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

    const canShowJump =
      feedReadyRef.current &&
      !commentsOpenRef.current &&
      !notificationsOpenRef.current &&
      distanceFromBottom > 120;
    setJumpFabVisible(canShowJump);

    if (atBottom && !isPreview && postsRef.current.length > 0) {
      markCaughtUpToLatest();
    } else if (!isPreview) {
      const lastRead = getLastReadPostId(viewerKey);
      const nextBadge = countUnreadPosts(postsRef.current.map((p) => p.id), lastRead);
      setUnreadBadge((prev) => (prev === nextBadge ? prev : nextBadge));
    }
  }, [getScrollCtx, isPreview, markCaughtUpToLatest, setJumpFabVisible, viewerKey]);

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
    async (postId: number, options?: { behavior?: 'auto' | 'smooth'; highlight?: boolean }) => {
      const behavior = options?.behavior ?? 'smooth';
      const shouldHighlight = options?.highlight ?? behavior === 'smooth';

      const highlight = (el: HTMLElement) => {
        el.classList.add('family-post--highlight');
        window.setTimeout(() => el.classList.remove('family-post--highlight'), 2200);
      };

      const tryScroll = (): boolean => {
        const { root, lenis } = getScrollCtx();
        const el = document.getElementById(`family-post-${postId}`);
        if (!root || !el) return false;

        const rootRect = root.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetTop = elRect.top - rootRect.top + root.scrollTop - 20;
        scrollFeedTo(Math.max(0, targetTop), behavior, { root, lenis });
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
    if (!isValidating) loadingHistoryRef.current = false;
  }, [isValidating]);

  useLayoutEffect(() => {
    const snapshot = scrollRestoreRef.current;
    if (!snapshot) return;

    const { root, lenis } = getScrollCtx();
    if (!root) return;

    restoreFeedScrollPosition(snapshot, { root, lenis });
    scrollRestoreRef.current = null;
  }, [getScrollCtx, posts.length]);

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
      initialScrollDoneRef.current = true;
      const maxId = posts.reduce((max, post) => Math.max(max, post.id), 0);
      maxPostIdRef.current = maxId;
      const postIds = posts.map((p) => p.id);

      if (!isPreview) {
        const lastRead = getLastReadPostId(viewerKey);
        const unread = hasUnreadSince(postIds, lastRead);

        // Telegram channel rule:
        // - caught up → always open on the latest post
        // - only jump to mid-feed when there are newer posts than lastRead
        if (unread) {
          const firstUnread = firstUnreadPostId([...postIds].sort((a, b) => a - b), lastRead);
          if (firstUnread != null) {
            unreadSplitRef.current = lastRead;
            pendingInitialUnreadScrollRef.current = firstUnread;
            setUnreadSplitId(lastRead);
            setUnreadBadge(countUnreadPosts(postIds, lastRead));
            anchoredToBottomRef.current = false;
            historyReadyRef.current = true;
            return;
          }
        }

        // First visit or fully caught up → latest + persist cursor.
        setLastReadPostId(viewerKey, maxId);
      }

      historyReadyRef.current = true;
      anchoredToBottomRef.current = true;
      scrollToLatestReliable('auto');
      // Wait for Lenis + delayed settle retries before revealing (avoids top→bottom flash).
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
    posts,
    scheduleRevealFeed,
    scrollToLatestReliable,
    viewerKey,
  ]);

  // Keep catching up to bottom after media/layout settles (caught-up sessions only).
  useEffect(() => {
    if (!feedReady || isPreview || !initialScrollDoneRef.current || unreadSplitId != null) return;
    if (!anchoredToBottomRef.current) return;
    const t1 = window.setTimeout(() => scrollToLatestReliable('auto'), 200);
    const t2 = window.setTimeout(() => {
      if (anchoredToBottomRef.current) markCaughtUpToLatest();
    }, 500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [feedReady, isPreview, markCaughtUpToLatest, posts.length, scrollToLatestReliable, unreadSplitId]);

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
    void scrollToPost(targetId, { behavior: 'auto', highlight: false }).then(() => {
      scheduleRevealFeed(40);
    });
  }, [unreadSplitId, scheduleRevealFeed, scrollToPost]);

  // Safety: never leave the boot skeleton up forever if scroll root mounts late.
  useEffect(() => {
    if (feedReady || isLoading) return;
    if (posts.length === 0) return;
    const t = window.setTimeout(() => {
      scrollToLatestReliable('auto');
      setFeedReady(true);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [feedReady, isLoading, posts.length, scrollToLatestReliable]);

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

  useEffect(() => {
    const { root } = getScrollCtx();
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel || !hasMore || commentsTarget || notificationsOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!historyReadyRef.current || !anchoredToBottomRef.current || pinNavigateRef.current) return;
        if (!scrollIdleRef.current) return;
        if (!entries[0]?.isIntersecting || isValidating || loadingHistoryRef.current) return;

        const distanceFromBottom = getFeedDistanceFromBottom(root);
        if (distanceFromBottom < 80) return;

        loadingHistoryRef.current = true;
        scrollRestoreRef.current = {
          height: root.scrollHeight,
          top: root.scrollTop,
        };
        loadMore();
      },
      { root, rootMargin: '120px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [commentsTarget, getScrollCtx, hasMore, isValidating, loadMore, notificationsOpen, posts.length, scrollIdle]);

  useEffect(() => {
    return () => {
      if (scrollIdleTimerRef.current != null) {
        window.clearTimeout(scrollIdleTimerRef.current);
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
              unreadCount={unreadBadge}
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
