'use client';

import { useEffect, useState } from 'react';
import { CommentAvatar } from '@/components/family/CommentAvatar';
import { useFamilyComments } from '@/lib/family/hooks/useFamilyComments';
import { FamilyApiError } from '@/lib/family/errors';
import type { FamilyComment } from '@/lib/family/types';
import { cn } from '@/lib/cn';

type CommentsPanelProps = {
  postId: number;
  onCommentAdded?: (comment: FamilyComment) => void;
  variant?: 'inline' | 'page';
  hideTitle?: boolean;
  className?: string;
};

export function CommentsPanel({
  postId,
  onCommentAdded,
  variant = 'inline',
  hideTitle = false,
  className,
}: CommentsPanelProps) {
  const { comments, isLoading, submitting, submit } = useFamilyComments(postId, true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    setValue('');
    setError(null);
    setJustSent(false);
  }, [postId]);

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
    <section className={cn('flex flex-col', variant === 'inline' && 'border-t border-white/10', className)}>
      {!hideTitle && (
        <div className="px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-bone/90">نظرات</h3>
        </div>
      )}

      <div
        className={cn(
          'min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4',
          variant === 'inline' ? 'max-h-[280px] lg:max-h-[320px]' : 'flex-1 px-3 py-3 sm:px-4 lg:px-5',
        )}
      >
        {isLoading ? (
          <p className="py-8 text-center text-sm text-bone/50">در حال بارگذاری…</p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-bone/50">هنوز نظری ثبت نشده. اولین نفر باش.</p>
        ) : (
          <ul className="space-y-3 pb-2">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <CommentAvatar name={c.user.name} avatar={c.user.avatar} size="sm" />
                <div className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gold/80">{c.user.name}</span>
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

      <div
        className={cn(
          'shrink-0 border-t border-white/10 p-3 sm:p-4',
          variant === 'page' && 'pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4',
        )}
      >
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
            className="flex-1 resize-none rounded-2xl border border-white/15 bg-transparent px-4 py-2.5 text-sm text-bone outline-none focus:border-gold/50"
          />
          <button
            type="submit"
            disabled={!value.trim() || submitting}
            className="shrink-0 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-charcoal disabled:opacity-50"
          >
            ارسال
          </button>
        </form>
      </div>
    </section>
  );
}
