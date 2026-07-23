'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Download, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDataTheme } from '@/lib/useDataTheme';
import { applyResolvedTheme, type SiteTheme } from '@/lib/site-theme';
import { useOverlayHistoryBack } from '@/lib/family/hooks/useOverlayHistoryBack';
import {
  dismissFamilyPwaTopBanner,
  getFamilyPwaInstallHintText,
  promptFamilyPwaInstall,
  useFamilyPwaInstall,
} from '@/lib/family/pwa-install';
import { logoutStudentAction } from '@/lib/student/actions';

function lockBodyScroll(lock: boolean) {
  if (typeof document === 'undefined') return;
  const body = document.body;
  if (lock) {
    const scrollY = window.scrollY;
    body.dataset.familyMenuScrollY = String(scrollY);
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    return;
  }
  const y = Number(body.dataset.familyMenuScrollY || '0');
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  delete body.dataset.familyMenuScrollY;
  window.scrollTo(0, y);
}

export function FamilyMenuButton({
  className,
  isLoggedIn = false,
}: {
  className?: string;
  isLoggedIn?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="منو"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn('family-topbar__action family-menu-trigger', className)}
      >
        <Menu className="family-topbar__action-icon" strokeWidth={1.85} aria-hidden />
      </button>
      {open ? (
        <FamilyMenuSheet
          isLoggedIn={isLoggedIn}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function FamilyMenuSheet({
  isLoggedIn,
  onClose,
}: {
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const theme = useDataTheme();
  const pwa = useFamilyPwaInstall();
  const [hint, setHint] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [entered, setEntered] = useState(false);

  useOverlayHistoryBack('menu', onClose);

  useEffect(() => {
    lockBodyScroll(true);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      lockBodyScroll(false);
    };
  }, [onClose]);

  const setTheme = (next: SiteTheme) => {
    applyResolvedTheme(next);
  };

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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutStudentAction();
    } catch {
      setLoggingOut(false);
    }
  };

  const showInstall = !pwa.isInstalled;

  return (
    <div className="family-menu-root" role="presentation">
      <button
        type="button"
        className={cn('family-menu-backdrop', entered && 'family-menu-backdrop--in')}
        aria-label="بستن منو"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('family-menu-sheet', entered && 'family-menu-sheet--in')}
      >
        <div className="family-menu-sheet__grab" aria-hidden />
        <div className="family-menu-sheet__head">
          <h2 id={titleId} className="family-menu-sheet__title">
            منو
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="family-menu-sheet__close"
            aria-label="بستن"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.85} aria-hidden />
          </button>
        </div>

        <div className="family-menu-sheet__body">
          <div className="family-menu-section">
            <p className="family-menu-section__label">ظاهر</p>
            <div className="family-menu-theme" role="group" aria-label="حالت روشن و تاریک">
              <button
                type="button"
                className={cn('family-menu-theme__btn', theme === 'light' && 'family-menu-theme__btn--active')}
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                <Sun size={16} strokeWidth={1.85} aria-hidden />
                روشن
              </button>
              <button
                type="button"
                className={cn('family-menu-theme__btn', theme === 'dark' && 'family-menu-theme__btn--active')}
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                <Moon size={16} strokeWidth={1.85} aria-hidden />
                تاریک
              </button>
            </div>
          </div>

          {showInstall ? (
            <div className="family-menu-section">
              <button type="button" className="family-menu-item" onClick={() => void handleInstall()}>
                <Download size={18} strokeWidth={1.85} aria-hidden />
                <span className="family-menu-item__text">
                  <span className="family-menu-item__title">نصب اپ</span>
                  <span className="family-menu-item__sub">دسترسی سریع‌تر به خانواده</span>
                </span>
              </button>
              {hint ? <p className="family-menu-hint">{hint}</p> : null}
            </div>
          ) : null}

          {isLoggedIn ? (
            <div className="family-menu-section">
              {!confirmLogout ? (
                <button
                  type="button"
                  className="family-menu-item family-menu-item--danger"
                  onClick={() => setConfirmLogout(true)}
                >
                  <LogOut size={18} strokeWidth={1.85} aria-hidden />
                  <span className="family-menu-item__text">
                    <span className="family-menu-item__title">خروج از حساب</span>
                  </span>
                </button>
              ) : (
                <div className="family-menu-confirm">
                  <p className="family-menu-confirm__text">از حساب خارج می‌شوی؟</p>
                  <div className="family-menu-confirm__actions">
                    <button
                      type="button"
                      className="family-menu-confirm__btn family-menu-confirm__btn--muted"
                      onClick={() => setConfirmLogout(false)}
                      disabled={loggingOut}
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      className="family-menu-confirm__btn family-menu-confirm__btn--danger"
                      onClick={() => void handleLogout()}
                      disabled={loggingOut}
                    >
                      {loggingOut ? '…' : 'خروج'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
