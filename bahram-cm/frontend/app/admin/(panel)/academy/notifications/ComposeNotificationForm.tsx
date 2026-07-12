'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader2, Send } from 'lucide-react';
import { sendNotification } from '../actions';
import type { AdminAudienceSegment } from '@/lib/admin/academyTypes';

export function ComposeNotificationForm({ segments }: { segments: AdminAudienceSegment[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [segment, setSegment] = useState(segments[0]?.key ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    const trimmedLink = link.trim();
    const trimmedLinkLabel = linkLabel.trim();

    if (trimmedLinkLabel && !trimmedLink) {
      setPending(false);
      setError('برای تعیین نام دکمه، لینک الزامی است.');
      return;
    }

    const res = await sendNotification({
      title,
      body,
      segment,
      link: trimmedLink || undefined,
      link_label: trimmedLink && trimmedLinkLabel ? trimmedLinkLabel : undefined,
    });

    setPending(false);
    if (res.ok) {
      setMessage(`اعلان برای ${res.recipientsCount} دانشجو ارسال شد.`);
      setTitle('');
      setBody('');
      setLink('');
      setLinkLabel('');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mb-6 grid gap-4 p-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-h3 text-primary-dark">ارسال اعلان جدید</h2>
        <p className="mt-1 text-caption text-text-muted">
          اعلان در پنل کاربری دانشجو نمایش داده می‌شود. در صورت نیاز می‌توانید دکمه لینک با نام دلخواه اضافه کنید.
        </p>
      </div>

      <label className="md:col-span-2">
        <span className="field-label">عنوان</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field-input"
          placeholder="مثال: کانال تلگرام آکادمی"
        />
      </label>

      <label className="md:col-span-2">
        <span className="field-label">متن اعلان</span>
        <textarea
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="field-input"
          placeholder="متن کامل اعلان را بنویسید..."
        />
      </label>

      <div className="admin-notification-compose-link md:col-span-2">
        <div className="admin-notification-compose-link__head">
          <span className="admin-notification-compose-link__icon" aria-hidden>
            <Link2 className="h-4 w-4" />
          </span>
          <span className="admin-notification-compose-link__title">دکمه لینک (اختیاری)</span>
        </div>
        <div className="admin-notification-compose-link__fields">
          <label>
            <span className="field-label">آدرس لینک</span>
            <input
              type="text"
              dir="ltr"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="field-input text-left"
              placeholder="https://t.me/your_channel یا /panel/courses"
            />
          </label>
          <label>
            <span className="field-label">نام دکمه</span>
            <input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              className="field-input"
              placeholder="مثال: عضویت در کانال"
              disabled={!link.trim()}
            />
          </label>
        </div>
        <p className="admin-notification-compose-link__hint">
          اگر لینک وارد نکنید، دکمه‌ای برای کاربر نمایش داده نمی‌شود. بدون نام دکمه، متن پیش‌فرض «مشاهده» استفاده می‌شود.
        </p>
      </div>

      <label>
        <span className="field-label">مخاطب</span>
        <select value={segment} onChange={(e) => setSegment(e.target.value)} className="field-input">
          {segments.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({s.count} نفر)
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          ارسال اعلان
        </button>
      </div>

      {message && <p className="text-small text-success md:col-span-2">{message}</p>}
      {error && <p className="text-small text-error md:col-span-2">{error}</p>}
    </form>
  );
}
