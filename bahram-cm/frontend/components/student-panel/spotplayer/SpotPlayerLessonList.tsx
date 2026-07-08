'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { BookOpen, Loader2 } from 'lucide-react';
import type {} from '@/types/spotplayer';

interface Props {
  licenseScriptUrl: string;
  courseId: string;
  activeItemId?: string | number | null;
  onSelectItem: (id: string | number) => void;
}

function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function SpotPlayerLessonList({ licenseScriptUrl, courseId, activeItemId, onSelectItem }: Props) {
  const [lessons, setLessons] = useState<SpotPlayerCourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  function readLessons() {
    const courses = window.spotplayer_courses ?? [];
    const course = courses.find((item) => item.id === courseId) ?? courses[0];
    setLessons(course?.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (window.spotplayer_courses) readLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Script src={licenseScriptUrl} strategy="afterInteractive" onLoad={readLessons} />
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold text-text">
        <BookOpen className="h-4 w-4 text-primary" />
        فهرست درس‌ها
      </h2>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : lessons.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">لیست درس‌ها در دسترس نیست.</p>
      ) : (
        <ul className="max-h-[28rem] overflow-y-auto">
          {lessons.map((lesson, index) => {
            const active = String(activeItemId ?? '') === String(lesson.id);
            return (
              <li key={lesson.id}>
                <button type="button" onClick={() => onSelectItem(lesson.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-right text-sm transition hover:bg-surface-soft ${active ? 'bg-primary/10 text-primary' : 'text-text'}`}>
                  <span className="w-6 shrink-0 text-caption text-text-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{lesson.title ?? `درس ${index + 1}`}</span>
                  {lesson.duration ? <span dir="ltr" className="text-caption text-text-muted">{formatDuration(lesson.duration)}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
