'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteStudentAction } from '../actions';

export function StudentDeleteButton({
  studentId,
  studentName,
}: {
  studentId: number;
  studentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const expected = studentName.trim() || String(studentId);

  return (
    <div className="card border-error/30 p-4 sm:p-6">
      <h3 className="mb-2 text-h3 font-bold text-error">حذف حساب دانشجو</h3>
      <p className="mb-3 text-small text-text-muted leading-relaxed">
        این عمل غیرقابل بازگشت است. سفارش‌ها بدون کاربر باقی می‌مانند؛ دسترسی تلگرام لغو می‌شود.
      </p>
      <label className="field-label" htmlFor="delete_confirm">
        برای تأیید، نام «{expected}» را بنویسید
      </label>
      <input
        id="delete_confirm"
        className="field-input mb-3"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        disabled={pending}
      />
      {error ? <p className="mb-2 text-small text-error">{error}</p> : null}
      <button
        type="button"
        className="btn btn-secondary inline-flex items-center gap-2 text-error"
        disabled={pending || confirmText !== expected}
        onClick={() => {
          if (!window.confirm('حساب دانشجو برای همیشه حذف شود؟')) return;
          startTransition(async () => {
            setError(null);
            const res = await deleteStudentAction(studentId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push('/admin/academy/students');
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        حذف حساب
      </button>
    </div>
  );
}
