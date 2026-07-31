import 'server-only';

import { cache } from 'react';
import { PUBLIC_API_URL, SERVER_API_URL } from '@/lib/api/config';
import { mergeChatbotContacts } from './contacts';
import {
  DEFAULT_CHATBOT_CONFIG,
  EMPTY_CHATBOT_PUBLIC,
  type ChatbotPublicConfig,
  type ChatbotStoredConfig,
} from './types';

function mapPublicToStored(pub: ChatbotPublicConfig): ChatbotStoredConfig {
  const rawContacts = pub.contacts
    ? {
        whatsapp: {
          enabled: pub.contacts.whatsapp.enabled,
          id: pub.contacts.whatsapp.id,
          label: pub.contacts.whatsapp.label,
        },
        telegram: {
          enabled: pub.contacts.telegram.enabled,
          id: pub.contacts.telegram.id,
          label: pub.contacts.telegram.label,
        },
        rubika: {
          enabled: pub.contacts.rubika.enabled,
          id: pub.contacts.rubika.id,
          label: pub.contacts.rubika.label,
        },
        instagram: {
          enabled: pub.contacts.instagram.enabled,
          id: pub.contacts.instagram.id,
          label: pub.contacts.instagram.label,
        },
        phone: {
          enabled: pub.contacts.phone.enabled,
          id: pub.contacts.phone.id,
          label: pub.contacts.phone.label,
        },
      }
    : null;

  const contacts = mergeChatbotContacts(rawContacts, {
    cta_whatsapp: pub.ctas.whatsapp,
    cta_phone: pub.ctas.phone,
  });

  return {
    enabled: pub.enabled,
    assistant_name: pub.assistant_name,
    welcome_message: pub.welcome_message,
    welcome_video_url: pub.welcome_video_url?.trim() ?? '',
    system_prompt_extra: pub.system_prompt_extra?.trim() ?? '',
    require_captcha: pub.require_captcha,
    honeypot_enabled: pub.honeypot_enabled ?? DEFAULT_CHATBOT_CONFIG.honeypot_enabled,
    max_history_messages: pub.max_history_messages ?? DEFAULT_CHATBOT_CONFIG.max_history_messages,
    cta_consultation: pub.ctas.consultation,
    cta_whatsapp: contacts.whatsapp.enabled,
    cta_phone: contacts.phone.enabled,
    cta_pricing: pub.ctas.pricing,
    contacts,
    rate_limit_per_minute: DEFAULT_CHATBOT_CONFIG.rate_limit_per_minute,
    rate_limit_per_hour: DEFAULT_CHATBOT_CONFIG.rate_limit_per_hour,
    operator_rate_limit_per_minute: DEFAULT_CHATBOT_CONFIG.operator_rate_limit_per_minute,
    operator_rate_limit_per_hour: DEFAULT_CHATBOT_CONFIG.operator_rate_limit_per_hour,
    global_hourly_cap: DEFAULT_CHATBOT_CONFIG.global_hourly_cap,
  };
}

async function fetchChatbotPublicConfig(baseUrl: string, init?: RequestInit): Promise<ChatbotPublicConfig> {
  try {
    const res = await fetch(`${baseUrl}/chatbot/config`, {
      headers: { Accept: 'application/json' },
      ...init,
    });
    if (!res.ok) return EMPTY_CHATBOT_PUBLIC;
    const json = (await res.json()) as { data?: ChatbotPublicConfig };
    return json.data ?? EMPTY_CHATBOT_PUBLIC;
  } catch {
    return EMPTY_CHATBOT_PUBLIC;
  }
}

/** Public config for SSR widget (ISR). */
export const getPublicChatbotConfig = cache(async (): Promise<ChatbotPublicConfig> => {
  return fetchChatbotPublicConfig(PUBLIC_API_URL, {
    next: { revalidate: 300, tags: ['settings', 'chatbot'] },
  });
});

/** Server actions — no admin auth; reads the public Laravel endpoint. */
export async function getServerChatbotConfig(): Promise<ChatbotStoredConfig> {
  const pub = await fetchChatbotPublicConfig(SERVER_API_URL, { cache: 'no-store' });
  return mapPublicToStored(pub);
}
