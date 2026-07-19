'use client';

import dynamic from 'next/dynamic';
import { DeferredWhenVisible } from '@/components/performance/DeferredWhenVisible';

const InsightShareButton = dynamic(
  () => import('@/components/blog/InsightShareButton').then((m) => ({ default: m.InsightShareButton })),
  {
    ssr: false,
    loading: () => (
      <span className="insight-hero-split__share" aria-hidden>
        اشتراک
      </span>
    ),
  },
);

const ContentViewTracker = dynamic(
  () => import('@/components/analytics/ContentViewTracker').then((m) => ({ default: m.ContentViewTracker })),
  { ssr: false },
);

const NewsletterCTA = dynamic(
  () => import('@/components/sections/NewsletterCTA').then((m) => ({ default: m.NewsletterCTA })),
  { ssr: false },
);

export function InsightViewTracker({ slug }: { slug: string }) {
  return <ContentViewTracker type="insight" slug={slug} />;
}

export function InsightShareButtonLazy({
  title,
  text,
}: {
  title: string;
  text?: string | null;
}) {
  return <InsightShareButton title={title} text={text} />;
}

const newsletterFallback = (
  <div className="newsletter-cta-band min-h-[12rem] animate-pulse bg-surface-muted/20" aria-hidden />
);

export function InsightNewsletterDeferred() {
  return (
    <DeferredWhenVisible fallback={newsletterFallback} rootMargin="640px 0px">
      <NewsletterCTA />
    </DeferredWhenVisible>
  );
}
