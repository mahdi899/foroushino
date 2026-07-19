export type AdminMediaKind = 'image' | 'video' | 'audio' | 'other';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?|#|$)/i;

export function inferAdminMediaKind(url: string, mime?: string | null): AdminMediaKind {
  const normalizedMime = mime?.toLowerCase().trim() ?? '';
  if (normalizedMime.startsWith('video/')) return 'video';
  if (normalizedMime.startsWith('audio/')) return 'audio';
  if (normalizedMime.startsWith('image/')) return 'image';

  const path = url.split(/[?#]/)[0]?.toLowerCase() ?? '';
  if (VIDEO_EXT.test(path)) return 'video';
  if (AUDIO_EXT.test(path)) return 'audio';
  if (IMAGE_EXT.test(path)) return 'image';

  return 'other';
}
