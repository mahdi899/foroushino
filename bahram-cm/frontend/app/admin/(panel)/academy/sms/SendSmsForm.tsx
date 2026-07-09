'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Smartphone } from 'lucide-react';
import { sendSms, testSms } from '../actions';
import type { AdminAudienceSegment } from '@/lib/admin/academyTypes';
import type { SmsCenterConfig } from '@/lib/admin/smsCenter.types';

export function SendSmsForm({
  segments,
  config,
  embedded = false,
}: {
  segments: AdminAudienceSegment[];
  config: SmsCenterConfig | null;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('');
  const [manualNumbers, setManualNumbers] = useState('');
  const [pending, setPending] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [testPhone, setTestPhone] = useState(config?.global.test_phone ?? '');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const primary = config?.providers.find((p) => p.slug === config.global.primary_provider_slug);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setResult('');
    const res = await sendSms({ message, segment: segment || undefined, manual_numbers: manualNumbers || undefined });
    setPending(false);
    if (res.ok) {
      setResult(`${res.sent} موفق · ${res.failed} ناموفق · ${res.total} مخاطب`);
      setMessage('');
      setManualNumbers('');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  async function onTest() {
    if (!testPhone.trim()) return;
    setTestPending(true);
    const res = await testSms(testPhone);
    setTestPending(false);
    setResult('message' in res ? (res.message ?? (res.ok ? 'ارسال شد.' : 'ناموفق')) : (res.ok ? 'ارسال شد.' : 'ناموفق'));
  }

  return (
    <div className={embedded ? 'admin-sms-hub__send' : 'card space-y-3 p-4'}>
      {primary ? (
        <div className="admin-sms-hub__provider-chip">
          <Smartphone className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
          <span>
            پنل فعال: <strong>{primary.label_fa}</strong>
            {primary.configured ? '' : ' · نیاز به تنظیم کلید'}
          </span>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="admin-sms-hub__send-form">
        <label className="md:col-span-2">
          <span className="field-label text-caption">متن پیام</span>
          <textarea required rows={2} value={message} onChange={(e) => setMessage(e.target.value)} className="field-input text-small" maxLength={640} />
        </label>
        <label>
          <span className="field-label text-caption">بخش مخاطب</span>
          <select value={segment} onChange={(e) => setSegment(e.target.value)} className="field-input text-small">
            <option value="">— همه / دستی —</option>
            {segments.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label text-caption">شماره‌های دستی</span>
          <input value={manualNumbers} onChange={(e) => setManualNumbers(e.target.value)} className="field-input text-small" dir="ltr" placeholder="0912..., 0913..." />
        </label>
        <div className="admin-sms-hub__send-actions md:col-span-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ارسال پیامک
          </button>
        </div>
      </form>

      <div className="admin-sms-hub__send-test">
        <label>
          <span className="field-label text-caption">تست به شماره</span>
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="field-input text-small" dir="ltr" placeholder="09xxxxxxxxx" />
        </label>
        <button type="button" onClick={() => void onTest()} disabled={testPending} className="btn btn-secondary">
          {testPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ارسال تست
        </button>
      </div>

      {result ? <p className="admin-sms-hub__feedback admin-sms-hub__feedback--success">{result}</p> : null}
      {error ? <p className="admin-sms-hub__feedback admin-sms-hub__feedback--error">{error}</p> : null}
    </div>
  );
}
