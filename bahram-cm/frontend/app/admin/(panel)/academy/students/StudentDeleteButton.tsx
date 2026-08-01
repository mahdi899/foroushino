'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { deleteStudentAction } from '../actions';

const RECOVERY_DAYS = 30;

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
  const [warningOpen, setWarningOpen] = useState(false);

  const expected = studentName.trim() || String(studentId);
  const nameConfirmed = confirmText === expected;

  function openWarning() {
    if (!nameConfirmed || pending) return;
    setError(null);
    setWarningOpen(true);
  }

  function closeWarning() {
    if (pending) return;
    setWarningOpen(false);
  }

  function confirmDelete() {
    startTransition(async () => {
      setError(null);
      const res = await deleteStudentAction(studentId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setWarningOpen(false);
      router.push('/admin/academy/students');
      router.refresh();
    });
  }

  return (
    <>
      <div className="card border-error/30 p-4 sm:p-6">
        <h3 className="mb-2 text-h3 font-bold text-error">حذف حساب دانشجو</h3>
        <p className="mb-3 text-small leading-relaxed text-text-muted">
          با حذف، حساب دانشجو و تمام سفارش‌های او از پنل و سایت حذف می‌شوند. دسترسی تلگرام و دوره‌ها
          لغو می‌شود. یک نسخهٔ پشتیبان از اطلاعات (سفارشات، تیکت‌ها و…) به مدت{' '}
          <span className="font-semibold text-text">{RECOVERY_DAYS} روز</span> در بخش ریکاوری دیتابیس
          نگه‌داری می‌شود و بعد برای همیشه پاک می‌شود.
        </p>
        <label className="field-label" htmlFor="delete_confirm">
          برای ادامه، نام «{expected}» را بنویسید
        </label>
        <input
          id="delete_confirm"
          className="field-input mb-3"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={pending}
          autoComplete="off"
        />
        {error && !warningOpen ? <p className="mb-2 text-small text-error">{error}</p> : null}
        <button
          type="button"
          className="btn btn-secondary inline-flex items-center gap-2 text-error"
          disabled={pending || !nameConfirmed}
          onClick={openWarning}
        >
          <Trash2 className="h-4 w-4" />
          ادامه به تأیید حذف
        </button>
      </div>

      {warningOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center admin-overlay p-4"
          onClick={closeWarning}
          role="presentation"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-error/35 bg-surface shadow-premium"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="student-delete-warning-title"
            aria-describedby="student-delete-warning-desc"
          >
            <div className="flex items-start justify-between gap-3 border-b border-error/25 bg-error/8 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden />
                <div>
                  <p id="student-delete-warning-title" className="text-small font-bold text-error">
                    اخطار نهایی — حذف حساب «{expected}»
                  </p>
                  <p id="student-delete-warning-desc" className="mt-1 text-caption leading-relaxed text-text-muted">
                    این عمل از دید کاربر و پنل ادمین غیرقابل بازگشت است.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeWarning}
                className="admin-icon-btn shrink-0"
                aria-label="بستن"
                disabled={pending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4 text-small text-text">
              <ul className="list-disc space-y-1.5 pr-5 text-text-muted">
                <li>حساب دانشجو و ورود به سایت قطع می‌شود.</li>
                <li>تمام سفارش‌های این کاربر از لیست سفارشات حذف می‌شوند.</li>
                <li>دسترسی دوره، لایسنس و تلگرام لغو می‌شود.</li>
                <li>
                  داده‌ها تا{' '}
                  <span className="font-semibold text-text">{RECOVERY_DAYS} روز</span> در آرشیو ریکاوری
                  دیتابیس می‌مانند و سپس برای همیشه پاک می‌شوند.
                </li>
              </ul>

              {error ? <p className="text-small text-error">{error}</p> : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeWarning}
                  disabled={pending}
                >
                  انصراف
                </button>
                <button
                  type="button"
                  className="btn btn-primary inline-flex items-center gap-2 !bg-error hover:!opacity-90"
                  onClick={confirmDelete}
                  disabled={pending}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  تأیید و حذف نهایی
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
