'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { fixSeoCheckWithAi } from './actions';
import type { SeoFixPatch } from '@/lib/ai/seoFix';
import type { SeoCheck } from '@/lib/admin/seoScore';
import type { SeoFixArticleContext } from '@/lib/ai/seoFix';
import type { ApiCategory } from '@/lib/api/types';

const PATCH_LABELS: Partial<Record<keyof SeoFixPatch, string>> = {
  focusKeyword: 'کلمه کلیدی',
  metaTitle: 'Meta Title',
  metaDescription: 'Meta Description',
  slug: 'اسلاگ',
  excerpt: 'خلاصه',
  body: 'متن مقاله (HTML)',
  robots: 'Robots',
  categoryName: 'دسته‌بندی',
};

interface SeoFixModalProps {
  open: boolean;
  check: SeoCheck | null;
  article: SeoFixArticleContext;
  categories: ApiCategory[];
  onClose: () => void;
  onApply: (patch: SeoFixPatch) => void;
}

function previewValue(value: string, max = 280): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function SeoFixModal({ open, check, article, categories, onClose, onApply }: SeoFixModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [patch, setPatch] = useState<SeoFixPatch | null>(null);

  useEffect(() => {
    if (!open || !check) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose, check]);

  useEffect(() => {
    if (!open || !check) return;

    let cancelled = false;
    setLoading(true);
    setError('');
    setSummary('');
    setPatch(null);

    fixSeoCheckWithAi({ check, article, categories }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setSummary(res.data.summary);
        setPatch(res.data.patch);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot at open; avoid re-run while editing
  }, [open, check?.id]);

  async function retry() {
    if (!check) return;
    setLoading(true);
    setError('');
    const res = await fixSeoCheckWithAi({ check, article, categories });
    if (res.ok) {
      setSummary(res.data.summary);
      setPatch(res.data.patch);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  if (!open || !check) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={loading ? undefined : onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary-dark">اصلاح سئو با AI</p>
            <p className="mt-0.5 text-small text-text-muted">{check.label}</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="rounded-lg bg-surface-soft/80 px-3 py-2 text-caption text-text-muted">{check.hint}</p>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-small text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              AI در حال آماده‌سازی پیشنهاد…
            </div>
          )}

          {error && !loading && (
            <div className="space-y-3">
              <p className="text-small text-error">{error}</p>
              {check.id !== 'cover' && (
                <button type="button" onClick={retry} className="btn btn-secondary px-3 py-1.5 text-caption">
                  تلاش مجدد
                </button>
              )}
            </div>
          )}

          {summary && !loading && (
            <p className="text-small text-text">{summary}</p>
          )}

          {patch && !loading && (
            <div className="space-y-3">
              <p className="text-caption font-semibold text-primary-dark">پیش‌نمایش تغییرات</p>
              {Object.entries(patch).map(([key, value]) => {
                if (value === undefined || value === null || key === 'categoryId') return null;
                const label = PATCH_LABELS[key as keyof SeoFixPatch] ?? key;
                const text = String(value);
                const isHtml = key === 'body';
                return (
                  <div key={key} className="rounded-lg border border-border bg-surface-soft/50 p-3">
                    <p className="mb-1 text-caption font-medium text-primary-dark">{label}</p>
                    {isHtml ? (
                      <div
                        className="prose prose-sm max-h-40 max-w-none overflow-y-auto text-caption text-text"
                        dir="auto"
                        dangerouslySetInnerHTML={{ __html: previewValue(text, 2000) }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-caption text-text" dir={key === 'slug' ? 'ltr' : 'auto'}>
                        {previewValue(text)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary px-4 py-2 text-small">
            انصراف
          </button>
          <button
            type="button"
            disabled={loading || !patch}
            onClick={() => {
              if (patch) {
                onApply(patch);
                onClose();
              }
            }}
            className="btn btn-primary px-4 py-2 text-small"
          >
            <Check className="h-4 w-4" />
            تأیید و اعمال
          </button>
        </div>
      </div>
    </div>
  );
}
