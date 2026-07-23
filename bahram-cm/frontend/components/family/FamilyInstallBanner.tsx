'use client';

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  dismissFamilyPwaMidFeedPromos,
  dismissFamilyPwaTopBanner,
  getFamilyPwaInstallHintText,
  promptFamilyPwaInstall,
  useFamilyPwaInstall,
} from '@/lib/family/pwa-install';

/** Compact install promo used as a virtualized feed row. */
export function FamilyInstallPromoInline({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pwa = useFamilyPwaInstall();
  const [hint, setHint] = useState<string | null>(null);

  if (pwa.isInstalled || !pwa.showMidFeedPromos) return null;

  const handleInstall = async () => {
    const outcome = await promptFamilyPwaInstall();
    if (outcome === 'accepted') return;
    if (outcome === 'unavailable') {
      setHint(getFamilyPwaInstallHintText(pwa.hintKind) || getFamilyPwaInstallHintText('android-manual'));
    }
  };

  return (
    <div className={cn('family-install-promo', compact && 'family-install-promo--compact', className)}>
      <div className="family-install-promo__body">
        <p className="family-install-promo__title">خانواده همیشه کنارته</p>
        <p className="family-install-promo__sub">برای دسترسی سریع‌تر، اپ خانواده را نصب کن.</p>
        {hint ? <p className="family-install-promo__hint">{hint}</p> : null}
        <div className="family-install-promo__actions">
          <button type="button" className="family-install-promo__cta" onClick={() => void handleInstall()}>
            <Download size={14} aria-hidden />
            نصب اپ
          </button>
          <button
            type="button"
            className="family-install-promo__dismiss"
            aria-label="پنهان کردن"
            onClick={() => dismissFamilyPwaMidFeedPromos()}
          >
            بعداً
          </button>
        </div>
      </div>
    </div>
  );
}

/** Top-of-feed install banner (under header, above posts). */
export function FamilyInstallTopBanner({ className }: { className?: string }) {
  const pwa = useFamilyPwaInstall();
  const [hint, setHint] = useState<string | null>(null);

  if (!pwa.showTopBanner || pwa.isInstalled) return null;

  const handleInstall = async () => {
    const outcome = await promptFamilyPwaInstall();
    if (outcome === 'accepted') {
      dismissFamilyPwaTopBanner();
      return;
    }
    if (outcome === 'unavailable') {
      setHint(getFamilyPwaInstallHintText(pwa.hintKind) || getFamilyPwaInstallHintText('android-manual'));
    }
  };

  return (
    <div className={cn('family-install-banner', className)} role="region" aria-label="نصب اپ خانواده">
      <div className="family-install-banner__content">
        <div className="family-install-banner__text">
          <p className="family-install-banner__title">خانواده همیشه کنارته</p>
          <p className="family-install-banner__sub">برای دسترسی سریع‌تر، اپ خانواده را نصب کن.</p>
          {hint ? <p className="family-install-banner__hint">{hint}</p> : null}
        </div>
        <div className="family-install-banner__actions">
          <button type="button" className="family-install-banner__cta" onClick={() => void handleInstall()}>
            <Download size={15} aria-hidden />
            نصب اپ
          </button>
          <button
            type="button"
            className="family-install-banner__close"
            aria-label="بستن"
            onClick={() => dismissFamilyPwaTopBanner()}
          >
            <X size={16} strokeWidth={1.85} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
