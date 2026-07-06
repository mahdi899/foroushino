/**
 * Production analytics runs via Cloudflare Zaraz (edge tag manager).
 * Set NEXT_PUBLIC_TRACKING_VIA_CLOUDFLARE=false only for local inline GA/GTM testing.
 */
export function isTrackingViaCloudflare(): boolean {
  const v = process.env.NEXT_PUBLIC_TRACKING_VIA_CLOUDFLARE?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  return true;
}

/** Optional Looker Studio / GA embed URL for the admin dashboard panel. */
export function gaDashboardEmbedUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GA_DASHBOARD_URL?.trim();
  return url || null;
}
