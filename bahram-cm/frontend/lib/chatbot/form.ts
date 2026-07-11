import type { ChatbotSettingsForm, ChatbotStoredConfig } from './types';
import { resolveQuickSuggestions } from './quickSuggestions';

export function storedToForm(stored: ChatbotStoredConfig): ChatbotSettingsForm {
  return {
    enabled: stored.enabled,
    assistantName: stored.assistant_name,
    welcomeMessage: stored.welcome_message,
    welcomeVideoUrl: stored.welcome_video_url ?? '',
    systemPromptExtra: stored.system_prompt_extra,
    rateLimitPerMinute: stored.rate_limit_per_minute,
    rateLimitPerHour: stored.rate_limit_per_hour,
    operatorRateLimitPerMinute: stored.operator_rate_limit_per_minute,
    operatorRateLimitPerHour: stored.operator_rate_limit_per_hour,
    globalHourlyCap: stored.global_hourly_cap,
    requireCaptcha: stored.require_captcha,
    honeypotEnabled: stored.honeypot_enabled,
    ctaConsultation: stored.cta_consultation,
    ctaWhatsapp: stored.cta_whatsapp,
    ctaPhone: stored.cta_phone,
    ctaPricing: stored.cta_pricing,
    maxHistoryMessages: stored.max_history_messages,
    quickSuggestions: resolveQuickSuggestions(stored.quick_suggestions, {
      useDefaults: stored.quick_suggestions === undefined,
    }),
  };
}
