'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { JalaliDateTimeField } from '@/components/admin/JalaliDateTimeField';
import { createSeminar } from '../actions';

export function CreateSeminarForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState('draft');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError('تاریخ برگزاری را انتخاب کنید.');
      return;
    }
    setPending(true);
    setError('');
    const res = await createSeminar({
      title,
      date,
      location: location || undefined,
      status,
      price: price.trim() ? Number(price) : undefined,
      sale_price: salePrice.trim() ? Number(salePrice) : null,
      capacity: capacity.trim() ? Number(capacity) : null,
    });
    setPending(false);
    if (res.ok) {
      setTitle('');
      setDate('');
      setLocation('');
      setPrice('');
      setSalePrice('');
      setCapacity('');
      setStatus('draft');
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
        <JalaliDateTimeField value={date} onChange={setDate} />
      </label>
      <label>
        <span className="field-label">مکان</span>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="field-input" />
      </label>
      <label>
        <span className="field-label">قیمت (تومان)</span>
        <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="field-input" placeholder="برای فروش آنلاین" />
      </label>
      <label>
        <span className="field-label">قیمت ویژه</span>
        <input type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="field-input" placeholder="اختیاری" />
      </label>
      <label>
        <span className="field-label">ظرفیت</span>
        <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="field-input" placeholder="خالی = نامحدود" />
      </label>
      <label>
        <span className="field-label">وضعیت</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input">
          <option value="draft">پیش‌نویس</option>
          <option value="published">منتشر شده</option>
        </select>
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
