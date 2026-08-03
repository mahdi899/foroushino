'use server';

import {
  convertChatbotSessionToTicket,
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
  convertChatbotSessionToTicket,
  exportChatbotLogs,
  deleteChatbotSessions,
  saveChatbotConfig,
};

export async function loadChatbotSettings() {
  return getStoredChatbotConfig();
}
