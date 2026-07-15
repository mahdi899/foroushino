'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyVideoModal } from '@/components/family/FamilyVideoModal';
import type { FamilyMediaBlock } from '@/lib/family/types';

export function VideoBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const preloadRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [posterReady, setPosterReady] = useState(false);
  const [bufferRatio, setBufferRatio] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: '240px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !media.url) return;

    let cancelled = false;
    setPhase('loading');
    setPosterReady(false);
    setBufferRatio(0);

    const video = preloadRef.current;
    if (!video) return () => {
      cancelled = true;
    };

    const updateBuffer = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      let bufferedEnd = 0;
      for (let i = 0; i < video.buffered.length; i += 1) {
        bufferedEnd = Math.max(bufferedEnd, video.buffered.end(i));
      }

      const ratio = Math.min(1, bufferedEnd / duration);
      setBufferRatio(ratio);
      if (ratio >= 0.985 || video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        setPhase('ready');
        setBufferRatio(1);
      }
    };

    const markReady = () => {
      setPhase('ready');
      setBufferRatio(1);
    };

    video.preload = 'metadata';
    video.addEventListener('progress', updateBuffer);
    video.addEventListener('canplaythrough', markReady);
    video.addEventListener('loadedmetadata', updateBuffer);
    video.load();

    return () => {
      cancelled = true;
      video.removeEventListener('progress', updateBuffer);
      video.removeEventListener('canplaythrough', markReady);
      video.removeEventListener('loadedmetadata', updateBuffer);
    };
  }, [isVisible, media.url]);

  if (!media.url) {
    return (
      <div
        className="flex aspect-video items-center justify-center rounded-2xl bg-[var(--family-surface-soft)]"
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
        aria-busy
        aria-label="در حال پردازش ویدیو"
      >
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80" />
      </div>
    );
  }

  const isPortrait = Boolean(media.width && media.height && media.height > media.width);
  const progressDeg = `${Math.round(bufferRatio * 360)}deg`;

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'family-feed-video relative mx-auto w-full overflow-hidden rounded-2xl bg-[var(--family-surface-soft)]',
          isPortrait ? 'family-feed-video--portrait' : 'family-feed-video--landscape',
        )}
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
      >
        <video
          ref={preloadRef}
          src={isVisible ? media.url : undefined}
          playsInline
          muted
          preload={isVisible ? 'metadata' : 'none'}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            try {
              if (video.currentTime < 0.001) video.currentTime = 0.001;
            } catch {
              // ignore
            }
          }}
          onLoadedData={() => {
            setPosterReady(true);
          }}
          onSeeked={() => {
            setPosterReady(true);
          }}
          className={cn(
            'pointer-events-none h-full w-full object-cover transition-[filter,transform,opacity] duration-300',
            posterReady ? 'opacity-100' : 'opacity-0',
            phase === 'loading' ? 'scale-105 blur-md' : 'scale-100 blur-0',
          )}
          aria-hidden
        />

        <div
          className={cn(
            'absolute inset-0',
            phase === 'loading'
              ? 'bg-black/25'
              : 'bg-gradient-to-b from-black/15 via-black/35 to-black/55',
          )}
          aria-hidden
        />

        <button
          type="button"
          disabled={phase !== 'ready'}
          onClick={() => {
            if (phase === 'ready') setModalOpen(true);
          }}
          aria-label={phase === 'ready' ? 'پخش ویدیو' : 'در حال بارگذاری ویدیو'}
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center transition',
            phase === 'ready' ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          {phase === 'loading' ? (
            <div
              className="family-video-progress-ring relative flex h-11 w-11 items-center justify-center rounded-full"
              style={{ '--progress-deg': progressDeg } as CSSProperties}
              aria-label="در حال بارگذاری"
            >
              <Loader2 className="h-5 w-5 animate-spin text-white/90" aria-hidden />
            </div>
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition hover:bg-black/60 active:scale-95">
              <Play className="ms-0.5 h-5 w-5 text-white/90" fill="currentColor" />
            </span>
          )}
        </button>
      </div>

      <FamilyVideoModal
        open={modalOpen}
        url={media.url}
        mediaId={media.id}
        postId={postId}
        durationHint={media.duration}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
