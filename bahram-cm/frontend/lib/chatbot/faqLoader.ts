import type { FaqGroup } from '@/lib/data/chatbotFaq';
import { SITE_FAQ_GROUP } from '@/lib/data/siteFaqContent';
import { getJson } from '@/lib/services/api';

type PublicFaq = {
  id: number;
  question: string;
  answer: string;
};

/** Build-stable fallback when the FAQs API is empty or unavailable. */
export function defaultChatbotFaqGroups(): FaqGroup[] {
  return [{ ...SITE_FAQ_GROUP, items: SITE_FAQ_GROUP.items.map((i) => ({ ...i })) }];
}

/**
 * Chatbot FAQ tab — prefer active FAQs from `/admin/commerce/faqs` (public API),
 * fall back to `siteFaqContent` so the tab is never empty on local/API failure.
 *
 * Uses client-safe `getJson` only — do not import `@/lib/services/faqs`
 * (that module pulls in `server-only` via staticFetch).
 */
export async function loadChatbotFaqGroupsServer(): Promise<FaqGroup[]> {
  return defaultChatbotFaqGroups();
}

export async function loadChatbotFaqGroups(): Promise<FaqGroup[]> {
  try {
    const result = await getJson<{ data: PublicFaq[] }>('/faqs');
    if (result.ok && Array.isArray(result.data.data) && result.data.data.length > 0) {
      const items = result.data.data
        .filter((f) => f.question?.trim() && f.answer?.trim())
        .map((f) => ({ q: f.question.trim(), a: f.answer.trim() }));
      if (items.length > 0) {
        return [{ id: 'site-faq', title: 'سوالات متداول', items }];
      }
    }
  } catch {
    /* fall through */
  }

  return defaultChatbotFaqGroups();
}
