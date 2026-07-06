import type { FaqGroup } from '@/lib/data/chatbotFaq';

export type PublicFaq = {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
};

const UNCategorized_KEY = '__general__';
const DEFAULT_GROUP_TITLE = 'سوالات متداول';

/** Same-origin public API — proxied to Laravel; works on any deployed domain. */
export function resolvePublicFaqsUrl(): string {
  if (typeof window !== 'undefined') {
    return new URL('/api/faqs', window.location.origin).toString();
  }

  const backend = (
    process.env.BACKEND_PROXY_URL ??
    process.env.API_INTERNAL_URL ??
    'http://127.0.0.1:8010'
  ).replace(/\/+$/, '');

  return `${backend}/api/faqs`;
}

export function groupFaqsByCategory(faqs: PublicFaq[]): FaqGroup[] {
  const sorted = [...faqs].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const groups = new Map<string, FaqGroup & { order: number }>();

  for (const faq of sorted) {
    const category = faq.category?.trim() || '';
    const key = category || UNCategorized_KEY;
    const title = category || DEFAULT_GROUP_TITLE;

    let group = groups.get(key);
    if (!group) {
      group = { id: key, title, items: [], order: faq.sort_order };
      groups.set(key, group);
    } else {
      group.order = Math.min(group.order, faq.sort_order);
    }

    group.items.push({ q: faq.question, a: faq.answer });
  }

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'fa'))
    .map(({ order: _order, ...group }) => group);
}

/** Load active FAQs from the same source as admin → commerce → FAQs. */
export async function loadChatbotFaqGroups(): Promise<FaqGroup[]> {
  try {
    const res = await fetch(resolvePublicFaqsUrl(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: PublicFaq[] };
    const faqs = json.data ?? [];
    if (faqs.length === 0) return [];

    return groupFaqsByCategory(faqs);
  } catch {
    return [];
  }
}
