'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/cn';
import { recordPostView } from '@/lib/family/api';
import { formatPostBubbleMeta, formatPostDateTime } from '@/lib/family/datetime';
import { displayPostViews } from '@/lib/family/displayViews';

const VIEW_RECORD_DELAY_MS = 1500;

export function PostMetaRow({
  postId,
  publishedAt,
  initialViews,
  trackView = false,
  authorName,
  variant = 'default',
  className,
}: {
  postId: number;
  publishedAt: string | null;
  initialViews: number;
  trackView?: boolean;
  authorName?: string;
  variant?: 'default' | 'bubble';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);
  const [realViews, setRealViews] = useState(initialViews);
  const views = displayPostViews(realViews);

  useEffect(() => {
    setRealViews(initialViews);
  }, [initialViews]);

  useEffect(() => {
    if (!trackView || recorded.current || !ref.current) return;

    const node = ref.current;
    let timer: number | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.45) {
          if (timer != null) window.clearTimeout(timer);
          return;
        }

        if (timer != null) return;

        timer = window.setTimeout(() => {
          if (recorded.current) return;
          recorded.current = true;
          observer.disconnect();
          void recordPostView(postId).then((res) => {
            setRealViews(res.data.views);
          });
        }, VIEW_RECORD_DELAY_MS);
      },
      { threshold: [0.45, 0.6] },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer != null) window.clearTimeout(timer);
    };
  }, [postId, trackView]);

  if (variant === 'bubble') {
    const metaCaption = formatPostBubbleMeta(publishedAt, authorName);

    return (
      <div ref={ref} dir="ltr" className={cn('family-post-bubble__meta-row', className)}>
        {views > 0 && (
          <span className="family-post-bubble__views inline-flex items-center gap-0.5 tabular-nums" title="بازدید">
            <Eye className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden />
            {views.toLocaleString('en-US')}
          </span>
        )}
        {views > 0 && metaCaption ? (
          <span className="family-post-bubble__meta-sep" aria-hidden>
            ·
          </span>
        ) : null}
        {metaCaption ? (
          publishedAt ? (
            <time dateTime={publishedAt} className="family-post-bubble__meta-caption tabular-nums">
              {metaCaption}
            </time>
          ) : (
            <span className="family-post-bubble__meta-caption">{metaCaption}</span>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('flex h-5 shrink-0 items-center gap-1.5', className)}>
      {views > 0 && (
        <span
          className="flex items-center gap-0.5 text-[11px] tabular-nums text-[var(--family-tg-subtitle)]"
          title="بازدید"
        >
          <Eye className="h-3 w-3 shrink-0 opacity-60" strokeWidth={1.75} aria-hidden />
          {views.toLocaleString('fa-IR')}
        </span>
      )}
      {publishedAt && (
        <time dateTime={publishedAt} className="text-[11px] tabular-nums text-[var(--family-tg-subtitle)]">
          {formatPostDateTime(publishedAt)}
        </time>
      )}
    </div>
  );
}
