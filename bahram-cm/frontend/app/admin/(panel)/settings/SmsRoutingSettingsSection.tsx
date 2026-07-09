'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, Loader2, Route, Save, Send } from 'lucide-react';
import type { AdminTelegramCategoryView, AdminTelegramEventView, SmsGlobalView, SmsProviderView } from '@/lib/admin/smsCenter.types';
import { smsProvidersForChannel } from '@/lib/admin/smsCenter.types';
import { saveSmsGlobalSettings, saveSmsProvider, testSmsProvider } from '@/lib/admin/smsCenter';
import { AdminTelegramSettingsSection } from './AdminTelegramSettingsSection';
import { Badge } from '../ui';

function ProviderOptions({ providers }: { providers: SmsProviderView[] }) {
  return (
    <>
      {providers.map((p) => (
        <option key={p.slug} value={p.slug}>
          {p.label_fa}
          {!p.configured ? ' (تنظیم نشده)' : ''}
        </option>
      ))}
    </>
  );
}

function ProviderCredentialRow({ provider }: { provider: SmsProviderView }) {
  const [credentials, setCredentials] = useState('');
  const [sender, setSender] = useState(provider.sender_number ?? '');
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState('');

  const isBaleSafir = provider.slug === 'bale_safir';
  const credentialPlaceholder = isBaleSafir
    ? provider.has_credentials
      ? `کلید API سفیر ذخیره‌شده (${provider.credential_hint ?? '••••'})`
      : 'کلید API سفیر (api-access-key)'
    : provider.has_credentials
      ? `کلید ذخیره‌شده (${provider.credential_hint ?? '••••'})`
      : 'کلید API / توکن ربات';
  const senderPlaceholder = isBaleSafir ? 'شناسه بازو (bot_id)' : 'شماره فرستنده';

  if (provider.slug === 'melipayamak' || provider.slug === 'kavenegar') {
    return null;
  }

  async function onSave() {
    setPending(true);
    setStatus('');
    const res = await saveSmsProvider(provider.slug, {
      credentials_input: credentials || undefined,
      sender_number: sender || undefined,
      is_active: true,
    });
    setPending(false);
    setStatus(res.ok ? 'ذخیره شد' : res.error ?? 'خطا');
    if (res.ok) setCredentials('');
  }

  async function onTest() {
    setTesting(true);
    setStatus('');
    if (credentials.trim()) {
      const saveRes = await saveSmsProvider(provider.slug, {
        credentials_input: credentials,
        sender_number: sender || undefined,
        is_active: true,
      });
      if (!saveRes.ok) {
        setTesting(false);
        setStatus(saveRes.error ?? 'خطا');
        return;
      }
      setCredentials('');
    }
    const res = await testSmsProvider(provider.slug);
    setTesting(false);
    setStatus(res.message);
  }

  return (
    <div className="border-t border-border px-2.5 py-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="field-input text-small"
          dir="ltr"
          type="password"
          placeholder={credentialPlaceholder}
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
        />
        {provider.channel_type === 'sms' || isBaleSafir ? (
          <input
            className="field-input text-small"
            dir="ltr"
            placeholder={senderPlaceholder}
            value={sender}
            onChange={(e) => setSender(e.target.value)}
          />
        ) : null}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void onSave()} disabled={pending} className="btn btn-secondary px-2 py-1 admin-text-meta">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          ذخیره
        </button>
        <button type="button" onClick={() => void onTest()} disabled={testing} className="btn btn-secondary px-2 py-1 admin-text-meta">
          {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          تست
        </button>
        {status ? <span className="self-center admin-text-meta text-text-muted">{status}</span> : null}
      </div>
    </div>
  );
}

export function SmsRoutingSettingsSection({
  global: initialGlobal,
  providers: initialProviders,
  adminTelegramEvents = [],
  adminTelegramCategories = [],
}: {
  global: SmsGlobalView;
  providers: SmsProviderView[];
  adminTelegramEvents?: AdminTelegramEventView[];
  adminTelegramCategories?: AdminTelegramCategoryView[];
}) {
  const [global, setGlobal] = useState(initialGlobal);
  const [globalPending, setGlobalPending] = useState(false);
  const [status, setStatus] = useState('');
  const smsProviders = smsProvidersForChannel(initialProviders, 'sms');
  const messengerProviders = smsProvidersForChannel(initialProviders, 'messenger');

  async function saveGlobal() {
    setGlobalPending(true);
    setStatus('');
    const res = await saveSmsGlobalSettings(global);
    setGlobalPending(false);
    setStatus(res.ok ? 'ذخیره شد.' : res.error ?? 'خطا');
  }

  return (
    <div id="sms-routing" className="space-y-4">
      <div className="flex items-start gap-3">
        <Route className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
        <div>
          <h2 className="text-h3 text-primary-dark">مسیردهی پیامک</h2>
          <p className="mt-1 text-caption text-text-muted">
            پنل اصلی، fallback و کلیدهای فراز / آی‌پی‌پنل / سفیر بله / ربات بله / تلگرام. کلید ملی‌پیامک و کاوه‌نگار در{' '}
            <Link href="#sms-spotplayer-credentials" className="text-primary hover:underline">
              بخش بالا
            </Link>
            . رویدادها و ارسال در{' '}
            <Link href="/admin/academy/sms" className="text-primary hover:underline">
              مرکز پیامک
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="card space-y-3 p-4 sm:p-5">
        <label className="inline-flex items-center gap-2 text-caption">
          <input type="checkbox" checked={global.is_sms_active} onChange={(e) => setGlobal((g) => ({ ...g, is_sms_active: e.target.checked }))} />
          سرویس پیام‌رسانی فعال
        </label>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="field-label text-caption">پنل اصلی</span>
            <select className="field-input text-small" value={global.primary_provider_slug} onChange={(e) => setGlobal((g) => ({ ...g, primary_provider_slug: e.target.value }))}>
              <ProviderOptions providers={smsProviders} />
            </select>
          </label>
          <label>
            <span className="field-label text-caption">پنل جایگزین</span>
            <select
              className="field-input text-small"
              value={global.fallback_provider_slug ?? ''}
              onChange={(e) => setGlobal((g) => ({ ...g, fallback_provider_slug: e.target.value || null }))}
            >
              <option value="">— بدون جایگزین —</option>
              <ProviderOptions providers={smsProviders} />
            </select>
          </label>
          <label>
            <span className="field-label text-caption">تأخیر fallback (ثانیه)</span>
            <input
              className="field-input text-small"
              dir="ltr"
              inputMode="numeric"
              value={global.fallback_delay_seconds}
              onChange={(e) => setGlobal((g) => ({ ...g, fallback_delay_seconds: Number(e.target.value) || 20 }))}
            />
          </label>
          <label>
            <span className="field-label text-caption">شماره تست</span>
            <input className="field-input text-small" dir="ltr" value={global.test_phone ?? ''} onChange={(e) => setGlobal((g) => ({ ...g, test_phone: e.target.value }))} />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-caption">
          <input type="checkbox" checked={global.fallback_enabled} onChange={(e) => setGlobal((g) => ({ ...g, fallback_enabled: e.target.checked }))} />
          fallback سراسری برای ارسال‌های ناموفق
        </label>

        <button type="button" onClick={() => void saveGlobal()} disabled={globalPending} className="btn btn-primary px-3 py-1.5 text-caption">
          {globalPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          ذخیره مسیردهی
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {[
          { title: 'پنل‌های پیامک', items: smsProviders },
          { title: 'پیام‌رسان‌ها', items: messengerProviders },
        ].map((group) => (
          <div key={group.title} className="card p-3 sm:p-4">
            <h3 className="mb-2 text-small font-bold text-primary-dark">{group.title}</h3>
            <div className="divide-y divide-border rounded-md border border-border">
              {group.items.map((provider) => (
                <div key={provider.slug}>
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-caption font-medium text-primary-dark">{provider.label_fa}</p>
                      <p className="truncate admin-text-meta text-text-muted" dir="ltr">
                        {provider.sender_number ? `از: ${provider.sender_number}` : provider.credential_hint ?? 'کلید تنظیم نشده'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={provider.configured ? 'success' : 'warning'}>{provider.configured ? 'آماده' : 'ناقص'}</Badge>
                      {provider.docs_url ? (
                        <a href={provider.docs_url} target="_blank" rel="noreferrer" className="text-text-muted hover:text-primary" title="مستندات API">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <ProviderCredentialRow provider={provider} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AdminTelegramSettingsSection
        global={global}
        events={adminTelegramEvents}
        categories={adminTelegramCategories}
      />

      {status ? <p className="text-caption text-text-muted">{status}</p> : null}
    </div>
  );
}
