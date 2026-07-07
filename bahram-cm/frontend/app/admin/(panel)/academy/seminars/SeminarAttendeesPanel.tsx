'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { addSeminarAttendee, updateSeminarAttendee } from '../actions';
import type { AdminSeminarDetail } from '@/lib/admin/academyTypes';

const ATTENDANCE_LABELS: Record<string, string> = {
  registered: 'ثبت‌نام شده',
  attended: 'حاضر',
  absent: 'غایب',
};

export function SeminarAttendeesPanel({ seminar }: { seminar: AdminSeminarDetail }) {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await addSeminarAttendee(seminar.id, { mobile, name: name || undefined });
    setPending(false);
    if (res.ok) {
      setMobile('');
      setName('');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-h3 font-bold text-primary-dark">شرکت‌کنندگان</h2>
      <form onSubmit={onAdd} className="mb-4 flex flex-wrap gap-3">
        <input required dir="ltr" placeholder="09xxxxxxxxx" value={mobile} onChange={(e) => setMobile(e.target.value)} className="field-input max-w-[10rem]" />
        <input placeholder="نام (اختیاری)" value={name} onChange={(e) => setName(e.target.value)} className="field-input max-w-[10rem]" />
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          افزودن
        </button>
      </form>
      {error && <p className="mb-3 text-small text-error">{error}</p>}

      {seminar.attendees.length > 0 ? (
        <ul className="divide-y divide-border text-small">
          {seminar.attendees.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <span>{a.name ?? '—'} <span dir="ltr" className="text-caption text-text-muted">{a.mobile}</span></span>
              <select
                className="field-input py-1 text-caption"
                defaultValue={a.attendance_status}
                onChange={(e) => {
                  void updateSeminarAttendee(seminar.id, a.id, e.target.value).then(() => router.refresh());
                }}
              >
                {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-text-muted">شرکت‌کننده‌ای ثبت نشده است.</p>
      )}
    </div>
  );
}
