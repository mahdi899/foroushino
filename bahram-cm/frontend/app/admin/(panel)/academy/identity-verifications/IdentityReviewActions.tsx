'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2 } from 'lucide-react';
import {
  revealStudentNationalCodeAction,
  reviewIdentityVerificationAction,
  unlockOwnershipVerificationAction,
} from './actions';
import { IDENTITY_REASON_LABELS } from '@/lib/admin/identityTypes';
import type { IdentityVerificationDetail } from '@/lib/admin/identityTypes';

const CORRECTION_OPTIONS = Object.entries(IDENTITY_REASON_LABELS);

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
      setMessage({ type: 'ok', text: 'نتیجه بررسی ثبت شد.' });
      router.refresh();
    });
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-h3 text-primary-dark">اقدامات بررسی</h2>

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

      {message ? (
        <p className={`text-small ${message.type === 'ok' ? 'text-success' : 'text-error'}`}>{message.text}</p>
      ) : null}

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
        {canUnlock && detail.ownership_locked_at ? (
          <button
            type="button"
            className="btn btn-secondary"
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
      </div>
    </div>
  );
}
