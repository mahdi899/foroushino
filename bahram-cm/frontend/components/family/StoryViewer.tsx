'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';
import { getStories, recordStoryView } from '@/lib/family/api';
import { rememberFamilyMediaView } from '@/lib/family/mediaCache';
import { warmupUrls } from '@/lib/family/feedMediaWarmup';
import {
  resolveFamilyMediaUrl,
  resolveFamilyMediaPlaybackCandidates,
} from '@/lib/family/mediaPlaybackUrl';
import type { FamilyStory, FamilyStoryMedia } from '@/lib/family/types';
import { familyHaptic } from '@/lib/family/haptics';

const IMAGE_STORY_MS = 7000;
const STORY_HOLD_PAUSE_MS = 200;
const VIDEO_LOAD_TIMEOUT_MS = 25_000;
const STORY_VIEW_RECORD_DELAY_MS = 1500;

type VideoSlideState = 'loading' | 'playing' | 'error';

function isStoryVideo(media: FamilyStoryMedia): boolean {
  const type = (media.type ?? '').toLowerCase();
  if (type === 'video') return true;
  const mime = (media.mime_type ?? '').toLowerCase();
  return mime.startsWith('video/');
}

function storyMediaSrc(media: FamilyStoryMedia | null | undefined): string | null {
  if (!media) return null;
  return resolveFamilyMediaUrl(media.url);
}

function storyPreviewSrc(media: FamilyStoryMedia | null | undefined): string | null {
  if (!media?.preview_url) return null;
  return resolveFamilyMediaUrl(media.preview_url);
}

/** CDN + same-origin + raw API URL — local demo files often only exist on /storage. */
function storyImageCandidates(media: FamilyStoryMedia | null | undefined): string[] {
  if (!media?.url) return [];
  const out: string[] = [];
  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  };
  for (const c of resolveFamilyMediaPlaybackCandidates(media.url, media.id)) push(c);
  push(resolveFamilyMediaUrl(media.url));
  push(media.url);
  return out;
}

export function StoryViewer({
  open,
  onClose,
  profileName,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  profileName: string;
  onFinished?: (storyIds: number[]) => void;
}) {
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [videoSlideState, setVideoSlideState] = useState<VideoSlideState>('loading');
  const [videoSrcIndex, setVideoSrcIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [imageError, setImageError] = useState(false);

  const advanceTimerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const playAttemptRef = useRef(0);
  const imageTimerRef = useRef<{ startedAt: number; durationMs: number; pausedAt: number | null; accumulatedPauseMs: number } | null>(null);
  const recordedViewsRef = useRef<Set<number>>(new Set());
  const storyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const holdPauseTimerRef = useRef<number | null>(null);
  const holdPauseActiveRef = useRef(false);
  const lastSlideIndexRef = useRef(-1);
  const lastImageScheduleKeyRef = useRef('');
  const lastVideoSetupKeyRef = useRef('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setIndex(0);
    setSlideProgress(0);
    setVideoSlideState('loading');
    setVideoSrcIndex(0);
    setImageReady(false);
    setPreviewReady(false);
    setImageError(false);
    recordedViewsRef.current = new Set();
    getStories()
      .then((res) => setStories(res.data))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Prefetch upcoming previews first (tiny), then full image URLs.
  useEffect(() => {
    if (!open || stories.length === 0) return;
    const from = Math.max(0, index);
    const upcoming = stories.slice(from, from + 4);
    const previewUrls = upcoming
      .map((story) => storyPreviewSrc(story.media))
      .filter((url): url is string => Boolean(url));
    const fullUrls = upcoming
      .map((story) => {
        const media = story.media;
        if (!media || isStoryVideo(media)) return null;
        return resolveFamilyMediaUrl(media.url);
      })
      .filter((url): url is string => Boolean(url));
    warmupUrls([...previewUrls, ...fullUrls]);
  }, [open, stories, index]);

  const finish = useCallback(() => {
    if (stories.length > 0) {
      onFinished?.(stories.map((s) => s.id));
    }
    onClose();
  }, [onClose, onFinished, stories]);

  const goNext = useCallback(() => {
    if (index >= stories.length - 1) {
      finish();
      return;
    }
    lastImageScheduleKeyRef.current = '';
    lastVideoSetupKeyRef.current = '';
    setIndex((i) => i + 1);
    setSlideProgress(0);
    setVideoSlideState('loading');
    setVideoSrcIndex(0);
    setImageReady(false);
    setPreviewReady(false);
    setImageError(false);
  }, [finish, index, stories.length]);

  const goPrev = useCallback(() => {
    lastImageScheduleKeyRef.current = '';
    lastVideoSetupKeyRef.current = '';
    setIndex((i) => Math.max(0, i - 1));
    setSlideProgress(0);
    setVideoSlideState('loading');
    setVideoSrcIndex(0);
    setImageReady(false);
    setPreviewReady(false);
    setImageError(false);
  }, []);

  const clearSlideTimers = useCallback(() => {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (progressRafRef.current != null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    if (loadTimeoutRef.current != null) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    imageTimerRef.current = null;
  }, []);

  const scheduleImageSlide = useCallback(
    (durationMs: number) => {
      clearSlideTimers();
      const timer = {
        startedAt: performance.now(),
        durationMs,
        pausedAt: null as number | null,
        accumulatedPauseMs: 0,
      };
      imageTimerRef.current = timer;

      const tick = () => {
        const state = imageTimerRef.current;
        if (!state) return;
        if (state.pausedAt != null) {
          progressRafRef.current = requestAnimationFrame(tick);
          return;
        }
        const elapsed = performance.now() - state.startedAt - state.accumulatedPauseMs;
        setSlideProgress(Math.min(1, elapsed / state.durationMs));
        if (elapsed < state.durationMs) {
          progressRafRef.current = requestAnimationFrame(tick);
        }
      };
      progressRafRef.current = requestAnimationFrame(tick);

      const scheduleAdvance = () => {
        const state = imageTimerRef.current;
        if (!state || state.pausedAt != null) return;
        const elapsed = performance.now() - state.startedAt - state.accumulatedPauseMs;
        const remaining = Math.max(0, state.durationMs - elapsed);
        advanceTimerRef.current = window.setTimeout(() => {
          if (imageTimerRef.current?.pausedAt == null) goNext();
        }, remaining);
      };
      scheduleAdvance();
    },
    [clearSlideTimers, goNext],
  );

  const pauseSlide = useCallback(() => {
    holdPauseActiveRef.current = true;
    const state = imageTimerRef.current;
    if (state && state.pausedAt == null) {
      state.pausedAt = performance.now();
      if (advanceTimerRef.current != null) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    }
    if (videoEl && !videoEl.paused) {
      videoEl.pause();
    }
  }, [videoEl]);

  const resumeSlide = useCallback(() => {
    if (!holdPauseActiveRef.current) return;
    holdPauseActiveRef.current = false;
    const state = imageTimerRef.current;
    if (state?.pausedAt != null) {
      state.accumulatedPauseMs += performance.now() - state.pausedAt;
      state.pausedAt = null;
      const elapsed = performance.now() - state.startedAt - state.accumulatedPauseMs;
      const remaining = Math.max(0, state.durationMs - elapsed);
      advanceTimerRef.current = window.setTimeout(() => {
        if (imageTimerRef.current?.pausedAt == null) goNext();
      }, remaining);
    }
    if (videoEl && videoSlideState === 'playing') {
      void videoEl.play().catch(() => {});
    }
  }, [goNext, videoEl, videoSlideState]);

  const cancelHoldPauseTimer = useCallback(() => {
    if (holdPauseTimerRef.current != null) {
      window.clearTimeout(holdPauseTimerRef.current);
      holdPauseTimerRef.current = null;
    }
  }, []);

  const current = stories[index];
  const currentMedia = current?.media ?? null;
  const currentSrc = storyMediaSrc(currentMedia);
  const currentPreviewSrc = storyPreviewSrc(currentMedia);
  const currentIsVideo = currentMedia ? isStoryVideo(currentMedia) : false;
  const videoCandidates = currentSrc
    ? resolveFamilyMediaPlaybackCandidates(currentSrc, currentMedia?.id)
    : [];
  const activeVideoSrc = videoCandidates[videoSrcIndex] ?? currentSrc ?? '';

  const tryNextVideoSource = useCallback(() => {
    if (videoCandidates.length > videoSrcIndex + 1) {
      setVideoSrcIndex((i) => i + 1);
      setVideoSlideState('loading');
      return true;
    }
    return false;
  }, [videoCandidates.length, videoSrcIndex]);

  const retryVideo = useCallback(() => {
    lastVideoSetupKeyRef.current = '';
    playAttemptRef.current += 1;
    setVideoSlideState('loading');
    setVideoSrcIndex(0);
    if (videoEl) {
      videoEl.load();
      void videoEl.play().catch(() => {});
    }
  }, [videoEl]);

  useEffect(() => {
    if (!open) return;
    lastSlideIndexRef.current = -1;
    lastImageScheduleKeyRef.current = '';
    lastVideoSetupKeyRef.current = '';
    holdPauseActiveRef.current = false;
    cancelHoldPauseTimer();
  }, [cancelHoldPauseTimer, open]);

  useEffect(() => {
    if (!open || loading) return;
    if (lastSlideIndexRef.current === index) return;
    lastSlideIndexRef.current = index;
    lastImageScheduleKeyRef.current = '';
    lastVideoSetupKeyRef.current = '';
    clearSlideTimers();
    setSlideProgress(0);
  }, [clearSlideTimers, index, loading, open]);

  useEffect(() => {
    if (!open || loading || !current?.id || recordedViewsRef.current.has(current.id)) return;

    const storyId = current.id;
    const mediaReady = currentIsVideo ? videoSlideState === 'playing' : imageReady;
    if (!mediaReady) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || recordedViewsRef.current.has(storyId)) return;
      void recordStoryView(storyId).then((res) => {
        if (res.data.recorded) {
          recordedViewsRef.current.add(storyId);
        }
      });
    }, STORY_VIEW_RECORD_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [current?.id, currentIsVideo, imageReady, loading, open, videoSlideState]);

  useEffect(() => {
    if (!open || loading || !currentMedia || !currentSrc || currentIsVideo || !imageReady || !current?.id) {
      return;
    }
    const scheduleKey = String(current.id);
    if (lastImageScheduleKeyRef.current === scheduleKey) return;
    lastImageScheduleKeyRef.current = scheduleKey;
    scheduleImageSlide(IMAGE_STORY_MS);
    return clearSlideTimers;
  }, [
    clearSlideTimers,
    current?.id,
    currentIsVideo,
    currentMedia,
    currentSrc,
    imageReady,
    loading,
    open,
    scheduleImageSlide,
  ]);

  useEffect(() => {
    if (!open || loading || !currentIsVideo || !activeVideoSrc || !videoEl || !current?.id) return;

    const setupKey = `${current.id}:${activeVideoSrc}`;
    const isNewSetup = lastVideoSetupKeyRef.current !== setupKey;
    if (isNewSetup) {
      lastVideoSetupKeyRef.current = setupKey;
      clearSlideTimers();
      setSlideProgress(0);
      setVideoSlideState('loading');
      playAttemptRef.current += 1;
    }
    const attempt = playAttemptRef.current;

    let cancelled = false;

    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = 'metadata';
    rememberFamilyMediaView(currentSrc ?? activeVideoSrc, currentMedia!.id, 'video', currentMedia!.mime_type);

    loadTimeoutRef.current = window.setTimeout(() => {
      if (cancelled || attempt !== playAttemptRef.current) return;
      if (tryNextVideoSource()) return;
      setVideoSlideState('error');
    }, VIDEO_LOAD_TIMEOUT_MS);

    const clearLoadTimeout = () => {
      if (loadTimeoutRef.current != null) {
        window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };

    const startedRef = { value: false };

    const beginPlayback = () => {
      if (cancelled || attempt !== playAttemptRef.current || startedRef.value) return;
      startedRef.value = true;
      clearLoadTimeout();
      void videoEl
        .play()
        .then(() => {
          if (cancelled || attempt !== playAttemptRef.current) return;
          setVideoSlideState('playing');
        })
        .catch(() => {
          startedRef.value = false;
          if (cancelled || attempt !== playAttemptRef.current) return;
          if (tryNextVideoSource()) return;
          setVideoSlideState('error');
        });
    };

    const onLoadedData = () => {
      if (cancelled || attempt !== playAttemptRef.current) return;
      beginPlayback();
    };

    const onCanPlay = () => {
      if (cancelled || attempt !== playAttemptRef.current) return;
      if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        beginPlayback();
      }
    };

    const onPlaying = () => {
      if (cancelled || attempt !== playAttemptRef.current) return;
      clearLoadTimeout();
      setVideoSlideState('playing');
    };

    const onError = () => {
      if (cancelled || attempt !== playAttemptRef.current) return;
      clearLoadTimeout();
      if (tryNextVideoSource()) return;
      setVideoSlideState('error');
    };

    const onEnded = () => {
      if (cancelled) return;
      clearSlideTimers();
      goNext();
    };

    videoEl.addEventListener('loadeddata', onLoadedData);
    videoEl.addEventListener('canplay', onCanPlay);
    videoEl.addEventListener('playing', onPlaying);
    videoEl.addEventListener('error', onError);
    videoEl.addEventListener('ended', onEnded);

    void videoEl.play().catch(() => {});

    return () => {
      cancelled = true;
      clearLoadTimeout();
      videoEl.removeEventListener('loadeddata', onLoadedData);
      videoEl.removeEventListener('canplay', onCanPlay);
      videoEl.removeEventListener('playing', onPlaying);
      videoEl.removeEventListener('error', onError);
      videoEl.removeEventListener('ended', onEnded);
      videoEl.pause();
      clearSlideTimers();
    };
  }, [
    activeVideoSrc,
    clearSlideTimers,
    current?.id,
    currentIsVideo,
    currentMedia,
    currentSrc,
    goNext,
    loading,
    open,
    tryNextVideoSource,
    videoEl,
  ]);

  const handleVideoTimeUpdate = useCallback((video: HTMLVideoElement) => {
    if (holdPauseActiveRef.current) return;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    setSlideProgress(Math.min(1, video.currentTime / duration));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowLeft') goNext();
      if (e.key === 'ArrowRight') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, goNext, goPrev]);

  useEffect(() => {
    if (!open) clearSlideTimers();
    return clearSlideTimers;
  }, [clearSlideTimers, open]);

  useEffect(() => {
    if (!open) return;
    const preventNativeMenu = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', preventNativeMenu, { capture: true });
    document.addEventListener('dragstart', preventNativeMenu, { capture: true });
    document.addEventListener('selectstart', preventNativeMenu, { capture: true });
    return () => {
      document.removeEventListener('contextmenu', preventNativeMenu, { capture: true });
      document.removeEventListener('dragstart', preventNativeMenu, { capture: true });
      document.removeEventListener('selectstart', preventNativeMenu, { capture: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open || !currentMedia || currentIsVideo) {
      setImageReady(false);
      return;
    }

    const candidates = storyImageCandidates(currentMedia);
    if (candidates.length === 0) {
      setImageReady(false);
      setImageError(true);
      return;
    }

    setImageReady(false);
    setImageError(false);
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let candidateIndex = 0;
    const probe = new Image();
    probe.decoding = 'async';

    const paint = () => {
      if (cancelled || !probe.naturalWidth) return false;
      const canvas = storyCanvasRef.current;
      const host = canvas?.parentElement;
      if (!canvas || !host) return false;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      if (w < 2 || h < 2) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setImageReady(false);
        return true;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // object-cover — paint pixels only (no <img>/CSS url for Chrome “Download image”)
      const scale = Math.max(w / probe.naturalWidth, h / probe.naturalHeight);
      const dw = probe.naturalWidth * scale;
      const dh = probe.naturalHeight * scale;
      ctx.drawImage(probe, (w - dw) / 2, (h - dh) / 2, dw, dh);
      setImageReady(true);
      setImageError(false);
      return true;
    };

    const paintWhenReady = () => {
      if (paint()) {
        const host = storyCanvasRef.current?.parentElement;
        if (host && typeof ResizeObserver !== 'undefined') {
          ro?.disconnect();
          ro = new ResizeObserver(() => {
            paint();
          });
          ro.observe(host);
        }
        return;
      }
      if (!cancelled) requestAnimationFrame(paintWhenReady);
    };

    const tryCandidate = (index: number) => {
      if (cancelled) return;
      if (index >= candidates.length) {
        setImageReady(false);
        setImageError(true);
        return;
      }
      candidateIndex = index;
      probe.onload = () => {
        if (!cancelled) paintWhenReady();
      };
      probe.onerror = () => {
        if (!cancelled) tryCandidate(candidateIndex + 1);
      };
      probe.src = candidates[index]!;
    };

    tryCandidate(0);

    return () => {
      cancelled = true;
      ro?.disconnect();
      probe.onload = null;
      probe.onerror = null;
    };
  }, [open, current?.id, currentMedia, currentIsVideo]);

  const blockStoryContextMenu = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
  }, []);

  const onStoryPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointerStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      cancelHoldPauseTimer();
      holdPauseTimerRef.current = window.setTimeout(() => {
        holdPauseTimerRef.current = null;
        pauseSlide();
      }, STORY_HOLD_PAUSE_MS);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [cancelHoldPauseTimer, pauseSlide],
  );

  const onStoryPointerEnd = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      cancelHoldPauseTimer();
      const wasHolding = holdPauseActiveRef.current;
      if (wasHolding) {
        resumeSlide();
      }
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      if (!start) return;
      const dt = Date.now() - start.t;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (wasHolding || dt >= 280 || moved > 14) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = (e.clientX - rect.left) / rect.width;
      if (ratio <= 1 / 3) {
        familyHaptic('light');
        goNext();
      } else if (ratio >= 2 / 3) {
        familyHaptic('light');
        goPrev();
      }
    },
    [cancelHoldPauseTimer, goNext, goPrev, resumeSlide],
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'family-portal-surface fixed inset-0 z-[200] flex items-stretch justify-center bg-black lg:items-center lg:bg-black/90 lg:p-6',
            fontClassName,
          )}
          role="dialog"
          aria-modal
          aria-label={`استوری ${profileName}`}
          onClick={finish}
        >
          <motion.div
            initial={{ opacity: 0, scale: 1, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[100dvh] w-full max-w-none lg:h-[min(calc(100dvh-3rem),52rem)] lg:w-[min(calc(100vw-3rem),calc((min(calc(100dvh-3rem),52rem))*9/16))] lg:max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="family-story-frame relative h-full w-full overflow-hidden bg-black lg:rounded-[1.35rem] lg:shadow-[0_24px_80px_rgba(0,0,0,0.55)] lg:ring-1 lg:ring-white/10"
              onContextMenu={blockStoryContextMenu}
            >
              <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
                {stories.map((story, i) => (
                  <div key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full bg-emerald"
                      style={{
                        width:
                          i < index ? '100%' : i === index ? `${Math.round(slideProgress * 100)}%` : '0%',
                        transition: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end px-3 pb-2 pt-[calc(max(0.75rem,env(safe-area-inset-top))+1.75rem)]">
                <button
                  type="button"
                  onClick={finish}
                  aria-label="بستن استوری"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition hover:bg-black/50"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="relative h-full w-full">
                {loading && (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-9 w-9 animate-spin text-white/85" aria-hidden />
                  </div>
                )}
                {!loading && stories.length === 0 && (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <p className="text-sm text-white/70">استوری فعالی وجود ندارد.</p>
                  </div>
                )}
                {!loading && currentSrc && currentMedia && (
                  <>
                    {currentPreviewSrc ? (
                      // Tiny LQIP — stretched + CSS blur until full media paints.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`preview-${current.id}`}
                        src={currentPreviewSrc}
                        alt=""
                        aria-hidden
                        draggable={false}
                        onLoad={() => setPreviewReady(true)}
                        onError={() => setPreviewReady(false)}
                        className={cn(
                          'pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover scale-[1.12] blur-2xl transition-opacity duration-300',
                          (currentIsVideo ? videoSlideState === 'playing' : imageReady) || !previewReady
                            ? 'opacity-0'
                            : 'opacity-100',
                        )}
                      />
                    ) : null}
                    {currentIsVideo ? (
                      <>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          ref={setVideoEl}
                          key={`${current.id}:${activeVideoSrc}`}
                          src={activeVideoSrc}
                          className={cn(
                            'family-story-frame__media pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover transition-opacity duration-300',
                            videoSlideState === 'playing' ? 'opacity-100' : 'opacity-0',
                          )}
                          playsInline
                          muted
                          autoPlay
                          preload="metadata"
                          controls={false}
                          controlsList="nodownload noplaybackrate noremoteplayback"
                          disablePictureInPicture
                          disableRemotePlayback
                          onContextMenu={blockStoryContextMenu}
                          onTimeUpdate={(e) => handleVideoTimeUpdate(e.currentTarget)}
                        />
                        {videoSlideState === 'loading' && !previewReady && (
                          <div className="absolute inset-0 z-[18] flex items-center justify-center bg-black/40">
                            <Loader2 className="h-9 w-9 animate-spin text-white/90" aria-label="در حال بارگذاری ویدیو" />
                          </div>
                        )}
                        {videoSlideState === 'error' && (
                          <div className="absolute inset-0 z-[18] flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-white/90">
                            <p className="text-sm">پخش ویدیو ممکن نشد.</p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-sm transition hover:bg-white/25"
                                onClick={retryVideo}
                              >
                                تلاش دوباره
                              </button>
                              <button
                                type="button"
                                className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
                                onClick={goNext}
                              >
                                استوری بعدی
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <canvas
                        ref={storyCanvasRef}
                        key={current.id}
                        aria-label={current.caption?.trim() || 'استوری تصویری'}
                        role="img"
                        className={cn(
                          'family-story-frame__media-canvas pointer-events-none absolute inset-0 z-[2] h-full w-full transition-opacity duration-300',
                          imageReady ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    )}
                    {!currentIsVideo && imageError && (
                      <div className="absolute inset-0 z-[18] flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-white/90">
                        <p className="text-sm">بارگذاری تصویر استوری ممکن نشد.</p>
                        <button
                          type="button"
                          className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-sm transition hover:bg-white/25"
                          onClick={goNext}
                        >
                          استوری بعدی
                        </button>
                      </div>
                    )}
                    {!currentIsVideo && !imageReady && !previewReady && !imageError && (
                      <div className="absolute inset-0 z-[18] flex items-center justify-center">
                        <Loader2 className="h-9 w-9 animate-spin text-white/85" aria-hidden />
                      </div>
                    )}
                    <div
                      className="family-story-touch-shield"
                      aria-hidden
                      onContextMenu={blockStoryContextMenu}
                      onPointerDown={onStoryPointerDown}
                      onPointerUp={onStoryPointerEnd}
                      onPointerCancel={onStoryPointerEnd}
                    />
                    <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-black/45 via-transparent to-black/55" />
                    {current.caption && (
                      <p className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10 text-center text-sm leading-relaxed text-white/95 drop-shadow-md">
                        {current.caption}
                      </p>
                    )}
                  </>
                )}
                {!loading && current && !currentSrc && (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <p className="text-sm text-white/70">فایل استوری در دسترس نیست.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
