'use client';

import { useEffect, useRef } from 'react';
import { PostCard } from '@/components/family/PostCard';
import { useFamilyFeed } from '@/lib/family/hooks/useFamilyFeed';

export function FeedView() {
  const { posts, isLoading, hasMore, loadMore, isValidating } = useFamilyFeed();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-3 px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
        {[0, 1, 2].map((i) => (
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
    <div className="space-y-3 px-3 py-4 sm:space-y-3.5 sm:px-4 lg:px-5 lg:py-5">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-bone/40">
          {isValidating ? 'در حال بارگذاری…' : ''}
        </div>
      )}
    </div>
  );
}
