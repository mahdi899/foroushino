'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getStories } from '@/lib/family/api';
import type { FamilyStory } from '@/lib/family/types';

const STORY_DURATION_MS = 8000;

export function StoryViewer({
  open,
  onClose,
  profileName,
}: {
  open: boolean;
  onClose: () => void;
  profileName: string;
}) {
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setIndex(0);
    getStories()
      .then((res) => setStories(res.data))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [open]);

  const goNext = useCallback(() => {
    if (index >= stories.length - 1) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  }, [index, onClose, stories.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!open || stories.length === 0) return;

    const timer = window.setTimeout(goNext, STORY_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open, stories.length, index, goNext]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goNext();
      if (e.key === 'ArrowRight') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goNext, goPrev]);

  const current = stories[index];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal
          aria-label={`استوری ${profileName}`}
        >
          <div className="flex gap-1 px-3 pt-3">
            {stories.map((story, i) => (
              <div key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-gold transition-all"
                  style={{
                    width: i < index ? '100%' : i === index ? '100%' : '0%',
                    animation: i === index ? `story-progress ${STORY_DURATION_MS}ms linear forwards` : undefined,
                  }}
                />
              </div>
            ))}
          </div>

          <header className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-bone">{profileName}</p>
            <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm text-bone/70 hover:text-bone">
              بستن
            </button>
          </header>

          <div className="relative flex flex-1 items-center justify-center px-4 pb-8">
            {loading && <p className="text-sm text-bone/60">در حال بارگذاری…</p>}
            {!loading && stories.length === 0 && <p className="text-sm text-bone/60">استوری فعالی وجود ندارد.</p>}
            {!loading && current?.media?.url && (
              <>
                {current.media.type === 'video' ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    key={current.id}
                    src={current.media.url}
                    className="max-h-[75dvh] w-full rounded-xl object-contain"
                    autoPlay
                    playsInline
                    muted={false}
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={current.id}
                    src={current.media.url}
                    alt={current.caption ?? ''}
                    className="max-h-[75dvh] w-full rounded-xl object-contain"
                  />
                )}
                {current.caption && (
                  <p className="absolute bottom-10 left-4 right-4 text-center text-sm text-bone/90">{current.caption}</p>
                )}
              </>
            )}

            <button type="button" aria-label="قبلی" className="absolute inset-y-0 right-0 w-1/3" onClick={goPrev} />
            <button type="button" aria-label="بعدی" className="absolute inset-y-0 left-0 w-1/3" onClick={goNext} />
          </div>

          <style jsx global>{`
            @keyframes story-progress {
              from {
                width: 0%;
              }
              to {
                width: 100%;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
