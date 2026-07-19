'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Save, Send } from 'lucide-react';
import { TelegramBridgePanel } from '@/components/admin/telegram/TelegramBridgePanel';
import { useTelegramBridgeDraft } from '@/components/admin/telegram/useTelegramBridgeDraft';
import type { SmsProviderView } from '@/lib/admin/smsCenter.types';
import { SMS_PROVIDER_DEFAULT_BASE_URLS } from '@/lib/admin/smsCenter.types';
import { saveSmsProvider, testSmsProvider } from '@/lib/admin/smsCenter';
import type { TelegramInfrastructureView } from '@/lib/admin/telegram.types';

export function TelegramSmsProviderRow({
  provider,
  infrastructure,
  workerSampleTemplate,
}: {
  provider: SmsProviderView;
  infrastructure: TelegramInfrastructureView;
  workerSampleTemplate: string | null;
}) {
  const suggestedToken = !provider.has_credentials && provider.suggested_credentials ? provider.suggested_credentials : '';
  const [credentials, setCredentials] = useState(suggestedToken);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState('');
  const bridgeDraft = useTelegramBridgeDraft(infrastructure, workerSampleTemplate);

  async function saveAll() {
    const bridgeRes = await bridgeDraft.saveInfrastructure();
    if (!bridgeRes.ok) {
      return bridgeRes;
    }

    if (!credentials.trim() && !provider.has_credentials) {
      return { ok: false as const, error: 'توکن ربات را وارد کنید.' };
    }

    if (credentials.trim()) {
      const providerRes = await saveSmsProvider(provider.slug, {
        credentials_input: credentials.trim(),
        base_url: SMS_PROVIDER_DEFAULT_BASE_URLS.telegram ?? 'https://api.telegram.org',
        is_active: true,
      });
      if (!providerRes.ok) {
        return providerRes;
      }
      setCredentials('');
    }

    return { ok: true as const };
  }

  async function onSave() {
    setPending(true);
    setStatus('');
    const res = await saveAll();
    setPending(false);
    setStatus(res.ok ? 'ذخیره شد' : res.error ?? 'خطا');
  }

  async function onTest() {
    setTesting(true);
    setStatus('');
    const saveRes = await saveAll();
    if (!saveRes.ok) {
      setTesting(false);
      setStatus(saveRes.error ?? 'خطا');
      return;
    }
    const res = await testSmsProvider(provider.slug);
    setTesting(false);
    setStatus(res.message);
  }

  return (
    <div className="border-t border-border px-2.5 py-2 space-y-3">
      <label className="block">
        <span className="text-caption font-medium text-text">توکن ربات (ارسال پیام)</span>
        <input
          className="field-input mt-1 w-full text-small"
          dir="ltr"
          type="password"
          placeholder={
            provider.has_credentials
              ? `کلید ذخیره‌شده (${provider.credential_hint ?? '••••'})`
              : provider.suggested_credentials
                ? 'توکن از تنظیمات ربات'
                : 'توکن BotFather'
          }
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
        />
      </label>

      <div className="rounded-md border border-border bg-surface-muted/15 p-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption font-medium text-primary-dark">وب‌هوک و Worker</p>
          <Link href="/admin/telegram/settings" className="admin-text-meta text-primary hover:underline">
            تنظیمات کامل ربات
          </Link>
        </div>
        <TelegramBridgePanel
          initial={infrastructure}
          workerSampleTemplate={workerSampleTemplate}
          compact
          showActions={false}
          draft={bridgeDraft}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void onSave()} disabled={pending || testing} className="btn btn-secondary px-2 py-1 admin-text-meta">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          ذخیره
        </button>
        <button type="button" onClick={() => void onTest()} disabled={testing || pending} className="btn btn-secondary px-2 py-1 admin-text-meta">
          {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          تست
        </button>
        {status ? <span className="self-center admin-text-meta text-text-muted">{status}</span> : null}
      </div>
    </div>
  );
}
