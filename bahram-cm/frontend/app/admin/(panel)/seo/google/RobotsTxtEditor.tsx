'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, RotateCcw, Save } from 'lucide-react';
import { saveRobotsTxt } from '../actions';
import { defaultRobotsTxtBody, siteBaseUrl, type RobotsTxtConfig } from '@/lib/seo/robotsTxt';

interface RobotsTxtEditorProps {
  initial: RobotsTxtConfig | null;
  baseUrl: string;
}

export function RobotsTxtEditor({ initial, baseUrl }: RobotsTxtEditorProps) {
  const [body, setBody] = useState(initial?.body ?? defaultRobotsTxtBody(baseUrl));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSave() {
    setBusy(true);
    setError('');
    setMessage('');
    const res = await saveRobotsTxt(body);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBody(res.data.body);
    setMessage('robots.txt ذخیره شد.');
    setTimeout(() => setMessage(''), 2500);
  }

  function onReset() {
    if (!confirm('متن robots.txt به پیش‌فرض بازگردانده شود؟')) return;
    setBody(defaultRobotsTxtBody(baseUrl));
    setError('');
    setMessage('');
  }

  return (
    <div className="card p-6 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-primary-dark">ویرایش robots.txt</h2>
          <p className="mt-1 text-small text-text-muted">
            محتوای فایل{' '}
            <code className="text-primary" dir="ltr">
              /robots.txt
            </code>{' '}
            — برای کنترل خزیدن ربات‌ها در گوگل و بینگ.
          </p>
        </div>
        <a
          href={`${baseUrl}/robots.txt`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary py-1.5 text-caption"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          مشاهده live
        </a>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="field-input min-h-[220px] font-mono text-caption leading-relaxed"
        dir="ltr"
        spellCheck={false}
        disabled={busy}
        aria-label="محتوای robots.txt"
      />

      <p className="mt-2 text-caption text-text-muted">
        اگر خط Sitemap نباشد، هنگام ذخیره به‌صورت خودکار{' '}
        <span dir="ltr">{baseUrl}/sitemap.xml</span> اضافه می‌شود.
        {initial?.is_custom ? ' (نسخه سفارشی فعال است)' : ' (در حال حاضر پیش‌فرض سیستم نمایش داده می‌شود)'}
      </p>

      {message && <p className="mt-2 text-small text-success">{message}</p>}
      {error && <p className="mt-2 text-small text-error">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onSave} disabled={busy} className="btn btn-primary py-2 text-small">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره robots.txt
        </button>
        <button type="button" onClick={onReset} disabled={busy} className="btn btn-secondary py-2 text-small">
          <RotateCcw className="h-4 w-4" />
          بازگشت به پیش‌فرض
        </button>
      </div>
    </div>
  );
}

export { siteBaseUrl };
