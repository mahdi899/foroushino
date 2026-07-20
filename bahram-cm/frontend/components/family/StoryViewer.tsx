'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';
import { getStories } from '@/lib/family/api';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';
import type { FamilyStory, FamilyStoryMedia } from '@/lib/family/types';

const IMAGE_STORY_MS = 8000;
const MIN_VIDEO_STORY_MS = 3000;
const MAX_VIDEO_STORY_MS = 90_000;

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);

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
  }, [finish, index, stories.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setSlideProgress(0);
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

  // Reset progress/timers when the active slide changes.
  useEffect(() => {
    if (!open || loading) return;
    clearSlideTimers();
    setSlideProgress(0);
  }, [clearSlideTimers, index, loading, open]);

  // Image stories: fixed timer.
  useEffect(() => {
    if (!open || loading || !currentMedia || !currentSrc || currentIsVideo) return;
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

  // Video stories: autoplay from CDN with progress + auto-advance.
  useEffect(() => {
    if (!open || loading || !currentIsVideo || !currentSrc) return;

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    clearSlideTimers();
    setSlideProgress(0);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = currentSrc;
    video.load();

    const onError = () => {
      if (cancelled) return;
      scheduleImageSlide(IMAGE_STORY_MS);
    };

    const onCanPlay = () => {
      if (cancelled) return;
      void video.play().then(() => {
        if (!cancelled) scheduleVideoAdvance(video);
      }).catch(onError);
    };

    const onEnded = () => {
      if (cancelled) return;
      clearSlideTimers();
      goNext();
    };

    video.addEventListener('canplay', onCanPlay, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.addEventListener('ended', onEnded);

    return () => {
      cancelled = true;
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onEnded);
      video.pause();
      clearSlideTimers();
    };
  }, [
    clearSlideTimers,
    currentIsVideo,
    currentSrc,
    goNext,
    index,
    loading,
    open,
    scheduleImageSlide,
    scheduleVideoAdvance,
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
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        ref={videoRef}
                        key={current.id}
                        className="h-full w-full object-cover"
                        playsInline
                        muted
                        preload="auto"
                        onTimeUpdate={(e) => handleVideoTimeUpdate(e.currentTarget)}
                      />
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
