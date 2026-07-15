'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { recordPostView } from '@/lib/family/api';
import { formatPostDateTime } from '@/lib/family/datetime';

export function PostMetaRow({
  postId,
  publishedAt,
  initialViews,
  trackView = false,
}: {
  postId: number;
  publishedAt: string | null;
  initialViews: number;
  trackView?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    setViews(initialViews);
  }, [initialViews]);

  useEffect(() => {
    if (!trackView || recorded.current || !ref.current) return;

    const node = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.45) return;
        recorded.current = true;
        observer.disconnect();
        void recordPostView(postId).then((res) => {
          if (res.data.views > 0) setViews(res.data.views);
        });
      },
      { threshold: [0.45, 0.6] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [postId, trackView]);

  return (
    <div ref={ref} className="flex h-8 shrink-0 items-center gap-2.5">
      {views > 0 && (
        <span className="flex items-center gap-1 text-[11px] tabular-nums text-bone/40" title="بازدید">
          <Eye className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden />
          {views.toLocaleString('fa-IR')}
        </span>
      )}
      {publishedAt && (
        <time dateTime={publishedAt} className="text-[11px] tabular-nums text-bone/40">
          {formatPostDateTime(publishedAt)}
        </time>
      )}
    </div>
  );
}
