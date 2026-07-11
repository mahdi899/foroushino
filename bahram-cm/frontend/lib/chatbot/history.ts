import type { ChatbotMessage } from './types';

const HISTORY_KEY = 'bahram_chatbot_history';
const MAX_MESSAGES = 50;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredChatHistory {
  sessionId: string;
  messages: ChatbotMessage[];
  updatedAt: number;
}

function isPersistable(msg: ChatbotMessage): boolean {
  return !msg.pending && !msg.typing;
}

/** Pair user bubbles with the server log id from the following AI exchange. */
function backfillUserLogIds(messages: ChatbotMessage[]): ChatbotMessage[] {
  const next = messages.map((m) => ({ ...m }));

  for (let i = 0; i < next.length; i++) {
    const msg = next[i];
    if (msg.role !== 'assistant' || !msg.logId || msg.fromOperator || msg.isOperatorAck) continue;

    for (let j = i - 1; j >= 0; j--) {
      if (next[j].role !== 'user') continue;
      if (!next[j].logId) next[j] = { ...next[j], logId: msg.logId };
      break;
    }
  }

  return next;
}

/** Load saved thread for this browser session (localStorage, keyed by session id). */
export function loadChatHistory(sessionId: string): ChatbotMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredChatHistory;
    if (parsed.sessionId !== sessionId) return [];
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      localStorage.removeItem(HISTORY_KEY);
      return [];
    }

    return backfillUserLogIds(
      (parsed.messages ?? [])
      .filter(isPersistable)
      .slice(-MAX_MESSAGES)
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        ...(m.ctas?.length ? { ctas: m.ctas } : {}),
        ...(m.error ? { error: true } : {}),
        ...(m.logId ? { logId: m.logId } : {}),
        ...(m.rating ? { rating: m.rating } : {}),
        ...(m.fromOperator || m.id.startsWith('op-')
          ? {
              fromOperator: true,
              operatorName: m.operatorName ?? 'اپراتور کلینیک',
              ...(m.operatorAvatarUrl ? { operatorAvatarUrl: m.operatorAvatarUrl } : {}),
              ...(m.replyToLogId ? { replyToLogId: m.replyToLogId } : {}),
              ...(m.replyToPreview ? { replyToPreview: m.replyToPreview } : {}),
            }
          : {}),
        ...(m.isAiReply || m.id.startsWith('a-') ? { isAiReply: true } : {}),
        ...(m.isOperatorAck || m.id.startsWith('ack-') ? { isOperatorAck: true } : {}),
        ...(m.videoUrl ? { videoUrl: m.videoUrl } : {}),
      })),
    );
  } catch {
    return [];
  }
}

/** Persist thread after each completed exchange. */
export function saveChatHistory(sessionId: string, messages: ChatbotMessage[]): void {
  if (typeof window === 'undefined') return;

  const persistable = messages.filter(isPersistable).slice(-MAX_MESSAGES);
  if (persistable.length === 0) return;

  try {
    const payload: StoredChatHistory = {
      sessionId,
      messages: persistable,
      updatedAt: Date.now(),
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(payload));
  } catch {
    /* quota exceeded — drop oldest half and retry once */
    try {
      const trimmed = persistable.slice(-Math.floor(MAX_MESSAGES / 2));
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify({ sessionId, messages: trimmed, updatedAt: Date.now() }),
      );
    } catch {
      /* non-fatal */
    }
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: { sessionId: string; messages: ChatbotMessage[] } | null = null;

/** Debounced write — avoids localStorage churn on every keystroke / typing tick. */
export function scheduleSaveChatHistory(sessionId: string, messages: ChatbotMessage[]): void {
  pendingSave = { sessionId, messages };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (pendingSave) {
      saveChatHistory(pendingSave.sessionId, pendingSave.messages);
      pendingSave = null;
    }
  }, 600);
}

export function flushChatHistorySave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (pendingSave) {
    saveChatHistory(pendingSave.sessionId, pendingSave.messages);
    pendingSave = null;
  }
}

export function clearChatHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
