'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { FamilyMediaDownloadButton } from '@/components/family/FamilyMediaDownloadButton';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { rememberFamilyMediaView } from '@/lib/family/mediaCache';
import {
  inferFamilyMediaMimeType,
  resolveFamilyMediaDownloadUrl,
  resolveFamilyMediaPlaybackCandidates,
} from '@/lib/family/mediaPlaybackUrl';
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
  const hasStartedRef = useRef(false);
  const userPausedRef = useRef(false);
  const playbackCandidates = useMemo(
    () => resolveFamilyMediaPlaybackCandidates(url, mediaId),
    [mediaId, url],
  );
  const downloadUrl = useMemo(() => resolveFamilyMediaDownloadUrl(url) ?? url, [url]);
  const [srcIndex, setSrcIndex] = useState(0);
  const activeSrc = playbackCandidates[srcIndex] ?? playbackCandidates[0] ?? url;
  const activeMime = inferFamilyMediaMimeType(activeSrc);
  const [isPortrait, setIsPortrait] = useState(portrait);
  const [videoAspect, setVideoAspect] = useState<string | null>(null);
  const [coarsePointer, setCoarsePointer] = useState(readCoarsePointer);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState(false);
  const { register, unregister, requestPlay, notifyPaused, dismissNowPlaying } = useFamilyMediaPlayer();

  useEffect(() => {
    if (open) {
      setSrcIndex(0);
      setIsPortrait(portrait);
      setVideoAspect(null);
      setIsBuffering(true);
      hasStartedRef.current = false;
      userPausedRef.current = false;
      setPlaybackError(false);
    }
  }, [open, portrait, url]);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarsePointer(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const tryNextSource = useCallback(() => {
    if (playbackCandidates.length > srcIndex + 1) {
      setSrcIndex((i) => i + 1);
      setIsBuffering(true);
      setPlaybackError(false);
      return true;
    }
    return false;
  }, [playbackCandidates.length, srcIndex]);

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

  const retryPlayback = useCallback(() => {
    setSrcIndex(0);
    setPlaybackError(false);
    setIsBuffering(true);
    userPausedRef.current = false;
    const el = videoRef.current;
    if (!el) return;
    el.load();
    void el.play().catch(() => setPlaybackError(true));
  }, []);

  useEffect(() => {
    if (!open) return;

    dismissNowPlaying();

    const el = videoRef.current;
    if (!el) return;

    register(mediaId, el);
    requestPlay(mediaId);
    setIsBuffering(true);
    setPlaybackError(false);
    rememberFamilyMediaView(downloadUrl, mediaId, 'video');

    const onCanPlay = () => {
      if (userPausedRef.current) return;
      void el.play().catch(() => {
        if (!tryNextSource()) {
          setPlaybackError(true);
          setIsBuffering(false);
        }
      });
    };

    el.addEventListener('canplay', onCanPlay, { once: true });

    return () => {
      el.removeEventListener('canplay', onCanPlay);
      el.pause();
      unregister(mediaId);
      notifyPaused(mediaId);
    };
  }, [
    activeSrc,
    dismissNowPlaying,
    downloadUrl,
    mediaId,
    notifyPaused,
    open,
    register,
    requestPlay,
    tryNextSource,
    unregister,
  ]);

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

  const handlePause = useCallback(
    (video: HTMLVideoElement) => {
      userPausedRef.current = true;
      setIsBuffering(false);

      if (!hasStartedRef.current && !video.ended) return;

      notifyPaused(mediaId);
      reportProgress('pause', video.currentTime, video.duration || durationHint || 0);
    },
    [durationHint, mediaId, notifyPaused],
  );

  const handlePlaying = useCallback((video: HTMLVideoElement) => {
    if (video.paused || video.ended) return;
    hasStartedRef.current = true;
    userPausedRef.current = false;
    setIsBuffering(false);
    setPlaybackError(false);
  }, []);

  const handleWaiting = useCallback((video: HTMLVideoElement) => {
    if (userPausedRef.current || video.paused || video.ended) return;
    setIsBuffering(true);
  }, []);

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
          <FamilyMediaDownloadButton url={downloadUrl} mediaId={mediaId} className="family-video-modal__download" />
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
          {isBuffering && !playbackError ? (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/35 pointer-events-none">
              <Loader2 className="h-10 w-10 animate-spin text-white/90" aria-label="در حال بارگذاری ویدیو" />
            </div>
          ) : null}

          {playbackError ? (
            <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 px-6 text-center text-white/85">
              <p className="text-sm">پخش ویدیو ممکن نشد.</p>
              <button
                type="button"
                className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-sm transition hover:bg-white/25"
                onClick={retryPlayback}
              >
                تلاش دوباره
              </button>
            </div>
          ) : null}

          {!playbackError ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={videoRef}
              key={activeSrc}
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
              onPlaying={(e) => handlePlaying(e.currentTarget)}
              onWaiting={(e) => handleWaiting(e.currentTarget)}
              onError={() => {
                if (tryNextSource()) return;
                setIsBuffering(false);
                setPlaybackError(true);
              }}
              onPlay={(e) => {
                hasStartedRef.current = true;
                userPausedRef.current = false;
                reportProgress(
                  'play',
                  e.currentTarget.currentTime,
                  e.currentTarget.duration || durationHint || 0,
                );
              }}
              onPause={(e) => handlePause(e.currentTarget)}
              onEnded={(e) => {
                hasStartedRef.current = true;
                userPausedRef.current = true;
                setIsBuffering(false);
                notifyPaused(mediaId);
                reportProgress(
                  'complete',
                  e.currentTarget.duration || 0,
                  e.currentTarget.duration || durationHint || 0,
                );
              }}
            >
              <source src={activeSrc} type={activeMime} />
            </video>
          ) : null}
        </div>
      </div>
    </FamilyBodyPortal>
  );
}
