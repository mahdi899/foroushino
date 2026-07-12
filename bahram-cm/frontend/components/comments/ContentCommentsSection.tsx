'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquareText, Send, Sparkles } from 'lucide-react';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';
import { CommentAvatar } from '@/components/comments/CommentAvatar';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';
import { submitContentCommentAction } from '@/lib/contentComments/actions';
import { submitContentComment } from '@/lib/services/contentComments.client';
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
    <div className={cn(isReply && 'mt-3 ms-3 border-s-2 border-gold/20 ps-3 sm:ms-5 sm:ps-4')}>
      <article
        className={cn(
          'rounded-card border border-bone/10 p-4 sm:p-5',
          isReply ? 'bg-charcoal/25' : 'bg-charcoal/35',
        )}
      >
        <header className="flex items-start gap-3">
          <CommentAvatar name={comment.author_name} avatarUrl={comment.author_avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-bone">{comment.author_name}</p>
            {comment.created_at ? (
              <time className="mt-0.5 block text-caption text-mist" dateTime={comment.created_at}>
                {formatDateFa(comment.created_at)}
              </time>
            ) : null}
          </div>
        </header>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-bone-dim sm:mt-4 sm:text-base">
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
  const auth = useStudentAuthOptional();
  const isLoggedIn = Boolean(initialAuthor) || Boolean(auth?.isLoggedIn);
  const author = initialAuthor ?? (auth?.displayName
    ? { displayName: auth.displayName, avatarUrl: null, email: null }
    : null);

  const [comments, setComments] = useState(initialComments);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    captchaField,
    honeypotField,
    captchaReady,
    securityLoading,
    getSecurityPayload,
    resetCaptcha,
  } = useFormSecurity('leads', { captchaStacked: true, captchaInline: false });

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  if (!enabled) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError('متن نظر الزامی است.');
      return;
    }
    if (!isLoggedIn && !authorName.trim()) {
      setError('نام الزامی است.');
      return;
    }
    if (!captchaReady) {
      setError('لطفاً تأیید امنیتی را کامل کنید.');
      return;
    }

    setPending(true);
    setError('');
    setSuccess('');

    const security = getSecurityPayload();
    const payload = {
      author_name: isLoggedIn ? undefined : authorName.trim(),
      author_email: isLoggedIn ? undefined : authorEmail.trim() || undefined,
      body: body.trim(),
      ...security.captcha,
      website: security.website,
    };

    const result = isLoggedIn
      ? await submitContentCommentAction(type, slug, payload)
      : await submitContentComment(type, slug, payload);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      resetCaptcha();
      return;
    }

    setSuccess(result.data.message);
    setBody('');
    if (!isLoggedIn) {
      setAuthorName('');
      setAuthorEmail('');
    }
    resetCaptcha();
    router.refresh();
  }

  return (
    <section
      className="border-t border-bone/8 bg-ink py-10 sm:py-12 md:py-section-sm"
      aria-labelledby={`comments-${type}-${slug}`}
    >
      <div className="container-luxe mx-auto w-full min-w-0 max-w-3xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <MessageSquareText className="h-5 w-5 shrink-0 text-gold" aria-hidden />
            <h2
              id={`comments-${type}-${slug}`}
              className="text-h3 text-bone"
            >
              نظرات
            </h2>
            <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-gold/30 bg-gold/10 px-2 text-caption text-gold-soft">
              {comments.length.toLocaleString('fa-IR')}
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-dim sm:text-base">
            تجربه و دیدگاه خود را با دیگران به اشتراک بگذارید. نظرات پس از بررسی تیم منتشر می‌شوند.
          </p>
        </header>

        {/* List */}
        {comments.length > 0 ? (
          <div className="flex flex-col gap-3 sm:gap-4">
            {comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-bone/15 bg-charcoal/20 px-4 py-8 text-center sm:px-6 sm:py-10">
            <Sparkles className="mx-auto mb-3 h-5 w-5 text-gold" aria-hidden />
            <p className="text-sm text-bone-dim sm:text-base">
              هنوز نظری ثبت نشده. اولین نفری باشید که تجربه خود را می‌نویسد.
            </p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-card border border-bone/10 bg-charcoal/35 p-4 sm:mt-10 sm:p-6"
        >
          <h3 className="text-lg font-semibold text-bone">ثبت نظر</h3>
          <p className="mt-1.5 text-sm text-bone-dim">نظر شما پس از تأیید تیم نمایش داده می‌شود.</p>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}

          {isLoggedIn && author ? (
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-bone/10 bg-ink/50 p-3 sm:p-4">
              <CommentAvatar name={author.displayName} avatarUrl={author.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate font-medium text-bone">{author.displayName}</p>
                <p className="mt-0.5 text-caption text-mist">با پروفایل حساب کاربری شما ارسال می‌شود</p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            {!isLoggedIn ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0 sm:col-span-1">
                  <span className="mb-1.5 block text-caption text-mist">نام</span>
                  <input
                    className="w-full rounded-lg border border-bone/15 bg-ink/60 px-4 py-3 text-bone outline-none transition-colors focus:border-gold/40"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    maxLength={120}
                    required
                  />
                </label>
                <label className="block min-w-0 sm:col-span-1">
                  <span className="mb-1.5 block text-caption text-mist">ایمیل (اختیاری)</span>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-bone/15 bg-ink/60 px-4 py-3 text-bone outline-none transition-colors focus:border-gold/40"
                    dir="ltr"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <label className="block min-w-0">
              <span className="mb-1.5 block text-caption text-mist">متن نظر</span>
              <textarea
                className="min-h-28 w-full rounded-lg border border-bone/15 bg-ink/60 px-4 py-3 text-bone outline-none transition-colors focus:border-gold/40 sm:min-h-32"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                required
                placeholder="نظر یا سوال خود را بنویسید..."
              />
            </label>

            {honeypotField}

            <div className="min-w-0 w-full max-w-full overflow-x-auto">
              {captchaField}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="submit"
                data-neon-tone="gold"
                disabled={pending || securityLoading || !captchaReady}
                className={cn(
                  'neon-btn-primary neon-btn-vip group relative inline-flex h-12 w-full items-center justify-center gap-2.5',
                  'overflow-hidden rounded-pill px-8 text-base font-bold shadow-gold',
                  'transition-transform hover:-translate-y-px active:translate-y-0',
                  'disabled:pointer-events-none disabled:opacity-55 sm:w-auto sm:min-w-[11.5rem]',
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
              {!isLoggedIn && auth ? (
                <button
                  type="button"
                  className="text-sm text-gold-soft underline underline-offset-2 transition-colors hover:text-gold"
                  onClick={() => auth.openLogin({ redirectTo: window.location.pathname })}
                >
                  ورود با حساب کاربری
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
