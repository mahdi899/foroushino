'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { CommentAvatar } from '@/components/family/CommentAvatar';
import { useFamilyComments } from '@/lib/family/hooks/useFamilyComments';
import { FamilyApiError } from '@/lib/family/errors';
import type { FamilyComment } from '@/lib/family/types';

export function CommentsPage({
  postId,
  onClose,
  onCommentAdded,
}: {
  postId: number;
  onClose: () => void;
  onCommentAdded?: (comment: FamilyComment) => void;
}) {
  const { comments, isLoading, submitting, submit } = useFamilyComments(postId, true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
    <div className="fixed inset-0 z-40 flex justify-center">
      <motion.div
        key="comments-page"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden bg-[#0b0f10]"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3 lg:px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="بازگشت"
            className="flex items-center gap-1 rounded-full px-1 py-1 text-bone/70 transition hover:bg-white/10 hover:text-bone"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium">بازگشت</span>
          </button>
          <h3 className="flex-1 text-center text-sm font-semibold text-bone lg:text-[15px]">نظرات</h3>
          <span className="w-[72px]" aria-hidden />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 lg:px-5">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-bone/50">در حال بارگذاری…</p>
          ) : comments.length === 0 ? (
            <p className="py-12 text-center text-sm text-bone/50">هنوز نظری ثبت نشده. اولین نفر باش.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-2.5">
                  <CommentAvatar name={c.user.name} avatar={c.user.avatar} size="sm" />
                  <div className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2.5 lg:px-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gold/80 lg:text-sm">{c.user.name}</span>
                      {c.is_pending_mine && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-bone/50">
                          در انتظار بررسی
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-bone/85">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 p-3 lg:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
          {justSent && !error && <p className="mb-2 text-xs text-gold/80">نظر شما ثبت شد.</p>}
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
              rows={2}
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
    </div>
  );
}

/** @deprecated Use CommentsPage — kept for test imports */
export const CommentsSheet = CommentsPage;
