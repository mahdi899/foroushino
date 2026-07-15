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
        'family-now-playing border-b backdrop-blur-md',
        overlay
          ? 'pointer-events-auto absolute inset-x-0 top-0 z-40 shadow-[0_8px_24px_rgba(2,6,7,0.18)]'
          : 'shrink-0',
      )}
    >
      <div dir="ltr" className="flex items-center gap-2 px-3 py-2 sm:px-4 lg:px-5">
        <button
          type="button"
          onClick={toggleActivePlayback}
          aria-label={nowPlaying.isPlaying ? 'توقف پخش' : 'ادامه پخش'}
          className="family-voice-play flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95"
        >
          {nowPlaying.isPlaying ? (
            <Pause className="h-3.5 w-3.5" fill="currentColor" />
          ) : (
            <Play className="ms-0.5 h-3.5 w-3.5" fill="currentColor" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-bone/90">{nowPlaying.title}</p>
          <p className="text-[11px] tabular-nums text-bone/45">
            {formatTime(nowPlaying.progress)} / {formatTime(nowPlaying.duration)}
          </p>
        </div>

        <button
          type="button"
          onClick={dismissNowPlaying}
          aria-label="بستن"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-bone/55 transition hover:bg-[var(--family-surface-soft)] hover:text-bone"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="px-3 pb-2 sm:px-4 lg:px-5">
        <div className="h-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--family-surface-soft)_88%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--family-accent)] transition-[width] duration-150"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
