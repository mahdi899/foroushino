'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Trash2, Zap } from 'lucide-react';
import type { ChatbotQuickSuggestion } from '@/lib/chatbot/types';

function newSuggestionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `qs-${Date.now()}`;
}

interface QuickSuggestionsSectionProps {
  suggestions: ChatbotQuickSuggestion[];
  onChange: (suggestions: ChatbotQuickSuggestion[]) => void;
}

export function QuickSuggestionsSection({ suggestions, onChange }: QuickSuggestionsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addSuggestion() {
    const id = newSuggestionId();
    onChange([...suggestions, { id, label: '', response: '' }]);
    setExpandedId(id);
  }

  function updateSuggestion(id: string, patch: Partial<ChatbotQuickSuggestion>) {
    onChange(suggestions.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSuggestion(id: string) {
    onChange(suggestions.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="space-y-4 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-h3 text-primary-dark">
            <Zap className="h-5 w-5 text-amber-500" />
            پیشنهادهای سریع
          </h2>
          <p className="mt-1 text-caption text-text-muted">
            دکمه‌های «پیشنهاد سریع» در شروع چت — پاسخ از همینجا نمایش داده می‌شود و به AI ارسال
            نمی‌شود.
          </p>
        </div>
        <button
          type="button"
          onClick={addSuggestion}
          disabled={suggestions.length >= 8}
          className="btn btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-small disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          افزودن
        </button>
      </div>

      {suggestions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-soft/40 p-4 text-small text-text-muted">
          پیشنهادی تعریف نشده — در سایت پیشنهاد سریع نمایش داده نمی‌شود.
        </p>
      ) : (
        <div className="space-y-2">
          {suggestions.map((item, index) => {
            const open = expandedId === item.id;
            const preview = item.label.trim() || `پیشنهاد ${index + 1}`;
            return (
              <div key={item.id} className="rounded-lg border border-border bg-surface">
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : item.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-right text-small font-medium text-primary-dark"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-text-muted transition ${open ? 'rotate-180' : ''}`}
                    />
                    <span className="truncate">{preview}</span>
                    {!item.response.trim() && (
                      <span className="shrink-0 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                        بدون پاسخ
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSuggestion(item.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-text-muted transition hover:bg-red-50 hover:text-danger"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {open && (
                  <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
                    <div>
                      <label className="field-label">متن دکمه (سؤال کاربر)</label>
                      <input
                        className="field-input mt-1"
                        value={item.label}
                        onChange={(e) => updateSuggestion(item.id, { label: e.target.value })}
                        placeholder="مثلاً: دوره‌های آکادمی بهرام چیست؟"
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <label className="field-label">پاسخ آماده</label>
                      <textarea
                        rows={4}
                        className="field-input mt-1"
                        value={item.response}
                        onChange={(e) => updateSuggestion(item.id, { response: e.target.value })}
                        placeholder="پاسخی که بلافاصله به کاربر نشان داده می‌شود…"
                        maxLength={2000}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
