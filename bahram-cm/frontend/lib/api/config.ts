// Base URLs for the Laravel API v1 admin layer.
export const SERVER_API_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8010/api/v1';

export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

/** Default download host when env is unset — gallery files are not on localhost /storage. */
export const DEFAULT_MEDIA_DOWNLOAD_HOST = (
  process.env.NEXT_PUBLIC_MEDIA_DOWNLOAD_HOST || 'https://cdn.rostami.app'
).replace(/\/$/, '');

/**
 * Unified CDN/host for ALL public images (/images + /storage/media/*).
 * Set NEXT_PUBLIC_MEDIA_URL=https://cdn.example.com — must match backend MEDIA_URL.
 * When unset: uses DEFAULT_MEDIA_DOWNLOAD_HOST (cdn.rostami.app).
 */
export const MEDIA_ORIGIN: string =
  (process.env.NEXT_PUBLIC_MEDIA_URL || '').replace(/\/$/, '') || DEFAULT_MEDIA_DOWNLOAD_HOST;

/** Upload origin for non-CDN paths (/storage/articles, etc.). */
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
  pricing: isDev ? devRevalidate : 600,
} as const;
