'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

export function VoiceBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { activeId, register, unregister, requestPlay, notifyPaused } = useFamilyMediaPlayer();
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
    if (activeId !== media.id && playing) {
      audioRef.current?.pause();
    }
  }, [activeId, media.id, playing]);

  const waveform = useMemo(() => {
    const raw =
      media.waveform && media.waveform.length > 0
        ? media.waveform
        : Array.from({ length: BAR_COUNT }, (_, i) => 0.22 + Math.sin(i * 0.55) * 0.18 + (i % 5) * 0.03);
    return normalizeWaveform(raw);
  }, [media.waveform]);

  const progressRatio = duration > 0 ? Math.min(1, progress / duration) : 0;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      requestPlay(media.id);
      void el.play();
    } else {
      el.pause();
    }
  };

  const seekToRatio = (ratio: number) => {
    const el = audioRef.current;
    if (!el || duration <= 0) return;
    const next = Math.max(0, Math.min(duration, ratio * duration));
    el.currentTime = next;
    setProgress(next);
  };

  const reportProgress = (event: 'play' | 'pause' | 'complete', position: number) => {
    const rounded = Math.floor(position);
    if (event === 'pause' && Math.abs(rounded - lastReported.current) < 2) return;
    lastReported.current = rounded;
    void sendMediaProgress({
      post_id: postId,
      media_id: media.id,
      position: rounded,
      duration: Math.floor(duration),
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
    <div dir="ltr" className="family-voice flex items-center gap-2.5 rounded-full px-2.5 py-2">
      <audio
        ref={audioRef}
        src={media.url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          notifyPaused(media.id);
          reportProgress('pause', audioRef.current?.currentTime ?? 0);
        }}
        onEnded={() => {
          setPlaying(false);
          notifyPaused(media.id);
          reportProgress('complete', duration);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || media.duration || 0)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        className="hidden"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'توقف' : 'پخش'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-glow text-charcoal shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-emerald-glow)_35%,transparent)] transition active:scale-95"
      >
        {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ms-0.5 h-4 w-4" fill="currentColor" />}
      </button>

      <button
        type="button"
        aria-label="موج صدا"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          seekToRatio(ratio);
        }}
        className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-[2px] px-0.5"
      >
        {waveform.map((v, i) => {
          const barRatio = (i + 0.5) / BAR_COUNT;
          const played = barRatio <= progressRatio;
          const height = Math.round(4 + v * 18);
          return (
            <span
              key={i}
              className={cn(
                'min-w-0 flex-1 rounded-full transition-colors duration-150',
                played ? 'bg-[var(--family-voice-played)]' : 'bg-[var(--family-voice-unplayed)]',
              )}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </button>

      <span className="w-10 shrink-0 text-left text-[11px] tabular-nums text-bone/50">
        {formatTime(playing || progress > 0 ? duration - progress : duration)}
      </span>
    </div>
  );
}
