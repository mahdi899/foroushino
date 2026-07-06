'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { MediaThumb } from '@/components/admin/MediaThumb';

type MediaPreviewProps = {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
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

/** Sized admin preview — scales small images up to fill the frame. */
export function MediaPreview({
  src,
  persistSrc,
  legacyPath,
  alt,
  className,
  imageClassName,
}: MediaPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width?: number; height?: number }>({});

  useEffect(() => {
    setSize({});
  }, [src]);

  const updateSize = useCallback((img: HTMLImageElement) => {
    const frame = frameRef.current;
    if (!frame) return;
    setSize(
      previewDimensions(img.naturalWidth, img.naturalHeight, frame.clientWidth, frame.clientHeight),
    );
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(() => {
      const img = frame.querySelector('img');
      if (img?.naturalWidth) updateSize(img);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [updateSize, src]);

  const onImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      updateSize(event.currentTarget);
    },
    [updateSize],
  );

  return (
    <div
      className={cn(
        'admin-media-preview relative mx-auto w-full overflow-hidden rounded-lg border border-border bg-surface-soft',
        className,
      )}
    >
      <div
        ref={frameRef}
        className="flex h-52 min-h-[13rem] w-full items-center justify-center p-4"
      >
        <MediaThumb
          src={src}
          persistSrc={persistSrc}
          legacyPath={legacyPath}
          alt={alt}
          onLoad={onImageLoad}
          className={cn('block object-contain', imageClassName)}
          style={
            size.width && size.height
              ? { width: size.width, height: size.height, maxWidth: '100%', maxHeight: '100%' }
              : undefined
          }
        />
      </div>
    </div>
  );
}
