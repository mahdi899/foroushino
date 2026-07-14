'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobileMotion } from '@/hooks/useIsMobileMotion';
import { cn } from '@/lib/cn';
import { useFamilyComments } from '@/lib/family/hooks/useFamilyComments';
import { FamilyApiError } from '@/lib/family/errors';
import type { FamilyComment } from '@/lib/family/types';

export function CommentsSheet({
  postId,
  onClose,
  onCommentAdded,
}: {
  postId: number;
  onClose: () => void;
  onCommentAdded?: (comment: FamilyComment) => void;
}) {
  const isMobile = useIsMobileMotion();
  const { comments, isLoading, submitting, submit } = useFamilyComments(postId, true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const handleSubmit = async () => {
    const body = value.trim();
    if (!body || submitting) return;
    setError(null);
    try {
      const created = await submit(body);
      setValue('');
      setJustSent(true);
      if (created && !created.is_pending_mine) {
        onCommentAdded?.(created);
      }
      setTimeout(() => setJustSent(false), 3000);
    } catch (e) {
      setError(e instanceof FamilyApiError ? e.message : 'ارسال نظر ناموفق بود.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[150] bg-black/60 lg:bg-black/45"
      />
      <motion.div
        key="sheet"
        initial={isMobile ? { y: '100%' } : { x: '100%' }}
        animate={isMobile ? { y: 0 } : { x: 0 }}
        exit={isMobile ? { y: '100%' } : { x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={cn(
          'fixed z-[151] flex flex-col bg-[#141a1f] shadow-2xl',
          isMobile
            ? 'inset-x-0 bottom-0 max-h-[80vh] rounded-t-3xl border-t border-white/10'
            : 'inset-y-0 start-0 w-full max-w-[420px] border-s border-white/10',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:px-5">
          <h3 className="text-sm font-semibold text-bone lg:text-[15px]">نظرات</h3>
          <button type="button" onClick={onClose} aria-label="بستن" className="rounded-full p-1 text-bone/60 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 lg:px-5">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-bone/50">در حال بارگذاری…</p>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-bone/50">هنوز نظری ثبت نشده. اولین نفر باش.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-white/[0.04] px-3 py-2.5 lg:px-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gold/80 lg:text-sm">{c.user.name}</span>
                    {c.is_pending_mine && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-bone/50">در انتظار بررسی</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-bone/85">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 p-3 lg:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
          {justSent && !error && (
            <p className="mb-2 text-xs text-gold/80">نظر شما ثبت شد.</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={500}
              rows={isMobile ? 1 : 2}
              placeholder="نظرت رو بنویس…"
              className="flex-1 resize-none rounded-2xl border border-white/15 bg-transparent px-4 py-2.5 text-sm text-bone outline-none focus:border-gold/50 lg:text-[15px]"
            />
            <button
              type="submit"
              disabled={!value.trim() || submitting}
              className="shrink-0 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-charcoal disabled:opacity-50 lg:px-5"
            >
              ارسال
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
