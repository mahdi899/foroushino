'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2, ShieldCheck } from 'lucide-react';
import { updateStudentStatus } from '../actions';

export function StudentStatusForm({ studentId, initialStatus }: { studentId: number; initialStatus: string }) {
  const router = useRouter();
  const isBlocked = initialStatus === 'blocked';
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function toggleBlock() {
    const nextStatus = isBlocked ? 'active' : 'blocked';
    const confirmMessage = isBlocked
      ? 'مسدودیت این حساب برداشته شود؟'
      : 'این حساب مسدود شود؟ دانشجو دیگر نمی‌تواند وارد پنل شود.';

    if (!confirm(confirmMessage)) return;

    setPending(true);
    setError('');
    setMessage('');

    const res = await updateStudentStatus(studentId, nextStatus);
    setPending(false);

    if (res.ok) {
      setMessage(isBlocked ? 'مسدودیت برداشته شد.' : 'حساب مسدود شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="field-label">وضعیت حساب</p>
          <p className={`mt-1 text-small font-semibold ${isBlocked ? 'text-error' : 'text-success'}`}>
            {isBlocked ? 'مسدود' : 'فعال'}
          </p>
          {isBlocked ? (
            <p className="mt-1 text-caption text-text-muted">
              ورود با OTP، رمز عبور و دسترسی به پنل برای این دانشجو غیرفعال است.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => void toggleBlock()}
          className={isBlocked ? 'btn btn-secondary' : 'btn btn-secondary text-error'}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isBlocked ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <Ban className="h-4 w-4" />
          )}
          {isBlocked ? 'رفع مسدودیت' : 'مسدود کردن حساب'}
        </button>
      </div>

      {message ? <p className="text-small text-success">{message}</p> : null}
      {error ? <p className="text-small text-error">{error}</p> : null}
    </div>
  );
}
