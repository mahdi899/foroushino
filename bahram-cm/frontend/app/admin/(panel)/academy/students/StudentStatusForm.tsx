'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { updateStudentStatus } from '../actions';
import { STUDENT_STATUS_LABELS } from '@/lib/admin/academyTypes';

export function StudentStatusForm({ studentId, initialStatus }: { studentId: number; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await updateStudentStatus(studentId, status);
    setPending(false);
    if (res.ok) {
      setMessage('ذخیره شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSave} className="flex flex-wrap items-end gap-3">
      <label>
        <span className="field-label">وضعیت حساب</span>
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        ذخیره
      </button>
      {message && <span className="text-small text-success">{message}</span>}
      {error && <span className="text-small text-error">{error}</span>}
    </form>
  );
}
