'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { issueSeminarCertificate } from '../actions';
import type { AdminSeminarDetail } from '@/lib/admin/academyTypes';
import { formatDate } from '@/lib/admin/academyTypes';

export function SeminarCertificatesPanel({ seminar }: { seminar: AdminSeminarDetail }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const res = await issueSeminarCertificate(seminar.id, formData);
    setPending(false);
    if (res.ok) {
      formRef.current?.reset();
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-h3 font-bold text-primary-dark">صدور گواهی</h2>
      <form ref={formRef} onSubmit={onUpload} className="mb-4 grid gap-3 md:grid-cols-4">
        <select required name="user_id" className="field-input md:col-span-2">
          <option value="">دانشجو را انتخاب کنید</option>
          {seminar.attendees.map((a) => (
            <option key={a.user_id} value={a.user_id}>{a.name ?? a.mobile}</option>
          ))}
        </select>
        <input required type="file" name="file" accept="application/pdf" className="field-input" />
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          صدور گواهی (PDF)
        </button>
      </form>
      {error && <p className="mb-3 text-small text-error">{error}</p>}

      {seminar.certificates.length > 0 ? (
        <ul className="divide-y divide-border text-small">
          {seminar.certificates.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>{c.user_name ?? '—'} <span className="text-caption text-text-muted" dir="ltr">{c.certificate_number}</span></span>
              <span className="text-caption text-text-muted">{formatDate(c.issued_at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-text-muted">گواهی صادر نشده است.</p>
      )}
    </div>
  );
}
