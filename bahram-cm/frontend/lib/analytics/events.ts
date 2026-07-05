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
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

/** Funnel stages, used for dashboards + ordering. */
export const FUNNEL = {
  awareness: ["content_view", "homepage_cta_click"],
  interest: ["course_cta_click"],
  intent: ["newsletter_signup", "event_register_click"],
  action: ["academy_apply_submit", "academy_apply_success"],
} as const;
