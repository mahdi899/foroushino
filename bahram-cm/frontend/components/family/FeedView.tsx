'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FeedDateSeparator } from '@/components/family/FeedDateSeparator';
import { PostCard } from '@/components/family/PostCard';
import { CommentsPage } from '@/components/family/CommentsSheet';
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

export function FeedView() {
  const { posts, isLoading, hasMore, loadMore, isValidating } = useFamilyFeed();
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const [commentsTarget, setCommentsTarget] = useState<CommentsTarget | null>(null);
  const feedItems = useMemo(() => buildFeedItems(posts), [posts]);

  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isValidating) {
          scrollRestoreRef.current = {
            height: document.documentElement.scrollHeight,
            top: window.scrollY,
          };
          loadMore();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, isValidating]);

  useLayoutEffect(() => {
    if (!scrollRestoreRef.current) return;

    const { height, top } = scrollRestoreRef.current;
    const delta = document.documentElement.scrollHeight - height;
    window.scrollTo(0, top + delta);
    scrollRestoreRef.current = null;
  }, [posts.length]);

  useLayoutEffect(() => {
    if (isLoading || posts.length === 0 || initialScrollDoneRef.current) return;

    initialScrollDoneRef.current = true;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
  }, [isLoading, posts.length]);

  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-3 px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5 lg:h-44" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:py-24">
        <p className="max-w-sm text-sm text-bone/60 lg:text-[15px]">
          هنوز پستی منتشر نشده. به‌زودی داداش بهرام اولین پیام رو می‌فرسته.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 px-3 py-4 sm:space-y-3.5 sm:px-4 lg:px-5 lg:py-5">
        {hasMore && (
          <div ref={topSentinelRef} className="py-4 text-center text-xs text-bone/40">
            {isValidating ? 'در حال بارگذاری پست‌های قدیمی‌تر…' : ''}
          </div>
        )}
        {feedItems.map((item) =>
          item.kind === 'separator' ? (
            <FeedDateSeparator key={item.key} label={item.label} />
          ) : (
            <PostCard
              key={item.key}
              post={item.post}
              onOpenComments={(handlers) => setCommentsTarget({ postId: item.post.id, ...handlers })}
            />
          ),
        )}
      </div>

      <AnimatePresence>
        {commentsTarget && (
          <CommentsPage
            postId={commentsTarget.postId}
            onClose={() => setCommentsTarget(null)}
            onCommentAdded={commentsTarget.onCommentAdded}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
