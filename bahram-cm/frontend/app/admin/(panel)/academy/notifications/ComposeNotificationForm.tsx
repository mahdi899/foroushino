'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { sendNotification } from '../actions';
import type { AdminAudienceSegment } from '@/lib/admin/academyTypes';

export function ComposeNotificationForm({ segments }: { segments: AdminAudienceSegment[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState(segments[0]?.key ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    const res = await sendNotification({ title, body, segment });
    setPending(false);
    if (res.ok) {
      setMessage(`اعلان برای ${res.recipientsCount} دانشجو ارسال شد.`);
      setTitle('');
      setBody('');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mb-6 grid gap-3 p-6 md:grid-cols-2">
      <label className="md:col-span-2">
        <span className="field-label">عنوان</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="field-input" />
      </label>
      <label className="md:col-span-2">
        <span className="field-label">متن اعلان</span>
        <textarea required rows={3} value={body} onChange={(e) => setBody(e.target.value)} className="field-input" />
      </label>
      <label>
        <span className="field-label">مخاطب</span>
        <select value={segment} onChange={(e) => setSegment(e.target.value)} className="field-input">
          {segments.map((s) => (
            <option key={s.key} value={s.key}>{s.label} ({s.count} نفر)</option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          ارسال اعلان
        </button>
      </div>
      {message && <p className="text-small text-success md:col-span-2">{message}</p>}
      {error && <p className="text-small text-error md:col-span-2">{error}</p>}
    </form>
  );
}
