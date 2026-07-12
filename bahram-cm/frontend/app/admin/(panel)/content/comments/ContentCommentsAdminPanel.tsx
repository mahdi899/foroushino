'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, MessageSquare, Trash2, X } from 'lucide-react';
import { deleteContentComment, updateContentComment } from './actions';
import {
  CONTENT_COMMENT_STATUS_LABELS,
  type AdminContentComment,
} from '@/lib/admin/contentCommentTypes';
import { getContentCommentPageMeta, groupCommentsByPage } from '@/lib/contentComments/pageMeta';
import { Badge } from '../../ui';
import { formatDateFa } from '@/lib/persian';
import { CommentAvatar } from '@/components/comments/CommentAvatar';

function statusTone(status: AdminContentComment['status']) {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'warning' as const;
}

function CommentRow({
  comment,
  depth = 0,
}: {
  comment: AdminContentComment;
  depth?: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const meta = {
    content_type: comment.content_type,
    content_slug: comment.content_slug,
  };

  async function setStatus(status: AdminContentComment['status']) {
    setPending(true);
    await updateContentComment(comment.id, { status }, meta);
    setPending(false);
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm('این نظر حذف شود؟')) return;
    setPending(true);
    await deleteContentComment(comment.id, meta);
    setPending(false);
    router.refresh();
  }

  return (
    <div className={depth > 0 ? 'mr-4 border-r border-border pr-4' : ''}>
      <div className="rounded-2xl border border-border bg-surface-soft/60 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <CommentAvatar
              name={comment.author_name}
              avatarUrl={comment.author_avatar_url}
              className="!h-10 !w-10 !rounded-full !border !border-border !bg-surface-soft !text-xs !text-primary"
            />
            <div className="min-w-0">
              <p className="font-semibold text-primary-dark">{comment.author_name}</p>
              {comment.author_email ? (
                <p className="text-caption text-text-muted" dir="ltr">
                  {comment.author_email}
                </p>
              ) : null}
              {comment.created_at ? (
                <p className="mt-1 text-caption text-text-muted">{formatDateFa(comment.created_at)}</p>
              ) : null}
            </div>
          </div>
          <Badge tone={statusTone(comment.status)}>
            {CONTENT_COMMENT_STATUS_LABELS[comment.status]}
          </Badge>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-small leading-relaxed text-text">{comment.body}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {comment.status !== 'approved' ? (
            <button
              type="button"
              className="btn btn-secondary px-3 py-1.5 text-caption"
              onClick={() => setStatus('approved')}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              تأیید
            </button>
          ) : null}
          {comment.status !== 'rejected' ? (
            <button
              type="button"
              className="btn btn-secondary px-3 py-1.5 text-caption"
              onClick={() => setStatus('rejected')}
              disabled={pending}
            >
              <X className="h-3.5 w-3.5" />
              رد
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary px-3 py-1.5 text-caption text-error"
            onClick={onDelete}
            disabled={pending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </button>
        </div>
      </div>

      {comment.replies?.map((reply) => (
        <div key={reply.id} className="mt-3">
          <CommentRow comment={reply} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export function ContentCommentsAdminPanel({
  comments,
  error,
}: {
  comments: AdminContentComment[];
  error: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | AdminContentComment['status']>('pending');
  const [pageFilter, setPageFilter] = useState<string>('all');

  const pageOptions = useMemo(() => {
    const keys = new Set(comments.map((c) => `${c.content_type}:${c.content_slug}`));
    return [...keys]
      .map((key) => {
        const [type, slug] = key.split(':') as [AdminContentComment['content_type'], string];
        const meta = getContentCommentPageMeta(type, slug);
        const count = comments.filter((c) => `${c.content_type}:${c.content_slug}` === key).length;
        const pending = comments.filter(
          (c) => `${c.content_type}:${c.content_slug}` === key && c.status === 'pending',
        ).length;
        return { ...meta, count, pending };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fa'));
  }, [comments]);

  const filtered = useMemo(() => {
    return comments.filter((comment) => {
      if (statusFilter !== 'all' && comment.status !== statusFilter) return false;
      if (pageFilter !== 'all' && `${comment.content_type}:${comment.content_slug}` !== pageFilter) {
        return false;
      }
      return true;
    });
  }, [comments, statusFilter, pageFilter]);

  const grouped = useMemo(() => groupCommentsByPage(filtered), [filtered]);

  const pendingCount = comments.filter((c) => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-h2 font-bold text-primary-dark">مدیریت نظرات</h1>
          </div>
          <p className="mt-2 text-small text-text-muted">
            {comments.length.toLocaleString('fa-IR')} نظر در {pageOptions.length.toLocaleString('fa-IR')} صفحه
            {pendingCount > 0 ? ` · ${pendingCount.toLocaleString('fa-IR')} در انتظار تأیید` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-caption font-medium text-text-muted">فیلتر صفحه</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-caption transition-colors ${
              pageFilter === 'all'
                ? 'bg-primary-dark text-white'
                : 'border border-border bg-surface-soft text-text-muted hover:text-text'
            }`}
            onClick={() => setPageFilter('all')}
          >
            همه صفحات ({comments.length.toLocaleString('fa-IR')})
          </button>
          {pageOptions.map((page) => (
            <button
              key={page.key}
              type="button"
              className={`rounded-full px-3 py-1.5 text-caption transition-colors ${
                pageFilter === page.key
                  ? 'bg-primary-dark text-white'
                  : 'border border-border bg-surface-soft text-text-muted hover:text-text'
              }`}
              onClick={() => setPageFilter(page.key)}
            >
              {page.label}
              {page.pending > 0 ? ` · ${page.pending.toLocaleString('fa-IR')} جدید` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-caption font-medium text-text-muted">وضعیت</p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`rounded-full px-3 py-1.5 text-caption transition-colors ${
                statusFilter === value
                  ? 'bg-primary text-white'
                  : 'border border-border bg-surface-soft text-text-muted hover:text-text'
              }`}
              onClick={() => setStatusFilter(value)}
            >
              {value === 'all' ? 'همه وضعیت‌ها' : CONTENT_COMMENT_STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="card p-4">
          <p className="text-small text-error">{error}</p>
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <div className="card p-6">
          <p className="text-small text-text-muted">نظری با این فیلتر یافت نشد.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ meta, items }) => {
            const pagePending = items.filter((c) => c.status === 'pending').length;

            return (
              <section key={meta.key} className="card overflow-hidden">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-soft/80 px-4 py-4 sm:px-6">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-primary-dark">{meta.label}</h2>
                    <Link
                      href={meta.path}
                      target="_blank"
                      className="mt-1 inline-flex items-center gap-1 text-caption text-primary hover:underline"
                    >
                      {meta.path}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 text-caption text-text-muted">
                    <span>{items.length.toLocaleString('fa-IR')} نظر</span>
                    {pagePending > 0 ? (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">
                        {pagePending.toLocaleString('fa-IR')} در انتظار
                      </span>
                    ) : null}
                  </div>
                </header>

                <div className="space-y-4 p-4 sm:p-6">
                  {items.map((comment) => (
                    <CommentRow key={comment.id} comment={comment} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
