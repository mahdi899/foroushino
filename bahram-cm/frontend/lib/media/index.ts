/**
 * Single import point for all media URL logic.
 *
 * POLICY: Images always use raw `/storage/media/...` paths — never `/cdn/media?w=&q=`.
 * See docs/MEDIA-URL-POLICY.md — do not change URL shaping without explicit approval.
 *
 * Configure once in .env:
 *   NEXT_PUBLIC_MEDIA_URL=https://cdn.example.com  (must match backend MEDIA_URL)
 *
 * DB stores portable paths (/storage/..., /images/...).
 * resolveMediaUrl() builds the public URL at runtime.
 */
export {
  MEDIA_ORIGIN,
  ASSET_ORIGIN,
  SITE_ORIGIN,
  API_ORIGIN,
} from '@/lib/api/config';

export {
  persistMediaUrl,
  mediaReference,
  resolveMediaUrl,
  resolveSitemapImageUrl,
  rewriteArticleBodyMediaUrls,
  normalizeImageSrc,
  primarySiteImageSrc,
  mediaDisplaySrc,
  uploadOrigin,
  toStorageAbsoluteUrl,
} from '@/lib/mediaUrl';

export { coalesceAlt, staticAltForSrc } from '@/lib/media/altShared';
export { resolveMediaAlt } from '@/lib/media/alt';
export { mediaPathToStorage, resolveLegacyStoragePath } from '@/lib/media/legacyMap';

export { default as bahramImageLoader } from '@/lib/imageLoader';
