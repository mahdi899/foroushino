'use client';

import { Pause, Play, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NowPlayingBar({ overlay = false }: { overlay?: boolean }) {
  const { nowPlaying, toggleActivePlayback, dismissNowPlaying } = useFamilyMediaPlayer();
  if (!nowPlaying) return null;

  const ratio =
    nowPlaying.duration > 0 ? Math.min(1, nowPlaying.progress / nowPlaying.duration) : 0;

  return (
    <div
      className={cn(
        'family-now-playing relative border-b backdrop-blur-md',
        overlay
          ? 'pointer-events-auto absolute inset-x-0 top-0 z-40 shadow-[0_8px_24px_rgba(2,6,7,0.18)]'
          : 'shrink-0',
      )}
    >
      <div dir="ltr" className="flex h-12 items-center gap-2.5 px-3 sm:gap-3 sm:px-4 lg:px-5">
        <button
          type="button"
          onClick={toggleActivePlayback}
          aria-label={nowPlaying.isPlaying ? 'توقف پخش' : 'ادامه پخش'}
          className="family-now-playing__play flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95"
        >
          {nowPlaying.isPlaying ? (
            <Pause className="h-3.5 w-3.5" fill="currentColor" />
          ) : (
            <Play className="ms-0.5 h-3.5 w-3.5" fill="currentColor" />
          )}
        </button>

        <p className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none text-bone/90">
          {nowPlaying.title}
        </p>

        <span className="shrink-0 text-[11px] tabular-nums tracking-tight text-bone/45">
          {formatTime(nowPlaying.progress)}
          <span className="mx-0.5 text-bone/25">/</span>
          {formatTime(nowPlaying.duration)}
        </span>

        <button
          type="button"
          onClick={dismissNowPlaying}
          aria-label="بستن"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-bone/45 transition hover:bg-[var(--family-surface-soft)] hover:text-bone/80"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[color-mix(in_oklab,var(--family-text)_8%,transparent)]">
        <div
          className="h-full bg-[var(--family-accent)] transition-[width] duration-150 ease-linear"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
