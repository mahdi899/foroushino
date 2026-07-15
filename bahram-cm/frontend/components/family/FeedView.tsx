'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FeedDateSeparator } from '@/components/family/FeedDateSeparator';
import { FamilyBrandingSidebar } from '@/components/family/FamilyBrandingSidebar';
import { FamilyNotificationsPanel } from '@/components/family/FamilyNotificationsPanel';
import { FeedCommentsPanel } from '@/components/family/FeedCommentsPanel';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';
import { PostCard } from '@/components/family/PostCard';
import { useFamilyFeed } from '@/lib/family/hooks/useFamilyFeed';
import { formatFeedDaySeparator, getPostDayKey } from '@/lib/family/datetime';
import type { FamilyComment, FamilyPost } from '@/lib/family/types';

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
  showPinned = false,
  commentsTarget,
  onOpenComments,
  onCloseComments,
}: {
  memberCount?: number;
  showPinned?: boolean;
  commentsTarget?: CommentsTarget | null;
  onOpenComments?: (target: CommentsTarget) => void;
  onCloseComments?: () => void;
}) {
  const { posts, isLoading, hasMore, loadMore, isValidating } = useFamilyFeed();
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const feedContentRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);
  const anchoredToBottomRef = useRef(false);
  const historyReadyRef = useRef(false);
  const loadingHistoryRef = useRef(false);
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const [mainView, setMainView] = useState<MainView>('feed');
  const feedItems = useMemo(() => buildFeedItems(posts), [posts]);

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

  useEffect(() => {
    if (!isValidating) loadingHistoryRef.current = false;
  }, [isValidating]);

  useEffect(() => {
    historyReadyRef.current = false;
  }, []);

  useLayoutEffect(() => {
    const root = feedScrollRef.current;
    if (!root || !scrollRestoreRef.current) return;

    const { height, top } = scrollRestoreRef.current;
    const delta = root.scrollHeight - height;
    root.scrollTop = top + delta;
    scrollRestoreRef.current = null;
  }, [posts.length]);

  useLayoutEffect(() => {
    if (isLoading || posts.length === 0 || initialScrollDoneRef.current) return;

    initialScrollDoneRef.current = true;
    scrollToLatest('auto');
    const frame = requestAnimationFrame(() => {
      scrollToLatest('auto');
      requestAnimationFrame(() => {
        scrollToLatest('auto');
        window.setTimeout(() => {
          historyReadyRef.current = true;
        }, 150);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isLoading, posts.length, scrollToLatest]);

  useEffect(() => {
    const content = feedContentRef.current;
    if (!content || posts.length === 0) return;

    const observer = new ResizeObserver(() => {
      if (!historyReadyRef.current) {
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
        if (!historyReadyRef.current || !anchoredToBottomRef.current) return;
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
        memberCount={memberCount}
        notificationsActive={mainView === 'notifications'}
        onOpenNotifications={() => {
          onCloseComments?.();
          setMainView('notifications');
        }}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <FamilyNotificationsPanel
          onClose={() => setMainView('feed')}
          className={mainView === 'notifications' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
        />

        {commentsTarget && (
          <FeedCommentsPanel
            postId={commentsTarget.postId}
            onClose={() => onCloseComments?.()}
            onCommentAdded={commentsTarget.onCommentAdded}
            className="flex min-h-0 flex-1 flex-col"
          />
        )}

        <div className={showFeed ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'hidden'}>
          {showPinned && (
            <div className="hidden shrink-0 lg:block">
              <PinnedMessageBar onOpenComments={openComments} />
            </div>
          )}

          <div
            ref={feedScrollRef}
            className="family-feed-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
          >
            <div ref={feedContentRef} className="mx-auto flex w-full max-w-[680px] flex-col">
              {isLoading && posts.length === 0 ? (
                <>
                  <div className="family-panel-header flex items-center gap-2 border-b px-3 py-3 sm:px-4 lg:px-5">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80" />
                    <span className="text-[13px] text-bone/45">در حال بارگذاری…</span>
                  </div>
                  <div className="space-y-3 px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="family-skeleton h-40 animate-pulse rounded-2xl lg:h-44" />
                    ))}
                  </div>
                </>
              ) : posts.length === 0 ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:min-h-[50vh]">
                  <p className="max-w-sm text-sm text-bone/60 lg:text-[15px]">
                    هنوز پستی منتشر نشده. به‌زودی داداش بهرام اولین پیام رو می‌فرسته.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 px-3 py-4 sm:space-y-3.5 sm:px-4 lg:px-5 lg:py-5">
                  {hasMore && (
                    <div
                      ref={topSentinelRef}
                      className="flex items-center justify-center gap-2 py-3 text-xs text-bone/45"
                    >
                      {isValidating && posts.length > 0 ? (
                        <>
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-bone/20 border-t-gold/80" />
                          در حال بارگذاری پست‌های قدیمی‌تر…
                        </>
                      ) : (
                        '↑ اسکرول کن — پست‌های قدیمی‌تر بارگذاری می‌شوند'
                      )}
                    </div>
                  )}
                  {feedItems.map((item) =>
                    item.kind === 'separator' ? (
                      <FeedDateSeparator key={item.key} label={item.label} />
                    ) : (
                      <PostCard
                        key={item.key}
                        post={item.post}
                        onOpenComments={(handlers) =>
                          openComments({ postId: item.post.id, ...handlers })
                        }
                      />
                    ),
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
