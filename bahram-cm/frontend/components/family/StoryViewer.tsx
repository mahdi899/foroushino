'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';
import { getStories } from '@/lib/family/api';
import { rememberFamilyMediaView } from '@/lib/family/mediaCache';
import {
  resolveFamilyMediaUrl,
  resolveFamilyMediaStreamCandidates,
} from '@/lib/family/mediaPlaybackUrl';
import type { FamilyStory, FamilyStoryMedia } from '@/lib/family/types';

const IMAGE_STORY_MS = 8000;
const MIN_VIDEO_STORY_MS = 3000;
const MAX_VIDEO_STORY_MS = 90_000;
const VIDEO_LOAD_TIMEOUT_MS = 25_000;

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
  const advanceTimerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const playAttemptRef = useRef(0);

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
    getStories()
      .then((res) => setStories(res.data))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [open]);

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
    setIndex((i) => i + 1);
    setSlideProgress(0);
    setVideoSlideState('loading');
    setVideoSrcIndex(0);
  }, [finish, index, stories.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setSlideProgress(0);
    setVideoSlideState('loading');
    setVideoSrcIndex(0);
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
  }, []);

  const scheduleImageSlide = useCallback(
    (durationMs: number) => {
      clearSlideTimers();
      const started = performance.now();

      const tick = () => {
        const elapsed = performance.now() - started;
        setSlideProgress(Math.min(1, elapsed / durationMs));
        if (elapsed < durationMs) {
          progressRafRef.current = requestAnimationFrame(tick);
        }
      };
      progressRafRef.current = requestAnimationFrame(tick);

      advanceTimerRef.current = window.setTimeout(() => {
        goNext();
      }, durationMs);
    },
    [clearSlideTimers, goNext],
  );

  const current = stories[index];
  const currentMedia = current?.media ?? null;
  const currentSrc = storyMediaSrc(currentMedia);
  const currentIsVideo = currentMedia ? isStoryVideo(currentMedia) : false;
  const videoCandidates = currentSrc
    ? resolveFamilyMediaStreamCandidates(currentSrc, currentMedia?.id)
    : [];
  const activeVideoSrc = videoCandidates[videoSrcIndex] ?? currentSrc ?? '';

  const scheduleVideoAdvance = useCallback(
    (video: HTMLVideoElement) => {
      if (!currentMedia) return;

      const hintedSec =
        currentMedia.duration && currentMedia.duration > 0 ? currentMedia.duration : video.duration;
      const maxMs =
        Number.isFinite(hintedSec) && hintedSec > 0
          ? Math.min(MAX_VIDEO_STORY_MS, Math.max(MIN_VIDEO_STORY_MS, hintedSec * 1000))
          : MAX_VIDEO_STORY_MS;

      advanceTimerRef.current = window.setTimeout(() => {
        if (!video.paused && !video.ended) goNext();
      }, maxMs + 500);
    },
    [currentMedia, goNext],
  );

  const tryNextVideoSource = useCallback(() => {
    if (videoCandidates.length > videoSrcIndex + 1) {
      setVideoSrcIndex((i) => i + 1);
      setVideoSlideState('loading');
      return true;
    }
    return false;
  }, [videoCandidates.length, videoSrcIndex]);

  const retryVideo = useCallback(() => {
    playAttemptRef.current += 1;
    setVideoSlideState('loading');
    setVideoSrcIndex(0);
    if (videoEl) {
      videoEl.load();
      void videoEl.play().catch(() => {});
    }
  }, [videoEl]);

  // Reset progress/timers when the active slide changes.
  useEffect(() => {
    if (!open || loading) return;
    clearSlideTimers();
    setSlideProgress(0);
  }, [clearSlideTimers, index, loading, open]);

  // Image stories: fixed timer + warm local cache.
  useEffect(() => {
    if (!open || loading || !currentMedia || !currentSrc || currentIsVideo) return;
    rememberFamilyMediaView(currentSrc, currentMedia.id, 'image', currentMedia.mime_type);
    scheduleImageSlide(IMAGE_STORY_MS);
    return clearSlideTimers;
  }, [
    clearSlideTimers,
    currentIsVideo,
    currentMedia,
    currentSrc,
    index,
    loading,
    open,
    scheduleImageSlide,
  ]);

  // Video stories: stream from CDN (with club proxy fallback) — never auto-skip on error.
  useEffect(() => {
    if (!open || loading || !currentIsVideo || !activeVideoSrc || !videoEl) return;

    let cancelled = false;
    clearSlideTimers();
    setSlideProgress(0);
    setVideoSlideState('loading');
    playAttemptRef.current += 1;
    const attempt = playAttemptRef.current;

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
          clearSlideTimers();
          scheduleVideoAdvance(videoEl);
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

    void videoEl.play().catch(() => {
      // Autoplay may wait for loadeddata — handlers above will retry.
    });

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
    currentIsVideo,
    currentMedia,
    goNext,
    index,
    loading,
    open,
    scheduleVideoAdvance,
    tryNextVideoSource,
    videoEl,
  ]);

  const handleVideoTimeUpdate = useCallback((video: HTMLVideoElement) => {
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
            <div className="family-story-frame relative h-full w-full overflow-hidden bg-black lg:rounded-[1.35rem] lg:shadow-[0_24px_80px_rgba(0,0,0,0.55)] lg:ring-1 lg:ring-white/10">
              <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
                {stories.map((story, i) => (
                  <div key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full bg-gold transition-[width] duration-75 ease-linear"
                      style={{
                        width:
                          i < index ? '100%' : i === index ? `${Math.round(slideProgress * 100)}%` : '0%',
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
                    {currentIsVideo ? (
                      <>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          ref={setVideoEl}
                          key={`${current.id}:${activeVideoSrc}`}
                          src={activeVideoSrc}
                          className="h-full w-full object-cover"
                          playsInline
                          muted
                          autoPlay
                          preload="metadata"
                          onTimeUpdate={(e) => handleVideoTimeUpdate(e.currentTarget)}
                        />
                        {videoSlideState === 'loading' && (
                          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/40">
                            <Loader2 className="h-9 w-9 animate-spin text-white/90" aria-label="در حال بارگذاری ویدیو" />
                          </div>
                        )}
                        {videoSlideState === 'error' && (
                          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-white/90">
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={current.id}
                        src={currentSrc}
                        alt={current.caption ?? ''}
                        className="h-full w-full object-cover"
                        decoding="async"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
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

                <button type="button" aria-label="قبلی" className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={goPrev} />
                <button type="button" aria-label="بعدی" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={goNext} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
