'use client';

import { useCallback, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { formatPlaybackSpeed } from '@/lib/family/playback';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NowPlayingBar({ overlay = false }: { overlay?: boolean }) {
  const {
    nowPlaying,
    playbackRate,
    toggleActivePlayback,
    seekActiveTo,
    cyclePlaybackRate,
    dismissNowPlaying,
  } = useFamilyMediaPlayer();

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const scrubRatioRef = useRef(0);
  const [scrubVisual, setScrubVisual] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const ratioFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const previewScrub = useCallback(
    (ratio: number) => {
      if (!nowPlaying) return;
      scrubRatioRef.current = ratio;
      const duration = nowPlaying.duration > 0 ? nowPlaying.duration : 0;
      setScrubVisual(duration > 0 ? ratio * duration : 0);
    },
    [nowPlaying],
  );

  const commitScrub = useCallback(
    (ratio: number) => {
      if (!nowPlaying) return;
      const duration = nowPlaying.duration > 0 ? nowPlaying.duration : 0;
      if (duration <= 0) {
        setScrubVisual(null);
        return;
      }
      const target = ratio * duration;
      seekActiveTo(target);
      setScrubVisual(null);
    },
    [nowPlaying, seekActiveTo],
  );

  if (!nowPlaying) return null;

  const displayProgress = scrubVisual ?? nowPlaying.progress;
  const ratio =
    nowPlaying.duration > 0 ? Math.min(1, displayProgress / nowPlaying.duration) : 0;

  return (
    <div
      className={cn(
        'family-now-playing relative',
        overlay && 'family-now-playing--overlay pointer-events-auto absolute inset-x-0 top-0 z-40',
        !overlay && 'shrink-0',
      )}
    >
      <div dir="ltr" className="family-now-playing__row">
        <button
          type="button"
          onClick={toggleActivePlayback}
          aria-label={nowPlaying.isPlaying ? 'توقف پخش' : 'ادامه پخش'}
          className="family-now-playing__play"
        >
          {nowPlaying.isPlaying ? (
            <Pause className="h-3.5 w-3.5" fill="currentColor" />
          ) : (
            <Play className="ms-0.5 h-3.5 w-3.5" fill="currentColor" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-[var(--family-text)]">
            {nowPlaying.title}
          </p>
          <div
            ref={trackRef}
            role="slider"
            aria-label="موقعیت پخش"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.floor(nowPlaying.duration))}
            aria-valuenow={Math.floor(displayProgress)}
            aria-valuetext={`${formatTime(displayProgress)} از ${formatTime(nowPlaying.duration)}`}
            tabIndex={0}
            className={cn(
              'family-now-playing__track touch-none',
              isDragging && 'family-now-playing__track--dragging',
            )}
            onPointerDown={(e) => {
              e.preventDefault();
              draggingRef.current = true;
              setIsDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
              previewScrub(ratioFromClientX(e.clientX));
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current) return;
              e.preventDefault();
              previewScrub(ratioFromClientX(e.clientX));
            }}
            onPointerUp={(e) => {
              if (!draggingRef.current) return;
              draggingRef.current = false;
              setIsDragging(false);
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              const ratio = scrubRatioRef.current || ratioFromClientX(e.clientX);
              commitScrub(ratio);
            }}
            onPointerCancel={(e) => {
              draggingRef.current = false;
              setIsDragging(false);
              setScrubVisual(null);
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
            }}
            onKeyDown={(e) => {
              if (!nowPlaying.duration) return;
              const step = e.shiftKey ? 10 : 5;
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                seekActiveTo(displayProgress - step);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                seekActiveTo(displayProgress + step);
              }
            }}
          >
            <div
              className="family-now-playing__fill"
              style={{ width: `${ratio * 100}%` }}
            >
              <span className="family-now-playing__thumb" aria-hidden />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            cyclePlaybackRate();
          }}
          aria-label={`سرعت پخش ${formatPlaybackSpeed(playbackRate)}`}
          className="family-now-playing__speed"
        >
          {formatPlaybackSpeed(playbackRate)}
        </button>

        <span className="family-now-playing__time shrink-0 tabular-nums">
          {formatTime(displayProgress)}
          <span className="opacity-40">/</span>
          {formatTime(nowPlaying.duration)}
        </span>

        <button
          type="button"
          onClick={dismissNowPlaying}
          aria-label="بستن"
          className="family-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
