'use client';

import { useState } from 'react';
import { ChevronDown, Loader2, Save } from 'lucide-react';
import type { SmsEventForm, SmsEventView, SmsProviderView } from '@/lib/admin/smsCenter.types';
import { smsProvidersForChannel } from '@/lib/admin/smsCenter.types';
import { saveSmsEvent } from '@/lib/admin/smsCenter';
import { Badge } from '../../ui';

export function SmsEventCard({
  event,
  providers,
  initial,
}: {
  event: SmsEventView;
  providers: SmsProviderView[];
  initial: SmsEventForm;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const smsProviders = smsProvidersForChannel(providers, 'sms');
  const messengerProviders = smsProvidersForChannel(providers, 'messenger');
  const selectedProvider = [...smsProviders, ...messengerProviders].find((p) => p.slug === form.providerSlug);

  async function onSave() {
    setPending(true);
    setMessage('');
    setError('');
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
    <div className="rounded-lg border border-border/80 bg-surface-soft/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2 px-3 py-2 text-start"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-text-muted transition ${open ? '' : '-rotate-90'}`} />
            <span className="text-small font-semibold text-primary-dark">{event.label_fa}</span>
            <Badge tone={form.isEnabled ? 'success' : 'default'}>{form.isEnabled ? 'فعال' : 'غیرفعال'}</Badge>
            {selectedProvider ? (
              <span className="text-caption text-text-muted">{selectedProvider.label_fa}</span>
            ) : null}
          </div>
          {event.description && !open ? (
            <p className="mt-0.5 truncate ps-5 text-caption text-text-muted">{event.description}</p>
          ) : null}
        </div>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/80 px-3 py-2.5">
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
            <p className="mt-0.5 text-[11px] text-text-muted">{event.placeholders.join(' · ')}</p>
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

          <div className="rounded-md border border-border/70 bg-surface px-2.5 py-2">
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

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void onSave()} disabled={pending} className="btn btn-primary px-3 py-1.5 text-caption">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              ذخیره
            </button>
            {message ? <span className="text-caption text-success">{message}</span> : null}
            {error ? <span className="text-caption text-error">{error}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
