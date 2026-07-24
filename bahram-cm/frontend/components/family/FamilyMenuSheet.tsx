'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell, BellOff, Download, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDataTheme } from '@/lib/useDataTheme';
import { applyResolvedTheme, type SiteTheme } from '@/lib/site-theme';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { useOverlayHistoryBack } from '@/lib/family/hooks/useOverlayHistoryBack';
import {
  dismissFamilyPwaTopBanner,
  getFamilyPwaInstallHintText,
  promptFamilyPwaInstall,
  useFamilyPwaInstall,
} from '@/lib/family/pwa-install';
import {
  disableFamilyDailyPush,
  enableFamilyDailyPush,
  familyPushSupported,
  getFamilyDailyPushState,
} from '@/lib/family/pwa-push';
import { logoutStudentAction } from '@/lib/student/actions';

function lockBodyScroll(lock: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('family-root');
  const target = root ?? document.body;
  if (lock) {
    target.dataset.familyMenuScrollY = '1';
    target.style.overflow = 'hidden';
    return;
  }
  target.style.overflow = '';
  delete target.dataset.familyMenuScrollY;
}

export function FamilyMenuButton({
  className,
  isLoggedIn = false,
}: {
  className?: string;
  isLoggedIn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        aria-label="منو"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn('family-topbar__action family-menu-trigger', className)}
      >
        <Menu className="family-topbar__action-icon" strokeWidth={1.85} aria-hidden />
      </button>
      {open ? <FamilyMenuSheet isLoggedIn={isLoggedIn} onClose={close} /> : null}
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
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);

  useOverlayHistoryBack('menu', onClose);

  useEffect(() => {
    if (!isLoggedIn || !familyPushSupported()) return;
    setPushSupported(true);
    void getFamilyDailyPushState().then((state) => {
      setPushSubscribed(state.subscribed && state.permission === 'granted');
    });
  }, [isLoggedIn]);

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

  const handlePushToggle = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushHint(null);
    try {
      if (pushSubscribed) {
        await disableFamilyDailyPush();
        setPushSubscribed(false);
      } else {
        const result = await enableFamilyDailyPush();
        if (result === 'subscribed') {
          setPushSubscribed(true);
        } else if (result === 'denied') {
          setPushHint('اجازه اعلان در تنظیمات مرورگر مسدود است.');
        } else if (result === 'no-sw') {
          setPushHint('برای اعلان روزانه، اول اپ را نصب کن.');
        } else if (result === 'unconfigured') {
          setPushHint('اعلان پوش هنوز از سمت سرور آماده نیست.');
        } else {
          setPushHint('فعال‌سازی اعلان ممکن نشد.');
        }
      }
    } finally {
      setPushBusy(false);
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
    <FamilyBodyPortal>
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
          onClick={(e) => e.stopPropagation()}
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
                  className={cn(
                    'family-menu-theme__btn',
                    theme === 'light' && 'family-menu-theme__btn--active',
                  )}
                  aria-pressed={theme === 'light'}
                  onClick={() => setTheme('light')}
                >
                  <Sun size={16} strokeWidth={1.85} aria-hidden />
                  روشن
                </button>
                <button
                  type="button"
                  className={cn(
                    'family-menu-theme__btn',
                    theme === 'dark' && 'family-menu-theme__btn--active',
                  )}
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

            {isLoggedIn && pushSupported ? (
              <div className="family-menu-section">
                <button
                  type="button"
                  className="family-menu-item"
                  onClick={() => void handlePushToggle()}
                  disabled={pushBusy}
                  aria-pressed={pushSubscribed}
                >
                  {pushSubscribed ? (
                    <Bell size={18} strokeWidth={1.85} aria-hidden />
                  ) : (
                    <BellOff size={18} strokeWidth={1.85} aria-hidden />
                  )}
                  <span className="family-menu-item__text">
                    <span className="family-menu-item__title">یادآوری روزانه</span>
                    <span className="family-menu-item__sub">
                      {pushSubscribed
                        ? 'فعال — هر روز اگر پیام جدید باشد'
                        : 'یک نوتیف در روز، نه برای هر پیام'}
                    </span>
                  </span>
                </button>
                {pushHint ? <p className="family-menu-hint">{pushHint}</p> : null}
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
    </FamilyBodyPortal>
  );
}
