'use client';

import { useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLazyInViewOnce } from '@/hooks/useLazyInViewOnce';
import { FamilyMediaDownloadButton } from '@/components/family/FamilyMediaDownloadButton';
import { FamilyVideoModal } from '@/components/family/FamilyVideoModal';
import { resolveFamilyMediaPlaybackUrl, resolveFamilyMediaPosterUrl } from '@/lib/family/mediaPlaybackUrl';
import type { FamilyMediaBlock } from '@/lib/family/types';

const DOUBLE_TAP_MS = 320;
const TAP_MOVE_PX = 12;

export function VideoBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapAtRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [posterError, setPosterError] = useState(false);

  const streamUrl = resolveFamilyMediaPlaybackUrl(media.url);
  const downloadUrl = streamUrl ?? media.url;
  const posterUrl = resolveFamilyMediaPosterUrl(media.poster_url);
  const showFramePreview = !posterUrl && Boolean(streamUrl);
  const shouldLoadPreview = useLazyInViewOnce(containerRef, Boolean(streamUrl));

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
  const showPoster = shouldLoadPreview && !posterError && (posterUrl || showFramePreview);
  const videoAspectStyle =
    media.width && media.height
      ? { aspectRatio: `${media.width} / ${media.height}` }
      : { aspectRatio: isPortrait ? '3 / 4' : '16 / 9' };

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'family-feed-video relative max-w-full overflow-hidden rounded-2xl bg-[color-mix(in_oklab,var(--family-text)_8%,transparent)]',
          isPortrait ? 'family-feed-video--portrait' : 'family-feed-video--landscape',
        )}
        style={videoAspectStyle}
      >
        {!posterReady && !posterError && (
          <span
            className="absolute inset-0 bg-[color-mix(in_oklab,var(--family-text)_6%,transparent)]"
            aria-hidden
          />
        )}

        {showPoster && posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            className="pointer-events-none h-full w-full object-cover"
            onLoad={() => setPosterReady(true)}
            onError={() => setPosterError(true)}
            aria-hidden
          />
        ) : showPoster ? (
          <video
            src={streamUrl}
            playsInline
            muted
            preload="metadata"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              try {
                if (video.duration > 0.15) video.currentTime = 0.1;
              } catch {
                /* seek unsupported — first frame is fine */
              }
              setPosterReady(true);
            }}
            onLoadedData={() => setPosterReady(true)}
            onError={() => setPosterError(true)}
            className="pointer-events-none h-full w-full object-cover"
            aria-hidden
          />
        ) : null}

        {posterError && downloadUrl && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 px-3 backdrop-blur-md">
            <span className="text-xs text-bone/75">پیش‌نمایش ویدیو در دسترس نیست</span>
            <FamilyMediaDownloadButton
              url={downloadUrl}
              mediaId={media.id}
              label="دانلود"
              className="pointer-events-auto"
            />
          </span>
        )}

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
        url={streamUrl ?? media.url}
        mediaId={media.id}
        postId={postId}
        durationHint={media.duration}
        portrait={isPortrait}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
