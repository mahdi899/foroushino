'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { sendMediaProgress } from '@/lib/family/api';

function readCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function FamilyVideoModal({
  open,
  url,
  mediaId,
  postId,
  durationHint,
  portrait = false,
  onClose,
}: {
  open: boolean;
  url: string;
  mediaId: number;
  postId: number;
  durationHint?: number | null;
  /** Prefer 9:16 fullscreen layout when true; refined from video metadata when available. */
  portrait?: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReported = useRef(0);
  const [isPortrait, setIsPortrait] = useState(portrait);
  const [videoAspect, setVideoAspect] = useState<string | null>(null);
  const [coarsePointer, setCoarsePointer] = useState(readCoarsePointer);
  const { register, unregister, requestPlay, notifyPaused, dismissNowPlaying } = useFamilyMediaPlayer();

  useEffect(() => {
    if (open) {
      setIsPortrait(portrait);
      setVideoAspect(null);
    }
  }, [open, portrait]);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarsePointer(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const stopPlayback = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.pause();
      try {
        el.removeAttribute('src');
        el.load();
      } catch {
        // ignore
      }
    }
    notifyPaused(mediaId);
    unregister(mediaId);
  }, [mediaId, notifyPaused, unregister]);

  const handleClose = useCallback(() => {
    stopPlayback();
    dismissNowPlaying();
    onClose();
  }, [dismissNowPlaying, onClose, stopPlayback]);

  useEffect(() => {
    if (!open) return;

    // Hide voice/now-playing chrome while the fullscreen video is up.
    dismissNowPlaying();

    const el = videoRef.current;
    if (!el) return;

    el.src = url;
    register(mediaId, el);
    requestPlay(mediaId);
    void el.play().catch(() => {});

    return () => {
      el.pause();
      unregister(mediaId);
      notifyPaused(mediaId);
    };
  }, [dismissNowPlaying, mediaId, notifyPaused, open, register, requestPlay, unregister, url]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    const feedScroll = document.querySelector('.family-feed-scroll');
    const feedEl = feedScroll instanceof HTMLElement ? feedScroll : null;
    const prevFeedOverflow = feedEl?.style.overflow ?? '';

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (feedEl) feedEl.style.overflow = 'hidden';

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (feedEl) feedEl.style.overflow = prevFeedOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [handleClose, open]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !open) return;

    const onWebkitEndFullscreen = () => {
      if (document.fullscreenElement) return;
      el.style.objectFit = 'contain';
    };

    el.addEventListener('webkitendfullscreen', onWebkitEndFullscreen);
    return () => el.removeEventListener('webkitendfullscreen', onWebkitEndFullscreen);
  }, [open]);

  const reportProgress = (event: 'play' | 'pause' | 'complete', position: number, duration: number) => {
    const rounded = Math.floor(position);
    if (event === 'pause' && Math.abs(rounded - lastReported.current) < 2) return;
    lastReported.current = rounded;
    void sendMediaProgress({
      post_id: postId,
      media_id: mediaId,
      position: rounded,
      duration: Math.floor(duration),
      event,
    }).catch(() => {});
  };

  if (!open) return null;

  const playerStyle = videoAspect ? ({ aspectRatio: videoAspect } as CSSProperties) : undefined;
  const stageStyle = videoAspect
    ? ({ ['--family-video-aspect' as string]: videoAspect } as CSSProperties)
    : undefined;

  return (
    <FamilyBodyPortal>
      <div
        role="dialog"
        aria-modal
        aria-label="پخش ویدیو"
        className={cn(
          'family-video-modal',
          isPortrait ? 'family-video-modal--portrait' : 'family-video-modal--landscape',
        )}
        onClick={handleClose}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          aria-label="بستن"
          className="family-video-modal__close"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className="family-video-modal__stage"
          style={stageStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <video
            ref={videoRef}
            playsInline
            controls
            preload="auto"
            controlsList={coarsePointer ? 'nodownload nofullscreen' : 'nodownload'}
            disablePictureInPicture
            className="family-video-modal__player"
            style={playerStyle}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setIsPortrait(video.videoHeight > video.videoWidth);
                setVideoAspect(`${video.videoWidth} / ${video.videoHeight}`);
              }
            }}
            onPlay={(e) => {
              reportProgress(
                'play',
                e.currentTarget.currentTime,
                e.currentTarget.duration || durationHint || 0,
              );
            }}
            onPause={(e) => {
              notifyPaused(mediaId);
              reportProgress(
                'pause',
                e.currentTarget.currentTime,
                e.currentTarget.duration || durationHint || 0,
              );
            }}
            onEnded={(e) => {
              notifyPaused(mediaId);
              reportProgress(
                'complete',
                e.currentTarget.duration || 0,
                e.currentTarget.duration || durationHint || 0,
              );
            }}
          />
        </div>
      </div>
    </FamilyBodyPortal>
  );
}
