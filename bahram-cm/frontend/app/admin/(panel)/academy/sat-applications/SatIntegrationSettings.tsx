'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Config = {
  enabled: boolean;
  api_url: string | null;
  api_token_set: boolean;
  api_token_preview: string | null;
};

type Props = {
  initial: Config;
};

export function SatIntegrationSettings({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [apiUrl, setApiUrl] = useState(initial.api_url ?? '');
  const [apiToken, setApiToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save() {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/sat-integration', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        api_url: apiUrl.trim() || null,
        ...(apiToken ? { api_token: apiToken } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'ذخیره تنظیمات ناموفق بود.');
      return;
    }
    setMessage('تنظیمات اتصال سات ذخیره شد.');
    setApiToken('');
    startTransition(() => router.refresh());
  }

  async function testConnection() {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/sat-integration/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_url: apiUrl.trim() || undefined,
        api_token: apiToken || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || json.message_fa || 'اتصال برقرار نشد.');
      return;
    }
    setMessage(json.message || json.data?.message || 'اتصال برقرار است.');
  }

  return (
    <section className="card mb-6 p-5">
      <h2 className="text-h3 text-primary-dark">اتصال API به سات</h2>
      <p className="mt-2 text-small text-muted">
        سات روی دامنه جداست. وقتی درخواستی «پذیرفته شده» شود، یک‌بار از طریق API به سات ارسال می‌شود.
        توکن را از پنل سات (ادمین کل) بگیرید.
      </p>

      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-small">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          ارسال خودکار به سات فعال باشد
        </label>

        <label className="block text-small">
          <span className="mb-1 block text-muted">آدرس API دریافت سات</span>
          <input
            className="field-input w-full"
            dir="ltr"
            placeholder="http://127.0.0.1:8000/api/v1/integrations/inbound/applications"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
        </label>

        <label className="block text-small">
          <span className="mb-1 block text-muted">توکن یک‌بارمصرف سات</span>
          <input
            className="field-input w-full"
            dir="ltr"
            type="password"
            placeholder={initial.api_token_set ? `ذخیره‌شده: ${initial.api_token_preview}` : 'توکن از پنل سات'}
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={pending} onClick={save}>
            ذخیره تنظیمات
          </button>
          <button type="button" className="btn-secondary" disabled={pending} onClick={testConnection}>
            تست اتصال
          </button>
        </div>

        {message ? <p className="text-small text-success">{message}</p> : null}
        {error ? <p className="text-small text-error">{error}</p> : null}
      </div>
    </section>
  );
}
