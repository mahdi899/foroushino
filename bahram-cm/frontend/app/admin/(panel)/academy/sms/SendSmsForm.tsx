'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { sendSms, testSms } from '../actions';
import type { AdminAudienceSegment } from '@/lib/admin/academyTypes';
import type { SmsCenterConfig } from '@/lib/admin/smsCenter.types';

export function SendSmsForm({ segments, config }: { segments: AdminAudienceSegment[]; config: SmsCenterConfig | null }) {
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
    <div className="card space-y-3 p-4">
      {primary ? (
        <p className="text-caption text-text-muted">
          پنل فعال: <span className="font-medium text-primary-dark">{primary.label_fa}</span>
          {primary.configured ? '' : ' · نیاز به تنظیم کلید'}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-2">
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
        <div className="flex items-end md:col-span-2">
          <button type="submit" disabled={pending} className="btn btn-primary px-3 py-1.5 text-caption">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            ارسال
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
        <label>
          <span className="field-label text-caption">تست به شماره</span>
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="field-input text-small" dir="ltr" placeholder="09xxxxxxxxx" />
        </label>
        <button type="button" onClick={() => void onTest()} disabled={testPending} className="btn btn-secondary px-3 py-1.5 text-caption">
          {testPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          تست
        </button>
      </div>

      {result ? <p className="text-caption text-success">{result}</p> : null}
      {error ? <p className="text-caption text-error">{error}</p> : null}
    </div>
  );
}
