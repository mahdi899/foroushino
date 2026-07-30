'use client';

import { useState, useTransition } from 'react';
import type { TelegramInfrastructureView } from '@/lib/admin/telegram.types';
import { TelegramBridgePanel } from '@/components/admin/telegram/TelegramBridgePanel';

export function TelegramBridgeSettingsSection({
  initial,
  workerSample,
  loadError,
  showRegisterWebhook = true,
}: {
  initial: TelegramInfrastructureView | null;
  workerSample: string | null;
  loadError?: string | null;
  showRegisterWebhook?: boolean;
}) {
  const [status, setStatus] = useState('');
  const [, startTransition] = useTransition();

  if (!initial) {
    return (
      <div className="card p-4 text-caption text-text-muted">
        {loadError ? (
          <p className="whitespace-pre-wrap text-danger" dir="auto">
            {loadError}
          </p>
        ) : (
          <p>
            تنظیمات زیرساخت بارگذاری نشد. در production بک‌اند از nginx روی{' '}
            <code dir="ltr">127.0.0.1:8010</code> است (نه <code dir="ltr">artisan serve</code>). صفحه را رفرش
            کنید.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-3 sm:p-4">
      <h3 className="text-small font-bold text-primary-dark">اتصال تلگرام</h3>
      <p className="mt-1 text-caption text-text-muted">
        مستقیم، یا پروکسی (Cloudflare Worker / هاست PHP) — فقط یکی فعال باشد.
      </p>

      <div className="mt-3">
        <TelegramBridgePanel
          initial={initial}
          workerSampleTemplate={workerSample}
          onStatus={(message) => startTransition(() => setStatus(message))}
          showRegisterWebhook={showRegisterWebhook}
        />
      </div>
      {status ? (
        <p
          className={`mt-2 whitespace-pre-wrap text-caption ${status.includes('ناموفق') || status.startsWith('خطا') ? 'text-danger' : 'text-text-muted'}`}
          dir="auto"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
