'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldPlus, UserPlus } from 'lucide-react';
import { createAdminAction } from '../access/actions';
import type { AdminRole } from '@/lib/admin/accessTypes';
import { isValidIranMobile, sanitizePhoneInput } from '@/lib/chatbot/phone';

type Props = {
  roles: AdminRole[];
  isSuperAdmin: boolean;
};

export function CreateAdminForm({ roles, isSuperAdmin }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const assignableRoles = roles.filter((r) => isSuperAdmin || r.name !== 'super-admin');
  const defaultRole = assignableRoles[0]?.name ?? '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    if (!isValidIranMobile(mobile)) {
      setError('شماره موبایل معتبر نیست.');
      setPending(false);
      return;
    }

    const res = await createAdminAction({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      password,
      role: role || defaultRole,
    });

    setPending(false);

    if (res.ok) {
      setMessage(`مدیر «${res.name}» با نقش انتخاب‌شده ساخته شد.`);
      setName('');
      setEmail('');
      setMobile('');
      setPassword('');
      setRole(defaultRole);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary mb-4 w-full sm:w-auto">
        <UserPlus className="h-4 w-4" />
        مدیر جدید
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card mb-5 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-h3 font-bold text-primary-dark">
            <ShieldPlus className="h-5 w-5 shrink-0" aria-hidden />
            افزودن مدیر
          </h2>
          <p className="mt-1 text-caption text-text-muted">
            نام، ایمیل، شماره موبایل و رمز عبور را وارد کنید و یکی از نقش‌های تعریف‌شده را اختصاص دهید.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary text-caption">
          بستن
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="field-label">نام</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input w-full"
            placeholder="مثلاً علی رضایی"
            autoComplete="name"
          />
        </label>
        <label className="min-w-0">
          <span className="field-label">ایمیل ورود</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input w-full"
            placeholder="admin@example.com"
            dir="ltr"
            autoComplete="off"
          />
        </label>
        <label className="min-w-0">
          <span className="field-label">شماره موبایل (ورود با OTP)</span>
          <input
            required
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(sanitizePhoneInput(e.target.value))}
            className="field-input w-full"
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            dir="ltr"
            autoComplete="off"
            inputMode="numeric"
          />
        </label>
        <label className="min-w-0">
          <span className="field-label">رمز عبور</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input w-full"
            placeholder="حداقل ۸ کاراکتر"
            dir="ltr"
            autoComplete="new-password"
          />
        </label>
        <label className="min-w-0">
          <span className="field-label">نقش</span>
          <select
            required
            value={role || defaultRole}
            onChange={(e) => setRole(e.target.value)}
            className="field-input w-full"
          >
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? <p className="text-small text-success">{message}</p> : null}
      {error ? <p className="text-small text-error">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary min-h-11">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ساخت مدیر'}
        </button>
      </div>
    </form>
  );
}
