'use client';

import { useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDelayedInView } from '@/hooks/useDelayedInView';
import { FamilyVideoModal } from '@/components/family/FamilyVideoModal';
import { resolveFamilyMediaPosterUrl, resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';
import type { FamilyMediaBlock } from '@/lib/family/types';

function previewSrc(url: string): string {
  if (url.includes('#')) return url;
  return `${url}#t=0.1`;
}

export function VideoBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [posterReady, setPosterReady] = useState(false);

  const streamUrl = resolveFamilyMediaUrl(media.url);
  const posterUrl = resolveFamilyMediaPosterUrl(media.poster_url);
  const showFramePreview = !posterUrl && Boolean(streamUrl);
  const framePreviewReady = useDelayedInView(containerRef, 80, showFramePreview, true);

  const openPlayer = () => {
    if (!streamUrl) return;
    setModalOpen(true);
  };

  const stopFeedGesture = (event: PointerEvent | TouchEvent) => {
    event.stopPropagation();
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
        {posterUrl ? (
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
        ) : framePreviewReady ? (
          <video
            src={previewSrc(streamUrl)}
            playsInline
            muted
            preload="metadata"
            onLoadedData={() => setPosterReady(true)}
            onLoadedMetadata={() => setPosterReady(true)}
            className={cn(
              'pointer-events-none h-full w-full object-cover transition-opacity duration-300',
              posterReady ? 'opacity-100' : 'opacity-70',
            )}
            aria-hidden
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/45"
          aria-hidden
        />

        <button
          type="button"
          onPointerDown={stopFeedGesture}
          onTouchEnd={(event) => {
            stopFeedGesture(event);
            event.preventDefault();
            openPlayer();
          }}
          onClick={(event) => {
            event.stopPropagation();
            openPlayer();
          }}
          aria-label="پخش ویدیو"
          className="family-feed-video__play absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center transition cursor-pointer"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition hover:bg-black/65 active:scale-95">
            <Play className="ms-0.5 h-6 w-6 text-white/95" fill="currentColor" />
          </span>
        </button>
      </div>

      <FamilyVideoModal
        open={modalOpen}
        url={streamUrl}
        mediaId={media.id}
        postId={postId}
        durationHint={media.duration}
        portrait={isPortrait}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
