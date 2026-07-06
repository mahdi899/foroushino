/**
 * Typed conversion event schema (single source of truth).
 *
 * Every tracked interaction is declared here so event names and payload shapes
 * stay consistent across the funnel and across analytics providers.
 */

export type AnalyticsEventMap = {
  homepage_cta_click: { cta: string; location?: string };
  course_cta_click: { course: string; tier?: string; location?: string };
  newsletter_signup: { source: string; status?: string };
  academy_apply_submit: { source: string };
  academy_apply_success: { source: string };
  academy_apply_error: { source: string; code?: string };
  event_register_click: { event: string };
  content_view: { type: string; slug: string };
  checkout_start: { product: string };
  checkout_success: { product: string; order?: string };
  checkout_error: { product: string; code?: string };
  whatsapp_click: { from?: string };
  call_click: { from?: string };
  consultation_click: { from?: string };
  chatbot_open: { session?: string };
  chatbot_message: { session?: string };
  chatbot_message_sent: { session_id: string };
  chatbot_cta: { type: string };
  chatbot_rating: { rating: number; session?: string };
  chatbot_reply_mode: { mode: string; session?: string };
  chatbot_reply_mode_switch: { mode: string; session?: string };
  chatbot_phone_saved: { session?: string };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

/** Funnel stages, used for dashboards + ordering. */
export const FUNNEL = {
  awareness: ["content_view", "homepage_cta_click"],
  interest: ["course_cta_click"],
  intent: ["newsletter_signup", "event_register_click", "checkout_start"],
  action: ["academy_apply_submit", "academy_apply_success", "checkout_success"],
} as const;
