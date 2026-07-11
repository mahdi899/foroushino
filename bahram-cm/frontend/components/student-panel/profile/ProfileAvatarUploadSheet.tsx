'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Area } from 'react-easy-crop';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { PanelProfileAvatar } from '@/components/student-panel/layout/PanelProfileAvatar';
import { ProfileAvatarCropper } from '@/components/student-panel/profile/ProfileAvatarCropper';
import { blobToFile, cropImageToBlob } from '@/lib/media/cropImage';
import { useTouchDevice } from '@/lib/media/useTouchDevice';
import { cn } from '@/lib/cn';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

type Step = 'pick' | 'crop';

type Props = {
  open: boolean;
  onClose: () => void;
  displayName: string;
  hasCustomAvatar: boolean;
  avatar?: string | null;
  avatarUrl?: string | null;
  gravatarUrl?: string | null;
  defaultAvatarUrl?: string | null;
  verified: boolean;
  verifiedLabel: string;
  pending: boolean;
  error: string;
  onConfirm: (file: File) => void;
};

function validateSourceFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'فقط فایل تصویری مجاز است.';
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return 'حجم تصویر انتخاب‌شده بیش از حد مجاز است.';
  }
  return null;
}

export function ProfileAvatarUploadSheet({
  open,
  onClose,
  displayName,
  hasCustomAvatar,
  avatar,
  avatarUrl,
  gravatarUrl,
  defaultAvatarUrl,
  verified,
  verifiedLabel,
  pending,
  error,
  onConfirm,
}: Props) {
  const isTouchDevice = useTouchDevice();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [localError, setLocalError] = useState('');
  const [cropping, setCropping] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const sourceUrl = useMemo(() => {
    if (!sourceFile) return null;
    return URL.createObjectURL(sourceFile);
  }, [sourceFile]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sourceUrl) return;
    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => {
    if (open) return;
    setStep('pick');
    setSourceFile(null);
    setCropArea(null);
    setLocalError('');
    setCropping(false);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending && !cropping) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, pending, cropping]);

  function resetPick() {
    setStep('pick');
    setSourceFile(null);
    setCropArea(null);
    setLocalError('');
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  function onPick(file: File | undefined) {
    if (!file) return;
    const validationError = validateSourceFile(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError('');
    setSourceFile(file);
    setCropArea(null);
    setStep('crop');
  }

  async function handleConfirmCrop() {
    if (!sourceFile || !sourceUrl || !cropArea) {
      setLocalError('ابتدا موقعیت عکس را تنظیم کنید.');
      return;
    }

    setCropping(true);
    setLocalError('');

    try {
      const blob = await cropImageToBlob(sourceUrl, cropArea);
      if (blob.size > MAX_BYTES) {
        setLocalError('حجم تصویر بعد از برش بیش از ۲ مگابایت است. بزرگ‌نمایی را کمتر کنید.');
        return;
      }

      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      const croppedFile = blobToFile(blob, `avatar.${ext}`);
      onConfirm(croppedFile);
    } catch {
      setLocalError('برش تصویر ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setCropping(false);
    }
  }

  function handleClose() {
    if (pending || cropping) return;
    onClose();
  }

  if (!mounted || !open) return null;

  const portalTarget = document.getElementById('panel-root') ?? document.body;
  const title = hasCustomAvatar ? 'تغییر عکس پروفایل' : 'انتخاب عکس پروفایل';
  const hint =
    step === 'crop'
      ? 'موقعیت و اندازه عکس را تنظیم کنید.'
      : hasCustomAvatar
        ? 'برای تغییر، عکس جدید انتخاب کنید.'
        : 'برای آپلود، عکس جدید انتخاب کنید.';
  const displayError = localError || error;
  const busy = pending || cropping;

  return createPortal(
    <>
      <div className="panel-academy-sheet__scrim" onClick={handleClose} aria-hidden />
      <div
        className={cn('panel-academy-sheet panel-academy-sheet--avatar', step === 'crop' && 'panel-academy-sheet--avatar-crop')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-avatar-sheet-title"
      >
        <div className="panel-academy-sheet__banner">
          <div className="panel-academy-sheet__banner-glow" aria-hidden />
          <div className="panel-academy-sheet__handle" aria-hidden />
          <button
            type="button"
            className="panel-academy-sheet__close"
            onClick={handleClose}
            disabled={busy}
            aria-label="بستن"
          >
            <X size={18} />
          </button>

          <div className="panel-academy-sheet__banner-main">
            <div className="panel-academy-sheet__icon" aria-hidden>
              <span className="panel-academy-sheet__icon-ring">
                <Camera size={28} strokeWidth={2} />
              </span>
            </div>

            <div className="panel-academy-sheet__intro">
              <span className="panel-academy-sheet__chip">تصویر پروفایل</span>
              <h3 id="panel-avatar-sheet-title" className="panel-academy-sheet__title">
                {title}
              </h3>
              <p className="panel-academy-sheet__hint">{hint}</p>
            </div>
          </div>
        </div>

        <div className="panel-academy-sheet__content">
          <input
            ref={galleryInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />

          {step === 'crop' && sourceUrl ? (
            <ProfileAvatarCropper imageSrc={sourceUrl} onCropChange={setCropArea} />
          ) : (
            <div className="panel-avatar-sheet__preview">
              <PanelProfileAvatar
                avatar={avatar}
                avatarUrl={avatarUrl}
                gravatarUrl={gravatarUrl}
                defaultAvatarUrl={defaultAvatarUrl}
                alt={displayName}
                className="panel-avatar-sheet__preview-avatar !h-28 !w-28 sm:!h-32 sm:!w-32 !rounded-full !ring-0"
                verified={verified}
                verifiedLabel={verifiedLabel}
              />
            </div>
          )}

          <p className="panel-avatar-sheet__formats">
            {step === 'crop' ? 'دایره را جابه‌جا کنید و با نوار پایین بزرگ‌نمایی کنید.' : 'JPG، PNG یا WebP — حداکثر ۲ مگابایت'}
          </p>
          {displayError ? <p className="panel-avatar-sheet__error">{displayError}</p> : null}
        </div>

        <div className="panel-academy-sheet__actions">
          {step === 'crop' ? (
            <>
              <button
                type="button"
                className={cn('panel-academy-sheet__cta', busy && 'opacity-70')}
                disabled={busy}
                onClick={() => void handleConfirmCrop()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                تأیید و ذخیره
              </button>
              <button type="button" className="panel-academy-sheet__dismiss" disabled={busy} onClick={resetPick}>
                انتخاب تصویر دیگر
              </button>
            </>
          ) : isTouchDevice ? (
            <>
              <div className="panel-avatar-sheet__pick-row">
                <button
                  type="button"
                  className="panel-avatar-sheet__pick-btn panel-avatar-sheet__pick-btn--primary"
                  disabled={busy}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus size={18} strokeWidth={2} />
                  انتخاب از گالری
                </button>
                <button
                  type="button"
                  className="panel-avatar-sheet__pick-btn"
                  disabled={busy}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={18} strokeWidth={2} />
                  دوربین
                </button>
              </div>
              <button type="button" className="panel-academy-sheet__dismiss" disabled={busy} onClick={handleClose}>
                انصراف
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="panel-academy-sheet__cta"
                disabled={busy}
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImagePlus size={18} strokeWidth={2} />
                انتخاب تصویر
              </button>
              <button type="button" className="panel-academy-sheet__dismiss" disabled={busy} onClick={handleClose}>
                انصراف
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    portalTarget,
  );
}
