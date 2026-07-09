'use client';

import { useState } from 'react';
import { ChevronDown, Loader2, Save, Send } from 'lucide-react';
import type { SmsEventForm, SmsEventView, SmsProviderView } from '@/lib/admin/smsCenter.types';
import { smsProvidersForChannel } from '@/lib/admin/smsCenter.types';
import { saveSmsEvent, testSmsEvent } from '@/lib/admin/smsCenter';
import { Badge } from '../../ui';
import { SmsEventTestModal } from './SmsEventTestModal';

export function SmsEventCard({
  event,
  providers,
  initial,
  defaultTestPhone,
}: {
  event: SmsEventView;
  providers: SmsProviderView[];
  initial: SmsEventForm;
  defaultTestPhone?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testFeedback, setTestFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const smsProviders = smsProvidersForChannel(providers, 'sms');
  const messengerProviders = smsProvidersForChannel(providers, 'messenger');
  const selectedProvider = [...smsProviders, ...messengerProviders].find((p) => p.slug === form.providerSlug);

  async function onTest(phone: string) {
    setTestPending(true);
    setTestFeedback(null);
    const res = await testSmsEvent(event.event_key, {
      phone,
      message_template: form.messageTemplate,
      pattern_code: form.patternCode || null,
      use_pattern: form.usePattern,
      provider_slug: form.providerSlug || null,
    });
    setTestPending(false);
    setTestModalOpen(false);
    setTestFeedback({ ok: res.ok, text: res.message });
  }

  async function onSave() {
    setPending(true);
    setMessage('');
    setError('');
    setTestFeedback(null);
    const res = await saveSmsEvent(event.event_key, {
      is_enabled: form.isEnabled,
      message_template: form.messageTemplate,
      pattern_code: form.patternCode || null,
      use_pattern: form.usePattern,
      provider_slug: form.providerSlug || null,
      fallback_enabled: form.fallbackEnabled,
      fallback_delay_seconds: form.fallbackDelaySeconds ? Number(form.fallbackDelaySeconds) : null,
    });
    setPending(false);
    if (res.ok) {
      setMessage('ذخیره شد');
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <div className="admin-sms-event">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="admin-sms-event__head"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ChevronDown className={`admin-sms-event__chevron ${open ? '' : 'admin-sms-event__chevron--closed'}`} strokeWidth={2} />
            <span className="admin-sms-event__title">{event.label_fa}</span>
            <Badge tone={form.isEnabled ? 'success' : 'default'}>{form.isEnabled ? 'فعال' : 'غیرفعال'}</Badge>
            {selectedProvider ? (
              <span className="admin-sms-event__provider">{selectedProvider.label_fa}</span>
            ) : null}
          </div>
          {event.description && !open ? (
            <p className="admin-sms-event__desc">{event.description}</p>
          ) : null}
        </div>
      </button>

      {open ? (
        <div className="admin-sms-event__body">
          {event.description ? <p className="text-caption text-text-muted">{event.description}</p> : null}

          <label className="flex items-center gap-2 text-caption">
            <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))} />
            رویداد فعال
          </label>

          <label>
            <span className="field-label text-caption">قالب پیام</span>
            <textarea
              rows={2}
              className="field-input text-small"
              value={form.messageTemplate}
              onChange={(e) => setForm((f) => ({ ...f, messageTemplate: e.target.value }))}
            />
            <p className="mt-0.5 admin-text-meta text-text-muted">{event.placeholders.join(' · ')}</p>
          </label>

          <label>
            <span className="field-label text-caption">پنل ارسال (اختیاری)</span>
            <select className="field-input text-small" value={form.providerSlug} onChange={(e) => setForm((f) => ({ ...f, providerSlug: e.target.value }))}>
              <option value="">پیش‌فرض سیستم</option>
              {smsProviders.length > 0 ? (
                <optgroup label="پیامک">
                  {smsProviders.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label_fa}{p.configured ? '' : ' (تنظیم نشده)'}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {messengerProviders.length > 0 ? (
                <optgroup label="پیام‌رسان">
                  {messengerProviders.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label_fa}{p.configured ? '' : ' (تنظیم نشده)'}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <label>
              <span className="field-label text-caption">کد پترن (ملی‌پیامک / آی‌پی‌پنل)</span>
              <input className="field-input text-small" dir="ltr" value={form.patternCode} onChange={(e) => setForm((f) => ({ ...f, patternCode: e.target.value }))} />
            </label>
            <label className="flex items-center gap-2 pb-1.5 text-caption">
              <input type="checkbox" checked={form.usePattern} onChange={(e) => setForm((f) => ({ ...f, usePattern: e.target.checked }))} />
              ارسال با پترن
            </label>
          </div>

          <div className="admin-sms-event__fallback">
            <label className="flex items-center gap-2 text-caption">
              <input type="checkbox" checked={form.fallbackEnabled} onChange={(e) => setForm((f) => ({ ...f, fallbackEnabled: e.target.checked }))} />
              fallback پنل جایگزین
            </label>
            {form.fallbackEnabled ? (
              <label className="mt-2 block">
                <span className="field-label text-caption">تأخیر (ثانیه)</span>
                <input
                  className="field-input max-w-[8rem] text-small"
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="20"
                  value={form.fallbackDelaySeconds}
                  onChange={(e) => setForm((f) => ({ ...f, fallbackDelaySeconds: e.target.value }))}
                />
              </label>
            ) : null}
          </div>

          <div className="admin-sms-event__actions">
            <button type="button" onClick={() => void onSave()} disabled={pending || testPending} className="btn btn-primary">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره رویداد
            </button>
            <button type="button" onClick={() => setTestModalOpen(true)} disabled={pending || testPending} className="btn btn-secondary">
              {testPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              تست
            </button>
            {testFeedback ? (
              <span className={`admin-sms-hub__feedback admin-sms-hub__feedback--${testFeedback.ok ? 'success' : 'error'}`}>
                {testFeedback.text}
              </span>
            ) : null}
            {message ? <span className="admin-sms-hub__feedback admin-sms-hub__feedback--success">{message}</span> : null}
            {error ? <span className="admin-sms-hub__feedback admin-sms-hub__feedback--error">{error}</span> : null}
          </div>
        </div>
      ) : null}

      <SmsEventTestModal
        open={testModalOpen}
        eventLabel={event.label_fa}
        defaultPhone={defaultTestPhone}
        pending={testPending}
        onClose={() => {
          if (!testPending) setTestModalOpen(false);
        }}
        onSubmit={(phone) => void onTest(phone)}
      />
    </div>
  );
}
