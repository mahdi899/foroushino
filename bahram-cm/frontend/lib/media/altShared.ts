import { SITE_MEDIA } from '@/config/media';
import { persistMediaUrl } from '@/lib/mediaUrl';

/** Alt from static SITE_MEDIA config (gallery storage paths). */
export function staticAltForSrc(src: string | null | undefined): string | null {
  if (!src?.trim()) return null;

  const ref = persistMediaUrl(src);
  for (const item of Object.values(SITE_MEDIA)) {
    const itemRef = persistMediaUrl(item.src);
    if (itemRef === ref || item.src === ref || item.src === src) {
      return item.label;
    }
  }

  return null;
}

function filenameFallbackAlt(src: string | null | undefined): string {
  if (!src?.trim()) return 'تصویر';

  const ref = persistMediaUrl(src);
  const filename = ref.split('/').pop() ?? '';
  const readable = filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return readable || 'تصویر';
}

export function coalesceAlt(
  alt?: string | null,
  fallback?: string | null,
  src?: string | null,
): string {
  const primary = alt?.trim();
  if (primary) return primary;

  const secondary = fallback?.trim();
  if (secondary) return secondary;

  const fromStatic = staticAltForSrc(src);
  if (fromStatic) return fromStatic;

  return filenameFallbackAlt(src);
}
