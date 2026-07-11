'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Loader2, X } from 'lucide-react';
import { PanelProfileAvatar } from '@/components/student-panel/layout/PanelProfileAvatar';
import { cn } from '@/lib/cn';

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
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (open) return;
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, pending]);

  function onPick(file: File | undefined) {
    if (!file) return;
    setSelectedFile(file);
  }

  function handleClose() {
    if (pending) return;
    onClose();
  }

  if (!mounted || !open) return null;

  const portalTarget = document.getElementById('panel-root') ?? document.body;
  const title = hasCustomAvatar ? 'تغییر عکس پروفایل' : 'انتخاب عکس پروفایل';
  const hint = hasCustomAvatar ? 'برای تغییر، عکس جدید انتخاب کنید.' : 'برای آپلود، عکس جدید انتخاب کنید.';

  return createPortal(
    <>
      <div className="panel-academy-sheet__scrim" onClick={handleClose} aria-hidden />
      <div
        className="panel-academy-sheet panel-academy-sheet--avatar"
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
            disabled={pending}
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
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />

          <div className="panel-avatar-sheet__preview">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="پیش‌نمایش عکس انتخاب‌شده"
                className="panel-avatar-sheet__preview-image"
              />
            ) : (
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
            )}
          </div>

          <p className="panel-avatar-sheet__formats">JPG، PNG یا WebP — حداکثر ۲ مگابایت</p>
          {error ? <p className="panel-avatar-sheet__error">{error}</p> : null}
        </div>

        <div className="panel-academy-sheet__actions">
          {selectedFile ? (
            <button
              type="button"
              className={cn('panel-academy-sheet__cta', pending && 'opacity-70')}
              disabled={pending}
              onClick={() => onConfirm(selectedFile)}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              تأیید و ذخیره
            </button>
          ) : (
            <button
              type="button"
              className="panel-academy-sheet__cta"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              <Camera size={18} strokeWidth={2} />
              انتخاب تصویر
            </button>
          )}

          {selectedFile ? (
            <button
              type="button"
              className="panel-academy-sheet__dismiss"
              disabled={pending}
              onClick={() => {
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              انتخاب تصویر دیگر
            </button>
          ) : (
            <button type="button" className="panel-academy-sheet__dismiss" disabled={pending} onClick={handleClose}>
              انصراف
            </button>
          )}
        </div>
      </div>
    </>,
    portalTarget,
  );
}
