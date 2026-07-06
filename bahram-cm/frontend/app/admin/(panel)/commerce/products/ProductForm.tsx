'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { saveProduct, deleteProduct } from '../actions';
import type { AdminProduct } from '@/lib/admin/commerceTypes';

const empty: Partial<AdminProduct> = {
  title: '',
  slug: '',
  type: 'normal',
  description: '',
  short_description: '',
  price: 0,
  sale_price: null,
  is_active: true,
  featured_image: '',
  spotplayer_course_id: '',
  spotplayer_product_id: '',
  meta_title: '',
  meta_description: '',
};

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...empty, ...product });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    const res = await saveProduct(
      {
        title: form.title ?? '',
        slug: form.slug ?? '',
        type: (form.type as 'package' | 'normal') ?? 'normal',
        description: form.description,
        short_description: form.short_description,
        price: Number(form.price) || 0,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        is_active: !!form.is_active,
        featured_image: form.featured_image || null,
        spotplayer_course_id: form.spotplayer_course_id || null,
        spotplayer_product_id: form.spotplayer_product_id || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      },
      product?.id,
    );
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? 'خطا');
      return;
    }
    setMessage('ذخیره شد.');
    if (!product?.id && res.id) {
      router.push(`/admin/commerce/products/${res.id}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!product?.id || !confirm('این محصول حذف شود؟')) return;
    setPending(true);
    const res = await deleteProduct(product.id);
    setPending(false);
    if (res.ok) {
      router.push('/admin/commerce/products');
      router.refresh();
    } else {
      setError(res.error ?? 'حذف ناموفق');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">اطلاعات محصول</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="field-label">عنوان محصول *</span>
            <input className="field-input" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} required />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">آدرس (slug)</span>
            <input className="field-input" dir="ltr" value={form.slug ?? ''} onChange={(e) => set('slug', e.target.value)} />
          </label>
          <label>
            <span className="field-label">نوع</span>
            <select className="field-input" value={form.type ?? 'normal'} onChange={(e) => set('type', e.target.value as 'package' | 'normal')}>
              <option value="normal">عادی</option>
              <option value="package">پکیج</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            <span className="text-small">فعال</span>
          </label>
          <label className="md:col-span-2">
            <span className="field-label">توضیح کوتاه</span>
            <textarea className="field-input" rows={2} value={form.short_description ?? ''} onChange={(e) => set('short_description', e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">توضیحات کامل</span>
            <textarea className="field-input" rows={6} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">مسیر تصویر شاخص (از کتابخانه رسانه)</span>
            <input className="field-input" dir="ltr" placeholder="products/..." value={form.featured_image ?? ''} onChange={(e) => set('featured_image', e.target.value)} />
            <p className="mt-1 text-caption text-text-muted">
              از <Link href="/admin/gallery" className="text-accent hover:underline">کتابخانه رسانه</Link> مسیر فایل را کپی کنید.
            </p>
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">قیمت‌گذاری</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">قیمت (تومان) *</span>
            <input className="field-input" type="number" min={0} value={form.price ?? 0} onChange={(e) => set('price', Number(e.target.value))} required />
          </label>
          <label>
            <span className="field-label">قیمت با تخفیف</span>
            <input className="field-input" type="number" min={0} value={form.sale_price ?? ''} onChange={(e) => set('sale_price', e.target.value ? Number(e.target.value) : null)} />
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">SpotPlayer</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">شناسه دوره</span>
            <input className="field-input" value={form.spotplayer_course_id ?? ''} onChange={(e) => set('spotplayer_course_id', e.target.value)} />
          </label>
          <label>
            <span className="field-label">شناسه محصول</span>
            <input className="field-input" value={form.spotplayer_product_id ?? ''} onChange={(e) => set('spotplayer_product_id', e.target.value)} />
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">سئو</h2>
        <div className="grid gap-4">
          <label>
            <span className="field-label">Meta Title</span>
            <input className="field-input" value={form.meta_title ?? ''} onChange={(e) => set('meta_title', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Meta Description</span>
            <textarea className="field-input" rows={2} value={form.meta_description ?? ''} onChange={(e) => set('meta_description', e.target.value)} />
          </label>
        </div>
      </div>

      {error && <p className="text-small text-error">{error}</p>}
      {message && <p className="text-small text-success">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره
        </button>
        <Link href="/admin/commerce/products" className="btn btn-secondary">بازگشت</Link>
        {product?.id && (
          <button type="button" onClick={() => void onDelete()} disabled={pending} className="btn btn-secondary text-error">
            <Trash2 className="h-4 w-4" /> حذف
          </button>
        )}
      </div>
    </form>
  );
}
