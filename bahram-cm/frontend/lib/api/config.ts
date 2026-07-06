// Base URLs for the Laravel API v1 admin layer.
export const SERVER_API_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8010/api/v1';

export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Unified CDN/host for ALL public images (/images + /storage).
 * Set NEXT_PUBLIC_MEDIA_URL=https://cdn.example.com — must match backend MEDIA_URL.
 * When unset: uploads use ASSET_ORIGIN, static /images stay same-origin.
 */
export const MEDIA_ORIGIN: string | null =
  (process.env.NEXT_PUBLIC_MEDIA_URL || '').replace(/\/$/, '') || null;

/** Upload origin when MEDIA_ORIGIN is unset (/storage/...). */
export const ASSET_ORIGIN = (process.env.NEXT_PUBLIC_ASSET_URL || API_ORIGIN).replace(/\/$/, '');

/** Public site origin (canonical, sitemap pages). */
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

// Default ISR revalidation windows (seconds) per content type.
// In development, use short TTL so edits appear quickly without disabling cache entirely.
const isDev = process.env.NODE_ENV === 'development';
const devRevalidate = 30;

export const REVALIDATE = {
  services: isDev ? devRevalidate : 3600,
  settings: isDev ? devRevalidate : 3600,
  articles: isDev ? devRevalidate : 300,
  cases: isDev ? devRevalidate : 600,
  doctors: isDev ? devRevalidate : 3600,
  pricing: isDev ? devRevalidate : 600,
} as const;
