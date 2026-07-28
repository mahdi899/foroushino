'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { CommentAvatar } from '@/components/comments/CommentAvatar';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';
import { submitContentCommentAction } from '@/lib/contentComments/actions';
import {
  POST_COMMENT_PARAM,
  buildCommentLoginReturnUrl,
  clearContentCommentDraft,
  readContentCommentDraft,
  saveContentCommentDraft,
} from '@/lib/contentComments/draft';
import type {
  ContentCommentAuthor,
  ContentCommentRecord,
  ContentCommentType,
} from '@/lib/services/contentComments.types';
import { cn } from '@/lib/cn';
import { formatDateFa } from '@/lib/persian';

function CommentCard({ comment, depth = 0 }: { comment: ContentCommentRecord; depth?: number }) {
  const isReply = depth > 0;

  return (
    <div className={cn(isReply && 'mt-3 ms-3 border-s border-bone/10 ps-3 sm:ms-4 sm:ps-4')}>
      <article className="py-4">
        <header className="flex items-center gap-2.5">
          <CommentAvatar name={comment.author_name} avatarUrl={comment.author_avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-bone">{comment.author_name}</p>
            {comment.created_at ? (
              <time className="block text-[0.7rem] text-mist" dateTime={comment.created_at}>
                {formatDateFa(comment.created_at)}
              </time>
            ) : null}
          </div>
        </header>
        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-bone-dim sm:text-[0.95rem]">
          {comment.body}
        </p>
      </article>

      {comment.replies?.map((reply) => (
        <CommentCard key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

export function ContentCommentsSection({
  type,
  slug,
  enabled = true,
  initialComments,
  initialAuthor,
}: {
  type: ContentCommentType;
  slug: string;
  enabled?: boolean;
  initialComments: ContentCommentRecord[];
  initialAuthor?: ContentCommentAuthor | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useStudentAuthOptional();
  const isLoggedIn = Boolean(initialAuthor) || Boolean(auth?.isLoggedIn);
  const author = initialAuthor ?? (auth?.displayName
    ? { displayName: auth.displayName, avatarUrl: null, email: null }
    : null);

  const [comments, setComments] = useState(initialComments);
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return readContentCommentDraft(type, slug)?.authorName ?? '';
  });
  const [body, setBody] = useState(() => {
    if (typeof window === 'undefined') return '';
    return readContentCommentDraft(type, slug)?.body ?? '';
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const autoSubmitLock = useRef(false);
  const urlCleaned = useRef(false);
  const showNameField = !isLoggedIn || !author?.displayName || author.displayName === 'دانشجو';

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (!showNameField || authorName.trim()) return;
    if (author?.displayName && author.displayName !== 'دانشجو') {
      setAuthorName(author.displayName);
    }
  }, [showNameField, author?.displayName, authorName]);

  const submitComment = useCallback(async (name: string, text: string) => {
    setPending(true);
    setError('');
    setSuccess('');

    const result = await submitContentCommentAction(type, slug, {
      author_name: name.trim() || undefined,
      body: text.trim(),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    clearContentCommentDraft(type, slug);
    setSuccess(result.data.message || 'نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود.');
    setBody('');
    if (showNameField) setAuthorName('');
    return true;
  }, [type, slug, showNameField]);

  const submitPendingDraft = useCallback(() => {
    if (autoSubmitLock.current) return;
    const draft = readContentCommentDraft(type, slug);
    if (!draft?.body?.trim()) return;
    autoSubmitLock.current = true;
    setAuthorName(draft.authorName ?? '');
    setBody(draft.body);
    void submitComment(draft.authorName ?? '', draft.body).finally(() => {
      autoSubmitLock.current = false;
    });
  }, [type, slug, submitComment]);

  // Fallback for hard redirects (e.g. full-page login) — keep URL clean, no forced scroll.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const query = new URLSearchParams(window.location.search);
    if (query.get(POST_COMMENT_PARAM) !== '1') return;

    if (!urlCleaned.current) {
      urlCleaned.current = true;
      query.delete(POST_COMMENT_PARAM);
      const qs = query.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

      const draft = readContentCommentDraft(type, slug);
      if (draft?.body?.trim()) {
        setAuthorName(draft.authorName ?? '');
        setBody(draft.body);
      }
    }

    if (!isLoggedIn) return;
    submitPendingDraft();
  }, [enabled, isLoggedIn, pathname, router, slug, submitPendingDraft, type]);

  if (!enabled) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const name = authorName.trim();
    const text = body.trim();

    if (!text) {
      setError('متن نظر را بنویسید.');
      return;
    }
    if (text.length < 3) {
      setError('نظر کمی کوتاه است.');
      return;
    }
    if (showNameField && !name) {
      setError('نام را وارد کنید.');
      return;
    }

    if (!isLoggedIn) {
      saveContentCommentDraft({ type, slug, authorName: name, body: text });
      if (auth?.openLogin) {
        // Blur the submit control so closing the modal does not scroll it back into view.
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        auth.openLogin({
          purpose: 'comment',
          redirectTo: pathname,
          scrollY: window.scrollY,
          onSuccess: submitPendingDraft,
        });
        return;
      }
      const redirectTo = buildCommentLoginReturnUrl(pathname, window.location.search);
      router.push(`/panel/login?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    await submitComment(name || author?.displayName || '', text);
  }

  return (
    <section
      id="comments"
      className="scroll-mt-24 border-t border-bone/8 bg-ink py-10 sm:py-12 md:py-14"
      aria-labelledby={`comments-${type}-${slug}`}
    >
      <div className="container-luxe mx-auto w-full min-w-0 max-w-xl">
        <header className="mb-7 flex items-end justify-between gap-3 sm:mb-8">
          <h2
            id={`comments-${type}-${slug}`}
            className="font-display text-2xl font-semibold tracking-tight text-bone sm:text-[1.65rem]"
          >
            نظرات
          </h2>
          {comments.length > 0 ? (
            <span className="pb-0.5 text-sm tabular-nums text-mist">
              {comments.length.toLocaleString('fa-IR')} نظر
            </span>
          ) : null}
        </header>

        {comments.length > 0 ? (
          <div className="mb-8 divide-y divide-bone/8 border-y border-bone/8 sm:mb-10">
            {comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl border border-bone/10 bg-charcoal/30 p-4 sm:space-y-3.5 sm:p-5"
        >
          {!showNameField && author ? (
            <div className="flex items-center gap-2.5">
              <CommentAvatar name={author.displayName} avatarUrl={author.avatarUrl} size="sm" />
              <p className="truncate text-sm text-bone-dim">
                به‌نام <span className="font-medium text-bone">{author.displayName}</span>
              </p>
            </div>
          ) : (
            <label className="block min-w-0">
              <span className="mb-1.5 block text-caption text-mist">نام</span>
              <input
                className="h-11 w-full rounded-xl border border-bone/12 bg-ink/45 px-3.5 text-sm text-bone outline-none transition-[border-color,box-shadow] placeholder:text-mist/70 focus:border-gold/40 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-gold)_14%,transparent)]"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={120}
                placeholder="نام شما"
                autoComplete="name"
              />
            </label>
          )}

          <label className="block min-w-0">
            <span className="mb-1.5 block text-caption text-mist">نظر</span>
            <textarea
              className="min-h-[7rem] w-full resize-y rounded-xl border border-bone/12 bg-ink/45 px-3.5 py-3 text-sm leading-relaxed text-bone outline-none transition-[border-color,box-shadow] placeholder:text-mist/70 focus:border-gold/40 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-gold)_14%,transparent)] sm:min-h-[8rem]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="تجربه یا دیدگاه‌تان را بنویسید…"
            />
          </label>

          {error ? <p className="text-sm text-red-300/90">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300/90">{success}</p> : null}

          <button
            type="submit"
            disabled={pending}
            data-neon-tone="gold"
            className={cn(
              'neon-btn-primary neon-btn-vip group relative inline-flex h-12 w-full items-center justify-center gap-2.5',
              'overflow-hidden rounded-pill px-6 text-sm font-bold shadow-gold',
              'transition-transform hover:-translate-y-px active:translate-y-0',
              'disabled:pointer-events-none disabled:opacity-55',
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity group-hover:opacity-100"
            />
            {pending ? (
              <Loader2 className="relative h-4 w-4 animate-spin" />
            ) : (
              <Send className="relative h-4 w-4 rtl-flip" aria-hidden />
            )}
            <span className="relative">ارسال نظر</span>
          </button>
        </form>
      </div>
    </section>
  );
}
