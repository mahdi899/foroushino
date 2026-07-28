'use client';

import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import dynamic from 'next/dynamic';
import { Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyFeedMediaInView } from '@/hooks/useFamilyFeedMediaInView';
import { FamilyMediaDownloadButton } from '@/components/family/FamilyMediaDownloadButton';
import { resolveFamilyMediaPlaybackUrl, resolveFamilyMediaPosterUrl } from '@/lib/family/mediaPlaybackUrl';
import { hasFamilyMediaBeenSeen, markFamilyMediaSeen } from '@/lib/family/seenFamilyMedia';
import type { FamilyMediaBlock } from '@/lib/family/types';

/** Player chrome is only needed after a tap — keep it out of the feed bundle. */
const FamilyVideoModal = dynamic(
  () => import('@/components/family/FamilyVideoModal').then((m) => m.FamilyVideoModal),
  { ssr: false },
);

const DOUBLE_TAP_MS = 320;
const TAP_MOVE_PX = 12;

/** Media fragment so browsers paint a decoded frame without autoplay. */
function videoFramePreviewSrc(url: string): string {
  const hash = url.indexOf('#');
  const base = hash >= 0 ? url.slice(0, hash) : url;
  return `${base}#t=0.1`;
}

export function VideoBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapAtRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const streamUrl = resolveFamilyMediaPlaybackUrl(media.url);
  const downloadUrl = streamUrl ?? media.url;
  // Tiny blur poster only — never load the full video just for a feed preview.
  const posterUrl = resolveFamilyMediaPosterUrl(media.poster_url);
  const [modalOpen, setModalOpen] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [frameError, setFrameError] = useState(false);
  // Warmup may have already decoded this URL — start visible so we don't wait on a
  // cached-image onLoad that never fires (same pattern as ImageBlock).
  const [posterLoaded, setPosterLoaded] = useState(() => hasFamilyMediaBeenSeen(posterUrl));
  const [frameReady, setFrameReady] = useState(() =>
    Boolean(streamUrl && hasFamilyMediaBeenSeen(videoFramePreviewSrc(streamUrl))),
  );

  const needsPoster = Boolean(posterUrl) && !posterError;
  const needsFrameFallback = Boolean(streamUrl) && (!posterUrl || posterError) && !frameError;
  const previewSeen =
    (needsPoster && (hasFamilyMediaBeenSeen(posterUrl) || posterLoaded)) ||
    (needsFrameFallback &&
      Boolean(streamUrl && (hasFamilyMediaBeenSeen(videoFramePreviewSrc(streamUrl)) || frameReady)));
  const inView = useFamilyFeedMediaInView(
    containerRef,
    Boolean(streamUrl) && !previewSeen,
  );
  const shouldLoadPreview = previewSeen || inView;

  useEffect(() => {
    if (hasFamilyMediaBeenSeen(posterUrl)) {
      setPosterLoaded(true);
      setPosterError(false);
      return;
    }
    setPosterLoaded(false);
    setPosterError(false);
  }, [posterUrl]);

  useEffect(() => {
    if (!streamUrl) {
      setFrameReady(false);
      setFrameError(false);
      return;
    }
    const frameSrc = videoFramePreviewSrc(streamUrl);
    if (hasFamilyMediaBeenSeen(frameSrc)) {
      setFrameReady(true);
      setFrameError(false);
      return;
    }
    setFrameReady(false);
    setFrameError(false);
  }, [streamUrl]);

  const openPlayer = () => {
    if (!streamUrl) return;
    setModalOpen(true);
  };

  const stopFeedGesture = (event: PointerEvent | TouchEvent) => {
    event.stopPropagation();
  };

  const onSurfacePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Do not stopPropagation — feed scroll must keep working on mobile.
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const onSurfacePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const moved =
      Math.abs(event.clientX - start.x) > TAP_MOVE_PX ||
      Math.abs(event.clientY - start.y) > TAP_MOVE_PX;
    if (moved) {
      lastTapAtRef.current = 0;
      return;
    }

    const now = Date.now();
    if (now - lastTapAtRef.current <= DOUBLE_TAP_MS) {
      lastTapAtRef.current = 0;
      event.stopPropagation();
      openPlayer();
      return;
    }

    lastTapAtRef.current = now;
  };

  if (!streamUrl) {
    return (
      <div
        className="flex aspect-video items-center justify-center rounded-2xl"
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
        aria-busy
        aria-label="در حال پردازش ویدیو"
      >
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80" />
      </div>
    );
  }

  const isPortrait = Boolean(media.width && media.height && media.height > media.width);
  const showPoster = shouldLoadPreview && needsPoster;
  const showFrameFallback = shouldLoadPreview && needsFrameFallback;
  const showPreviewFailed = shouldLoadPreview && !needsPoster && !needsFrameFallback && Boolean(downloadUrl);
  const frameSrc = videoFramePreviewSrc(streamUrl);
  const videoAspectStyle =
    media.width && media.height
      ? { aspectRatio: `${media.width} / ${media.height}` }
      : { aspectRatio: isPortrait ? '3 / 4' : '16 / 9' };

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'family-feed-video relative max-w-full overflow-hidden rounded-2xl',
          isPortrait ? 'family-feed-video--portrait' : 'family-feed-video--landscape',
        )}
        style={videoAspectStyle}
      >
        {/* Soft placeholder so the cell is never a flat black void while poster loads. */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#1a2830] via-[#132028] to-[#0c1418]"
          aria-hidden
        />

        {showPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl ?? undefined}
            alt=""
            decoding="async"
            fetchPriority="auto"
            // Always visible once mounted — tiny LQIP; opacity-0 + missed onLoad left cells blank.
            className="pointer-events-none absolute inset-0 h-full w-full object-cover scale-[1.04] blur-sm opacity-100"
            onLoad={() => {
              if (posterUrl) markFamilyMediaSeen(posterUrl);
              setPosterLoaded(true);
            }}
            onError={() => setPosterError(true)}
            aria-hidden
          />
        ) : null}

        {showFrameFallback ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={frameSrc}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            onLoadedMetadata={(event) => {
              const el = event.currentTarget;
              try {
                if (el.currentTime < 0.05) el.currentTime = 0.1;
              } catch {
                // ignore seek errors (some browsers lock until more data)
              }
            }}
            onLoadedData={() => {
              markFamilyMediaSeen(frameSrc);
              setFrameReady(true);
            }}
            onSeeked={() => {
              markFamilyMediaSeen(frameSrc);
              setFrameReady(true);
            }}
            onError={() => setFrameError(true)}
            aria-hidden
          />
        ) : null}

        {showPreviewFailed && downloadUrl ? (
          <span className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 bg-black/35 px-3 backdrop-blur-md">
            <span className="text-xs text-bone/75">پیش‌نمایش ویدیو در دسترس نیست</span>
            <FamilyMediaDownloadButton
              url={downloadUrl}
              mediaId={media.id}
              label="دانلود"
              className="pointer-events-auto"
            />
          </span>
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/45"
          aria-hidden
        />

        {/* Surface: double-tap / double-click only — single tap/scroll must not open player */}
        <div
          className="absolute inset-0 z-[1] touch-pan-y"
          onPointerDown={onSurfacePointerDown}
          onPointerUp={onSurfacePointerUp}
          onPointerCancel={() => {
            pointerStartRef.current = null;
            lastTapAtRef.current = 0;
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            openPlayer();
          }}
          aria-hidden
        />

        <div className="family-feed-video__play pointer-events-none absolute inset-0 z-[2] flex items-center justify-center p-4">
          <button
            type="button"
            onPointerDown={stopFeedGesture}
            onClick={(event) => {
              event.stopPropagation();
              lastTapAtRef.current = 0;
              openPlayer();
            }}
            aria-label="پخش ویدیو"
            className="pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition hover:bg-black/65 active:scale-95"
          >
            <Play className="ms-0.5 h-6 w-6 text-white/95" fill="currentColor" />
          </button>
        </div>
      </div>

      <FamilyVideoModal
        open={modalOpen}
        url={streamUrl ?? media.url ?? ''}
        posterUrl={posterUrl ?? undefined}
        mediaId={media.id}
        postId={postId}
        durationHint={media.duration}
        portrait={isPortrait}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
