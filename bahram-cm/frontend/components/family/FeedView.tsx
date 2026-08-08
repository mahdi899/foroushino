'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type KeyboardEvent as ReactKeyboardEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FeedDateSeparator } from '@/components/family/FeedDateSeparator';
import { FeedJumpToLatest, type FeedJumpToLatestHandle } from '@/components/family/FeedJumpToLatest';
import { FeedPreviewGate, FeedPreviewIntro } from '@/components/family/FeedPreviewIntro';
import { FeedUnreadDivider } from '@/components/family/FeedUnreadDivider';
import { useFamilyGuestAccessOptional } from '@/components/family/FamilyGuestAccess';
import { GUEST_BLURRED_POST_COUNT, type FamilyGuestAction } from '@/lib/family/guest-access';
import { FamilyBrandingSidebar } from '@/components/family/FamilyBrandingSidebar';
import { FamilyFeedChrome } from '@/components/family/FamilyFeedChrome';
import { FamilyFeedScroll, type FamilyFeedScrollHandle } from '@/components/family/FamilyFeedScroll';
import { VirtualFeedList, type VirtualFeedListHandle } from '@/components/family/VirtualFeedList';
import { FamilyFeedBootSkeleton } from '@/components/family/FamilyShellLoading';
import { PostCard } from '@/components/family/PostCard';
import { FamilyInstallPromoInline, FamilyInstallTopBanner } from '@/components/family/FamilyInstallBanner';
import { cn } from '@/lib/cn';
import { useFamilyPwaInstall } from '@/lib/family/pwa-install';
import {
  captureFeedScrollRestore,
  getFeedDistanceFromBottom,
  getLenisDistanceFromBottom,
  pinFeedElementBottomUntilSettled,
  restoreFeedScrollPosition,
  restoreFeedScrollPositionUntilSettled,
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
  getCachedUnreadSummary,
  getUnreadSummaryEtag,
  rememberUnreadSummary,
} from '@/lib/family/unreadSummaryCache';
import {
  familyFeedDebug,
  installFamilyFeedDebugGlobals,
} from '@/lib/family/feedDebug';
import { useFamilyDebugRender } from '@/lib/family/useFamilyDebugRender';
import { useFamilyFeed } from '@/lib/family/hooks/useFamilyFeed';
import {
  handleFeedModerationEvent,
  mergePublishedPostIntoFeedCaches,
  useFamilyRealtime,
} from '@/lib/family/hooks/useFamilyRealtime';
import { isRealtimeConfigured } from '@/lib/realtime/config';
import { usePageVisible } from '@/lib/family/hooks/usePageVisible';
import { formatFeedDaySeparator, getPostDayKey } from '@/lib/family/datetime';
import {
  calibrateFeedEstimateMetrics,
  estimateFeedItemSize,
  type FeedListItem,
} from '@/lib/family/feedItemEstimate';
import {
  FAMILY_FEED_HISTORY_PREFETCH_COOLDOWN_MS,
  FAMILY_FEED_HISTORY_PREFETCH_SCROLL_PX,
  FAMILY_FEED_INITIAL_WARM_POST_COUNT,
  FAMILY_FEED_MEDIA_WARM_POSTS_AFTER,
  FAMILY_FEED_MEDIA_WARM_POSTS_BEFORE,
  familyFeedTopSentinelRootMargin,
  FAMILY_FEED_VIRTUAL_OVERSCAN,
} from '@/lib/family/feedUx';
import {
  findVisiblePostAnchorIndex,
  warmupFamilyPostsMedia,
  warmupFamilyPostsWindowDirectional,
} from '@/lib/family/feedMediaWarmup';
import type { FamilyBranding, FamilyComment, FamilyFeedResponse, FamilyPost } from '@/lib/family/types';
import { parseFamilyPostId } from '@/lib/family/postLink';

const FAMILY_FEED_USER_SCROLL_GUARD_MS = 600;

/** Shared identity so non-guest feeds never invalidate memoized PostCards. */
const NO_BLURRED_POST_IDS: ReadonlySet<number> = new Set<number>();

const FamilyNotificationsPanel = dynamic(
  () =>
    import('@/components/family/FamilyNotificationsPanel').then((m) => ({
      default: m.FamilyNotificationsPanel,
    })),
  { ssr: false },
);
const FeedCommentsPanel = dynamic(
  () =>
    import('@/components/family/FeedCommentsPanel').then((m) => ({
      default: m.FeedCommentsPanel,
    })),
  { ssr: false },
);

type CommentsTarget = {
  postId: number;
  focusCommentId?: number | null;
  onCommentAdded: (comment: FamilyComment) => void;
};

function buildFeedItems(
  posts: FamilyPost[],
  unreadAfterId: number | null,
  dividerCount: number,
  includeInstallPromos: boolean,
): FeedListItem[] {
  const items: FeedListItem[] = [];
  let lastDayKey: string | null = null;
  let unreadInserted = false;
  let postOrdinal = 0;
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
    postOrdinal += 1;

    if (includeInstallPromos && postOrdinal % 10 === 0) {
      items.push({
        kind: 'install-promo',
        key: `install-promo-${postOrdinal}`,
        afterPostCount: postOrdinal,
      });
    }
  }

  return items;
}

export function FeedView(props: FeedViewProps) {
  return (
    <Suspense fallback={null}>
      <FeedViewInner {...props} />
    </Suspense>
  );
}

type FeedViewProps = {
  memberCount?: number;
  onMemberCountChange?: (memberCount?: number) => void;
  previewMode?: 'guest' | 'join' | null;
  showPinned?: boolean;
  initialFeed?: FamilyFeedResponse | null;
  initialBranding?: FamilyBranding;
  viewerKey?: string | number;
  commentsTarget?: CommentsTarget | null;
  onOpenComments?: (target: CommentsTarget) => void;
  onCloseComments?: () => void;
  onRegisterScrollToPost?: (scrollToPost: ((postId: number) => Promise<void>) | null) => void;
  notificationsOpen?: boolean;
  onOpenNotifications?: () => void;
  onCloseNotifications?: () => void;
  focusPostId?: number;
  needsName?: boolean;
  initialFirstName?: string;
  initialLastName?: string;
};

function FeedViewInner({
  memberCount,
  onMemberCountChange,
  previewMode = null,
  showPinned = false,
  initialFeed = null,
  initialBranding,
  viewerKey = 'anon',
  commentsTarget,
  onOpenComments,
  onCloseComments,
  onRegisterScrollToPost,
  notificationsOpen = false,
  onOpenNotifications,
  onCloseNotifications,
  focusPostId,
  needsName = false,
  initialFirstName = '',
  initialLastName = '',
}: FeedViewProps) {
  const searchParams = useSearchParams();
  const isPreview = Boolean(previewMode);
  const pageVisible = usePageVisible();
  useFamilyDebugRender(isPreview ? 'FeedView:preview' : 'FeedView');
  const feedScope: 'guest' | 'member' = isPreview ? 'guest' : 'member';
  const initialPage = initialFeed ? { data: initialFeed.data, meta: initialFeed.meta } : null;
  const guestAccess = useFamilyGuestAccessOptional();

  const handleGuestGate = useCallback(
    (action: FamilyGuestAction) => {
      guestAccess?.promptLogin(action);
    },
    [guestAccess],
  );

  const {
    posts,
    meta,
    isLoading,
    hasMore,
    hasNewer,
    loadMore,
    loadNewer,
    isValidating,
    jumpToPost,
    revalidateTip,
  } = useFamilyFeed(feedScope, initialPage, viewerKey);
  const resolvedMemberCount = meta?.member_count ?? memberCount;
  const isStaff = meta?.is_staff ?? false;

  useEffect(() => {
    if (typeof meta?.member_count !== 'number') return;
    onMemberCountChange?.(meta.member_count);
  }, [meta?.member_count, onMemberCountChange]);

  const scrollToPreviewCta = useCallback(
    (action: FamilyGuestAction = 'morePosts') => {
      if (previewMode === 'guest') {
        handleGuestGate(action);
        return;
      }
      document.getElementById('family-join-cta')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [handleGuestGate, previewMode],
  );
  const feedScrollRef = useRef<FamilyFeedScrollHandle | null>(null);
  const virtualListRef = useRef<VirtualFeedListHandle | null>(null);

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
  const newerSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingNewerRef = useRef(false);
  const jumpFabRef = useRef<FeedJumpToLatestHandle | null>(null);
  const jumpVisibleRef = useRef(false);
  const feedReadyRef = useRef(false);
  const commentsOpenRef = useRef(false);
  const notificationsOpenRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const anchoredToBottomRef = useRef(false);
  const historyReadyRef = useRef(false);
  const loadingHistoryRef = useRef(false);
  /** Snapshot taken before older-page prepend — held through measure settle so mobile doesn't jump. */
  const scrollRestoreRef = useRef<FeedScrollRestoreSnapshot | null>(null);
  /** True while history prepend restore is re-pinning after layout/measure. */
  const historySettleActiveRef = useRef(false);
  const historySettleGenRef = useRef(0);
  const pinNavigateRef = useRef(false);
  /** True after a far "jump to post" replaced the loaded window and the tip is no longer loaded. */
  const isJumpedAwayRef = useRef(false);
  const restoringFromCommentsRef = useRef(false);
  /** User was at the feed tip when comments/notifications opened — restore tip on close. */
  const tipBeforeOverlayRef = useRef(false);
  const overlayOpenRef = useRef(false);
  const pendingInitialUnreadScrollRef = useRef<number | null>(null);
  const unreadSplitRef = useRef<number | null>(null);
  /** Blocks tip-stick / scroll-to-latest while unread landing is in progress. */
  const unreadBootLockRef = useRef(false);
  /**
   * After caught-up boot, keep re-sticking through image/chrome-inset growth.
   * Cleared when tip is truly reached or the settle window ends.
   */
  const tipSettleUntilRef = useRef(0);
  /** Last unreadSplitId we already finished landing for — prevents re-pin loops. */
  const unreadLandCompletedForRef = useRef<number | null>(null);
  /** Bumps to cancel in-flight scrollToLatestReliable rAF/timeouts. */
  const scrollLatestGenRef = useRef(0);
  /** Prevents delayed resize/append correction from fighting active wheel/touch/keyboard scrolling. */
  const userScrollQuietUntilRef = useRef(0);
  /** Suppress jump FAB while a FAB-initiated scroll-to-tip is in flight. */
  const jumpToLatestInFlightRef = useRef(false);
  /** User scrolled during an unread session — allows natural catch-up once tip is seen. */
  const unreadUserScrolledRef = useRef(false);
  const scrollStickRafRef = useRef<number | null>(null);
  const scrollAnchorRafRef = useRef<number | null>(null);
  const mediaWarmupRafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const lastHistoryPrefetchAtRef = useRef(0);
  const initialMediaWarmDoneRef = useRef(false);
  const revealTimerRef = useRef<number | null>(null);
  const maxPostIdRef = useRef(0);
  /** False until initial scroll target is applied — hides feed to prevent top→bottom jump. */
  const [feedReady, setFeedReady] = useState(false);
  const [bootTick, setBootTick] = useState(0);
  const [unreadSplitId, setUnreadSplitId] = useState<number | null>(null);
  /** Frozen label for the in-feed unread divider (does not shrink on scroll). */
  const [unreadDividerCount, setUnreadDividerCount] = useState(0);
  const unreadBadgeRef = useRef(0);
  /** Suppress stick-to-tip right after natural catch-up (divider removal resizes content). */
  const catchUpQuietUntilRef = useRef(0);
  const pwaInstall = useFamilyPwaInstall();
  const includeInstallPromos = pwaInstall.showMidFeedPromos && !pwaInstall.isInstalled;
  const feedItems = useMemo(
    () =>
      buildFeedItems(
        posts,
        isPreview ? null : unreadSplitId,
        unreadDividerCount,
        includeInstallPromos,
      ),
    [posts, isPreview, unreadSplitId, unreadDividerCount, includeInstallPromos],
  );
  const guestBlurredPostIds = useMemo(() => {
    if (previewMode !== 'guest') return NO_BLURRED_POST_IDS;
    const ids = feedItems
      .filter((item): item is Extract<FeedListItem, { kind: 'post' }> => item.kind === 'post')
      .slice(0, GUEST_BLURRED_POST_COUNT)
      .map((item) => item.post.id);
    return new Set(ids);
  }, [feedItems, previewMode]);
  const feedItemsRef = useRef(feedItems);
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
    if (next > 0 && !jumpToLatestInFlightRef.current) {
      jumpVisibleRef.current = true;
      jumpFabRef.current?.setVisible(true);
    }
  }, []);

  const recentFeedUpdateIdsRef = useRef<Set<number>>(new Set());
  const feedRevisionRef = useRef<number | null>(null);
  const lastTipSyncAtRef = useRef(0);
  const tipSyncInFlightRef = useRef(false);

  const syncTipIfServerAhead = useCallback(async () => {
    if (isPreview || isJumpedAwayRef.current || tipSyncInFlightRef.current) return;

    const realtime = isRealtimeConfigured();
    const minGapMs = realtime ? 90_000 : 45_000;
    const now = Date.now();
    if (now - lastTipSyncAtRef.current < minGapMs) return;

    tipSyncInFlightRef.current = true;
    lastTipSyncAtRef.current = now;

    const loadedLatest = chronologicalLatestPostId(postsRef.current);
    try {
      const result = await getFeedUnreadSummary(loadedLatest, getUnreadSummaryEtag());
      const summary = result.notModified ? getCachedUnreadSummary() : rememberUnreadSummary(result.data, result.etag);
      const serverLatest = summary.latest_post_id;
      const revision = summary.feed_revision;

      if (
        revision != null &&
        feedRevisionRef.current != null &&
        revision !== feedRevisionRef.current
      ) {
        familyFeedDebug.info('sync', 'feed revision changed — revalidating tip', {
          previous: feedRevisionRef.current,
          next: revision,
        });
        feedRevisionRef.current = revision;
        await revalidateTip();
        return;
      }
      if (revision != null) feedRevisionRef.current = revision;

      if (serverLatest === loadedLatest) return;

      familyFeedDebug.info('sync', 'server tip changed — revalidating tip', {
        loadedLatest,
        serverLatest,
      });
      await revalidateTip();
    } catch (err) {
      familyFeedDebug.warn('sync', 'tip sync failed', { error: String(err) });
    } finally {
      tipSyncInFlightRef.current = false;
    }
  }, [isPreview, revalidateTip]);

  useFamilyRealtime({
    // FeedView owns feed merges so a far jump window is never tip-replaced.
    syncFeed: false,
    onFeedUpdated: (payload) => {
      const event = payload.event ?? 'published';
      // Reverb/Pusher redelivers on reconnect — de-dupe by post_id for publishes.
      if (recentFeedUpdateIdsRef.current.has(payload.post_id) && event === 'published') {
        familyFeedDebug.info('realtime', 'duplicate feed-updated ignored', { postId: payload.post_id });
        return;
      }
      if (event === 'published') {
        recentFeedUpdateIdsRef.current.add(payload.post_id);
        if (recentFeedUpdateIdsRef.current.size > 50) {
          const oldest = recentFeedUpdateIdsRef.current.values().next().value;
          if (oldest != null) recentFeedUpdateIdsRef.current.delete(oldest);
        }
      }

      familyFeedDebug.info('realtime', 'feed updated', {
        postId: payload.post_id,
        event,
        latest: payload.latest_post_id,
        anchored: anchoredToBottomRef.current,
        jumped: isJumpedAwayRef.current,
      });

      if (isPreview) return;

      if (event === 'comments_count') return;

      if (event === 'updated' || event === 'deleted' || event === 'archived') {
        void handleFeedModerationEvent(event, payload.post_id);
        return;
      }

      if (event !== 'published') return;

      // Far jump window — never merge tip into the loaded slice; badge only.
      if (isJumpedAwayRef.current) {
        pushUnreadBadge(Math.max(unreadBadgeRef.current + 1, 1));
        setJumpFabVisible(true);
        return;
      }

      // Live tail: soft-merge new post into tip without full infinite revalidate.
      if (anchoredToBottomRef.current) {
        void mergePublishedPostIntoFeedCaches(payload.post_id).then((merged) => {
          if (!merged) void revalidateTip();
        });
        return;
      }

      // Reading older tip pages — merge silently + bump FAB unread by one.
      // Do NOT reset to full chrono — that undid scroll-based badge decreases.
      void mergePublishedPostIntoFeedCaches(payload.post_id).then((merged) => {
        if (!merged) void revalidateTip();
      });

      const lastRead = unreadSplitRef.current ?? getLastReadPostId(viewerKey);
      const alreadyLoaded = postsRef.current.some((p) => p.id === payload.post_id);
      if (!alreadyLoaded) {
        pushUnreadBadge(Math.max(unreadBadgeRef.current + 1, 1));
      }
      if (unreadSplitRef.current == null && lastRead > 0) {
        unreadSplitRef.current = lastRead;
        unreadUserScrolledRef.current = false;
        setUnreadSplitId(lastRead);
        const chrono = countUnreadPosts(postsRef.current, lastRead);
        setUnreadDividerCount((prev) => Math.max(prev, alreadyLoaded ? chrono : chrono + 1, 1));
      }
    },
  });
  const isValidatingRef = useRef(isValidating);

  // HTTP safety net when Reverb is down or an event was missed (e.g. two quick publishes).
  useEffect(() => {
    if (isPreview || !feedReady || !pageVisible || commentsTarget || notificationsOpen) return;

    void syncTipIfServerAhead();

    const intervalMs = isRealtimeConfigured() ? 180_000 : 90_000;
    const id = window.setInterval(() => {
      void syncTipIfServerAhead();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [
    commentsTarget,
    feedReady,
    isPreview,
    notificationsOpen,
    pageVisible,
    syncTipIfServerAhead,
  ]);

  useEffect(() => {
    const revision = meta?.feed_revision;
    if (revision == null) return;
    feedRevisionRef.current = revision;
  }, [meta?.feed_revision]);

  useEffect(() => {
    if (isPreview) return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void syncTipIfServerAhead();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isPreview, syncTipIfServerAhead]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
    postsRef.current = posts;
    feedItemsRef.current = feedItems;
    isValidatingRef.current = isValidating;
  }, [feedItems, hasMore, posts, isValidating]);

  // When loadNewer reaches the true tip, clear jumped-away so catch-up works again.
  useEffect(() => {
    if (!hasNewer && isJumpedAwayRef.current) {
      isJumpedAwayRef.current = false;
    }
  }, [hasNewer]);

  useEffect(() => {
    if (isPreview) return;
    return familyFeedDebug.registerSnapshotSource('feed', () => ({
      scope: feedScope,
      loadedPostCount: postsRef.current.length,
      domPostCount: document.querySelectorAll('[id^="family-post-"]').length,
      hasMore: hasMoreRef.current,
      isValidating: isValidatingRef.current,
      isJumpedAway: isJumpedAwayRef.current,
      unreadBadge: unreadBadgeRef.current,
      anchoredToBottom: anchoredToBottomRef.current,
    }));
  }, [feedScope, isPreview]);

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
    const tipInView = isFeedTipInView(
      root,
      chronologicalLatestPostId(postsRef.current),
      distanceFromBottom,
    );
    const canShow =
      !jumpToLatestInFlightRef.current &&
      feedReadyRef.current &&
      !commentsOpenRef.current &&
      !notificationsOpenRef.current &&
      !tipInView &&
      distanceFromBottom > 120;
    setJumpFabVisible(canShow);
  }, [getScrollCtx, setJumpFabVisible]);

  const openComments = useCallback(
    (target: CommentsTarget) => {
      // Keep tip memory via tipBeforeOverlayRef — clearing anchored here made return-from-comments
      // land a chrome-inset/topbar height above the tip.
      onOpenComments?.(target);
    },
    [onOpenComments],
  );

  /** Stable per-feed opener so memoized PostCards skip parent re-renders. */
  const openPostComments = useCallback(
    (postId: number, handlers: { onCommentAdded: (comment: FamilyComment) => void }) => {
      openComments({ postId, ...handlers });
    },
    [openComments],
  );

  const closeComments = useCallback(() => {
    restoringFromCommentsRef.current = true;
    onCloseComments?.();
    window.requestAnimationFrame(() => {
      restoringFromCommentsRef.current = false;
    });
  }, [onCloseComments]);

  const markFeedUserScrollIntent = useCallback((movingAwayFromTip = false) => {
    userScrollQuietUntilRef.current = performance.now() + FAMILY_FEED_USER_SCROLL_GUARD_MS;
    // Cancel delayed passes from an earlier automatic scroll. A later explicit FAB click
    // starts a new generation, so manual "jump to latest" remains reliable.
    scrollLatestGenRef.current += 1;
    if (unreadSplitRef.current != null && !unreadBootLockRef.current) {
      unreadUserScrolledRef.current = true;
    }
    if (!movingAwayFromTip) return;
    tipSettleUntilRef.current = 0;
    anchoredToBottomRef.current = false;
    jumpToLatestInFlightRef.current = false;
  }, []);

  const stickToBottomIfAnchored = useCallback(() => {
    const { root, lenis } = getScrollCtx();
    if (!root || pinNavigateRef.current || restoringFromCommentsRef.current) return;
    if (performance.now() < userScrollQuietUntilRef.current) return;
    // Never jump to tip while older pages are being prepended / unread boot.
    if (loadingHistoryRef.current || scrollRestoreRef.current || unreadBootLockRef.current) return;
    if (performance.now() < catchUpQuietUntilRef.current) return;

    // Active unread session: only the jump FAB / user scroll may reach the tip.
    if (unreadSplitRef.current != null && !anchoredToBottomRef.current) return;

    // Do NOT scroll-to-latest while historyReady is false — that raced unread landing on every resize/re-render.
    if (!historyReadyRef.current) return;
    if (!anchoredToBottomRef.current) return;

    const distance = lenis
      ? getLenisDistanceFromBottom(lenis)
      : getFeedDistanceFromBottom(root);
    const settling = performance.now() < tipSettleUntilRef.current;

    // Already at tip — skip scroll storms (unread divider clear, image decode).
    if (distance < 8) return;

    // User scrolled away — don't yank. During tip settle after boot, content often
    // grows >96px (images / chrome inset); keep sticking instead of releasing.
    if (distance > 96 && !settling) {
      anchoredToBottomRef.current = false;
      return;
    }

    familyFeedDebug.warn('stick', 'scroll to latest (anchored)', {
      distance: Math.round(distance),
      settling,
    });
    scrollFeedToLatest('auto', { root, lenis });
  }, [getScrollCtx]);

  const markCaughtUpToLatest = useCallback(() => {
    if (isPreview || postsRef.current.length === 0) return;
    if (unreadBootLockRef.current) {
      familyFeedDebug.warn('catchup', 'blocked by boot lock');
      return;
    }
    // Loaded window is an old "jump to post" slice, not the tip — nothing to catch up to.
    if (isJumpedAwayRef.current) return;
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
    // Quiet stick while divider unmount shrinks feed height (ResizeObserver).
    catchUpQuietUntilRef.current = performance.now() + 450;
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
    // History load is safe only after the boot scroll target is applied.
    historyReadyRef.current = true;
    // Bubble geometry is only readable once real rows are mounted; estimates built from
    // the wrong width are what turn into large measurement deltas mid-scroll later.
    calibrateFeedEstimateMetrics();
    // Remeasure before reveal so remount doesn't flash estimate/overlap gaps.
    virtualListRef.current?.remasureVisible();
    requestAnimationFrame(() => {
      virtualListRef.current?.remasureVisible();
      setFeedReady(true);
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
      // Immediate + one rAF + one late settle. Extra 400/1000ms passes fought the user
      // after media/chrome grew and felt like rubber-banding on production.
      run();
      requestAnimationFrame(run);
      window.setTimeout(run, 280);
    },
    [getScrollCtx],
  );

  // Comments/notifications overlay: topbar + pinned chrome remount and change viewport height.
  // Mid-feed posts stay visually correct; the tip needs an explicit scroll-to-latest on close.
  useLayoutEffect(() => {
    const overlayOpen = Boolean(commentsTarget || notificationsOpen);

    if (overlayOpen && !overlayOpenRef.current) {
      const { root, lenis } = getScrollCtx();
      const distance = root
        ? lenis
          ? getLenisDistanceFromBottom(lenis)
          : getFeedDistanceFromBottom(root)
        : Number.POSITIVE_INFINITY;
      tipBeforeOverlayRef.current =
        anchoredToBottomRef.current ||
        (Number.isFinite(distance) && distance < 120);
    }

    if (!overlayOpen && overlayOpenRef.current && tipBeforeOverlayRef.current) {
      tipBeforeOverlayRef.current = false;
      anchoredToBottomRef.current = true;
      tipSettleUntilRef.current = performance.now() + 700;
      scrollToLatestReliable('auto');
    }

    overlayOpenRef.current = overlayOpen;
  }, [commentsTarget, getScrollCtx, notificationsOpen, scrollToLatestReliable]);

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

    // Always measure what's still below in the loaded window so the FAB badge tracks scroll.
    const remainingUnread =
      !isPreview && lastRead > 0 && chronoUnread > 0
        ? countUnreadStillBelow(postsRef.current, lastRead, root, distanceFromBottom)
        : 0;

    // Loaded window is a "jump to post" slice — true tip may still be unloaded.
    // Still refresh the badge from the local window; don't freeze it until FAB click.
    if (isJumpedAwayRef.current && hasNewer) {
      anchoredToBottomRef.current = false;
      if (!isPreview) {
        // Local window fully seen but server still has newer pages — keep a residual badge.
        pushUnreadBadge(remainingUnread > 0 ? remainingUnread : Math.max(chronoUnread, 1));
      }
      if (feedReadyRef.current && !commentsOpenRef.current && !notificationsOpenRef.current) {
        setJumpFabVisible(true);
      }
      return;
    }
    if (isJumpedAwayRef.current && !hasNewer) {
      isJumpedAwayRef.current = false;
    }

    const latestPostId = chronologicalLatestPostId(postsRef.current);
    const tipInView = isFeedTipInView(root, latestPostId, distanceFromBottom);

    // Stricter tip threshold during unread — Lenis settle can sit ~40–79px above tip.
    // Also trust DOM tip visibility — virtual list scroll height can lag measured rows.
    const nearScrollEnd =
      distanceFromBottom < (unreadSession ? 24 : 80) || tipInView;

    // If last-seen is still on screen, we are in the unread landing zone — never auto-catchup
    // (short posts can fit tip + last-read in one viewport and falsely look "at tip"),
    // unless the user has already scrolled (they've looked at the new posts).
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

    const landLock =
      unreadSession && lastReadInView && !unreadUserScrolledRef.current;

    const atBottom =
      nearScrollEnd && tipInView && remainingUnread === 0 && !landLock;

    // While tip is still settling after caught-up boot, don't drop the anchor just
    // because media/chrome inset grew the scroll height (that showed the jump FAB early).
    // If the user clearly scrolled away, cancel settle immediately.
    const settling = performance.now() < tipSettleUntilRef.current;
    if (settling && !atBottom && anchoredToBottomRef.current) {
      if (distanceFromBottom > 220 && !jumpToLatestInFlightRef.current) {
        tipSettleUntilRef.current = 0;
        anchoredToBottomRef.current = false;
      } else {
        setJumpFabVisible(false);
        return;
      }
    }
    if (settling && atBottom) {
      tipSettleUntilRef.current = 0;
    }

    anchoredToBottomRef.current = atBottom;

    const badgeCount = remainingUnread;

    const reachedTip = atBottom;

    const canShowJump =
      !jumpToLatestInFlightRef.current &&
      feedReadyRef.current &&
      !commentsOpenRef.current &&
      !notificationsOpenRef.current &&
      !reachedTip &&
      !tipInView &&
      (badgeCount > 0 || distanceFromBottom > 120 || unreadSession);
    setJumpFabVisible(canShowJump);

    if (reachedTip) {
      jumpToLatestInFlightRef.current = false;
    } else if (tipInView && nearScrollEnd) {
      // Manual scroll to tip — release FAB-click guard even before full catch-up settles.
      jumpToLatestInFlightRef.current = false;
    }

    if (reachedTip && !isPreview && postsRef.current.length > 0) {
      if (unreadSession || badgeCount > 0) {
        familyFeedDebug.info('anchor', 'at tip → catch up', {
          distanceFromBottom: Math.round(distanceFromBottom),
          tipInView,
          lastReadInView,
          unreadSession,
          remainingUnread,
          chronoUnread,
          userScrolled: unreadUserScrolledRef.current,
        });
      }
      unreadUserScrolledRef.current = false;
      markCaughtUpToLatest();
      setJumpFabVisible(false);
      return;
    }

    if (!isPreview) {
      pushUnreadBadge(badgeCount);
    }
  }, [
    getScrollCtx,
    hasNewer,
    isPreview,
    markCaughtUpToLatest,
    pushUnreadBadge,
    setJumpFabVisible,
    viewerKey,
  ]);

  const estimatePostHeight = useCallback((post: FamilyPost) => {
    return estimateFeedItemSize(0, { kind: 'post', key: `estimate-${post.id}`, post });
  }, []);

  const scheduleFeedMediaWarmup = useCallback(
    (scrollingUp = false) => {
      if (!feedReadyRef.current || isPreview) return;
      const { root } = getScrollCtx();
      const list = postsRef.current;
      if (!root || list.length === 0) return;

      const anchor = findVisiblePostAnchorIndex(root, list, estimatePostHeight);
      warmupFamilyPostsWindowDirectional(
        list,
        anchor,
        FAMILY_FEED_MEDIA_WARM_POSTS_BEFORE,
        FAMILY_FEED_MEDIA_WARM_POSTS_AFTER,
        scrollingUp,
      );
    },
    [estimatePostHeight, getScrollCtx, isPreview],
  );

  const tryProactiveHistoryLoad = useCallback(() => {
    if (isPreview || !feedReadyRef.current || !historyReadyRef.current) return;
    if (pinNavigateRef.current || commentsOpenRef.current || notificationsOpenRef.current) return;
    if (!hasMoreRef.current || isValidatingRef.current || loadingHistoryRef.current) return;

    const { root, lenis } = getScrollCtx();
    if (!root || root.scrollTop > FAMILY_FEED_HISTORY_PREFETCH_SCROLL_PX) return;

    const now = Date.now();
    if (now - lastHistoryPrefetchAtRef.current < FAMILY_FEED_HISTORY_PREFETCH_COOLDOWN_MS) return;
    lastHistoryPrefetchAtRef.current = now;

    loadingHistoryRef.current = true;
    scrollRestoreRef.current = captureFeedScrollRestore(root, lenis);
    loadMore();
    if (hasNewer) isJumpedAwayRef.current = true;
  }, [getScrollCtx, hasNewer, isPreview, loadMore]);

  const handleFeedWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (Math.abs(event.deltaY) < 1) return;
      markFeedUserScrollIntent(event.deltaY < 0);
    },
    [markFeedUserScrollIntent],
  );

  const handleFeedTouchMove = useCallback(() => {
    // Direction is confirmed by the following native scroll event. Suppressing here
    // closes the small race where ResizeObserver fires between touchmove and scroll.
    markFeedUserScrollIntent();
  }, [markFeedUserScrollIntent]);

  const handleFeedKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
      if (!scrollKeys.has(event.key)) return;
      const movingAway =
        event.key === 'ArrowUp' ||
        event.key === 'PageUp' ||
        event.key === 'Home' ||
        (event.key === ' ' && event.shiftKey);
      markFeedUserScrollIntent(movingAway);
    },
    [markFeedUserScrollIntent],
  );

  useEffect(() => {
    if (!feedReady || isPreview || initialMediaWarmDoneRef.current) return;
    const list = postsRef.current;
    if (list.length === 0) return;
    initialMediaWarmDoneRef.current = true;
    const n = FAMILY_FEED_INITIAL_WARM_POST_COUNT;
    const tail = Math.max(0, list.length - n);
    warmupFamilyPostsMedia(list, tail, Math.min(n, list.length));
  }, [feedReady, isPreview, posts.length]);

  const handleFeedScroll = useCallback(() => {
    if (unreadSplitRef.current != null && !unreadBootLockRef.current) {
      unreadUserScrolledRef.current = true;
    }
    const { root: currentRoot } = getScrollCtx();
    if (
      currentRoot &&
      performance.now() < userScrollQuietUntilRef.current &&
      currentRoot.scrollTop < lastScrollTopRef.current - 2
    ) {
      // Scroll events also cover keyboard and touch momentum after the last touchmove.
      markFeedUserScrollIntent(true);
    }
    if (pinNavigateRef.current) return;

    if (mediaWarmupRafRef.current == null) {
      mediaWarmupRafRef.current = requestAnimationFrame(() => {
        mediaWarmupRafRef.current = null;
        const { root } = getScrollCtx();
        if (root) {
          const scrollTop = root.scrollTop;
          const scrollingUp = scrollTop < lastScrollTopRef.current - 6;
          lastScrollTopRef.current = scrollTop;
          scheduleFeedMediaWarmup(scrollingUp);
          if (scrollingUp) tryProactiveHistoryLoad();
        }
      });
    }
    if (scrollAnchorRafRef.current != null) return;
    scrollAnchorRafRef.current = requestAnimationFrame(() => {
      scrollAnchorRafRef.current = null;
      updateAnchoredToBottom();
    });
  }, [
    getScrollCtx,
    markFeedUserScrollIntent,
    scheduleFeedMediaWarmup,
    tryProactiveHistoryLoad,
    updateAnchoredToBottom,
  ]);

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
        if (!root) return false;
        const el = document.getElementById(`family-post-${postId}`);

        if (el) {
          scrollFeedToElement(el, behavior, { root, lenis, align, padding: align === 'end' ? 16 : 20 });
          anchoredToBottomRef.current = false;
          if (shouldHighlight) highlight(el);
          return true;
        }

        const index = feedItemsRef.current.findIndex(
          (item) => item.kind === 'post' && item.post.id === postId,
        );
        if (index >= 0) {
          virtualListRef.current?.scrollToIndex(index, { align });
          anchoredToBottomRef.current = false;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const scrolled = document.getElementById(`family-post-${postId}`);
              if (scrolled && shouldHighlight) highlight(scrolled);
            });
          });
          return true;
        }

        return false;
      };

      if (tryScroll()) return;

      const waitForFrame = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

      // Give React a tick to actually start the fetch after loadMore()/setSize() before
      // polling isValidating — polling immediately raced the state update and could
      // resolve before the request even began.
      const waitForValidateSettle = async () => {
        await waitForFrame();
        await new Promise<void>((resolve) => {
          const wait = () => {
            if (!isValidatingRef.current) resolve();
            else window.setTimeout(wait, 50);
          };
          wait();
        });
      };

      pinNavigateRef.current = true;
      familyFeedDebug.mark(`scrollToPost:${postId}`);

      // Nearby posts: a couple of cheap "load one older page" tries before falling back
      // to a direct jump fetch — avoids a network round trip for posts just outside the
      // currently loaded window.
      const NEARBY_ATTEMPTS = 2;
      let attempts = 0;
      while (attempts < NEARBY_ATTEMPTS && hasMoreRef.current) {
        loadingHistoryRef.current = true;
        loadMore();
        attempts += 1;
        await waitForValidateSettle();

        if (postsRef.current.some((post) => post.id === postId)) {
          await waitForFrame();
          if (tryScroll()) {
            pinNavigateRef.current = false;
            familyFeedDebug.measure(`scrollToPost:${postId}`, 'scroll', { postId, mode: 'nearby' });
            return;
          }
        }
      }

      if (!postsRef.current.some((post) => post.id === postId)) {
        // Far away (e.g. an old pinned post, or a very active feed) — fetch a window
        // centered on the target directly instead of paginating backward page-by-page.
        try {
          familyFeedDebug.info('scroll', 'jump to post (far)', { postId });
          const { hasNewer } = await jumpToPost(postId);
          isJumpedAwayRef.current = hasNewer;
          await waitForFrame();
        } catch (err) {
          familyFeedDebug.error('scroll', 'jump to post failed', { postId, error: String(err) });
          pinNavigateRef.current = false;
          familyFeedDebug.measure(`scrollToPost:${postId}`, 'scroll', { postId, mode: 'jump-failed' });
          return;
        }
      }

      pinNavigateRef.current = false;
      familyFeedDebug.measure(`scrollToPost:${postId}`, 'scroll', { postId, mode: 'jump' });
      if (!tryScroll()) {
        familyFeedDebug.warn('scroll', 'jump landed but target DOM missing', { postId });
      }
    },
    [getScrollCtx, jumpToPost, loadMore],
  );

  const openReplyTarget = useCallback(
    (target: { postId: number; commentId?: number | null }) => {
      void (async () => {
        await scrollToPost(target.postId, { behavior: 'smooth', highlight: true });
        openComments({
          postId: target.postId,
          focusCommentId: target.commentId ?? null,
          onCommentAdded: () => {},
        });
      })();
    },
    [openComments, scrollToPost],
  );

  useEffect(() => {
    onRegisterScrollToPost?.(scrollToPost);
    return () => onRegisterScrollToPost?.(null);
  }, [onRegisterScrollToPost, scrollToPost]);

  const focusedPostRef = useRef<number | null>(null);
  const deepLinkPostId = useMemo(() => {
    const fromQuery = parseFamilyPostId(searchParams.get('post'));
    if (fromQuery) return fromQuery;
    if (focusPostId && focusPostId > 0) return focusPostId;
    return null;
  }, [focusPostId, searchParams]);

  useEffect(() => {
    if (!deepLinkPostId) return;
    if (focusedPostRef.current === deepLinkPostId) return;
    if (isLoading && posts.length === 0) return;

    focusedPostRef.current = deepLinkPostId;
    void scrollToPost(deepLinkPostId, { behavior: 'auto', highlight: true });
  }, [deepLinkPostId, isLoading, posts.length, scrollToPost]);

  useEffect(() => {
    if (isValidating) return;
    if (!scrollRestoreRef.current) {
      loadingHistoryRef.current = false;
      return;
    }
    // Fetch ended without a length change — drop the pin after layout has had a
    // chance to claim a successful prepend. Never clear mid-settle.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (historySettleActiveRef.current) return;
        scrollRestoreRef.current = null;
        loadingHistoryRef.current = false;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isValidating]);

  /**
   * Older pages arrive as a prepend. At scrollTop≈0 the viewport can land on the
   * newly loaded oldest posts unless we restore the pre-fetch anchor.
   *
   * Always restore once in layout. If the user is still flinging, keep the
   * snapshot and settle after quiet — never drop the pin early (that caused the
   * "jumped to top after load" feel on mobile).
   */
  useLayoutEffect(() => {
    const snapshot = scrollRestoreRef.current;
    virtualListRef.current?.measureNewRows();
    if (!snapshot) return;

    restoreFeedScrollPosition(snapshot, getScrollCtx());

    const gen = ++historySettleGenRef.current;
    historySettleActiveRef.current = true;
    let waitTimer: number | null = null;

    const finish = () => {
      if (gen !== historySettleGenRef.current) return;
      historySettleActiveRef.current = false;
      scrollRestoreRef.current = null;
      loadingHistoryRef.current = false;
    };

    const runSettle = () => {
      if (gen !== historySettleGenRef.current) return;
      void restoreFeedScrollPositionUntilSettled(snapshot, {
        getScrollCtx,
        maxPasses: 5,
        isCancelled: () =>
          gen !== historySettleGenRef.current ||
          performance.now() < userScrollQuietUntilRef.current,
        onPass: () => {
          virtualListRef.current?.measureNewRows();
        },
      }).finally(finish);
    };

    const waitForQuietThenSettle = () => {
      if (gen !== historySettleGenRef.current) return;
      if (performance.now() < userScrollQuietUntilRef.current) {
        waitTimer = window.setTimeout(waitForQuietThenSettle, 48);
        return;
      }
      runSettle();
    };

    if (performance.now() < userScrollQuietUntilRef.current) {
      waitTimer = window.setTimeout(waitForQuietThenSettle, 48);
    } else {
      runSettle();
    }

    return () => {
      if (waitTimer != null) window.clearTimeout(waitTimer);
    };
  }, [getScrollCtx, posts.length]);

  // Keep catching up to bottom after media/layout settles (caught-up sessions only).
  // Do NOT depend on unreadSplitId — clearing the split must not re-trigger tip scroll.
  useEffect(() => {
    if (!feedReady || isPreview || !initialScrollDoneRef.current) return;
    if (unreadSplitRef.current != null || unreadBootLockRef.current) return;
    if (!anchoredToBottomRef.current) return;
    if (loadingHistoryRef.current || scrollRestoreRef.current) return;
    const t1 = window.setTimeout(() => {
      if (unreadBootLockRef.current || unreadSplitRef.current != null) return;
      if (loadingHistoryRef.current || scrollRestoreRef.current) return;
      if (performance.now() < userScrollQuietUntilRef.current) return;
      if (anchoredToBottomRef.current) scrollToLatestReliable('auto');
    }, 200);
    const t2 = window.setTimeout(() => {
      if (unreadBootLockRef.current || unreadSplitRef.current != null) return;
      if (loadingHistoryRef.current || scrollRestoreRef.current) return;
      if (performance.now() < userScrollQuietUntilRef.current) return;
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
        unreadUserScrolledRef.current = false;
        setUnreadSplitId(lastRead);
        const localCount = countUnreadPosts(posts, lastRead);
        familyFeedDebug.info('boot', 'unread landing path', {
          lastRead,
          localCount,
          firstUnread: firstUnreadPostId(posts, lastRead),
        });
        setUnreadDividerCount(Math.max(localCount, 1));
        pushUnreadBadge(Math.max(localCount, 1));
        void getFeedUnreadSummary(lastRead, getUnreadSummaryEtag())
          .then((result) => {
            const summary = result.notModified
              ? getCachedUnreadSummary()
              : rememberUnreadSummary(result.data, result.etag);
            const apiCount = summary.unread_count;
            familyFeedDebug.info('boot', 'api unread summary', {
              afterId: lastRead,
              apiCount,
              latest: summary.latest_post_id,
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
        // historyReady enabled in revealFeed after unread land completes
        return;
      }

      familyFeedDebug.info('boot', 'caught-up path → tip', { latestId });
      initialScrollDoneRef.current = true;

      if (!isPreview) {
        setLastReadPostId(viewerKey, latestId);
      }

      // historyReady enabled in revealFeed after tip scroll
      anchoredToBottomRef.current = true;
      unreadBootLockRef.current = false;
      // Keep sticking briefly through image decode / pinned chrome after reveal.
      tipSettleUntilRef.current = performance.now() + 1000;
      scrollToLatestReliable('auto');
      scheduleRevealFeed(160);
      return;
    }

    if (!historyReadyRef.current && feedReady) {
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
        const { root } = getScrollCtx();
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
          scroll: Math.round(root.scrollTop),
          limit: root.scrollHeight - root.clientHeight,
        });
        return { root, el, drift };
      };

      const settle = async () => {
        const before = measure('before pin');
        if (!before) return;
        await pinFeedElementBottomUntilSettled(before.el, {
          root: before.root,
          lenis: null,
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

      const { root, lenis } = getScrollCtx();
      if (root && unreadSplitRef.current != null) {
        const lastRead = unreadSplitRef.current;
        const distanceFromBottom = lenis
          ? getLenisDistanceFromBottom(lenis)
          : getFeedDistanceFromBottom(root);
        const below = countUnreadStillBelow(
          postsRef.current,
          lastRead,
          root,
          distanceFromBottom,
        );
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
      unreadUserScrolledRef.current = false;
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

  // Seed max id before first paint of cards so remount never animates every post in.
  useLayoutEffect(() => {
    if (posts.length === 0) return;
    maxPostIdRef.current = Math.max(
      maxPostIdRef.current,
      posts.reduce((max, post) => Math.max(max, post.id), 0),
    );
  }, [posts]);

  // After reveal, remasure once more when layout/fonts are live (leave→return remount).
  useLayoutEffect(() => {
    if (!feedReady) return;
    const timer = window.setTimeout(() => {
      if (calibrateFeedEstimateMetrics()) virtualListRef.current?.measureNewRows();
      virtualListRef.current?.remasureVisible();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [feedReady]);

  // Rotation changes bubble width, which invalidates estimates. Do not listen to
  // generic `resize` — mobile URL-bar show/hide fires it and remasure thrash jumps
  // the feed while the user is scrolling up.
  useEffect(() => {
    if (!feedReady) return;
    const onOrientation = () => {
      if (performance.now() < userScrollQuietUntilRef.current) return;
      if (!calibrateFeedEstimateMetrics()) return;
      virtualListRef.current?.measureNewRows();
    };
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [feedReady]);

  // Keep jump FAB badge aligned after feed mutates (realtime) — count what's still below.
  useEffect(() => {
    if (isPreview || !initialScrollDoneRef.current) return;
    if (unreadBootLockRef.current) return;
    if (anchoredToBottomRef.current) return;
    const { root, lenis } = getScrollCtx();
    const lastRead = unreadSplitRef.current ?? resolveUnreadCursor(viewerKey, posts);
    if (lastRead <= 0) return;
    const chrono = countUnreadPosts(posts, lastRead);
    if (chrono <= 0) {
      pushUnreadBadge(0);
      return;
    }
    if (root) {
      const distanceFromBottom = lenis
        ? getLenisDistanceFromBottom(lenis)
        : getFeedDistanceFromBottom(root);
      const below = countUnreadStillBelow(posts, lastRead, root, distanceFromBottom);
      // Track remaining-below only — never re-inflate to full chrono after the user has scrolled.
      pushUnreadBadge(below);
    } else {
      pushUnreadBadge(chrono);
    }
    if (unreadSplitRef.current == null) {
      unreadSplitRef.current = lastRead;
      unreadUserScrolledRef.current = false;
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

    const rootMargin = familyFeedTopSentinelRootMargin(
      root.clientHeight > 0 ? root.clientHeight : window.innerHeight,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        // Wait until boot tip/unread scroll finished — otherwise the top sentinel
        // fires at scrollTop≈0 and loadMore pins the feed on oldest posts.
        if (!feedReadyRef.current || !historyReadyRef.current || pinNavigateRef.current) return;
        if (!entries[0]?.isIntersecting || isValidatingRef.current || loadingHistoryRef.current) {
          return;
        }
        if (!hasMoreRef.current) return;

        const ctx = getScrollCtx();
        const scrollRoot = ctx.root;
        if (!scrollRoot) return;

        loadingHistoryRef.current = true;
        // Pin the first visible post — at the ceiling, scrollTop stays ~0 without this.
        scrollRestoreRef.current = captureFeedScrollRestore(scrollRoot, ctx.lenis);
        loadMore();
        // If tip page was pruned by MAX_FEED_PAGES, treat as jumped-away.
        if (hasNewer) isJumpedAwayRef.current = true;
      },
      { root, rootMargin, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [commentsTarget, getScrollCtx, hasMore, hasNewer, loadMore, notificationsOpen, posts.length]);

  // After a far jump: load newer posts when approaching the live end (bottom).
  useEffect(() => {
    const { root } = getScrollCtx();
    const sentinel = newerSentinelRef.current;
    const canLoadNewer = isJumpedAwayRef.current || hasNewer;
    if (!root || !sentinel || !canLoadNewer || commentsTarget || notificationsOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingNewerRef.current || pinNavigateRef.current) return;
        loadingNewerRef.current = true;
        // Newer posts append at the chronological end — nothing above the viewport moves.
        void loadNewer()
          .then((didLoad) => {
            if (!hasNewer && !didLoad) {
              isJumpedAwayRef.current = false;
            }
          })
          .finally(() => {
            loadingNewerRef.current = false;
          });
      },
      { root, rootMargin: '0px 0px 320px 0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [commentsTarget, getScrollCtx, hasNewer, loadNewer, notificationsOpen, posts.length]);

  /** Stable identity — an inline arrow here defeated PostCard's memo on every render. */
  const unlockGuestPost = useCallback(() => {
    handleGuestGate('morePosts');
  }, [handleGuestGate]);

  const renderFeedItem = useCallback(
    (item: FeedListItem) => {
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

      if (item.kind === 'install-promo') {
        return <FamilyInstallPromoInline key={item.key} />;
      }

      return (
        <PostCard
          key={item.key}
          anchorId={`family-post-${item.post.id}`}
          post={item.post}
          memberCount={resolvedMemberCount}
          isStaff={isStaff}
          previewMode={previewMode}
          viewerKey={viewerKey}
          onGuestGate={scrollToPreviewCta}
          animateEnter={animateEnter}
          onOpenComments={isPreview ? undefined : openPostComments}
          onOpenReplyTarget={isPreview ? undefined : openReplyTarget}
          guestBlurred={guestBlurredPostIds.has(item.post.id)}
          onGuestUnlock={unlockGuestPost}
        />
      );
    },
    [
      feedReady,
      guestBlurredPostIds,
      unlockGuestPost,
      isPreview,
      isStaff,
      openPostComments,
      openReplyTarget,
      previewMode,
      resolvedMemberCount,
      scrollToPreviewCta,
      viewerKey,
    ],
  );

  const showFeed = !commentsTarget && !notificationsOpen;
  const commentsPost = commentsTarget
    ? posts.find((post) => post.id === commentsTarget.postId)
    : undefined;
  const commentsEnabled = commentsPost ? commentsPost.comments_enabled !== false : true;

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
        guestStoriesLocked={previewMode === 'guest'}
        initialBranding={initialBranding}
        notificationsActive={notificationsOpen}
        isLoggedIn={previewMode !== 'guest'}
        needsName={needsName}
        initialFirstName={initialFirstName}
        initialLastName={initialLastName}
        onOpenNotifications={onOpenNotifications}
        onCloseNotifications={onCloseNotifications}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="family-feed-pane relative flex min-h-0 min-w-0 flex-1 flex-col">
          {!isPreview && notificationsOpen ? (
            <div className="family-feed-overlay absolute inset-0 z-50 flex min-h-0 flex-col overflow-hidden">
              <FamilyNotificationsPanel
                enabled={!isPreview}
                onClose={() => onCloseNotifications?.()}
                className="flex min-h-0 flex-1 flex-col"
              />
            </div>
          ) : null}

          {commentsTarget ? (
            <FeedCommentsPanel
              postId={commentsTarget.postId}
              focusCommentId={commentsTarget.focusCommentId}
              allowPhoneNumbers={isStaff}
              commentsEnabled={commentsEnabled}
              onClose={closeComments}
              onCommentAdded={commentsTarget.onCommentAdded}
              className="flex min-h-0 flex-1 flex-col"
            />
          ) : null}

          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col',
              !showFeed && 'invisible pointer-events-none absolute inset-0 z-0',
            )}
            aria-hidden={!showFeed}
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

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              {!feedReady ? (
                <FamilyFeedBootSkeleton className="absolute inset-0 z-20 overflow-hidden bg-transparent" />
              ) : null}
              <FamilyFeedScroll
                ref={feedScrollRef}
                onScroll={handleFeedScroll}
                onWheel={handleFeedWheel}
                onTouchMove={handleFeedTouchMove}
                onKeyDown={handleFeedKeyDown}
                className={cn(!feedReady && 'invisible')}
                style={chromeInset > 0 ? { paddingTop: chromeInset } : undefined}
              >
              <div ref={feedContentRef} className="family-feed-content mx-auto flex w-full max-w-[680px] flex-col">
              <FamilyInstallTopBanner />
              {isPreview && previewMode && posts.length > 0 && (
                <div className="pt-4 sm:pt-5">
                  <FeedPreviewIntro mode={previewMode} />
                </div>
              )}
              {posts.length === 0 && isLoading && !initialPage ? (
                <div className="min-h-[40vh] lg:min-h-[50vh]" aria-hidden />
              ) : posts.length === 0 ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:min-h-[50vh]">
                  <p className="family-feed-empty max-w-sm text-sm lg:text-[15px]">
                    {meta?.family_inactive
                      ? (meta.inactive_message || 'خانواده غیرفعال شده است')
                      : 'هنوز پستی منتشر نشده. به‌زودی داداش بهرام اولین پیام رو می‌فرسته.'}
                  </p>
                </div>
              ) : (
                <div className="family-feed-list">
                  {!isPreview && hasMore && (
                    <div
                      ref={topSentinelRef}
                      // Fixed reserved height so spinner appearance does not shift scroll.
                      className="flex min-h-16 items-center justify-center py-4"
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
                  <VirtualFeedList
                    ref={virtualListRef}
                    items={feedItems}
                    gap={8}
                    overscan={FAMILY_FEED_VIRTUAL_OVERSCAN}
                    // FeedView owns guarded tip-following; a second virtualizer owner can
                    // move the viewport while the user is reading older posts.
                    followOnAppend={false}
                    className="family-feed-list__virtual"
                    getScrollElement={() => feedScrollRef.current?.getScrollElement() ?? null}
                    estimateSize={estimateFeedItemSize}
                    renderItem={renderFeedItem}
                  />
                  {!isPreview && (hasNewer || isJumpedAwayRef.current) ? (
                    <div ref={newerSentinelRef} className="h-8 shrink-0" aria-hidden />
                  ) : null}
                  {isPreview && previewMode && (
                    <FeedPreviewGate mode={previewMode} />
                  )}
                  <div ref={bottomAnchorRef} aria-hidden className="h-px shrink-0" />
                </div>
              )}
            </div>
          </FamilyFeedScroll>
            </div>

          {!isPreview && (
            <FeedJumpToLatest
              ref={jumpFabCallbackRef}
              onClick={() => {
                unreadBootLockRef.current = false;
                anchoredToBottomRef.current = true;
                jumpToLatestInFlightRef.current = true;
                tipSettleUntilRef.current = performance.now() + 900;
                // Clear unread session first so scrollToLatestReliable is not cancelled.
                unreadSplitRef.current = null;
                setUnreadSplitId(null);
                setUnreadDividerCount(0);
                setJumpFabVisible(false);

                // Loaded window is a "jump to post" slice — the tip isn't loaded, so
                // refetch it before trying to scroll to it.
                if (isJumpedAwayRef.current) {
                  isJumpedAwayRef.current = false;
                  familyFeedDebug.info('scroll', 'return to live after jump');
                  void revalidateTip().then(async () => {
                    // Let React flush so postsRef reflects the freshly fetched tip page.
                    await new Promise<void>((resolve) => {
                      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
                    });
                    markCaughtUpToLatest();
                    scrollToLatestReliable('smooth');
                  });
                  return;
                }

                markCaughtUpToLatest();
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
