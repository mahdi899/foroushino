'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, Sparkles, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadCard({ compact = false }: { compact?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
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

  const isIos =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

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
    if (compact) {
      return (
        <div className="panel-pwa-card panel-pwa-card--compact" title="اپلیکیشن نصب شده است">
          <Smartphone size={18} aria-hidden />
        </div>
      );
    }

    return (
      <div className="panel-pwa-card panel-pwa-card--installed">
        <span className="panel-pwa-card__icon panel-pwa-card__icon--success" aria-hidden>
          <Smartphone size={20} />
        </span>
        <div>
          <p className="panel-pwa-card__title">اپ نصب شده است</p>
          <p className="panel-pwa-card__desc">پنل آکادمی روی دستگاه شما فعال است.</p>
        </div>
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
    <div className="panel-pwa-card">
      <div className="panel-pwa-card__glow" aria-hidden />
      <div className="panel-pwa-card__head">
        <span className="panel-pwa-card__icon" aria-hidden>
          <Smartphone size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="panel-pwa-card__title">نصب اپلیکیشن پنل</p>
          <p className="panel-pwa-card__desc">
            پنل را مثل اپ روی گوشی نصب کن و سریع‌تر به دوره‌ها و اعلان‌ها دسترسی داشته باش.
          </p>
        </div>
      </div>

      {(installEvent || isIos) && (
        <button type="button" onClick={() => void handleInstall()} className="panel-pwa-card__cta">
          <Download size={15} strokeWidth={2} aria-hidden />
          {isIos && !installEvent ? 'راهنمای نصب iOS' : 'نصب روی گوشی'}
        </button>
      )}

      {!installEvent && !isIos ? (
        <div className="panel-pwa-card__hint">
          <Sparkles size={12} aria-hidden />
          <span>از مرورگر موبایل یا Chrome دسکتاپ قابل نصب است</span>
        </div>
      ) : null}

      {showIosHint ? (
        <div className="panel-pwa-card__ios">
          <div className="panel-pwa-card__ios-head">
            <span className="font-semibold text-text">نصب در Safari</span>
            <button type="button" onClick={() => setShowIosHint(false)} aria-label="بستن">
              <X size={14} />
            </button>
          </div>
          <p>دکمه Share را بزنید و گزینه «Add to Home Screen» را انتخاب کنید.</p>
        </div>
      ) : null}
    </div>
  );
}
