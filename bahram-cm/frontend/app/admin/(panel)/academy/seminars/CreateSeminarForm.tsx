'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { createSeminar } from '../actions';

export function CreateSeminarForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await createSeminar({ title, date, location: location || undefined });
    setPending(false);
    if (res.ok) {
      setTitle('');
      setDate('');
      setLocation('');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mb-6 grid gap-3 p-6 md:grid-cols-4">
      <label className="md:col-span-2">
        <span className="field-label">عنوان سمینار</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="field-input" />
      </label>
      <label>
        <span className="field-label">تاریخ برگزاری</span>
        <input required type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
      </label>
      <label>
        <span className="field-label">مکان</span>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="field-input" />
      </label>
      <div className="flex items-end md:col-span-4">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          ایجاد سمینار
        </button>
      </div>
      {error && <p className="text-small text-error md:col-span-4">{error}</p>}
    </form>
  );
}
