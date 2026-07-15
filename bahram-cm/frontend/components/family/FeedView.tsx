'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FeedDateSeparator } from '@/components/family/FeedDateSeparator';
import { FeedPreviewGate, FeedPreviewIntro } from '@/components/family/FeedPreviewIntro';
import { useFamilyGuestLogin } from '@/components/family/FamilyGuestAuth';
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
  const { openLogin } = useFamilyGuestLogin();

  const { posts, meta, isLoading, hasMore, loadMore, isValidating } = useFamilyFeed(
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
  const scrollStickRafRef = useRef<number | null>(null);
  const scrollAnchorRafRef = useRef<number | null>(null);
  const maxPostIdRef = useRef(0);
  const [mainView, setMainView] = useState<MainView>('feed');
  const [feedInteractive, setFeedInteractive] = useState(false);
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

  const stickToBottomIfAnchored = useCallback(() => {
    const root = feedScrollRef.current;
    if (!root || pinNavigateRef.current) return;

    if (!historyReadyRef.current) {
      root.scrollTop = root.scrollHeight;
      return;
    }

    if (!anchoredToBottomRef.current) return;
    root.scrollTop = root.scrollHeight;
  }, []);

  const scheduleStickToBottom = useCallback(() => {
    if (scrollStickRafRef.current != null) return;
    scrollStickRafRef.current = requestAnimationFrame(() => {
      scrollStickRafRef.current = null;
      stickToBottomIfAnchored();
    });
  }, [stickToBottomIfAnchored]);

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
      if (scrollAnchorRafRef.current != null) return;
      scrollAnchorRafRef.current = requestAnimationFrame(() => {
        scrollAnchorRafRef.current = null;
        updateAnchoredToBottom();
      });
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (scrollAnchorRafRef.current != null) {
        cancelAnimationFrame(scrollAnchorRafRef.current);
        scrollAnchorRafRef.current = null;
      }
    };
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

    const root = feedScrollRef.current;
    if (!root) return;

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      root.scrollTop = root.scrollHeight;
      anchoredToBottomRef.current = true;
      historyReadyRef.current = true;
      maxPostIdRef.current = posts.reduce((max, post) => Math.max(max, post.id), 0);
      queueMicrotask(() => setFeedInteractive(true));
      return;
    }

    if (!historyReadyRef.current) {
      historyReadyRef.current = true;
    }
  }, [isLoading, posts]);

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

        <div className={showFeed ? 'family-feed-pane relative flex min-h-0 min-w-0 flex-1 flex-col' : 'hidden'}>
          <div className="family-feed-chrome-slot hidden shrink-0 lg:block">
            <div className="family-feed-chrome-slot__inner">
              <FamilyFeedChrome showPinned={showPinned} showNowPlaying={false} onScrollToPost={scrollToPost} />
            </div>
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
                      feedInteractive &&
                      item.kind === 'post' &&
                      item.post.id > maxPostIdRef.current;

                    return item.kind === 'separator' ? (
                      <FeedDateSeparator key={item.key} label={item.label} />
                    ) : (
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
          </div>
        </div>
      </div>
    </div>
  );
}
