'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Smartphone } from 'lucide-react';
import { sendSms, testSms } from '../actions';
import type { AdminAudienceSegment } from '@/lib/admin/academyTypes';
import { hasSmsOptOutSuffix, SMS_OPT_OUT_ERROR, SMS_OPT_OUT_HINT } from '@/lib/admin/smsMessage';
import type { SmsCenterConfig } from '@/lib/admin/smsCenter.types';

type Feedback = {
  tone: 'success' | 'error';
  text: string;
};

function withProviderCode(message: string, providerCode?: string | null): string {
  return providerCode ? `${message} — کد سامانه: ${providerCode}` : message;
}

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
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const primary = config?.providers.find((p) => p.slug === config.global.primary_provider_slug);
  const messageMissingOptOut = message.trim().length > 0 && !hasSmsOptOutSuffix(message);

  function validateMessage(): boolean {
    if (!message.trim()) {
      setFeedback({ tone: 'error', text: 'متن پیام را وارد کنید.' });
      return false;
    }

    if (!hasSmsOptOutSuffix(message)) {
      setFeedback({ tone: 'error', text: SMS_OPT_OUT_ERROR });
      return false;
    }

    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!validateMessage()) return;

    setPending(true);
    const res = await sendSms({ message, segment: segment || undefined, manual_numbers: manualNumbers || undefined });
    setPending(false);
    if (res.ok) {
      setFeedback({
        tone: res.failed === 0 ? 'success' : 'error',
        text: `${res.sent} موفق · ${res.failed} ناموفق · ${res.total} مخاطب`,
      });
      setMessage('');
      setManualNumbers('');
      router.refresh();
    } else {
      setFeedback({ tone: 'error', text: res.error ?? 'خطا' });
    }
  }

  async function onTest() {
    if (!testPhone.trim()) {
      setFeedback({ tone: 'error', text: 'شماره تست را وارد کنید.' });
      return;
    }

    setFeedback(null);
    if (!validateMessage()) return;

    setTestPending(true);
    const res = await testSms(testPhone, message);
    setTestPending(false);
    if (res.ok) {
      setFeedback({
        tone: 'success',
        text: withProviderCode(res.message ?? 'ارسال شد.', res.providerCode),
      });
      return;
    }

    setFeedback({
      tone: 'error',
      text: withProviderCode(res.error ?? 'ناموفق', 'providerCode' in res ? res.providerCode : null),
    });
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
          <p className={`mt-0.5 text-caption ${messageMissingOptOut ? 'text-danger' : 'text-text-muted'}`}>
            {messageMissingOptOut ? SMS_OPT_OUT_ERROR : SMS_OPT_OUT_HINT}
          </p>
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
        <p className="admin-text-meta text-text-muted md:col-span-2">متن بالا به‌عنوان پیام تست ارسال می‌شود.</p>
      </div>

      {feedback ? (
        <p className={`admin-sms-hub__feedback admin-sms-hub__feedback--${feedback.tone}`}>{feedback.text}</p>
      ) : null}
    </div>
  );
}
