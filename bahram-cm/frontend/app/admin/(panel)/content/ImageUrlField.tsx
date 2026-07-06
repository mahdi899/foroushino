'use client';

import { useState } from 'react';
import { ImageIcon, Trash2 } from 'lucide-react';
import { resolveMediaUrl, persistMediaUrl } from '@/lib/mediaUrl';
import { ImageGalleryModal } from './ImageGalleryModal';

interface ImageUrlFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  alt?: string;
  /** Tailwind classes for the preview box (default: h-32). */
  previewClassName?: string;
}

export function ImageUrlField({ label, value, onChange, alt, previewClassName }: ImageUrlFieldProps) {
  const [open, setOpen] = useState(false);
  const previewBoxClass =
    previewClassName ??
    'relative mt-2 h-32 w-full overflow-hidden rounded-lg border border-border bg-surface-soft';

  return (
    <div className="relative isolate">
      <label className="field-label">{label}</label>
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="btn btn-secondary px-3 py-2 text-small"
        >
          <ImageIcon className="h-4 w-4" />
          {value ? 'تغییر تصویر' : 'انتخاب از کتابخانه'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 text-caption text-error hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </button>
        )}
      </div>
      {value ? (
        <div className={previewBoxClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(value)}
            alt={alt ?? label}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <p className="mt-2 text-caption text-text-muted">تصویری انتخاب نشده — از کتابخانه رسانه انتخاب کنید.</p>
      )}

      <ImageGalleryModal
        open={open}
        onClose={() => setOpen(false)}
        value={resolveMediaUrl(value)}
        onSelect={(url) => onChange(persistMediaUrl(url) || url)}
        title={label}
        alt={alt ?? label}
      />
    </div>
  );
}
