'use server';

import 'server-only';

import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';
import {
  DEFAULT_CHATBOT_CONFIG,
  type ChatbotSettingsForm,
  type ChatbotStoredConfig,
} from './types';
import { normalizeQuickSuggestions, resolveQuickSuggestions } from './quickSuggestions';

const CHATBOT_GROUP = 'chatbot';
const CHATBOT_KEY = 'config';

function normalizeRateLimit(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function mergeConfig(raw: Partial<ChatbotStoredConfig> | null): ChatbotStoredConfig {
  return {
    enabled: raw?.enabled ?? DEFAULT_CHATBOT_CONFIG.enabled,
    assistant_name: raw?.assistant_name?.trim() || DEFAULT_CHATBOT_CONFIG.assistant_name,
    welcome_message: raw?.welcome_message?.trim() || DEFAULT_CHATBOT_CONFIG.welcome_message,
    welcome_video_url: raw?.welcome_video_url?.trim() ?? DEFAULT_CHATBOT_CONFIG.welcome_video_url ?? '',
    system_prompt_extra: raw?.system_prompt_extra?.trim() ?? '',
    rate_limit_per_minute: raw?.rate_limit_per_minute ?? DEFAULT_CHATBOT_CONFIG.rate_limit_per_minute,
    rate_limit_per_hour: raw?.rate_limit_per_hour ?? DEFAULT_CHATBOT_CONFIG.rate_limit_per_hour,
    operator_rate_limit_per_minute:
      raw?.operator_rate_limit_per_minute ?? DEFAULT_CHATBOT_CONFIG.operator_rate_limit_per_minute,
    operator_rate_limit_per_hour:
      raw?.operator_rate_limit_per_hour ?? DEFAULT_CHATBOT_CONFIG.operator_rate_limit_per_hour,
    global_hourly_cap: raw?.global_hourly_cap ?? DEFAULT_CHATBOT_CONFIG.global_hourly_cap,
    require_captcha: raw?.require_captcha ?? DEFAULT_CHATBOT_CONFIG.require_captcha,
    honeypot_enabled: raw?.honeypot_enabled ?? DEFAULT_CHATBOT_CONFIG.honeypot_enabled,
    cta_consultation: raw?.cta_consultation ?? DEFAULT_CHATBOT_CONFIG.cta_consultation,
    cta_whatsapp: raw?.cta_whatsapp ?? DEFAULT_CHATBOT_CONFIG.cta_whatsapp,
    cta_phone: raw?.cta_phone ?? DEFAULT_CHATBOT_CONFIG.cta_phone,
    cta_pricing: raw?.cta_pricing ?? DEFAULT_CHATBOT_CONFIG.cta_pricing,
    max_history_messages: raw?.max_history_messages ?? DEFAULT_CHATBOT_CONFIG.max_history_messages,
    quick_suggestions: resolveQuickSuggestions(raw?.quick_suggestions, {
      useDefaults: raw?.quick_suggestions === undefined,
    }),
  };
}

export async function getStoredChatbotConfig(): Promise<ChatbotStoredConfig> {
  const raw = await getSettingBlob<Partial<ChatbotStoredConfig>>(CHATBOT_GROUP, CHATBOT_KEY);
  return mergeConfig(raw);
}

export async function saveChatbotConfig(form: ChatbotSettingsForm): Promise<{ ok: boolean; error?: string }> {
  const next: ChatbotStoredConfig = {
    enabled: form.enabled,
    assistant_name: form.assistantName.trim() || DEFAULT_CHATBOT_CONFIG.assistant_name,
    welcome_message: form.welcomeMessage.trim() || DEFAULT_CHATBOT_CONFIG.welcome_message,
    welcome_video_url: form.welcomeVideoUrl.trim(),
    system_prompt_extra: form.systemPromptExtra.trim(),
    rate_limit_per_minute: normalizeRateLimit(form.rateLimitPerMinute),
    rate_limit_per_hour: normalizeRateLimit(form.rateLimitPerHour),
    operator_rate_limit_per_minute: normalizeRateLimit(form.operatorRateLimitPerMinute),
    operator_rate_limit_per_hour: normalizeRateLimit(form.operatorRateLimitPerHour),
    global_hourly_cap: normalizeRateLimit(form.globalHourlyCap),
    require_captcha: form.requireCaptcha,
    honeypot_enabled: form.honeypotEnabled,
    cta_consultation: form.ctaConsultation,
    cta_whatsapp: form.ctaWhatsapp,
    cta_phone: form.ctaPhone,
    cta_pricing: form.ctaPricing,
    max_history_messages: Math.max(2, Math.min(20, form.maxHistoryMessages)),
    quick_suggestions: normalizeQuickSuggestions(form.quickSuggestions),
  };

  return saveSettingBlob(CHATBOT_GROUP, CHATBOT_KEY, next);
}
