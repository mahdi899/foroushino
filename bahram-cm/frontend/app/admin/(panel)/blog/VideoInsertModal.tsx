'use client';

import { useEffect, useState } from 'react';
import { Loader2, Video, X } from 'lucide-react';
import {
  defaultVideoSource,
  normalizeVideoInput,
  videoAttrsToFormValues,
  type ArticleVideoAttrs,
  type VideoSource,
} from '@/lib/article/videoEmbed';

interface VideoInsertModalProps {
  open: boolean;
  mode?: 'insert' | 'edit';
  initialValues?: ArticleVideoAttrs;
  onClose: () => void;
  onInsert: (attrs: { youtube: string; aparat: string; direct: string; active: VideoSource }) => void;
}

export function VideoInsertModal({
  open,
  mode = 'insert',
  initialValues,
  onClose,
  onInsert,
}: VideoInsertModalProps) {
  const [youtube, setYoutube] = useState('');
  const [aparat, setAparat] = useState('');
  const [direct, setDirect] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    const form = initialValues ? videoAttrsToFormValues(initialValues) : { youtube: '', aparat: '', direct: '' };
    setYoutube(form.youtube);
    setAparat(form.aparat);
    setDirect(form.direct);
    setError('');
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, initialValues, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const normalized = normalizeVideoInput({ youtube, aparat, direct });
    if (normalized.error) {
      setError(normalized.error);
      setSubmitting(false);
      return;
    }
    onInsert({
      youtube: normalized.youtube,
      aparat: normalized.aparat,
      direct: normalized.direct,
      active: defaultVideoSource(normalized),
    });
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-floating"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-primary-dark">
              <Video className="h-4 w-4" />
              {isEdit ? 'ویرایش ویدیو' : 'درج ویدیو'}
            </p>
            <p className="mt-0.5 text-caption text-text-muted">
              YouTube، آپارات یا لینک مستقیم mp4/webm — اگر هر دو پلتفرم را بدهید، سوئیچ زیر ویدیو نمایش داده می‌شود.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="field-label">لینک YouTube</label>
            <input
              className="field-input text-small"
              dir="ltr"
              placeholder="https://youtube.com/watch?v=…"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">لینک آپارات</label>
            <input
              className="field-input text-small"
              dir="ltr"
              placeholder="https://www.aparat.com/v/…"
              value={aparat}
              onChange={(e) => setAparat(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">لینک مستقیم ویدیو (اختیاری)</label>
            <input
              className="field-input text-small"
              dir="ltr"
              placeholder="https://…/video.mp4"
              value={direct}
              onChange={(e) => setDirect(e.target.value)}
            />
          </div>
          {error && <p className="text-caption text-error">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1 px-4 py-2 text-small">
            انصراف
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary flex-1 px-4 py-2 text-small">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'ذخیره تغییرات' : 'درج ویدیو'}
          </button>
        </div>
      </form>
    </div>
  );
}
