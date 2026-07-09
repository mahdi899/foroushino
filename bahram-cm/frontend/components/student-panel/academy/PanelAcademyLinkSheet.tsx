'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AlertCircle, ExternalLink, LifeBuoy, X } from 'lucide-react';
import { academyLinkMeta } from '@/components/student-panel/academy/academyLinkMeta';
import { CopyTextButton } from '@/components/student-panel/ui/CopyTextButton';

export function PanelAcademyLinkSheet({
  open,
  title,
  stepKey,
  url,
  onClose,
  onDirectOpen,
}: {
  open: boolean;
  title: string;
  stepKey: string;
  url: string | null;
  onClose: () => void;
  onDirectOpen: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const meta = academyLinkMeta(stepKey);
  const Icon = meta?.icon;
  const variant = meta?.variant ?? 'bot';
  const hint = meta?.hint ?? 'لینک را کپی کنید یا مستقیم باز کنید.';
  const badge = meta?.badge ?? 'لینک';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const hasUrl = Boolean(url?.trim());
  const portalTarget = document.getElementById('panel-root') ?? document.body;

  return createPortal(
    <>
      <div className="panel-academy-sheet__scrim" onClick={onClose} aria-hidden />
      <div
        className={`panel-academy-sheet panel-academy-sheet--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-academy-sheet-title"
      >
        <div className="panel-academy-sheet__banner">
          <div className="panel-academy-sheet__banner-glow" aria-hidden />
          <div className="panel-academy-sheet__handle" aria-hidden />
          <button type="button" className="panel-academy-sheet__close" onClick={onClose} aria-label="بستن">
            <X size={18} />
          </button>

          <div className="panel-academy-sheet__banner-main">
            {Icon ? (
              <div className="panel-academy-sheet__icon" aria-hidden>
                <span className="panel-academy-sheet__icon-ring" />
                <span className="panel-academy-sheet__icon-core">
                  <Icon size={28} strokeWidth={2} />
                </span>
              </div>
            ) : null}

            <div className="panel-academy-sheet__intro">
              <span className="panel-academy-sheet__chip">{badge}</span>
              <h3 id="panel-academy-sheet-title" className="panel-academy-sheet__title">
                {title}
              </h3>
              <p className="panel-academy-sheet__hint">{hint}</p>
            </div>
          </div>
        </div>

        <div className="panel-academy-sheet__content">
          {hasUrl ? (
            <div className="panel-academy-sheet__link-box">
              <span className="panel-academy-sheet__link-label">لینک دسترسی</span>
              <CopyTextButton value={url} label="کپی لینک" className="panel-academy-sheet__copy" />
            </div>
          ) : (
            <div className="panel-academy-sheet__empty">
              <span className="panel-academy-sheet__empty-icon" aria-hidden>
                <AlertCircle size={20} strokeWidth={2} />
              </span>
              <div className="panel-academy-sheet__empty-copy">
                <p className="panel-academy-sheet__empty-title">لینک هنوز تنظیم نشده</p>
                <p className="panel-academy-sheet__empty-text">
                  این لینک در پنل ادمین ثبت نشده است. برای دریافت لینک با پشتیبانی تماس بگیرید.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="panel-academy-sheet__actions">
          {hasUrl ? (
            <button type="button" className="panel-academy-sheet__cta" onClick={onDirectOpen}>
              <ExternalLink size={18} strokeWidth={2} />
              ورود مستقیم
            </button>
          ) : (
            <Link href="/panel/support" className="panel-academy-sheet__cta" onClick={onClose}>
              <LifeBuoy size={18} strokeWidth={2} />
              تماس با پشتیبانی
            </Link>
          )}
          <button type="button" className="panel-academy-sheet__dismiss" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </>,
    portalTarget,
  );
}
