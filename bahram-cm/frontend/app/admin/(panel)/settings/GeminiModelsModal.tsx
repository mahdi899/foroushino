'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, List, Loader2, Search, X } from 'lucide-react';
import { fetchGeminiModels } from './actions';
import type { GeminiModelInfo } from '@/lib/ai/geminiModels';

interface GeminiModelsModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  filter: 'chat' | 'image' | 'all';
  geminiApiKeyInput?: string;
  baseUrl?: string;
}

export function GeminiModelsModal({
  open,
  onClose,
  onSelect,
  filter,
  geminiApiKeyInput,
  baseUrl,
}: GeminiModelsModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');
  const [models, setModels] = useState<GeminiModelInfo[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStatus('loading');
    setError('');
    setModels([]);
    setQuery('');

    fetchGeminiModels({ geminiApiKeyInput, baseUrl, filter }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setModels(res.models);
        setStatus('ok');
      } else {
        setError(res.error);
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, geminiApiKeyInput, baseUrl, filter]);

  if (!open) return null;

  const filtered = models.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.id.toLowerCase().includes(q) ||
      m.displayName.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    );
  });

  const filterLabel =
    filter === 'chat' ? 'چت / متن' : filter === 'image' ? 'تصویر' : 'همه';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <List className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary-dark">مدل‌های در دسترس Gemini</p>
            <p className="mt-0.5 text-small text-text-muted">
              از Google AI Studio — فیلتر: {filterLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="admin-icon-btn hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              dir="ltr"
              placeholder="جستجو در مدل‌ها…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="field-input pr-9 font-mono text-small"
              disabled={status !== 'ok'}
            />
          </div>
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto px-5 py-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 text-small text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              در حال دریافت لیست مدل‌ها…
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 px-3 py-3 text-small text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {status === 'ok' && filtered.length === 0 && (
            <p className="py-8 text-center text-small text-text-muted">مدلی یافت نشد.</p>
          )}

          {status === 'ok' && filtered.length > 0 && (
            <ul className="space-y-2">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(m.id);
                      onClose();
                    }}
                    className="w-full rounded-lg border border-border bg-surface-soft/40 px-3 py-2.5 text-right transition hover:border-accent hover:bg-primary-soft/30"
                  >
                    <p className="font-mono text-small font-semibold text-text" dir="ltr">
                      {m.id}
                    </p>
                    {m.displayName !== m.id && (
                      <p className="mt-0.5 text-caption text-text-muted">{m.displayName}</p>
                    )}
                    {m.description && (
                      <p className="mt-1 line-clamp-2 text-caption text-text-muted">{m.description}</p>
                    )}
                    {m.methods.length > 0 && (
                      <p className="mt-1 text-caption text-text-muted" dir="ltr">
                        {m.methods.join(', ')}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {status === 'ok' && (
          <div className="border-t border-border px-5 py-3 text-caption text-text-muted">
            {filtered.length} از {models.length} مدل — برای انتخاب روی مدل کلیک کنید.
          </div>
        )}
      </div>
    </div>
  );
}
