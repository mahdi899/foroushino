export type SmsChannelType = 'sms' | 'messenger';

export type SmsProviderView = {
  slug: string;
  label_fa: string;
  channel_type: SmsChannelType;
  channel_label: string;
  docs_url: string | null;
  sender_number: string | null;
  is_active: boolean;
  configured: boolean;
  has_credentials: boolean;
  credential_hint: string | null;
};

export type SmsEventView = {
  event_key: string;
  category: string;
  category_label: string;
  label_fa: string;
  description: string | null;
  is_enabled: boolean;
  message_template: string | null;
  resolved_template: string;
  pattern_code: string | null;
  use_pattern: boolean;
  provider_slug: string | null;
  fallback_enabled: boolean;
  fallback_delay_seconds: number | null;
  placeholders: string[];
};

export type SmsEventCategoryView = {
  key: string;
  label: string;
};

export type SmsGlobalView = {
  is_sms_active: boolean;
  primary_provider_slug: string;
  fallback_provider_slug: string | null;
  fallback_delay_seconds: number;
  fallback_enabled: boolean;
  test_phone: string | null;
  admin_telegram_enabled: boolean;
  admin_telegram_chat_ids: string | null;
};

export type AdminTelegramEventView = {
  event_key: string;
  category: string;
  category_label: string;
  label_fa: string;
  description: string | null;
  is_enabled: boolean;
};

export type AdminTelegramCategoryView = {
  key: string;
  label: string;
};

export type SmsCenterConfig = {
  global: SmsGlobalView;
  providers: SmsProviderView[];
  events: SmsEventView[];
  event_categories: SmsEventCategoryView[];
  admin_telegram_events: AdminTelegramEventView[];
  admin_telegram_categories: AdminTelegramCategoryView[];
};

export type SmsProviderForm = {
  senderNumber: string;
  isActive: boolean;
  credentialsInput: string;
};

export type SmsEventForm = {
  isEnabled: boolean;
  messageTemplate: string;
  patternCode: string;
  usePattern: boolean;
  providerSlug: string;
  fallbackEnabled: boolean;
  fallbackDelaySeconds: string;
};

export const SMS_EVENT_LABELS: Record<string, string> = {
  otp: 'OTP',
  purchase_confirmation: 'خرید',
  license_created: 'لایسنس',
  welcome: 'خوش‌آمد',
  ticket_created: 'تیکت جدید',
  ticket_reply: 'پاسخ تیکت',
  broadcast: 'ارسال دستی',
};

export const SMS_EVENT_CATEGORY_ORDER = ['auth', 'commerce', 'onboarding', 'support', 'manual'] as const;

export function smsProvidersForChannel(
  providers: SmsProviderView[],
  channel: SmsChannelType = 'sms',
): SmsProviderView[] {
  return providers.filter((p) => p.channel_type === channel);
}

export function groupEventsByCategory(events: SmsEventView[]): Map<string, SmsEventView[]> {
  const map = new Map<string, SmsEventView[]>();
  for (const event of events) {
    const list = map.get(event.category) ?? [];
    list.push(event);
    map.set(event.category, list);
  }
  return map;
}

export function eventToForm(event: SmsEventView): SmsEventForm {
  return {
    isEnabled: event.is_enabled,
    messageTemplate: event.message_template ?? event.resolved_template,
    patternCode: event.pattern_code ?? '',
    usePattern: event.use_pattern,
    providerSlug: event.provider_slug ?? '',
    fallbackEnabled: event.fallback_enabled,
    fallbackDelaySeconds: event.fallback_delay_seconds != null ? String(event.fallback_delay_seconds) : '',
  };
}

export function providerToForm(provider: SmsProviderView): SmsProviderForm {
  return {
    senderNumber: provider.sender_number ?? '',
    isActive: provider.is_active,
    credentialsInput: '',
  };
}
