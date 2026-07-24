'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  dismissFamilyPushOptIn,
  enableFamilyDailyPush,
  familyPushSupported,
  isFamilyPwaStandalone,
  readFamilyPushDismissed,
} from '@/lib/family/pwa-push';

/**
 * Soft opt-in for daily unread Web Push — shown to logged-in members
 * inside the installed Family PWA when permission is not yet granted.
 */
export function FamilyPushDailyOptIn({ enabled = true }: { enabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !familyPushSupported()) return;
    if (!isFamilyPwaStandalone()) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    if (readFamilyPushDismissed()) return;
    if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      // SW is unregistered in dev; still allow if VAPID is set for manual testing.
    }

    const timer = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!visible) return null;

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await enableFamilyDailyPush();
    setBusy(false);

    if (result === 'subscribed') {
      setVisible(false);
      return;
    }
    if (result === 'denied') {
      setVisible(false);
      return;
    }
    if (result === 'no-sw') {
      setError('اول اپ را نصب کن، بعد دوباره تلاش کن.');
      return;
    }
    if (result === 'unconfigured') {
      setError('اعلان هنوز از سمت سرور آماده نیست.');
      return;
    }
    setError('فعال‌سازی اعلان ممکن نشد.');
  };

  const dismiss = () => {
    dismissFamilyPushOptIn();
    setVisible(false);
  };

  return (
    <div className="family-push-optin" role="region" aria-label="یادآوری روزانه">
      <div className="family-push-optin__card">
        <button type="button" className="family-push-optin__close" aria-label="بستن" onClick={dismiss}>
          <X size={16} strokeWidth={1.85} aria-hidden />
        </button>
        <span className="family-push-optin__icon" aria-hidden>
          <Bell size={18} strokeWidth={1.85} />
        </span>
        <div className="family-push-optin__copy">
          <p className="family-push-optin__title">یادآوری روزانه خانواده</p>
          <p className="family-push-optin__sub">
            هر روز یک نوتیف کوتاه می‌آید اگر پیام جدیدی باشد — نه برای هر پیام.
          </p>
          {error ? <p className="family-push-optin__error">{error}</p> : null}
        </div>
        <div className="family-push-optin__actions">
          <button type="button" className="family-push-optin__cta" disabled={busy} onClick={() => void enable()}>
            {busy ? '…' : 'فعال کن'}
          </button>
          <button type="button" className="family-push-optin__later" onClick={dismiss}>
            بعداً
          </button>
        </div>
      </div>
    </div>
  );
}
