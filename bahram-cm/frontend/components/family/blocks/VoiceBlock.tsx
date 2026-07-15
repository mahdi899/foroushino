'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { sendMediaProgress } from '@/lib/family/api';
import type { FamilyMediaBlock } from '@/lib/family/types';

const BAR_COUNT = 52;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function normalizeWaveform(raw: number[]): number[] {
  if (raw.length === 0) return Array.from({ length: BAR_COUNT }, () => 0.25);
  if (raw.length === BAR_COUNT) {
    const max = Math.max(...raw);
    const min = Math.min(...raw);
    const range = max - min || 1;
    return raw.map((v) => (v - min) / range);
  }

  const result: number[] = [];
  for (let i = 0; i < BAR_COUNT; i += 1) {
    const t = (i / (BAR_COUNT - 1)) * (raw.length - 1);
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
  const waveRef = useRef<HTMLButtonElement | null>(null);
  const draggingRef = useRef(false);
  const { activeId, register, unregister, requestPlay, notifyPaused, setNowPlaying, updateNowPlayingProgress } =
    useFamilyMediaPlayer();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(media.duration ?? 0);
  const [scrubbing, setScrubbing] = useState(false);
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

  const waveform = useMemo(() => {
    const raw =
      media.waveform && media.waveform.length > 0
        ? media.waveform
        : Array.from({ length: BAR_COUNT }, (_, i) => 0.22 + Math.sin(i * 0.55) * 0.18 + (i % 5) * 0.03);
    return normalizeWaveform(raw);
  }, [media.waveform]);

  const effectiveDuration = () => {
    const el = audioRef.current;
    const fromEl = el?.duration;
    if (fromEl && Number.isFinite(fromEl) && fromEl > 0) return fromEl;
    if (duration > 0) return duration;
    return media.duration ?? 0;
  };

  const progressRatio = (() => {
    const d = effectiveDuration();
    return d > 0 ? Math.min(1, progress / d) : 0;
  })();

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;

    if (!el.paused) {
      el.pause();
      return;
    }

    requestPlay(media.id);

    if (!Number.isFinite(el.duration) || el.duration <= 0) {
      el.load();
      await new Promise<void>((resolve) => {
        if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve();
          return;
        }
        const onMeta = () => {
          el.removeEventListener('loadedmetadata', onMeta);
          resolve();
        };
        el.addEventListener('loadedmetadata', onMeta);
      });
    }

    try {
      await el.play();
    } catch {
      return;
    }
  };

  const seekToRatio = (ratio: number) => {
    const el = audioRef.current;
    if (!el) return;
    const d = effectiveDuration();
    if (d <= 0) return;
    const next = Math.max(0, Math.min(d, ratio * d));
    el.currentTime = next;
    setProgress(next);
    updateNowPlayingProgress(media.id, next, d);
  };

  const seekFromClientX = (clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekToRatio(ratio);
  };

  const reportProgress = (event: 'play' | 'pause' | 'complete', position: number) => {
    const rounded = Math.floor(position);
    if (event === 'pause' && Math.abs(rounded - lastReported.current) < 2) return;
    lastReported.current = rounded;
    void sendMediaProgress({
      post_id: postId,
      media_id: media.id,
      position: rounded,
      duration: Math.floor(effectiveDuration()),
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
    <div dir="ltr" className="family-voice flex w-full items-center gap-2.5 rounded-full px-2.5 py-2">
      <audio
        ref={audioRef}
        src={media.url}
        preload="auto"
        onPlay={() => {
          setPlaying(true);
          const d = effectiveDuration();
          setNowPlaying({
            mediaId: media.id,
            postId,
            title,
            kind: 'voice',
            progress: audioRef.current?.currentTime ?? progress,
            duration: d,
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
          reportProgress('complete', effectiveDuration());
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration || media.duration || 0;
          setDuration(d);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          if (!scrubbing) setProgress(t);
          if (activeId === media.id) {
            updateNowPlayingProgress(media.id, t, e.currentTarget.duration || duration);
          }
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={playing ? 'توقف' : 'پخش'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full family-voice-play transition"
      >
        {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ms-0.5 h-4 w-4" fill="currentColor" />}
      </button>

      <button
        ref={waveRef}
        type="button"
        aria-label="موج صدا"
        onPointerDown={(e) => {
          draggingRef.current = true;
          setScrubbing(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          seekFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          setScrubbing(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={(e) => {
          draggingRef.current = false;
          setScrubbing(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        className={cn('family-voice-wave h-9 min-w-0 flex-1 cursor-pointer touch-none', scrubbing && 'opacity-90')}
        style={{ '--wave-bars': BAR_COUNT } as CSSProperties}
      >
        {waveform.map((v, i) => {
          const barRatio = BAR_COUNT > 1 ? i / (BAR_COUNT - 1) : 0;
          const played = barRatio <= progressRatio;
          const height = Math.round(4 + v * 18);
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

      <span className="w-10 shrink-0 text-left text-[11px] tabular-nums text-bone/50">
        {formatTime(playing || progress > 0 ? effectiveDuration() - progress : effectiveDuration())}
      </span>
    </div>
  );
}
