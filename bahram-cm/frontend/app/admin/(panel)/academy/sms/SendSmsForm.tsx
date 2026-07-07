'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { sendSms, testSms } from '../actions';
import type { AdminAudienceSegment } from '@/lib/admin/academyTypes';

export function SendSmsForm({ segments }: { segments: AdminAudienceSegment[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('');
  const [manualNumbers, setManualNumbers] = useState('');
  const [pending, setPending] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setResult('');
    const res = await sendSms({ message, segment: segment || undefined, manual_numbers: manualNumbers || undefined });
    setPending(false);
    if (res.ok) {
      setResult(`ارسال شد: ${res.sent} موفق، ${res.failed} ناموفق از ${res.total} مخاطب.`);
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
    setResult(res.message ?? (res.ok ? 'ارسال شد.' : 'ناموفق'));
  }

  return (
    <div className="card mb-6 space-y-4 p-6">
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="field-label">متن پیامک</span>
          <textarea required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="field-input" maxLength={640} />
        </label>
        <label>
          <span className="field-label">بخش مخاطب (اختیاری)</span>
          <select value={segment} onChange={(e) => setSegment(e.target.value)} className="field-input">
            <option value="">— انتخاب نشده —</option>
            {segments.map((s) => (
              <option key={s.key} value={s.key}>{s.label} ({s.count} نفر)</option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">شماره‌های دستی (با کاما یا خط جدید)</span>
          <input value={manualNumbers} onChange={(e) => setManualNumbers(e.target.value)} className="field-input" dir="ltr" placeholder="09121234567, 09123456789" />
        </label>
        <div className="flex items-end md:col-span-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ارسال پیامک
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <label>
          <span className="field-label">تست ارسال به یک شماره</span>
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="field-input" dir="ltr" placeholder="09xxxxxxxxx" />
        </label>
        <button type="button" onClick={() => void onTest()} disabled={testPending} className="btn btn-secondary">
          {testPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          تست
        </button>
      </div>

      {result && <p className="text-small text-success">{result}</p>}
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  );
}
