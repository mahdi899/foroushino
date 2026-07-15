'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyVideoModal } from '@/components/family/FamilyVideoModal';
import type { FamilyMediaBlock } from '@/lib/family/types';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '…';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', '/')} مگابایت`;
}

export function VideoBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const preloadRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [bufferRatio, setBufferRatio] = useState(0);
  const [contentLength, setContentLength] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!media.url) return;

    let cancelled = false;
    setPhase('loading');
    setBufferRatio(0);

    void fetch(media.url, { method: 'HEAD' })
      .then((response) => {
        const len = response.headers.get('content-length');
        if (!cancelled && len) setContentLength(parseInt(len, 10));
      })
      .catch(() => {});

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

    video.preload = 'auto';
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
  }, [media.url]);

  if (!media.url) {
    return (
      <div
        className="flex aspect-video items-center justify-center rounded-2xl bg-[var(--family-surface-soft)] text-sm text-bone/50"
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
      >
        در حال پردازش ویدیو…
      </div>
    );
  }

  const isPortrait = Boolean(media.width && media.height && media.height > media.width);
  const downloadedBytes = contentLength ? Math.round(contentLength * bufferRatio) : null;
  const progressDeg = `${Math.round(bufferRatio * 360)}deg`;

  return (
    <>
      <div
        className={cn(
          'family-feed-video relative mx-auto w-full overflow-hidden rounded-2xl bg-black',
          isPortrait ? 'family-feed-video--portrait' : 'family-feed-video--landscape',
        )}
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
      >
        <video
          ref={preloadRef}
          src={media.url}
          playsInline
          muted
          preload="auto"
          className="pointer-events-none h-full w-full object-cover opacity-0"
          aria-hidden
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black/55" aria-hidden />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          {phase === 'loading' ? (
            <>
              <div
                className="family-video-progress-ring relative flex h-16 w-16 items-center justify-center rounded-full"
                style={{ '--progress-deg': progressDeg } as CSSProperties}
              >
                <Loader2 className="h-7 w-7 animate-spin text-white/90" aria-hidden />
              </div>
              <p className="text-[12px] font-medium tabular-nums text-white/85">
                {downloadedBytes != null && contentLength
                  ? `${formatBytes(downloadedBytes)} از ${formatBytes(contentLength)}`
                  : `${Math.round(bufferRatio * 100).toLocaleString('fa-IR')}٪`}
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="پخش ویدیو"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/92 text-charcoal shadow-lg transition hover:scale-[1.03] active:scale-95"
            >
              <Play className="ms-0.5 h-7 w-7" fill="currentColor" />
            </button>
          )}
        </div>
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
