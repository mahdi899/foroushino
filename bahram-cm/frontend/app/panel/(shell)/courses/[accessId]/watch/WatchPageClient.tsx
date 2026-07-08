'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SpotPlayerEmbed } from '@/components/student-panel/spotplayer/SpotPlayerEmbed';
import { SpotPlayerLessonList } from '@/components/student-panel/spotplayer/SpotPlayerLessonList';
import { SpotPlayerScript } from '@/components/student-panel/spotplayer/SpotPlayerScript';

interface Props {
  title: string;
  licenseKey: string;
  courseId: string;
  licenseScriptUrl: string | null;
}

export function WatchPageClient({ title, licenseKey, courseId, licenseScriptUrl }: Props) {
  const [itemId, setItemId] = useState<string | number | null>(null);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <SpotPlayerScript />
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/panel/courses" className="inline-flex items-center gap-1 hover:text-primary">
          <ArrowRight className="h-4 w-4" />
          دوره‌ها
        </Link>
        <span>/</span>
        <span className="truncate text-text">{title}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-3">
          <SpotPlayerEmbed licenseKey={licenseKey} courseId={courseId} itemId={itemId} />
          <h1 className="text-base font-bold text-text">{title}</h1>
        </div>
        <aside className="overflow-hidden rounded-2xl border border-border bg-surface">
          {licenseScriptUrl ? (
            <SpotPlayerLessonList licenseScriptUrl={licenseScriptUrl} courseId={courseId} activeItemId={itemId} onSelectItem={setItemId} />
          ) : (
            <p className="p-4 text-sm text-text-muted">لیست درس‌ها برای این لایسنس در دسترس نیست.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
