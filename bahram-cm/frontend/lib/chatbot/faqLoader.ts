import type { FaqGroup } from '@/lib/data/chatbotFaq';
import { SITE_FAQ_GROUP } from '@/lib/data/siteFaqContent';

/**
 * Chatbot FAQ tab — same build-stable copy as the public FAQ page.
 * Kept in frontend source so deploy cannot wipe or revert these answers.
 */
export async function loadChatbotFaqGroupsServer(): Promise<FaqGroup[]> {
  return [{ ...SITE_FAQ_GROUP, items: SITE_FAQ_GROUP.items.map((i) => ({ ...i })) }];
}

export async function loadChatbotFaqGroups(): Promise<FaqGroup[]> {
  return loadChatbotFaqGroupsServer();
}
