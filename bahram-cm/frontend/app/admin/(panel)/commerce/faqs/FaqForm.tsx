'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { deleteFaq, saveFaq } from '../actions';
import type { AdminFaq } from '@/lib/admin/commerceTypes';

export function FaqForm({ faq }: { faq?: AdminFaq }) {
  const router = useRouter();
  const [form, setForm] = useState({
    question: faq?.question ?? '',
    answer: faq?.answer ?? '',
    category: faq?.category ?? '',
    sort_order: faq?.sort_order ?? 0,
    is_active: faq?.is_active ?? true,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await saveFaq(
      {
        question: form.question,
        answer: form.answer,
        category: form.category || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      },
      faq?.id,
    );
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? 'خطا');
      return;
    }
    if (!faq?.id && res.id) {
      router.push(`/admin/commerce/faqs/${res.id}`);
    }
    router.refresh();
  }

  async function onDelete() {
    if (!faq?.id || !confirm('حذف شود؟')) return;
    setPending(true);
    const res = await deleteFaq(faq.id);
    setPending(false);
    if (res.ok) {
      router.push('/admin/commerce/faqs');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-6">
      <label>
        <span className="field-label">سوال *</span>
        <input className="field-input" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} required />
      </label>
      <label>
        <span className="field-label">پاسخ *</span>
        <textarea className="field-input" rows={5} value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} required />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="field-label">دسته‌بندی</span>
          <input className="field-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        </label>
        <label>
          <span className="field-label">ترتیب</span>
          <input className="field-input" type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
        <span className="text-small">فعال</span>
      </label>
      {error && <p className="text-small text-error">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره
        </button>
        <Link href="/admin/commerce/faqs" className="btn btn-secondary">بازگشت</Link>
        {faq?.id && (
          <button type="button" onClick={() => void onDelete()} className="btn btn-secondary text-error">
            <Trash2 className="h-4 w-4" /> حذف
          </button>
        )}
      </div>
    </form>
  );
}
