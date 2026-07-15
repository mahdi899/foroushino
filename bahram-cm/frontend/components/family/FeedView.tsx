'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FeedDateSeparator } from '@/components/family/FeedDateSeparator';
import { FeedPreviewGate, FeedPreviewIntro } from '@/components/family/FeedPreviewIntro';
import { FamilyBrandingSidebar } from '@/components/family/FamilyBrandingSidebar';
import { FamilyNotificationsPanel } from '@/components/family/FamilyNotificationsPanel';
import { FeedCommentsPanel } from '@/components/family/FeedCommentsPanel';
import { FamilyFeedChrome } from '@/components/family/FamilyFeedChrome';
import { PostCard } from '@/components/family/PostCard';
import { useFamilyFeed } from '@/lib/family/hooks/useFamilyFeed';
import { formatFeedDaySeparator, getPostDayKey } from '@/lib/family/datetime';
import type { FamilyComment, FamilyFeedResponse, FamilyPost } from '@/lib/family/types';

type FeedItem =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'post'; key: string; post: FamilyPost };

type CommentsTarget = {
  postId: number;
  onCommentAdded: (comment: FamilyComment) => void;
};

type MainView = 'feed' | 'notifications';

function buildFeedItems(posts: FamilyPost[]): FeedItem[] {
  const items: FeedItem[] = [];
  let lastDayKey: string | null = null;

  for (const post of posts) {
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
}) {
  const isPreview = Boolean(previewMode);
  const effectivePreviewMode = previewMode ?? 'guest';
  const feedScope: 'guest' | 'member' = isPreview ? 'guest' : 'member';
  const initialPage = initialFeed ? { data: initialFeed.data, meta: initialFeed.meta } : null;

  const { posts, meta, isLoading, hasMore, loadMore, isValidating } = useFamilyFeed(
    feedScope,
    initialPage,
    viewerKey,
  );
  const resolvedMemberCount = meta?.member_count ?? memberCount;
  const isStaff = meta?.is_staff ?? false;

  const scrollToPreviewCta = useCallback(() => {
    const id = effectivePreviewMode === 'join' ? 'family-join-cta' : 'family-guest-cta';
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [effectivePreviewMode]);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const feedContentRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);
  const anchoredToBottomRef = useRef(false);
  const historyReadyRef = useRef(false);
  const loadingHistoryRef = useRef(false);
  const pinNavigateRef = useRef(false);
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const [mainView, setMainView] = useState<MainView>('feed');
  const feedItems = useMemo(() => buildFeedItems(posts), [posts]);
  const hasMoreRef = useRef(hasMore);
  const postsRef = useRef(posts);
  const isValidatingRef = useRef(isValidating);

  useEffect(() => {
    hasMoreRef.current = hasMore;
    postsRef.current = posts;
    isValidatingRef.current = isValidating;
  }, [hasMore, posts, isValidating]);

  const openComments = useCallback(
    (target: CommentsTarget) => {
      setMainView('feed');
      onOpenComments?.(target);
    },
    [onOpenComments],
  );

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
    const root = feedScrollRef.current;
    if (!root) return;
    root.scrollTo({ top: root.scrollHeight, behavior });
    anchoredToBottomRef.current = true;
  }, []);

  const updateAnchoredToBottom = useCallback(() => {
    const root = feedScrollRef.current;
    if (!root) return;
    const distanceFromBottom = root.scrollHeight - root.clientHeight - root.scrollTop;
    anchoredToBottomRef.current = distanceFromBottom < 80;
  }, []);

  useEffect(() => {
    const root = feedScrollRef.current;
    if (!root) return;

    const onScroll = () => {
      if (pinNavigateRef.current) return;
      updateAnchoredToBottom();
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [updateAnchoredToBottom, posts.length, commentsTarget, mainView]);

  const scrollToPost = useCallback(
    async (postId: number) => {
      const highlight = (el: HTMLElement) => {
        el.classList.add('family-post--highlight');
        window.setTimeout(() => el.classList.remove('family-post--highlight'), 2200);
      };

      const tryScroll = (): boolean => {
        const root = feedScrollRef.current;
        const el = document.getElementById(`family-post-${postId}`);
        if (!root || !el) return false;

        const rootRect = root.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetTop = elRect.top - rootRect.top + root.scrollTop - 20;
        root.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        anchoredToBottomRef.current = false;
        highlight(el);
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
    [loadMore],
  );

  useEffect(() => {
    onRegisterScrollToPost?.(scrollToPost);
    return () => onRegisterScrollToPost?.(null);
  }, [onRegisterScrollToPost, scrollToPost]);

  useEffect(() => {
    if (!isValidating) loadingHistoryRef.current = false;
  }, [isValidating]);

  useLayoutEffect(() => {
    const root = feedScrollRef.current;
    if (!root || !scrollRestoreRef.current) return;

    const { height, top } = scrollRestoreRef.current;
    const delta = root.scrollHeight - height;
    root.scrollTop = top + delta;
    scrollRestoreRef.current = null;
  }, [posts.length]);

  useLayoutEffect(() => {
    if (isLoading || posts.length === 0) return;

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      scrollToLatest('auto');
      const frame = requestAnimationFrame(() => {
        scrollToLatest('auto');
        requestAnimationFrame(() => {
          scrollToLatest('auto');
          historyReadyRef.current = true;
        });
      });
      return () => cancelAnimationFrame(frame);
    }

    // If length changed before historyReady was flipped, unlock without jumping.
    if (!historyReadyRef.current) {
      historyReadyRef.current = true;
    }
  }, [isLoading, posts.length, scrollToLatest]);

  // Keep sticky bottom only while the user is already near the end.
  // Never force-jump when they are reading older posts / interacting mid-feed.
  useEffect(() => {
    const content = feedContentRef.current;
    if (!content || posts.length === 0) return;

    const observer = new ResizeObserver(() => {
      if (!historyReadyRef.current) {
        scrollToLatest('auto');
        return;
      }
      if (anchoredToBottomRef.current && !pinNavigateRef.current) {
        scrollToLatest('auto');
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [posts.length, scrollToLatest]);

  useEffect(() => {
    const root = feedScrollRef.current;
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel || !hasMore || mainView !== 'feed' || commentsTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!historyReadyRef.current || !anchoredToBottomRef.current || pinNavigateRef.current) return;
        if (!entries[0]?.isIntersecting || isValidating || loadingHistoryRef.current) return;

        const distanceFromBottom = root.scrollHeight - root.clientHeight - root.scrollTop;
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
  }, [hasMore, loadMore, isValidating, mainView, commentsTarget, posts.length]);

  const showFeed = mainView === 'feed' && !commentsTarget;

  return (
    <div className="flex h-full min-h-0 flex-1">
      <FamilyBrandingSidebar
        memberCount={resolvedMemberCount}
        isMember={!isPreview}
        notificationsActive={mainView === 'notifications'}
        onOpenNotifications={() => {
          onCloseComments?.();
          setMainView('notifications');
        }}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {!isPreview && (
          <FamilyNotificationsPanel
            enabled={!isPreview}
            onClose={() => setMainView('feed')}
            className={mainView === 'notifications' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
          />
        )}

        {commentsTarget && (
          <FeedCommentsPanel
            postId={commentsTarget.postId}
            onClose={() => onCloseComments?.()}
            onCommentAdded={commentsTarget.onCommentAdded}
            className="flex min-h-0 flex-1 flex-col"
          />
        )}

        <div className={showFeed ? 'relative flex min-h-0 min-w-0 flex-1 flex-col' : 'hidden'}>
          <div className="hidden shrink-0 lg:block">
            <FamilyFeedChrome showPinned={showPinned} showNowPlaying={false} onScrollToPost={scrollToPost} />
          </div>

          <FamilyFeedChrome
            showPinned={false}
            showNowPlaying
            overlayNowPlaying
          />

          <div
            ref={feedScrollRef}
            className="family-feed-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none]"
          >
            <div ref={feedContentRef} className="mx-auto flex w-full max-w-[680px] flex-col">
              {isPreview && effectivePreviewMode && posts.length > 0 && (
                <div className="pt-4 sm:pt-5">
                  <FeedPreviewIntro mode={effectivePreviewMode} />
                </div>
              )}
              {posts.length === 0 && isLoading && !initialPage ? (
                <div className="min-h-[40vh] lg:min-h-[50vh]" aria-hidden />
              ) : posts.length === 0 ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:min-h-[50vh]">
                  <p className="max-w-sm text-sm text-bone/60 lg:text-[15px]">
                    هنوز پستی منتشر نشده. به‌زودی داداش بهرام اولین پیام رو می‌فرسته.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 px-3 py-4 sm:space-y-3.5 sm:px-4 lg:px-5 lg:py-5">
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
                  {feedItems.map((item) =>
                    item.kind === 'separator' ? (
                      <FeedDateSeparator key={item.key} label={item.label} />
                    ) : (
                      <div key={item.key} id={`family-post-${item.post.id}`} className="scroll-mt-4 rounded-2xl">
                        <PostCard
                          post={item.post}
                          memberCount={resolvedMemberCount}
                          isStaff={isStaff}
                          previewMode={isPreview ? effectivePreviewMode : null}
                          viewerKey={viewerKey}
                          onPreviewInteract={scrollToPreviewCta}
                          onOpenComments={
                            isPreview
                              ? undefined
                              : (handlers) => openComments({ postId: item.post.id, ...handlers })
                          }
                        />
                      </div>
                    ),
                  )}
                  {isPreview && effectivePreviewMode && (
                    <FeedPreviewGate mode={effectivePreviewMode} />
                  )}
                  <div ref={bottomAnchorRef} aria-hidden className="h-px shrink-0" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
