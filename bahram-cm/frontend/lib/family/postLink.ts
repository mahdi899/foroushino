import { familyPublicOrigin, isFamilyHost } from '@/lib/domains';

/** Parse `?post=` deep-link query values. */
export function parseFamilyPostId(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const postId = Number(raw.trim());
  return Number.isFinite(postId) && postId > 0 ? postId : null;
}

/** In-app path on the club host (`/?post=42`). */
export function familyPostPath(postId: number): string {
  return `/?post=${postId}`;
}

/**
 * Absolute share URL — matches backend `FamilySiteUrl::postUrl`.
 * On the club host uses the current origin (incl. local `club.lvh.me`).
 */
export function familyPostUrl(postId: number): string {
  let origin = familyPublicOrigin();
  if (typeof window !== 'undefined') {
    if (isFamilyHost(window.location.hostname)) {
      origin = window.location.origin;
    } else if (!origin) {
      origin = window.location.origin;
    }
  }
  const base = origin?.replace(/\/$/, '') ?? '';
  return base ? `${base}${familyPostPath(postId)}` : familyPostPath(postId);
}
