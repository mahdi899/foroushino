import { resolveMediaUrl } from '@/lib/mediaUrl';
import { appendAvatarCacheBuster } from '@/lib/student/avatarCache';

export function studentDefaultAvatarUrl(userId: number, size = 80): string {
  return `https://api.dicebear.com/9.x/lorelei/png?seed=${encodeURIComponent(String(userId))}&size=${size}`;
}

/** Same rules as panel profile avatar — CDN/download host for `/storage/media/avatars/...`. */
export function resolveStudentAvatarDisplayUrl(
  avatar: string | null | undefined,
  avatarVersion?: number | null,
): string | null {
  const custom = avatar?.trim();
  if (!custom) return null;

  const resolved =
    /^https?:\/\//i.test(custom) || custom.startsWith('/storage/media/avatars/')
      ? custom
      : resolveMediaUrl(custom) || custom;

  return appendAvatarCacheBuster(resolved, avatarVersion);
}
