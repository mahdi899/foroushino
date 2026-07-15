'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { sendMediaProgress } from '@/lib/family/api';
import type { FamilyMediaBlock } from '@/lib/family/types';

const PODCAST_MIN_SECONDS = 45;
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

function formatSpeed(rate: PlaybackSpeed): string {
  return rate === 1 ? '1×' : `${rate}×`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function barCountForDuration(seconds: number): number {
  if (seconds <= 12) return 28;
  if (seconds <= 30) return 36;
  if (seconds <= 90) return 44;
  if (seconds <= 180) return 52;
  return 60;
}

function normalizeWaveform(raw: number[], barCount: number): number[] {
  if (raw.length === 0) return Array.from({ length: barCount }, () => 0.25);
  if (raw.length === barCount) {
    const max = Math.max(...raw);
    const min = Math.min(...raw);
    const range = max - min || 1;
    return raw.map((v) => (v - min) / range);
  }

  const result: number[] = [];
  for (let i = 0; i < barCount; i += 1) {
    const t = barCount > 1 ? (i / (barCount - 1)) * (raw.length - 1) : 0;
    const left = Math.floor(t);
    const right = Math.min(raw.length - 1, left + 1);
    const mix = t - left;
    result.push(raw[left] * (1 - mix) + raw[right] * mix);
  }

  const max = Math.max(...result);
  const min = Math.min(...result);
  const range = max - min || 1;
  return result.map((v) => (v - min) / range);
}

function waitForEvent(el: HTMLMediaElement, event: string, timeoutMs = 2500): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener(event, finish);
      resolve();
    };
    el.addEventListener(event, finish);
    window.setTimeout(finish, timeoutMs);
  });
}

async function waitForMetadata(el: HTMLAudioElement): Promise<void> {
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(el.duration) && el.duration > 0) {
    return;
  }
  await waitForEvent(el, 'loadedmetadata');
}

/**
 * Browsers often ignore seek before the first play() — or reset currentTime when play starts.
 * Strategy: play → seek → confirm.
 */
async function playFromPosition(el: HTMLAudioElement, target: number): Promise<number> {
  const clamped = Math.max(0, target);

  const applySeek = async () => {
    try {
      el.currentTime = clamped;
    } catch {
      // ignore
    }
    if (Math.abs(el.currentTime - clamped) > 0.2) {
      await waitForEvent(el, 'seeked', 900);
    }
  };

  const neverPlayed = el.played.length === 0;

  if (neverPlayed || el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    try {
      await el.play();
    } catch {
      // may still allow seek while paused on some browsers
    }
    await applySeek();
    if (el.paused) {
      try {
        await el.play();
      } catch {
        // blocked
      }
    }
    // Re-apply after play settles — Chrome often resets on first play.
    await applySeek();
  } else {
    await applySeek();
    if (el.paused) {
      try {
        await el.play();
      } catch {
        // blocked
      }
      if (Math.abs(el.currentTime - clamped) > 0.25) {
        await applySeek();
      }
    }
  }

  return el.currentTime;
}

export function VoiceBlock({
  media,
  postId,
  title = 'پیام صوتی',
}: {
  media: FamilyMediaBlock;
  postId: number;
  title?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const scrubRatioRef = useRef(0);
  const seekPositionRef = useRef(0);
  const srcReadyRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const { activeId, register, unregister, requestPlay, notifyPaused, setNowPlaying, updateNowPlayingProgress } =
    useFamilyMediaPlayer();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrubVisual, setScrubVisual] = useState<number | null>(null);
  const [duration, setDuration] = useState(media.duration ?? 0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1);
  const lastReported = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    register(media.id, el);
    return () => unregister(media.id);
  }, [media.id, register, unregister]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (activeId !== media.id) {
      if (!el.paused) el.pause();
      setPlaying(false);
    }
  }, [activeId, media.id]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: '200px' },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const attachSrc = useCallback(async () => {
    const el = audioRef.current;
    if (!el || !media.url) return;

    if (!srcReadyRef.current || el.getAttribute('src') !== media.url) {
      el.setAttribute('src', media.url);
      el.load();
      srcReadyRef.current = true;
      await waitForMetadata(el);
    } else if (el.readyState < HTMLMediaElement.HAVE_METADATA) {
      await waitForMetadata(el);
    }
  }, [media.url]);

  useEffect(() => {
    if (!isVisible || !media.url) return;
    void attachSrc().then(() => {
      const el = audioRef.current;
      const d = el?.duration || media.duration || 0;
      if (d > 0) setDuration(d);
    });
  }, [isVisible, media.url, media.duration, attachSrc]);

  const resolvedDuration = useMemo(() => {
    if (duration > 0) return duration;
    if (media.duration && media.duration > 0) return media.duration;
    return 30;
  }, [duration, media.duration]);

  const isPodcast = resolvedDuration >= PODCAST_MIN_SECONDS;

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.playbackRate = playbackRate;
  }, [playbackRate]);

  const cycleSpeed = useCallback(() => {
    setPlaybackRate((prev) => {
      const idx = PLAYBACK_SPEEDS.indexOf(prev);
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    });
  }, []);

  const barCount = useMemo(() => barCountForDuration(resolvedDuration), [resolvedDuration]);

  const waveform = useMemo(() => {
    const raw =
      media.waveform && media.waveform.length > 0
        ? media.waveform
        : Array.from({ length: barCount }, (_, i) => 0.22 + Math.sin(i * 0.55) * 0.18 + (i % 5) * 0.03);
    return normalizeWaveform(raw, barCount);
  }, [media.waveform, barCount]);

  const readDuration = useCallback(
    (el: HTMLAudioElement) => {
      if (Number.isFinite(el.duration) && el.duration > 0) return el.duration;
      if (duration > 0) return duration;
      if (media.duration && media.duration > 0) return media.duration;
      return 0;
    },
    [duration, media.duration],
  );

  const displayProgress = scrubVisual ?? progress;
  const progressRatio = resolvedDuration > 0 ? Math.min(1, displayProgress / resolvedDuration) : 0;

  const ratioFromClientX = useCallback((clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const previewScrub = useCallback(
    (ratio: number) => {
      scrubRatioRef.current = ratio;
      setScrubVisual(ratio * resolvedDuration);
    },
    [resolvedDuration],
  );

  const commitScrub = useCallback(
    async (ratio: number) => {
      const el = audioRef.current;
      if (!el || !media.url) return;

      scrubbingRef.current = true;
      if (!isVisible) setIsVisible(true);

      try {
        await attachSrc();

        const durationSec = readDuration(el) || resolvedDuration;
        if (durationSec <= 0) {
          setScrubVisual(null);
          return;
        }

        const target = Math.max(0, Math.min(durationSec * 0.995, ratio * durationSec));
        setScrubVisual(target);
        seekPositionRef.current = target;
        setProgress(target);

        requestPlay(media.id);
        const actual = await playFromPosition(el, target);

        seekPositionRef.current = actual;
        setProgress(actual);
        setScrubVisual(null);
        updateNowPlayingProgress(media.id, actual, durationSec);
      } finally {
        scrubbingRef.current = false;
      }
    },
    [
      attachSrc,
      isVisible,
      media.id,
      media.url,
      readDuration,
      requestPlay,
      resolvedDuration,
      updateNowPlayingProgress,
    ],
  );

  const endScrub = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      // Use last preview ratio — more stable than pointerup coords.
      const ratio = scrubRatioRef.current;
      void commitScrub(ratio);
    },
    [commitScrub],
  );

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;

    if (!el.paused) {
      el.pause();
      return;
    }

    if (!isVisible) setIsVisible(true);
    await attachSrc();
    requestPlay(media.id);

    const target = seekPositionRef.current > 0.05 ? seekPositionRef.current : progress;
    if (target > 0.05) {
      await playFromPosition(el, target);
    } else {
      try {
        await el.play();
      } catch {
        // blocked
      }
    }
  };

  const reportProgress = (event: 'play' | 'pause' | 'complete', position: number) => {
    const rounded = Math.floor(position);
    if (event === 'pause' && Math.abs(rounded - lastReported.current) < 2) return;
    lastReported.current = rounded;
    void sendMediaProgress({
      post_id: postId,
      media_id: media.id,
      position: rounded,
      duration: Math.floor(readDuration(audioRef.current!)),
      event,
    }).catch(() => {});
  };

  if (!media.url) {
    return (
      <div
        className="family-voice family-voice--loading flex min-h-[3.75rem] items-center justify-center rounded-2xl px-4 py-3.5"
        aria-busy
        aria-label="در حال پردازش صدا"
      >
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={cn(
        'family-voice flex w-full max-w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 sm:gap-3.5 sm:px-4 sm:py-3.5',
        !playing && 'family-voice--idle',
      )}
    >
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          const el = audioRef.current;
          const d = el ? readDuration(el) : resolvedDuration;
          const current = scrubbingRef.current
            ? seekPositionRef.current
            : seekPositionRef.current > 0.05
              ? seekPositionRef.current
              : (el?.currentTime ?? progress);
          setProgress(current);
          setNowPlaying({
            mediaId: media.id,
            postId,
            title,
            kind: 'voice',
            progress: current,
            duration: d,
            isPlaying: true,
          });
        }}
        onPause={() => {
          if (scrubbingRef.current || draggingRef.current) return;
          setPlaying(false);
          notifyPaused(media.id);
          reportProgress('pause', audioRef.current?.currentTime ?? 0);
        }}
        onEnded={() => {
          setPlaying(false);
          seekPositionRef.current = 0;
          setProgress(0);
          notifyPaused(media.id);
          reportProgress('complete', readDuration(audioRef.current!));
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration || media.duration || 0;
          if (d > 0) setDuration(d);
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          if (scrubbingRef.current || draggingRef.current || scrubVisual != null) return;
          const t = e.currentTarget.currentTime;
          // Re-enforce pending seek if browser snapped back to 0 right after scrub.
          if (seekPositionRef.current > 1 && t < 0.35 && Math.abs(seekPositionRef.current - t) > 1) {
            try {
              e.currentTarget.currentTime = seekPositionRef.current;
            } catch {
              // ignore
            }
            return;
          }
          seekPositionRef.current = t;
          setProgress(t);
          if (activeId === media.id) {
            updateNowPlayingProgress(media.id, t, readDuration(e.currentTarget));
          }
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={playing ? 'توقف' : 'پخش'}
        className="family-voice-play flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition active:scale-95 sm:h-[3.25rem] sm:w-[3.25rem]"
      >
        {playing ? (
          <Pause className="h-5 w-5" fill="currentColor" />
        ) : (
          <Play className="ms-0.5 h-5 w-5" fill="currentColor" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden">
        <div
          ref={waveRef}
          role="slider"
          tabIndex={0}
          aria-label="موقعیت پخش"
          aria-valuemin={0}
          aria-valuemax={Math.round(resolvedDuration)}
          aria-valuenow={Math.round(displayProgress)}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            previewScrub(ratioFromClientX(e.clientX));
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            e.preventDefault();
            previewScrub(ratioFromClientX(e.clientX));
          }}
          onPointerUp={endScrub}
          onPointerCancel={(e) => {
            draggingRef.current = false;
            setScrubVisual(null);
            try {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
            } catch {
              // ignore
            }
          }}
          className="family-voice-wave w-full min-w-0 cursor-pointer touch-none select-none"
          style={{ '--wave-bars': barCount } as CSSProperties}
        >
          {waveform.map((v, i) => {
            const barRatio = barCount > 1 ? i / (barCount - 1) : 0;
            const played = barRatio <= progressRatio;
            const height = Math.round(5 + v * 26);
            return (
              <span
                key={i}
                className={cn(
                  'family-voice-bar pointer-events-none rounded-full transition-colors duration-150',
                  played ? 'bg-[var(--family-voice-played)]' : 'bg-[var(--family-voice-unplayed)]',
                )}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {!playing && displayProgress <= 0 ? (
              <span className="min-w-0 truncate text-[11px] font-medium text-[var(--family-accent)] sm:text-xs">
                برای پخش بزنید
              </span>
            ) : null}
            {isPodcast ? (
              <button
                type="button"
                onClick={cycleSpeed}
                aria-label={`سرعت پخش ${formatSpeed(playbackRate)}`}
                className="family-voice-speed shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums sm:text-xs"
              >
                {formatSpeed(playbackRate)}
              </button>
            ) : null}
          </div>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-bone/55 sm:text-xs">
            {formatTime(displayProgress > 0 || playing ? resolvedDuration - displayProgress : resolvedDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}
