'use client';

import { useMemo, useState } from 'react';
import { Copy, Loader2, RotateCcw, Save } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import type { PaymentSettingsData } from '@/lib/admin/commerceTypes';
import { savePaymentSettings } from '../actions';

function resolveInitialCallback(initial: PaymentSettingsData | null): string {
  if (!initial) return '';
  return initial.callback_url?.trim() || initial.effective_callback_url || initial.default_callback_url || '';
}

export function PaymentSettingsForm({ initial }: { initial: PaymentSettingsData | null }) {
  const defaultCallbackUrl = initial?.default_callback_url ?? initial?.effective_callback_url ?? '';

  const [form, setForm] = useState({
    zarinpal_merchant_id: '',
    sandbox_mode: initial?.sandbox_mode ?? false,
    callback_url: resolveInitialCallback(initial),
    is_active: initial?.is_active ?? false,
    currency: initial?.currency ?? 'IRT',
    description_template: initial?.description_template ?? '',
    has_merchant_id: initial?.has_merchant_id ?? false,
    default_callback_url: defaultCallbackUrl,
    app_url: initial?.app_url ?? '',
    frontend_payment_result_url: initial?.frontend_payment_result_url ?? '',
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const usesCustomCallback = useMemo(() => {
    const value = form.callback_url.trim();
    return value !== '' && value !== form.default_callback_url;
  }, [form.callback_url, form.default_callback_url]);

  const effectiveCallbackUrl = form.callback_url.trim() || form.default_callback_url;

  async function copyCallbackUrl() {
    if (!effectiveCallbackUrl) return;
    try {
      await navigator.clipboard.writeText(effectiveCallbackUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    const trimmedCallback = form.callback_url.trim();
    const callback_url =
      trimmedCallback && trimmedCallback !== form.default_callback_url ? trimmedCallback : null;

    const body: Record<string, unknown> = {
      sandbox_mode: form.sandbox_mode,
      callback_url,
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
      if (!callback_url) {
        setForm((f) => ({ ...f, callback_url: f.default_callback_url }));
      }
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      <AdminContentPanel title="اتصال به زرین‌پال">
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

          <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="field-label">آدرس بازگشت از درگاه (Callback URL)</span>
                <p className="mt-1 text-caption text-text-muted">
                  زرین‌پال بعد از پرداخت، کاربر را به این آدرس در <strong>API لاراول</strong> برمی‌گرداند.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, callback_url: f.default_callback_url }))}
                  className="btn btn-secondary px-3 py-1.5 text-caption"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  پیش‌فرض لاراول
                </button>
                <button
                  type="button"
                  onClick={() => void copyCallbackUrl()}
                  className="btn btn-secondary px-3 py-1.5 text-caption"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'کپی شد' : 'کپی'}
                </button>
              </div>
            </div>

            <input
              className="field-input"
              dir="ltr"
              placeholder={form.default_callback_url}
              value={form.callback_url}
              onChange={(e) => setForm((f) => ({ ...f, callback_url: e.target.value }))}
            />

            <ul className="list-disc space-y-1.5 ps-5 text-caption text-text-muted">
              <li>
                پیش‌فرض از <code className="rounded bg-surface-soft px-1 py-0.5 admin-text-meta">APP_URL</code>
                {form.app_url ? (
                  <>
                    {' '}
                    (<span dir="ltr">{form.app_url}</span>)
                  </>
                ) : null}{' '}
                ساخته می‌شود و لاراول همان را در درخواست پرداخت می‌فرستد.
              </li>
              <li>این آدرس باید به فرانت‌اند (پورت ۳۰۰۰) نباشد؛ باید به بک‌اند لاراول اشاره کند.</li>
              <li>
                لاراول پرداخت را تأیید می‌کند و سپس کاربر را به{' '}
                {form.frontend_payment_result_url ? (
                  <span dir="ltr" className="text-text">
                    {form.frontend_payment_result_url}
                  </span>
                ) : (
                  'صفحه نتیجه پرداخت در سایت'
                )}{' '}
                هدایت می‌کند.
              </li>
              <li>اگر مقدار را پاک کنید و ذخیره کنید، لاراول همیشه از پیش‌فرض خودش استفاده می‌کند.</li>
            </ul>

            <p className="rounded-md border border-border bg-surface-soft/60 px-3 py-2 text-caption text-text">
              آدرس فعال در درگاه:{' '}
              <span dir="ltr" className="font-medium text-primary-dark">
                {effectiveCallbackUrl || '—'}
              </span>
              {!usesCustomCallback ? (
                <span className="mt-1 block text-text-muted">(پیش‌فرض لاراول — توصیه‌شده)</span>
              ) : (
                <span className="mt-1 block text-warning">(آدرس سفارشی — مطمئن شو در پنل زرین‌پال هم ثبت شده باشد)</span>
              )}
            </p>
          </div>

          <label>
            <span className="field-label">واحد پول</span>
            <select className="field-input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as 'IRT' | 'IRR' }))}>
              <option value="IRT">تومان</option>
              <option value="IRR">ریال</option>
            </select>
          </label>
        </div>
      </AdminContentPanel>

      <AdminContentPanel title="توضیحات تراکنش">
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
      </AdminContentPanel>

      {error && <p className="text-small text-error">{error}</p>}
      {message && <p className="text-small text-success">{message}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        ذخیره تنظیمات
      </button>
    </form>
  );
}
