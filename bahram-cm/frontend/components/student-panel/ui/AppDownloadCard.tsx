'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadCard({ compact = false, minimal = false }: { compact?: boolean; minimal?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setInstallEvent(null);
      return;
    }

    if (isIos) {
      setShowIosHint((v) => !v);
    }
  };

  if (installed) {
    if (minimal) return null;

    if (compact) {
      return (
        <div className="panel-pwa-card panel-pwa-card--compact" title="اپلیکیشن نصب شده است">
          <Smartphone size={18} aria-hidden />
        </div>
      );
    }

    return (
      <div
        className="panel-pwa-card panel-pwa-card--installed panel-pwa-card--visual"
        title="اپلیکیشن نصب شده است"
      >
        <div className="panel-pwa-card__hero">
          <span className="panel-pwa-card__phone panel-pwa-card__phone--success" aria-hidden>
            <Smartphone size={24} strokeWidth={1.75} />
          </span>
        </div>
      </div>
    );
  }

  if (minimal) {
    return (
      <div className="panel-pwa-minimal">
        <button type="button" onClick={() => void handleInstall()} className="panel-pwa-minimal__btn">
          <Smartphone size={15} strokeWidth={2} aria-hidden />
          <span>{isIos && !installEvent ? 'راهنمای نصب iOS' : 'نصب اپلیکیشن'}</span>
          <Download size={14} strokeWidth={2} aria-hidden />
        </button>
        {showIosHint ? (
          <p className="panel-pwa-minimal__hint">
            Safari → Share → Add to Home Screen
            <button type="button" onClick={() => setShowIosHint(false)} aria-label="بستن">
              <X size={12} />
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleInstall()}
        className="panel-pwa-card panel-pwa-card--compact panel-pwa-card--action"
        title="نصب اپلیکیشن پنل"
        aria-label="نصب اپلیکیشن پنل"
      >
        <Smartphone size={18} aria-hidden />
      </button>
    );
  }

  return (
    <div className="panel-pwa-card panel-pwa-card--visual">
      <div className="panel-pwa-card__hero">
        <div className="panel-pwa-card__hero-icon">
          <div className="panel-pwa-card__glow" aria-hidden />
          <span className="panel-pwa-card__phone" aria-hidden>
            <Smartphone size={24} strokeWidth={1.75} />
          </span>
        </div>
        <p className="panel-pwa-card__tagline">دسترسی سریع‌تر به دوره‌ها و اعلان‌ها</p>
      </div>

      <button type="button" onClick={() => void handleInstall()} className="panel-pwa-card__cta">
        <Download size={15} strokeWidth={2} aria-hidden />
        {isIos && !installEvent ? 'راهنمای iOS' : 'نصب اپ'}
      </button>

      {showIosHint ? (
        <div className="panel-pwa-card__ios">
          <div className="panel-pwa-card__ios-head">
            <span className="font-semibold text-text">Safari → Share → Home Screen</span>
            <button type="button" onClick={() => setShowIosHint(false)} aria-label="بستن">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
