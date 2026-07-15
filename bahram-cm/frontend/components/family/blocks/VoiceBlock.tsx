'use client';

import { useEffect, useRef, useState } from 'react';
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

  const rawWaveform =
    media.waveform && media.waveform.length > 0 ? media.waveform : Array.from({ length: 32 }, () => 0.3);
  const waveformMax = Math.max(...rawWaveform);
  const waveformMin = Math.min(...rawWaveform);
  const waveformRange = waveformMax - waveformMin || 1;
  const waveform = rawWaveform.map((v) => (v - waveformMin) / waveformRange);
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

  const reportProgress = (event: 'play' | 'pause' | 'complete', position: number) => {
    const rounded = Math.floor(position);
    if (event === 'pause' && Math.abs(rounded - lastReported.current) < 2) return;
    lastReported.current = rounded;
    void sendMediaProgress({ post_id: postId, media_id: media.id, position: rounded, duration: Math.floor(duration), event }).catch(() => {});
  };

  if (!media.url) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm text-bone/50">
        در حال پردازش صدا…
      </div>
    );
  }

  return (
    <div dir="ltr" className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-charcoal transition active:scale-95"
      >
        {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
      </button>
      <div className="flex h-10 min-w-0 flex-1 items-center gap-[1px] px-0.5" aria-hidden>
        {waveform.map((v, i) => {
          const played = (i + 1) / waveform.length <= progressRatio;
          return (
            <span
              key={i}
              className={cn(
                'min-w-0 flex-1 rounded-full transition-colors',
                played ? 'bg-gold' : 'bg-white/20',
              )}
              style={{ height: `${Math.round(28 + v * 72)}%` }}
            />
          );
        })}
      </div>
      <span className="w-10 shrink-0 text-left text-[11px] tabular-nums text-bone/50">
        {formatTime(playing || progress > 0 ? duration - progress : duration)}
      </span>
    </div>
  );
}
