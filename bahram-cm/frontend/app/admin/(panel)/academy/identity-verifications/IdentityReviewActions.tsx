'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, Loader2, XCircle } from 'lucide-react';
import {
  revealStudentNationalCodeAction,
  reviewIdentityVerificationAction,
  unlockOwnershipVerificationAction,
} from './actions';
import { IDENTITY_REASON_LABELS, IDENTITY_STATUS_LABELS } from '@/lib/admin/identityTypes';
import type { IdentityVerificationDetail } from '@/lib/admin/identityTypes';

const CORRECTION_OPTIONS = Object.entries(IDENTITY_REASON_LABELS);

const REVIEW_ACTION_LABELS: Record<string, string> = {
  approve: 'تأیید',
  reject: 'رد',
  request_correction: 'درخواست اصلاح',
};

function isReviewable(status: string): boolean {
  return status === 'submitted' || status === 'under_review';
}

export function IdentityReviewActions({
  detail,
  canApprove,
  canReject,
  canCorrection,
  canUnlock,
}: {
  detail: IdentityVerificationDetail;
  canApprove: boolean;
  canReject: boolean;
  canCorrection: boolean;
  canUnlock: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('other');
  const [corrections, setCorrections] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [nationalCode, setNationalCode] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const reviewable = isReviewable(detail.status);

  function run(action: 'approve' | 'reject' | 'request_correction') {
    setMessage(null);
    startTransition(async () => {
      const res = await reviewIdentityVerificationAction(detail.id, {
        action,
        reason_code: action === 'approve' ? undefined : reason,
        reviewer_note: note || undefined,
        correction_items: action === 'request_correction' ? corrections : undefined,
      });
      if (!res.ok) {
        setMessage({ type: 'err', text: res.error });
        return;
      }
      if (action === 'approve') {
        router.push('/admin/academy/identity-verifications');
        router.refresh();
        return;
      }
      setMessage({ type: 'ok', text: 'نتیجه بررسی ثبت شد.' });
      router.refresh();
    });
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-h3 text-primary-dark">اقدامات بررسی</h2>

      {!reviewable ? (
        <div
          className={`rounded-xl border px-4 py-3 text-small ${
            detail.status === 'approved'
              ? 'border-success/30 bg-success/10 text-success'
              : detail.status === 'rejected'
                ? 'border-error/30 bg-error/10 text-error'
                : 'border-warning/30 bg-warning/10 text-text'
          }`}
        >
          <p className="inline-flex items-center gap-2 font-bold">
            {detail.status === 'approved' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : detail.status === 'rejected' ? (
              <XCircle className="h-4 w-4" />
            ) : null}
            وضعیت: {IDENTITY_STATUS_LABELS[detail.status] ?? detail.status}
          </p>
          {detail.reviewed_at ? (
            <p className="mt-1 text-caption opacity-80">
              آخرین بررسی: {new Date(detail.reviewed_at).toLocaleString('fa-IR')}
            </p>
          ) : null}
          {detail.status === 'approved' ? (
            <p className="mt-2 leading-relaxed">این پرونده بسته شده و دیگر قابل تأیید یا رد نیست.</p>
          ) : null}
          {detail.status === 'needs_correction' ? (
            <p className="mt-2 leading-relaxed">دانشجو باید مدارک را اصلاح و دوباره ارسال کند.</p>
          ) : null}
        </div>
      ) : null}

      {detail.can_reveal_national_code ? (
        <div>
          <p className="mb-1 text-caption text-text-muted">کد ملی</p>
          {nationalCode ? (
            <span dir="ltr" className="font-mono text-danger">
              {nationalCode}
            </span>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-caption text-accent"
              disabled={revealing}
              onClick={() => {
                setRevealing(true);
                void revealStudentNationalCodeAction(detail.user_id).then((res) => {
                  setRevealing(false);
                  if (res.ok) setNationalCode(res.national_code);
                  else setMessage({ type: 'err', text: res.error });
                });
              }}
            >
              {revealing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              {detail.national_code_masked ?? 'نمایش کد ملی'}
            </button>
          )}
        </div>
      ) : detail.national_code_masked ? (
        <p className="text-small text-text-muted" dir="ltr">
          کد ملی: {detail.national_code_masked}
        </p>
      ) : null}

      {reviewable ? (
        <>
          <div>
            <label className="field-label" htmlFor="reviewer_note">
              یادداشت بررسی‌کننده
            </label>
            <textarea
              id="reviewer_note"
              className="field-input min-h-[80px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="reason_code">
              دلیل (برای رد / اصلاح)
            </label>
            <select
              id="reason_code"
              className="field-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {CORRECTION_OPTIONS.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {canCorrection ? (
            <div>
              <p className="mb-2 text-caption font-medium text-text-muted">موارد اصلاح</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {CORRECTION_OPTIONS.map(([k, v]) => (
                  <li key={k}>
                    <label className="flex items-center gap-2 text-small">
                      <input
                        type="checkbox"
                        checked={corrections.includes(k)}
                        onChange={(e) => {
                          setCorrections((prev) =>
                            e.target.checked ? [...prev, k] : prev.filter((x) => x !== k),
                          );
                        }}
                      />
                      {v}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {message ? (
        <p className={`text-small ${message.type === 'ok' ? 'text-success' : 'text-error'}`}>{message.text}</p>
      ) : null}

      {reviewable ? (
        <div className="flex flex-wrap gap-2">
          {canApprove ? (
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run('approve')}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              تأیید
            </button>
          ) : null}
          {canCorrection ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending}
              onClick={() => run('request_correction')}
            >
              درخواست اصلاح
            </button>
          ) : null}
          {canReject ? (
            <button
              type="button"
              className="btn btn-secondary text-error"
              disabled={pending}
              onClick={() => {
                if (window.confirm('پرونده رد شود؟')) run('reject');
              }}
            >
              رد
            </button>
          ) : null}
        </div>
      ) : null}

      {canUnlock && detail.ownership_locked_at ? (
        <button
          type="button"
          className="btn btn-secondary w-full justify-center"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await unlockOwnershipVerificationAction(detail.user_id);
              if (!res.ok) setMessage({ type: 'err', text: res.error });
              else {
                setMessage({ type: 'ok', text: 'قفل تطبیق شماره برداشته شد.' });
                router.refresh();
              }
            });
          }}
        >
          رفع قفل تطبیق شماره
        </button>
      ) : null}

      {detail.reviews?.length ? (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-caption font-medium text-text-muted">آخرین اقدامات ثبت‌شده</p>
          <ul className="space-y-2 text-small">
            {detail.reviews.slice(0, 3).map((r) => (
              <li key={r.id}>
                <span className="font-medium">{REVIEW_ACTION_LABELS[r.action] ?? r.action}</span>
                {r.reviewer_name ? <span className="text-text-muted"> — {r.reviewer_name}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
