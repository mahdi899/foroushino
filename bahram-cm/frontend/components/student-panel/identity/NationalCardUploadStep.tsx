'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { studentIdentityArtifactStreamUrl } from '@/lib/student/identityArtifacts';
import { IdentityUploadProgress } from './IdentityUploadProgress';

const MAX_MB = 8;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

const GUIDANCE =
  'تصویر واضح از کارت ملی یا شناسنامه را انتخاب کنید؛ کل مدرک داخل کادر و متن خوانا باشد. این تصویر فقط برای تأیید هویت استفاده می‌شود.';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت`;
}

type Props = {
  file: File | null;
  serverCardArtifactId?: number | null;
  onFileChange: (file: File | null) => void;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  continuePending?: boolean;
  continuePendingLabel?: string;
  uploadProgress?: number | null;
};

export function NationalCardUploadStep({
  file,
  serverCardArtifactId = null,
  onFileChange,
  onBack,
  onContinue,
  continueDisabled = false,
  continuePending = false,
  continuePendingLabel = 'ادامه',
  uploadProgress = null,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function validateAndSet(next: File | null) {
    setLocalError(null);
    if (!next) {
      onFileChange(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (!next.type.startsWith('image/')) {
      setLocalError('فقط فایل تصویری مجاز است.');
      return;
    }

    if (next.size > MAX_MB * 1024 * 1024) {
      setLocalError(`حجم تصویر نباید بیشتر از ${MAX_MB.toLocaleString('fa-IR')} مگابایت باشد.`);
      return;
    }

    onFileChange(next);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    validateAndSet(e.target.files?.[0] ?? null);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    validateAndSet(e.dataTransfer.files?.[0] ?? null);
  }

  const showServerPreview = !file && serverCardArtifactId != null;

  return (
    <div className="panel-identity-card-upload">
      <div className="panel-identity-card-upload__header">
        <span className="panel-identity-card-upload__icon" aria-hidden>
          <CreditCard size={20} strokeWidth={2} />
        </span>
        <div className="panel-identity-card-upload__heading">
          <h3 className="panel-identity-card-upload__title">بارگذاری تصویر کارت ملی / شناسنامه</h3>
          <p className="panel-identity-card-upload__subtitle">{GUIDANCE}</p>
        </div>
      </div>

      <div className="panel-identity-card-upload__body">
        {showServerPreview ? (
          <div className="panel-identity-card-upload__server-preview">
            <div className="panel-identity-card-upload__preview-frame panel-identity-card-upload__preview-frame--server">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={studentIdentityArtifactStreamUrl(serverCardArtifactId)}
                alt="تصویر کارت ملی بارگذاری‌شده"
              />
              <span className="panel-identity-card-upload__preview-badge">
                <CheckCircle2 size={14} aria-hidden />
                بارگذاری شده
              </span>
            </div>
            <p className="panel-identity-card-upload__server-caption">
              تصویر کارت ملی قبلاً ذخیره شده است. در صورت نیاز می‌توانید تصویر جدید انتخاب کنید.
            </p>
          </div>
        ) : null}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={onInputChange}
        />

        {!file ? (
          <div className="panel-identity-card-upload__slot">
            <label
              htmlFor={inputId}
              className={cn(
                'panel-identity-card-upload__zone',
                dragActive && 'panel-identity-card-upload__zone--active',
              )}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={onDrop}
            >
              <span className="panel-identity-card-upload__zone-icon" aria-hidden>
                <Upload size={22} strokeWidth={2} />
              </span>
              <span className="panel-identity-card-upload__zone-title">کارت ملی / شناسنامه</span>
              <span className="panel-identity-card-upload__zone-hint">
                حداکثر {MAX_MB.toLocaleString('fa-IR')} مگابایت
              </span>
              <span className="btn btn-secondary panel-identity-card-upload__zone-btn">
                <ImagePlus size={16} aria-hidden />
                انتخاب از گالری
              </span>
            </label>
          </div>
        ) : (
          <div className="panel-identity-card-upload__slot">
            <div className="panel-identity-card-upload__preview">
              <div className="panel-identity-card-upload__preview-frame">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="پیش‌نمایش تصویر کارت ملی" />
                ) : null}
                <span className="panel-identity-card-upload__preview-badge">
                  <CheckCircle2 size={14} aria-hidden />
                  انتخاب شد
                </span>
              </div>
              <div className="panel-identity-card-upload__preview-footer">
                <p className="panel-identity-card-upload__filesize">{formatFileSize(file.size)}</p>
                <div className="panel-identity-card-upload__preview-actions">
                  <label htmlFor={inputId} className="btn btn-secondary">
                    <ImagePlus size={16} aria-hidden />
                    تغییر
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary panel-identity-card-upload__remove"
                    onClick={() => validateAndSet(null)}
                  >
                    <Trash2 size={16} aria-hidden />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {localError ? <p className="panel-identity-card-upload__error">{localError}</p> : null}

      {uploadProgress != null ? (
        <IdentityUploadProgress percent={uploadProgress} label="در حال بارگذاری تصویر کارت ملی…" />
      ) : null}

      <div className="panel-identity-step__actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          قبلی
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={continueDisabled || continuePending}
          onClick={onContinue}
        >
          {continuePending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {continuePending ? continuePendingLabel : 'ادامه'}
        </button>
      </div>
    </div>
  );
}
