'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { MediaThumb } from '@/components/admin/MediaThumb';
import { inferAdminMediaKind } from '@/lib/admin/mediaKind';

type MediaPreviewProps = {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
  isRemote?: boolean;
  disk?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  mime?: string | null;
};

function previewDimensions(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
): { width: number; height: number } {
  if (!naturalW || !naturalH || !frameW || !frameH) {
    return { width: naturalW || 0, height: naturalH || 0 };
  }

  const pad = 32;
  const availW = Math.max(frameW - pad, 1);
  const availH = Math.max(frameH - pad, 1);
  const fit = Math.min(availW / naturalW, availH / naturalH, 4);

  return {
    width: Math.round(naturalW * fit),
    height: Math.round(naturalH * fit),
  };
}

/** Sized admin preview — scales small images up; video/audio use inline players. */
export function MediaPreview({
  src,
  persistSrc,
  legacyPath,
  isRemote,
  disk,
  alt,
  className,
  imageClassName,
  mime,
}: MediaPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width?: number; height?: number }>({});
  const mediaKind = useMemo(() => inferAdminMediaKind(src, mime), [src, mime]);

  useEffect(() => {
    setSize({});
  }, [src]);

  const updateSize = useCallback((img: HTMLImageElement | HTMLVideoElement) => {
    const frame = frameRef.current;
    if (!frame) return;
    const naturalW = 'naturalWidth' in img ? img.naturalWidth : img.videoWidth;
    const naturalH = 'naturalHeight' in img ? img.naturalHeight : img.videoHeight;
    setSize(previewDimensions(naturalW, naturalH, frame.clientWidth, frame.clientHeight));
  }, []);

  useEffect(() => {
    if (mediaKind !== 'image' && mediaKind !== 'video') return;
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(() => {
      const media = frame.querySelector('img, video');
      if (media instanceof HTMLImageElement && media.naturalWidth) {
        updateSize(media);
      } else if (media instanceof HTMLVideoElement && media.videoWidth) {
        updateSize(media);
      }
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [updateSize, src, mediaKind]);

  const onMediaLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
      updateSize(event.currentTarget);
    },
    [updateSize],
  );

  const frameClass =
    mediaKind === 'audio'
      ? 'flex min-h-[8rem] w-full items-center justify-center p-4'
      : 'flex h-52 min-h-[13rem] w-full items-center justify-center p-4';

  return (
    <div
      className={cn(
        'admin-media-preview relative mx-auto w-full overflow-hidden rounded-lg border border-border bg-surface-soft',
        className,
      )}
    >
      <div ref={frameRef} className={frameClass}>
        <MediaThumb
          src={src}
          persistSrc={persistSrc}
          legacyPath={legacyPath}
          isRemote={isRemote}
          disk={disk}
          alt={alt}
          mime={mime}
          controls={mediaKind === 'video' || mediaKind === 'audio'}
          onLoad={onMediaLoad}
          className={cn(
            mediaKind === 'audio' ? 'w-full' : 'block object-contain',
            imageClassName,
          )}
          style={
            mediaKind === 'image' || mediaKind === 'video'
              ? size.width && size.height
                ? { width: size.width, height: size.height, maxWidth: '100%', maxHeight: '100%' }
                : undefined
              : undefined
          }
        />
      </div>
    </div>
  );
}
