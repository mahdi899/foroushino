'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { updateReferenceChannel } from '../actions';
import { formatToman, type AdminReferenceChannelDetail } from '@/lib/admin/academyTypes';

type DestinationOption = { id: number; title: string };

export function ReferenceChannelSettingsPanel({
  channel,
  destinations,
}: {
  channel: AdminReferenceChannelDetail;
  destinations: DestinationOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(channel.title);
  const [description, setDescription] = useState(channel.description ?? '');
  const [price, setPrice] = useState(String(channel.price ?? ''));
  const [status, setStatus] = useState(channel.status ?? 'draft');
  const [destinationId, setDestinationId] = useState(String(channel.telegram_destination_id ?? ''));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    const res = await updateReferenceChannel(channel.id, {
      title,
      description: description || null,
      price: Number(price) || 0,
      status,
      telegram_destination_id: destinationId ? Number(destinationId) : null,
    });

    setPending(false);
    if (res.ok) {
      setMessage('تنظیمات ذخیره شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-h3 text-primary-dark">تنظیمات فروش</h2>
        <p className="mt-1 text-small text-text-muted">
          قیمت پایه، وضعیت انتشار و مقصد تلگرام. تخفیف سمینار روی خود سمینار تنظیم می‌شود.
        </p>
        {channel.product_slug ? (
          <p className="mt-2 text-sm text-text-muted">
            محصول لینک‌شده: <code>{channel.product_slug}</code> · قیمت فعلی {formatToman(channel.price)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="field-label">عنوان</span>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          <span className="field-label">قیمت (تومان)</span>
          <input
            type="number"
            min={0}
            className="field-input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
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
      </div>

      <label>
        <span className="field-label">توضیحات</span>
        <textarea
          className="field-input min-h-28"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        ذخیره
      </button>
    </form>
  );
}
