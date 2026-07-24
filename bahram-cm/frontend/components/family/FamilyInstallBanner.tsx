'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import {
  dismissFamilyPwaMidFeedPromos,
  dismissFamilyPwaTopBanner,
  getFamilyPwaInstallHintText,
  promptFamilyPwaInstall,
  useFamilyPwaInstall,
} from '@/lib/family/pwa-install';

const HERO_DELAY_MS = 12_000;
const HERO_SESSION_KEY = 'family-pwa-hero-shown-session';

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

/**
 * Timed hero install banner — slides in from the top after a delay (once per session)
 * when the app is not installed and the soft top-banner dismiss cooldown allows it.
 */
export function FamilyInstallTopBanner({ className }: { className?: string }) {
  const pwa = useFamilyPwaInstall();
  const [hint, setHint] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (pwa.isInstalled || !pwa.showTopBanner) {
      setVisible(false);
      setEntered(false);
      return;
    }

    let shownThisSession = false;
    try {
      shownThisSession = sessionStorage.getItem(HERO_SESSION_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (shownThisSession) return;

    const timer = window.setTimeout(() => {
      setVisible(true);
      try {
        sessionStorage.setItem(HERO_SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      window.requestAnimationFrame(() => setEntered(true));
    }, HERO_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pwa.isInstalled, pwa.showTopBanner]);

  if (!visible || pwa.isInstalled) return null;

  const handleInstall = async () => {
    const outcome = await promptFamilyPwaInstall();
    if (outcome === 'accepted') {
      dismissFamilyPwaTopBanner();
      setVisible(false);
      return;
    }
    if (outcome === 'unavailable') {
      setHint(getFamilyPwaInstallHintText(pwa.hintKind) || getFamilyPwaInstallHintText('android-manual'));
    }
  };

  const dismiss = () => {
    dismissFamilyPwaTopBanner();
    setEntered(false);
    window.setTimeout(() => setVisible(false), 180);
  };

  return (
    <FamilyBodyPortal>
      <div
        className={cn(
          'family-install-hero',
          entered && 'family-install-hero--in',
          className,
        )}
        role="region"
        aria-label="نصب اپ خانواده"
      >
        <div className="family-install-hero__card">
          <button
            type="button"
            className="family-install-hero__close"
            aria-label="بستن"
            onClick={dismiss}
          >
            <X size={18} strokeWidth={1.85} aria-hidden />
          </button>

          <div className="family-install-hero__icon" aria-hidden>
            <Smartphone size={28} strokeWidth={1.75} />
          </div>

          <div className="family-install-hero__copy">
            <p className="family-install-hero__title">خانواده همیشه کنارته</p>
            <p className="family-install-hero__sub">
              اپ خانواده را نصب کن تا سریع‌تر باز شود و همیشه دم دستت باشد.
            </p>
            {hint ? <p className="family-install-hero__hint">{hint}</p> : null}
          </div>

          <div className="family-install-hero__actions">
            <button
              type="button"
              className="family-install-hero__cta"
              onClick={() => void handleInstall()}
            >
              <Download size={18} aria-hidden />
              نصب اپ خانواده
            </button>
            <button type="button" className="family-install-hero__later" onClick={dismiss}>
              بعداً
            </button>
          </div>
        </div>
      </div>
    </FamilyBodyPortal>
  );
}
