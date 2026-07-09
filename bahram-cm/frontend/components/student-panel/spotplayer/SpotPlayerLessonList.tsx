'use client';

import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { BookOpen, Check, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import type {} from '@/types/spotplayer';

type LessonRow = {
  rowKey: string;
  id: string | number;
  title: string;
  duration?: number;
  depth: number;
  isSection: boolean;
  lessonNumber?: number;
};

interface Props {
  accessId: string;
  licenseScriptUrl: string;
  courseId: string;
  activeItemId?: string | number | null;
  onSelectItem: (id: string | number) => void;
  onLessonsReady?: (firstLessonId: string | number) => void;
}

function completedStorageKey(accessId: string) {
  return `spotplayer-completed:${accessId}`;
}

function loadCompletedLessons(accessId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();

  try {
    const raw = window.localStorage.getItem(completedStorageKey(accessId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
}

function saveCompletedLessons(accessId: string, completed: Set<string>) {
  window.localStorage.setItem(completedStorageKey(accessId), JSON.stringify([...completed]));
}

function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function courseKey(course: SpotPlayerCourse): string {
  return String(course._id ?? course.id ?? '');
}

function itemTitle(item: SpotPlayerCourseItem, fallback: string): string {
  return (item.name ?? item.title ?? fallback).trim() || fallback;
}

function itemId(item: SpotPlayerCourseItem, fallback: string): string | number {
  return item._id ?? item.id ?? fallback;
}

/** SpotPlayer API returns duration in milliseconds for long videos. */
function normalizeDuration(duration?: number): number | undefined {
  if (!duration) return undefined;
  if (duration > 10_000) return Math.round(duration / 1000);
  return duration;
}

function isFolder(item: SpotPlayerCourseItem): boolean {
  if (item.items?.length) return true;
  const type = String(item.type ?? '');
  return type === 'folder' || type === '2' || type.includes('folder');
}

function walkItems(items: SpotPlayerCourseItem[] | undefined, prefix = '', depth = 0, lessonCounter = { n: 0 }): LessonRow[] {
  if (!items?.length) return [];

  const rows: LessonRow[] = [];

  items.forEach((item, index) => {
    const key = `${prefix}${index}`;

    if (isFolder(item) && item.items?.length) {
      rows.push({
        rowKey: `section-${key}`,
        id: `section-${key}`,
        title: itemTitle(item, `بخش ${index + 1}`),
        depth,
        isSection: true,
      });
      rows.push(...walkItems(item.items, `${key}-`, depth + 1, lessonCounter));
      return;
    }

    if (item.access === false) return;

    lessonCounter.n += 1;
    const id = itemId(item, key);
    rows.push({
      rowKey: `lesson-${key}-${String(id)}`,
      id,
      title: itemTitle(item, `درس ${lessonCounter.n}`),
      duration: normalizeDuration(item.duration),
      depth,
      isSection: false,
      lessonNumber: lessonCounter.n,
    });
  });

  return rows;
}

function resolveCourse(courses: SpotPlayerCourse[], courseId: string): SpotPlayerCourse | undefined {
  if (!courses.length) return undefined;

  const exact = courses.find((item) => courseKey(item) === String(courseId));
  if (exact) return exact;

  const partial = courses.find((item) => courseKey(item).includes(String(courseId)));
  if (partial) return partial;

  return courses[0];
}

function readAllLessons(courseId: string): LessonRow[] {
  const courses = window.spotplayer_courses ?? [];
  const course = resolveCourse(courses, courseId);
  if (course?.items?.length) {
    return walkItems(course.items);
  }

  return courses.flatMap((c, courseIndex) =>
    walkItems(c.items, `c${courseIndex}-`),
  );
}

export function SpotPlayerLessonList({
  accessId,
  licenseScriptUrl,
  courseId,
  activeItemId,
  onSelectItem,
  onLessonsReady,
}: Props) {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scriptReady, setScriptReady] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setCompleted(loadCompletedLessons(accessId));
  }, [accessId]);

  const toggleCompleted = useCallback(
    (lessonId: string | number) => {
      const key = String(lessonId);
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        saveCompletedLessons(accessId, next);
        return next;
      });
    },
    [accessId],
  );

  const syncLessons = useCallback(() => {
    const rows = readAllLessons(courseId);
    setLessons(rows);
    setLoading(false);
    const firstLesson = rows.find((row) => !row.isSection);
    if (firstLesson) onLessonsReady?.(firstLesson.id);
  }, [courseId, onLessonsReady]);

  useEffect(() => {
    setLoading(true);
    setLessons([]);
    setScriptReady(false);
  }, [licenseScriptUrl, courseId]);

  useEffect(() => {
    if (!scriptReady) return;

    if (window.spotplayer_courses?.length) {
      syncLessons();
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.spotplayer_courses?.length) {
        syncLessons();
        window.clearInterval(timer);
        return;
      }
      if (attempts >= 40) {
        setLoading(false);
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [scriptReady, syncLessons]);

  return (
    <div>
      <Script
        key={licenseScriptUrl}
        src={licenseScriptUrl}
        strategy="afterInteractive"
        onLoad={() => {
          setScriptReady(true);
          syncLessons();
        }}
        onError={() => setLoading(false)}
      />
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="panel-card-title flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          فهرست درس‌ها
        </h2>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            syncLessons();
          }}
          className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-soft hover:text-primary"
          aria-label="به‌روزرسانی فهرست"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : lessons.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">لیست درس‌ها در دسترس نیست.</p>
      ) : (
        <ul className="max-h-[28rem] overflow-y-auto">
          {lessons.map((lesson) => {
            if (lesson.isSection) {
              return (
                <li
                  key={lesson.rowKey}
                  className="border-b border-border bg-surface-soft/50 px-4 py-2.5"
                  style={{ paddingRight: `${12 + lesson.depth * 12}px` }}
                >
                  <span className="panel-text-body font-bold leading-relaxed text-text">{lesson.title}</span>
                </li>
              );
            }

            const lessonKey = String(lesson.id);
            const active = String(activeItemId ?? '') === lessonKey;
            const isCompleted = completed.has(lessonKey);

            return (
              <li key={lesson.rowKey} className="border-b border-border last:border-b-0">
                <div
                  className={cn(
                    'flex items-start gap-2.5 py-3 transition hover:bg-surface-soft',
                    active && 'bg-primary/10',
                  )}
                  style={{ paddingRight: `${12 + lesson.depth * 12}px`, paddingLeft: '12px' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleCompleted(lesson.id)}
                    aria-label={isCompleted ? 'علامت‌گذاری به‌عنوان ندیده' : 'علامت‌گذاری به‌عنوان دیده‌شده'}
                    aria-pressed={isCompleted}
                    className={cn(
                      'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                      isCompleted
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-border bg-surface text-transparent hover:border-primary/30',
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectItem(lesson.id)}
                    className="min-w-0 flex-1 text-right"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          'w-5 shrink-0 pt-0.5 text-caption',
                          isCompleted ? 'text-text-subtle' : 'text-text-muted',
                        )}
                      >
                        {lesson.lessonNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm leading-relaxed',
                            active && !isCompleted && 'font-medium text-primary',
                            active && isCompleted && 'text-text-subtle',
                            !active && isCompleted && 'text-text-subtle',
                            !active && !isCompleted && 'text-text',
                          )}
                        >
                          {lesson.title}
                        </p>
                        {lesson.duration ? (
                          <p
                            dir="ltr"
                            className={cn(
                              'mt-1 text-caption',
                              isCompleted ? 'text-text-subtle' : 'text-text-muted',
                            )}
                          >
                            {formatDuration(lesson.duration)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
