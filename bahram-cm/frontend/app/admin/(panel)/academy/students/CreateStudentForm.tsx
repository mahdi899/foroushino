'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, UserPlus, X } from 'lucide-react';
import { createStudent } from '../actions';
import { STUDENT_STATUS_LABELS } from '@/lib/admin/academyTypes';

export function CreateStudentForm({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('active');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    setCreatedId(null);

    const res = await createStudent({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      status,
    });

    setPending(false);

    if (res.ok) {
      setMessage('دانشجو با موفقیت ثبت شد.');
      setCreatedId(res.id);
      setName('');
      setMobile('');
      setEmail('');
      setStatus('active');
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary w-full sm:w-auto">
        <UserPlus className="h-4 w-4" />
        دانشجوی جدید
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-caption text-text-muted">حساب با موبایل ایجاد می‌شود؛ دانشجو می‌تواند با OTP وارد پنل شود.</p>
        <button type="button" onClick={() => setOpen(false)} className="admin-icon-btn" aria-label="بستن فرم">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="min-w-0 sm:col-span-1">
          <span className="field-label">نام و نام خانوادگی</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input w-full"
            placeholder="مثلاً علی رضایی"
          />
        </label>
        <label className="min-w-0 sm:col-span-1">
          <span className="field-label">شماره موبایل</span>
          <input
            required
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="field-input w-full"
            placeholder="09xxxxxxxxx"
          />
        </label>
        <label className="min-w-0 sm:col-span-1">
          <span className="field-label">ایمیل (اختیاری)</span>
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input w-full"
            placeholder="name@example.com"
          />
        </label>
        <label className="min-w-0 sm:col-span-1">
          <span className="field-label">وضعیت</span>
          <select className="field-input w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          ثبت دانشجو
        </button>
        {message && (
          <p className="text-small text-success">
            {message}{' '}
            {createdId && (
              <Link href={`/admin/academy/students/${createdId}`} className="font-medium text-accent hover:underline">
                مشاهده پروفایل
              </Link>
            )}
          </p>
        )}
        {error && <p className="text-small text-error">{error}</p>}
      </div>
    </form>
  );
}
