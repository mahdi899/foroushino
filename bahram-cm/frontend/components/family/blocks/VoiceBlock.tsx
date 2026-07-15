'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { sendMediaProgress } from '@/lib/family/api';
import type { FamilyMediaBlock } from '@/lib/family/types';

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

function waveWidthForDuration(seconds: number): number {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 30;
  return Math.round(Math.min(240, Math.max(96, 56 + safe * 1.35)));
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

function waitForMetadata(el: HTMLAudioElement): Promise<void> {
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(el.duration) && el.duration > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      el.removeEventListener('loadedmetadata', done);
      el.removeEventListener('durationchange', done);
      resolve();
    };
    el.addEventListener('loadedmetadata', done);
    el.addEventListener('durationchange', done);
  });
}

function seekElement(el: HTMLAudioElement, next: number): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      el.removeEventListener('seeked', finish);
      resolve();
    };

    try {
      if (typeof el.fastSeek === 'function') {
        el.fastSeek(next);
      } else {
        el.currentTime = next;
      }
    } catch {
      resolve();
      return;
    }

    if (Math.abs(el.currentTime - next) < 0.05) {
      resolve();
      return;
    }

    el.addEventListener('seeked', finish);
    window.setTimeout(finish, 300);
  });
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
  const draggingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const { activeId, register, unregister, requestPlay, notifyPaused, setNowPlaying, updateNowPlayingProgress } =
    useFamilyMediaPlayer();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(media.duration ?? 0);
  const lastReported = useRef(0);

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

  const resolvedDuration = useMemo(() => {
    if (duration > 0) return duration;
    if (media.duration && media.duration > 0) return media.duration;
    return 30;
  }, [duration, media.duration]);

  const barCount = useMemo(() => barCountForDuration(resolvedDuration), [resolvedDuration]);
  const waveWidthPx = useMemo(() => waveWidthForDuration(resolvedDuration), [resolvedDuration]);

  const waveform = useMemo(() => {
    const raw =
      media.waveform && media.waveform.length > 0
        ? media.waveform
        : Array.from({ length: barCount }, (_, i) => 0.22 + Math.sin(i * 0.55) * 0.18 + (i % 5) * 0.03);
    return normalizeWaveform(raw, barCount);
  }, [media.waveform, barCount]);

  const readDuration = (el: HTMLAudioElement) => {
    if (Number.isFinite(el.duration) && el.duration > 0) return el.duration;
    if (duration > 0) return duration;
    if (media.duration && media.duration > 0) return media.duration;
    return 0;
  };

  const progressRatio = resolvedDuration > 0 ? Math.min(1, progress / resolvedDuration) : 0;

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;

    if (!el.paused) {
      el.pause();
      return;
    }

    requestPlay(media.id);
    await waitForMetadata(el);

    if (progress > 0 && Math.abs(el.currentTime - progress) > 0.25) {
      await seekElement(el, progress);
    }

    try {
      await el.play();
    } catch {
      // autoplay blocked or network
    }
  };

  const seekToRatio = async (ratio: number) => {
    const el = audioRef.current;
    if (!el) return;

    const wasPlaying = !el.paused;
    await waitForMetadata(el);

    const d = readDuration(el) || resolvedDuration;
    if (d <= 0) return;

    const next = Math.max(0, Math.min(d, ratio * d));
    scrubbingRef.current = true;
    await seekElement(el, next);
    const actual = el.currentTime;
    setProgress(actual);
    updateNowPlayingProgress(media.id, actual, d);
    window.setTimeout(() => {
      scrubbingRef.current = false;
    }, 120);

    if (wasPlaying && el.paused) {
      requestPlay(media.id);
      try {
        await el.play();
      } catch {
        // autoplay blocked or network
      }
    }
  };

  const seekFromRatio = (ratio: number) => {
    void seekToRatio(ratio);
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
      <div className="family-voice flex items-center gap-3 rounded-full px-4 py-3 text-sm text-bone/50">
        در حال پردازش صدا…
      </div>
    );
  }

  return (
    <div dir="ltr" className="family-voice flex w-full max-w-full items-center gap-2 rounded-full px-2 py-1.5">
      <audio
        ref={audioRef}
        src={media.url}
        preload="auto"
        onPlay={() => {
          setPlaying(true);
          const el = audioRef.current;
          const d = el ? readDuration(el) : resolvedDuration;
          setNowPlaying({
            mediaId: media.id,
            postId,
            title,
            kind: 'voice',
            progress: el?.currentTime ?? progress,
            duration: d,
            isPlaying: true,
          });
        }}
        onPause={() => {
          setPlaying(false);
          notifyPaused(media.id);
          reportProgress('pause', audioRef.current?.currentTime ?? 0);
        }}
        onEnded={() => {
          setPlaying(false);
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
          if (scrubbingRef.current || draggingRef.current) return;
          const t = e.currentTarget.currentTime;
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
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full family-voice-play transition"
      >
        {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="ms-0.5 h-3.5 w-3.5" fill="currentColor" />}
      </button>

      <div className="flex min-w-0 flex-1 items-center">
        <button
          type="button"
          aria-label="موج صدا"
          onPointerDown={(e) => {
            e.preventDefault();
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;
            seekFromRatio(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;
            seekFromRatio(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
          onPointerUp={(e) => {
            draggingRef.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          onPointerCancel={(e) => {
            draggingRef.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          className="family-voice-wave h-8 max-w-full cursor-pointer touch-none"
          style={{ '--wave-bars': barCount, width: `${waveWidthPx}px` } as CSSProperties}
        >
          {waveform.map((v, i) => {
            const barRatio = barCount > 1 ? i / (barCount - 1) : 0;
            const played = barRatio <= progressRatio;
            const height = Math.round(3 + v * 14);
            return (
              <span
                key={i}
                className={cn(
                  'family-voice-bar rounded-full transition-colors duration-150',
                  played ? 'bg-[var(--family-voice-played)]' : 'bg-[var(--family-voice-unplayed)]',
                )}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </button>
      </div>

      <span className="w-9 shrink-0 text-left text-[10px] tabular-nums text-bone/50">
        {formatTime(playing || progress > 0 ? resolvedDuration - progress : resolvedDuration)}
      </span>
    </div>
  );
}
