'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const ArticleBodyEditor = dynamic(
  () => import('./ArticleBodyEditor').then((m) => ({ default: m.ArticleBodyEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-surface-soft">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" aria-hidden />
        <span className="sr-only">در حال بارگذاری ویرایشگر…</span>
      </div>
    ),
  },
);
