'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';
import { formatPlaybackSpeed } from '@/lib/family/playback';
import { sendMediaProgress } from '@/lib/family/api';
import type { FamilyMediaBlock } from '@/lib/family/types';

const PODCAST_MIN_SECONDS = 45;

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

function waitForMetadata(el: HTMLAudioElement, timeoutMs = 20_000): Promise<boolean> {
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      el.removeEventListener('loadedmetadata', onReady);
      el.removeEventListener('durationchange', onReady);
      el.removeEventListener('error', onError);
      window.clearTimeout(timer);
      resolve(ok);
    };

    const onReady = () => {
      if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
        finish(true);
      }
    };

    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), timeoutMs);

    el.addEventListener('loadedmetadata', onReady);
    el.addEventListener('durationchange', onReady);
    el.addEventListener('error', onError);
  });
}

function seekAudio(el: HTMLAudioElement, target: number): Promise<number> {
  return new Promise((resolve) => {
    const finish = () => {
      el.removeEventListener('seeked', finish);
      resolve(el.currentTime);
    };

    try {
      el.currentTime = target;
    } catch {
      resolve(el.currentTime);
      return;
    }

    if (Math.abs(el.currentTime - target) < 0.08) {
      resolve(el.currentTime);
      return;
    }

    el.addEventListener('seeked', finish);
    window.setTimeout(finish, 700);
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
  const waveRef = useRef<HTMLButtonElement | null>(null);
  const draggingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const scrubRatioRef = useRef(0);
  const playingBeforeScrubRef = useRef(false);
  const seekPositionRef = useRef(0);
  const loadTaskRef = useRef<Promise<boolean> | null>(null);
  const [loadRequested, setLoadRequested] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const streamUrl = useMemo(() => resolveFamilyMediaUrl(media.url), [media.url]);
  const { activeId, register, unregister, requestPlay, notifyPaused, setNowPlaying, updateNowPlayingProgress, playbackRate, cyclePlaybackRate } =
    useFamilyMediaPlayer();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrubVisual, setScrubVisual] = useState<number | null>(null);
  const [duration, setDuration] = useState(media.duration ?? 0);
  const [audioReady, setAudioReady] = useState(false);
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

  // Stream voice directly from download host — no full-file blob download.
  const loadAudio = useCallback(async (): Promise<boolean> => {
    if (!streamUrl) {
      setLoadError(true);
      return false;
    }

    if (loadTaskRef.current) {
      return loadTaskRef.current;
    }

    setLoadRequested(true);
    setLoadError(false);

    const task = (async () => {
      const audio = audioRef.current;
      if (!audio) return false;

      if (!audio.src) {
        audio.src = streamUrl;
        audio.preload = 'metadata';
        audio.load();
      } else if (!audio.src.includes(streamUrl.split('?')[0].split('#')[0])) {
        audio.src = streamUrl;
        audio.preload = 'metadata';
        audio.load();
      }

      const metaReady = await waitForMetadata(audio);
      const ready = metaReady && audio.readyState >= HTMLMediaElement.HAVE_METADATA;
      setAudioReady(ready);
      setLoadError(!ready);
      return ready;
    })()
      .catch(() => {
        setAudioReady(false);
        setLoadError(true);
        return false;
      })
      .finally(() => {
        loadTaskRef.current = null;
      });

    loadTaskRef.current = task;
    return task;
  }, [streamUrl]);

  useEffect(() => {
    return () => {
      loadTaskRef.current = null;
    };
  }, [streamUrl]);

  const ensureAudioReady = useCallback(async () => loadAudio(), [loadAudio]);

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
      if (!el) return;

      const wasPlaying = playingBeforeScrubRef.current;
      scrubbingRef.current = true;

      const loaded = await ensureAudioReady();
      if (!loaded) {
        scrubbingRef.current = false;
        setScrubVisual(null);
        setLoadError(true);
        return;
      }

      const metaReady = await waitForMetadata(el);
      if (!metaReady) {
        scrubbingRef.current = false;
        setScrubVisual(null);
        setLoadError(true);
        return;
      }

      const durationSec = readDuration(el) || resolvedDuration;
      if (durationSec <= 0) {
        scrubbingRef.current = false;
        setScrubVisual(null);
        return;
      }

      const target = Math.max(0, Math.min(durationSec * 0.999, ratio * durationSec));
      setScrubVisual(target);

      const actual = await seekAudio(el, target);
      seekPositionRef.current = actual;
      setProgress(actual);
      setScrubVisual(null);
      updateNowPlayingProgress(media.id, actual, durationSec);

      // Seek-and-play like Telegram: start from tapped position.
      requestPlay(media.id);
      try {
        if (el.paused || !wasPlaying) {
          await el.play();
        }
      } catch {
        // autoplay blocked or network
      }

      scrubbingRef.current = false;
    },
    [ensureAudioReady, media.id, readDuration, requestPlay, resolvedDuration, updateNowPlayingProgress],
  );

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;

    if (!el.paused) {
      el.pause();
      return;
    }

    const ready = await ensureAudioReady();
    if (!ready) {
      setLoadError(true);
      return;
    }

    requestPlay(media.id);
    const metaReady = await waitForMetadata(el);
    if (!metaReady) {
      setLoadError(true);
      return;
    }

    const target = seekPositionRef.current > 0 ? seekPositionRef.current : progress;
    if (target > 0 && Math.abs(el.currentTime - target) > 0.2) {
      const actual = await seekAudio(el, target);
      seekPositionRef.current = actual;
      setProgress(actual);
    }

    try {
      await el.play();
    } catch {
      // autoplay blocked or network
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

  if (!streamUrl) {
    return (
      <div className="family-voice family-voice--loading" aria-busy aria-label="در حال پردازش صدا">
        <span className="family-voice__spinner" aria-hidden />
      </div>
    );
  }

  return (
    <div
      dir="ltr"
      className={cn('family-voice', !playing && 'family-voice--idle')}
    >
      <audio
        ref={audioRef}
        src={streamUrl}
        preload="metadata"
        playsInline
        onPlay={() => {
          setPlaying(true);
          const el = audioRef.current;
          const d = el ? readDuration(el) : resolvedDuration;
          const current = seekPositionRef.current > 0 ? seekPositionRef.current : (el?.currentTime ?? progress);
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
          setAudioReady(true);
          setLoadError(false);
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          if (scrubbingRef.current || draggingRef.current || scrubVisual != null) return;
          const t = e.currentTarget.currentTime;
          seekPositionRef.current = t;
          setProgress(t);
          if (activeId === media.id) {
            updateNowPlayingProgress(media.id, t, readDuration(e.currentTarget));
          }
        }}
        onError={() => {
          setAudioReady(false);
          setLoadError(true);
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void toggle();
        }}
        aria-label={playing ? 'توقف' : 'پخش'}
        className="family-voice-play"
      >
        {playing ? (
          <Pause className="h-[15px] w-[15px]" fill="currentColor" />
        ) : (
          <Play className="ms-px h-[15px] w-[15px]" fill="currentColor" />
        )}
      </button>

      <div className="family-voice__track">
        <button
          ref={waveRef}
          type="button"
          aria-label="موج صدا"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!loadRequested) {
              void ensureAudioReady();
            }
            if (!audioReady && !loadError) return;
            draggingRef.current = true;
            playingBeforeScrubRef.current = Boolean(audioRef.current && !audioRef.current.paused);
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
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            const ratio = scrubRatioRef.current || ratioFromClientX(e.clientX);
            void commitScrub(ratio);
          }}
          onPointerCancel={(e) => {
            draggingRef.current = false;
            setScrubVisual(null);
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          className={cn(
            'family-voice-wave min-w-0 flex-1 touch-none',
            loadRequested && !audioReady ? 'cursor-wait opacity-70' : 'cursor-pointer',
          )}
          style={{ '--wave-bars': barCount } as CSSProperties}
        >
          {waveform.map((v, i) => {
            const barRatio = barCount > 1 ? i / (barCount - 1) : 0;
            const played = barRatio <= progressRatio;
            const height = Math.round(4 + v * 22);
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
        </button>

        <div className="family-voice__aside">
          {loadRequested && !audioReady && !loadError ? (
            <span className="family-voice__spinner family-voice__spinner--sm" aria-label="در حال آماده‌سازی" />
          ) : null}
          {loadError ? (
            <button
              type="button"
              className="family-voice-speed"
              onClick={(e) => {
                e.stopPropagation();
                setLoadError(false);
                void ensureAudioReady();
              }}
            >
              تلاش مجدد
            </button>
          ) : null}
          {isPodcast && audioReady ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cyclePlaybackRate();
              }}
              aria-label={`سرعت پخش ${formatPlaybackSpeed(playbackRate)}`}
              className="family-voice-speed"
            >
              {formatPlaybackSpeed(playbackRate)}
            </button>
          ) : null}
          <span className="family-voice__duration tabular-nums">
            {formatTime(displayProgress > 0 || playing ? resolvedDuration - displayProgress : resolvedDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}
