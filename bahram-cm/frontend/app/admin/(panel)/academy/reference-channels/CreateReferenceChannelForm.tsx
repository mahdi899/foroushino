'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { createReferenceChannel } from '../actions';

type DestinationOption = { id: number; title: string };

export function CreateReferenceChannelForm({ destinations }: { destinations: DestinationOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('30000000');
  const [status, setStatus] = useState('draft');
  const [destinationId, setDestinationId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await createReferenceChannel({
      title,
      status,
      price: Number(price) || 0,
      telegram_destination_id: destinationId ? Number(destinationId) : null,
    });
    setPending(false);
    if (res.ok) {
      setTitle('');
      router.push(`/admin/academy/reference-channels/${res.id}`);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label>
        <span className="field-label">عنوان</span>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        <span className="field-label">قیمت (تومان)</span>
        <input className="field-input" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
      </label>
      <label>
        <span className="field-label">وضعیت</span>
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="draft">پیش‌نویس</option>
          <option value="published">منتشر شده</option>
        </select>
      </label>
      <label>
        <span className="field-label">مقصد تلگرام</span>
        <select className="field-input" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
          <option value="">— انتخاب —</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm text-danger md:col-span-2 lg:col-span-4">{error}</p> : null}
      <div className="md:col-span-2 lg:col-span-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          ایجاد کانال مرجع
        </button>
      </div>
    </form>
  );
}
