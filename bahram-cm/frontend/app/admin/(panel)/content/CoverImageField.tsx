'use client';

import { useState } from 'react';
import { ImageIcon, Trash2 } from 'lucide-react';
import { resolveMediaUrl, persistMediaUrl } from '@/lib/mediaUrl';
import { ImageGalleryModal } from './ImageGalleryModal';
import { AiImageButton } from './AiImageButton';

interface CoverImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  alt?: string;
  aiPrompt?: string;
}

export function CoverImageField({ label, value, onChange, alt, aiPrompt }: CoverImageFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-center gap-3">
          <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary w-full justify-center py-2.5 text-small">
            <ImageIcon className="h-4 w-4" />
            {value ? 'تغییر تصویر شاخص' : 'انتخاب از گالری'}
          </button>
          {aiPrompt !== undefined && (
            <AiImageButton prompt={aiPrompt} purpose="cover" onGenerated={onChange} />
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center justify-center gap-1 text-caption text-error hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف تصویر
            </button>
          )}
          <p className="text-caption text-text-muted">گالری در پنجره جدا باز می‌شود.</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface-soft">
          {value ? (
            // Native img preserves natural aspect ratio inside the preview box.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(value)} alt={alt ?? label} className="mx-auto block h-auto max-h-72 w-full object-contain" />
          ) : (
            <div className="flex min-h-[10rem] items-center justify-center px-4 text-center text-caption text-text-muted">
              تصویر شاخص انتخاب نشده
            </div>
          )}
        </div>
      </div>

      <ImageGalleryModal
        open={open}
        onClose={() => setOpen(false)}
        value={resolveMediaUrl(value)}
        onSelect={(url) => onChange(persistMediaUrl(url) || url)}
        title="انتخاب تصویر شاخص"
        alt={alt ?? label}
      />
    </div>
  );
}
