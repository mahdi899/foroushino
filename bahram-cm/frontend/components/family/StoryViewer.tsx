'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { getStories } from '@/lib/family/api';
import type { FamilyStory } from '@/lib/family/types';

const STORY_DURATION_MS = 8000;

export function StoryViewer({
  open,
  onClose,
  profileName,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  profileName: string;
  onFinished?: (storyIds: number[]) => void;
}) {
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setIndex(0);
    getStories()
      .then((res) => setStories(res.data))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [open]);

  const finish = useCallback(() => {
    if (stories.length > 0) {
      onFinished?.(stories.map((s) => s.id));
    }
    onClose();
  }, [onClose, onFinished, stories]);

  const goNext = useCallback(() => {
    if (index >= stories.length - 1) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  }, [finish, index, stories.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!open || stories.length === 0 || loading) return;

    const timer = window.setTimeout(goNext, STORY_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open, stories.length, index, goNext, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowLeft') goNext();
      if (e.key === 'ArrowRight') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, goNext, goPrev]);

  const current = stories[index];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-stretch justify-center bg-black lg:items-center lg:bg-black/90 lg:p-6"
          role="dialog"
          aria-modal
          aria-label={`استوری ${profileName}`}
          onClick={finish}
        >
          <motion.div
            initial={{ opacity: 0, scale: 1, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[100dvh] w-full max-w-none lg:h-[min(calc(100dvh-3rem),52rem)] lg:w-[min(calc(100vw-3rem),calc((min(calc(100dvh-3rem),52rem))*9/16))] lg:max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="family-story-frame relative h-full w-full overflow-hidden bg-black lg:rounded-[1.35rem] lg:shadow-[0_24px_80px_rgba(0,0,0,0.55)] lg:ring-1 lg:ring-white/10">
              <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
                {stories.map((story, i) => (
                  <div key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{
                        width: i < index ? '100%' : i === index ? '100%' : '0%',
                        animation:
                          i === index && !loading ? `story-progress ${STORY_DURATION_MS}ms linear forwards` : undefined,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end px-3 pb-2 pt-[calc(max(0.75rem,env(safe-area-inset-top))+1.75rem)]">
                <button
                  type="button"
                  onClick={finish}
                  aria-label="بستن استوری"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition hover:bg-black/50"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="relative h-full w-full">
                {loading && (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-9 w-9 animate-spin text-white/85" aria-hidden />
                  </div>
                )}
                {!loading && stories.length === 0 && (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <p className="text-sm text-white/70">استوری فعالی وجود ندارد.</p>
                  </div>
                )}
                {!loading && current?.media?.url && (
                  <>
                    {current.media.type === 'video' ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        key={current.id}
                        src={current.media.url}
                        className="h-full w-full object-cover"
                        autoPlay
                        playsInline
                        muted
                        controls={false}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={current.id}
                        src={current.media.url}
                        alt={current.caption ?? ''}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
                    {current.caption && (
                      <p className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10 text-center text-sm leading-relaxed text-white/95 drop-shadow-md">
                        {current.caption}
                      </p>
                    )}
                  </>
                )}

                <button type="button" aria-label="قبلی" className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={goPrev} />
                <button type="button" aria-label="بعدی" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={goNext} />
              </div>
            </div>
          </motion.div>

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
    </AnimatePresence>,
    document.body,
  );
}
