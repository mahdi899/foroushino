'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { sendMediaProgress } from '@/lib/family/api';

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
  const { register, unregister, requestPlay, notifyPaused, dismissNowPlaying } = useFamilyMediaPlayer();

  useEffect(() => {
    if (open) setIsPortrait(portrait);
  }, [open, portrait]);

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
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [handleClose, open]);

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
          onClick={(e) => e.stopPropagation()}
        >
          <video
            ref={videoRef}
            playsInline
            controls
            controlsList="nodownload"
            className="family-video-modal__player"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setIsPortrait(video.videoHeight > video.videoWidth);
              }
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
