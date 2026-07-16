'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDelayedInView } from '@/hooks/useDelayedInView';
import { FamilyVideoModal } from '@/components/family/FamilyVideoModal';
import { enqueueFamilyMediaLoad } from '@/lib/family/mediaLoadQueue';
import {
  getFamilyMediaBlobUrl,
  readFamilyMediaBlob,
  tryCacheFamilyMediaBlob,
} from '@/lib/family/mediaCache';
import type { FamilyMediaBlock } from '@/lib/family/types';

type VideoPhase = 'idle' | 'preview' | 'loading' | 'ready';

function previewSrc(url: string): string {
  // Hint browsers to decode an early frame for the blurred poster.
  if (url.includes('#')) return url;
  return `${url}#t=0.1`;
}

export function VideoBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preloadRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<VideoPhase>('idle');
  const [loadRequested, setLoadRequested] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [bufferRatio, setBufferRatio] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const previewRequestedRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);

  // Don't gate on feed scrollIdle — that left an empty white frame.
  const previewReady = useDelayedInView(containerRef, 80, phase === 'idle', true);
  const posterUrl = media.poster_url ?? null;

  useEffect(() => {
    if (!media.url) return;

    let cancelled = false;
    void readFamilyMediaBlob('full', media.id, media.url).then((blob) => {
      if (cancelled || !blob) return;
      const key = `video-full:${media.id}`;
      setPlaybackUrl(getFamilyMediaBlobUrl(key, blob));
      setPhase('ready');
      setPosterReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [media.id, media.url]);

  useEffect(() => {
    if (!previewReady || !media.url || phase !== 'idle' || previewRequestedRef.current) return;

    previewRequestedRef.current = true;
    setPreviewActive(true);
    setPhase('preview');
  }, [media.id, media.url, phase, previewReady]);

  useEffect(() => {
    if (!loadRequested || !media.url) return;

    let cancelled = false;
    let raf = 0;
    setPhase('loading');
    setPosterReady(false);
    setBufferRatio(0);

    const updateBuffer = (video: HTMLVideoElement) => {
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
        setPosterReady(true);
      }
    };

    const attach = (video: HTMLVideoElement) => {
      const onProgress = () => updateBuffer(video);
      const onMeta = () => updateBuffer(video);
      const onReady = () => {
        setPhase('ready');
        setBufferRatio(1);
        setPosterReady(true);
      };

      video.addEventListener('progress', onProgress);
      video.addEventListener('loadedmetadata', onMeta);
      video.addEventListener('canplaythrough', onReady);

      void enqueueFamilyMediaLoad('full', media.id, async () => {
        const cached = await readFamilyMediaBlob('full', media.id, media.url!);
        const blob = cached ?? (await tryCacheFamilyMediaBlob(media.url!, media.id, 'full'));
        if (cancelled) return;

        const src =
          blob != null
            ? getFamilyMediaBlobUrl(`video-full:${media.id}`, blob)
            : media.url!;
        setPlaybackUrl(src);
        video.src = src;
        video.preload = 'auto';
        video.load();
      });

      return () => {
        video.removeEventListener('progress', onProgress);
        video.removeEventListener('loadedmetadata', onMeta);
        video.removeEventListener('canplaythrough', onReady);
      };
    };

    let detach: (() => void) | undefined;

    const waitForVideo = () => {
      const video = preloadRef.current;
      if (!video) {
        raf = requestAnimationFrame(waitForVideo);
        return;
      }
      detach = attach(video);
    };

    waitForVideo();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      detach?.();
    };
  }, [loadRequested, media.id, media.url]);

  const handleActivate = () => {
    if (phase === 'ready') {
      setModalOpen(true);
      return;
    }
    if (phase === 'idle' || phase === 'preview') {
      setLoadRequested(true);
    }
  };

  const handleClick = () => {
    if (clickTimerRef.current != null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      handleActivate();
    }, 280);
  };

  const handleDoubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (clickTimerRef.current != null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimerRef.current != null) window.clearTimeout(clickTimerRef.current);
    };
  }, []);

  if (!media.url) {
    return (
      <div
        className="flex aspect-video items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--family-text)_8%,transparent)]"
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
  const modalUrl = playbackUrl ?? media.url;

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'family-feed-video relative max-w-full overflow-hidden rounded-2xl bg-[color-mix(in_oklab,var(--family-text)_8%,transparent)]',
          isPortrait ? 'family-feed-video--portrait' : 'family-feed-video--landscape',
        )}
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
      >
        {posterUrl && phase !== 'ready' && !loadRequested ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            className={cn(
              'pointer-events-none h-full w-full object-cover transition-opacity duration-300',
              posterReady ? 'opacity-100' : 'opacity-70',
            )}
            onLoad={() => setPosterReady(true)}
            aria-hidden
          />
        ) : null}

        {previewActive && phase !== 'ready' && !loadRequested && !posterUrl && media.url ? (
          <video
            ref={previewRef}
            src={previewSrc(media.url)}
            playsInline
            muted
            preload="metadata"
            onLoadedData={(e) => {
              const video = e.currentTarget;
              try {
                if (video.currentTime < 0.001) video.currentTime = 0.08;
              } catch {
                // ignore
              }
              setPosterReady(true);
            }}
            onLoadedMetadata={() => setPosterReady(true)}
            onSeeked={() => setPosterReady(true)}
            className={cn(
              'pointer-events-none h-full w-full object-cover blur-md brightness-95 transition-opacity duration-300',
              posterReady ? 'opacity-100' : 'opacity-70',
            )}
            aria-hidden
          />
        ) : null}

        {loadRequested ? (
          <video
            ref={preloadRef}
            playsInline
            muted
            preload="auto"
            className={cn(
              'pointer-events-none h-full w-full object-cover transition-[filter,transform,opacity] duration-300',
              posterReady ? 'opacity-100' : 'opacity-70',
              phase === 'loading' ? 'scale-105 blur-md' : 'scale-100 blur-0',
            )}
            aria-hidden
          />
        ) : null}

        <div
          className={cn(
            'absolute inset-0',
            phase === 'idle'
              ? 'bg-[color-mix(in_oklab,var(--family-text)_6%,transparent)]'
              : phase === 'loading'
                ? 'bg-black/25'
                : phase === 'preview'
                  ? 'bg-black/10'
                  : 'bg-gradient-to-b from-black/15 via-black/35 to-black/55',
          )}
          aria-hidden
        />

        <button
          type="button"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          aria-label={
            phase === 'ready' ? 'پخش ویدیو' : phase === 'loading' ? 'در حال بارگذاری ویدیو' : 'بارگذاری ویدیو'
          }
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center transition cursor-pointer',
            phase === 'loading' && 'cursor-wait',
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
        url={modalUrl}
        mediaId={media.id}
        postId={postId}
        durationHint={media.duration}
        portrait={isPortrait}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
