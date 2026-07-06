import type { ChatbotThreadItem } from './types';

export async function pollChatbotUpdatesClient(input: {
  sessionId: string;
  afterLogId: number;
}): Promise<ChatbotThreadItem[]> {
  try {
    const res = await fetch('/api/chatbot/poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        session_id: input.sessionId,
        after_log_id: input.afterLogId,
      }),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const body = (await res.json()) as { data?: ChatbotThreadItem[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}
