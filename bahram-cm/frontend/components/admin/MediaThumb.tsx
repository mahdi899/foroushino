'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileAudio, FileVideo, Music, Pause, Play } from 'lucide-react';
import { adminMediaThumbFallbacks, normalizeAdminMediaUrl } from '@/lib/mediaUrl';
import { inferAdminMediaKind, type AdminMediaKind } from '@/lib/admin/mediaKind';
import { cn } from '@/lib/cn';

interface MediaThumbProps {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  mime?: string | null;
  kind?: AdminMediaKind;
  /** Show native player controls (preview / detail). */
  controls?: boolean;
  /** Compact inline play button in grid tiles (does not block opening manage). */
  interactive?: boolean;
  onLoad?: React.ReactEventHandler<HTMLImageElement | HTMLVideoElement>;
}

function stopBubble(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function InlinePlayButton({
  playing,
  label,
  onToggle,
  className,
}: {
  playing: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/75',
        className,
      )}
      onClick={(event) => {
        stopBubble(event);
        onToggle();
      }}
    >
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
    </button>
  );
}

export function MediaThumb({
  src,
  persistSrc,
  legacyPath,
  alt,
  className,
  style,
  mime,
  kind,
  controls = false,
  interactive = false,
  onLoad,
}: MediaThumbProps) {
  const fallbacks = useMemo(
    () => adminMediaThumbFallbacks({ src, persistSrc, legacyPath }),
    [src, persistSrc, legacyPath],
  );
  const [index, setIndex] = useState(0);
  const currentSrc = normalizeAdminMediaUrl(fallbacks[index] ?? src);
  const mediaKind = kind ?? inferAdminMediaKind(currentSrc, mime);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [fallbacks.join('|')]);

  const tryNextFallback = () => {
    setIndex((prev) => (prev + 1 < fallbacks.length ? prev + 1 : prev));
  };

  if (mediaKind === 'video') {
    if (controls) {
      return (
        <video
          src={currentSrc}
          controls
          playsInline
          preload="metadata"
          className={className}
          style={style}
          aria-label={alt}
          onLoadedMetadata={onLoad}
          onError={tryNextFallback}
        />
      );
    }

    return (
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          src={currentSrc}
          playsInline
          preload="metadata"
          muted={!playing}
          controls={playing && interactive}
          className={cn(className, !playing && 'pointer-events-none')}
          style={style}
          aria-label={alt}
          onLoadedMetadata={onLoad}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={tryNextFallback}
        />
        {interactive ? (
          <InlinePlayButton
            playing={playing}
            label={playing ? 'توقف ویدیو' : 'پخش ویدیو'}
            className="absolute bottom-9 start-2 z-10"
            onToggle={() => {
              const video = videoRef.current;
              if (!video) return;
              if (video.paused) void video.play();
              else video.pause();
            }}
          />
        ) : (
          <span className="pointer-events-none absolute start-1.5 top-1.5 z-[2] rounded-md bg-black/55 p-1 text-white">
            <FileVideo className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    );
  }

  if (mediaKind === 'audio') {
    if (controls) {
      return (
        <div className={cn('flex h-full w-full flex-col items-center justify-center gap-2 p-2', className)} style={style}>
          <Music className="h-8 w-8 shrink-0 text-primary/80" aria-hidden />
          <audio
            src={currentSrc}
            controls
            preload="metadata"
            className="w-full max-w-full"
            aria-label={alt}
            onError={tryNextFallback}
          />
        </div>
      );
    }

    return (
      <div
        className={cn('relative flex h-full w-full flex-col items-center justify-center gap-2 p-2', className)}
        style={style}
      >
        <Music className="h-8 w-8 shrink-0 text-primary/80" aria-hidden />
        <span className="line-clamp-2 text-center text-[10px] font-medium text-text-muted">{alt}</span>
        {interactive && (
          <>
            <audio
              ref={audioRef}
              src={currentSrc}
              preload="metadata"
              className="hidden"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={tryNextFallback}
            />
            <InlinePlayButton
              playing={playing}
              label={playing ? 'توقف صوت' : 'پخش صوت'}
              className="absolute bottom-9 start-2 z-10"
              onToggle={() => {
                const audio = audioRef.current;
                if (!audio) return;
                if (audio.paused) void audio.play();
                else audio.pause();
              }}
            />
          </>
        )}
        {!interactive && (
          <span className="pointer-events-none absolute start-1.5 top-1.5 rounded-md bg-black/55 p-1 text-white">
            <FileAudio className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    );
  }

  if (mediaKind === 'other') {
    return (
      <div
        className={cn('flex h-full w-full items-center justify-center p-2 text-caption text-text-muted', className)}
        style={style}
      >
        فایل
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onLoad={onLoad}
      onError={tryNextFallback}
    />
  );
}
