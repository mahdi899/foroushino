export interface ChatbotStoredConfig {
  enabled: boolean;
  assistant_name: string;
  welcome_message: string;
  /** Canonical media path or URL for proactive welcome video (e.g. /storage/media/site/chatbot-welcome.mp4). */
  welcome_video_url?: string;
  system_prompt_extra: string;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  operator_rate_limit_per_minute: number;
  operator_rate_limit_per_hour: number;
  global_hourly_cap: number;
  require_captcha: boolean;
  honeypot_enabled: boolean;
  cta_consultation: boolean;
  cta_whatsapp: boolean;
  cta_phone: boolean;
  cta_pricing: boolean;
  max_history_messages: number;
  quick_suggestions?: ChatbotQuickSuggestion[];
}

export interface ChatbotSettingsForm {
  enabled: boolean;
  assistantName: string;
  welcomeMessage: string;
  welcomeVideoUrl: string;
  systemPromptExtra: string;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  operatorRateLimitPerMinute: number;
  operatorRateLimitPerHour: number;
  globalHourlyCap: number;
  requireCaptcha: boolean;
  honeypotEnabled: boolean;
  ctaConsultation: boolean;
  ctaWhatsapp: boolean;
  ctaPhone: boolean;
  ctaPricing: boolean;
  maxHistoryMessages: number;
  quickSuggestions: ChatbotQuickSuggestion[];
}

export interface ChatbotOperatorProfile {
  id: string;
  name: string;
  avatar_url: string;
}

export interface ChatbotQuickSuggestion {
  id: string;
  label: string;
  response: string;
}

export interface ChatbotPublicConfig {
  enabled: boolean;
  assistant_name: string;
  welcome_message: string;
  welcome_video_url?: string;
  require_captcha: boolean;
  captcha: {
    enabled: boolean;
    site_key: string;
    has_turnstile: boolean;
  };
  ctas: {
    consultation: boolean;
    whatsapp: boolean;
    phone: boolean;
    pricing: boolean;
  };
  operator_profiles: ChatbotOperatorProfile[];
  quick_suggestions?: ChatbotQuickSuggestion[];
  ai_available?: boolean;
  system_prompt_extra?: string;
  max_history_messages?: number;
  honeypot_enabled?: boolean;
}

export interface ChatbotCta {
  label: string;
  href: string;
  type: 'consultation' | 'whatsapp' | 'phone' | 'pricing' | 'link' | 'register_phone';
}

export interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Optional inline video attachment (welcome or rich reply). */
  videoUrl?: string;
  ctas?: ChatbotCta[];
  pending?: boolean;
  /** Assistant reply is being revealed with a typing animation. */
  typing?: boolean;
  error?: boolean;
  /** Server log id — used for star ratings. */
  logId?: number;
  rating?: number;
  /** Human operator reply from admin panel. */
  fromOperator?: boolean;
  operatorName?: string;
  operatorAvatarUrl?: string;
  replyToLogId?: number;
  replyToPreview?: string;
  /** Successful AI completion (not operator, fallback, or system ack). */
  isAiReply?: boolean;
  /** Auto-reply after queuing message for operator — not AI, not rateable. */
  isOperatorAck?: boolean;
}

export type ChatbotThreadKind = 'exchange' | 'visitor_message' | 'operator_reply';

export interface ChatbotThreadItem {
  kind: ChatbotThreadKind;
  id: number;
  content?: string;
  question?: string;
  answer?: string;
  operator_name?: string;
  operator_avatar_url?: string;
  reply_to_log_id?: number | null;
  reply_to_preview?: string | null;
  pending_operator?: boolean;
  low_rating_followup?: boolean;
  rated_stars?: number | null;
  rated_question?: string | null;
  requested_operator_profile_id?: string | null;
  requested_operator_name?: string | null;
  requested_operator_avatar_url?: string | null;
  rating?: number | null;
  created_at: string | null;
}

export interface ChatbotSendResult {
  ok: boolean;
  reply?: string;
  ctas?: ChatbotCta[];
  logId?: number;
  error?: 'disabled' | 'ai_disabled' | 'rate_limit' | 'captcha' | 'bot' | 'ai_error' | 'network';
  errorMessage?: string;
  /** Friendly visitor-facing reply when AI/server is down — never shows technical details. */
  fallbackReply?: string;
  fallbackCtas?: ChatbotCta[];
  retryAfter?: number;
  rateReason?: string;
}

export interface ChatbotLogEntry {
  id: number;
  session_id: string;
  ip_address: string | null;
  question: string;
  answer: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ChatbotLogsResponse {
  data: ChatbotLogEntry[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ChatbotSessionEntry {
  session_id: string;
  ip_address: string | null;
  page_url: string | null;
  visitor_phone: string | null;
  visitor_first_name: string | null;
  visitor_last_name: string | null;
  visitor_name: string | null;
  preferred_operator_profile_id: string | null;
  lead_id: number | null;
  open_count: number;
  message_count: number;
  opened_at: string | null;
  last_activity_at: string | null;
}

export interface ChatbotSessionsResponse {
  data: ChatbotSessionEntry[];
  meta: ChatbotLogsResponse['meta'];
}

export interface ChatbotOperatorQueueEntry {
  id: number;
  session_id: string;
  content: string;
  ip_address: string | null;
  visitor_phone: string | null;
  visitor_first_name: string | null;
  visitor_last_name: string | null;
  visitor_name: string | null;
  page_url: string | null;
  low_rating_followup: boolean;
  rated_stars: number | null;
  rated_question: string | null;
  requested_operator_profile_id: string | null;
  requested_operator_name: string | null;
  created_at: string | null;
}

export interface ChatbotOperatorQueueResponse {
  data: ChatbotOperatorQueueEntry[];
  meta: ChatbotLogsResponse['meta'];
}

export interface ChatbotExportRow {
  id: number;
  session_id: string;
  kind: 'ai_exchange' | 'visitor_message' | 'operator_reply' | 'session_open' | 'system';
  visitor_first_name: string | null;
  visitor_last_name: string | null;
  visitor_phone: string | null;
  page_url: string | null;
  ip_address: string | null;
  user_message: string | null;
  reply: string | null;
  operator_name: string | null;
  reply_to_log_id: number | null;
  rating: number | null;
  pending_operator: boolean;
  low_rating_followup: boolean;
  rated_stars: number | null;
  has_error: boolean;
  error_code: string | null;
  created_at: string | null;
}

export const CHATBOT_EXPORT_KIND_LABELS: Record<ChatbotExportRow['kind'], string> = {
  ai_exchange: 'گفتگوی AI',
  visitor_message: 'پیام کاربر (صف اپراتور)',
  operator_reply: 'پاسخ اپراتور',
  session_open: 'باز شدن session',
  system: 'سیستمی',
};

export function chatbotLogRating(metadata: Record<string, unknown> | null | undefined): number | null {
  const r = metadata?.rating;
  return typeof r === 'number' && r >= 1 && r <= 5 ? r : null;
}

export const DEFAULT_CHATBOT_CONFIG: ChatbotStoredConfig = {
  enabled: true,
  assistant_name: 'دستیار بهرام',
  welcome_message: 'آیا سوالی دارید؟ من دستیار آکادمی بهرام هستم و خوشحال می‌شوم کمکتان کنم.',
  welcome_video_url: '',
  system_prompt_extra: '',
  rate_limit_per_minute: 3,
  rate_limit_per_hour: 10,
  operator_rate_limit_per_minute: 3,
  operator_rate_limit_per_hour: 10,
  global_hourly_cap: 100,
  require_captcha: true,
  honeypot_enabled: true,
  cta_consultation: true,
  cta_whatsapp: true,
  cta_phone: true,
  cta_pricing: true,
  max_history_messages: 8,
};

export const EMPTY_CHATBOT_PUBLIC: ChatbotPublicConfig = {
  enabled: false,
  assistant_name: DEFAULT_CHATBOT_CONFIG.assistant_name,
  welcome_message: DEFAULT_CHATBOT_CONFIG.welcome_message,
  require_captcha: true,
  captcha: { enabled: false, site_key: '', has_turnstile: false },
  ctas: {
    consultation: true,
    whatsapp: true,
    phone: true,
    pricing: true,
  },
  operator_profiles: [],
  ai_available: false,
};
