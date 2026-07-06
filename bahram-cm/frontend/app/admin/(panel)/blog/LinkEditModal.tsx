'use client';

import { useEffect, useState } from 'react';
import { Link2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkEditorValues } from '@/lib/article/linkAttrs';

interface LinkEditModalProps {
  open: boolean;
  initial: LinkEditorValues;
  needsSelection?: boolean;
  onClose: () => void;
  onApply: (values: LinkEditorValues) => boolean;
  onRemove: () => void;
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2 text-caption font-semibold transition',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-surface-soft text-text-muted hover:border-primary/30 hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function LinkEditModal({ open, initial, needsSelection = false, onClose, onApply, onRemove }: LinkEditModalProps) {
  const [href, setHref] = useState(initial.href);
  const [openInNewTab, setOpenInNewTab] = useState(initial.openInNewTab);
  const [nofollow, setNofollow] = useState(initial.nofollow);
  const [sponsored, setSponsored] = useState(initial.sponsored);
  const [submitting, setSubmitting] = useState(false);
  const [selectionError, setSelectionError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHref(initial.href);
    setOpenInNewTab(initial.openInNewTab);
    setNofollow(initial.nofollow);
    setSponsored(initial.sponsored);
    setSelectionError(false);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, initial, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = onApply({ href, openInNewTab, nofollow, sponsored });
    setSubmitting(false);
    if (!ok) setSelectionError(true);
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
              <Link2 className="h-4 w-4" />
              تنظیم لینک
            </p>
            <p className="mt-1 text-caption text-text-muted">آدرس و ویژگی‌های SEO لینک را مشخص کنید</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-text-muted hover:bg-surface-soft hover:text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="field-label">آدرس URL</label>
            <input
              value={href}
              onChange={(e) => {
                setHref(e.target.value);
                setSelectionError(false);
              }}
              className="field-input"
              dir="ltr"
              placeholder="https://example.com یا /courses"
              autoFocus
            />
            {(needsSelection || selectionError) && (
              <p className="mt-2 text-caption text-danger">
                ابتدا متن مورد نظر را در ویرایشگر انتخاب کنید، سپس دوباره «اعمال» را بزنید.
              </p>
            )}
          </div>

          <div>
            <p className="field-label mb-2">ویژگی‌های لینک</p>
            <div className="flex flex-wrap gap-2">
              <ToggleChip active={openInNewTab} onClick={() => setOpenInNewTab((v) => !v)}>
                تب جدید (target=&quot;_blank&quot;)
              </ToggleChip>
              <ToggleChip active={nofollow} onClick={() => setNofollow((v) => !v)}>
                nofollow
              </ToggleChip>
              <ToggleChip active={sponsored} onClick={() => setSponsored((v) => !v)}>
                sponsored
              </ToggleChip>
            </div>
            <p className="mt-2 text-caption text-text-muted">
              برای لینک‌های خارجی «تب جدید» توصیه می‌شود. nofollow و sponsored برای لینک‌های تبلیغاتی یا غیرداخلی.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="text-caption font-semibold text-danger hover:underline"
          >
            حذف لینک
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2 text-small">
              انصراف
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary px-4 py-2 text-small">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'اعمال'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
