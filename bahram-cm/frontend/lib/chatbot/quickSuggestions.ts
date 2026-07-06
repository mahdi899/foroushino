import type { ChatbotQuickSuggestion } from './types';

export const DEFAULT_QUICK_SUGGESTIONS: ChatbotQuickSuggestion[] = [
  {
    id: 'campaign',
    label: 'دوره کمپین‌نویسی چیست؟',
    response:
      'کمپین‌نویسی هسته مسیر بهرام است: از نگاه درست تا پیام و اجرای کمپین. برای جزئیات و شروع به صفحه «کمپین‌نویسی» بروید.',
  },
  {
    id: 'courses',
    label: 'چه دوره‌هایی دارید؟',
    response:
      'در صفحه «دوره‌ها» مسیرهای آموزشی فروش، بازاریابی و رشد حرفه‌ای را می‌بینید. هر دوره برای اجرای عملی طراحی شده است.',
  },
  {
    id: 'saat',
    label: 'سات چیست و چطور آماده شوم؟',
    response:
      'سات یعنی هر تماس یک فرصت فروش — سیستم، اسکریپت و اجرای حرفه‌ای. برای معرفی کامل و ثبت‌نام به صفحه «سات» سر بزنید.',
  },
  {
    id: 'apply',
    label: 'چطور درخواست دسترسی بدهم؟',
    response:
      'از صفحه «درخواست دسترسی» (/apply) فرم را پر کنید یا همین‌جا شماره بگذارید تا تیم آکادمی با شما هماهنگ کند.',
  },
  {
    id: 'insights',
    label: 'مقالات و insights کجاست؟',
    response:
      'در بخش «بلاگ / insights» مقالات آموزشی درباره فروش، برند شخصی و مسیر رشد حرفه‌ای منتشر می‌شود.',
  },
];

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
