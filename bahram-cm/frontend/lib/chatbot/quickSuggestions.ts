import { SITE_QUICK_SUGGESTIONS } from '@/lib/data/siteFaqContent';
import type { ChatbotQuickSuggestion } from './types';

/** Public chatbot chips — always match `SITE_FAQ_ITEMS` (build-stable). */
export const DEFAULT_QUICK_SUGGESTIONS: ChatbotQuickSuggestion[] = SITE_QUICK_SUGGESTIONS.map(
  (s) => ({ ...s }),
);

const MAX_SUGGESTIONS = 8;
const MAX_LABEL = 120;
const MAX_RESPONSE = 2000;

function parseRows(raw: unknown): ChatbotQuickSuggestion[] {
  if (!Array.isArray(raw)) return [];

  const out: ChatbotQuickSuggestion[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const label = String((row as ChatbotQuickSuggestion).label ?? '').trim();
    const response = String((row as ChatbotQuickSuggestion).response ?? '').trim();
    if (!label || !response) continue;

    let id = String((row as ChatbotQuickSuggestion).id ?? '').trim();
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `qs-${Date.now()}-${out.length}`;
    }

    out.push({
      id: id.slice(0, 64),
      label: label.slice(0, MAX_LABEL),
      response: response.slice(0, MAX_RESPONSE),
    });
    if (out.length >= MAX_SUGGESTIONS) break;
  }

  return out;
}

/** Load from storage — use defaults only when the key was never saved. */
export function resolveQuickSuggestions(
  raw: unknown,
  options?: { useDefaults?: boolean },
): ChatbotQuickSuggestion[] {
  const useDefaults = options?.useDefaults ?? false;
  if (raw === undefined || raw === null) {
    return useDefaults ? DEFAULT_QUICK_SUGGESTIONS.map((s) => ({ ...s })) : [];
  }
  return parseRows(raw);
}

/** Sanitize before save — never inject defaults. */
export function normalizeQuickSuggestions(raw: unknown): ChatbotQuickSuggestion[] {
  return parseRows(raw);
}

export function activeQuickSuggestions(items: ChatbotQuickSuggestion[]): ChatbotQuickSuggestion[] {
  return items.filter((s) => s.label.trim() && s.response.trim());
}
