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
      <div className="space-y-3 px-3 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <p className="text-sm text-bone/60">هنوز پستی منتشر نشده. به‌زودی داداش بهرام اولین پیام رو می‌فرسته.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-3 py-4">
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
