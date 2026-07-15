'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { sendMediaProgress } from '@/lib/family/api';

export function FamilyVideoModal({
  open,
  url,
  mediaId,
  postId,
  durationHint,
  onClose,
}: {
  open: boolean;
  url: string;
  mediaId: number;
  postId: number;
  durationHint?: number | null;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReported = useRef(0);
  const { register, unregister, requestPlay, notifyPaused } = useFamilyMediaPlayer();

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !open) {
      videoRef.current?.pause();
      return;
    }
    register(mediaId, el);
    requestPlay(mediaId);
    void el.play().catch(() => {});
    return () => {
      el.pause();
      unregister(mediaId);
    };
  }, [mediaId, open, register, requestPlay, unregister]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

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
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/95 p-3 sm:p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="بستن"
        className="absolute end-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white/90 transition hover:bg-black/75 sm:end-5 sm:top-5"
      >
        <X className="h-5 w-5" />
      </button>
      <video
        ref={videoRef}
        src={url}
        playsInline
        controls
        className="max-h-[92vh] max-w-full rounded-xl"
        onClick={(e) => e.stopPropagation()}
        onPause={(e) => {
          notifyPaused(mediaId);
          reportProgress('pause', e.currentTarget.currentTime, e.currentTarget.duration || durationHint || 0);
        }}
        onEnded={(e) => {
          notifyPaused(mediaId);
          reportProgress('complete', e.currentTarget.duration || 0, e.currentTarget.duration || durationHint || 0);
        }}
      />
    </div>
  );
}
