'use client';

import { useState } from 'react';
import { Loader2, PlayCircle, Save, Send } from 'lucide-react';
import type { SmsSpotplayerSettingsData } from '@/lib/admin/commerceTypes';
import { saveSmsSpotplayerSettings, testSmsSettings, testSpotplayerSettings } from '../actions';

export function SmsSpotplayerSettingsForm({ initial }: { initial: SmsSpotplayerSettingsData | null }) {
  const [form, setForm] = useState({
    sms_api_key: '',
    sms_sender_number: initial?.sms_sender_number ?? '',
    sms_pattern_code: initial?.sms_pattern_code ?? '',
    is_sms_active: initial?.is_sms_active ?? false,
    test_phone: initial?.test_phone ?? '',
    purchase_message_template: initial?.purchase_message_template ?? '',
    has_sms_api_key: initial?.has_sms_api_key ?? false,
    spotplayer_api_key: '',
    spotplayer_base_url: initial?.spotplayer_base_url ?? '',
    is_spotplayer_active: initial?.is_spotplayer_active ?? false,
    default_license_duration: initial?.default_license_duration ?? ('' as string | number),
    has_spotplayer_api_key: initial?.has_spotplayer_api_key ?? false,
  });
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState<'sms' | 'spot' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function persist() {
    const body: Record<string, unknown> = {
      sms_sender_number: form.sms_sender_number || null,
      sms_pattern_code: form.sms_pattern_code || null,
      is_sms_active: form.is_sms_active,
      test_phone: form.test_phone || null,
      purchase_message_template: form.purchase_message_template || null,
      spotplayer_base_url: form.spotplayer_base_url || null,
      is_spotplayer_active: form.is_spotplayer_active,
      default_license_duration: form.default_license_duration !== '' ? Number(form.default_license_duration) : null,
    };
    if (form.sms_api_key.trim()) body.sms_api_key = form.sms_api_key.trim();
    if (form.spotplayer_api_key.trim()) body.spotplayer_api_key = form.spotplayer_api_key.trim();
    return saveSmsSpotplayerSettings(body);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    const res = await persist();
    setPending(false);
    if (res.ok) {
      setMessage('تنظیمات ذخیره شد.');
      setForm((f) => ({
        ...f,
        sms_api_key: '',
        spotplayer_api_key: '',
        has_sms_api_key: f.has_sms_api_key || !!form.sms_api_key.trim(),
        has_spotplayer_api_key: f.has_spotplayer_api_key || !!form.spotplayer_api_key.trim(),
      }));
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  async function onTestSms() {
    setTesting('sms');
    setError('');
    await persist();
    const res = await testSmsSettings();
    setTesting(null);
    if (res.ok) setMessage(res.message ?? 'ارسال موفق');
    else setError(res.error ?? res.message ?? 'خطا');
  }

  async function onTestSpot() {
    setTesting('spot');
    setError('');
    await persist();
    const res = await testSpotplayerSettings();
    setTesting(null);
    if (res.ok) setMessage(res.message ?? 'اتصال موفق');
    else setError(res.error ?? res.message ?? 'خطا');
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">سرویس پیامک (Kavenegar)</h2>
        <div className="space-y-4">
          <label>
            <span className="field-label">API Key</span>
            <input
              className="field-input"
              dir="ltr"
              type="password"
              placeholder={form.has_sms_api_key ? '•••••••• (برای تغییر، مقدار جدید)' : 'کلید API'}
              value={form.sms_api_key}
              onChange={(e) => setForm((f) => ({ ...f, sms_api_key: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="field-label">شماره فرستنده</span>
              <input className="field-input" value={form.sms_sender_number} onChange={(e) => setForm((f) => ({ ...f, sms_sender_number: e.target.value }))} />
            </label>
            <label>
              <span className="field-label">کد پترن</span>
              <input className="field-input" value={form.sms_pattern_code} onChange={(e) => setForm((f) => ({ ...f, sms_pattern_code: e.target.value }))} />
            </label>
          </div>
          <label>
            <span className="field-label">شماره تست</span>
            <input className="field-input" dir="ltr" value={form.test_phone} onChange={(e) => setForm((f) => ({ ...f, test_phone: e.target.value }))} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_sms_active} onChange={(e) => setForm((f) => ({ ...f, is_sms_active: e.target.checked }))} />
            <span className="text-small">فعال بودن سرویس پیامک</span>
          </label>
          <label>
            <span className="field-label">قالب پیامک تایید خرید</span>
            <textarea
              className="field-input"
              rows={3}
              value={form.purchase_message_template}
              onChange={(e) => setForm((f) => ({ ...f, purchase_message_template: e.target.value }))}
            />
            <p className="mt-1 text-caption text-text-muted">متغیرها: {'{name}'}, {'{phone}'}, {'{order_number}'}, {'{product_title}'}, {'{code}'}</p>
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">SpotPlayer</h2>
        <div className="space-y-4">
          <label>
            <span className="field-label">API Key</span>
            <input
              className="field-input"
              dir="ltr"
              type="password"
              placeholder={form.has_spotplayer_api_key ? '••••••••' : 'کلید API SpotPlayer'}
              value={form.spotplayer_api_key}
              onChange={(e) => setForm((f) => ({ ...f, spotplayer_api_key: e.target.value }))}
            />
          </label>
          <label>
            <span className="field-label">Base URL</span>
            <input
              className="field-input"
              dir="ltr"
              placeholder="https://panel.spotplayer.ir"
              value={form.spotplayer_base_url}
              onChange={(e) => setForm((f) => ({ ...f, spotplayer_base_url: e.target.value }))}
            />
          </label>
          <label>
            <span className="field-label">مدت پیش‌فرض لایسنس (روز)</span>
            <input
              className="field-input"
              type="number"
              min={0}
              value={form.default_license_duration}
              onChange={(e) => setForm((f) => ({ ...f, default_license_duration: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_spotplayer_active} onChange={(e) => setForm((f) => ({ ...f, is_spotplayer_active: e.target.checked }))} />
            <span className="text-small">فعال بودن SpotPlayer</span>
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
        <button type="button" disabled={testing !== null} onClick={() => void onTestSms()} className="btn btn-secondary">
          {testing === 'sms' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          تست پیامک
        </button>
        <button type="button" disabled={testing !== null} onClick={() => void onTestSpot()} className="btn btn-secondary">
          {testing === 'spot' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          تست SpotPlayer
        </button>
      </div>
    </form>
  );
}
