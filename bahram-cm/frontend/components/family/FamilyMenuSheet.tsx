'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  ChevronLeft,
  Download,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
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
import { updateStudentDisplayNameAction } from '@/lib/student/panelActions';
import { studentPanelHref } from '@/lib/domains';
import { familyHaptic } from '@/lib/family/haptics';

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

const MENU_EXIT_MS = 220;

export function FamilyMenuButton({
  className,
  isLoggedIn = false,
  needsName = false,
}: {
  className?: string;
  isLoggedIn?: boolean;
  needsName?: boolean;
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
          familyHaptic('medium');
          setOpen(true);
        }}
        className={cn('family-topbar__action family-menu-trigger', className)}
      >
        <Menu className="family-topbar__action-icon" strokeWidth={1.85} aria-hidden />
        {isLoggedIn && needsName ? (
          <span className="family-menu-trigger__dot" aria-hidden />
        ) : null}
      </button>
      {open ? (
        <FamilyMenuSheet isLoggedIn={isLoggedIn} needsName={needsName} onClose={close} />
      ) : null}
    </>
  );
}

function FamilyMenuSheet({
  isLoggedIn,
  needsName,
  onClose,
}: {
  isLoggedIn: boolean;
  needsName: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
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
  const [view, setView] = useState<'menu' | 'profile'>('menu');
  const [nameComplete, setNameComplete] = useState(!needsName);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePending, setProfilePending] = useState(false);
  const exitTimerRef = useRef<number | null>(null);
  const exitingRef = useRef(false);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Stable callback — must NOT recreate when exit state flips, or the mount
  // effect cleanup will clear the exit timer and the sheet never unmounts.
  const requestClose = useCallback(() => {
    if (closedRef.current || exitingRef.current) return;
    exitingRef.current = true;
    setEntered(false);
    // Drop focus before unmount so iOS doesn't keep a scaled visualViewport.
    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
    if (exitTimerRef.current != null) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      closedRef.current = true;
      onCloseRef.current();
    }, MENU_EXIT_MS);
  }, []);

  // System/browser back closes the whole sheet; in-sheet back returns to the menu list.
  useOverlayHistoryBack('menu', requestClose);

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
    // Avoid auto-focus on phones — iOS can nudge visualViewport / feel like a zoom.
    const isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (!isCoarse) closeBtnRef.current?.focus();

    return () => {
      window.cancelAnimationFrame(frame);
      lockBodyScroll(false);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (view === 'profile') {
        setView('menu');
        return;
      }
      requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, view]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, []);

  const setTheme = (next: SiteTheme) => {
    familyHaptic('selection');
    applyResolvedTheme(next);
  };

  const handleInstall = async () => {
    familyHaptic('medium');
    const outcome = await promptFamilyPwaInstall();
    if (outcome === 'accepted') {
      familyHaptic('success');
      dismissFamilyPwaTopBanner();
      return;
    }
    if (outcome === 'unavailable') {
      setHint(getFamilyPwaInstallHintText(pwa.hintKind) || getFamilyPwaInstallHintText('android-manual'));
    }
  };

  const handlePushToggle = async () => {
    if (pushBusy) return;
    familyHaptic('selection');
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
          familyHaptic('success');
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

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profilePending) return;

    setProfileError(null);
    setProfilePending(true);
    try {
      const result = await updateStudentDisplayNameAction(firstName, lastName);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      familyHaptic('success');
      setNameComplete(true);
      router.refresh();
      setView('menu');
    } catch {
      setProfileError('ثبت نام انجام نشد.');
    } finally {
      setProfilePending(false);
    }
  };

  const showInstall = !pwa.isInstalled;
  const showProfileCta = isLoggedIn && !nameComplete;

  return (
    <FamilyBodyPortal>
      <div className="family-menu-root" role="presentation">
        <button
          type="button"
          className={cn('family-menu-backdrop', entered && 'family-menu-backdrop--in')}
          aria-label="بستن منو"
          onClick={requestClose}
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
            {view === 'profile' ? (
              <button
                type="button"
                className="family-menu-sheet__back"
                aria-label="بازگشت به منو"
                onClick={() => setView('menu')}
              >
                <ChevronLeft size={18} strokeWidth={1.85} aria-hidden />
              </button>
            ) : (
              <span className="family-menu-sheet__back family-menu-sheet__back--spacer" aria-hidden />
            )}
            <h2 id={titleId} className="family-menu-sheet__title">
              {view === 'profile' ? 'تکمیل پروفایل' : 'منو'}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              className="family-menu-sheet__close"
              aria-label="بستن"
              onClick={requestClose}
            >
              <X size={18} strokeWidth={1.85} aria-hidden />
            </button>
          </div>

          {view === 'profile' ? (
            <div className="family-menu-sheet__body">
              <form className="family-menu-profile" onSubmit={(e) => void handleProfileSubmit(e)}>
                <p className="family-menu-profile__hint">
                  نام و نام خانوادگی در پنل دانشجو ذخیره می‌شود و در خانواده هم نمایش داده می‌شود.
                </p>
                <label className="family-menu-profile__field">
                  <span>نام</span>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثلاً علی"
                    disabled={profilePending}
                    className="family-menu-profile__input"
                  />
                </label>
                <label className="family-menu-profile__field">
                  <span>نام خانوادگی</span>
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="مثلاً رستمی"
                    disabled={profilePending}
                    className="family-menu-profile__input"
                  />
                </label>
                {profileError ? <p className="family-menu-profile__error">{profileError}</p> : null}
                <button
                  type="submit"
                  className="family-menu-profile__submit"
                  disabled={profilePending}
                >
                  {profilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ذخیره'}
                </button>
                <a
                  href={studentPanelHref('/panel/profile')}
                  className="family-menu-profile__panel-link"
                  onClick={() => familyHaptic('selection')}
                >
                  مشاهده پروفایل در پنل دانشجو
                </a>
              </form>
            </div>
          ) : (
            <div className="family-menu-sheet__body">
              {showProfileCta ? (
                <div className="family-menu-section">
                  <button
                    type="button"
                    className="family-menu-item family-menu-item--accent"
                    onClick={() => {
                      familyHaptic('medium');
                      setView('profile');
                    }}
                  >
                    <UserRound size={18} strokeWidth={1.85} aria-hidden />
                    <span className="family-menu-item__text">
                      <span className="family-menu-item__title">تکمیل پروفایل</span>
                      <span className="family-menu-item__sub">نام و نام خانوادگی را وارد کن</span>
                    </span>
                  </button>
                </div>
              ) : isLoggedIn ? (
                <div className="family-menu-section">
                  <a
                    href={studentPanelHref('/panel/profile')}
                    className="family-menu-item"
                    onClick={() => familyHaptic('selection')}
                  >
                    <UserRound size={18} strokeWidth={1.85} aria-hidden />
                    <span className="family-menu-item__text">
                      <span className="family-menu-item__title">پروفایل دانشجو</span>
                      <span className="family-menu-item__sub">مدیریت حساب در پنل سایت</span>
                    </span>
                  </a>
                </div>
              ) : null}

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
                      <span className="family-menu-item__title">یادآوری پیام جدید</span>
                      <span className="family-menu-item__sub">
                        {pushSubscribed
                          ? 'فعال — هر ساعت اگر پیام جدید باشد'
                          : 'حداکثر یک نوتیف در ساعت، نه برای هر پیام'}
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
                      onClick={() => {
                        familyHaptic('warning');
                        setConfirmLogout(true);
                      }}
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
          )}
        </div>
      </div>
    </FamilyBodyPortal>
  );
}
