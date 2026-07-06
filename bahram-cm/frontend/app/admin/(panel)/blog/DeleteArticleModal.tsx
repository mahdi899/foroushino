'use client';

import { useEffect } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface DeleteArticleModalProps {
  open: boolean;
  title: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteArticleModal({ open, title, loading, onClose, onConfirm }: DeleteArticleModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={loading ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className="flex items-start gap-3 border-b border-border bg-error/5 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary-dark">حذف مقاله</p>
            <p className="mt-0.5 text-small text-text-muted">این عمل نیاز به تأیید شما دارد.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-soft hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-small text-text">
          <p>
            آیا از حذف مقاله{' '}
            <strong className="text-primary-dark">«{title || 'بدون عنوان'}»</strong> مطمئن هستید؟
          </p>
          <ul className="list-inside list-disc space-y-1.5 text-caption text-text-muted">
            <li>مقاله بلافاصله از سایت پنهان می‌شود.</li>
            <li>به <strong className="text-text">سطل بازیابی</strong> منتقل می‌شود.</li>
            <li>تا <strong className="text-text">۲۴ ساعت</strong> قابل بازیابی است.</li>
            <li>پس از ۲۴ ساعت به‌صورت دائمی حذف می‌شود.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary px-4 py-2 text-small">
            انصراف
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn btn-primary bg-error px-4 py-2 text-small hover:bg-error/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            تأیید حذف
          </button>
        </div>
      </div>
    </div>
  );
}
