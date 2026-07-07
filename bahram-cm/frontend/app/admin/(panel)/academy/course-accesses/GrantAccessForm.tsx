'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { grantCourseAccess } from '../actions';

export function GrantAccessForm() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    const res = await grantCourseAccess({ mobile, name: name || undefined, product_id: Number(productId) });
    setPending(false);
    if (res.ok) {
      setMessage('دسترسی با موفقیت اعطا شد.');
      setMobile('');
      setName('');
      setProductId('');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mb-6 grid gap-3 p-6 md:grid-cols-4">
      <label className="md:col-span-1">
        <span className="field-label">شماره موبایل</span>
        <input required dir="ltr" value={mobile} onChange={(e) => setMobile(e.target.value)} className="field-input" placeholder="09xxxxxxxxx" />
      </label>
      <label className="md:col-span-1">
        <span className="field-label">نام (اختیاری)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
      </label>
      <label className="md:col-span-1">
        <span className="field-label">شناسه محصول</span>
        <input required type="number" value={productId} onChange={(e) => setProductId(e.target.value)} className="field-input" />
      </label>
      <div className="flex items-end gap-3 md:col-span-1">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          اعطای دسترسی دستی
        </button>
      </div>
      {message && <p className="text-small text-success md:col-span-4">{message}</p>}
      {error && <p className="text-small text-error md:col-span-4">{error}</p>}
    </form>
  );
}
