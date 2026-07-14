'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { sendMediaProgress } from '@/lib/family/api';
import type { FamilyMediaBlock } from '@/lib/family/types';

export function VideoBlock({ media, postId }: { media: FamilyMediaBlock; postId: number }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { activeId, register, unregister, requestPlay, notifyPaused } = useFamilyMediaPlayer();
  const [started, setStarted] = useState(false);
  const lastReported = useRef(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    register(media.id, el);
    return () => unregister(media.id);
  }, [media.id, register, unregister]);

  useEffect(() => {
    if (activeId !== media.id) videoRef.current?.pause();
  }, [activeId, media.id]);

  const reportProgress = (event: 'play' | 'pause' | 'complete', position: number, duration: number) => {
    const rounded = Math.floor(position);
    if (event === 'pause' && Math.abs(rounded - lastReported.current) < 2) return;
    lastReported.current = rounded;
    void sendMediaProgress({ post_id: postId, media_id: media.id, position: rounded, duration: Math.floor(duration), event }).catch(() => {});
  };

  if (!media.url) {
    return (
      <div
        className="flex aspect-video items-center justify-center rounded-2xl bg-white/5 text-sm text-bone/50"
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
      >
        در حال پردازش ویدیو…
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        src={media.url}
        playsInline
        preload="metadata"
        controls={started}
        className="w-full max-h-[70vh]"
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined}
        onPlay={() => {
          requestPlay(media.id);
          setStarted(true);
        }}
        onPause={(e) => {
          notifyPaused(media.id);
          reportProgress('pause', e.currentTarget.currentTime, e.currentTarget.duration || media.duration || 0);
        }}
        onEnded={(e) => {
          notifyPaused(media.id);
          reportProgress('complete', e.currentTarget.duration || 0, e.currentTarget.duration || media.duration || 0);
        }}
      />
      {!started && (
        <button
          type="button"
          onClick={() => videoRef.current?.play()}
          aria-label="پخش ویدیو"
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-lg">
            <Play className="h-6 w-6" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
