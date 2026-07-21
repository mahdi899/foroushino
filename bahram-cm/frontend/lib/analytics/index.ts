/**
 * Provider-agnostic analytics dispatcher.
 *
 * Default provider is Plausible (privacy-friendly). GA4 is supported when a
 * measurement ID is configured. Both are optional: if neither is present, calls
 * are no-ops so tracking never breaks the UI.
 */
import type { AnalyticsEventMap, AnalyticsEventName } from "./events";

declare global {
  interface Window {
    plausible?: (
      event: string,
      opts?: { props?: Record<string, unknown>; callback?: () => void },
    ) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const analyticsConfig = {
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "",
  plausibleSrc:
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ||
    "/vendor/plausible/script.js",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
};

export const analyticsEnabled =
  Boolean(analyticsConfig.plausibleDomain) ||
  Boolean(analyticsConfig.gaMeasurementId);

export function track<E extends AnalyticsEventName>(
  event: E,
  props?: AnalyticsEventMap[E],
): void {
  if (typeof window === "undefined") return;

  try {
    if (typeof window.plausible === "function") {
      window.plausible(event, props ? { props: props as Record<string, unknown> } : undefined);
    }
    if (analyticsConfig.gaMeasurementId && typeof window.gtag === "function") {
      window.gtag("event", event, props ?? {});
    }
  } catch {
    // analytics must never throw into the UI
  }
}
