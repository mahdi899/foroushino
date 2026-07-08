import type { ImageLoaderProps } from 'next/image';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { mediaPathToStorage } from '@/lib/media/legacyMap';

/** Passthrough loader — original files only, no ?w= / ?q= resize. */
export default function bahramImageLoader({ src }: ImageLoaderProps): string {
  const ref = mediaPathToStorage(src);
  if (ref.startsWith('/storage/')) {
    return resolveMediaUrl(ref) || ref;
  }
  return src;
}
