'use server';

import {
  deleteChatbotSessions,
  exportChatbotLogs,
  fetchChatbotLogs,
  fetchChatbotOperatorQueue,
  fetchChatbotOperatorQueueCount,
  fetchChatbotSessions,
  fetchChatbotSessionThread,
  logChatbotSessionOpen,
  replyToChatbotSession,
  sendChatbotMessage,
} from '@/lib/chatbot/actions';
import { getStoredChatbotConfig, saveChatbotConfig } from '@/lib/chatbot/settings';

export {
  sendChatbotMessage,
  logChatbotSessionOpen,
  fetchChatbotLogs,
  fetchChatbotSessions,
  fetchChatbotOperatorQueue,
  fetchChatbotOperatorQueueCount,
  fetchChatbotSessionThread,
  replyToChatbotSession,
  exportChatbotLogs,
  deleteChatbotSessions,
  saveChatbotConfig,
};

export async function loadChatbotSettings() {
  return getStoredChatbotConfig();
}
