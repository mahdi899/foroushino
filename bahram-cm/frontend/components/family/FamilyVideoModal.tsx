'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { FamilyMediaDownloadButton } from '@/components/family/FamilyMediaDownloadButton';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { rememberFamilyMediaView } from '@/lib/family/mediaCache';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';
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
  portrait?: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReported = useRef(0);
  const streamUrl = resolveFamilyMediaUrl(url) ?? url;
  const [isPortrait, setIsPortrait] = useState(portrait);
  const [videoAspect, setVideoAspect] = useState<string | null>(null);
  const [coarsePointer, setCoarsePointer] = useState(readCoarsePointer);
  const [buffering, setBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState(false);
  const { register, unregister, requestPlay, notifyPaused, dismissNowPlaying } = useFamilyMediaPlayer();

  useEffect(() => {
    if (open) {
      setIsPortrait(portrait);
      setVideoAspect(null);
      setBuffering(true);
      setPlaybackError(false);
    }
  }, [open, portrait, streamUrl]);

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

    dismissNowPlaying();

    const el = videoRef.current;
    if (!el) return;

    el.preload = 'metadata';
    el.src = streamUrl;
    register(mediaId, el);
    requestPlay(mediaId);
    setBuffering(true);
    setPlaybackError(false);
    rememberFamilyMediaView(streamUrl, mediaId, 'video', 'video/mp4');

    const onCanPlay = () => {
      void el.play().catch(() => {
        setPlaybackError(true);
        setBuffering(false);
      });
    };

    el.addEventListener('canplay', onCanPlay, { once: true });

    return () => {
      el.removeEventListener('canplay', onCanPlay);
      el.pause();
      unregister(mediaId);
      notifyPaused(mediaId);
    };
  }, [dismissNowPlaying, mediaId, notifyPaused, open, register, requestPlay, streamUrl, unregister]);

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
        <div className="family-video-modal__actions">
          <FamilyMediaDownloadButton url={streamUrl} mediaId={mediaId} className="family-video-modal__download" />
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
        </div>

        <div
          className="family-video-modal__stage"
          style={stageStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {buffering && !playbackError ? (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/35">
              <Loader2 className="h-10 w-10 animate-spin text-white/90" aria-label="در حال بارگذاری ویدیو" />
            </div>
          ) : null}

          {playbackError ? (
            <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 px-6 text-center text-white/85">
              <p className="text-sm">پخش ویدیو ممکن نشد.</p>
              <button
                type="button"
                className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-sm transition hover:bg-white/25"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  setPlaybackError(false);
                  setBuffering(true);
                  el.load();
                  void el.play().catch(() => setPlaybackError(true));
                }}
              >
                تلاش دوباره
              </button>
            </div>
          ) : null}

          <video
            ref={videoRef}
            src={streamUrl}
            playsInline
            controls
            preload="metadata"
            controlsList={coarsePointer ? 'nofullscreen' : undefined}
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
            onCanPlay={() => setBuffering(false)}
            onPlaying={() => {
              setBuffering(false);
              setPlaybackError(false);
            }}
            onWaiting={() => setBuffering(true)}
            onError={() => {
              setBuffering(false);
              setPlaybackError(true);
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
