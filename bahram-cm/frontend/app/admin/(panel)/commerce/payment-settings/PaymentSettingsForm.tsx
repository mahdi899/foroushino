'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { PaymentSettingsData } from '@/lib/admin/commerceTypes';
import { savePaymentSettings } from '../actions';

export function PaymentSettingsForm({ initial }: { initial: PaymentSettingsData | null }) {
  const [form, setForm] = useState({
    zarinpal_merchant_id: '',
    sandbox_mode: initial?.sandbox_mode ?? false,
    callback_url: initial?.callback_url ?? '',
    is_active: initial?.is_active ?? false,
    currency: initial?.currency ?? 'IRT',
    description_template: initial?.description_template ?? '',
    has_merchant_id: initial?.has_merchant_id ?? false,
    default_callback_url: initial?.default_callback_url ?? '',
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    const body: Record<string, unknown> = {
      sandbox_mode: form.sandbox_mode,
      callback_url: form.callback_url || null,
      is_active: form.is_active,
      currency: form.currency,
      description_template: form.description_template || null,
    };
    if (form.zarinpal_merchant_id.trim()) {
      body.zarinpal_merchant_id = form.zarinpal_merchant_id.trim();
    }
    const res = await savePaymentSettings(body);
    setPending(false);
    if (res.ok) {
      setMessage('تنظیمات پرداخت ذخیره شد.');
      if (body.zarinpal_merchant_id) {
        setForm((f) => ({ ...f, zarinpal_merchant_id: '', has_merchant_id: true }));
      }
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">اتصال به زرین‌پال</h2>
        <div className="space-y-4">
          <label>
            <span className="field-label">کد پذیرنده (Merchant ID)</span>
            <input
              className="field-input"
              dir="ltr"
              type="password"
              placeholder={form.has_merchant_id ? '•••••••• (برای تغییر، مقدار جدید وارد کنید)' : 'کد پذیرنده زرین‌پال'}
              value={form.zarinpal_merchant_id}
              onChange={(e) => setForm((f) => ({ ...f, zarinpal_merchant_id: e.target.value }))}
            />
            {form.has_merchant_id && (
              <p className="mt-1 text-caption text-success">یک کد پذیرنده ذخیره شده است.</p>
            )}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.sandbox_mode} onChange={(e) => setForm((f) => ({ ...f, sandbox_mode: e.target.checked }))} />
            <span className="text-small">حالت آزمایشی (Sandbox)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            <span className="text-small">فعال بودن درگاه پرداخت</span>
          </label>
          <label>
            <span className="field-label">Callback URL (اختیاری)</span>
            <input
              className="field-input"
              dir="ltr"
              placeholder={form.default_callback_url}
              value={form.callback_url}
              onChange={(e) => setForm((f) => ({ ...f, callback_url: e.target.value }))}
            />
          </label>
          <label>
            <span className="field-label">واحد پول</span>
            <select className="field-input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as 'IRT' | 'IRR' }))}>
              <option value="IRT">تومان</option>
              <option value="IRR">ریال</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">توضیحات تراکنش</h2>
        <label>
          <span className="field-label">قالب توضیحات پرداخت</span>
          <textarea
            className="field-input"
            rows={2}
            placeholder="خرید {product_title} — سفارش {order_number}"
            value={form.description_template}
            onChange={(e) => setForm((f) => ({ ...f, description_template: e.target.value }))}
          />
          <p className="mt-1 text-caption text-text-muted">متغیرها: {'{order_number}'}, {'{product_title}'}</p>
        </label>
      </div>

      {error && <p className="text-small text-error">{error}</p>}
      {message && <p className="text-small text-success">{message}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        ذخیره تنظیمات
      </button>
    </form>
  );
}
