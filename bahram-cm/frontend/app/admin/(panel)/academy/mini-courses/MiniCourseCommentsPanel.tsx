'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Loader2, Trash2, X } from 'lucide-react';
import { deleteMiniCourseComment, updateMiniCourseComment } from './actions';
import type { AdminMiniCourseComment } from '@/lib/admin/miniCourseTypes';
import { MINI_COURSE_COMMENT_STATUS_LABELS } from '@/lib/admin/miniCourseTypes';
import { Badge } from '../../ui';
import { formatDateFa } from '@/lib/persian';

function statusTone(status: AdminMiniCourseComment['status']) {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'warning' as const;
}

function CommentRow({
  courseId,
  comment,
  depth = 0,
}: {
  courseId: number;
  comment: AdminMiniCourseComment;
  depth?: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setStatus(status: AdminMiniCourseComment['status']) {
    setPending(true);
    await updateMiniCourseComment(courseId, comment.id, { status });
    setPending(false);
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm('این نظر حذف شود؟')) return;
    setPending(true);
    await deleteMiniCourseComment(courseId, comment.id);
    setPending(false);
    router.refresh();
  }

  return (
    <div className={depth > 0 ? 'mr-4 border-r border-border pr-4' : ''}>
      <div className="rounded-xl border border-border bg-surface-soft/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-primary-dark">{comment.author_name}</p>
            {comment.author_email ? (
              <p className="text-caption text-text-muted" dir="ltr">
                {comment.author_email}
              </p>
            ) : null}
            {comment.created_at ? (
              <p className="mt-1 text-caption text-text-muted">{formatDateFa(comment.created_at)}</p>
            ) : null}
          </div>
          <Badge tone={statusTone(comment.status)}>
            {MINI_COURSE_COMMENT_STATUS_LABELS[comment.status]}
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
          <CommentRow courseId={courseId} comment={reply} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export function MiniCourseCommentsPanel({
  courseId,
  comments,
  error,
}: {
  courseId: number;
  comments: AdminMiniCourseComment[];
  error: string | null;
}) {
  const pendingCount = comments.filter((c) => c.status === 'pending').length;

  return (
    <div className="card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h2 className="text-h3 font-bold text-primary-dark">نظرات</h2>
        <p className="text-caption text-text-muted">
          {comments.length.toLocaleString('fa-IR')} نظر
          {pendingCount > 0 ? ` · ${pendingCount.toLocaleString('fa-IR')} در انتظار` : ''}
        </p>
      </div>

      {error ? <p className="text-small text-error">{error}</p> : null}

      {comments.length === 0 ? (
        <p className="text-small text-text-muted">هنوز نظری ثبت نشده.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentRow key={comment.id} courseId={courseId} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
