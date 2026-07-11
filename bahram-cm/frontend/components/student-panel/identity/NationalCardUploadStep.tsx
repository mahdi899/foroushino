'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, ImagePlus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';

const MAX_MB = 8;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

const TIPS = [
  'تمام کارت در کادر باشد و گوشه‌ها بریده نشود.',
  'نور کافی باشد و بازتاب یا سایه روی متن نباشد.',
  'تصویر واضح و بدون تارشدگی باشد.',
] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت`;
}

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function NationalCardUploadStep({ file, onFileChange, onBack, onContinue }: Props) {
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

  return (
    <div className="panel-identity-card-upload">
      <div className="panel-identity-card-upload__header">
        <span className="panel-identity-card-upload__icon" aria-hidden>
          <CreditCard size={20} strokeWidth={2} />
        </span>
        <div>
          <h3 className="panel-identity-card-upload__title">بارگذاری تصویر کارت ملی</h3>
          <p className="panel-identity-card-upload__lead">
            تصویر روی کارت ملی را بارگذاری کنید. این تصویر فقط برای تأیید هویت استفاده می‌شود.
          </p>
        </div>
      </div>

      <div className="panel-identity-card-upload__body">
        <ul className="panel-identity-card-upload__tips">
          {TIPS.map((tip) => (
            <li key={tip}>
              <CheckCircle2 size={14} aria-hidden />
              <span>{tip}</span>
            </li>
          ))}
        </ul>

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
              <span className="panel-identity-card-upload__zone-title">انتخاب یا رها کردن تصویر</span>
              <span className="panel-identity-card-upload__zone-hint">
                JPG، PNG یا WEBP — حداکثر {MAX_MB.toLocaleString('fa-IR')} مگابایت
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
                <div className="panel-identity-card-upload__meta">
                  <p className="panel-identity-card-upload__filename" title={file.name}>
                    {file.name}
                  </p>
                  <p className="panel-identity-card-upload__filesize">{formatFileSize(file.size)}</p>
                </div>
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

      <div className="panel-identity-step__actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          قبلی
        </button>
        <button type="button" className="btn btn-primary" disabled={!file} onClick={onContinue}>
          ادامه
        </button>
      </div>
    </div>
  );
}
