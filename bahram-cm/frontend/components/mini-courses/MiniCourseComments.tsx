'use client';

import { useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';
import {
  submitMiniCourseComment,
  type MiniCourseCommentRecord,
} from '@/lib/services/miniCourses.client';
import { formatPanelFa } from '@/lib/persian';

function CommentItem({ comment, depth = 0 }: { comment: MiniCourseCommentRecord; depth?: number }) {
  return (
    <div className={depth > 0 ? 'mr-5 border-r border-bone/10 pr-4' : ''}>
      <article className="rounded-card border border-bone/10 bg-charcoal/35 p-4 md:p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-bone">{comment.author_name}</p>
          {comment.created_at ? (
            <time className="text-caption text-mist" dateTime={comment.created_at}>
              {formatPanelFa(comment.created_at)}
            </time>
          ) : null}
        </header>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-bone-dim md:text-base">
          {comment.body}
        </p>
      </article>
      {comment.replies?.map((reply) => (
        <div key={reply.id} className="mt-3">
          <CommentItem comment={reply} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export function MiniCourseComments({
  slug,
  enabled,
  initialComments,
}: {
  slug: string;
  enabled: boolean;
  initialComments: MiniCourseCommentRecord[];
}) {
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

  if (!enabled) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) {
      setError('نام و متن نظر الزامی است.');
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
    const result = await submitMiniCourseComment(slug, {
      author_name: authorName.trim(),
      author_email: authorEmail.trim() || undefined,
      body: body.trim(),
      ...security.captcha,
      website: security.website,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      resetCaptcha();
      return;
    }

    setSuccess(result.data.message);
    setBody('');
    resetCaptcha();
  }

  return (
    <section className="py-section-sm">
      <div className="container-luxe max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-gold" aria-hidden />
          <h2 className="text-h3 text-bone">نظرات</h2>
          <span className="text-caption text-mist">({comments.length.toLocaleString('fa-IR')})</span>
        </div>

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <p className="mb-8 text-bone-dim">اولین نفری باشید که نظر می‌دهد.</p>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-card border border-bone/10 bg-charcoal/35 p-5 md:p-6"
        >
          <h3 className="text-lg font-semibold text-bone">ثبت نظر</h3>
          <p className="mt-2 text-sm text-bone-dim">نظر شما پس از تأیید تیم نمایش داده می‌شود.</p>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-caption text-mist">نام</span>
              <input
                className="w-full rounded-lg border border-bone/15 bg-ink/60 px-4 py-3 text-bone outline-none transition-colors focus:border-gold/40"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={120}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-caption text-mist">ایمیل (اختیاری)</span>
              <input
                type="email"
                className="w-full rounded-lg border border-bone/15 bg-ink/60 px-4 py-3 text-bone outline-none transition-colors focus:border-gold/40"
                dir="ltr"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-caption text-mist">متن نظر</span>
              <textarea
                className="min-h-28 w-full rounded-lg border border-bone/15 bg-ink/60 px-4 py-3 text-bone outline-none transition-colors focus:border-gold/40"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                required
              />
            </label>

            {honeypotField}
            {captchaField}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || securityLoading || !captchaReady}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ارسال نظر
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
