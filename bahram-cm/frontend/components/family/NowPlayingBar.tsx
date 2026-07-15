'use client';

import { Pause, Volume2 } from 'lucide-react';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NowPlayingBar() {
  const { nowPlaying, pauseActive } = useFamilyMediaPlayer();
  if (!nowPlaying) return null;

  const ratio =
    nowPlaying.duration > 0 ? Math.min(1, nowPlaying.progress / nowPlaying.duration) : 0;

  return (
    <div className="family-now-playing shrink-0 border-b px-3 py-2 sm:px-4 lg:px-5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={pauseActive}
          aria-label="توقف پخش"
          className="family-voice-play flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95"
        >
          <Pause className="h-3.5 w-3.5" fill="currentColor" />
        </button>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--family-accent)_12%,var(--family-surface-soft))] text-[var(--family-accent)]">
          <Volume2 className="h-4 w-4" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-[13px] font-medium text-bone/85">{nowPlaying.title}</p>
          <p className="text-[11px] tabular-nums text-bone/45">
            {formatTime(nowPlaying.progress)} / {formatTime(nowPlaying.duration)}
          </p>
        </div>
      </div>

      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-[var(--family-surface-soft)]">
        <div
          className="h-full rounded-full bg-[var(--family-accent)] transition-[width] duration-150"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
