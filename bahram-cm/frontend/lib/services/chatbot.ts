/** AI chatbot widget service. */
import { getJson, postJson, type ApiResult } from "./api";

export type ChatbotSettings = {
  is_enabled: boolean;
  bot_name: string;
  welcome_message: string;
  collect_name_enabled: boolean;
  collect_phone_enabled: boolean;
};

export type ChatbotMessageInput = {
  session_id: string;
  message: string;
  name?: string;
  phone?: string;
};

export type ChatbotMessageResult = {
  session_id: string;
  reply: string;
};

type SettingsResponse = { data: ChatbotSettings };
type MessageResponse = { data: ChatbotMessageResult };

export async function getChatbotSettings(): Promise<ApiResult<ChatbotSettings>> {
  const result = await getJson<SettingsResponse>("/chatbot/settings");
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}

export async function sendChatbotMessage(
  input: ChatbotMessageInput,
): Promise<ApiResult<ChatbotMessageResult>> {
  const result = await postJson<MessageResponse>("/chatbot/message", input, {
    timeoutMs: 30000,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
