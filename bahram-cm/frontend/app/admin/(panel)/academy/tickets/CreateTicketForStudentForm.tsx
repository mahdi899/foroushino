'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { createTicketForStudent } from '../actions';
import { StudentSearchPicker, type SelectedStudent } from './StudentSearchPicker';

const DEPARTMENTS = [
  { value: '', label: 'عمومی' },
  { value: 'technical', label: 'فنی' },
  { value: 'financial', label: 'مالی' },
  { value: 'course', label: 'دوره' },
];

export function CreateTicketForStudentForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [student, setStudent] = useState<SelectedStudent | null>(null);
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student) {
      setError('لطفاً یک دانشجو انتخاب کنید.');
      return;
    }

    setPending(true);
    setError('');
    setCreatedId(null);

    const res = await createTicketForStudent({
      user_id: student.id,
      subject: subject.trim(),
      message: message.trim(),
      department: department || undefined,
    });

    setPending(false);

    if (res.ok) {
      setCreatedId(res.id);
      setStudent(null);
      setSubject('');
      setDepartment('');
      setMessage('');
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary mb-4 w-full sm:w-auto">
        <MessageSquarePlus className="h-4 w-4" />
        تیکت جدید برای دانشجو
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card mb-5 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 font-bold text-primary-dark">ارسال تیکت به دانشجو</h2>
          <p className="mt-1 text-caption text-text-muted">
            بدون نیاز به ثبت تیکت توسط دانشجو؛ پیام در پنل دانشجو نمایش داده می‌شود.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary text-caption sm:hidden">
          بستن
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <StudentSearchPicker value={student} onChange={setStudent} required />
        </div>
        <label className="min-w-0">
          <span className="field-label">موضوع</span>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="field-input w-full"
            placeholder="مثلاً پیگیری دسترسی دوره"
          />
        </label>
        <label className="min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="field-label">بخش (اختیاری)</span>
          <select className="field-input w-full" value={department} onChange={(e) => setDepartment(e.target.value)}>
            {DEPARTMENTS.map((d) => (
              <option key={d.value || 'general'} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block min-w-0">
        <span className="field-label">پیام</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="field-input w-full"
          placeholder="متن پیامی که دانشجو در پنل می‌بیند..."
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="submit" disabled={pending || !student} className="btn btn-primary w-full sm:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
          ارسال تیکت
        </button>
        {createdId && (
          <p className="text-small text-success">
            تیکت ثبت شد.{' '}
            <Link href={`/admin/academy/tickets/${createdId}`} className="font-medium text-accent hover:underline">
              مشاهده تیکت
            </Link>
          </p>
        )}
        {error && <p className="text-small text-error">{error}</p>}
      </div>
    </form>
  );
}
